export {Random}

class Random {
  // low is included, high is not.
  static nextDouble(low, high) {
    return low + (high - low) * Math.random()
  }
  // low is included, high is not.
  static nextInt(low, high) {
    return low + Math.trunc((high - low) * Math.random())
  }
  static nextElement(array) {
    const target = Random.nextInt(0, array.length)
    return array[target]
  }
  static sample(array, size) {
    const indices = []
    indices.push(Random.nextInt(0, array.length))
    let idx = Random.nextInt(0, array.length)
    while (indices.length < size) {
      while (indices.includes(idx)) {
        idx = Random.nextInt(0, array.length)
      }
      indices.push(idx)
    }
    const result = []
    for (const idx of indices) {
      result.push(array[idx])
    }
    return result
  }
  static randInt(low, high) {
  	return Random.nextInt(low, high + 1)
  }
  static randRange(low, high) {
  	return Random.nextInt(low, high)
  }
	static randString(length) {
		const alphabet = [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789']
		const result = []
		for (let i = 0; i < length; i++) {
			result.push(this.nextElement(alphabet))
		}
		return result.join('')
	}
}