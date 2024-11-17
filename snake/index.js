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
			BOARDWIDTH = WWIDTH / CELLSIZE - 1,
			BOARDHEIGHT = WHEIGHT / CELLSIZE - 1,
			NUMOBSTACLES = 5,
			RIGHT = 'right',
			LEFT = 'left',
			UP = 'up',
			DOWN = 'down',
			FPS = 10, // move speed per second
			BONUSCHANCE = 1/3,
			BONUSTIME = 30,
			COLORS = ['green', 'pink', 'orange', 'yellow', 'white', 'salmon', 'Bisque',
								'LemonChiffon', 'Plum', 'Fuchsia', 'DarkViolet', 'Indigo', 'SeaGreen']

let bonusRemaining = 0

const state = {}
initializeState()

const app = express()
// serve static files recursively from the root
app.use(express.static(__dirname))

app.get('/', (req, res) => {
	res.sendFile(join(__dirname, 'index.html'))
})

const server = createServer(app)
const io = new Server(server)

io.on('connection', (socket) => {
	const id = socket.handshake.auth.id
	
	addSnake(id)

	socket.on('change direction', (direction) => {
		changeDirection(id, direction)
	})

	socket.on('disconnect', (reason) => {
		removeSnake(id)
	})
})

let timerId = setInterval(() => {
	calcNextFrameAndSendState()
}, 1000 / FPS)

server.listen(3000, () => {
	console.log(`Server running at localhost:3000`)
})

// ================================================================================================
// Functions
// ================================================================================================
function initializeState() {
	state.snakes = []
	createObstacles()
	placeFood()
}

function addSnake(id) {
	const snake = { id }
	// I'm lazy to implement a random place picker for the snake spawn process
	snake.coords = [[2, 2], [3, 2], [4, 2], [5, 2]] // so snakes always spawn in the same place
	snake.direction = LEFT
	snake.color = Random.nextElement(COLORS)
	state.snakes.push(snake)
}

function removeSnake(id) {
	state.snakes = enemySnakes({ id })
}

function changeDirection(id, direction) {
	mySnake(id).direction = direction
}

function calcNextFrameAndSendState() {
	allSnakes().forEach((snake) => {
		moveSnake(snake)
		checkCollision(snake)
	})
	decreaseBonusTime()
	io.emit('state', state)
}

function createObstacles() {
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

function onFood(snake) {
	return isEqualCoords(head(snake), state.food)
}

function moveSnake(snake) {
	moveHead(snake)
	if (onFood(snake)) {
		placeFood()
	} else if (onBonus(snake)) {
		snake.coords.push(lastSegment(snake))
		snake.coords.push(lastSegment(snake))
		state.bonus = null
	} else {
		snake.coords.pop()
	}
}

function placeFood() {
	state.food = getRandomCoords()
	// we don't want the food to be placed inside an obstacle or bodies of snakes
	while (isInsideObstacles(state.food)
				|| isInside(allSnakes(), state.food)) {
		state.food = getRandomCoords()
	}
	placeBonus()
}

function checkCollision(snake) {
	let truncateSnake = () => { snake.coords = snake.coords.filter((seg, index) => index < 4) }
	let head = snake.coords[0]
	if (// check if my head is in my own tail
			isInTail(snake, head)
			// check if my head is in an obstacle
			|| isInsideObstacles(head)
			// for every enemy snake check if my head is in the enemy snake 
			|| isInside(enemySnakes(snake), head)) {
		truncateSnake()
	}
}

function placeBonus() {
	if (Random.nextDouble(0, 1) < BONUSCHANCE) {
		state.bonus = getRandomCoords()
		// we don't want the bonus to be placed inside an obstacle, food, or bodies of snakes
		while(isInsideObstacles(state.bonus)
					|| isEqualCoords(state.bonus, state.food)
					|| isInside(allSnakes(), state.bonus)) { 
			state.bonus = getRandomCoords()
		}
		bonusRemaining = BONUSTIME
	}
}

function isInsideObstacles(coordinate) {
	return includes(state.obstacles, coordinate)
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

function allSnakes() {
	return state.snakes
}

function enemySnakes(snake) {
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

function onBonus(snake) {
	if (state.bonus == null) return false
	return isEqualCoords(state.bonus, snake.coords[0])
}

function mySnake(id) {
	return allSnakes().filter((snake) => snake.id === id)[0]
}

function decreaseBonusTime() {
	if (bonusRemaining > 0) bonusRemaining -= 1
	if (bonusRemaining === 0) state.bonus = null
}
