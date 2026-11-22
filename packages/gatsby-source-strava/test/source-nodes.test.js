import {mkdir, mkdtemp, readFile, rm, writeFile} from "node:fs/promises"
import {createRequire} from "node:module"
import {tmpdir} from "node:os"
import {join} from "node:path"

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"

const require = createRequire(import.meta.url)
const {sourceNodes} = require("../gatsby-node.js")

const OPTIONS = {
  stravaClientId: "id",
  stravaClientSecret: "secret",
  stravaToken: {
    access_token: "access",
    refresh_token: "refresh",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  },
}

const ACTIVITY = {
  id: 100,
  name: "Morning ride",
  coordinates: [[1.234567, 2.345678]],
  laps: [{id: 1, activity: {id: 100}}],
}
const ATHLETE = {id: 5, firstname: "Ada"}
const ROUTE = {id: 9, id_str: "9", name: "Loop", updated_at: 1}

let directory
let routes

const respond = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {"content-type": "application/json"},
  })

const stubStrava = (overrides = {}) => {
  routes = {
    "athlete/activities": (page) => (page === "1" ? [ACTIVITY] : []),
    athlete: () => ATHLETE,
    "athlete/routes": () => [ROUTE],
    ...overrides,
  }

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => {
      const {pathname, searchParams} = new URL(url)
      const route = routes[pathname.replace("/api/v3/", "")]

      if (!route) return respond({message: "Not found"}, 404)

      const body = route(searchParams.get("page"))

      return body instanceof Response ? body : respond(body)
    })
  )
}

const createApi = (overrides = {}) => ({
  actions: {createNode: vi.fn(), deleteNode: vi.fn()},
  createContentDigest: (value) => `digest-${value.id}`,
  reporter: {
    info: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    panic: vi.fn(),
  },
  cache: {get: vi.fn()},
  store: {getState: () => ({program: {directory, _: ["build"]}})},
  getNode: vi.fn(),
  ...overrides,
})

const getNodes = ({actions}, type) =>
  actions.createNode.mock.calls
    .map(([node]) => node)
    .filter((node) => node.internal.type === type)

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "gss-source-"))
  stubStrava()
})

afterEach(async () => {
  vi.unstubAllGlobals()
  await rm(directory, {recursive: true, force: true})
})

describe("sourceNodes options", () => {
  it.each(["stravaClientId", "stravaClientSecret", "stravaToken"])(
    "warns and stops when %s is missing",
    async (option) => {
      const api = createApi()

      await sourceNodes(api, {...OPTIONS, [option]: undefined})

      expect(api.reporter.warn).toHaveBeenCalledWith(
        `source-strava: Missing \`${option}\` option`
      )
      expect(api.actions.createNode).not.toHaveBeenCalled()
      expect(fetch).not.toHaveBeenCalled()
    }
  )

  it("warns when there are no options at all", async () => {
    const api = createApi()

    await sourceNodes(api)

    expect(api.reporter.warn).toHaveBeenCalledOnce()
  })

  it("panics on an invalid token", async () => {
    const api = createApi()

    await sourceNodes(api, {...OPTIONS, stravaToken: "{}"})

    expect(api.reporter.panic).toHaveBeenCalledWith(
      expect.stringContaining("Invalid token")
    )
  })

  it("passes the error to panic in debug mode", async () => {
    const api = createApi()

    await sourceNodes(api, {...OPTIONS, stravaToken: "{}", debug: true})

    expect(api.reporter.panic).toHaveBeenCalledWith(
      "source-strava: ",
      expect.any(Error)
    )
  })
})

describe("sourceNodes", () => {
  it("creates the activity and athlete nodes", async () => {
    const api = createApi()

    await sourceNodes(api, OPTIONS)

    const [activity] = getNodes(api, "StravaActivity")
    const [athlete] = getNodes(api, "StravaAthlete")

    expect(activity).toMatchObject({
      id: "100",
      name: "Morning ride",
      coordinates: [[1.23457, 2.34568]],
      laps: [{id: "1"}],
      internal: {type: "StravaActivity", contentDigest: "digest-100"},
    })
    expect(athlete).toMatchObject({id: "5", firstname: "Ada"})
    expect(api.reporter.success).toHaveBeenCalledWith(
      "source-strava: 1 new activities fetched"
    )
    expect(api.reporter.success).toHaveBeenCalledWith(
      "source-strava: athlete fetched"
    )
  })

  it("keeps the store in the folder of the site", async () => {
    await sourceNodes(createApi(), {...OPTIONS, storeDir: "custom"})

    const stored = await readFile(
      join(directory, "custom", "activities", "100.json"),
      "utf8"
    )

    expect(JSON.parse(stored).name).toBe("Morning ride")
  })

  it("lets the site extend the activities and the athlete", async () => {
    const api = createApi()

    await sourceNodes(api, {
      ...OPTIONS,
      activities: {
        extend: ({activity}) => {
          activity.extended = activity.id
        },
      },
      athlete: {
        extend: ({activities, athlete}) => {
          athlete.activityCount = activities.length
        },
      },
    })

    expect(getNodes(api, "StravaActivity")[0].extended).toBe("100")
    expect(getNodes(api, "StravaAthlete")[0].activityCount).toBe(1)
  })

  it("creates the routes and links them from the athlete", async () => {
    const api = createApi()

    await sourceNodes(api, {...OPTIONS, athlete: {withRoutes: true}})

    expect(getNodes(api, "StravaRoute")).toMatchObject([
      {id: "9", name: "Loop", internal: {type: "StravaRoute"}},
    ])
    expect(getNodes(api, "StravaAthlete")[0].routes).toEqual(["9"])
    expect(api.reporter.success).toHaveBeenCalledWith(
      "source-strava: 1 routes fetched"
    )
  })

  it("moves the activities of the Gatsby cache to the store", async () => {
    stubStrava({"athlete/activities": () => []})

    const cached = {id: 7, name: "Cached"}
    const entries = {activities: [7], 7: cached}
    const api = createApi({cache: {get: async (key) => entries[key]}})

    await sourceNodes(api, OPTIONS)

    expect(api.reporter.info).toHaveBeenCalledWith(
      expect.stringContaining("1 activities moved to")
    )
  })

  it("does not move the cache once the store holds activities", async () => {
    const activitiesDir = join(directory, ".strava", "activities")

    await mkdir(activitiesDir, {recursive: true})
    await writeFile(join(activitiesDir, "1.json"), JSON.stringify({id: 1}))

    const api = createApi()

    await sourceNodes(api, OPTIONS)

    expect(api.cache.get).not.toHaveBeenCalled()
  })

  it("uses the stored athlete when the fetch is rate limited", async () => {
    const api = createApi()

    await sourceNodes(api, OPTIONS)
    stubStrava({athlete: () => respond({message: "limit"}, 429)})
    api.actions.createNode.mockClear()

    await sourceNodes(api, OPTIONS)

    expect(api.reporter.warn).toHaveBeenCalledWith(
      "source-strava: Athlete not fetched, using cached version"
    )
    expect(getNodes(api, "StravaAthlete")).toHaveLength(1)
  })

  it("stops without an athlete when none is stored", async () => {
    stubStrava({athlete: () => respond({message: "limit"}, 429)})

    const api = createApi()

    await sourceNodes(api, OPTIONS)

    expect(api.reporter.warn).toHaveBeenCalledWith(
      "source-strava: Athlete not fetched"
    )
    expect(getNodes(api, "StravaAthlete")).toHaveLength(0)
  })

  it("panics on a rate limit when stopOnRateLimit is set", async () => {
    stubStrava({athlete: () => respond({message: "limit"}, 429)})

    const api = createApi()

    await sourceNodes(api, {...OPTIONS, stopOnRateLimit: true})

    expect(api.reporter.panic).toHaveBeenCalledOnce()
  })
})
