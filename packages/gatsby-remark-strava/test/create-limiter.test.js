import {createRequire} from "node:module"

import {describe, expect, it} from "vitest"

const require = createRequire(import.meta.url)
const {createLimiter} = require("../utils/create-limiter.js")

describe("createLimiter", () => {
  it("runs no more than the maximum at once", async () => {
    const limit = createLimiter(2)
    let running = 0
    let peak = 0

    const task = async () => {
      running++
      peak = Math.max(peak, running)
      await new Promise((resolve) => setTimeout(resolve, 5))
      running--
    }

    await Promise.all(Array.from({length: 6}, () => limit(task)))

    expect(peak).toBe(2)
  })

  it("returns the result of the task", async () => {
    expect(await createLimiter(1)(async () => "done")).toBe("done")
  })

  it("frees its slot when the task fails", async () => {
    const limit = createLimiter(1)

    await expect(
      limit(async () => {
        throw new Error("failed")
      })
    ).rejects.toThrow("failed")
    expect(await limit(async () => "next")).toBe("next")
  })
})
