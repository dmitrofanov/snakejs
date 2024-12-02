export function bench(func1, func2, rounds = 100000) {
	console.log(`First: ${run(rounds, func1)}, second: ${run(rounds, func2)}`)
}

function run(rounds, func) {
	const start = performance.now()
	for (let i = 0; i < rounds; i++) {
		func()
	}
	return performance.now() - start
}