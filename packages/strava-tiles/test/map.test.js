import {describe, expect, it} from "vitest"

import {
  cellsAlongLine,
  distanceInMeters,
  latToY,
  lngToX,
  xToLng,
  yToLat,
} from "../lib/map.js"
import {getMaxColumn, getMaxRow, getSquare, tileToCoords} from "../lib/tiles.js"

describe("map helpers", () => {
  it("converts coordinates to tiles and back", () => {
    const x = lngToX(1.4)
    const y = latToY(43.6)

    expect(xToLng(x)).toBeLessThanOrEqual(1.4)
    expect(xToLng(x + 1)).toBeGreaterThan(1.4)
    expect(yToLat(y)).toBeGreaterThanOrEqual(43.6)
    expect(yToLat(y + 1)).toBeLessThan(43.6)
  })

  it("measures a distance in meters", () => {
    expect(distanceInMeters([0, 0], [0, 0])).toBe(0)
    expect(distanceInMeters([0, 0], [0, 1])).toBeCloseTo(111195, -2)
  })

  it("lists the cells along a line in every direction", () => {
    expect(cellsAlongLine(0.5, 0.5, 0.5, 0.5)).toEqual([{x: 0, y: 0}])
    expect(cellsAlongLine(2.5, 0.5, 0.5, 0.5)).toEqual([
      {x: 2, y: 0},
      {x: 1, y: 0},
      {x: 0, y: 0},
    ])
    expect(cellsAlongLine(0.5, 2.5, 0.5, 0.5)).toHaveLength(3)
  })

  it("steps through a corner in one move", () => {
    expect(cellsAlongLine(0.5, 0.5, 1.5, 1.5)).toEqual([
      {x: 0, y: 0},
      {x: 1, y: 1},
    ])
  })
})

describe("tileToCoords", () => {
  it("returns the closed ring of a tile, a square or a rectangle", () => {
    const [first, , , , last] = tileToCoords({x: 8000, y: 5900})

    expect(first).toEqual(last)
    expect(tileToCoords({x: 8000, y: 5900, size: 2})[0][0]).toBe(xToLng(8002))

    const rectangle = tileToCoords({x: 8000, y: 5900, width: 3, height: 1})

    expect(rectangle[0][0]).toBe(xToLng(8003))
    expect(rectangle[0][1]).toBe(yToLat(5901))
  })
})

describe("without tiles", () => {
  it("has an empty square, row and column", () => {
    expect(getSquare([]).tiles).toEqual([])
    expect(getMaxRow([]).tiles).toEqual([])
    expect(getMaxColumn([]).tiles).toEqual([])
  })
})
