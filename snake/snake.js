import { game } from './library/engine.js'

let wwidth,
		wheight,
		cellsize,
		boardwidth,
		boardheight,
		isInitialized = false,
		g,
		leftArrow,
		rightArrow,
		upArrow,
		downArrow

const	BORDER = 6,
			PADDING = 1,
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

let board, mySnake = { id : Date.now() }, enemies = [], obstacles = [], bonus = null, food

const socket = io({
  auth: { id: mySnake.id, room: getRoomName() }
})

socket.on('canvas-size', (settings) => {
	initializeGame(settings)
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

	if (isInitialized) {
		drawBoard()
		drawObstacles()	
		drawMySnake()
		drawEnemies()
		drawFood()
		drawBonus()
	}
})

function initializeGame(settings) {
	wwidth = settings.WWIDTH
	wheight = settings.WHEIGHT
	cellsize = settings.CELLSIZE
	boardwidth = settings.BOARDWIDTH
	boardheight = settings.BOARDHEIGHT

	g = game(wwidth, wheight, setup)
	leftArrow = g.keyboard(37)
	rightArrow = g.keyboard(39)
	upArrow = g.keyboard(38)
	downArrow = g.keyboard(40)

	g.start()

	g.scaleToWindow()

	window.addEventListener("resize", event => g.scaleToWindow())

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

	isInitialized = true
}

function setup() {
	drawBackground()
	createBoard()
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
	food.forEach((cell) => drawCell(cell, FOODCOLOR))
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
	let border = g.rectangle(wwidth, wheight, BORDERCOLOR),
			background = g.rectangle(
				wwidth - BORDER * 2,
				wheight - BORDER * 2,
				BACKGROUNDCOLOR
			)
	g.stage.putCenter(background)
}

function createBoard() {
	board = g.grid(
		boardwidth,
		boardheight,
		cellsize,
		cellsize,
		true,
		0,
		0,
		() => g.rectangle(rectsize(), rectsize(), RECTCOLOR)
	)
	g.stage.putCenter(board)
}

function drawBoard() {
	board.children.map(cell => cell.fillStyle = RECTCOLOR)
}

function getRoomName() {
	const regex = /\/(?<room>\w*)$/
	return regex.exec(document.URL).groups.room
}

function rectsize() {
	return cellsize - PADDING
}