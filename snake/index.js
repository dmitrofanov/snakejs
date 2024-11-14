// const fs = require('fs')
// const path = require('path')
// const http = require('http')
// const { Server } = require('socket.io')

import fs from 'fs'
import path from 'path'
import http from 'http'
import { Server } from 'socket.io'
import { Random } from './random.js'

// const dir = __dirname
const file = 'index.html'

const WWIDTH = 1600,
			WHEIGHT = 800,
			CELLSIZE = 50,
			BOARDWIDTH = WWIDTH / CELLSIZE - 1,
			BOARDHEIGHT = WHEIGHT / CELLSIZE - 1,
			NUMOBSTACLES = 5,
			RIGHT = 'right',
			LEFT = 'left',
			UP = 'up',
			DOWN = 'down',
			FPS = 10

const state = {}
state.obstacles = []
state.snakes = []

createObstacles()

const server = http.createServer	((req, res) => {
	let file = req.url === '/' ? 'index.html' : path.basename(req.url)//path.join(dir, req.url)
	// console.log(file)
	fs.readFile(file, (err, data) => {
		if (err) {
			// console.log(err) // temporary disable favicon errors
			return
		}
		if (file === 'index.html') {
			res.writeHead(200, {'Content-Type': 'text/html'})
		} else {
			res.writeHead(200, {'Content-Type': 'text/javascript'})
		} 
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
	state.snakes.push(snake)
}

function removeSnake(id) {
	console.log('removeSnake', id)
	state.snakes = state.snakes.filter((snake) => snake.id !== id)
}

function changeDirection(id, direction) {
	console.log('changeDirection', id, direction)
	state.snakes.filter((snake) => snake.id === id)[0].direction = direction
}


function calcNextFrameAndSendState() {
	state.snakes.forEach((snake) => {
		// console.log(snake)
		moveSnake(snake)
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

function moveSnake(snake) {
	moveHead(snake)
	snake.coords.pop()
}