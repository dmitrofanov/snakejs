// const fs = require('fs')
// const path = require('path')
// const http = require('http')
// const { Server } = require('socket.io')

import fs from 'fs'
import path from 'path'
import http from 'http'
import { Server } from 'socket.io'
import { Random } from './library/random.js'
import { includes, isEqualCoords } from './library/search.js'


// const dir = __dirname
const file = 'index.html'

const WWIDTH = 1600,
			WHEIGHT = 800,
			CELLSIZE = 50,
			BOARDWIDTH = WWIDTH / CELLSIZE - 1,
			BOARDHEIGHT = WHEIGHT / CELLSIZE - 1,
			NUMOBSTACLES = 0,
			RIGHT = 'right',
			LEFT = 'left',
			UP = 'up',
			DOWN = 'down',
			FPS = 10,
			BONUSCHANCE = 1/3,
			BONUSTIME = 30,
			COLORS = ['green', 'pink', 'orange', 'yellow', 'white', 'black']

let bonusRemaining = 0

const state = {}
state.obstacles = []
state.snakes = []
state.food = [2, 2]

createObstacles()
placeFood()

const server = http.createServer	((req, res) => {
	// console.log(req.url)
	let file = req.url === '/' ? 'index.html' : req.url.substring(1)
	console.log(file)
	fs.readFile(file, (err, data) => {
		if (err) {
			// console.log(err) // temporary disable favicon errors
			return
		}
		let contentType = path.extname(file)
		contentType = contentType === '.html' ? 'text/html' : 'text/javascript'
		res.writeHead(200, {'Content-Type': contentType})
		res.end(data)
	})
})

const io = new Server(server)

io.on('connection', (socket) => {
	const id = socket.handshake.auth.id
	console.log('new user connected, id: ' + id)
	
	addSnake(id)

	io.emit('state', state)
	
	socket.on('change direction', (direction) => {
		changeDirection(id, direction)
	})

	socket.on('disconnect', (reason) => {
		removeSnake(id)
	})
})

function addSnake(id) {
	console.log('addSnake', id)
	const snake = {id}
	snake.coords = [[2, 2], [3, 2], [4, 2], [5, 2]]
	snake.direction = LEFT
	snake.color = Random.nextElement(COLORS)
	state.snakes.push(snake)
}

function removeSnake(id) {
	console.log('removeSnake', id)
	state.snakes = state.snakes.filter((snake) => snake.id !== id)
}

function changeDirection(id, direction) {
	// console.log('changeDirection', id, direction)
	state.snakes.filter((snake) => snake.id === id)[0].direction = direction
}


function calcNextFrameAndSendState() {
	state.snakes.forEach((snake) => {
		// console.log(snake)
		moveSnake(snake)
		checkCollision(snake)
		decreaseBonusTime()
	})
	io.emit('state', state)
}

let timerId = setInterval(() => {
	calcNextFrameAndSendState()
}, 1000 / FPS)

server.listen(3000, () => {
	console.log(`Server running at localhost:3000`)
})

function createObstacles() {
	for (let i = 0; i < NUMOBSTACLES; i++) {
		state.obstacles.push(getRandomCoords())
	}
}

function getRandomCoords() {
	return [Random.nextInt(0, BOARDWIDTH), Random.nextInt(0, BOARDHEIGHT)]
}

function moveHead(snake) {
	let head = snake.coords[0]
	let [x, y] = head
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
	head = [x, y]
	snake.coords.splice(0, 0, head)
}

function onFood(snake) {
	let head = snake.coords[0]
	return isEqualCoords(head, state.food)
}

function moveSnake(snake) {
	moveHead(snake)
	if (onFood(snake)) {
		placeFood()
	} else if (onBonus(snake)) {
		let tail = snake.coords[snake.coords.length - 1]
		snake.coords.push(tail)
		snake.coords.push(tail)
		state.bonus = null
	} else {
		snake.coords.pop()
	}
}

function placeFood() {
	state.food = getRandomCoords()
	while (includes(state.obstacles, state.food) || state.snakes.some((snake) => includes(snake.coords, state.food))) state.food = getRandomCoords()
	placeBonus()
}

function checkCollision(snake) {
	let truncateSnake = () => { snake.coords = snake.coords.filter((seg, index) => index < 4) }
	let processCollision = () => {
		truncateSnake()
	}
	let head = snake.coords[0]
	if (includes(snake.coords.filter((seg, index) => index > 0), head)
			|| includes(state.obstacles, head)
			|| state.snakes.filter((sn) => sn.id !== snake.id).some((sn) => includes(sn.coords, head)))	 processCollision()
}

function placeBonus() {
	if (Random.nextDouble(0, 1) < BONUSCHANCE) {
		state.bonus = getRandomCoords()
		while(includes(state.obstacles, state.bonus)
					|| isEqualCoords(state.bonus, state.food)
					|| state.snakes.some((sn) => includes(sn.coords, state.bonus))) { 
			state.bonus = getRandomCoords()
		}
		bonusRemaining = BONUSTIME
	}
}

function onBonus(snake) {
	if (state.bonus == null) return false
	return isEqualCoords(state.bonus, snake.coords[0])
}

function decreaseBonusTime() {
	if (bonusRemaining > 0) bonusRemaining -= 1
	if (bonusRemaining === 0) state.bonus = null
}