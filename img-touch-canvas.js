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

		this.momentum       = options.momentum;
        this.canvas         = options.canvas;
        this.canvas.width   = this.canvas.clientWidth;
        this.canvas.height  = this.canvas.clientHeight;
        this.context        = this.canvas.getContext('2d');
		this.zoomMax        = options.zoomMax || 2;
		this.zoomEnd		= options.zoomEnd; // Callback of zoom end

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

        this.lastZoomScale = null;
        this.lastX = null;
        this.lastY = null;

        this.mdown = false; //desktop drag

		this.startZoom = false;
        this.init  = false;
		this.running = true;
        this.checkRequestAnimationFrame();


		this.imgTexture = new Image();
		this.imgTexture.onload = function(){
			requestAnimationFrame(this.animate.bind(this));
	        this.setEventListeners();
			this.createImpetus();
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

					var cover         = this.imgTexture.width < this.imgTexture.height;
					var viewportRatio = this.canvas.clientWidth / this.canvas.clientHeight;
					var imageRatio    = this.imgTexture.width / this.imgTexture.height;
				    var scaleRatio    = null;

					if ((cover === true && imageRatio >= viewportRatio) || (cover === false && imageRatio <= viewportRatio)) {
						scaleRatio = this.canvas.clientWidth / this.imgTexture.width;
					}else if ((cover === true && imageRatio < viewportRatio) || (cover === false && imageRatio > viewportRatio)) {
						scaleRatio = this.canvas.clientHeight / this.imgTexture.height;
					}

                    this.scale.x = scaleRatio;
                    this.scale.y = scaleRatio;
					this.initScale.x = scaleRatio;
                    this.initScale.y = scaleRatio;
                    this.init    = true;

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


            //some helpers
            var deltaScale    = newScale - currentScale;
            var currentWidth  = (this.imgTexture.width * this.scale.x);
            var currentHeight = (this.imgTexture.height * this.scale.y);
            var deltaWidth    = this.imgTexture.width*deltaScale;
            var deltaHeight   = this.imgTexture.height*deltaScale;


            //by default scale doesnt change position and only add/remove pixel to right and bottom
            //so we must move the image to the left to keep the image centered
            //ex: coefX and coefY = 0.5 when image is centered <=> move image to the left 0.5x pixels added to the right
            var canvasmiddleX = this.canvas.clientWidth / 2;
            var canvasmiddleY = this.canvas.clientHeight / 2;
            var xonmap = (-this.position.x) + canvasmiddleX;
            var yonmap = (-this.position.y) + canvasmiddleY;
            var coefX = -xonmap / (currentWidth);
            var coefY = -yonmap / (currentHeight);
            var newPosX = this.position.x + deltaWidth*coefX;
            var newPosY = this.position.y + deltaHeight*coefY;

            //edges cases
            var newWidth = currentWidth + deltaWidth;
            var newHeight = currentHeight + deltaHeight;


            if( newWidth < this.canvas.clientWidth ||  newHeight < this.canvas.clientHeight ) {
				this.scaled = false;
				this.position.x = 0;
				this.position.y = 0;
				this.scale.x = this.initScale.x;
				this.scale.y = this.initScale.y;
				return;
			}

            if( newPosX > 0 ) { newPosX = 0; }
            if( newPosX + newWidth < this.canvas.clientWidth ) { newPosX = this.canvas.clientWidth - newWidth;}


            if( newPosY > 0 ) { newPosY = 0; }
            if( newPosY + newHeight < this.canvas.clientHeight ) { newPosY = this.canvas.clientHeight - newHeight; }

			if ( newScale <= 2 ){
				//finally affectations
				this.scale.x    = newScale;
				this.scale.y    = newScale;
				this.position.x = newPosX;
				this.position.y = newPosY;
			}

			this.scaled = true;
        },

		doMove: function(relativeX, relativeY) {

			if ( !this.momentum &&  this.lastX && this.lastY ){
				var deltaX = relativeX - this.lastX;
				var deltaY = relativeY - this.lastY;
				var currentWidth = (this.imgTexture.width * this.scale.x);
				var currentHeight = (this.imgTexture.height * this.scale.y);

				this.position.x += deltaX;
				this.position.y += deltaY;

				//edge cases
				if( this.position.x > 0 ) {
					this.position.x = 0;
				}else if( this.position.x + currentWidth < this.canvas.clientWidth ) {
					this.position.x = this.canvas.clientWidth - currentWidth;
				}if( this.position.y > 0 ) {
					this.position.y = 0;
				}else if( this.position.y + currentHeight < this.canvas.clientHeight ) {
					this.position.y = this.canvas.clientHeight - currentHeight;
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

				if ( this.startZoom && typeof this.zoomEnd === 'function' )
					this.zoomEnd( Math.round(this.scale.x*100)/100 );

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

			this.impetus = new Impetus({
				source: this.canvas,
				boundX: [-this.imgTexture.width*this.scale.x+this.canvas.width, 0],
				boundY: [-this.imgTexture.height*this.scale.y+this.canvas.height, 0],
				initialValues: [this.position.x, this.position.y],
				friction: 0.96,
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
