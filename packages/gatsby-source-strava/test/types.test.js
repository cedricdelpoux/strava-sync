import {createRequire} from "node:module"

import {describe, expect, it, vi} from "vitest"

const require = createRequire(import.meta.url)
const {createSchemaCustomization} = require("../gatsby-node.js")
const {types} = require("../utils/types.js")

describe("types", () => {
  it.each(["Athlete", "Activity", "Route"])(
    "declares the Strava%s node",
    (name) => {
      expect(types).toContain(`type Strava${name} implements Node {`)
    }
  )

  it("types the photo sizes with the prefix GraphQL accepts", () => {
    expect(types).toContain("_100: String")
    expect(types).toContain("_1800: String")
  })
})

describe("createSchemaCustomization", () => {
  it("creates the types", () => {
    const actions = {createTypes: vi.fn()}

    createSchemaCustomization({actions})

    expect(actions.createTypes).toHaveBeenCalledWith(types)
  })
})
