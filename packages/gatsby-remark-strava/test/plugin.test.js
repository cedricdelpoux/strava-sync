import fs from "node:fs/promises"
import {createRequire} from "node:module"
import os from "node:os"
import path from "node:path"

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"

const require = createRequire(import.meta.url)
const remarkStrava = require("../index.js")

const ACTIVITY_URL = "https://www.strava.com/activities/123"
const ROUTE_URL = "https://www.strava.com/routes/456"
const TOKEN = JSON.stringify({
  access_token: "access",
  refresh_token: "refresh",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
})

const createLinkParagraph = (url, text = "ride embed") => ({
  type: "paragraph",
  children: [{type: "link", url, children: [{type: "text", value: text}]}],
})

const createTree = (...paragraphs) => ({type: "root", children: paragraphs})

const createCache = () => {
  const entries = new Map()

  return {
    get: vi.fn(async (key) => entries.get(key)),
    set: vi.fn(async (key, value) => entries.set(key, value)),
  }
}

const createReporter = () => ({warn: vi.fn(), success: vi.fn()})

const run = async (tree, options, {cache = createCache()} = {}) => {
  const reporter = createReporter()

  await remarkStrava({markdownAST: tree, cache, reporter}, options)

  return {reporter, cache}
}

const createStoreDir = async (...activities) => {
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), "remark-strava-"))

  await fs.mkdir(path.join(storeDir, "activities"))
  await Promise.all(
    activities.map((activity) =>
      fs.writeFile(
        path.join(storeDir, "activities", `${activity.id}.json`),
        JSON.stringify(activity)
      )
    )
  )

  return storeDir
}

const renderName = (activity) => `<div class="activity">${activity.name}</div>`

const stubFetch = (activities) => {
  const fetch = vi.fn(async (url) => {
    const id = String(url).match(/activities\/(\d+)/)?.[1]
    const activity = activities[id]

    return {
      ok: Boolean(activity),
      status: activity ? 200 : 404,
      statusText: "Not Found",
      headers: new Headers(),
      text: async () =>
        JSON.stringify(activity || {message: "Record Not Found"}),
    }
  })

  vi.stubGlobal("fetch", fetch)

  return fetch
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("embed mode", () => {
  it("replaces an activity link with the official placeholder", async () => {
    const tree = createTree(createLinkParagraph(ACTIVITY_URL))

    await run(tree, {})

    expect(tree.children).toEqual([
      {
        type: "html",
        value:
          '<div class="strava-embed-placeholder" data-embed-type="activity" data-embed-id="123"></div>',
      },
    ])
  })

  it("replaces a route link with the official placeholder", async () => {
    const tree = createTree(createLinkParagraph(ROUTE_URL))

    await run(tree, {})

    expect(tree.children[0].value).toBe(
      '<div class="strava-embed-placeholder" data-embed-type="route" data-embed-id="456"></div>'
    )
  })

  it("emits a JSX element with the mdx output", async () => {
    const tree = createTree(createLinkParagraph(ACTIVITY_URL))

    await run(tree, {output: "mdx"})

    const [node] = tree.children

    expect(node.type).toBe("mdxJsxFlowElement")
    expect(node.name).toBe("div")
    expect(node.position).toBeUndefined()
    expect(node.attributes.map(({name, value}) => [name, value])).toEqual([
      ["className", "strava-embed-placeholder"],
      ["data-embed-type", "activity"],
      ["data-embed-id", "123"],
    ])
  })

  it("leaves the other paragraphs alone", async () => {
    const text = {
      type: "paragraph",
      children: [{type: "text", value: "hello"}],
    }
    const plainLink = createLinkParagraph(ACTIVITY_URL, "my ride")
    const twoChildren = createLinkParagraph(ACTIVITY_URL)

    twoChildren.children.push({type: "text", value: " and more"})

    const tree = createTree(text, plainLink, twoChildren)
    const before = structuredClone(tree)

    await run(tree, {})

    expect(tree).toEqual(before)
  })

  it("embeds every link of a document", async () => {
    const tree = createTree(
      createLinkParagraph(ACTIVITY_URL),
      createLinkParagraph(ROUTE_URL)
    )

    await run(tree, {})

    expect(tree.children.map(({type}) => type)).toEqual(["html", "html"])
  })

  it("does not read the store nor call Strava", async () => {
    const fetch = vi.fn()

    vi.stubGlobal("fetch", fetch)
    await run(createTree(createLinkParagraph(ACTIVITY_URL)), {})

    expect(fetch).not.toHaveBeenCalled()
  })

  it("reports every embed that succeeds with the debug option", async () => {
    const {reporter} = await run(
      createTree(createLinkParagraph(ACTIVITY_URL)),
      {debug: true}
    )

    expect(reporter.success).toHaveBeenCalledWith(
      `remark-strava: EMBED OK ${ACTIVITY_URL}`
    )
  })

  it("warns about an invalid output", async () => {
    const tree = createTree(createLinkParagraph(ACTIVITY_URL))
    const before = structuredClone(tree)
    const {reporter} = await run(tree, {output: "pdf"})

    expect(reporter.warn).toHaveBeenCalledWith(
      'remark-strava: Invalid `output` option "pdf", expected one of: html, mdx'
    )
    expect(tree).toEqual(before)
  })

  it("warns about a render option that is not a function", async () => {
    const {reporter} = await run(
      createTree(createLinkParagraph(ACTIVITY_URL)),
      {render: "<div />"}
    )

    expect(reporter.warn).toHaveBeenCalledWith(
      "remark-strava: The `render` option must be a function"
    )
  })
})

describe("render mode", () => {
  let storeDir

  beforeEach(async () => {
    storeDir = await createStoreDir({
      id: 123,
      name: "Morning ride",
      resource_state: 3,
    })
  })

  afterEach(async () => {
    await fs.rm(storeDir, {recursive: true, force: true})
  })

  it("renders the activity of the store", async () => {
    const fetch = vi.fn()
    const tree = createTree(createLinkParagraph(ACTIVITY_URL))

    vi.stubGlobal("fetch", fetch)
    await run(tree, {render: renderName, storeDir})

    expect(tree.children).toEqual([
      {type: "html", value: '<div class="activity">Morning ride</div>'},
    ])
    expect(fetch).not.toHaveBeenCalled()
  })

  it("renders a JSX element with the mdx output", async () => {
    const tree = createTree(createLinkParagraph(ACTIVITY_URL))

    await run(tree, {
      render: ({id, name}) => `
        <strava
          id="${id}"
          name="${name}"
        />
      `,
      output: "mdx",
      storeDir,
    })

    const [node] = tree.children

    expect(node.type).toBe("mdxJsxFlowElement")
    expect(node.name).toBe("strava")
    expect(node.attributes.map(({name, value}) => [name, value])).toEqual([
      ["id", "123"],
      ["name", "Morning ride"],
    ])
  })

  it("keeps embedding a route with the official placeholder", async () => {
    const tree = createTree(createLinkParagraph(ROUTE_URL))

    await run(tree, {render: renderName, storeDir})

    expect(tree.children[0].value).toContain('data-embed-type="route"')
  })

  it("fetches an activity missing from the store", async () => {
    const fetch = stubFetch({789: {id: 789, name: "Evening run"}})
    const tree = createTree(
      createLinkParagraph("https://www.strava.com/activities/789")
    )

    await run(tree, {
      render: renderName,
      storeDir,
      stravaClientId: "1",
      stravaClientSecret: "secret",
      stravaToken: TOKEN,
    })

    expect(tree.children[0].value).toBe(
      '<div class="activity">Evening run</div>'
    )
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("keeps a fetched activity in the Gatsby cache", async () => {
    const fetch = stubFetch({789: {id: 789, name: "Evening run"}})
    const cache = createCache()
    const options = {
      render: renderName,
      storeDir,
      stravaClientId: "1",
      stravaClientSecret: "secret",
      stravaToken: TOKEN,
    }
    const link = "https://www.strava.com/activities/789"

    await run(createTree(createLinkParagraph(link)), options, {cache})
    await run(createTree(createLinkParagraph(link)), options, {cache})

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(cache.set).toHaveBeenCalledWith("activity:789", {
      id: 789,
      name: "Evening run",
    })
  })

  it("fetches no more than 4 activities at once", async () => {
    let running = 0
    let peak = 0

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        const id = Number(String(url).match(/activities\/(\d+)/)[1])

        running++
        peak = Math.max(peak, running)
        await new Promise((resolve) => setTimeout(resolve, 5))
        running--

        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          text: async () => JSON.stringify({id, name: `Ride ${id}`}),
        }
      })
    )

    const tree = createTree(
      ...Array.from({length: 10}, (_, index) =>
        createLinkParagraph(`https://www.strava.com/activities/${900 + index}`)
      )
    )

    await run(tree, {
      render: renderName,
      storeDir,
      stravaClientId: "1",
      stravaClientSecret: "secret",
      stravaToken: TOKEN,
    })

    expect(tree.children.every(({type}) => type === "html")).toBe(true)
    expect(peak).toBe(4)
  })

  it("warns when the activity is missing and there is no token", async () => {
    const tree = createTree(
      createLinkParagraph("https://www.strava.com/activities/789")
    )
    const before = structuredClone(tree)
    const {reporter} = await run(tree, {render: renderName, storeDir})

    expect(reporter.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "remark-strava: EMBED NOK https://www.strava.com/activities/789: Activity 789 is not in the store"
      )
    )
    expect(tree).toEqual(before)
  })

  it("warns when Strava refuses the request", async () => {
    stubFetch({})
    const tree = createTree(
      createLinkParagraph("https://www.strava.com/activities/789")
    )
    const before = structuredClone(tree)
    const {reporter, cache} = await run(tree, {
      render: renderName,
      storeDir,
      stravaClientId: "1",
      stravaClientSecret: "secret",
      stravaToken: TOKEN,
    })

    expect(reporter.warn).toHaveBeenCalledWith(
      expect.stringContaining("Record Not Found")
    )
    expect(cache.set).not.toHaveBeenCalled()
    expect(tree).toEqual(before)
  })

  it("warns when the render markup is not a single JSX element", async () => {
    const tree = createTree(createLinkParagraph(ACTIVITY_URL))
    const {reporter} = await run(tree, {
      render: () => "just text",
      output: "mdx",
      storeDir,
    })

    expect(reporter.warn).toHaveBeenCalledWith(
      `remark-strava: EMBED NOK ${ACTIVITY_URL}: The markup is not a single JSX element`
    )
    expect(tree.children[0].type).toBe("paragraph")
  })

  it("warns when the render function throws", async () => {
    const {reporter} = await run(
      createTree(createLinkParagraph(ACTIVITY_URL)),
      {
        render: () => {
          throw new Error("broken")
        },
        storeDir,
      }
    )

    expect(reporter.warn).toHaveBeenCalledWith(
      `remark-strava: EMBED NOK ${ACTIVITY_URL}: broken`
    )
  })

  it("keeps the other embeds when one fails", async () => {
    const tree = createTree(
      createLinkParagraph("https://www.strava.com/activities/789"),
      createLinkParagraph(ACTIVITY_URL)
    )

    await run(tree, {render: renderName, storeDir})

    expect(tree.children.map(({type}) => type)).toEqual(["paragraph", "html"])
  })
})

describe("render mode with a summary in the store", () => {
  const tokenOptions = {
    stravaClientId: "1",
    stravaClientSecret: "secret",
    stravaToken: TOKEN,
  }
  const renderPhoto = ({name, photos}) =>
    `<div class="activity">${name} ${photos?.primary?.urls["600"]}</div>`
  const detail = {
    id: 123,
    name: "Detailed ride",
    resource_state: 3,
    photos: {primary: {urls: {600: "photo.jpg"}}},
  }
  let storeDir

  afterEach(async () => {
    await fs.rm(storeDir, {recursive: true, force: true})
  })

  it("fetches the details of a summary", async () => {
    storeDir = await createStoreDir({id: 123, name: "Ride", resource_state: 2})
    const fetch = stubFetch({123: detail})
    const tree = createTree(createLinkParagraph(ACTIVITY_URL))

    await run(tree, {render: renderPhoto, storeDir, ...tokenOptions})

    expect(tree.children[0].value).toBe(
      '<div class="activity">Detailed ride photo.jpg</div>'
    )
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("does not fetch a detailed activity again on the next build", async () => {
    storeDir = await createStoreDir({id: 123, name: "Ride", resource_state: 2})
    const fetch = stubFetch({123: detail})
    const cache = createCache()
    const options = {render: renderPhoto, storeDir, ...tokenOptions}

    await run(createTree(createLinkParagraph(ACTIVITY_URL)), options, {cache})
    await run(createTree(createLinkParagraph(ACTIVITY_URL)), options, {cache})

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("gives the photos in the shape of the API", async () => {
    storeDir = await createStoreDir({
      ...detail,
      photos: [{unique_id: "a"}],
      photos_summary: {primary: {urls: {600: "summary.jpg"}}},
    })
    const tree = createTree(createLinkParagraph(ACTIVITY_URL))

    await run(tree, {render: renderPhoto, storeDir})

    expect(tree.children[0].value).toContain("summary.jpg")
  })

  it("renders the summary and warns once without a token", async () => {
    storeDir = await createStoreDir(
      {id: 123, name: "Ride", resource_state: 2},
      {id: 124, name: "Other ride", resource_state: 2}
    )
    const reporter = createReporter()
    const tree = createTree(
      createLinkParagraph(ACTIVITY_URL),
      createLinkParagraph("https://www.strava.com/activities/124")
    )

    await remarkStrava(
      {markdownAST: tree, cache: createCache(), reporter},
      {render: renderName, storeDir}
    )

    expect(tree.children.map(({value}) => value)).toEqual([
      '<div class="activity">Ride</div>',
      '<div class="activity">Other ride</div>',
    ])
    expect(reporter.warn).toHaveBeenCalledTimes(1)
    expect(reporter.warn).toHaveBeenCalledWith(
      expect.stringContaining("add the `stravaClientId`")
    )
  })
})
