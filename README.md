# ImgTouchCanvas


Add touch gestures (pinch zoom and touch drag) to an image (like Google Maps).
Based on a canvas element for smooth rendering.
Plain HTML5 / vanilla JS, no external libraries needed.
Tested in Android Browser, Android Google Chrome, iOS Safari

## Options

- `canvas` mandatory. It is a DOM element where the image is rendered.
- `path` mandatory. It is a path url of image.
- `momentum` optional (defalut `false`). Set a momentum when the image is dragged. This parameter require [Impetus](https://github.com/SonoIo/impetus) library.
- `zoomMax` optional (default `2`). It is the zoom max.
- `zoomEnd` optional (default `null`). It is a callback function called when the pinch ended.

## API

### pause()
Stop the render canvas.

### resume()
Resume the render canvas.

### destroy()
Stop all events and render canvas.


## Usage

**See a live example here : http://www.rombdn.com/img-touch-canvas/demo**

Define a container in which the image will be able to be resized and moved, then add a canvas element.

The image will be scaled to cover all the container so if you want the image to be showed at its original size by default
then set the container size to match the image original size (see example).

```html
<canvas id="mycanvas" style="width: 100%; height: 100%"></canvas>
```

```js
	var gesturableImg = new ImgTouchCanvas({
		momentum: true, // Require Impetus lib
		canvas: document.getElementById('mycanvas'),
		path: "your image url",
		zoomMax: 2,
		zoomEnd: function(zoom){
			console.log("zoom %s", zoom);
		}
	});
```

## Licence
------------
(c) 2013-2016 Romain BEAUDON
This code may be freely distributed under the MIT License
