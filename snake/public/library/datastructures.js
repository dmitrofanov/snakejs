import {bench} from './benchmark.js'

class Deque {
    constructor() {
        this.front = this.back = undefined;
    }
    append(value) {
        if (!this.front) this.front = this.back = { value };
        else this.front = this.front.next = { value, prev: this.front };
    }
    pop() {
        let value = this.peek();
        if (this.front === this.back) this.front = this.back = undefined;
        else (this.front = this.front.prev).next = undefined;
        return value;
    }
    peek() { 
        return this.front && this.front.value;
    }
    appendLeft(value) {
        if (!this.front) this.front = this.back = { value };
        else this.back = this.back.prev = { value, next: this.back };
    }
    popLeft() {
        let value = this.peekLeft();
        if (this.front === this.back) this.front = this.back = undefined;
        else (this.back = this.back.next).back = undefined;
        return value;
    }
    peekLeft() { 
        return this.back && this.back.value;
    }
    forEach(func) {
    	let back = this.back
    	while (back !== undefined) {
    		func(back.value)
    		back = back.next
    	}
    }
}

function dequeue_bench(runs) {
	let snake = new Deque()
	for (let i = 0; i < 15; i++) snake.append([1, 1])
	for (let i = 0; i < 100; i++) {
		snake.appendLeft([1, 1])
		snake.pop()
	}
}

function array_bench(runs) {
	let snake = []
	for (let i = 0; i < 15; i++) snake.push([1, 1])
	for (let i = 0; i < 100; i++) {
		snake.unshift([1, 1])
		snake.pop()
	}
}

bench(dequeue_bench, array_bench)

// function bench(runs, func) {
// 	let start = Date.now()
// 	for (let r = 0; r < runs; r++) {
// 		func()
// 	}
// 	return Date.now() - start
// }

// console.log(bench(100000, dequeue_bench))
// console.log(bench(100000, array_bench))

// let snake = new Deque()
// for (let i = 0; i < 15; i++) snake.append(i)
// snake.forEach(console.log)