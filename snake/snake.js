import {makeCanvas, rectangle, stage, draggableSprites, circle, render, text, grid} from './library/display.js'
import {makePointer, keyboard} from './library/interactive.js'
import {hitTestCircle} from './library/collision.js'
import {Random} from './library/random.js'
import {bfs, includes, isEqualCoords, nodeToPath} from './library/search.js'

const WWIDTH = 1600,
			WHEIGHT = 800,
			BORDER = 12,
			CELLSIZE = 50,
			BOARDWIDTH = WWIDTH / CELLSIZE - 1,
			BOARDHEIGHT = WHEIGHT / CELLSIZE - 1,
			PADDING = 4,
			RECTSIZE = CELLSIZE - PADDING,
			RIGHT = 'right',
			LEFT = 'left',
			UP = 'up',
			DOWN = 'down',
			BONUSCOLOR = 'blue',
			FOODCOLOR = 'red',
			RECTCOLOR = '#6496C8',
			OBSTACLECOLOR = 'gray',
			BORDERCOLOR = 'yellow',
			BACKGROUNDCOLOR = 'black',
			HEADCOLOR = '#823246'

let fps = 60,
		start = 0,
		leftArrow = keyboard(37),
		rightArrow = keyboard(39),
		upArrow = keyboard(38),
		downArrow = keyboard(40)

let canvas, board, mySnake = { id : Date.now() }, enemies = [], obstacles = [],
		bonus = null, bonusRemaining = 0, food, direction = LEFT

const socket = io({
  auth: { id: mySnake.id }
})

socket.on('state', (state) => {
	obstacles = state.obstacles

	const thisSnake = state.snakes.filter((snake) => snake.id === mySnake.id)[0]
	mySnake.coords = thisSnake.coords
	mySnake.color = thisSnake.color
	mySnake.direction = thisSnake.direction

	enemies = state.snakes.filter((snake) => snake.id !== mySnake.id)

	food = state.food

	bonus = state.bonus
})

leftArrow.press = () => {
	if (mySnake.direction !== RIGHT && mySnake.direction !== LEFT) {
		changeDirection(LEFT)
	}
}
rightArrow.press = () => {
	if (mySnake.direction !== LEFT && mySnake.direction !== RIGHT) {
		changeDirection(RIGHT)
	}
}
upArrow.press = () => {
	if (mySnake.direction !== DOWN && mySnake.direction !== UP) {
		changeDirection(UP)
	}	
}
downArrow.press = () => {
	if (mySnake.direction !== UP && mySnake.direction !== DOWN) {
		changeDirection(DOWN)
	}
}

function frameDuration() {
	return 1000 / fps
}

setup()

function setup() {
	canvas = makeCanvas(WWIDTH, WHEIGHT)
	stage.width = canvas.width
	stage.height = canvas.height

	drawBackground()
	createBoard()
	gameLoop()
}	

function changeDirection(direction) {
	mySnake.direction = direction
	socket.emit('change direction', direction)
}

function drawBonus() {
	if (bonus !== null) {
		drawCell(bonus, BONUSCOLOR)
	}
}

function drawFood() {
	drawCell(food, FOODCOLOR)
}

function drawObstacles() {
	obstacles.map(obst => {
		drawCell(obst, OBSTACLECOLOR)
	})
}
 
function drawSnake(snake) {
	snake.coords.map((cell, index) => {
		getBoardCell(cell).fillStyle = index === 0 ? HEADCOLOR : snake.color
	})
}

function drawMySnake() {
		drawSnake(mySnake)
}

function drawEnemies() {
	enemies.forEach((snake) => drawSnake(snake))
}

function getBoardCell(coords) {
	return board.matrix[coords[0]][coords[1]]
}

function drawCell(cell, color) {
	getBoardCell(cell).fillStyle = color
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
	board.children.map(cell => cell.fillStyle = RECTCOLOR)
}

function gameLoop(timestamp) {
	requestAnimationFrame(gameLoop)
	const stateHasCome = mySnake.coords !== undefined // waiting for the initial state to come
	if (timestamp >= start && stateHasCome) {
		drawBoard()
		drawObstacles()	
		drawMySnake()
		drawEnemies()
		drawFood()
		drawBonus()
		render(canvas)
		start = timestamp + frameDuration()
	}
}