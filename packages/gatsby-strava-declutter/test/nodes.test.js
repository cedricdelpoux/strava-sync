const assert = require("node:assert/strict")
const {describe, it} = require("node:test")

const {getDeclutterNodeId} = require("..")

describe("getDeclutterNodeId", () => {
  it("derives the node id from the activity id", () => {
    assert.equal(getDeclutterNodeId("12345"), "declutter-12345")
  })
})
