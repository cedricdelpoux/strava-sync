const assert = require("node:assert/strict")
const {describe, it} = require("node:test")

const core = require("strava-tiles")

const LOGGERS = ["consoleLogger", "silentLogger"]

describe("package entry point", () => {
  it("exports what strava-tiles exports, but its loggers", () => {
    const names = Object.keys(core).filter((name) => !LOGGERS.includes(name))

    assert.deepEqual(Object.keys(require("..")).sort(), [
      ...names.filter((name) => name !== "Z").sort(),
    ])
    assert.ok(names.includes("Z"))
  })

  it("calls the functions of strava-tiles", () => {
    const entry = require("..")

    assert.equal(entry.Z, core.Z)
    assert.deepEqual(
      entry.tileToCoords({x: 1, y: 2}),
      core.tileToCoords({x: 1, y: 2})
    )
  })

  it("keeps the utils and images entry points", () => {
    assert.equal(require("../utils/map").lngToX, core.lngToX)
    assert.equal(require("../utils/tiles").pointsToTiles, core.pointsToTiles)
    assert.equal(
      require("../images").renderActivityImage,
      require("strava-tiles/images").renderActivityImage
    )
  })
})
