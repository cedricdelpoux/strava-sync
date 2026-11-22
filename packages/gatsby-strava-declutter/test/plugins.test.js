import {describe, expect, it} from "vitest"

import {checkPlugins} from "../utils/plugins"

const plugin = (name) => ({name})

describe("checkPlugins", () => {
  it("accepts gatsby-source-strava before", () => {
    const errors = checkPlugins([
      plugin("gatsby-source-strava"),
      plugin("gatsby-strava-declutter"),
    ])

    expect(errors).toEqual([])
  })

  it("rejects gatsby-source-strava declared after it", () => {
    const errors = checkPlugins([
      plugin("gatsby-strava-declutter"),
      plugin("gatsby-source-strava"),
    ])

    expect(errors).toEqual([
      "gatsby-source-strava must come before gatsby-strava-declutter in gatsby-config.js",
    ])
  })

  it("rejects a missing gatsby-source-strava", () => {
    const errors = checkPlugins([plugin("gatsby-strava-declutter")])

    expect(errors.join()).toMatch(/gatsby-source-strava is missing/)
  })
})
