const assert = require("node:assert/strict")
const {describe, it} = require("node:test")

const {checkPlugins} = require("../utils/plugins")

const plugin = (name) => ({name})

describe("checkPlugins", () => {
  it("accepts gatsby-source-strava before", () => {
    const errors = checkPlugins([
      plugin("gatsby-source-strava"),
      plugin("gatsby-strava-declutter"),
    ])

    assert.deepEqual(errors, [])
  })

  it("rejects gatsby-source-strava declared after it", () => {
    const errors = checkPlugins([
      plugin("gatsby-strava-declutter"),
      plugin("gatsby-source-strava"),
    ])

    assert.deepEqual(errors, [
      "gatsby-source-strava must come before gatsby-strava-declutter in gatsby-config.js",
    ])
  })

  it("rejects a missing gatsby-source-strava", () => {
    const errors = checkPlugins([plugin("gatsby-strava-declutter")])

    assert.match(errors.join(), /gatsby-source-strava is missing/)
  })
})
