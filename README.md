# Pinch Zoom Canvas

Strongly inspired by [img-touch-canvas](https://github.com/rombdn/img-touch-canvas).

It's a simple library for pinch to zoom an image based on a canvas element for smooth rendering.
The library use a Impetus for adding a momentus on move the image zoomed. Impetus is not required but recommended.

#### Features:

- Momentum for move the image zoomed
- Pintch to zoom and center between the touches
- Double tap to zoom
- Stopping the event when the element is inactive

This plugin is written in **Vanilla JS**.


#### Tested on:

- iOS Safari (8.x, 9.x)
- Android Google Chrome
- Cordova App
- Google Chrome

#### Demo

[Open this link into mobile device](https://vash15.github.io/pinch-zoom-canvas/demo/)


## Install

#### bower

```
$ bower install --save pinch-zoom-canvas
```

#### npm

```
$ npm install --save pinch-zoom-canvas
```

#### browser

```html
<script src="pinch-zoom-canvas.js"></script>
```


## Options

- `canvas` mandatory. It is a DOM element where the image is rendered.
- `path` mandatory. It is a path url of image.
- `doubletap` optional (default `true`). Double tap for zooming.
- `momentum` optional (defalut `false`). Set a momentum when the image is dragged. This parameter require [Impetus](https://github.com/SonoIo/impetus) library.
- `maxZoom` optional (default `2`). It is the zoom max.
- `onZoomEnd` optional (default `null`). It is a callback function called when the pinch ended.
- `onZoom` optional (default `null`). It is a callback function called when zooming.
- `threshold` optional (default `40`). Area (in px) of the screen to release touch events.

## API

### pause()
Stop the render canvas.

### resume()
Resume the render canvas.

### calculateOffset()
Update the canvas offset.

### isZommed()
Return a boolean value for the image state of zoomed.

### destroy()
Stop all events and render canvas.


## Usage

```html
<canvas id="mycanvas" style="width: 100%; height: 100%"></canvas>
```

```js
var pinchZoom = new PinchZoomCanvas({
	canvas: document.getElementById('mycanvas'),
	path: "your image url",
	momentum: true,
	zoomMax: 2,
	doubletap: true,
	onZoomEnd: function (zoom, zoomed) {
		console.log("---> is zoomed: %s", zoomed);
		console.log("---> zoom end at %s", zoom);
	},
	onZoom: function (zoom) {
		console.log("---> zoom is %s", zoom);
	}
	});
```

## Licence
------------
See the [LICENSE](LICENSE.txt) file.
