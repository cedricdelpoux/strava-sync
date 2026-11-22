import {describe, expect, it} from "vitest"

import * as entry from "../index.js"
import * as map from "../map.js"
import * as tiles from "../tiles.js"

describe("entry points", () => {
  it("exports the tiles of an activity and the map and tile helpers", () => {
    ;[
      "computeTiles",
      "getActivityTiles",
      "pointsToTiles",
      "getTileActivities",
      "tileToCoords",
      "tilesToOutline",
      "lngToX",
      "latToY",
      "xToLng",
      "yToLat",
      "distanceInMeters",
      "Z",
    ].forEach((name) => expect(name in entry, name).toBe(true))
  })

  it("exposes the map and tile helpers alone for the browser", () => {
    expect(Object.keys(map)).toContain("lngToX")
    expect(Object.keys(tiles)).toContain("pointsToTiles")
    expect(Object.keys(tiles)).not.toContain("lngToX")
  })
})
