import {expect, test} from "vitest"

import {
  getMissingDetails,
  isDeleteBraked,
  reconcileActivities,
} from "../lib/reconcile.js"
import {createFakeClient, createMemoryStore} from "./helpers.js"

const activity = (id) => ({id: String(id), start_date: "2026-01-02T10:00:00Z"})

const clientHolding = (...ids) =>
  createFakeClient({"athlete/activities": ids.map(activity)})

test("brakes past a tenth of the store", () => {
  expect(isDeleteBraked({deletedCount: 1, comparedCount: 10})).toBe(false)
  expect(isDeleteBraked({deletedCount: 2, comparedCount: 10})).toBe(true)
  expect(isDeleteBraked({deletedCount: 0, comparedCount: 0})).toBe(false)
})

test("changes nothing without write", async () => {
  const store = createMemoryStore([activity(1), activity(2)])

  const report = await reconcileActivities({client: clientHolding(2, 3), store})

  expect(report.deleted.map(({id}) => id)).toEqual(["1"])
  expect(report.missing.map(({id}) => id)).toEqual(["3"])
  expect([...store.activitiesById.keys()]).toEqual(["1", "2"])
})

test("refuses to delete past the brake, and prints what it found", async () => {
  const store = createMemoryStore([activity(1), activity(2)])

  await expect(
    reconcileActivities({client: clientHolding(2), store, write: true})
  ).rejects.toMatchObject({
    message: expect.stringContaining("Nothing written"),
    report: {deleted: [expect.objectContaining({id: "1"})]},
  })
  expect(store.activitiesById.has("1")).toBe(true)
})

test("deletes past the brake with force, and adds the missing ones", async () => {
  const store = createMemoryStore([activity(1), activity(2)])

  await reconcileActivities({
    client: clientHolding(2, 3),
    store,
    write: true,
    force: true,
  })

  expect([...store.activitiesById.keys()].sort()).toEqual(["2", "3"])
})

test("fills the details a stored activity lacks, and nothing else", async () => {
  const store = createMemoryStore([{...activity(1), laps: []}])
  const client = createFakeClient({
    "athlete/activities": [activity(1)],
    "activities/:id/zones": [{type: "heartrate"}],
  })

  await reconcileActivities({
    client,
    store,
    write: true,
    requiredDetails: {withLaps: true, withZones: true},
  })

  expect((await store.readActivity(1)).zones).toEqual([{type: "heartrate"}])
  expect(client.calls.map(({path}) => path)).toEqual([
    "athlete/activities",
    "activities/1/zones",
  ])
})

test("counts a stream type asked for as there, even stored as null", () => {
  const stored = {id: "1", streams: {latlng: null}}
  const required = {withStreams: true, streamsTypes: ["latlng", "time"]}

  expect(getMissingDetails(stored, required)).toEqual({
    withStreams: true,
    streamsTypes: ["time"],
  })
  expect(
    getMissingDetails(stored, {...required, streamsTypes: ["latlng"]})
  ).toBe(null)
})

test("leaves out of the comparison what is outside the window", async () => {
  const old = {id: "9", start_date: "2020-01-01T00:00:00Z"}
  const store = createMemoryStore([old, activity(1)])

  const report = await reconcileActivities({
    client: clientHolding(1),
    store,
    after: Date.parse("2025-01-01") / 1000,
  })

  expect(report.deleted).toEqual([])
})
