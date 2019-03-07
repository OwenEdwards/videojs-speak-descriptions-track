# videojs-speak-descriptions-track

A Video.js 7 middleware that uses browser speech synthesis to speak descriptions contained in a description text track

When the playback rate is adjusted in from the menu, the middleware tells the player that the duration and times have changes and then uses the current playback rate to adjust the times in the control bar.
For example, when the player is playing back in 2x, a 20 minute video will look like a 10 minute video.

## Installation

```sh
npm install --save videojs-speak-descriptions-track
```

## Usage

To include videojs-speak-descriptions-track on your website or web application, use any of the following methods.
Since it's a middleware and attaches itself to Video.js automatically,
it only needs to be included or required.

### `<script>` Tag

This is the simplest case. Get the script in whatever way you prefer and include the plugin _after_ you include [video.js][videojs], so that the `videojs` global is available.

```html
<script src="//path/to/video.min.js"></script>
<script src="//path/to/videojs-speak-descriptions-track.min.js"></script>
<script>
  var player = videojs('my-video');
</script>
```

### Browserify

When using with Browserify, install videojs-speak-descriptions-track via npm and `require` the plugin as you would any other module.

```js
var videojs = require('video.js');

// The actual middleware function is exported by this module, but it is also
// attached to Video.js; so, there is no need to assign it to a variable.
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

MIT. Copyright (c) Owen Edwards <owen.r.edwards@gmail.com>


[videojs]: http://videojs.com/
