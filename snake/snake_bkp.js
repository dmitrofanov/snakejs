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
			NUMOBSTACLES = 10,
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

let fps = 10,
		start = 0,
		leftArrow = keyboard(37),
		rightArrow = keyboard(39),
		upArrow = keyboard(38),
		downArrow = keyboard(40)

let canvas, board, snake, obstacles = [], bonus = null, bonusRemaining = 0,
		food = getRandomCoords(), direction = LEFT, score = 0, record = 0,
		scoreElement, recordElement, borders = [], path = []

leftArrow.press = () => {if (direction !== RIGHT) direction = LEFT}
rightArrow.press = () => {if (direction !== LEFT) direction = RIGHT}
upArrow.press = () => {if (direction !== DOWN) direction = UP}
downArrow.press = () => {if (direction !== UP) direction = DOWN}

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
	createSnake()
	createObstacles()
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

function fillPath() {
	let head = snake[0]
	if (includes(borders, head)) {
		path.push(head)	
	} else {
		path = []
	}
}

function isEaster() {
	if (borders.every(cell => includes(path, cell))) return true
	return false
}

function addEasterScore() {
	if (isEaster()) {
		score += EASTERSCORE
		path = []
	}
}

function moveSnake() {
	moveHead()
	fillPath()
	addEasterScore()
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

function goal() {
	if (bonus !== null) return bonus
	return food
}

function getSuccessors(coord) {
	let successors = []
	let [x, y] = coord
	let nx, ny, newCoord
	nx = x - 1 === -1 ? BOARDWIDTH - 1 : x - 1
	ny = y
	newCoord = [nx, ny]
	if (!(includes(snake, newCoord) || includes(obstacles, newCoord))) successors.push(newCoord)
	nx = x + 1 === BOARDWIDTH ? 0 : x + 1
	ny = y
	newCoord = [nx, ny]
	if (!(includes(snake, newCoord) || includes(obstacles, newCoord))) successors.push(newCoord)
	nx = x
	ny = y - 1 === -1 ? BOARDHEIGHT - 1 : y - 1
	newCoord = [nx, ny]
	if (!(includes(snake, newCoord) || includes(obstacles, newCoord))) successors.push(newCoord)
	nx = x
	ny = y + 1 === BOARDHEIGHT ? 0 : y + 1
	newCoord = [nx, ny]
	if (!(includes(snake, newCoord) || includes(obstacles, newCoord))) successors.push(newCoord)
	return successors
}

function drawSuccessors() {
	let head = snake[0]
	let successors = getSuccessors(head)
	successors.forEach(coord => getBoardCell(coord).fillStyle = 'red')
}

function goalTest(coord) {
	return isEqualCoords(coord, goal())
}

function getPathToGoal() {
	let head = snake[0]
	return nodeToPath(bfs(head, goalTest, getSuccessors))
	
}

function drawPath() {
	let result = getPathToGoal()
	if (result !== null) {
		path = nodeToPath(result)
		path.forEach(coord => getBoardCell(coord).fillStyle = 'red')
	}
}

function getNextCell() {
	let solution = getPathToGoal()
	if (solution !== null) {
		return solution[1]
	} else {
		let successors = getSuccessors(snake[0])
		if (successors.length > 0) {
			return successors[0]
		} else {
			let [x, y] = snake[0]
			return [x - 1, y]
		}
	}

}

function changeDirection() {
	let [x, y] = getNextCell()
	let [gx, gy] = snake[0]
	let bottom = BOARDHEIGHT - 1
	let top = 0
	let right = BOARDWIDTH - 1
	let left = 0
	if (gx === x) {
		if (gy === top && y === bottom) {
			direction = UP
		} else if (gy === bottom && y === top) {
			direction = DOWN
		} else if (y < gy) {
			direction = UP
		} else {
			direction = DOWN
		}
	} else {
		if (gx === left && x === right) {
			direction = LEFT
		} else if (gx === right && x === left) {
			direction = RIGHT
		} else if (x < gx) {
			direction = LEFT
		} else {
			direction = RIGHT
		}
	}
}

function drawNextCell() {
	getBoardCell(getNextCell()).fillStyle = 'red'
}

function gameLoop(timestamp) {
	requestAnimationFrame(gameLoop)
	if (timestamp >= start) {
		// changeDirection()
		moveSnake()
		checkCollision()
		drawBoard()
		// drawBorders()
		drawObstacles()	
		drawSnake()
		// drawNextCell()
		// drawSuccessors()
		drawFood()
		// drawScore()
		// drawRecord()
		decreaseBonusTime()
		drawBonus()
		render(canvas)
		start = timestamp + frameDuration()
	}
}