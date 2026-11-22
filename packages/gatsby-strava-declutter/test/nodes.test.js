const assert = require("node:assert/strict")
const {describe, it} = require("node:test")

const {getDeclutterNodeId} = require("..")

describe("getDeclutterNodeId", () => {
  it("derives the node id from the activity id", () => {
    assert.equal(getDeclutterNodeId("12345"), "declutter-12345")
  })
})

describe("package entry point", () => {
  it("calls the declutter functions of strava-declutter", () => {
    const entry = require("..")
    const coordinates = [
      [1.4, 43.6],
      [1.41, 43.6],
    ]

    assert.deepEqual(entry.simplify(coordinates), coordinates)
    assert.equal(entry.getDeclutterNodeId("1"), "declutter-1")
    assert.equal(typeof entry.declutter, "function")
  })
})
