(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define(["impetus"], function (Impetus) {
      return (root.PinchZoomCanvas = factory(Impetus))
    })
  } else if (typeof module === "object" && module.exports) {
    module.exports = (root.PinchZoomCanvas = factory(require("impetus")))
  } else {
    root.PinchZoomCanvas = factory(root.Impetus)
  }
}(this, function (Impetus) {
  var PinchZoomCanvas = function (options) {
    if (!options || !options.canvas || !options.path) {
      throw 'PinchZoomCanvas constructor: missing arguments canvas or path'
    }

    // Check if exists function requestAnimationFrame
    this._checkRequestAnimationFrame()

    var clientWidth = options.canvas.clientWidth
    var clientHeight = options.canvas.clientHeight

    this.doubletap           = typeof options.doubletap == 'undefined' ? true : options.doubletap
    this.momentum            = options.momentum
    this.canvas              = options.canvas
    this.canvas.width        = clientWidth * 2 // twice the client width
    this.canvas.height       = clientHeight * 2 // twice the client height
    this.canvas.style.width  = clientWidth + 'px'
    this.canvas.style.height = clientHeight + 'px'
    this.context             = this.canvas.getContext('2d')
    this.maxZoom             = (options.maxZoom || 2)
    this.onZoomEnd           = options.onZoomEnd // Callback of zoom end
    this.onZoom              = options.onZoom // Callback on zoom
    this.initResizeProperty  = null
    this.threshold           = options.threshold || 40
    this.startingZoom        = options.startingZoom || 1

    // Init
    this.position = {
      x: 0,
      y: 0
    }
    this.scale = {
      x: 1,
      y: 1
    }
    this.initPosition = {
      x: 0,
      y: 0
    }
    this.offset = {
      x: 0,
      y: 0
    }

    this.lastZoomScale = null // what was the last scale?
    this.lastX = null // what was the last x position?
    this.lastY = null // what was the last y position?
    this.startZoom = false // has zoom started?
    this.init = false // are we initialized?
    this.running = true // are we actively tracking?
    this.zoomed = false // are we zoomed in?
    this.animating = false // are we animating at all?

    // Bind events
    this.onTouchStart = this.onTouchStart.bind(this)
    this.onTouchMove = this.onTouchMove.bind(this)
    this.onTouchEnd = this.onTouchEnd.bind(this)
    this.render = this.render.bind(this)

    // Load the image
    this.imgTexture = new Image()

    this.imgTexture.onload = function () {
      requestAnimationFrame(this.render)
      this._setEventListeners()
    }.bind(this)

    this.imgTexture.src = options.path
  }

  PinchZoomCanvas.prototype = {
    // Render method. It starts in infinite loop in each requestAnimationFrame of the browser.
    render: function () {
      // don't render if we're paused or not initialized
      if (this.init && !this.running) return this

      //set initial scale such as image cover all the canvas
      if (!this.init) {
        if (this.imgTexture.width) {
          var viewportRatio = this.canvas.width / this.canvas.height
          var imageRatio = this.imgTexture.width / this.imgTexture.height
          var scaleRatio = null

          if (imageRatio >= viewportRatio) { // wide image
            this.initResizeProperty = 'width'
            scaleRatio = this.canvas.width / this.imgTexture.width * this.startingZoom // hardcoded startingZoom multiplier
          } else if (imageRatio < viewportRatio) { // tall image
            this.initResizeProperty = 'height'
            scaleRatio = this.canvas.height / this.imgTexture.height * this.startingZoom // hardcoded startingZoom multiplier
          }

          this.position.x = (this.canvas.width - this.imgTexture.width * scaleRatio) / 2 // center horizontal
          this.position.y = (this.canvas.height - this.imgTexture.height * scaleRatio) / 2 // center vertical

          // scale x and y to init scaleRatio calculation
          this.scale.x = scaleRatio
          this.scale.y = scaleRatio

          // initial position is centered in the canvas
          this.initPosition = {
            x: this.position.x,
            y: this.position.y
          }

          // the initial scale is the scaling ratio * the desired startingZoom
          this.initialScale = scaleRatio * this.startingZoom
          this.calculateOffset()

          // start the impetus so we can move things right away if using momentum
          if (this.momentum) this._createImpetus()

          this.init = true // done initializing!
        }
      }

      // erases the canvas
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)

      // draws the image position and scale
      this.context.drawImage(
        this.imgTexture,
        this.position.x, this.position.y,
        this.scale.x * this.imgTexture.width,
        this.scale.y * this.imgTexture.height)

      requestAnimationFrame(this.render)
    },

    pause: function () {
      this.running = false
      return this
    },

    resume: function () {
      this.calculateOffset()
      this.running = true
      requestAnimationFrame(this.render)
      return this
    },

		/**
		 * Calculates the offset of the canvas position relative to it's container
		 */
    calculateOffset: function () {
      if (!this.canvas)
        return this
      const canvasBox = this.canvas.getBoundingClientRect()

      this.offset.x = canvasBox.left
      this.offset.y = canvasBox.top
      return this
    },

    /**
     * handles zooming in and out
     */
    zoom: function (zoom, touchX, touchY) {
      if (!zoom) return

      //new scale
      var currentScale = this.scale.x
      var newScale = this.scale.x + zoom / 100

      // FIXME: Correct math to account for various initial scales
      // TODO: Make bounceback on zoomed to in or out instead of hard setting
      if (newScale < this.initialScale) { // we are below the minimum zoom (initialZoom)
        this.zoomed = false // we're back at the initial scale
        // this.position.x = this.initPosition.x
        // this.position.y = this.initPosition.y
        // this.scale.x = this.initialScale
        // this.scale.y = this.initialScale
        newScale = this.initialScale // set to the initialScale
      } else if (this.maxZoom && newScale > this.maxZoom) { // we are above maximum zoom
        this.zoomed = true
        newScale = this.maxZoom // set to maximum zoom
      } else { // we are zoomed in between min and max
        this.zoomed = true
      }

      var deltaScale = newScale - currentScale
      var currentWidth = this.imgTexture.width * this.scale.x
      var currentHeight = this.imgTexture.height * this.scale.y
      var deltaWidth = this.imgTexture.width * deltaScale
      var deltaHeight = this.imgTexture.height * deltaScale

      var tX = (touchX * 2 - this.position.x)
      var tY = (touchY * 2 - this.position.y)
      var pX = -tX / currentWidth
      var pY = -tY / currentHeight


      //finally affectations
      this.scale.x = newScale
      this.scale.y = newScale
      this.position.x += pX * deltaWidth
      this.position.y += pY * deltaHeight

      // onZoom callback
      if (this.onZoom) {
        this.onZoom(newScale, this.zoomed)
      }

    },

    move: function (relativeX, relativeY) {
      if (!this.momentum && this.lastX && this.lastY) {
        var deltaX = relativeX - this.lastX
        var deltaY = relativeY - this.lastY
        var currentWidth = (this.imgTexture.width * this.scale.x)
        var currentHeight = (this.imgTexture.height * this.scale.y)

        var clientWidth = this.canvas.width, clientHeight = this.canvas.height

        this.position.x += deltaX
        this.position.y += deltaY


        //edge cases
        if (currentWidth >= clientWidth) {
          if (this.position.x > 0) {
            // cannot move left edge of image > container left edge
            this.position.x = 0
          } else if (this.position.x + currentWidth < clientWidth) {
            // cannot move right edge of image < container right edge
            this.position.x = clientWidth - currentWidth
          }
        } else {
          if (this.position.x < currentWidth - clientWidth) {
            // cannot move left edge of image < container left edge
            this.position.x = currentWidth - clientWidth
          } else if (this.position.x > clientWidth - currentWidth) {
            // cannot move right edge of image > container right edge
            this.position.x = clientWidth - currentWidth
          }
        }
        if (currentHeight > clientHeight) {
          if (this.position.y > 0) {
            // cannot move top edge of image < container top edge
            this.position.y = 0
          } else if (this.position.y + currentHeight < clientHeight) {
            // cannot move bottom edge of image > container bottom edge
            this.position.y = clientHeight - currentHeight
          }
        } else {
          if (this.position.y < 0) {
            // cannot move top edge of image < container top edge
            this.position.y = 0
          } else if (this.position.y > clientHeight - currentHeight) {
            // cannot move bottom edge of image > container bottom edge
            this.position.y = clientHeight - currentHeight
          }
        }
        this.animating = false // we're done animating!
      } else if (this.momentum && this.lastX && this.lastY) {
        // check if we're within a pixel of x,y and if so we set position and impetus
        // to the whole pixel values so that we don't have infinite "wiggle"
        var thresholdX = Math.round(this.lastX) === Math.round(relativeX)
        var thresholdY = Math.round(this.lastY) === Math.round(relativeY)
        if (this.impetus && thresholdX && thresholdY) {
          this.animating = false
          this.position.x = this.lastX = Math.round(relativeX)
          this.position.y = this.lastY = Math.round(relativeY)
          this.impetus.setValues(this.position.x, this.position.y)
        } else {
          this.position.x = relativeX
          this.position.y = relativeY
        }
      }

      this.lastX = relativeX
      this.lastY = relativeY
    },

    isZoomed: function () {
      return this.zoomed
    },

    destroy: function () {
      this.pause()
      this._removeEventListeners()
      this._destroyImpetus()
      this.imgTexture = null
      this.canvas = null
    },

    //
    // Private
    //

    _gesturePinchZoom: function (event) {
      var zoom = false

      if (event.targetTouches.length >= 2) {
        var p1 = event.targetTouches[0]
        var p2 = event.targetTouches[1]
        var zoomScale = Math.sqrt(Math.pow(p2.pageX - p1.pageX, 2) + Math.pow(p2.pageY - p1.pageY, 2)) // euclidian distance

        if (this.lastZoomScale) {
          zoom = zoomScale - this.lastZoomScale
        }

        this.lastZoomScale = zoomScale
      }
      return zoom
    },

    _checkRequestAnimationFrame: function () {
      if (window.requestAnimationFrame)
        return this

      var lastTime = 0
      var vendors = ['ms', 'moz', 'webkit', 'o']
      for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame']
        window.cancelAnimationFrame =
          window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame']
      }

      if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function (callback, element) {
          var currTime = new Date().getTime()
          var timeToCall = Math.max(0, 16 - (currTime - lastTime))
          var id = window.setTimeout(function () { callback(currTime + timeToCall) },
            timeToCall)
          lastTime = currTime + timeToCall
          return id
        }
      }

      if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function (id) {
          clearTimeout(id)
        }
      }
      return this
    },


    _createImpetus: function () {
      if (typeof Impetus === 'undefined' || !this.momentum || this.impetus) return

      var boundX, boundY

      // setting bounds
      if (this.initResizeProperty == 'width') {
        boundX = [-this.imgTexture.width * this.scale.x + this.canvas.width, 0]
        if (this.imgTexture.height * this.scale.y > this.canvas.height) {
          boundY = [-this.imgTexture.height * this.scale.y + this.canvas.height, 0]
        }
        else {
          boundY = [this.position.y - 1, this.position.y + 1]
        }
      }
      else {
        if (this.imgTexture.width * this.scale.x > this.canvas.width) {
          boundX = [-this.imgTexture.width * this.scale.x + this.canvas.width, 0]
        }
        else {
          boundX = [this.position.x - 1, this.position.x + 1]
        }
        boundY = [-this.imgTexture.height * this.scale.y + this.canvas.height, 0]
      }

      this.impetus = new Impetus({
        source: this.canvas,
        boundX: boundX,
        boundY: boundY,
        initialValues: [this.position.x, this.position.y],
        friction: 0.96,
        multiplier: 2,
        update: function (x, y) {
          this.move(x, y)
        }.bind(this)
      })

    },

    _destroyImpetus: function () {
      if (this.impetus && this.impetus.destroy) {
        this.impetus.destroy()
        this.impetus = null
      }
    },


    _setEventListeners: function () {
      this.canvas.addEventListener('touchstart', this.onTouchStart)
      this.canvas.addEventListener('touchmove', this.onTouchMove)
      this.canvas.addEventListener('touchend', this.onTouchEnd)
      return this
    },

    _removeEventListeners: function () {
      this.canvas.removeEventListener('touchstart', this.onTouchStart)
      this.canvas.removeEventListener('touchmove', this.onTouchMove)
      this.canvas.removeEventListener('touchend', this.onTouchEnd)
      return this
    },

    //
    // Events
    //

    onTouchStart: function () {
      this.lastX = null
      this.lastY = null
      this.lastZoomScale = null
    },

    onTouchMove: function (e) {
      if (this.zoomed)
        e.preventDefault() //block event propagation

      if (e.targetTouches.length == 2) { // pinch
        this.startZoom = true
        if (this.momentum)
          this._destroyImpetus()

        var x = (e.targetTouches[0].pageX + e.targetTouches[1].pageX) / 2
        var y = (e.targetTouches[0].pageY + e.targetTouches[1].pageY) / 2
        this.zoom(this._gesturePinchZoom(e), x, y)
      }
      else if (e.targetTouches.length == 1) { // non momentum based movement
        this.animating = true
        if (this.momentum) {
          this._createImpetus()
        } else {
          var relativeX = e.targetTouches[0].pageX //- this.offset.x
          var relativeY = e.targetTouches[0].pageY //- this.offset.y
          this.move(relativeX, relativeY)
        }
      }

    },

    onTouchEnd: function (e) {
      // Check if touchend
      if (this.doubletap && !this.startZoom && e.changedTouches.length > 0) {
        var touch = e.changedTouches[0]
        var distance = touch.pageX - (this.lastTouchPageX || 0)
        var now = new Date().getTime()
        var lastTouch = this.lastTouchTime || now + 1 /** the first time this will make delta a negative number */
        var delta = now - lastTouch
        if (distance >= 0 && distance < this.threshold && delta > 0 && delta < 500) {
          this.lastTouchTime = null
          this.lastTouchPageX = 0
          this.startZoom = true
          if (this.zoomed) {
            // FIXME: This needs to reset to initial view
            this.zoom(-400, this.initPosition.x, this.initPosition.y) // FIXME: breaks bounding
          } else {
            // FIXME: This needs max out view according to maxScale
            this.zoom(this.maxZoom*1000, touch.pageX, touch.pageY)
          }
        } else {
          this.lastTouchTime = now
          this.lastTouchPageX = touch.pageX
        }
      } else {
        this.lastTouchTime = null
        this.lastTouchPageX = 0
      }

      if (this.momentum) {
        e.preventDefault()
        // if we're zooming
        if (this.startZoom && this.zoomed) {
          this._createImpetus()
        } else if (!this.zoomed && !this.momentum) { // no momentum and at initial scale otherwise we keep impetus alive to move things around
          this._destroyImpetus()
        }
      }

      // onZoomEnd callback
      if (this.startZoom && typeof this.onZoomEnd === 'function')
        this.onZoomEnd(Math.round(this.scale.x * 100) / 100, this.zoomed)

      this.startZoom = false // we're done zooming
    }
  }

  return PinchZoomCanvas

}))
