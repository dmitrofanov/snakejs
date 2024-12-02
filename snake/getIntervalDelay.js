function getIntervalDelay() {
	let start = Date.now()
	const times = []
	function sheduleMe() {
		let now = Date.now()
		times.push(now - start)
		start = now
	}
	let timerId = setInterval(sheduleMe)
	setTimeout(() => { clearInterval(timerId); console.log(times.reduce((acc, val) => acc + val) / times.length); }, 5000)
}

getIntervalDelay()