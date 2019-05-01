/*! @name videojs-speak-descriptions-track @version 1.3.1 @license MIT */
'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var videojs = _interopDefault(require('video.js'));
var window = _interopDefault(require('global/window'));

var version = "1.3.1";

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
}; // TODO: user control over this attribute?

var audioDuckingFactor = 0.25;
/**
 * The SpeakDescriptionsTrackTTS component
 */

var SpeakDescriptionsTrackTTS =
/*#__PURE__*/
function () {
  /**
   * Creates an instance of this class.
   *
   * @param {Player} player
   *        The `Player` that this class should be attached to.
   */
  function SpeakDescriptionsTrackTTS(player) {
    this.player_ = player;
    this.extendedPlayerState_ = extendedPlayerState.initialized;
    this.isDucked = false;

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel(); // Stop the textTrackDisplay component's element from having
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


  var _proto = SpeakDescriptionsTrackTTS.prototype;

  _proto.dispose = function dispose() {};

  _proto.play = function play() {
    var speechSynthesis = window.speechSynthesis;

    if (speechSynthesis.paused) {
      speechSynthesis.resume();
    }
  };

  _proto.pause = function pause() {
    var speechSynthesis = window.speechSynthesis;

    if (speechSynthesis.speaking) {
      speechSynthesis.pause();
    }
  };

  _proto.paused = function paused() {
    return this.extendedPlayerState_ === extendedPlayerState.paused || this.extendedPlayerState_ === extendedPlayerState.pausedExtended;
  };

  _proto.textTrackChange = function textTrackChange() {
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
  ;

  _proto.speakActiveCues = function speakActiveCues(track) {
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
      } // TODO: handle any HTML markup in the cues properly; for now,
      //       we just strip out HTML markup.


      textToSpeak = textToSpeak.join('\r\n').replace(/<(?:.|\n)*?>/gm, '');
    }

    if (textToSpeak) {
      if (speechSynthesis.speaking) {
        // TODO: Handle description cue collision
        videojs.log.warn("Speech synthesis collision (" + textToSpeak + " - " + this.ssu.text + ") : " + ct + " : " + this.startTime + " : " + this.endTime);
        speechSynthesis.cancel();
      } else if (speechSynthesis.paused) {
        // TODO: Handle if speech synthesis is paused here
        videojs.log.warn("Speech synthesis collision (paused) (" + textToSpeak + " - " + this.ssu.text + ") : " + ct + " : " + this.startTime + " : " + this.endTime);
        speechSynthesis.cancel();
        speechSynthesis.resume();
      } // Store info about the current cue for debugging and/or logging


      this.startTime = startTime;
      this.endTime = endTime; // TODO: Need to dispose of this ssu after it is finished?

      this.ssu = new window.SpeechSynthesisUtterance();
      this.ssu.text = textToSpeak;
      this.ssu.lang = this.increaseLanguageLocalization(track.language); // TODO: user control over these attributes

      this.ssu.rate = 1.1;
      this.ssu.pitch = 1.0;
      this.ssu.volume = 1.0; // TODO: This audio ducking needs to be made more robust

      this.ssu.onstart = function (e) {
        // Duck the player's audio
        if (!this.isDucked) {
          this.isDucked = true;
          this.player_.addClass('vjs-audio-ducked');
          this.player_.tech_.setVolume(this.player_.tech_.volume() * audioDuckingFactor);
        }
      }.bind(this);

      this.ssu.onend = function (e) {
        // Speech synthesis of a cue has ended
        var delta = (Date.now() - this.ssu.startDate) / 1000;
        videojs.log("SpeakDescriptionsTrackTTS of cue: " + this.startTime + " : " + this.endTime + " : " + (this.endTime - this.startTime) + " : " + delta + " : " + (delta * 100.0 / (this.endTime - this.startTime)).toFixed(1) + "%"); // Un-duck the player's audio

        if (this.isDucked) {
          this.isDucked = false;
          this.player_.removeClass('vjs-audio-ducked');
          this.player_.tech_.setVolume(this.player_.tech_.volume() / audioDuckingFactor);
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
        videojs.log.warn("SSU error (" + this.ssu.text + ")");
        videojs.log.warn("SpeakDescriptionsTrackTTS of cue: " + this.startTime + " : " + this.endTime + " : " + (this.endTime - this.startTime) + " : " + delta + " : " + (delta * 100.0 / (this.endTime - this.startTime)).toFixed(1) + "%"); // Un-duck the player's audio

        if (this.isDucked) {
          this.isDucked = false;
          this.player_.removeClass('vjs-audio-ducked');
          this.player_.tech_.setVolume(this.player_.tech_.volume() / audioDuckingFactor);
        }

        if (this.extendedPlayerState_ === extendedPlayerState.playingExtended) {
          videojs.log('Un-pausing playback');
          this.extendedPlayerState_ = extendedPlayerState.playing;
          this.player_.tech_.play();
          this.descriptionExtended = false;
        }
      }.bind(this); // Start speaking the new textToSpeak


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
        videojs.log.warn("Speech synthesis overrun (paused) (" + this.ssu.text + ") : " + this.startTime + " : " + this.endTime);
        speechSynthesis.cancel();
        speechSynthesis.resume(); // } else if (this.ssu) {
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
  ;

  _proto.increaseLanguageLocalization = function increaseLanguageLocalization(lang) {
    var playerLanguage = this.player_.language && this.player_.language();
    var navigatorLanguage = window.navigator && window.navigator.language;

    if (lang && typeof lang === 'string' && typeof playerLanguage === 'string' && playerLanguage.length > lang.length && playerLanguage.toLowerCase().indexOf(lang.toLowerCase()) === 0) {
      lang = playerLanguage;
    }

    if (lang && typeof lang === 'string' && typeof navigatorLanguage === 'string' && navigatorLanguage.length > lang.length && navigatorLanguage.toLowerCase().indexOf(lang.toLowerCase()) === 0) {
      lang = navigatorLanguage;
    }

    return lang;
  };

  return SpeakDescriptionsTrackTTS;
}();

var speakDescriptionsTrack = function speakDescriptionsTrack(player) {
  var tech;
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
}; // Include the version number.


speakDescriptionsTrack.VERSION = version; // Register the plugin with video.js.

videojs.use('*', speakDescriptionsTrack);

module.exports = speakDescriptionsTrack;
