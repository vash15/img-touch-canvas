/*
=================================
img-touch-canvas - v0.1
http://github.com/rombdn/img-touch-canvas

(c) 2013 Romain BEAUDON
This code may be freely distributed under the MIT License
=================================
*/


// (function() {
//     var root = this; //global object


(function (root, factory) {
	if ( typeof define === "function" && define.amd ) {
		define(["impetus"], function(Impetus){
			return (root.ImgTouchCanvas = factory(Impetus));
		});
	} else if(typeof module === "object" && module.exports) {
		module.exports = (root.ImgTouchCanvas = factory(require("impetus")));
	} else {
		root.ImgTouchCanvas = factory(root.Impetus);
	}
}(this, function(Impetus) {

    var ImgTouchCanvas = function(options) {
        if( !options || !options.canvas || !options.path) {
            throw 'ImgZoom constructor: missing arguments canvas or path';
        }

		var clientWidth  = options.canvas.clientWidth;
		var clientHeight = options.canvas.clientHeight;

		this.momentum             = options.momentum;
        this.canvas               = options.canvas;
        this.canvas.width         = clientWidth*2;
        this.canvas.height        = clientHeight*2;
		this.canvas.style.width   = clientWidth+'px';
		this.canvas.style.height  = clientHeight+'px';
        this.context              = this.canvas.getContext('2d');
		this.maxZoom              = (options.maxZoom || 2)*2;
		this.onZoomEnd            = options.onZoomEnd; // Callback of zoom end
		this.onZoom               = options.onZoom; // Callback on zoom
		this.initResizeProperty   = null;

        this.position = {
            x: 0,
            y: 0
        };
        this.scale = {
            x: 0.5,
            y: 0.5
        };
		this.initScale = {
            x: 0.5,
            y: 0.5
        };
		this.initPosition = {
            x: 0,
            y: 0
        };

        this.lastZoomScale = null;
        this.lastX         = null;
        this.lastY         = null;
		this.startZoom     = false;
        this.init          = false;
		this.running       = true;

		this.checkRequestAnimationFrame();

		this.imgTexture = new Image();
		this.imgTexture.onload = function(){
			requestAnimationFrame(this.animate.bind(this));
	        this.setEventListeners();
		}.bind(this);
        this.imgTexture.src = options.path;

    };

    ImgTouchCanvas.prototype = {

        animate: function() {
			if ( !this.running )
				return this;

            //set scale such as image cover all the canvas
            if( !this.init ) {
				if ( this.imgTexture.width ) {

					var viewportRatio = this.canvas.width / this.canvas.height;
					var imageRatio    = this.imgTexture.width / this.imgTexture.height;
				    var scaleRatio    = null;

					if (imageRatio >= viewportRatio) {
						this.initResizeProperty = 'width';
						scaleRatio = this.canvas.width / this.imgTexture.width;
						this.position.x = 0;
						this.position.y = (this.canvas.height - this.imgTexture.height *  scaleRatio ) / 2;

					}else if (imageRatio < viewportRatio) {
						this.initResizeProperty = 'height';
						scaleRatio = this.canvas.height / this.imgTexture.height;
						this.position.x = (this.canvas.width - this.imgTexture.width *  scaleRatio ) / 2;
						this.position.y = 0;
					}

                    this.scale.x = scaleRatio;
                    this.scale.y = scaleRatio;

					this.initPosition = {
						x: this.position.x,
						y: this.position.y
					};
					this.initialScale = scaleRatio;
                    this.init         = true;

                }
            }

            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

            this.context.drawImage(
                this.imgTexture,
                this.position.x, this.position.y,
                this.scale.x * this.imgTexture.width,
                this.scale.y * this.imgTexture.height);

            requestAnimationFrame(this.animate.bind(this));

        },

		pause: function () {
			this.running = false;
			return this;
		},

		resume: function () {
			this.running = true;
			requestAnimationFrame(this.animate.bind(this));
			return this;
		},

        gesturePinchZoom: function(event) {
            var zoom = false;

            if( event.targetTouches.length >= 2 ) {
                var p1 = event.targetTouches[0];
                var p2 = event.targetTouches[1];
                var zoomScale = Math.sqrt(Math.pow(p2.pageX - p1.pageX, 2) + Math.pow(p2.pageY - p1.pageY, 2)); // euclidian distance

                if( this.lastZoomScale ) {
                    zoom = zoomScale - this.lastZoomScale;
                }

                this.lastZoomScale = zoomScale;
            }
            return zoom;
        },

        doZoom: function(zoom) {
            if(!zoom) return;

            //new scale
            var currentScale = this.scale.x;
            var newScale = this.scale.x + zoom/100;
            if( newScale < this.initialScale ) {
					this.scaled = false;
					this.position.x = this.initPosition.x;
					this.position.y = this.initPosition.y;
					this.scale.x = this.initialScale;
					this.scale.y = this.initialScale;
					return;
			};
            if (this.maxZoom && newScale > this.maxZoom){
                // could just return but then won't stop exactly at maxZoom
                newScale = this.maxZoom;
            }


			//some helpers
            var deltaScale    = newScale - currentScale;
            var currentWidth  = (this.imgTexture.width * this.scale.x);
            var currentHeight = (this.imgTexture.height * this.scale.y);
            var deltaWidth    = this.imgTexture.width*deltaScale;
            var deltaHeight   = this.imgTexture.height*deltaScale;


            //by default scale doesnt change position and only add/remove pixel to right and bottom
            //so we must move the image to the left to keep the image centered
            //ex: coefX and coefY = 0.5 when image is centered <=> move image to the left 0.5x pixels added to the right
            var canvasmiddleX = this.canvas.width / 2;
            var canvasmiddleY = this.canvas.height / 2;
            var xonmap = (-this.position.x) + canvasmiddleX;
            var yonmap = (-this.position.y) + canvasmiddleY;
            var coefX = -xonmap / (currentWidth);
            var coefY = -yonmap / (currentHeight);
            var newPosX = this.position.x + deltaWidth*coefX;
            var newPosY = this.position.y + deltaHeight*coefY;

            //finally affectations
            this.scale.x    = newScale;
            this.scale.y    = newScale;
            this.position.x = newPosX;
            this.position.y = newPosY;

			this.scaled = true;

			// zoom scale callback
            if (this.onZoom){
                this.onZoom(newScale, this.scaled);
            }
        },

		doMove: function(relativeX, relativeY) {

			if ( !this.momentum &&  this.lastX && this.lastY ){
				var deltaX = relativeX - this.lastX;
				var deltaY = relativeY - this.lastY;
				var currentWidth = (this.imgTexture.width * this.scale.x);
				var currentHeight = (this.imgTexture.height * this.scale.y);

				var clientWidth = this.canvas.width, clientHeight = this.canvas.height;

				this.position.x += deltaX;
				this.position.y += deltaY;


				//edge cases
				if (currentWidth >= clientWidth){
					if( this.position.x > 0 ) {
						// cannot move left edge of image > container left edge
						this.position.x = 0;
					} else if( this.position.x + currentWidth < clientWidth ) {
						// cannot move right edge of image < container right edge
						this.position.x = clientWidth - currentWidth;
					}
				} else {
					if( this.position.x < currentWidth - clientWidth ) {
						// cannot move left edge of image < container left edge
						this.position.x = currentWidth - clientWidth;
					}else if( this.position.x > clientWidth - currentWidth ) {
						// cannot move right edge of image > container right edge
						this.position.x = clientWidth - currentWidth;
					}
				}
				if (currentHeight > clientHeight){
					if( this.position.y > 0 ) {
						// cannot move top edge of image < container top edge
						this.position.y = 0;
					}else if( this.position.y + currentHeight < clientHeight ) {
						// cannot move bottom edge of image > container bottom edge
						this.position.y = clientHeight - currentHeight;
					}
				}else {
					if( this.position.y < 0 ) {
						// cannot move top edge of image < container top edge
						this.position.y = 0;
					}else if( this.position.y > clientHeight - currentHeight ) {
						// cannot move bottom edge of image > container bottom edge
						this.position.y = clientHeight - currentHeight;
					}
				}

			}else if ( this.momentum &&  this.lastX && this.lastY ) {

				this.position.x = relativeX;
				this.position.y = relativeY;

			}

			this.lastX = relativeX;
			this.lastY = relativeY;
		},

        setEventListeners: function() {

			// Callback events
			this.eventTouchStart = function(e) {
                this.lastX          = null;
                this.lastY          = null;
                this.lastZoomScale  = null;
            }.bind(this);

			this.eventTouchMove = function(e) {
				if ( this.scaled )
					e.preventDefault();

				if(e.targetTouches.length == 2) { //pinch

					this.startZoom = true;
					if ( this.momentum  )
						this.destroyImpetus();
					this.doZoom(this.gesturePinchZoom(e));
                }
                else if(e.targetTouches.length == 1) {
					if ( !this.momentum  ){
						var relativeX = e.targetTouches[0].pageX - this.canvas.getBoundingClientRect().left;
						var relativeY = e.targetTouches[0].pageY - this.canvas.getBoundingClientRect().top;
						this.doMove(relativeX, relativeY);
					}
                }

            }.bind(this);

			this.eventTouchEnd = function(e) {
				if ( this.momentum ){
					e.preventDefault();
					if ( this.startZoom && this.scaled ){
						this.createImpetus();
					}else if ( this.scaled === false ) {
						this.destroyImpetus();
					}
				}

				if ( this.startZoom && typeof this.onZoomEnd === 'function' )
					this.onZoomEnd( Math.round(this.scale.x*100)/100, this.scaled );

				this.startZoom = false;

			}.bind(this);


			// Assign event
            this.canvas.addEventListener('touchstart', this.eventTouchStart );
            this.canvas.addEventListener('touchmove', this.eventTouchMove );
			this.canvas.addEventListener('touchend', this.eventTouchEnd );

        },

        checkRequestAnimationFrame: function() {
			if ( window.requestAnimationFrame )
				return this;

            var lastTime = 0;
            var vendors = ['ms', 'moz', 'webkit', 'o'];
            for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
                window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
                window.cancelAnimationFrame =
                  window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
            }

            if (!window.requestAnimationFrame) {
                window.requestAnimationFrame = function(callback, element) {
                    var currTime = new Date().getTime();
                    var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                    var id = window.setTimeout(function() { callback(currTime + timeToCall); },
                      timeToCall);
                    lastTime = currTime + timeToCall;
                    return id;
                };
            }

            if (!window.cancelAnimationFrame) {
                window.cancelAnimationFrame = function(id) {
                    clearTimeout(id);
                };
            }

			return this;
        },

		destroy: function () {

			this.pause();

			this.canvas.removeEventListener('touchstart', this.eventTouchStart );
            this.canvas.removeEventListener('touchmove', this.eventTouchMove );
			this.canvas.removeEventListener('touchend', this.eventTouchEnd );

			this.destroyImpetus();

			this.imgTexture = null;
			this.canvas = null;

		},

		createImpetus: function () {
			if ( typeof Impetus === 'undefined' || !this.momentum || this.impetus) return;

			var boundX, boundY;

			if (this.initResizeProperty == 'width') {
				boundX = [-this.imgTexture.width * this.scale.x + this.canvas.width, 0];
				if (this.imgTexture.height * this.scale.y > this.canvas.height) {
					boundY = [-this.imgTexture.height * this.scale.y + this.canvas.height, 0];
				}
				else {
					boundY = [this.position.y - 1, this.position.y + 1];
				}
			}
			else {
				if (this.imgTexture.width * this.scale.x > this.canvas.width) {
					boundX = [-this.imgTexture.width * this.scale.x + this.canvas.width, 0];
				}
				else {
					boundX = [this.position.x - 1, this.position.x + 1];
				}
				boundY = [-this.imgTexture.height*this.scale.y+this.canvas.height, 0]
			}

			this.impetus = new Impetus({
				source: this.canvas,
				boundX: boundX,
				boundY: boundY,
				initialValues: [this.position.x, this.position.y],
				friction: 0.96,
				multiplier: 2,
				update: function(x, y) {
					this.doMove(x, y);
				}.bind(this)
			});

		},

		destroyImpetus: function() {
			if ( this.impetus && this.impetus.destroy )
				this.impetus.destroy();
			this.impetus = null;
		}

    };

    return ImgTouchCanvas;

}));
