import {createRequire} from "node:module"

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"

const require = createRequire(import.meta.url)
const {onRouteUpdate} = require("../gatsby-browser.js")

const SCRIPT_URL = "https://strava-embeds.com/embed.js"

let hasPlaceholder
let loadedScripts
let head

beforeEach(() => {
  hasPlaceholder = true
  loadedScripts = []
  head = {appendChild: vi.fn((script) => loadedScripts.push(script))}

  vi.stubGlobal("window", {})
  vi.stubGlobal("document", {
    head,
    createElement: () => ({}),
    querySelector: (selector) => {
      if (selector === ".strava-embed-placeholder") {
        return hasPlaceholder ? {} : null
      }

      return loadedScripts.find((script) => selector.includes(script.src))
    },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("onRouteUpdate", () => {
  it("loads the embed script on a page with a placeholder", () => {
    onRouteUpdate()

    expect(loadedScripts).toEqual([{src: SCRIPT_URL, async: true}])
  })

  it("does nothing on a page without a placeholder", () => {
    hasPlaceholder = false

    onRouteUpdate()

    expect(head.appendChild).not.toHaveBeenCalled()
  })

  it("loads the script once", () => {
    onRouteUpdate()
    onRouteUpdate()

    expect(head.appendChild).toHaveBeenCalledTimes(1)
  })

  it("embeds the new placeholders once the script has loaded", () => {
    window.__STRAVA_EMBED_BOOTSTRAP__ = vi.fn()

    onRouteUpdate()

    expect(window.__STRAVA_EMBED_BOOTSTRAP__).toHaveBeenCalledTimes(1)
    expect(head.appendChild).not.toHaveBeenCalled()
  })
})
