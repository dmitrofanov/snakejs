import {makeCanvas, rectangle, stage, draggableSprites, circle, render, text, grid} from './display.js'
import {makePointer, keyboard} from './interactive.js'
import {hitTestCircle} from './collision.js'
import {Random} from './random.js'
import {bfs, includes, isEqualCoords, nodeToPath} from './search.js'

const WWIDTH = 1600,
			WHEIGHT = 800,
			BORDER = 12,
			CELLSIZE = 50,
			BOARDWIDTH = WWIDTH / CELLSIZE - 1,
			BOARDHEIGHT = WHEIGHT / CELLSIZE - 1,
			NUMOBSTACLES = 5,
			PADDING = 4,
			RECTSIZE = CELLSIZE - PADDING,
			RIGHT = 'right',
			LEFT = 'left',
			UP = 'up',
			DOWN = 'down',
			FOODSCORE = 1000,
			BONUSSCORE = 5000,
			EASTERSCORE = 50000,
			BONUSCHANCE = 1/3,
			BONUSTIME = 30,
			BONUSCOLOR = 'blue',
			RECTCOLOR = '#6496C8',
			OBSTACLECOLOR = 'gray',
			BORDERCOLOR = 'yellow',
			BACKGROUNDCOLOR = 'black',
			HEADCOLOR = '#823246',
			TAILCOLOR = '#503296'

let fps = 60,
		start = 0,
		leftArrow = keyboard(37),
		rightArrow = keyboard(39),
		upArrow = keyboard(38),
		downArrow = keyboard(40)

let canvas, board, snake = [], enemies = [], obstacles = [], bonus = null, bonusRemaining = 0,
		food = getRandomCoords(), direction = LEFT, score = 0, record = 0,
		scoreElement, recordElement, borders = [], path = []

const id = Date.now()
const socket = io({
  auth: { id }
})

socket.on('state', (state) => {
	console.log(id, state)
	obstacles = []
	snake = []
	enemies = []
	state.obstacles.forEach((coord) => obstacles.push(coord))
	state.snakes.filter((snake) => snake.id === id)[0].coords.forEach((coord) => snake.push(coord))
	let lEnemies = state.snakes.filter((snake) => snake.id !== id)
	// console.log(lEnemies)
	lEnemies.forEach((snake) => enemies.push(snake))
})

		  // const form = document.getElementById('form')
		  // const input = document.getElementById('input')
		  // const messages = document.getElementById('messages')

		  // form.addEventListener('submit', (e) => {
		  // 	e.preventDefault()
		  // 	if (input.value) {
		  // 		socket.emit('chat message', input.value)
		  // 		input.value = ''
		  // 	}
		  // })

		  // socket.on('chat message', (msg) => {
		  // 	const item = document.createElement('li')
		  // 	item.textContent = msg
		  // 	console.log(messages)
		  // 	messages.appendChild(item)
		  // 	window.scrollTo(0, document.body.scrollHeight)
		  // })

leftArrow.press = () => {
	if (direction !== RIGHT && direction !== LEFT) {
		direction = LEFT
		socket.emit('change direction', LEFT)
	}
}
rightArrow.press = () => {
	if (direction !== LEFT && direction !== RIGHT) {
		direction = RIGHT
		socket.emit('change direction', RIGHT)	
	}
}
upArrow.press = () => {
	if (direction !== DOWN && direction !== UP) {
		direction = UP
		socket.emit('change direction', UP)
	}	
}
downArrow.press = () => {
	if (direction !== UP && direction !== DOWN) {
		direction = DOWN
		socket.emit('change direction', DOWN)	
	}
}

function getFps() {
	return fps// + snake.length
}

function frameDuration() {
	return 1000 / getFps()
}

setup()

function setup() {
	canvas = makeCanvas(WWIDTH, WHEIGHT)
	stage.width = canvas.width
	stage.height = canvas.height

	scoreElement = document.getElementById('score-label')
	recordElement = document.getElementById('record-label')

	drawBackground()
	createBoard()
	fillBorders()
	// createSnake()
	// createObstacles()
	placeFood()

	gameLoop()
}	

function createSnake() {
	snake = []
	snake.push([10,4])
	snake.push([11,4])
	snake.push([12,4])
	snake.push([13,4])
}
	
function placeFood() {
	food = getRandomCoords()
	while (includes(obstacles, food) || includes(snake, food)) food = getRandomCoords()
	placeBonus()
}

function placeBonus() {
	if (Random.nextDouble(0, 1) < BONUSCHANCE) {
		bonus = getRandomCoords()
		while(includes(obstacles, bonus)
					|| isEqualCoords(bonus, food)
					|| includes(snake, bonus)) bonus = getRandomCoords()
		bonusRemaining = BONUSTIME
	}
}

function drawBonus() {
	if (bonus !== null) {
		getBoardCell(bonus).fillStyle = BONUSCOLOR
	}
}

function drawScore() {
	scoreElement.innerHTML = score
}

function drawRecord() {
	recordElement.innerHTML = record
}

function drawFood() {
	let [x, y] = food
	board.matrix[x][y].fillStyle = 'red'
}

function onFood() {
	let [fx, fy] = food
	let [hx, hy] = snake[0]
	return fx === hx && fy === hy
}

function onBonus() {
	if (bonus === null) return false
	let [bx, by] = bonus
	let [hx, hy] = snake[0]
	return bx === hx && by === hy
}

function fillBorders() {
	for (let x = 0; x < BOARDWIDTH; x++) {
		for (let y = 0; y < BOARDHEIGHT; y++) {
			if (x === 0 || x === BOARDWIDTH - 1 || y === 0 || y === BOARDHEIGHT - 1) {
				borders.push([x, y])
			}
		}
	}
}

function drawBorders() {
	borders.forEach(cell =>
		getBoardCell(cell).fillStyle = 'red')
}

function decreaseBonusTime() {
	if (bonusRemaining > 0) bonusRemaining -= 1
	if (bonusRemaining === 0) bonus = null
}

function createObstacles() {
	for (let i = 0; i < NUMOBSTACLES; i++) {
		obstacles.push(getRandomCoords())
	}
}

function drawObstacles() {
	obstacles.map(obst => {
		getBoardCell(obst).fillStyle = OBSTACLECOLOR
	})
}
 
function drawSnake() {
	snake.map((cell, index) => {
		getBoardCell(cell).fillStyle = index === 0 ? HEADCOLOR : TAILCOLOR
	})
}

function drawEnemies() {
	enemies.forEach((snake) => snake.coords.map((cell, index) => getBoardCell(cell).fillStyle = index === 0 ? HEADCOLOR : TAILCOLOR))
}

function getBoardCell(coords) {
	return board.matrix[coords[0]][coords[1]]
}

function getRandomCoords() {
	return [Random.nextInt(0, BOARDWIDTH), Random.nextInt(0, BOARDHEIGHT)]
}

function checkCollision() {
	let truncateSnake = () => { snake = snake.filter((seg, index) => index < 4) }
	let flushScore = () => score = 0
	let fillRecord = () => { if (score > record) record = score }
	let processCollision = () => {
		truncateSnake()
		fillRecord()
		flushScore()
	}
	let head = snake[0]
	if (includes(snake.filter((seg, index) => index > 0), head)
			|| includes(obstacles, head)) processCollision()
}

function moveHead() {
	let head = snake[0]
	let [x, y] = head
	if (direction === LEFT) {
		x -= 1
		x = x === -1 ? BOARDWIDTH - 1 : x
	} else if (direction === RIGHT) {
		x += 1
		x = x === BOARDWIDTH ? 0 : x
	} else if (direction === UP) {
		y -= 1
		y = y === -1 ? BOARDHEIGHT - 1 : y
	} else if (direction === DOWN) {
		y += 1
		y = y === BOARDHEIGHT ? 0 : y
	}
	head = [x, y]
	snake.splice(0, 0, head)
}

function moveSnake() {
	if (snake.length === 0) return
	moveHead()
	if (onFood()) {
		placeFood(true)
		score += FOODSCORE
	} else if (onBonus()) {
		bonus = null
		score += BONUSSCORE
	} else {
		snake.pop()
	}

}

function drawBackground() {
	let border = rectangle(WWIDTH, WHEIGHT, BORDERCOLOR),
			background = rectangle(
				WWIDTH - BORDER * 2,
				WHEIGHT - BORDER * 2,
				BACKGROUNDCOLOR
			)
	stage.putCenter(background)
}

function createBoard() {
	board = grid(
		BOARDWIDTH,
		BOARDHEIGHT,
		CELLSIZE,
		CELLSIZE,
		true,
		0,
		0,
		() => rectangle(RECTSIZE, RECTSIZE, RECTCOLOR)
	)
	stage.putCenter(board)
}

function drawBoard() {
	board.matrix.flat(2).map(cell => cell.fillStyle = RECTCOLOR)
}

function gameLoop(timestamp) {
	requestAnimationFrame(gameLoop)
	if (timestamp >= start) {
		// moveSnake()
		checkCollision()
		drawBoard()
		drawObstacles()	
		drawSnake()
		drawEnemies()
		drawFood()
		drawBonus()
		decreaseBonusTime()
		render(canvas)
		start = timestamp + frameDuration()
	}
}