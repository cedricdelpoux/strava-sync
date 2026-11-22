import {describe, expect, it} from "vitest"

import entry, {getDeclutterNodeId} from ".."

describe("getDeclutterNodeId", () => {
  it("derives the node id from the activity id", () => {
    expect(getDeclutterNodeId("12345")).toBe("declutter-12345")
  })
})

describe("package entry point", () => {
  it("calls the declutter functions of strava-declutter", () => {
    const coordinates = [
      [1.4, 43.6],
      [1.41, 43.6],
    ]

    expect(entry.simplify(coordinates)).toEqual(coordinates)
    expect(entry.getDeclutterNodeId("1")).toBe("declutter-1")
    expect(typeof entry.declutter).toBe("function")
  })
})
