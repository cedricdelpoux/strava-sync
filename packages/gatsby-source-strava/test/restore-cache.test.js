import {createRequire} from "node:module"

import {describe, expect, it, vi} from "vitest"

const require = createRequire(import.meta.url)
const {restoreFromGatsbyCache} = require("../utils/restore-cache.js")

const createCache = (entries) => ({get: vi.fn(async (key) => entries[key])})
const createStore = () => ({
  writeActivity: vi.fn(),
  writeState: vi.fn(),
})

describe("restoreFromGatsbyCache", () => {
  it("moves the cached activities to the store with the last fetch", async () => {
    const store = createStore()
    const cache = createCache({
      activities: [1, 2],
      1: {id: 1},
      2: {id: 2},
      "last-fetch": 1700000000000,
    })

    expect(await restoreFromGatsbyCache({cache, store})).toBe(2)
    expect(store.writeActivity).toHaveBeenCalledWith({id: 1})
    expect(store.writeActivity).toHaveBeenCalledWith({id: 2})
    expect(store.writeState).toHaveBeenCalledWith({lastFetch: 1700000000000})
  })

  it("skips the activities missing from the cache", async () => {
    const store = createStore()
    const cache = createCache({activities: [1, 2], 2: {id: 2}})

    expect(await restoreFromGatsbyCache({cache, store})).toBe(1)
    expect(store.writeActivity).toHaveBeenCalledTimes(1)
    expect(store.writeState).not.toHaveBeenCalled()
  })

  it("does nothing on an empty cache", async () => {
    const store = createStore()

    expect(await restoreFromGatsbyCache({cache: createCache({}), store})).toBe(
      0
    )
    expect(store.writeActivity).not.toHaveBeenCalled()
    expect(store.writeState).not.toHaveBeenCalled()
  })
})
