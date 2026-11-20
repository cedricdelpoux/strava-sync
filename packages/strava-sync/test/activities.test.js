import {expect, test} from "vitest"

import {getResumeDate, syncActivities} from "../lib/activities.js"
import {StravaError} from "../lib/errors.js"
import {createFakeClient, createMemoryStore} from "./helpers.js"

const listed = (...ids) => ids.map((id) => ({id: String(id)}))

const createPagedClient = (pages) =>
  createFakeClient({
    "athlete/activities": ({page}) => {
      const result = pages[page - 1]

      if (result instanceof Error) throw result

      return result || []
    },
  })

test("resumes from the cursor only when something is stored", () => {
  expect(getResumeDate({after: null, storedCount: 0, lastFetch: 5000})).toBe(
    null
  )
  expect(
    getResumeDate({after: null, storedCount: 2, lastFetch: 1750000000000})
  ).toBe(1750000000)
  expect(
    getResumeDate({after: 10, storedCount: 2, lastFetch: 1750000000000})
  ).toBe(10)
})

test("writes every page and advances the cursor after a complete walk", async () => {
  const store = createMemoryStore()
  const client = createPagedClient([listed(1, 2), listed(3)])

  const result = await syncActivities({client, store})

  expect(result.fetchedCount).toBe(3)
  expect([...store.activitiesById.keys()]).toEqual(["1", "2", "3"])
  expect((await store.readState()).lastFetch).toBeGreaterThan(0)
})

test("keeps the cursor still when a rate limit truncates the walk", async () => {
  const store = createMemoryStore([], {lastFetch: 111})
  const client = createPagedClient([
    listed(1),
    new StravaError("SHORT_LIMIT", "limit"),
  ])

  const result = await syncActivities({client, store})

  expect(result.isTruncated).toBe(true)
  expect(store.activitiesById.has("1")).toBe(true)
  expect(await store.readState()).toEqual({lastFetch: 111})
})

test("throws on a rate limit when asked to stop", async () => {
  const client = createPagedClient([new StravaError("LONG_LIMIT", "limit")])

  await expect(
    syncActivities({
      client,
      store: createMemoryStore(),
      stopOnRateLimit: true,
    })
  ).rejects.toMatchObject({code: "LONG_LIMIT"})
})

test("asks only for the activities after the cursor", async () => {
  const store = createMemoryStore(listed(1), {lastFetch: 1750000000000})
  const client = createPagedClient([[]])

  await syncActivities({client, store})

  expect(client.calls[0].query.after).toBe(1750000000)
})
