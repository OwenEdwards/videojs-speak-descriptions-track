# videojs-speak-descriptions-track

A Video.js 7 [middleware][middleware] that uses browser speech synthesis to speak descriptions contained in a description text track

If a text track with kind="descriptions" has mode="showing" in the player, then use speech synthesis (also known as "text to speech" or TTS) to announce each text cue when it is displayed. If it takes longer to announce the cue than its display time, then pause the tech until the speech synthesis finishes. Use a [middleware] layer to allow the tech to be paused without the player appearing to be paused, and to support pausing of the player either while both the tech and speech synthesis are playing, or while the tech is paused and the speech synthesis is still speaking.

Important Disclaimer: this plugin is not intended to be used to specifically address any accessibility requirements (e.g. WCAG 2.0 Success Criteria 1.2.3, 1.2.5, and 1.2.7). It is an experimental implementation of TTS for text video description. Users of this plugin should not assume that any level of accessibility support is provided by the features of this plugin.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Installation](#installation)
- [Usage](#usage)
  - [`<script>` Tag](#script-tag)
  - [Browserify/CommonJS](#browserifycommonjs)
  - [RequireJS/AMD](#requirejsamd)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->
## Installation

```sh
npm install --save videojs-speak-descriptions-track
```

## Usage

To include videojs-speak-descriptions-track on your website or web application, use any of the following methods.
Since it's a middleware and attaches itself to Video.js automatically, it only needs to be included or required.

### `<script>` Tag

This is the simplest case. Get the script in whatever way you prefer and include the plugin _after_ you include [video.js][videojs], so that the `videojs` global is available.

```html
<script src="//path/to/video.min.js"></script>
<script src="//path/to/videojs-speak-descriptions-track.min.js"></script>
<script>
  var player = videojs('my-video');
</script>
```

### Browserify/CommonJS

When using with Browserify, install videojs-speak-descriptions-track via npm and `require` the plugin as you would any other module.

```js
var videojs = require('video.js');

// The actual middleware function is exported by this module, but it is also
// attached to the `Player.prototype`; so, there is no need to assign it
// to a variable.
require('videojs-speak-descriptions-track');

var player = videojs('my-video');
```

### RequireJS/AMD

When using with RequireJS (or another AMD library), get the script in whatever way you prefer and `require` the plugin as you normally would:

```js
require(['video.js', 'videojs-speak-descriptions-track'], function(videojs) {
  var player = videojs('my-video');
});
```

## License

MIT. Copyright (c) Owen Edwards &lt;owen.r.edwards@gmail.com&gt;

This video.js plugin is heavily based on https://github.com/videojs/videojs-playbackrate-adjuster, copyright (c) Gary Katsevman &lt;me@gkatsev.com&gt;

[videojs]: http://videojs.com/
[middleware]: https://docs.videojs.com/tutorial-middleware.html
