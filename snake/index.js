import fs from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'http'
import express from 'express'
import { Server } from 'socket.io'
import { Random } from './library/random.js'
import { includes, isEqualCoords } from './library/search.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const WWIDTH = 800,
			WHEIGHT = 400,
			CELLSIZE = 25,
			BOARDWIDTH = Math.trunc(WWIDTH / CELLSIZE) - 1,
			BOARDHEIGHT = Math.trunc(WHEIGHT / CELLSIZE) - 1,
			NUMOBSTACLES = 5,
			RIGHT = 'right',
			LEFT = 'left',
			UP = 'up',
			DOWN = 'down',
			BONUSCHANCE = 1/3,
			BONUSTIME = 30,
			COLORS = ['green', 'pink', 'orange', 'yellow', 'white', 'salmon', 'Bisque',
								'LemonChiffon', 'Plum', 'Fuchsia', 'DarkViolet', 'Indigo', 'SeaGreen']

const app = express()
// serve static files recursively from the root
app.use(express.static(__dirname))

app.get('/:room', (req, res) => {
	res.sendFile(join(__dirname, 'index.html'))
})

const server = createServer(app)
const io = new Server(server)

const rooms = new Map()

io.on('connection', (socket) => {
	const id = socket.handshake.auth.id
	const roomName = socket.handshake.auth.room

	io.in(socket.id).emit('canvas-size', { WWIDTH, WHEIGHT, CELLSIZE, BOARDWIDTH, BOARDHEIGHT })

	socket.join(roomName)

	if (!rooms.has(roomName)) {
		rooms.set(roomName, newRoom(roomName))
	}

	const state = rooms.get(roomName).state

	addSnake(state, id)

	socket.on('change direction', (direction) => {
		changeDirection(state, id, direction)
	})

	socket.on('disconnect', (reason) => {
		removeSnake(roomName, state, id)
	})
})

server.listen(3000, () => {
	console.log(`Server running at localhost:3000`)
})

// ================================================================================================
// Functions
// ================================================================================================
function newState() {
	const state = {}
	state.snakes = []
	state.food = []
	state.bonuses = []
	state.food_count = 3
	createObstacles(state)
	for (let i = 0; i < state.food_count; i++) {
		placeFood(state)
	}
	return state
}

function newRoom(name) {
	const room = { name }
	room.fps = 10 // this should be configurable as all other properties of the game
	room.state = newState()
	room.timerId = setInterval(() => {
		calcNextFrameAndSendState(room)
	}, 1000 / room.fps)
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
		moveSnake(state, snake)
		checkCollision(state, snake)
	})

	decreaseBonusTime(state)

	io.in(room.name).emit('state', state)
}

function createObstacles(state) {
	state.obstacles = []
	for (let i = 0; i < NUMOBSTACLES; i++) {
		state.obstacles.push(getRandomCoords())
	}
}

function getRandomCoords() {
	return [Random.nextInt(0, BOARDWIDTH), Random.nextInt(0, BOARDHEIGHT)]
}

function moveHead(snake) {
	let [x, y] = head(snake)
	if (snake.direction === LEFT) {
		x -= 1
		x = x === -1 ? BOARDWIDTH - 1 : x
	} else if (snake.direction === RIGHT) {
		x += 1
		x = x === BOARDWIDTH ? 0 : x
	} else if (snake.direction === UP) {
		y -= 1
		y = y === -1 ? BOARDHEIGHT - 1 : y
	} else if (snake.direction === DOWN) {
		y += 1
		y = y === BOARDHEIGHT ? 0 : y
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

function moveSnake(state, snake) {
	moveHead(snake)
	let [isOnFood, food] = onFood(state, snake)
	let [isOnBonus, bonus] = onBonus(state, snake)
	if (isOnFood) {
		removeFood(state, food)
		placeFood(state)
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

function placeFood(state) {
	let food = getRandomCoords()
	// we don't want the food to be placed inside an obstacle, bodies of snakes or other food instances
	while (isInsideObstacles(state, food)
				|| isInside(allSnakes(state), food)
				|| isInsideFood(state, food)) {
		food = getRandomCoords()
	}
	state.food.push(food)
	placeBonus(state)
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

function placeBonus(state) {
	if (Random.nextDouble(0, 1) < BONUSCHANCE) {
		const bonus = { coord: getRandomCoords(), remaining: BONUSTIME }
		// we don't want the bonus to be placed inside an obstacle, food, other bonuses or bodies of snakes
		while(isInsideObstacles(state, bonus.coord)
					|| isInsideFood(state, bonus.coord)
					|| isInsideBonuses(state, bonus.coord)
					|| isInside(allSnakes(state), bonus.coord)) {
			bonus.coord = getRandomCoords()
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