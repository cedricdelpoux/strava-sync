import {createRequire} from "node:module"

import {describe, expect, it} from "vitest"

import {renderActivityImage as renderImage} from "../images"
import {lngToX} from "../utils/map"
import {pointsToTiles} from "../utils/tiles"

// The adapter loads strava-tiles with `require()`, so the functions are compared
// with the ones `require()` returns, since vitest would import another copy of
// the ES module and hide the non-enumerable ones of the entry point
const require = createRequire(import.meta.url)
const entry = require("..")
const core = require("strava-tiles")
const {renderActivityImage} = require("strava-tiles/images")

const LOGGERS = ["consoleLogger", "silentLogger"]

describe("package entry point", () => {
  it("exports what strava-tiles exports, but its loggers", () => {
    const names = Object.keys(core).filter((name) => !LOGGERS.includes(name))

    expect(Object.keys(entry).sort()).toEqual(
      names.filter((name) => name !== "Z").sort()
    )
    expect(names).toContain("Z")
  })

  it("calls the functions of strava-tiles", () => {
    expect(entry.Z).toBe(core.Z)
    expect(entry.tileToCoords({x: 1, y: 2})).toEqual(
      core.tileToCoords({x: 1, y: 2})
    )
  })

  it("keeps the utils and images entry points", () => {
    expect(lngToX).toBe(core.lngToX)
    expect(pointsToTiles).toBe(core.pointsToTiles)
    expect(renderImage).toBe(renderActivityImage)
  })
})
