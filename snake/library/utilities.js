
/* 
utilities.js
==============

This JavaScript file contains useful functions for
adding interactivity to sprites. See the sprites.js file for
sprite prototype objects can use this code

*/

//Dependencies
import {makeSound} from "./sound.js";

/*
assets
------

This is an object to help you load and use game assets, like images, fonts and sounds,
and texture atlases. 
Here's how to use to load an image, a font and a texture atlas:

    assets.load([
      "images/cat.png",
      "fonts/puzzler.otf",
      "images/animals.json",
    ]).then(() => setup());
    
When all the assets have finsihed loading, the makeSprites function
will run. (Replace makeSprites with an other function you need).
When you've loaded an asset, you can acccess it like this:

    imageObject = assets["images/cat.png"];

Access individual frames in a texture atlas using the frame's name, like this:

    frame = assets["hedgehog.png"];

(Just use the image name without the extension.)

*/

export let assets = {
	toLoad: 0,
	loaded: 0,

	imageExtensions: ['png', 'jpg', 'jpeg', 'gif'],
	fontExtensions: ['ttf', 'otf', 'ttc', 'woff'],
	jsonExtensions: ['json'],
	audioExtensions: ['mp3', 'ogg', 'wav', 'webm'],

	BASE_URL: BASE_URL,

	load(sources) {
		return new Promise(resolve => {
			let loadHandler = () => {
				this.loaded += 1
				// console.log(this.loaded)

				if (this.toLoad === this.loaded) {
					this.toLoad = 0
					this.loaded = 0
					// console.log('Assets finished loading')

					resolve()
				}
			}

			// console.log('Loading assets...')
			this.toLoad = sources.length

			sources.forEach(source => {
				let extension = source.split('.').pop()

				if (this.imageExtensions.includes(extension)) {
					this.loadImage(source, loadHandler)
				} else if (this.fontExtensions.includes(extension)) {
					this.loadFont(source, loadHandler)
				} else if (this.jsonExtensions.includes(extension)) {
					this.loadJson(source, loadHandler)
				} else if (this.audioExtensions.includes(extension)) {
					this.loadSound(source, loadHandler)
				} else {
					console.log('File type not recognized: ' + source)
				}
			})
		})
	},

	loadImage(source, loadHandler) {
		let image = new Image()
		image.addEventListener('load', loadHandler, false)

		this[source] = image

		image.src = this.BASE_URL + source
	},

	loadFont(source, loadHandler) {

		let fontFamily = source.split('/').pop().split('.')[0]

		let newStyle = document.createElement('style')
		let url = this.BASE_URL + source
		let fontFace = "@font-face {font-family: '" + fontFamily + "'; src: url('" + url + "');}"
		newStyle.appendChild(document.createTextNode(fontFace))
		document.head.appendChild(newStyle)

		loadHandler()
	},

	loadJson(source, loadHandler) {
		let xhr = new XMLHttpRequest()
		xhr.open('GET', this.BASE_URL + source, true)
		xhr.responseType = 'text'
		xhr.onload = event => {
			if (xhr.status === 200) {
				let file = JSON.parse(xhr.responseText)
				file.name = source
				this[file.name] = file

				if (file.frames) {
					this.createTilesetFrames(file, source, loadHandler)
				} else {
					loadHandler()
				}
			}
		}

		xhr.send()
	},

	createTilesetFrames(file, source, loadHandler) {
		let baseUrl = source.replace(/[^\/]*$/, '')
		let imageSource = baseUrl + file.meta.image
		let imageLoadHandler = () => {
			this[imageSource] = image
			Object.keys(file.frames).forEach(frame => {
				this[frame] = file.frames[frame]
				this[frame].source = image
			})
			loadHandler()
		}
		let image = new Image()
		image.addEventListener('load', imageLoadHandler, false)
		image.src = this.BASE_URL + imageSource
	},

	loadSound(source, loadHandler) {

    //Create a sound sprite and alert the `loadHandler`
    //when the sound file has loaded.
    //
    let sound = makeSound(source, loadHandler);

    //Get the sound file name.
    sound.name = source;

    //If you just want to extract the file name with the
    //extension, you can do it like this:
    //soundSprite.name = source.split("/").pop();
    //Assign the sound as a property of the assets object so
    //we can access it like this: `assets["sounds/sound.mp3"]`.
    this[sound.name] = sound;
  }
}

/*

outsideBounds
-------------

Check whether sprite is completely outside of
a boundary

*/ 

export function outsideBounds(sprite, bounds, extra = undefined){

  let x = bounds.x,
      y = bounds.y,
      width = bounds.width,
      height = bounds.height;

  //The `collision` object is used to store which
  //side of the containing rectangle the sprite hits
  let collision;

  //Left
  if (sprite.x < x - sprite.width) {
    collision = "left";
  }
  //Top
  if (sprite.y < y - sprite.height) {
    collision = "top";
  }
  //Right
  if (sprite.x > width) {
    collision = "right";
  }
  //Bottom
  if (sprite.y > height) {
    collision = "bottom";
  }

  //The `extra` function runs if there was a collision
  //and `extra` has been defined
  if (collision && extra) extra(collision);

  //Return the `collision` object
  return collision;
};
/*

contain
-------

Keep a sprite contained inside a boundary

*/ 

export function contain (sprite, bounds, bounce = false, extra = undefined){

  let x = bounds.x,
      y = bounds.y,
      width = bounds.width,
      height = bounds.height;

  //The `collision` object is used to store which
  //side of the containing rectangle the sprite hits
  let collision;

  //Left
  if (sprite.x < x) {
    //Bounce the sprite if `bounce` is true
    if (bounce) sprite.vx *= -1;
    //If the sprite has `mass`, let the mass
    //affect the sprite's velocity
    if(sprite.mass) sprite.vx /= sprite.mass;
    sprite.x = x;
    collision = "left";
  }
  //Top
  if (sprite.y < y) {
    if (bounce) sprite.vy *= -1;
    if(sprite.mass) sprite.vy /= sprite.mass;
    sprite.y = y;
    collision = "top";
  }
  //Right
  if (sprite.x + sprite.width > width) {
    if (bounce) sprite.vx *= -1;
    if(sprite.mass) sprite.vx /= sprite.mass;
    sprite.x = width - sprite.width;
    collision = "right";
  }
  //Bottom
  if (sprite.y + sprite.height > height) {
    if (bounce) sprite.vy *= -1;
    if(sprite.mass) sprite.vy /= sprite.mass;
    sprite.y = height - sprite.height;
    collision = "bottom";
  }

  //The `extra` function runs if there was a collision
  //and `extra` has been defined
  if (collision && extra) extra(collision);

  //Return the `collision` object
  return collision;
};

/*
distance
----------------

Find the distance in pixels between two sprites.
Parameters: 
a. A sprite object with `centerX` and `centerY` properties. 
b. A sprite object with `centerX` and `centerY` properties. 
The function returns the number of pixels distance between the sprites.

*/
export function distance(s1, s2) {
  let vx = s2.centerX - s1.centerX,
      vy = s2.centerY - s1.centerY;
  return Math.sqrt(vx * vx + vy * vy);
}

/*
followEase
----------------

Make a sprite ease to the position of another sprite.
Parameters: 
a. A sprite object with `centerX` and `centerY` properties. This is the `follower`
sprite.
b. A sprite object with `centerX` and `centerY` properties. This is the `leader` sprite that
the follower will chase
c. The easing value, such as 0.3. A higher number makes the follower move faster

*/

export function followEase(follower, leader, speed) {
  //Figure out the distance between the sprites
  let vx = leader.centerX - follower.centerX,
      vy = leader.centerY - follower.centerY,
      distance = Math.sqrt(vx * vx + vy * vy);

  //Move the follower if it's more than 1 pixel
  //away from the leader
  if (distance >= 1) {
    follower.x += vx * speed;
    follower.y += vy * speed;
  }
}


export let easeProperty = (start, end, speed) => {
  //Calculate the distance
  let distance = end - start;
  //Move the follower if it's more than 1 pixel 
  //away from the leader
  if (distance >= 1) {
    return distance * speed;
  } else {
    return 0;
  }
}

/*
followConstant
----------------

Make a sprite move towards another sprite at a regular speed.
Parameters: 
a. A sprite object with `center.x` and `center.y` properties. This is the `follower`
sprite.
b. A sprite object with `center.x` and `center.y` properties. This is the `leader` sprite that
the follower will chase
c. The speed value, such as 3. The is the pixels per frame that the sprite will move. A higher number makes the follower move faster.

*/

export function followConstant(follower, leader, speed) {
  //Figure out the distance between the sprites
  let vx = leader.centerX - follower.centerX,
      vy = leader.centerY - follower.centerY,
      distance = Math.sqrt(vx * vx + vy * vy);

  //Move the follower if it's more than 1 move
  //away from the leader
  if (distance >= speed) {
    follower.x += (vx / distance) * speed;
    follower.y += (vy / distance) * speed;
  }
}


/*
angle
-----

Return the angle in Radians between two sprites.
Parameters: 
a. A sprite object with `centerX` and `centerY` properties.
b. A sprite object with `centerX` and `centerY` properties.
You can use it to make a sprite rotate towards another sprite like this:

    box.rotation = angle(box, pointer);

*/

export let angle = (s1, s2) => {
  return Math.atan2(
    s2.centerY - s1.centerY,
    s2.centerX - s1.centerX
  );
}

//### rotateAround
//Make a sprite rotate around another sprite

export function rotateSprite(rotatingSprite, centerSprite, distance, angle) {
  rotatingSprite.x
    = centerSprite.centerX - rotatingSprite.parent.x
    + (distance * Math.cos(angle))
    - rotatingSprite.halfWidth;

  rotatingSprite.y
    = centerSprite.centerY - rotatingSprite.parent.y
    + (distance * Math.sin(angle))
    - rotatingSprite.halfWidth;
}

//### rotatePoint
//Make a point rotate around another point

export function rotatePoint(pointX, pointY, distanceX, distanceY, angle) {
  let point = {};
  point.x = pointX + Math.cos(angle) * distanceX;
  point.y = pointY + Math.sin(angle) * distanceY;
  return point;
};


/*
randomInt
---------

Return a random integer between a minimum and maximum value
Parameters: 
a. An integer.
b. An integer.
Here's how you can use it to get a random number between, 1 and 10:

    randomInt(1, 10);

*/

export let randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/*
randomFloat
---------

Return a random floating point number between a minimum and maximum value
Parameters: 
a. Any number.
b. Any number.
Here's how you can use it to get a random floating point number between, 1 and 10:

    randomFloat(1, 10);

*/

export let randomFloat = (min, max) => {
  return min + Math.random() * (max - min);
}

/*
shoot
---------


*/

export function shoot(
  shooter, angle, offsetFromCenter,
  bulletSpeed, bulletArray, bulletSprite
) {

  //Make a new sprite using the user-supplied `bulletSprite` function
  let bullet = bulletSprite();

  //Set the bullet's start point
  bullet.x
    = shooter.centerX - bullet.halfWidth
    + (offsetFromCenter * Math.cos(angle));
  bullet.y
    = shooter.centerY - bullet.halfHeight
    + (offsetFromCenter * Math.sin(angle));

  //Set the bullet's velocity
  bullet.vx = Math.cos(angle) * bulletSpeed;
  bullet.vy = Math.sin(angle) * bulletSpeed;

  //Push the bullet into the `bulletArray`
  bulletArray.push(bullet);
}



/*
Wait
----

Lets you set up a timed sequence of events

    wait(1000)
      .then(() => console.log("One"))
      .then(() => wait(1000))
      .then(() => console.log("Two"))
      .then(() => wait(1000))
      .then(() => console.log("Three"))

*/

export function wait(duration = 0) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, duration);
  });
}

export function move(...sprites) {
  if (sprites.length === 1) {
    let s = sprites[0];
    s.x += s.vx;
    s.y += s.vy;
  }
  else {
    for (let i = 0; i < sprites.length; i++) {
      let s = sprites[i];
      s.x += s.vx;
      s.y += s.vy;
    }
  }
}