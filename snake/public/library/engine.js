import {
	stage, makeCanvas, rectangle, circle, line, text, group, sprite, frame, frames,
	button, grid, filmstrip, remove, byLayer, buttons, draggableSprites, updateDragAndDrop,
	render, renderWithInterpolation, particles, emitter, particleEffect, tilingSprite,
	shakingSprites, shake, progressBar
} from './display.js'

import {makePointer, keyboard} from './interactive.js'

import {
	assets, outsideBounds, contain, distance, followEase, easeProperty,
	followConstant, angle, rotateSprite, rotatePoint, randomInt, randomFloat, 
	shoot, wait, move
} from './utilities.js'

import {
	tweens, tweenProperty, fadeOut, fadeIn, pulse, slide, breathe, scale,
	strobe, wobble, removeTween, followCurve, walkPath, walkCurve
} from './tween.js'

import {makeSound, soundEffect} from './sound.js'

import {
	hitTestPoint, hitTestCircle, circleCollision, movingCircleCollision, multipleCircleCollision,
	hitTestRectangle, rectangleCollision, hitTestCircleRectangle, hitTestCirclePoint,
	circleRectangleCollision, circlePointCollision, hit
} from './collision.js'

export class Game {
  constructor(width = 256, height = 256, setup, assetsToLoad, load, fps = 60) {
    //Copy all the imported library code into 
    //properties on this class
		Object.assign(this, {stage, makeCanvas, rectangle, circle, line, text, group, sprite,
			frame, frames, button, grid, filmstrip, remove, byLayer, buttons, draggableSprites,
			updateDragAndDrop, render, renderWithInterpolation, particles, emitter, particleEffect,
			tilingSprite, shakingSprites, shake, progressBar})

		Object.assign(this, {makePointer, keyboard})

		Object.assign(this, {assets, outsideBounds, contain, distance, followEase, easeProperty,
			followConstant, angle, rotateSprite, rotatePoint, randomInt, randomFloat, shoot, wait, move})

		Object.assign(this, {tweens, tweenProperty, fadeOut, fadeIn, pulse, slide, breathe, scale,
			strobe, wobble, removeTween, followCurve, walkPath, walkCurve})

		Object.assign(this, {makeSound, soundEffect})

		Object.assign(this, {hitTestPoint, hitTestCircle, circleCollision, movingCircleCollision,
			multipleCircleCollision, hitTestRectangle, rectangleCollision, hitTestCircleRectangle,
			hitTestCirclePoint, circleRectangleCollision, circlePointCollision, hit})

		this.fps = fps
		this.startTime = 0

    //Make the canvas and initialize the stage
    this.canvas = this.makeCanvas(width, height, "none");
    this.canvas.style.backgroundColor = "white";
    this.stage.width = this.canvas.width;
    this.stage.height = this.canvas.height;

    //Make the pointer
    this.pointer = this.makePointer(this.canvas);

    //The game's scale
    this.scale = 1;

    //Set the game `state`
    this.state = undefined;

    //Set the user-defined `load` and `setup` states
    this.load = load;
    this.setup = setup;

    //Get a reference to the `assetsToLoad` array
    this.assetsToLoad = assetsToLoad;

    //A Boolean to let us pause the game
    this.paused = false;
    
    //The `setup` function is required, so throw an error if it's
    //missing
    if (!setup) {
      throw new Error(
        "Please supply the setup function in the constructor"
      );
    }
  }

  //The game loop
  gameLoop(timestamp) {
    requestAnimationFrame(this.gameLoop.bind(this));

    if (timestamp >= this.startTime) {

	    //Update all the buttons
	    if (this.buttons.length > 0) {
	      this.canvas.style.cursor = "auto";
	      this.buttons.forEach(button => {
	        button.update(this.pointer, this.canvas);
	        if (button.state === "over" || button.state === "down") {
	          if(button.parent !== undefined) {
	            this.canvas.style.cursor = "pointer";
	          }
	        }
	      });
	    }

	    //Update all the particles
	    if (this.particles.length > 0) {
	      for(let i = this.particles.length - 1; i >= 0; i--) {
	        let particle = this.particles[i];
	        particle.update();
	      }
	    }

	    //Update all the tweens
	    if (this.tweens.length > 0) {
	      for(let i = this.tweens.length - 1; i >= 0; i--) {
	        let tween = this.tweens[i];
	        if (tween) tween.update();
	      }
	    }
	    
	    //Update all the shaking sprites
	    if (this.shakingSprites.length > 0) {
	      for(let i = this.shakingSprites.length - 1; i >= 0; i--) {
	        let shakingSprite = this.shakingSprites[i];
	        if (shakingSprite.updateShake) shakingSprite.updateShake();
	      }
	    }
	    
	    //Update the pointer for drag and drop
	    if (this.draggableSprites.length > 0) {
	      this.pointer.updateDragAndDrop(this.draggableSprites);
	    }

	    //Run the current game `state` function if it's been defined and
	    //the game isn't `paused`
	    if(this.state && !this.paused) {
	      this.state();
	    }
	    this.startTime = timestamp + this.frameDuration()
	  }
    //Render the canvas
    this.render(this.canvas);

  }

  frameDuration() {
  	return 1000 / this.fps
  }

  //The `start` method that gets the whole engine going. This needs to
  //be called by the user from the game application code, right after
  //the engine is instantiated
  start() {
    if (this.assetsToLoad) {

      //Use the supplied file paths to load the assets then run
      //the user-defined `setup` function
      this.assets.load(this.assetsToLoad).then(() => {

        //Clear the game `state` function for now to stop the loop.
        this.state = undefined;

        //Call the `setup` function that was supplied by the user in
        //`Game` class's constructor
        this.setup();
      });

      //While the assets are loading, set the user-defined `load`
      //function as the game state. That will make it run in a loop.
      //You can use the `load` state to create a loading progress bar
      if (this.load) {
        this.state = this.load;
      }
    }

    //If there aren't any assets to load,
    //just run the user-defined `setup` function
    else {
      this.setup();
    }

    //Start the game loop
    this.gameLoop();
  }

  //Pause and resume methods
  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
  }

  //Center and scale the game engine inside the HTML page 
  scaleToWindow(backgroundColor = "#2C3539") {

    let scaleX, scaleY, scale, center;
    
    //1. Scale the canvas to the correct size
    //Figure out the scale amount on each axis
    scaleX = window.innerWidth / this.canvas.width;
    scaleY = window.innerHeight / this.canvas.height;

    //Scale the canvas based on whichever value is less: `scaleX` or `scaleY`
    scale = Math.min(scaleX, scaleY);
    this.canvas.style.transformOrigin = "0 0";
    this.canvas.style.transform = "scale(" + scale + ")";

    //2. Center the canvas.
    // Center horizontally    
    let margin = (window.innerWidth - this.canvas.width * scaleY) / 2;
    if (margin > 0) {
			this.canvas.style.marginLeft = margin + "px";
			this.canvas.style.marginRight = margin + "px";
			this.canvas.style.marginTop = 0 + "px";
			this.canvas.style.marginBottom = 0 + "px";
    }
    // Center vertically
    margin = (window.innerHeight - this.canvas.height * scaleX) / 2;
    if (margin > 0) {
			this.canvas.style.marginLeft = 0 + "px";
			this.canvas.style.marginRight = 0 + "px";
			this.canvas.style.marginTop = margin + "px";
			this.canvas.style.marginBottom = margin + "px";
    }

    //3. Remove any padding from the canvas and set the canvas
    //display style to "block"
    this.canvas.style.padding = 0;
    this.canvas.style.display = "block";
    
    //4. Set the color of the HTML body background
    document.body.style.backgroundColor = backgroundColor;
    
    //5. Set the game engine and pointer to the correct scale. 
    //This is important for correct hit testing between the pointer and sprites
    this.pointer.scale = scale;
    this.scale = scale;

    //Fix some quirkiness in scaling for Safari
    /*
    let ua = navigator.userAgent.toLowerCase(); 
    if (ua.indexOf('safari') != -1) { 
      if (ua.indexOf('chrome') > -1) {
        // Chrome
      } else {
        // Safari
        this.canvas.style.maxHeight = "100%";
        this.canvas.style.minHeight = "100%";
      }
    }
    */
  }
}

/*
game
----
A high level wrapper for creating a game
*/

export function game(
  width = 256, height = 256,
  setup, assetsToLoad, load, fps = 60
) {
  return new Game(width, height, setup, assetsToLoad, load, fps);
}



