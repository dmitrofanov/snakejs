import { game } from './library/engine.js'

const WWIDTH = 800,
			WHEIGHT = 400,
			BORDER = 6,
			CELLSIZE = 25,
			BOARDWIDTH = WWIDTH / CELLSIZE - 1,
			BOARDHEIGHT = WHEIGHT / CELLSIZE - 1,
			PADDING = 2,
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

const g = game(WWIDTH, WHEIGHT, setup)

let leftArrow = g.keyboard(37),
		rightArrow = g.keyboard(39),
		upArrow = g.keyboard(38),
		downArrow = g.keyboard(40)

let board, mySnake = { id : Date.now() }, enemies = [], obstacles = [], bonus = null, food

g.start()

g.scaleToWindow()

window.addEventListener("resize", event => g.scaleToWindow())

const socket = io({
  auth: { id: mySnake.id, room: getRoomName() }
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

	drawBoard()
	drawObstacles()	
	drawMySnake()
	drawEnemies()
	drawFood()
	drawBonus()
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
	let border = g.rectangle(WWIDTH, WHEIGHT, BORDERCOLOR),
			background = g.rectangle(
				WWIDTH - BORDER * 2,
				WHEIGHT - BORDER * 2,
				BACKGROUNDCOLOR
			)
	g.stage.putCenter(background)
}

function createBoard() {
	board = g.grid(
		BOARDWIDTH,
		BOARDHEIGHT,
		CELLSIZE,
		CELLSIZE,
		true,
		0,
		0,
		() => g.rectangle(RECTSIZE, RECTSIZE, RECTCOLOR)
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