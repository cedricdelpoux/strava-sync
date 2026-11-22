import {createRequire} from "node:module"

import {describe, expect, it} from "vitest"

const require = createRequire(import.meta.url)
const {parseEmbedLink} = require("../utils/parse-embed-link.js")

const createLink = (url, text = "my activity embed") => ({
  type: "link",
  url,
  children: [{type: "text", value: text}],
})

describe("parseEmbedLink", () => {
  it("reads an activity link", () => {
    expect(
      parseEmbedLink(createLink("https://www.strava.com/activities/123"))
    ).toEqual({type: "activity", id: "123"})
  })

  it("reads a route link", () => {
    expect(
      parseEmbedLink(createLink("https://www.strava.com/routes/456"))
    ).toEqual({type: "route", id: "456"})
  })

  it("accepts a trailing slash, a query and a host without www", () => {
    expect(
      parseEmbedLink(createLink("https://strava.com/activities/123/?a=1#b"))
    ).toEqual({type: "activity", id: "123"})
  })

  it("matches the text whatever its case", () => {
    expect(
      parseEmbedLink(createLink("https://www.strava.com/activities/1", "EMBED"))
    ).not.toBeNull()
  })

  it.each([
    ["a text without embed", "https://www.strava.com/activities/1", "ride"],
    ["another host", "https://example.com/activities/1", "embed"],
    ["a look-alike host", "https://notstrava.com/activities/1", "embed"],
    ["http", "http://www.strava.com/activities/1", "embed"],
    ["a non numeric id", "https://www.strava.com/activities/abc", "embed"],
    ["a sub page", "https://www.strava.com/activities/1/overview", "embed"],
    ["a segment", "https://www.strava.com/segments/1", "embed"],
    ["an invalid url", "not a url", "embed"],
  ])("ignores %s", (_, url, text) => {
    expect(parseEmbedLink(createLink(url, text))).toBeNull()
  })

  it("ignores a node that is not a link", () => {
    expect(
      parseEmbedLink({
        ...createLink("https://www.strava.com/activities/1"),
        type: "linkReference",
      })
    ).toBeNull()
  })

  it("ignores a link with a formatted text", () => {
    expect(
      parseEmbedLink({
        type: "link",
        url: "https://www.strava.com/activities/1",
        children: [{type: "emphasis", children: []}],
      })
    ).toBeNull()
  })

  it("ignores a link with several children", () => {
    const link = createLink("https://www.strava.com/activities/1")

    link.children.push({type: "text", value: "embed"})

    expect(parseEmbedLink(link)).toBeNull()
  })
})
