import {createRequire} from "node:module"

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"

const require = createRequire(import.meta.url)

const handlers = {}
const watcher = {
  on: (event, handler) => {
    handlers[event] = handler

    return watcher
  },
}
const chokidar = {watch: vi.fn(() => watcher)}

require.cache[require.resolve("chokidar")] = {
  id: require.resolve("chokidar"),
  filename: require.resolve("chokidar"),
  loaded: true,
  exports: chokidar,
}

const {watchStore} = require("../utils/watch.js")

const watch = (overrides = {}) => {
  const options = {
    store: {dir: "/store", readActivities: vi.fn(async () => [1, 2])},
    actions: {deleteNode: vi.fn()},
    createActivityNode: vi.fn(),
    getNode: vi.fn(),
    reporter: {info: vi.fn()},
    ...overrides,
  }

  watchStore(options)

  return options
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("watchStore", () => {
  it("watches the activities of the store", () => {
    const {reporter} = watch()

    expect(chokidar.watch).toHaveBeenCalledWith("/store/activities/*.json", {
      ignoreInitial: true,
    })
    expect(reporter.info).toHaveBeenCalledWith(
      expect.stringContaining("watching")
    )
  })

  it("replays the activities once after a burst of changes", async () => {
    const {createActivityNode, reporter} = watch()

    handlers.add()
    handlers.change()
    handlers.change()
    await vi.advanceTimersByTimeAsync(300)

    expect(createActivityNode).toHaveBeenCalledTimes(2)
    expect(reporter.info).toHaveBeenCalledWith(
      "source-strava: 2 activities replayed"
    )
  })

  it("deletes the node of an activity removed from the store", () => {
    const node = {id: "7"}
    const {actions, getNode} = watch({getNode: vi.fn(() => node)})

    handlers.unlink("/store/activities/7.json")

    expect(getNode).toHaveBeenCalledWith("7")
    expect(actions.deleteNode).toHaveBeenCalledWith(node)
  })

  it("ignores a removed file without a node", () => {
    const {actions} = watch()

    handlers.unlink("/store/activities/8.json")

    expect(actions.deleteNode).not.toHaveBeenCalled()
  })
})
