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
          return videojs.middleware.TERMINATOR;
      }

      return;
    }
  };
};

// Register the plugin with video.js.
videojs.use('*', speakDescriptionsTrack);

// Include the version number.
speakDescriptionsTrack.VERSION = '1.0.0';

module.exports = speakDescriptionsTrack;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"1":1}]},{},[2])(2)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZ2xvYmFsL3dpbmRvdy5qcyIsInNyYy9qcy9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2JBOzs7Ozs7OztBQUVBLFNBQVMsZUFBVCxDQUEwQixFQUExQixFQUE4QjtBQUFFLFNBQVEsTUFBTyxRQUFPLEVBQVAseUNBQU8sRUFBUCxPQUFjLFFBQXJCLElBQWtDLGFBQWEsRUFBaEQsR0FBc0QsR0FBRyxTQUFILENBQXRELEdBQXNFLEVBQTdFO0FBQWtGOztBQUVsSCxJQUFJLFVBQVUsZ0JBQWdCLFFBQVEsVUFBUixDQUFoQixDQUFkO0FBQ0EsSUFBSSxTQUFTLGdCQUFnQixRQUFRLGVBQVIsQ0FBaEIsQ0FBYjs7QUFFQTs7Ozs7O0FBTUEsSUFBTSxzQkFBc0I7QUFDMUIsV0FBUyxTQURpQjtBQUUxQixlQUFhLGFBRmE7QUFHMUIsV0FBUyxTQUhpQjtBQUkxQixVQUFRLFFBSmtCO0FBSzFCLG1CQUFpQixpQkFMUztBQU0xQixrQkFBZ0I7QUFOVSxDQUE1Qjs7QUFTQTtBQUNBLElBQU0scUJBQXFCLElBQTNCOztBQUVBOzs7O0lBR00seUI7QUFDSjs7Ozs7O0FBTUEscUNBQVksTUFBWixFQUFvQjtBQUFBOztBQUNsQixTQUFLLE9BQUwsR0FBZSxNQUFmO0FBQ0EsU0FBSyxvQkFBTCxHQUE0QixvQkFBb0IsV0FBaEQ7QUFDQSxTQUFLLFFBQUwsR0FBZ0IsS0FBaEI7O0FBRUEsUUFBSSxPQUFPLGVBQVgsRUFBNEI7QUFDMUIsYUFBTyxlQUFQLENBQXVCLE1BQXZCO0FBQ0Q7QUFDRjs7QUFFRDs7Ozs7Ozs4QkFHVSxDQUNUOzs7MkJBRU07QUFDTCxVQUFNLGtCQUFrQixPQUFPLGVBQS9COztBQUVBLFVBQUks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QkFBNUIsR0FBbUQsb0JBQW9CLGVBQXZFO0FBQ0EsaUJBQU8sb0JBQVAsQ0FBNEIsSUFBNUI7QUFDQSxpQkFBTyxRQUFRLFVBQVIsQ0FBbUIsVUFBMUI7QUFYRjs7QUFjQTtBQUNELEtBaEZJO0FBa0ZMLGFBbEZLLHVCQWtGTztBQUNWLFVBQUksQ0FBQyxPQUFPLG9CQUFaLEVBQWtDO0FBQ2hDO0FBQ0Q7O0FBRUQsVUFBSSxDQUFDLE9BQU8sb0JBQVAsQ0FBNEIsb0JBQWpDLEVBQXVEO0FBQ3JELGVBQU8sb0JBQVAsQ0FBNEIsb0JBQTVCLEdBQW1ELG9CQUFvQixPQUF2RTtBQUNEOztBQUVELGNBQVEsT0FBTyxvQkFBUCxDQUE0QixvQkFBcEM7QUFDQSxhQUFLLG9CQUFvQixPQUF6QjtBQUNBLGFBQUssb0JBQW9CLFdBQXpCO0FBQ0EsYUFBSyxvQkFBb0IsT0FBekI7QUFDRSxpQkFBTyxvQkFBUCxDQUE0QixvQkFBNUIsR0FBbUQsb0JBQW9CLE1BQXZFO0FBQ0EsaUJBQU8sb0JBQVAsQ0FBNEIsS0FBNUI7QUFDQTs7QUFFRixhQUFLLG9CQUFvQixlQUF6QjtBQUNFLGlCQUFPLG9CQUFQLENBQTRCLG9CQUE1QixHQUFtRCxvQkFBb0IsY0FBdkU7QUFDQSxpQkFBTyxvQkFBUCxDQUE0QixLQUE1QjtBQUNBLGlCQUFPLFFBQVEsVUFBUixDQUFtQixVQUExQjtBQVhGOztBQWNBO0FBQ0Q7QUExR0ksR0FBUDtBQTRHRCxDQW5IRDs7QUFxSEE7QUFDQSxRQUFRLEdBQVIsQ0FBWSxHQUFaLEVBQWlCLHNCQUFqQjs7QUFFQTtBQUNBLHVCQUF1QixPQUF2QixHQUFpQyxhQUFqQzs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsc0JBQWpCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwidmFyIHdpbjtcblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICB3aW4gPSB3aW5kb3c7XG59IGVsc2UgaWYgKHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICB3aW4gPSBnbG9iYWw7XG59IGVsc2UgaWYgKHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiKXtcbiAgICB3aW4gPSBzZWxmO1xufSBlbHNlIHtcbiAgICB3aW4gPSB7fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB3aW47XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wRGVmYXVsdCAoZXgpIHsgcmV0dXJuIChleCAmJiAodHlwZW9mIGV4ID09PSAnb2JqZWN0JykgJiYgJ2RlZmF1bHQnIGluIGV4KSA/IGV4WydkZWZhdWx0J10gOiBleDsgfVxuXG52YXIgdmlkZW9qcyA9IF9pbnRlcm9wRGVmYXVsdChyZXF1aXJlKCd2aWRlby5qcycpKTtcbnZhciB3aW5kb3cgPSBfaW50ZXJvcERlZmF1bHQocmVxdWlyZSgnZ2xvYmFsL3dpbmRvdycpKTtcblxuLyoqXG4gKiBQbGF5ZXIgc3RhdHVzIGZvciBleHRlbmRlZCBkZXNjcmlwdGlvbnMgKHBsYXliYWNrIG9mIGRlc2NyaXB0aW9ucyB3aGlsZSBwYXVzaW5nIHRoZSB0ZWNoKVxuICpcbiAqIEB0eXBlZGVmIGV4dGVuZGVkUGxheWVyU3RhdGVcbiAqIEBlbnVtXG4gKi9cbmNvbnN0IGV4dGVuZGVkUGxheWVyU3RhdGUgPSB7XG4gIHVua25vd246ICd1bmtub3duJyxcbiAgaW5pdGlhbGl6ZWQ6ICdpbml0aWFsaXplZCcsXG4gIHBsYXlpbmc6ICdwbGF5aW5nJyxcbiAgcGF1c2VkOiAncGF1c2VkJyxcbiAgcGxheWluZ0V4dGVuZGVkOiAncGxheWluZ0V4dGVuZGVkJyxcbiAgcGF1c2VkRXh0ZW5kZWQ6ICdwYXVzZWRFeHRlbmRlZCdcbn07XG5cbi8vIFRPRE86IHVzZXIgY29udHJvbCBvdmVyIHRoaXMgYXR0cmlidXRlP1xuY29uc3QgYXVkaW9EdWNraW5nRmFjdG9yID0gMC4yNTtcblxuLyoqXG4gKiBUaGUgU3BlYWtEZXNjcmlwdGlvbnNUcmFja1RUUyBjb21wb25lbnRcbiAqL1xuY2xhc3MgU3BlYWtEZXNjcmlwdGlvbnNUcmFja1RUUyB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIGluc3RhbmNlIG9mIHRoaXMgY2xhc3MuXG4gICAqXG4gICAqIEBwYXJhbSB7UGxheWVyfSBwbGF5ZXJcbiAgICogICAgICAgIFRoZSBgUGxheWVyYCB0aGF0IHRoaXMgY2xhc3Mgc2hvdWxkIGJlIGF0dGFjaGVkIHRvLlxuICAgKi9cbiAgY29uc3RydWN0b3IocGxheWVyKSB7XG4gICAgdGhpcy5wbGF5ZXJfID0gcGxheWVyO1xuICAgIHRoaXMuZXh0ZW5kZWRQbGF5ZXJTdGF0ZV8gPSBleHRlbmRlZFBsYXllclN0YXRlLmluaXRpYWxpemVkO1xuICAgIHRoaXMuaXNEdWNrZWQgPSBmYWxzZTtcblxuICAgIGlmICh3aW5kb3cuc3BlZWNoU3ludGhlc2lzKSB7XG4gICAgICB3aW5kb3cuc3BlZWNoU3ludGhlc2lzLmNhbmNlbCgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEaXNwb3NlIG9mIHRoZSBgU3BlYWtEZXNjcmlwdGlvbnNUcmFja1RUU2BcbiAgICovXG4gIGRpc3Bvc2UoKSB7XG4gIH1cblxuICBwbGF5KCkge1xuICAgIGNvbnN0IHNwZWVjaFN5bnRoZXNpcyA9IHdpbmRvdy5zcGVlY2hTeW50aGVzaXM7XG5cbiAgICBpZiAoc3BlZWNoU3ludGhlc2lzLnBhdXNlZCkge1xuICAgICAgc3BlZWNoU3ludGhlc2lzLnJlc3VtZSgpO1xuICAgIH1cbiAgfVxuXG4gIHBhdXNlKCkge1xuICAgIGNvbnN0IHNwZWVjaFN5bnRoZXNpcyA9IHdpbmRvdy5zcGVlY2hTeW50aGVzaXM7XG5cbiAgICBpZiAoc3BlZWNoU3ludGhlc2lzLnNwZWFraW5nKSB7XG4gICAgICBzcGVlY2hTeW50aGVzaXMucGF1c2UoKTtcbiAgICB9XG4gIH1cblxuICBwYXVzZWQoKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIHRoaXMuZXh0ZW5kZWRQbGF5ZXJTdGF0ZV8gPT09IGV4dGVuZGVkUGxheWVyU3RhdGUucGF1c2VkIHx8XG4gICAgICB0aGlzLmV4dGVuZGVkUGxheWVyU3RhdGVfID09PSBleHRlbmRlZFBsYXllclN0YXRlLnBhdXNlZEV4dGVuZGVkXG4gICAgKTtcbiAgfVxuXG4gIHRleHRUcmFja0NoYW5nZSgpIHtcbiAgICBjb25zdCB0cmFja3MgPSB0aGlzLnBsYXllcl8udGV4dFRyYWNrcygpO1xuICAgIGxldCBkZXNjcmlwdGlvbnNUcmFjayA9IG51bGw7XG4gICAgbGV0IGkgPSB0cmFja3MubGVuZ3RoO1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgY29uc3QgdHJhY2sgPSB0cmFja3NbaV07XG5cbiAgICAgIGlmICh0cmFjay5tb2RlID09PSAnc2hvd2luZycpIHtcbiAgICAgICAgaWYgKHRyYWNrLmtpbmQgPT09ICdkZXNjcmlwdGlvbnMnKSB7XG4gICAgICAgICAgZGVzY3JpcHRpb25zVHJhY2sgPSB0cmFjaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChkZXNjcmlwdGlvbnNUcmFjaykge1xuICAgICAgdGhpcy5zcGVha0FjdGl2ZUN1ZXMoZGVzY3JpcHRpb25zVHJhY2spO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBVc2UgYnJvd3NlciBTcGVlY2ggU3ludGhlc2lzIChha2EgVFRTKSB0byBzcGVhayBhY3RpdmUgY3VlcywgaWYgc3VwcG9ydGVkXG4gICAqXG4gICAqIEBwYXJhbSB7VGV4dFRyYWNrT2JqZWN0fSB0cmFjayBUZXh0dHJhY2sgb2JqZWN0IHRvIHNwZWFrXG4gICAqIEBtZXRob2Qgc3BlYWtBY3RpdmVDdWVzXG4gICAqL1xuICBzcGVha0FjdGl2ZUN1ZXModHJhY2spIHtcbiAgICBpZiAoIXdpbmRvdy5TcGVlY2hTeW50aGVzaXNVdHRlcmFuY2UgfHwgIXdpbmRvdy5zcGVlY2hTeW50aGVzaXMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBzcGVlY2hTeW50aGVzaXMgPSB3aW5kb3cuc3BlZWNoU3ludGhlc2lzO1xuXG4gICAgbGV0IHRleHRUb1NwZWFrID0gW107XG4gICAgbGV0IHN0YXJ0VGltZSA9IEluZmluaXR5O1xuICAgIGxldCBlbmRUaW1lID0gLUluZmluaXR5O1xuICAgIGNvbnN0IGN0ID0gdGhpcy5wbGF5ZXJfLmN1cnJlbnRUaW1lKCk7XG5cbiAgICBpZiAodHJhY2suYWN0aXZlQ3Vlcykge1xuICAgICAgLy8gVE9ETzogTmVlZCB0byBoYW5kbGUgdGhpcyBsb2dpYyBiZXR0ZXI7IGl0J3MgcG9zc2libGUgdGhhdCBhIG5ldyBjdWVcbiAgICAgIC8vICAgICAgIHN0YXJ0ZWQgd2hpbGUgYW5vdGhlciBpcyBzdGlsbCBhY3RpdmUuIFdlIGRvbid0IGhhbmRsZSB0aGF0IGNvcnJlY3RseS5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdHJhY2suYWN0aXZlQ3Vlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0ZXh0VG9TcGVhay5wdXNoKHRyYWNrLmFjdGl2ZUN1ZXNbaV0udGV4dCk7XG4gICAgICAgIHN0YXJ0VGltZSA9IE1hdGgubWluKHRyYWNrLmFjdGl2ZUN1ZXNbaV0uc3RhcnRUaW1lLCBzdGFydFRpbWUpO1xuICAgICAgICBlbmRUaW1lID0gTWF0aC5tYXgodHJhY2suYWN0aXZlQ3Vlc1tpXS5lbmRUaW1lLCBlbmRUaW1lKTtcbiAgICAgIH1cbiAgICAgIC8vIFRPRE86IGhhbmRsZSBhbnkgSFRNTCBtYXJrdXAgaW4gdGhlIGN1ZXMgcHJvcGVybHk7IGZvciBub3csXG4gICAgICAvLyAgICAgICB3ZSBqdXN0IHN0cmlwIG91dCBIVE1MIG1hcmt1cC5cbiAgICAgIHRleHRUb1NwZWFrID0gdGV4dFRvU3BlYWsuam9pbignXFxyXFxuJykucmVwbGFjZSgvPCg/Oi58XFxuKSo/Pi9nbSwgJycpO1xuICAgIH1cblxuICAgIGlmICh0ZXh0VG9TcGVhaykge1xuICAgICAgaWYgKHNwZWVjaFN5bnRoZXNpcy5zcGVha2luZykge1xuICAgICAgICAvLyBUT0RPOiBIYW5kbGUgZGVzY3JpcHRpb24gY3VlIGNvbGxpc2lvblxuICAgICAgICB2aWRlb2pzLmxvZy53YXJuKGBTcGVlY2ggc3ludGhlc2lzIGNvbGxpc2lvbiAoJHt0ZXh0VG9TcGVha30gLSAke3RoaXMuc3N1LnRleHR9KSA6ICR7Y3R9IDogJHt0aGlzLnN0YXJ0VGltZX0gOiAke3RoaXMuZW5kVGltZX1gKTtcblxuICAgICAgICBzcGVlY2hTeW50aGVzaXMuY2FuY2VsKCk7XG5cbiAgICAgIH0gZWxzZSBpZiAoc3BlZWNoU3ludGhlc2lzLnBhdXNlZCkge1xuICAgICAgICAvLyBUT0RPOiBIYW5kbGUgaWYgc3BlZWNoIHN5bnRoZXNpcyBpcyBwYXVzZWQgaGVyZVxuICAgICAgICB2aWRlb2pzLmxvZy53YXJuKGBTcGVlY2ggc3ludGhlc2lzIGNvbGxpc2lvbiAocGF1c2VkKSAoJHt0ZXh0VG9TcGVha30gLSAke3RoaXMuc3N1LnRleHR9KSA6ICR7Y3R9IDogJHt0aGlzLnN0YXJ0VGltZX0gOiAke3RoaXMuZW5kVGltZX1gKTtcblxuICAgICAgICBzcGVlY2hTeW50aGVzaXMuY2FuY2VsKCk7XG4gICAgICAgIHNwZWVjaFN5bnRoZXNpcy5yZXN1bWUoKTtcbiAgICAgIH1cblxuICAgICAgLy8gU3RvcmUgaW5mbyBhYm91dCB0aGUgY3VycmVudCBjdWUgZm9yIGRlYnVnZ2luZyBhbmQvb3IgbG9nZ2luZ1xuICAgICAgdGhpcy5zdGFydFRpbWUgPSBzdGFydFRpbWU7XG4gICAgICB0aGlzLmVuZFRpbWUgPSBlbmRUaW1lO1xuXG4gICAgICAvLyBUT0RPOiBOZWVkIHRvIGRpc3Bvc2Ugb2YgdGhpcyBzc3UgYWZ0ZXIgaXQgaXMgZmluaXNoZWQ/XG4gICAgICB0aGlzLnNzdSA9IG5ldyB3aW5kb3cuU3BlZWNoU3ludGhlc2lzVXR0ZXJhbmNlKCk7XG5cbiAgICAgIHRoaXMuc3N1LnRleHQgPSB0ZXh0VG9TcGVhaztcbiAgICAgIHRoaXMuc3N1LmxhbmcgPSB0aGlzLmluY3JlYXNlTGFuZ3VhZ2VMb2NhbGl6YXRpb24odHJhY2subGFuZ3VhZ2UpO1xuXG4gICAgICAvLyBUT0RPOiB1c2VyIGNvbnRyb2wgb3ZlciB0aGVzZSBhdHRyaWJ1dGVzXG4gICAgICB0aGlzLnNzdS5yYXRlID0gMS4xO1xuICAgICAgdGhpcy5zc3UucGl0Y2ggPSAxLjA7XG4gICAgICB0aGlzLnNzdS52b2x1bWUgPSAxLjA7XG5cbiAgICAgIC8vIFRPRE86IFRoaXMgYXVkaW8gZHVja2luZyBuZWVkcyB0byBiZSBtYWRlIG1vcmUgcm9idXN0XG4gICAgICB0aGlzLnNzdS5vbnN0YXJ0ID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAvLyBEdWNrIHRoZSBwbGF5ZXIncyBhdWRpb1xuICAgICAgICBpZiAoIXRoaXMuaXNEdWNrZWQpIHtcbiAgICAgICAgICB0aGlzLmlzRHVja2VkID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLnBsYXllcl8udGVjaF8udm9sdW1lKHRoaXMucGxheWVyXy50ZWNoXy52b2x1bWUoKSAqIGF1ZGlvRHVja2luZ0ZhY3Rvcik7XG4gICAgICAgIH1cbiAgICAgIH0uYmluZCh0aGlzKTtcbiAgICAgIHRoaXMuc3N1Lm9uZW5kID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAvLyBTcGVlY2ggc3ludGhlc2lzIG9mIGEgY3VlIGhhcyBlbmRlZFxuXG4gICAgICAgIGNvbnN0IGRlbHRhID0gKERhdGUubm93KCkgLSB0aGlzLnNzdS5zdGFydERhdGUpIC8gMTAwMDtcblxuICAgICAgICB2aWRlb2pzLmxvZyhgU3BlYWtEZXNjcmlwdGlvbnNUcmFja1RUUyBvZiBjdWU6ICR7dGhpcy5zdGFydFRpbWV9IDogJHt0aGlzLmVuZFRpbWV9IDogJHt0aGlzLmVuZFRpbWUgLSB0aGlzLnN0YXJ0VGltZX0gOiAke2RlbHRhfSA6ICR7KGRlbHRhICogMTAwLjAgLyAodGhpcy5lbmRUaW1lIC0gdGhpcy5zdGFydFRpbWUpKS50b0ZpeGVkKDEpfSVgKTtcblxuICAgICAgICAvLyBVbi1kdWNrIHRoZSBwbGF5ZXIncyBhdWRpb1xuICAgICAgICBpZiAodGhpcy5pc0R1Y2tlZCkge1xuICAgICAgICAgIHRoaXMuaXNEdWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICB0aGlzLnBsYXllcl8udGVjaF8udm9sdW1lKHRoaXMucGxheWVyXy50ZWNoXy52b2x1bWUoKSAvIGF1ZGlvRHVja2luZ0ZhY3Rvcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5leHRlbmRlZFBsYXllclN0YXRlXyA9PT0gZXh0ZW5kZWRQbGF5ZXJTdGF0ZS5wbGF5aW5nRXh0ZW5kZWQpIHtcbiAgICAgICAgICB2aWRlb2pzLmxvZygnVW4tcGF1c2luZyBwbGF5YmFjaycpO1xuICAgICAgICAgIHRoaXMuZXh0ZW5kZWRQbGF5ZXJTdGF0ZV8gPSBleHRlbmRlZFBsYXllclN0YXRlLnBsYXlpbmc7XG4gICAgICAgICAgdGhpcy5wbGF5ZXJfLnRlY2hfLnBsYXkoKTtcbiAgICAgICAgICB0aGlzLmRlc2NyaXB0aW9uRXh0ZW5kZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfS5iaW5kKHRoaXMpO1xuICAgICAgdGhpcy5zc3Uub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgLy8gQW4gZXJyb3Igb2NjdXJlZCBkdXJpbmcgc3BlZWNoIHN5bnRoZXNpc1xuXG4gICAgICAgIGNvbnN0IGRlbHRhID0gKERhdGUubm93KCkgLSB0aGlzLnNzdS5zdGFydERhdGUpIC8gMTAwMDtcblxuICAgICAgICB2aWRlb2pzLmxvZy53YXJuKGBTU1UgZXJyb3IgKCR7dGhpcy5zc3UudGV4dH0pYCk7XG4gICAgICAgIHZpZGVvanMubG9nLndhcm4oYFNwZWFrRGVzY3JpcHRpb25zVHJhY2tUVFMgb2YgY3VlOiAke3RoaXMuc3RhcnRUaW1lfSA6ICR7dGhpcy5lbmRUaW1lfSA6ICR7dGhpcy5lbmRUaW1lIC0gdGhpcy5zdGFydFRpbWV9IDogJHtkZWx0YX0gOiAkeyhkZWx0YSAqIDEwMC4wIC8gKHRoaXMuZW5kVGltZSAtIHRoaXMuc3RhcnRUaW1lKSkudG9GaXhlZCgxKX0lYCk7XG5cbiAgICAgICAgLy8gVW4tZHVjayB0aGUgcGxheWVyJ3MgYXVkaW9cbiAgICAgICAgaWYgKHRoaXMuaXNEdWNrZWQpIHtcbiAgICAgICAgICB0aGlzLmlzRHVja2VkID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLnBsYXllcl8udGVjaF8udm9sdW1lKHRoaXMucGxheWVyXy50ZWNoXy52b2x1bWUoKSAvIGF1ZGlvRHVja2luZ0ZhY3Rvcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5leHRlbmRlZFBsYXllclN0YXRlXyA9PT0gZXh0ZW5kZWRQbGF5ZXJTdGF0ZS5wbGF5aW5nRXh0ZW5kZWQpIHtcbiAgICAgICAgICB2aWRlb2pzLmxvZygnVW4tcGF1c2luZyBwbGF5YmFjaycpO1xuICAgICAgICAgIHRoaXMuZXh0ZW5kZWRQbGF5ZXJTdGF0ZV8gPSBleHRlbmRlZFBsYXllclN0YXRlLnBsYXlpbmc7XG4gICAgICAgICAgdGhpcy5wbGF5ZXJfLnRlY2hfLnBsYXkoKTtcbiAgICAgICAgICB0aGlzLmRlc2NyaXB0aW9uRXh0ZW5kZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgICAvLyBTdGFydCBzcGVha2luZyB0aGUgbmV3IHRleHRUb1NwZWFrXG5cbiAgICAgIHRoaXMuc3N1LnN0YXJ0RGF0ZSA9IERhdGUubm93KCk7XG4gICAgICBzcGVlY2hTeW50aGVzaXMuc3BlYWsodGhpcy5zc3UpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE5vIGN1cnJlbnQgdGV4dFRvU3BlYWssIHNvIGEgY3VlJ3MgZGlzcGxheSB0aW1lIGhhcyBlbmRlZC5cblxuICAgICAgaWYgKHNwZWVjaFN5bnRoZXNpcy5zcGVha2luZykge1xuICAgICAgICAvLyBTcGVlY2ggc3ludGhlc2lzIGlzIHN0aWxsIHNwZWFraW5nIC0gaGFuZGxlIGRlc2NyaXB0aW9uIGN1ZSBvdmVycnVuXG4gICAgICAgIHZpZGVvanMubG9nKCdQYXVzaW5nIHBsYXliYWNrJyk7XG5cbiAgICAgICAgdGhpcy5leHRlbmRlZFBsYXllclN0YXRlXyA9IGV4dGVuZGVkUGxheWVyU3RhdGUucGxheWluZ0V4dGVuZGVkO1xuICAgICAgICB0aGlzLmRlc2NyaXB0aW9uRXh0ZW5kZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLnBsYXllcl8udGVjaF8ucGF1c2UoKTtcblxuICAgICAgfSBlbHNlIGlmIChzcGVlY2hTeW50aGVzaXMucGF1c2VkKSB7XG4gICAgICAgIC8vIFRPRE86IEhhbmRsZSBpZiBzcGVlY2ggc3ludGhlc2lzIGlzIHBhdXNlZCBoZXJlXG4gICAgICAgIHZpZGVvanMubG9nLndhcm4oYFNwZWVjaCBzeW50aGVzaXMgb3ZlcnJ1biAocGF1c2VkKSAoJHt0aGlzLnNzdS50ZXh0fSkgOiAke3RoaXMuc3RhcnRUaW1lfSA6ICR7dGhpcy5lbmRUaW1lfWApO1xuXG4gICAgICAgIHNwZWVjaFN5bnRoZXNpcy5jYW5jZWwoKTtcbiAgICAgICAgc3BlZWNoU3ludGhlc2lzLnJlc3VtZSgpO1xuXG4gICAvLyB9IGVsc2UgaWYgKHRoaXMuc3N1KSB7XG4gICAgIC8vIHZpZGVvanMubG9nKGBTcGVlY2ggaGFkIGVuZGVkIGJlZm9yZSBlbmQgb2YgY3VlICgke3RoaXMuc3N1LnRleHR9KSA6ICR7dGhpcy5zdGFydFRpbWV9IDogJHt0aGlzLmVuZFRpbWV9IDogJHtjdH1gKTtcblxuICAgICAgfVxuXG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRyeSB0byBpbXByb3ZlIHRoZSBsb2NhbGl6YXRpb24gb2YgdGhlIHRleHQgdHJhY2sgbGFuZ3VhZ2UsIHVzaW5nXG4gICAqICB0aGUgcGxheWVyJ3MgbGFuZ3VhZ2Ugc2V0dGluZyBhbmQgdGhlIGJyb3dzZXIncyBsYW5ndWFnZSBzZXR0aW5nLlxuICAgKiAgZS5nLiBpZiBsYW5nPSdlbicgYW5kIGxhbmd1YWdlID0gJ2VuLVVTJywgdXNlIHRoZSBtb3JlIHNwZWNpZmljXG4gICAqICBsb2NhbGl6YXRpb24gb2YgbGFuZ3VhZ2UuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBsYW5nIHRoZSBsYW5nIGF0dHJpYnV0ZSB0byB0cnkgdG8gaW1wcm92ZVxuICAgKiBAcmV0dXJuIHtzdHJpbmd9IHRoZSBpbXByb3ZlZCBsYW5nIGF0dHJpYnV0ZVxuICAgKiBAbWV0aG9kIGluY3JlYXNlTGFuZ3VhZ2VMb2NhbGl6YXRpb25cbiAgICovXG4gIGluY3JlYXNlTGFuZ3VhZ2VMb2NhbGl6YXRpb24obGFuZykge1xuICAgIGNvbnN0IHBsYXllckxhbmd1YWdlID0gdGhpcy5wbGF5ZXJfLmxhbmd1YWdlICYmIHRoaXMucGxheWVyXy5sYW5ndWFnZSgpO1xuICAgIGNvbnN0IG5hdmlnYXRvckxhbmd1YWdlID0gd2luZG93Lm5hdmlnYXRvciAmJiB3aW5kb3cubmF2aWdhdG9yLmxhbmd1YWdlO1xuXG4gICAgaWYgKFxuICAgICAgbGFuZyAmJlxuICAgICAgKHR5cGVvZiBsYW5nID09PSAnc3RyaW5nJykgJiZcbiAgICAgICh0eXBlb2YgcGxheWVyTGFuZ3VhZ2UgPT09ICdzdHJpbmcnKSAmJlxuICAgICAgKHBsYXllckxhbmd1YWdlLmxlbmd0aCA+IGxhbmcubGVuZ3RoKSAmJlxuICAgICAgKHBsYXllckxhbmd1YWdlLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihsYW5nLnRvTG93ZXJDYXNlKCkpID09PSAwKVxuICAgICkge1xuXG4gICAgICBsYW5nID0gcGxheWVyTGFuZ3VhZ2U7XG4gICAgfVxuXG4gICAgaWYgKFxuICAgICAgbGFuZyAmJlxuICAgICAgKHR5cGVvZiBsYW5nID09PSAnc3RyaW5nJykgJiZcbiAgICAgICh0eXBlb2YgbmF2aWdhdG9yTGFuZ3VhZ2UgPT09ICdzdHJpbmcnKSAmJlxuICAgICAgKG5hdmlnYXRvckxhbmd1YWdlLmxlbmd0aCA+IGxhbmcubGVuZ3RoKSAmJlxuICAgICAgKG5hdmlnYXRvckxhbmd1YWdlLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihsYW5nLnRvTG93ZXJDYXNlKCkpID09PSAwKVxuICAgICkge1xuXG4gICAgICBsYW5nID0gbmF2aWdhdG9yTGFuZ3VhZ2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIGxhbmc7XG4gIH1cbn1cblxuY29uc3Qgc3BlYWtEZXNjcmlwdGlvbnNUcmFjayA9IGZ1bmN0aW9uKHBsYXllcikge1xuICBsZXQgdGVjaDtcblxuICBwbGF5ZXIuc3BlYWtEZXNjcmlwdGlvbnNUVFMgPSBuZXcgU3BlYWtEZXNjcmlwdGlvbnNUcmFja1RUUyhwbGF5ZXIpO1xuICBwbGF5ZXIub24oJ3RleHR0cmFja2NoYW5nZScsIHBsYXllci5zcGVha0Rlc2NyaXB0aW9uc1RUUy50ZXh0VHJhY2tDaGFuZ2UuYmluZChwbGF5ZXIuc3BlYWtEZXNjcmlwdGlvbnNUVFMpKTtcbiAgcGxheWVyLm9uKCdkaXNwb3NlJywgcGxheWVyLnNwZWFrRGVzY3JpcHRpb25zVFRTLmRpc3Bvc2UuYmluZChwbGF5ZXIuc3BlYWtEZXNjcmlwdGlvbnNUVFMpKTtcblxuICByZXR1cm4ge1xuICAgIHNldFNvdXJjZShzcmNPYmosIG5leHQpIHtcbiAgICAgIG5leHQobnVsbCwgc3JjT2JqKTtcbiAgICB9LFxuXG4gICAgc2V0VGVjaChuZXdUZWNoKSB7XG4gICAgICB0ZWNoID0gbmV3VGVjaDtcblxuICAgICAgcGxheWVyLm9mZih0ZWNoLCAncGF1c2UnLCBwbGF5ZXIuaGFuZGxlVGVjaFBhdXNlXyk7XG5cbiAgICAgIHRlY2gub24oJ3BhdXNlJywgKGV2ZW50KSA9PiB7XG4gICAgICAgIGlmIChwbGF5ZXIuc3BlYWtEZXNjcmlwdGlvbnNUVFMgJiYgcGxheWVyLnNwZWFrRGVzY3JpcHRpb25zVFRTLmV4dGVuZGVkUGxheWVyU3RhdGVfKSB7XG4gICAgICAgICAgaWYgKHBsYXllci5zcGVha0Rlc2NyaXB0aW9uc1RUUy5leHRlbmRlZFBsYXllclN0YXRlXyAhPT0gZXh0ZW5kZWRQbGF5ZXJTdGF0ZS5wbGF5aW5nRXh0ZW5kZWQpIHtcbiAgICAgICAgICAgIHBsYXllci5oYW5kbGVUZWNoUGF1c2VfKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgLy8gVE9ETzogRXZlbnR1YWxseSB3ZSBtYXkgbW9kaWZ5IHRoZSBkdXJhdGlvbiBhbmQvb3IgY3VycmVudCB0aW1lIHRvIGFsbG93XG4gICAgLy8gICAgICAgZm9yIHRoZSB0aW1lIHRoYXQgdGhlIHZpZGVvIGlzIHBhdXNlZCBmb3IgZXh0ZW5kZWQgZGVzY3JpcHRpb24uXG4gICAgLy8gICAgICAgRm9yIG5vdywgd2UganVzdCB0cmVhdCBpdCBhcyB0aG91Z2ggdGhlIHZpZGVvIHN0YWxsZWQgd2hpbGUgc3RyZWFtaW5nLlxuICAgIGR1cmF0aW9uKGR1cikge1xuICAgICAgcmV0dXJuIGR1cjtcbiAgICB9LFxuXG4gICAgY3VycmVudFRpbWUoY3QpIHtcbiAgICAgIHJldHVybiBjdDtcbiAgICB9LFxuXG4gICAgc2V0Q3VycmVudFRpbWUoY3QpIHtcbiAgICAgIHJldHVybiBjdDtcbiAgICB9LFxuXG4gICAgdm9sdW1lKHZvbCkge1xuICAgICAgaWYgKHBsYXllci5zcGVha0Rlc2NyaXB0aW9uc1RUUyAmJiBwbGF5ZXIuc3BlYWtEZXNjcmlwdGlvbnNUVFMuaXNEdWNrZWQpIHtcbiAgICAgICAgcmV0dXJuIHZvbCAvIGF1ZGlvRHVja2luZ0ZhY3RvcjtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHZvbDtcbiAgICB9LFxuXG4gICAgc2V0Vm9sdW1lKHZvbCkge1xuICAgICAgaWYgKHBsYXllci5zcGVha0Rlc2NyaXB0aW9uc1RUUyAmJiBwbGF5ZXIuc3BlYWtEZXNjcmlwdGlvbnNUVFMuaXNEdWNrZWQpIHtcbiAgICAgICAgcmV0dXJuIHZvbCAqIGF1ZGlvRHVja2luZ0ZhY3RvcjtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHZvbDtcbiAgICB9LFxuXG4gICAgcGF1c2VkKCkge1xuICAgICAgaWYgKHBsYXllci5zcGVha0Rlc2NyaXB0aW9uc1RUUykge1xuICAgICAgICByZXR1cm4gcGxheWVyLnNwZWFrRGVzY3JpcHRpb25zVFRTLnBhdXNlZCgpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBjYWxsUGxheSgpIHtcbiAgICAgIGlmICghcGxheWVyLnNwZWFrRGVzY3JpcHRpb25zVFRTKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKCFwbGF5ZXIuc3BlYWtEZXNjcmlwdGlvbnNUVFMuZXh0ZW5kZWRQbGF5ZXJTdGF0ZV8pIHtcbiAgICAgICAgcGxheWVyLnNwZWFrRGVzY3JpcHRpb25zVFRTLmV4dGVuZGVkUGxheWVyU3RhdGVfID0gZXh0ZW5kZWRQbGF5ZXJTdGF0ZS51bmtub3duO1xuICAgICAgfVxuXG4gICAgICBzd2l0Y2ggKHBsYXllci5zcGVha0Rlc2NyaXB0aW9uc1RUUy5leHRlbmRlZFBsYXllclN0YXRlXykge1xuICAgICAgY2FzZSBleHRlbmRlZFBsYXllclN0YXRlLnVua25vd246XG4gICAgICBjYXNlIGV4dGVuZGVkUGxheWVyU3RhdGUuaW5pdGlhbGl6ZWQ6XG4gICAgICBjYXNlIGV4dGVuZGVkUGxheWVyU3RhdGUucGF1c2VkOlxuICAgICAgICBwbGF5ZXIuc3BlYWtEZXNjcmlwdGlvbnNUVFMuZXh0ZW5kZWRQbGF5ZXJTdGF0ZV8gPSBleHRlbmRlZFBsYXllclN0YXRlLnBsYXlpbmc7XG4gICAgICAgIHBsYXllci5zcGVha0Rlc2NyaXB0aW9uc1RUUy5wbGF5KCk7XG4gICAgICAgIHJldHVybjtcblxuICAgICAgY2FzZSBleHRlbmRlZFBsYXllclN0YXRlLnBhdXNlZEV4dGVuZGVkOlxuICAgICAgICBwbGF5ZXIuc3BlYWtEZXNjcmlwdGlvbnNUVFMuZXh0ZW5kZWRQbGF5ZXJTdGF0ZV8gPSBleHRlbmRlZFBsYXllclN0YXRlLnBsYXlpbmdFeHRlbmRlZDtcbiAgICAgICAgcGxheWVyLnNwZWFrRGVzY3JpcHRpb25zVFRTLnBsYXkoKTtcbiAgICAgICAgcmV0dXJuIHZpZGVvanMubWlkZGxld2FyZS5URVJNSU5BVE9SO1xuICAgICAgfVxuXG4gICAgICByZXR1cm47XG4gICAgfSxcblxuICAgIGNhbGxQYXVzZSgpIHtcbiAgICAgIGlmICghcGxheWVyLnNwZWFrRGVzY3JpcHRpb25zVFRTKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKCFwbGF5ZXIuc3BlYWtEZXNjcmlwdGlvbnNUVFMuZXh0ZW5kZWRQbGF5ZXJTdGF0ZV8pIHtcbiAgICAgICAgcGxheWVyLnNwZWFrRGVzY3JpcHRpb25zVFRTLmV4dGVuZGVkUGxheWVyU3RhdGVfID0gZXh0ZW5kZWRQbGF5ZXJTdGF0ZS51bmtub3duO1xuICAgICAgfVxuXG4gICAgICBzd2l0Y2ggKHBsYXllci5zcGVha0Rlc2NyaXB0aW9uc1RUUy5leHRlbmRlZFBsYXllclN0YXRlXykge1xuICAgICAgY2FzZSBleHRlbmRlZFBsYXllclN0YXRlLnVua25vd246XG4gICAgICBjYXNlIGV4dGVuZGVkUGxheWVyU3RhdGUuaW5pdGlhbGl6ZWQ6XG4gICAgICBjYXNlIGV4dGVuZGVkUGxheWVyU3RhdGUucGxheWluZzpcbiAgICAgICAgcGxheWVyLnNwZWFrRGVzY3JpcHRpb25zVFRTLmV4dGVuZGVkUGxheWVyU3RhdGVfID0gZXh0ZW5kZWRQbGF5ZXJTdGF0ZS5wYXVzZWQ7XG4gICAgICAgIHBsYXllci5zcGVha0Rlc2NyaXB0aW9uc1RUUy5wYXVzZSgpO1xuICAgICAgICByZXR1cm47XG5cbiAgICAgIGNhc2UgZXh0ZW5kZWRQbGF5ZXJTdGF0ZS5wbGF5aW5nRXh0ZW5kZWQ6XG4gICAgICAgIHBsYXllci5zcGVha0Rlc2NyaXB0aW9uc1RUUy5leHRlbmRlZFBsYXllclN0YXRlXyA9IGV4dGVuZGVkUGxheWVyU3RhdGUucGF1c2VkRXh0ZW5kZWQ7XG4gICAgICAgIHBsYXllci5zcGVha0Rlc2NyaXB0aW9uc1RUUy5wYXVzZSgpO1xuICAgICAgICByZXR1cm4gdmlkZW9qcy5taWRkbGV3YXJlLlRFUk1JTkFUT1I7XG4gICAgICB9XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH07XG59O1xuXG4vLyBSZWdpc3RlciB0aGUgcGx1Z2luIHdpdGggdmlkZW8uanMuXG52aWRlb2pzLnVzZSgnKicsIHNwZWFrRGVzY3JpcHRpb25zVHJhY2spO1xuXG4vLyBJbmNsdWRlIHRoZSB2ZXJzaW9uIG51bWJlci5cbnNwZWFrRGVzY3JpcHRpb25zVHJhY2suVkVSU0lPTiA9ICdfX1ZFUlNJT05fXyc7XG5cbm1vZHVsZS5leHBvcnRzID0gc3BlYWtEZXNjcmlwdGlvbnNUcmFjaztcbiJdfQ==
