// A finished task hands its slot over to the next waiting one instead of
// freeing it, so that no other task can take it in between
exports.createLimiter = (max) => {
  let running = 0
  const waiting = []

  return async (task) => {
    if (running < max) {
      running++
    } else {
      await new Promise((resolve) => waiting.push(resolve))
    }

    try {
      return await task()
    } finally {
      const next = waiting.shift()

      if (next) {
        next()
      } else {
        running--
      }
    }
  }
}
