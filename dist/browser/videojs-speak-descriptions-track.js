(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.videojsSpeakDescriptionsTrack = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){
var win;

if (typeof window !== "undefined") {
    win = window;
} else if (typeof global !== "undefined") {
    win = global;
} else if (typeof self !== "undefined"){
    win = self;
} else {
    win = {};
}

module.exports = win;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],2:[function(require,module,exports){
(function (global){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _interopDefault(ex) {
  return ex && (typeof ex === 'undefined' ? 'undefined' : _typeof(ex)) === 'object' && 'default' in ex ? ex['default'] : ex;
}

var videojs = _interopDefault((typeof window !== "undefined" ? window['videojs'] : typeof global !== "undefined" ? global['videojs'] : null));
var window = _interopDefault(require(1));

/**
 * Player status for extended descriptions (playback of descriptions while pausing the tech)
 *
 * @typedef extendedPlayerState
 * @enum
 */
var extendedPlayerState = {
  unknown: 'unknown',
  initialized: 'initialized',
  playing: 'playing',
  paused: 'paused',
  playingExtended: 'playingExtended',
  pausedExtended: 'pausedExtended'
};

// TODO: user control over this attribute?
var audioDuckingFactor = 0.25;

/**
 * The SpeakDescriptionsTrackTTS component
 */

var SpeakDescriptionsTrackTTS = function () {
  /**
   * Creates an instance of this class.
   *
   * @param {Player} player
   *        The `Player` that this class should be attached to.
   */
  function SpeakDescriptionsTrackTTS(player) {
    _classCallCheck(this, SpeakDescriptionsTrackTTS);

    this.player_ = player;
    this.extendedPlayerState_ = extendedPlayerState.initialized;
    this.isDucked = false;

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();

      // Stop the textTrackDisplay component's element from having
      //  aria-live="assertive".
      var textTrackDisplay = player.getChild('textTrackDisplay');
      if (textTrackDisplay && textTrackDisplay.updateForTrack) {
        textTrackDisplay.originalUpdateForTrack = textTrackDisplay.updateForTrack;
        textTrackDisplay.updateForTrack = function (track) {
          if (this.getAttribute('aria-live') !== 'off') {
            this.setAttribute('aria-live', 'off');
          }
          this.originalUpdateForTrack(track);
        }.bind(textTrackDisplay);
      }
    }
  }

  /**
   * Dispose of the `SpeakDescriptionsTrackTTS`
   */


  _createClass(SpeakDescriptionsTrackTTS, [{
    key: 'dispose',
    value: function dispose() {}
  }, {
    key: 'play',
    value: function play() {
      var speechSynthesis = window.speechSynthesis;

      if (speechSynthesis.paused) {
        speechSynthesis.resume();
      }
    }
  }, {
    key: 'pause',
    value: function pause() {
      var speechSynthesis = window.speechSynthesis;

      if (speechSynthesis.speaking) {
        speechSynthesis.pause();
      }
    }
  }, {
    key: 'paused',
    value: function paused() {
      return this.extendedPlayerState_ === extendedPlayerState.paused || this.extendedPlayerState_ === extendedPlayerState.pausedExtended;
    }
  }, {
    key: 'textTrackChange',
    value: function textTrackChange() {
      var tracks = this.player_.textTracks();
      var descriptionsTrack = null;
      var i = tracks.length;

      while (i--) {
        var track = tracks[i];

        if (track.mode === 'showing') {
          if (track.kind === 'descriptions') {
            descriptionsTrack = track;
          }
        }
      }

      if (descriptionsTrack) {
        this.speakActiveCues(descriptionsTrack);
      }
    }

    /**
     * Use browser Speech Synthesis (aka TTS) to speak active cues, if supported
     *
     * @param {TextTrackObject} track Texttrack object to speak
     * @method speakActiveCues
     */

  }, {
    key: 'speakActiveCues',
    value: function speakActiveCues(track) {
      if (!window.SpeechSynthesisUtterance || !window.speechSynthesis) {
        return;
      }

      var speechSynthesis = window.speechSynthesis;

      var textToSpeak = [];
      var startTime = Infinity;
      var endTime = -Infinity;
      var ct = this.player_.currentTime();

      if (track.activeCues) {
        // TODO: Need to handle this logic better; it's possible that a new cue
        //       started while another is still active. We don't handle that correctly.
        for (var i = 0; i < track.activeCues.length; i++) {
          textToSpeak.push(track.activeCues[i].text);
          startTime = Math.min(track.activeCues[i].startTime, startTime);
          endTime = Math.max(track.activeCues[i].endTime, endTime);
        }
        // TODO: handle any HTML markup in the cues properly; for now,
        //       we just strip out HTML markup.
        textToSpeak = textToSpeak.join('\r\n').replace(/<(?:.|\n)*?>/gm, '');
      }

      if (textToSpeak) {
        if (speechSynthesis.speaking) {
          // TODO: Handle description cue collision
          videojs.log.warn('Speech synthesis collision (' + textToSpeak + ' - ' + this.ssu.text + ') : ' + ct + ' : ' + this.startTime + ' : ' + this.endTime);

          speechSynthesis.cancel();
        } else if (speechSynthesis.paused) {
          // TODO: Handle if speech synthesis is paused here
          videojs.log.warn('Speech synthesis collision (paused) (' + textToSpeak + ' - ' + this.ssu.text + ') : ' + ct + ' : ' + this.startTime + ' : ' + this.endTime);

          speechSynthesis.cancel();
          speechSynthesis.resume();
        }

        // Store info about the current cue for debugging and/or logging
        this.startTime = startTime;
        this.endTime = endTime;

        // TODO: Need to dispose of this ssu after it is finished?
        this.ssu = new window.SpeechSynthesisUtterance();

        this.ssu.text = textToSpeak;
        this.ssu.lang = this.increaseLanguageLocalization(track.language);

        // TODO: user control over these attributes
        this.ssu.rate = 1.1;
        this.ssu.pitch = 1.0;
        this.ssu.volume = 1.0;

        // TODO: This audio ducking needs to be made more robust
        this.ssu.onstart = function (e) {
          // Duck the player's audio
          if (!this.isDucked) {
            this.isDucked = true;
            this.player_.tech_.volume(this.player_.tech_.volume() * audioDuckingFactor);
          }
        }.bind(this);
        this.ssu.onend = function (e) {
          // Speech synthesis of a cue has ended

          var delta = (Date.now() - this.ssu.startDate) / 1000;

          videojs.log('SpeakDescriptionsTrackTTS of cue: ' + this.startTime + ' : ' + this.endTime + ' : ' + (this.endTime - this.startTime) + ' : ' + delta + ' : ' + (delta * 100.0 / (this.endTime - this.startTime)).toFixed(1) + '%');

          // Un-duck the player's audio
          if (this.isDucked) {
            this.isDucked = false;
            this.player_.tech_.volume(this.player_.tech_.volume() / audioDuckingFactor);
          }

          if (this.extendedPlayerState_ === extendedPlayerState.playingExtended) {
            videojs.log('Un-pausing playback');
            this.extendedPlayerState_ = extendedPlayerState.playing;
            this.player_.tech_.play();
            this.descriptionExtended = false;
          }
        }.bind(this);
        this.ssu.onerror = function (e) {
          // An error occured during speech synthesis

          var delta = (Date.now() - this.ssu.startDate) / 1000;

          videojs.log.warn('SSU error (' + this.ssu.text + ')');
          videojs.log.warn('SpeakDescriptionsTrackTTS of cue: ' + this.startTime + ' : ' + this.endTime + ' : ' + (this.endTime - this.startTime) + ' : ' + delta + ' : ' + (delta * 100.0 / (this.endTime - this.startTime)).toFixed(1) + '%');

          // Un-duck the player's audio
          if (this.isDucked) {
            this.isDucked = true;
            this.player_.tech_.volume(this.player_.tech_.volume() / audioDuckingFactor);
          }

          if (this.extendedPlayerState_ === extendedPlayerState.playingExtended) {
            videojs.log('Un-pausing playback');
            this.extendedPlayerState_ = extendedPlayerState.playing;
            this.player_.tech_.play();
            this.descriptionExtended = false;
          }
        }.bind(this);

        // Start speaking the new textToSpeak

        this.ssu.startDate = Date.now();
        speechSynthesis.speak(this.ssu);
      } else {
        // No current textToSpeak, so a cue's display time has ended.

        if (speechSynthesis.speaking) {
          // Speech synthesis is still speaking - handle description cue overrun
          videojs.log('Pausing playback');

          this.extendedPlayerState_ = extendedPlayerState.playingExtended;
          this.descriptionExtended = true;
          this.player_.tech_.pause();
        } else if (speechSynthesis.paused) {
          // TODO: Handle if speech synthesis is paused here
          videojs.log.warn('Speech synthesis overrun (paused) (' + this.ssu.text + ') : ' + this.startTime + ' : ' + this.endTime);

          speechSynthesis.cancel();
          speechSynthesis.resume();

          // } else if (this.ssu) {
          // videojs.log(`Speech had ended before end of cue (${this.ssu.text}) : ${this.startTime} : ${this.endTime} : ${ct}`);
        }

        return;
      }
    }

    /**
     * Try to improve the localization of the text track language, using
     *  the player's language setting and the browser's language setting.
     *  e.g. if lang='en' and language = 'en-US', use the more specific
     *  localization of language.
     *
     * @param {string} lang the lang attribute to try to improve
     * @return {string} the improved lang attribute
     * @method increaseLanguageLocalization
     */

  }, {
    key: 'increaseLanguageLocalization',
    value: function increaseLanguageLocalization(lang) {
      var playerLanguage = this.player_.language && this.player_.language();
      var navigatorLanguage = window.navigator && window.navigator.language;

      if (lang && typeof lang === 'string' && typeof playerLanguage === 'string' && playerLanguage.length > lang.length && playerLanguage.toLowerCase().indexOf(lang.toLowerCase()) === 0) {

        lang = playerLanguage;
      }

      if (lang && typeof lang === 'string' && typeof navigatorLanguage === 'string' && navigatorLanguage.length > lang.length && navigatorLanguage.toLowerCase().indexOf(lang.toLowerCase()) === 0) {

        lang = navigatorLanguage;
      }

      return lang;
    }
  }]);

  return SpeakDescriptionsTrackTTS;
}();

var speakDescriptionsTrack = function speakDescriptionsTrack(player) {
  var tech = void 0;

  player.speakDescriptionsTTS = new SpeakDescriptionsTrackTTS(player);
  player.on('texttrackchange', player.speakDescriptionsTTS.textTrackChange.bind(player.speakDescriptionsTTS));
  player.on('dispose', player.speakDescriptionsTTS.dispose.bind(player.speakDescriptionsTTS));

  return {
    setSource: function setSource(srcObj, next) {
      next(null, srcObj);
    },
    setTech: function setTech(newTech) {
      tech = newTech;

      player.off(tech, 'pause', player.handleTechPause_);

      tech.on('pause', function (event) {
        if (player.speakDescriptionsTTS && player.speakDescriptionsTTS.extendedPlayerState_) {
          if (player.speakDescriptionsTTS.extendedPlayerState_ !== extendedPlayerState.playingExtended) {
            player.handleTechPause_();
          }
        }
      });
    },


    // TODO: Eventually we may modify the duration and/or current time to allow
    //       for the time that the video is paused for extended description.
    //       For now, we just treat it as though the video stalled while streaming.
    duration: function duration(dur) {
      return dur;
    },
    currentTime: function currentTime(ct) {
      return ct;
    },
    setCurrentTime: function setCurrentTime(ct) {
      return ct;
    },
    volume: function volume(vol) {
      if (player.speakDescriptionsTTS && player.speakDescriptionsTTS.isDucked) {
        return vol / audioDuckingFactor;
      }

      return vol;
    },
    setVolume: function setVolume(vol) {
      if (player.speakDescriptionsTTS && player.speakDescriptionsTTS.isDucked) {
        return vol * audioDuckingFactor;
      }

      return vol;
    },
    paused: function paused() {
      if (player.speakDescriptionsTTS) {
        return player.speakDescriptionsTTS.paused();
      }
    },
    callPlay: function callPlay() {
      if (!player.speakDescriptionsTTS) {
        return;
      }

      if (!player.speakDescriptionsTTS.extendedPlayerState_) {
        player.speakDescriptionsTTS.extendedPlayerState_ = extendedPlayerState.unknown;
      }

      switch (player.speakDescriptionsTTS.extendedPlayerState_) {
        case extendedPlayerState.unknown:
        case extendedPlayerState.initialized:
        case extendedPlayerState.paused:
          player.speakDescriptionsTTS.extendedPlayerState_ = extendedPlayerState.playing;
          player.speakDescriptionsTTS.play();
          return;

        case extendedPlayerState.pausedExtended:
          player.speakDescriptionsTTS.extendedPlayerState_ = extendedPlayerState.playingExtended;
          player.speakDescriptionsTTS.play();
          player.handleTechPlay_();
          return videojs.middleware.TERMINATOR;
      }

      return;
    },
    callPause: function callPause() {
      if (!player.speakDescriptionsTTS) {
        return;
      }

      if (!player.speakDescriptionsTTS.extendedPlayerState_) {
        player.speakDescriptionsTTS.extendedPlayerState_ = extendedPlayerState.unknown;
      }

      switch (player.speakDescriptionsTTS.extendedPlayerState_) {
        case extendedPlayerState.unknown:
        case extendedPlayerState.initialized:
        case extendedPlayerState.playing:
          player.speakDescriptionsTTS.extendedPlayerState_ = extendedPlayerState.paused;
          player.speakDescriptionsTTS.pause();
          return;

        case extendedPlayerState.playingExtended:
          player.speakDescriptionsTTS.extendedPlayerState_ = extendedPlayerState.pausedExtended;
          player.speakDescriptionsTTS.pause();
          player.handleTechPause_();
          return videojs.middleware.TERMINATOR;
      }

      return;
    }
  };
};

// Register the plugin with video.js.
videojs.use('*', speakDescriptionsTrack);

// Include the version number.
speakDescriptionsTrack.VERSION = '1.1.0';

module.exports = speakDescriptionsTrack;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"1":1}]},{},[2])(2)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZ2xvYmFsL3dpbmRvdy5qcyIsInNyYy9qcy9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2JBOzs7Ozs7OztBQUVBLFNBQVMsZUFBVCxDQUEwQixFQUExQixFQUE4QjtBQUFFLFNBQVEsTUFBTyxRQUFPLEVBQVAseUNBQU8sRUFBUCxPQUFjLFFBQXJCLElBQWtDLGFBQWEsRUFBaEQsR0FBc0QsR0FBRyxTQUFILENBQXRELEdBQXNFLEVBQTdFO0FBQWtGOztBQUVsSCxJQUFJLFVBQVUsZ0JBQWdCLFFBQVEsVUFBUixDQUFoQixDQUFkO0FBQ0EsSUFBSSxTQUFTLGdCQUFnQixRQUFRLGVBQVIsQ0FBaEIsQ0FBYjs7QUFFQTs7Ozs7O0FBTUEsSUFBTSxzQkFBc0I7QUFDMUIsV0FBUyxTQURpQjtBQUUxQixlQUFhLGFBRmE7QUFHMUIsV0FBUyxTQUhpQjtBQUkxQixVQUFRLFFBSmtCO0FBSzFCLG1CQUFpQixpQkFMUztBQU0xQixrQkFBZ0I7QUFOVSxDQUE1Qjs7QUFTQTtBQUNBLElBQU0scUJBQXFCLElBQTNCOztBQUVBOzs7O0lBR00seUI7QUFDSjs7Ozs7O0FBTUEscUNBQVksTUFBWixFQUFvQjtBQUFBOztBQUNsQixTQUFLLE9BQUwsR0FBZSxNQUFmO0FBQ0EsU0FBSyxvQkFBTCxHQUE0QixvQkFBb0IsV0FBaEQ7QUFDQSxTQUFLLFFBQUwsR0FBZ0IsS0FBaEI7O0FBRUEsUUFBSSxPQUFPLGVBQVgsRUFBNEI7QUFDMUIsYUFBTyxlQUFQLENBQXVCLE1BQXZCOztBQUVBO0FBQ0E7QUFDQSxVQUFJLG1CQUFtQixPQUFPLFFBQVAsQ0FBZ0Isa0JBQWhCLENBQXZCO0FBQ0EsVUFBSSxvQkFBb0IsaUJBQWlC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TyxvQkFBUCxDQUE0QixLQUE1QjtBQUNBLGlCQUFPLGdCQUFQO0FBQ0EsaUJBQU8sUUFBUSxVQUFSLENBQW1CLFVBQTFCO0FBWkY7O0FBZUE7QUFDRDtBQTVHSSxHQUFQO0FBOEdELENBckhEOztBQXVIQTtBQUNBLFFBQVEsR0FBUixDQUFZLEdBQVosRUFBaUIsc0JBQWpCOztBQUVBO0FBQ0EsdUJBQXVCLE9BQXZCLEdBQWlDLGFBQWpDOztBQUVBLE9BQU8sT0FBUCxHQUFpQixzQkFBakIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJ2YXIgd2luO1xuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHdpbiA9IHdpbmRvdztcbn0gZWxzZSBpZiAodHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHdpbiA9IGdsb2JhbDtcbn0gZWxzZSBpZiAodHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIpe1xuICAgIHdpbiA9IHNlbGY7XG59IGVsc2Uge1xuICAgIHdpbiA9IHt9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHdpbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gX2ludGVyb3BEZWZhdWx0IChleCkgeyByZXR1cm4gKGV4ICYmICh0eXBlb2YgZXggPT09ICdvYmplY3QnKSAmJiAnZGVmYXVsdCcgaW4gZXgpID8gZXhbJ2RlZmF1bHQnXSA6IGV4OyB9XG5cbnZhciB2aWRlb2pzID0gX2ludGVyb3BEZWZhdWx0KHJlcXVpcmUoJ3ZpZGVvLmpzJykpO1xudmFyIHdpbmRvdyA9IF9pbnRlcm9wRGVmYXVsdChyZXF1aXJlKCdnbG9iYWwvd2luZG93JykpO1xuXG4vKipcbiAqIFBsYXllciBzdGF0dXMgZm9yIGV4dGVuZGVkIGRlc2NyaXB0aW9ucyAocGxheWJhY2sgb2YgZGVzY3JpcHRpb25zIHdoaWxlIHBhdXNpbmcgdGhlIHRlY2gpXG4gKlxuICogQHR5cGVkZWYgZXh0ZW5kZWRQbGF5ZXJTdGF0ZVxuICogQGVudW1cbiAqL1xuY29uc3QgZXh0ZW5kZWRQbGF5ZXJTdGF0ZSA9IHtcbiAgdW5rbm93bjogJ3Vua25vd24nLFxuICBpbml0aWFsaXplZDogJ2luaXRpYWxpemVkJyxcbiAgcGxheWluZzogJ3BsYXlpbmcnLFxuICBwYXVzZWQ6ICdwYXVzZWQnLFxuICBwbGF5aW5nRXh0ZW5kZWQ6ICdwbGF5aW5nRXh0ZW5kZWQnLFxuICBwYXVzZWRFeHRlbmRlZDogJ3BhdXNlZEV4dGVuZGVkJ1xufTtcblxuLy8gVE9ETzogdXNlciBjb250cm9sIG92ZXIgdGhpcyBhdHRyaWJ1dGU/XG5jb25zdCBhdWRpb0R1Y2tpbmdGYWN0b3IgPSAwLjI1O1xuXG4vKipcbiAqIFRoZSBTcGVha0Rlc2NyaXB0aW9uc1RyYWNrVFRTIGNvbXBvbmVudFxuICovXG5jbGFzcyBTcGVha0Rlc2NyaXB0aW9uc1RyYWNrVFRTIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gaW5zdGFuY2Ugb2YgdGhpcyBjbGFzcy5cbiAgICpcbiAgICogQHBhcmFtIHtQbGF5ZXJ9IHBsYXllclxuICAgKiAgICAgICAgVGhlIGBQbGF5ZXJgIHRoYXQgdGhpcyBjbGFzcyBzaG91bGQgYmUgYXR0YWNoZWQgdG8uXG4gICAqL1xuICBjb25zdHJ1Y3RvcihwbGF5ZXIpIHtcbiAgICB0aGlzLnBsYXllcl8gPSBwbGF5ZXI7XG4gICAgdGhpcy5leHRlbmRlZFBsYXllclN0YXRlXyA9IGV4dGVuZGVkUGxheWVyU3RhdGUuaW5pdGlhbGl6ZWQ7XG4gICAgdGhpcy5pc0R1Y2tlZCA9IGZhbHNlO1xuXG4gICAgaWYgKHdpbmRvdy5zcGVlY2hTeW50aGVzaXMpIHtcbiAgICAgIHdpbmRvdy5zcGVlY2hTeW50aGVzaXMuY2FuY2VsKCk7XG5cbiAgICAgIC8vIFN0b3AgdGhlIHRleHRUcmFja0Rpc3BsYXkgY29tcG9uZW50J3MgZWxlbWVudCBmcm9tIGhhdmluZ1xuICAgICAgLy8gIGFyaWEtbGl2ZT1cImFzc2VydGl2ZVwiLlxuICAgICAgbGV0IHRleHRUcmFja0Rpc3BsYXkgPSBwbGF5ZXIuZ2V0Q2hpbGQoJ3RleHRUcmFja0Rpc3BsYXknKTtcbiAgICAgIGlmICh0ZXh0VHJhY2tEaXNwbGF5ICYmIHRleHRUcmFja0Rpc3BsYXkudXBkYXRlRm9yVHJhY2spIHtcbiAgICAgICAgdGV4dFRyYWNrRGlzcGxheS5vcmlnaW5hbFVwZGF0ZUZvclRyYWNrID0gdGV4dFRyYWNrRGlzcGxheS51cGRhdGVGb3JUcmFjaztcbiAgICAgICAgdGV4dFRyYWNrRGlzcGxheS51cGRhdGVGb3JUcmFjayA9IGZ1bmN0aW9uKHRyYWNrKSB7XG4gICAgICAgICAgaWYgKHRoaXMuZ2V0QXR0cmlidXRlKCdhcmlhLWxpdmUnKSAhPT0gJ29mZicpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0QXR0cmlidXRlKCdhcmlhLWxpdmUnLCAnb2ZmJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMub3JpZ2luYWxVcGRhdGVGb3JUcmFjayh0cmFjayk7XG4gICAgICAgIH0uYmluZCh0ZXh0VHJhY2tEaXNwbGF5KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGlzcG9zZSBvZiB0aGUgYFNwZWFrRGVzY3JpcHRpb25zVHJhY2tUVFNgXG4gICAqL1xuICBkaXNwb3NlKCkge1xuICB9XG5cbiAgcGxheSgpIHtcbiAgICBjb25zdCBzcGVlY2hTeW50aGVzaXMgPSB3aW5kb3cuc3BlZWNoU3ludGhlc2lzO1xuXG4gICAgaWYgKHNwZWVjaFN5bnRoZXNpcy5wYXVzZWQpIHtcbiAgICAgIHNwZWVjaFN5bnRoZXNpcy5yZXN1bWUoKTtcbiAgICB9XG4gIH1cblxuICBwYXVzZSgpIHtcbiAgICBjb25zdCBzcGVlY2hTeW50aGVzaXMgPSB3aW5kb3cuc3BlZWNoU3ludGhlc2lzO1xuXG4gICAgaWYgKHNwZWVjaFN5bnRoZXNpcy5zcGVha2luZykge1xuICAgICAgc3BlZWNoU3ludGhlc2lzLnBhdXNlKCk7XG4gICAgfVxuICB9XG5cbiAgcGF1c2VkKCkge1xuICAgIHJldHVybiAoXG4gICAgICB0aGlzLmV4dGVuZGVkUGxheWVyU3RhdGVfID09PSBleHRlbmRlZFBsYXllclN0YXRlLnBhdXNlZCB8fFxuICAgICAgdGhpcy5leHRlbmRlZFBsYXllclN0YXRlXyA9PT0gZXh0ZW5kZWRQbGF5ZXJTdGF0ZS5wYXVzZWRFeHRlbmRlZFxuICAgICk7XG4gIH1cblxuICB0ZXh0VHJhY2tDaGFuZ2UoKSB7XG4gICAgY29uc3QgdHJhY2tzID0gdGhpcy5wbGF5ZXJfLnRleHRUcmFja3MoKTtcbiAgICBsZXQgZGVzY3JpcHRpb25zVHJhY2sgPSBudWxsO1xuICAgIGxldCBpID0gdHJhY2tzLmxlbmd0aDtcblxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIGNvbnN0IHRyYWNrID0gdHJhY2tzW2ldO1xuXG4gICAgICBpZiAodHJhY2subW9kZSA9PT0gJ3Nob3dpbmcnKSB7XG4gICAgICAgIGlmICh0cmFjay5raW5kID09PSAnZGVzY3JpcHRpb25zJykge1xuICAgICAgICAgIGRlc2NyaXB0aW9uc1RyYWNrID0gdHJhY2s7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZGVzY3JpcHRpb25zVHJhY2spIHtcbiAgICAgIHRoaXMuc3BlYWtBY3RpdmVDdWVzKGRlc2NyaXB0aW9uc1RyYWNrKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVXNlIGJyb3dzZXIgU3BlZWNoIFN5bnRoZXNpcyAoYWthIFRUUykgdG8gc3BlYWsgYWN0aXZlIGN1ZXMsIGlmIHN1cHBvcnRlZFxuICAgKlxuICAgKiBAcGFyYW0ge1RleHRUcmFja09iamVjdH0gdHJhY2sgVGV4dHRyYWNrIG9iamVjdCB0byBzcGVha1xuICAgKiBAbWV0aG9kIHNwZWFrQWN0aXZlQ3Vlc1xuICAgKi9cbiAgc3BlYWtBY3RpdmVDdWVzKHRyYWNrKSB7XG4gICAgaWYgKCF3aW5kb3cuU3BlZWNoU3ludGhlc2lzVXR0ZXJhbmNlIHx8ICF3aW5kb3cuc3BlZWNoU3ludGhlc2lzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgc3BlZWNoU3ludGhlc2lzID0gd2luZG93LnNwZWVjaFN5bnRoZXNpcztcblxuICAgIGxldCB0ZXh0VG9TcGVhayA9IFtdO1xuICAgIGxldCBzdGFydFRpbWUgPSBJbmZpbml0eTtcbiAgICBsZXQgZW5kVGltZSA9IC1JbmZpbml0eTtcbiAgICBjb25zdCBjdCA9IHRoaXMucGxheWVyXy5jdXJyZW50VGltZSgpO1xuXG4gICAgaWYgKHRyYWNrLmFjdGl2ZUN1ZXMpIHtcbiAgICAgIC8vIFRPRE86IE5lZWQgdG8gaGFuZGxlIHRoaXMgbG9naWMgYmV0dGVyOyBpdCdzIHBvc3NpYmxlIHRoYXQgYSBuZXcgY3VlXG4gICAgICAvLyAgICAgICBzdGFydGVkIHdoaWxlIGFub3RoZXIgaXMgc3RpbGwgYWN0aXZlLiBXZSBkb24ndCBoYW5kbGUgdGhhdCBjb3JyZWN0bHkuXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRyYWNrLmFjdGl2ZUN1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGV4dFRvU3BlYWsucHVzaCh0cmFjay5hY3RpdmVDdWVzW2ldLnRleHQpO1xuICAgICAgICBzdGFydFRpbWUgPSBNYXRoLm1pbih0cmFjay5hY3RpdmVDdWVzW2ldLnN0YXJ0VGltZSwgc3RhcnRUaW1lKTtcbiAgICAgICAgZW5kVGltZSA9IE1hdGgubWF4KHRyYWNrLmFjdGl2ZUN1ZXNbaV0uZW5kVGltZSwgZW5kVGltZSk7XG4gICAgICB9XG4gICAgICAvLyBUT0RPOiBoYW5kbGUgYW55IEhUTUwgbWFya3VwIGluIHRoZSBjdWVzIHByb3Blcmx5OyBmb3Igbm93LFxuICAgICAgLy8gICAgICAgd2UganVzdCBzdHJpcCBvdXQgSFRNTCBtYXJrdXAuXG4gICAgICB0ZXh0VG9TcGVhayA9IHRleHRUb1NwZWFrLmpvaW4oJ1xcclxcbicpLnJlcGxhY2UoLzwoPzoufFxcbikqPz4vZ20sICcnKTtcbiAgICB9XG5cbiAgICBpZiAodGV4dFRvU3BlYWspIHtcbiAgICAgIGlmIChzcGVlY2hTeW50aGVzaXMuc3BlYWtpbmcpIHtcbiAgICAgICAgLy8gVE9ETzogSGFuZGxlIGRlc2NyaXB0aW9uIGN1ZSBjb2xsaXNpb25cbiAgICAgICAgdmlkZW9qcy5sb2cud2FybihgU3BlZWNoIHN5bnRoZXNpcyBjb2xsaXNpb24gKCR7dGV4dFRvU3BlYWt9IC0gJHt0aGlzLnNzdS50ZXh0fSkgOiAke2N0fSA6ICR7dGhpcy5zdGFydFRpbWV9IDogJHt0aGlzLmVuZFRpbWV9YCk7XG5cbiAgICAgICAgc3BlZWNoU3ludGhlc2lzLmNhbmNlbCgpO1xuXG4gICAgICB9IGVsc2UgaWYgKHNwZWVjaFN5bnRoZXNpcy5wYXVzZWQpIHtcbiAgICAgICAgLy8gVE9ETzogSGFuZGxlIGlmIHNwZWVjaCBzeW50aGVzaXMgaXMgcGF1c2VkIGhlcmVcbiAgICAgICAgdmlkZW9qcy5sb2cud2FybihgU3BlZWNoIHN5bnRoZXNpcyBjb2xsaXNpb24gKHBhdXNlZCkgKCR7dGV4dFRvU3BlYWt9IC0gJHt0aGlzLnNzdS50ZXh0fSkgOiAke2N0fSA6ICR7dGhpcy5zdGFydFRpbWV9IDogJHt0aGlzLmVuZFRpbWV9YCk7XG5cbiAgICAgICAgc3BlZWNoU3ludGhlc2lzLmNhbmNlbCgpO1xuICAgICAgICBzcGVlY2hTeW50aGVzaXMucmVzdW1lKCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFN0b3JlIGluZm8gYWJvdXQgdGhlIGN1cnJlbnQgY3VlIGZvciBkZWJ1Z2dpbmcgYW5kL29yIGxvZ2dpbmdcbiAgICAgIHRoaXMuc3RhcnRUaW1lID0gc3RhcnRUaW1lO1xuICAgICAgdGhpcy5lbmRUaW1lID0gZW5kVGltZTtcblxuICAgICAgLy8gVE9ETzogTmVlZCB0byBkaXNwb3NlIG9mIHRoaXMgc3N1IGFmdGVyIGl0IGlzIGZpbmlzaGVkP1xuICAgICAgdGhpcy5zc3UgPSBuZXcgd2luZG93LlNwZWVjaFN5bnRoZXNpc1V0dGVyYW5jZSgpO1xuXG4gICAgICB0aGlzLnNzdS50ZXh0ID0gdGV4dFRvU3BlYWs7XG4gICAgICB0aGlzLnNzdS5sYW5nID0gdGhpcy5pbmNyZWFzZUxhbmd1YWdlTG9jYWxpemF0aW9uKHRyYWNrLmxhbmd1YWdlKTtcblxuICAgICAgLy8gVE9ETzogdXNlciBjb250cm9sIG92ZXIgdGhlc2UgYXR0cmlidXRlc1xuICAgICAgdGhpcy5zc3UucmF0ZSA9IDEuMTtcbiAgICAgIHRoaXMuc3N1LnBpdGNoID0gMS4wO1xuICAgICAgdGhpcy5zc3Uudm9sdW1lID0gMS4wO1xuXG4gICAgICAvLyBUT0RPOiBUaGlzIGF1ZGlvIGR1Y2tpbmcgbmVlZHMgdG8gYmUgbWFkZSBtb3JlIHJvYnVzdFxuICAgICAgdGhpcy5zc3Uub25zdGFydCA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgLy8gRHVjayB0aGUgcGxheWVyJ3MgYXVkaW9cbiAgICAgICAgaWYgKCF0aGlzLmlzRHVja2VkKSB7XG4gICAgICAgICAgdGhpcy5pc0R1Y2tlZCA9IHRydWU7XG4gICAgICAgICAgdGhpcy5wbGF5ZXJfLnRlY2hfLnZvbHVtZSh0aGlzLnBsYXllcl8udGVjaF8udm9sdW1lKCkgKiBhdWRpb0R1Y2tpbmdGYWN0b3IpO1xuICAgICAgICB9XG4gICAgICB9LmJpbmQodGhpcyk7XG4gICAgICB0aGlzLnNzdS5vbmVuZCA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgLy8gU3BlZWNoIHN5bnRoZXNpcyBvZiBhIGN1ZSBoYXMgZW5kZWRcblxuICAgICAgICBjb25zdCBkZWx0YSA9IChEYXRlLm5vdygpIC0gdGhpcy5zc3Uuc3RhcnREYXRlKSAvIDEwMDA7XG5cbiAgICAgICAgdmlkZW9qcy5sb2coYFNwZWFrRGVzY3JpcHRpb25zVHJhY2tUVFMgb2YgY3VlOiAke3RoaXMuc3RhcnRUaW1lfSA6ICR7dGhpcy5lbmRUaW1lfSA6ICR7dGhpcy5lbmRUaW1lIC0gdGhpcy5zdGFydFRpbWV9IDogJHtkZWx0YX0gOiAkeyhkZWx0YSAqIDEwMC4wIC8gKHRoaXMuZW5kVGltZSAtIHRoaXMuc3RhcnRUaW1lKSkudG9GaXhlZCgxKX0lYCk7XG5cbiAgICAgICAgLy8gVW4tZHVjayB0aGUgcGxheWVyJ3MgYXVkaW9cbiAgICAgICAgaWYgKHRoaXMuaXNEdWNrZWQpIHtcbiAgICAgICAgICB0aGlzLmlzRHVja2VkID0gZmFsc2U7XG4gICAgICAgICAgdGhpcy5wbGF5ZXJfLnRlY2hfLnZvbHVtZSh0aGlzLnBsYXllcl8udGVjaF8udm9sdW1lKCkgLyBhdWRpb0R1Y2tpbmdGYWN0b3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuZXh0ZW5kZWRQbGF5ZXJTdGF0ZV8gPT09IGV4dGVuZGVkUGxheWVyU3RhdGUucGxheWluZ0V4dGVuZGVkKSB7XG4gICAgICAgICAgdmlkZW9qcy5sb2coJ1VuLXBhdXNpbmcgcGxheWJhY2snKTtcbiAgICAgICAgICB0aGlzLmV4dGVuZGVkUGxheWVyU3RhdGVfID0gZXh0ZW5kZWRQbGF5ZXJTdGF0ZS5wbGF5aW5nO1xuICAgICAgICAgIHRoaXMucGxheWVyXy50ZWNoXy5wbGF5KCk7XG4gICAgICAgICAgdGhpcy5kZXNjcmlwdGlvbkV4dGVuZGVkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0uYmluZCh0aGlzKTtcbiAgICAgIHRoaXMuc3N1Lm9uZXJyb3IgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgIC8vIEFuIGVycm9yIG9jY3VyZWQgZHVyaW5nIHNwZWVjaCBzeW50aGVzaXNcblxuICAgICAgICBjb25zdCBkZWx0YSA9IChEYXRlLm5vdygpIC0gdGhpcy5zc3Uuc3RhcnREYXRlKSAvIDEwMDA7XG5cbiAgICAgICAgdmlkZW9qcy5sb2cud2FybihgU1NVIGVycm9yICgke3RoaXMuc3N1LnRleHR9KWApO1xuICAgICAgICB2aWRlb2pzLmxvZy53YXJuKGBTcGVha0Rlc2NyaXB0aW9uc1RyYWNrVFRTIG9mIGN1ZTogJHt0aGlzLnN0YXJ0VGltZX0gOiAke3RoaXMuZW5kVGltZX0gOiAke3RoaXMuZW5kVGltZSAtIHRoaXMuc3RhcnRUaW1lfSA6ICR7ZGVsdGF9IDogJHsoZGVsdGEgKiAxMDAuMCAvICh0aGlzLmVuZFRpbWUgLSB0aGlzLnN0YXJ0VGltZSkpLnRvRml4ZWQoMSl9JWApO1xuXG4gICAgICAgIC8vIFVuLWR1Y2sgdGhlIHBsYXllcidzIGF1ZGlvXG4gICAgICAgIGlmICh0aGlzLmlzRHVja2VkKSB7XG4gICAgICAgICAgdGhpcy5pc0R1Y2tlZCA9IHRydWU7XG4gICAgICAgICAgdGhpcy5wbGF5ZXJfLnRlY2hfLnZvbHVtZSh0aGlzLnBsYXllcl8udGVjaF8udm9sdW1lKCkgLyBhdWRpb0R1Y2tpbmdGYWN0b3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuZXh0ZW5kZWRQbGF5ZXJTdGF0ZV8gPT09IGV4dGVuZGVkUGxheWVyU3RhdGUucGxheWluZ0V4dGVuZGVkKSB7XG4gICAgICAgICAgdmlkZW9qcy5sb2coJ1VuLXBhdXNpbmcgcGxheWJhY2snKTtcbiAgICAgICAgICB0aGlzLmV4dGVuZGVkUGxheWVyU3RhdGVfID0gZXh0ZW5kZWRQbGF5ZXJTdGF0ZS5wbGF5aW5nO1xuICAgICAgICAgIHRoaXMucGxheWVyXy50ZWNoXy5wbGF5KCk7XG4gICAgICAgICAgdGhpcy5kZXNjcmlwdGlvbkV4dGVuZGVkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0uYmluZCh0aGlzKTtcblxuICAgICAgLy8gU3RhcnQgc3BlYWtpbmcgdGhlIG5ldyB0ZXh0VG9TcGVha1xuXG4gICAgICB0aGlzLnNzdS5zdGFydERhdGUgPSBEYXRlLm5vdygpO1xuICAgICAgc3BlZWNoU3ludGhlc2lzLnNwZWFrKHRoaXMuc3N1KTtcblxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBObyBjdXJyZW50IHRleHRUb1NwZWFrLCBzbyBhIGN1ZSdzIGRpc3BsYXkgdGltZSBoYXMgZW5kZWQuXG5cbiAgICAgIGlmIChzcGVlY2hTeW50aGVzaXMuc3BlYWtpbmcpIHtcbiAgICAgICAgLy8gU3BlZWNoIHN5bnRoZXNpcyBpcyBzdGlsbCBzcGVha2luZyAtIGhhbmRsZSBkZXNjcmlwdGlvbiBjdWUgb3ZlcnJ1blxuICAgICAgICB2aWRlb2pzLmxvZygnUGF1c2luZyBwbGF5YmFjaycpO1xuXG4gICAgICAgIHRoaXMuZXh0ZW5kZWRQbGF5ZXJTdGF0ZV8gPSBleHRlbmRlZFBsYXllclN0YXRlLnBsYXlpbmdFeHRlbmRlZDtcbiAgICAgICAgdGhpcy5kZXNjcmlwdGlvbkV4dGVuZGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5wbGF5ZXJfLnRlY2hfLnBhdXNlKCk7XG5cbiAgICAgIH0gZWxzZSBpZiAoc3BlZWNoU3ludGhlc2lzLnBhdXNlZCkge1xuICAgICAgICAvLyBUT0RPOiBIYW5kbGUgaWYgc3BlZWNoIHN5bnRoZXNpcyBpcyBwYXVzZWQgaGVyZVxuICAgICAgICB2aWRlb2pzLmxvZy53YXJuKGBTcGVlY2ggc3ludGhlc2lzIG92ZXJydW4gKHBhdXNlZCkgKCR7dGhpcy5zc3UudGV4dH0pIDogJHt0aGlzLnN0YXJ0VGltZX0gOiAke3RoaXMuZW5kVGltZX1gKTtcblxuICAgICAgICBzcGVlY2hTeW50aGVzaXMuY2FuY2VsKCk7XG4gICAgICAgIHNwZWVjaFN5bnRoZXNpcy5yZXN1bWUoKTtcblxuICAgLy8gfSBlbHNlIGlmICh0aGlzLnNzdSkge1xuICAgICAvLyB2aWRlb2pzLmxvZyhgU3BlZWNoIGhhZCBlbmRlZCBiZWZvcmUgZW5kIG9mIGN1ZSAoJHt0aGlzLnNzdS50ZXh0fSkgOiAke3RoaXMuc3RhcnRUaW1lfSA6ICR7dGhpcy5lbmRUaW1lfSA6ICR7Y3R9YCk7XG5cbiAgICAgIH1cblxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUcnkgdG8gaW1wcm92ZSB0aGUgbG9jYWxpemF0aW9uIG9mIHRoZSB0ZXh0IHRyYWNrIGxhbmd1YWdlLCB1c2luZ1xuICAgKiAgdGhlIHBsYXllcidzIGxhbmd1YWdlIHNldHRpbmcgYW5kIHRoZSBicm93c2VyJ3MgbGFuZ3VhZ2Ugc2V0dGluZy5cbiAgICogIGUuZy4gaWYgbGFuZz0nZW4nIGFuZCBsYW5ndWFnZSA9ICdlbi1VUycsIHVzZSB0aGUgbW9yZSBzcGVjaWZpY1xuICAgKiAgbG9jYWxpemF0aW9uIG9mIGxhbmd1YWdlLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbGFuZyB0aGUgbGFuZyBhdHRyaWJ1dGUgdG8gdHJ5IHRvIGltcHJvdmVcbiAgICogQHJldHVybiB7c3RyaW5nfSB0aGUgaW1wcm92ZWQgbGFuZyBhdHRyaWJ1dGVcbiAgICogQG1ldGhvZCBpbmNyZWFzZUxhbmd1YWdlTG9jYWxpemF0aW9uXG4gICAqL1xuICBpbmNyZWFzZUxhbmd1YWdlTG9jYWxpemF0aW9uKGxhbmcpIHtcbiAgICBjb25zdCBwbGF5ZXJMYW5ndWFnZSA9IHRoaXMucGxheWVyXy5sYW5ndWFnZSAmJiB0aGlzLnBsYXllcl8ubGFuZ3VhZ2UoKTtcbiAgICBjb25zdCBuYXZpZ2F0b3JMYW5ndWFnZSA9IHdpbmRvdy5uYXZpZ2F0b3IgJiYgd2luZG93Lm5hdmlnYXRvci5sYW5ndWFnZTtcblxuICAgIGlmIChcbiAgICAgIGxhbmcgJiZcbiAgICAgICh0eXBlb2YgbGFuZyA9PT0gJ3N0cmluZycpICYmXG4gICAgICAodHlwZW9mIHBsYXllckxhbmd1YWdlID09PSAnc3RyaW5nJykgJiZcbiAgICAgIChwbGF5ZXJMYW5ndWFnZS5sZW5ndGggPiBsYW5nLmxlbmd0aCkgJiZcbiAgICAgIChwbGF5ZXJMYW5ndWFnZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YobGFuZy50b0xvd2VyQ2FzZSgpKSA9PT0gMClcbiAgICApIHtcblxuICAgICAgbGFuZyA9IHBsYXllckxhbmd1YWdlO1xuICAgIH1cblxuICAgIGlmIChcbiAgICAgIGxhbmcgJiZcbiAgICAgICh0eXBlb2YgbGFuZyA9PT0gJ3N0cmluZycpICYmXG4gICAgICAodHlwZW9mIG5hdmlnYXRvckxhbmd1YWdlID09PSAnc3RyaW5nJykgJiZcbiAgICAgIChuYXZpZ2F0b3JMYW5ndWFnZS5sZW5ndGggPiBsYW5nLmxlbmd0aCkgJiZcbiAgICAgIChuYXZpZ2F0b3JMYW5ndWFnZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YobGFuZy50b0xvd2VyQ2FzZSgpKSA9PT0gMClcbiAgICApIHtcblxuICAgICAgbGFuZyA9IG5hdmlnYXRvckxhbmd1YWdlO1xuICAgIH1cblxuICAgIHJldHVybiBsYW5nO1xuICB9XG59XG5cbmNvbnN0IHNwZWFrRGVzY3JpcHRpb25zVHJhY2sgPSBmdW5jdGlvbihwbGF5ZXIpIHtcbiAgbGV0IHRlY2g7XG5cbiAgcGxheWVyLnNwZWFrRGVzY3JpcHRpb25zVFRTID0gbmV3IFNwZWFrRGVzY3JpcHRpb25zVHJhY2tUVFMocGxheWVyKTtcbiAgcGxheWVyLm9uKCd0ZXh0dHJhY2tjaGFuZ2UnLCBwbGF5ZXIuc3BlYWtEZXNjcmlwdGlvbnNUVFMudGV4dFRyYWNrQ2hhbmdlLmJpbmQocGxheWVyLnNwZWFrRGVzY3JpcHRpb25zVFRTKSk7XG4gIHBsYXllci5vbignZGlzcG9zZScsIHBsYXllci5zcGVha0Rlc2NyaXB0aW9uc1RUUy5kaXNwb3NlLmJpbmQocGxheWVyLnNwZWFrRGVzY3JpcHRpb25zVFRTKSk7XG5cbiAgcmV0dXJuIHtcbiAgICBzZXRTb3VyY2Uoc3JjT2JqLCBuZXh0KSB7XG4gICAgICBuZXh0KG51bGwsIHNyY09iaik7XG4gICAgfSxcblxuICAgIHNldFRlY2gobmV3VGVjaCkge1xuICAgICAgdGVjaCA9IG5ld1RlY2g7XG5cbiAgICAgIHBsYXllci5vZmYodGVjaCwgJ3BhdXNlJywgcGxheWVyLmhhbmRsZVRlY2hQYXVzZV8pO1xuXG4gICAgICB0ZWNoLm9uKCdwYXVzZScsIChldmVudCkgPT4ge1xuICAgICAgICBpZiAocGxheWVyLnNwZWFrRGVzY3JpcHRpb25zVFRTICYmIHBsYXllci5zcGVha0Rlc2NyaXB0aW9uc1RUUy5leHRlbmRlZFBsYXllclN0YXRlXykge1xuICAgICAgICAgIGlmIChwbGF5ZXIuc3BlYWtEZXNjcmlwdGlvbnNUVFMuZXh0ZW5kZWRQbGF5ZXJTdGF0ZV8gIT09IGV4dGVuZGVkUGxheWVyU3RhdGUucGxheWluZ0V4dGVuZGVkKSB7XG4gICAgICAgICAgICBwbGF5ZXIuaGFuZGxlVGVjaFBhdXNlXygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8vIFRPRE86IEV2ZW50dWFsbHkgd2UgbWF5IG1vZGlmeSB0aGUgZHVyYXRpb24gYW5kL29yIGN1cnJlbnQgdGltZSB0byBhbGxvd1xuICAgIC8vICAgICAgIGZvciB0aGUgdGltZSB0aGF0IHRoZSB2aWRlbyBpcyBwYXVzZWQgZm9yIGV4dGVuZGVkIGRlc2NyaXB0aW9uLlxuICAgIC8vICAgICAgIEZvciBub3csIHdlIGp1c3QgdHJlYXQgaXQgYXMgdGhvdWdoIHRoZSB2aWRlbyBzdGFsbGVkIHdoaWxlIHN0cmVhbWluZy5cbiAgICBkdXJhdGlvbihkdXIpIHtcbiAgICAgIHJldHVybiBkdXI7XG4gICAgfSxcblxuICAgIGN1cnJlbnRUaW1lKGN0KSB7XG4gICAgICByZXR1cm4gY3Q7XG4gICAgfSxcblxuICAgIHNldEN1cnJlbnRUaW1lKGN0KSB7XG4gICAgICByZXR1cm4gY3Q7XG4gICAgfSxcblxuICAgIHZvbHVtZSh2b2wpIHtcbiAgICAgIGlmIChwbGF5ZXIuc3BlYWtEZXNjcmlwdGlvbnNUVFMgJiYgcGxheWVyLnNwZWFrRGVzY3JpcHRpb25zVFRTLmlzRHVja2VkKSB7XG4gICAgICAgIHJldHVybiB2b2wgLyBhdWRpb0R1Y2tpbmdGYWN0b3I7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB2b2w7XG4gICAgfSxcblxuICAgIHNldFZvbHVtZSh2b2wpIHtcbiAgICAgIGlmIChwbGF5ZXIuc3BlYWtEZXNjcmlwdGlvbnNUVFMgJiYgcGxheWVyLnNwZWFrRGVzY3JpcHRpb25zVFRTLmlzRHVja2VkKSB7XG4gICAgICAgIHJldHVybiB2b2wgKiBhdWRpb0R1Y2tpbmdGYWN0b3I7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB2b2w7XG4gICAgfSxcblxuICAgIHBhdXNlZCgpIHtcbiAgICAgIGlmIChwbGF5ZXIuc3BlYWtEZXNjcmlwdGlvbnNUVFMpIHtcbiAgICAgICAgcmV0dXJuIHBsYXllci5zcGVha0Rlc2NyaXB0aW9uc1RUUy5wYXVzZWQoKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgY2FsbFBsYXkoKSB7XG4gICAgICBpZiAoIXBsYXllci5zcGVha0Rlc2NyaXB0aW9uc1RUUykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICghcGxheWVyLnNwZWFrRGVzY3JpcHRpb25zVFRTLmV4dGVuZGVkUGxheWVyU3RhdGVfKSB7XG4gICAgICAgIHBsYXllci5zcGVha0Rlc2NyaXB0aW9uc1RUUy5leHRlbmRlZFBsYXllclN0YXRlXyA9IGV4dGVuZGVkUGxheWVyU3RhdGUudW5rbm93bjtcbiAgICAgIH1cblxuICAgICAgc3dpdGNoIChwbGF5ZXIuc3BlYWtEZXNjcmlwdGlvbnNUVFMuZXh0ZW5kZWRQbGF5ZXJTdGF0ZV8pIHtcbiAgICAgIGNhc2UgZXh0ZW5kZWRQbGF5ZXJTdGF0ZS51bmtub3duOlxuICAgICAgY2FzZSBleHRlbmRlZFBsYXllclN0YXRlLmluaXRpYWxpemVkOlxuICAgICAgY2FzZSBleHRlbmRlZFBsYXllclN0YXRlLnBhdXNlZDpcbiAgICAgICAgcGxheWVyLnNwZWFrRGVzY3JpcHRpb25zVFRTLmV4dGVuZGVkUGxheWVyU3RhdGVfID0gZXh0ZW5kZWRQbGF5ZXJTdGF0ZS5wbGF5aW5nO1xuICAgICAgICBwbGF5ZXIuc3BlYWtEZXNjcmlwdGlvbnNUVFMucGxheSgpO1xuICAgICAgICByZXR1cm47XG5cbiAgICAgIGNhc2UgZXh0ZW5kZWRQbGF5ZXJTdGF0ZS5wYXVzZWRFeHRlbmRlZDpcbiAgICAgICAgcGxheWVyLnNwZWFrRGVzY3JpcHRpb25zVFRTLmV4dGVuZGVkUGxheWVyU3RhdGVfID0gZXh0ZW5kZWRQbGF5ZXJTdGF0ZS5wbGF5aW5nRXh0ZW5kZWQ7XG4gICAgICAgIHBsYXllci5zcGVha0Rlc2NyaXB0aW9uc1RUUy5wbGF5KCk7XG4gICAgICAgIHBsYXllci5oYW5kbGVUZWNoUGxheV8oKTtcbiAgICAgICAgcmV0dXJuIHZpZGVvanMubWlkZGxld2FyZS5URVJNSU5BVE9SO1xuICAgICAgfVxuXG4gICAgICByZXR1cm47XG4gICAgfSxcblxuICAgIGNhbGxQYXVzZSgpIHtcbiAgICAgIGlmICghcGxheWVyLnNwZWFrRGVzY3JpcHRpb25zVFRTKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKCFwbGF5ZXIuc3BlYWtEZXNjcmlwdGlvbnNUVFMuZXh0ZW5kZWRQbGF5ZXJTdGF0ZV8pIHtcbiAgICAgICAgcGxheWVyLnNwZWFrRGVzY3JpcHRpb25zVFRTLmV4dGVuZGVkUGxheWVyU3RhdGVfID0gZXh0ZW5kZWRQbGF5ZXJTdGF0ZS51bmtub3duO1xuICAgICAgfVxuXG4gICAgICBzd2l0Y2ggKHBsYXllci5zcGVha0Rlc2NyaXB0aW9uc1RUUy5leHRlbmRlZFBsYXllclN0YXRlXykge1xuICAgICAgY2FzZSBleHRlbmRlZFBsYXllclN0YXRlLnVua25vd246XG4gICAgICBjYXNlIGV4dGVuZGVkUGxheWVyU3RhdGUuaW5pdGlhbGl6ZWQ6XG4gICAgICBjYXNlIGV4dGVuZGVkUGxheWVyU3RhdGUucGxheWluZzpcbiAgICAgICAgcGxheWVyLnNwZWFrRGVzY3JpcHRpb25zVFRTLmV4dGVuZGVkUGxheWVyU3RhdGVfID0gZXh0ZW5kZWRQbGF5ZXJTdGF0ZS5wYXVzZWQ7XG4gICAgICAgIHBsYXllci5zcGVha0Rlc2NyaXB0aW9uc1RUUy5wYXVzZSgpO1xuICAgICAgICByZXR1cm47XG5cbiAgICAgIGNhc2UgZXh0ZW5kZWRQbGF5ZXJTdGF0ZS5wbGF5aW5nRXh0ZW5kZWQ6XG4gICAgICAgIHBsYXllci5zcGVha0Rlc2NyaXB0aW9uc1RUUy5leHRlbmRlZFBsYXllclN0YXRlXyA9IGV4dGVuZGVkUGxheWVyU3RhdGUucGF1c2VkRXh0ZW5kZWQ7XG4gICAgICAgIHBsYXllci5zcGVha0Rlc2NyaXB0aW9uc1RUUy5wYXVzZSgpO1xuICAgICAgICBwbGF5ZXIuaGFuZGxlVGVjaFBhdXNlXygpO1xuICAgICAgICByZXR1cm4gdmlkZW9qcy5taWRkbGV3YXJlLlRFUk1JTkFUT1I7XG4gICAgICB9XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH07XG59O1xuXG4vLyBSZWdpc3RlciB0aGUgcGx1Z2luIHdpdGggdmlkZW8uanMuXG52aWRlb2pzLnVzZSgnKicsIHNwZWFrRGVzY3JpcHRpb25zVHJhY2spO1xuXG4vLyBJbmNsdWRlIHRoZSB2ZXJzaW9uIG51bWJlci5cbnNwZWFrRGVzY3JpcHRpb25zVHJhY2suVkVSU0lPTiA9ICdfX1ZFUlNJT05fXyc7XG5cbm1vZHVsZS5leHBvcnRzID0gc3BlYWtEZXNjcmlwdGlvbnNUcmFjaztcbiJdfQ==
