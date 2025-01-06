import fs from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'http'
import express from 'express'
import { Server } from 'socket.io'
import { Random } from './public/library/random.js'
import { includes, isEqualCoords } from './public/library/search.js'
import bodyParser from 'body-parser'

const __dirname = dirname(fileURLToPath(import.meta.url))

const WWIDTH = 800,
			WHEIGHT = 400,
			CELLSIZE = 25,
			BOARDWIDTH = Math.trunc(WWIDTH / CELLSIZE) - 1,
			BOARDHEIGHT = Math.trunc(WHEIGHT / CELLSIZE) - 1,
			NUMFOOD = 3,
			NUMOBSTACLES = 5,
			FPS = 10,
			RIGHT = 'right',
			LEFT = 'left',
			UP = 'up',
			DOWN = 'down',
			BONUSCHANCE = 1/3,
			BONUSTIME = 30,
			COLORS = ['green', 'pink', 'orange', 'yellow', 'white', 'salmon', 'Bisque',
								'LemonChiffon', 'Plum', 'Fuchsia', 'DarkViolet', 'Indigo', 'SeaGreen']

const app = express(),
			rooms = new Map()

app.use(express.static(join(__dirname, 'public')))
app.use(bodyParser.urlencoded({ extended: false }))

app.post('/', (req, res) => {
	let roomName = Random.randString(8)
	while (rooms.has(roomName)) {
		roomName = Random.randString(8)
	}
	const b = req.body
	rooms.set(
		roomName,
		newRoom(
			roomName, b.width, b.height,
			b.numFood, b.numObstacles,
			b.bonusChance, b.bonusTime, b.fps
		)
	)
	res.redirect(roomName)
})

app.get('/', (req, res) => {
	res.sendFile(join(__dirname, 'public', 'landing.html'))
})

app.get('/:room', (req, res) => {
	res.sendFile(join(__dirname, 'public', 'game.html'))
})

const server = createServer(app)
const io = new Server(server)

io.on('connection', (socket) => {
	const id = socket.handshake.auth.id
	const roomName = socket.handshake.auth.room
	if (!rooms.has(roomName)) {
		rooms.set(roomName, newRoom(roomName))
	}
	const room = rooms.get(roomName)
	const state = room.state

	io.in(socket.id).emit(
		'canvas-size', 
		{
			WWIDTH: (room.width + 1) * CELLSIZE, // increase a bit WWIDTH and WHEIGHT
			WHEIGHT: (room.height + 1) * CELLSIZE, // to provide a padding around the board
			CELLSIZE,
			BOARDWIDTH: room.width,
			BOARDHEIGHT: room.height  
		}
	)

	socket.join(roomName)

	addSnake(state, id)

	socket.on('change direction', (direction) => {
		changeDirection(state, id, direction)
	})

	socket.on('disconnect', (reason) => {
		removeSnake(roomName, state, id)
	})
})

server.listen(80, () => {
	console.log(`Server running at localhost:80`)
})

// ================================================================================================
// Functions
// ================================================================================================
function newState(room) {
	const state = {}
	state.snakes = []
	state.food = []
	state.bonuses = []
	createObstacles(room, state)
	for (let i = 0; i < room.numFood; i++) {
		placeFood(room, state)
	}
	return state
}

function newRoom(
	name, width, height,
	numFood, numObstacles,
	bonusChance, bonusTime, fps
) {
	// Assign default values in case they are undefined
	width = width ?? Math.trunc(WWIDTH / CELLSIZE)
	height = height ?? Math.trunc(WHEIGHT / CELLSIZE)
	numFood = numFood ?? NUMFOOD
	numObstacles = numObstacles ?? NUMOBSTACLES
	bonusChance = bonusChance ?? BONUSCHANCE
	bonusTime = bonusTime ?? BONUSTIME
	fps = fps ?? FPS

	// Cast everything to Number since it might be a string after request.body parsing
	width = +width
	height = +height
	numFood = +numFood
	numObstacles = +numObstacles
	bonusChance = +bonusChance
	bonusTime = +bonusTime

	const room = {
		name, width, height,
		numFood, numObstacles,
		bonusChance, bonusTime, fps
	}
	room.state = newState(room)
	room.timerId = setInterval(() => {
		calcNextFrameAndSendState(room)
		// -4 is used to account for delays in successive setInterval calls
		// see getIntervalDelay.js
	}, 1000 / room.fps - 4)
	return room
}

function addSnake(state, id) {
	const snake = { id }
	// I'm lazy to implement a random place picker for the snake spawn process
	snake.coords = [[2, 2], [3, 2], [4, 2], [5, 2]] // so snakes always spawn in the same place
	snake.direction = LEFT
	snake.color = Random.nextElement(COLORS)
	state.snakes.push(snake)
}

function removeSnake(roomName, state, id) {
	state.snakes = enemySnakes(state, { id })
	cleanRooms(state, roomName)
}

function changeDirection(state, id, direction) {
	mySnake(state, id).direction = direction
}

function calcNextFrameAndSendState(room) {
	const state = room.state

	allSnakes(state).forEach((snake) => {
		moveSnake(room, state, snake)
		checkCollision(state, snake)
	})

	decreaseBonusTime(state)

	io.in(room.name).emit('state', state)
}

function createObstacles(room, state) {
	state.obstacles = []
	for (let i = 0; i < room.numObstacles; i++) {
		state.obstacles.push(getRandomCoords(room))
	}
}

function getRandomCoords(room) {
	return [Random.nextInt(0, room.width), Random.nextInt(0, room.height)]
}

function moveHead(room, snake) {
	let [x, y] = head(snake)
	if (snake.direction === LEFT) {
		x -= 1
		x = x === -1 ? room.width - 1 : x
	} else if (snake.direction === RIGHT) {
		x += 1
		x = x === room.width ? 0 : x
	} else if (snake.direction === UP) {
		y -= 1
		y = y === -1 ? room.height - 1 : y
	} else if (snake.direction === DOWN) {
		y += 1
		y = y === room.height ? 0 : y
	}
	snake.coords.splice(0, 0, [x, y])
}

function onFood(state, snake) {
	let result = [false, null]
	state.food.forEach((food) => {
		if (isEqualCoords(head(snake), food)) {
			result = [true, food]
		}
	})
	return result
}

function moveSnake(room, state, snake) {
	moveHead(room, snake)
	let [isOnFood, food] = onFood(state, snake)
	let [isOnBonus, bonus] = onBonus(state, snake)
	if (isOnFood) {
		removeFood(state, food)
		placeFood(room, state)
	} else if (isOnBonus) {
		removeBonus(state, bonus)
		snake.coords.push(lastSegment(snake))
		snake.coords.push(lastSegment(snake))
		state.bonus = null
	} else {
		snake.coords.pop()
	}
}

function removeFood(state, food) {
	state.food.splice(state.food.indexOf(food), 1)
}

function removeBonus(state, bonus) {
	state.bonuses.splice(state.bonuses.indexOf(bonus), 1)
}

function placeFood(room, state) {
	let food = getRandomCoords(room)
	// we don't want the food to be placed inside an obstacle,
	// bodies of snakes or other food instances
	while (isInsideObstacles(state, food)
				|| isInside(allSnakes(state), food)
				|| isInsideFood(state, food)) {
		food = getRandomCoords(room)
	}
	state.food.push(food)
	placeBonus(room, state)
}

function checkCollision(state, snake) {
	let truncateSnake = () => { snake.coords = snake.coords.filter((seg, index) => index < 4) }
	let head = snake.coords[0]
	if (// check if my head is in my own tail
			isInTail(snake, head)
			// check if my head is in an obstacle
			|| isInsideObstacles(state, head)
			// for every enemy snake check if my head is in the enemy snake 
			|| isInside(enemySnakes(state, snake), head)) {
		truncateSnake()
	}
}

function placeBonus(room, state) {
	if (Random.nextDouble(0, 1) < room.bonusChance) {
		const bonus = { coord: getRandomCoords(room), remaining: room.bonusTime }
		// we don't want the bonus to be placed inside an obstacle, food,
		// other bonuses or bodies of snakes
		while(isInsideObstacles(state, bonus.coord)
					|| isInsideFood(state, bonus.coord)
					|| isInsideBonuses(state, bonus.coord)
					|| isInside(allSnakes(state), bonus.coord)) {
			bonus.coord = getRandomCoords(room)
		}
		state.bonuses.push(bonus)
	}
}

function isInsideObstacles(state, coordinate) {
	return includes(state.obstacles, coordinate)
}

function isInsideFood(state, coordinate) {
	return includes(state.food, coordinate)
}

function isInsideBonuses(state, coordinate) {
	return includes(state.bonuses.map(bonus => bonus.coord), coordinate)
}

function isInTail(snake, coordinate) {
	return includes(tail(snake), coordinate)
}

function isInBody(snake, coordinate) {
	return includes(snake.coords, coordinate)
}

function isInside(snakes, coordinate) {
	return snakes.some((snake) => isInBody(snake, coordinate))
}

function allSnakes(state) {
	return state.snakes
}

function enemySnakes(state, snake) {
	return state.snakes.filter((sn) => sn.id !== snake.id)
}

function head(snake) {
	return snake.coords[0]
}

function tail(snake) {
	return snake.coords.filter((seg, index) => index > 0)
}

function lastSegment(snake) {
	return snake.coords[snake.coords.length - 1]
}

function onBonus(state, snake) {
	let result = [false, null]
	state.bonuses.forEach((bonus) => {
		if (isEqualCoords(bonus.coord, head(snake))) result = [true, bonus]
	})
	return result
}

function mySnake(state, id) {
	return allSnakes(state).find((snake) => snake.id === id)
}

function decreaseBonusTime(state) {
	for (let i = state.bonuses.length - 1; i >= 0; i--) {
		const bonus = state.bonuses[i]
		if (bonus.remaining > 0) bonus.remaining -= 1
		if (bonus.remaining === 0) removeBonus(state, bonus)
	}
}

function cleanRooms(state, roomName) {
	if (state.snakes.length === 0) {
		clearInterval(rooms.get(roomName).timerId)
		rooms.delete(roomName)
	}
}