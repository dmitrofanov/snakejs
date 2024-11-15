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

let canvas, board, snake = [], enemies = [], obstacles = [], bonus = null, bonusRemaining = 0,
		food, direction = LEFT, color = 'white'

const id = Date.now()
const socket = io({
  auth: { id }
})

socket.on('state', (state) => {
	obstacles = state.obstacles

	snake = state.snakes.filter((snake) => snake.id === id)[0].coords

	enemies = []
	state.snakes.filter((snake) => snake.id !== id).forEach((snake) => enemies.push(snake))

	food = state.food

	color = state.snakes.filter((snake) => snake.id === id)[0].color

	bonus = state.bonus
})

leftArrow.press = () => {
	if (direction !== RIGHT && direction !== LEFT) {
		changeDirection(LEFT)
	}
}
rightArrow.press = () => {
	if (direction !== LEFT && direction !== RIGHT) {
		changeDirection(RIGHT)
	}
}
upArrow.press = () => {
	if (direction !== DOWN && direction !== UP) {
		changeDirection(UP)
	}	
}
downArrow.press = () => {
	if (direction !== UP && direction !== DOWN) {
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

function changeDirection(direct) {
	direction = direct
	socket.emit('change direction', direct)
}

function drawBonus() {
	if (bonus !== null) {
		getBoardCell(bonus).fillStyle = BONUSCOLOR
	}
}

function drawFood() {
	getBoardCell(food).fillStyle = FOODCOLOR
}

function drawObstacles() {
	obstacles.map(obst => {
		getBoardCell(obst).fillStyle = OBSTACLECOLOR
	})
}
 
function drawSnake() {
	snake.map((cell, index) => {
		getBoardCell(cell).fillStyle = index === 0 ? HEADCOLOR : color
	})
}

function drawEnemies() {
	enemies.forEach((snake) => 
		snake.coords.map((cell, index) => 
			drawCell(cell, index === 0 ? HEADCOLOR : snake.color)
		)
	)
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
	board.matrix.flat(2).map(cell => cell.fillStyle = RECTCOLOR)
}

function gameLoop(timestamp) {
	requestAnimationFrame(gameLoop)
	if (timestamp >= start) {
		drawBoard()
		drawObstacles()	
		drawSnake()
		drawEnemies()
		drawFood()
		drawBonus()
		render(canvas)
		start = timestamp + frameDuration()
	}
}