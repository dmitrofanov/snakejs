export {bfs, includes, isEqualCoords, nodeToPath}

class Queue {
	#container = []
	get empty() {
		return this.#container.length === 0
	}
	push(element) {
		this.#container.push(element)
	}
	pop() {
		return this.#container.shift()
	}
	toString() {
		return this.#container
	}
}

class Node {
	constructor(state, parent) {
		this.state = state
		this.parent = parent
	}
}

function bfs (initial, goalTest, successors) {
	let frontier = new Queue()
	frontier.push(new Node(initial, null))
	let explored = [initial]
	while (!frontier.empty) {
		let current_node = frontier.pop()
		let current_state = current_node.state
		if (goalTest(current_state)) {
			return current_node
		}
		for (const child of successors(current_state)) {
			if (includes(explored, child)) continue
			explored.push(child)
		frontier.push(new Node(child, current_node))
		}
	}
	return null
}

function includes(array, subarray) {
	return array.filter(
		element => isEqualCoords(element, subarray)
	).length > 0
}

function isEqualCoords(c1, c2) {
	return c1[0] === c2[0] && c1[1] === c2[1]
}

function nodeToPath(node) {
	if (node === null) return null
	let path = [node.state]
	while (node.parent !== null) {
		node = node.parent
		path.push(node.state)
	}
	path.reverse()
	return path
}