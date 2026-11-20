import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import {afterEach, beforeEach, expect, test} from "vitest"

import {createFileStore} from "../lib/store.js"

let dir

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "strava-sync-"))
})

afterEach(() => fs.rm(dir, {recursive: true, force: true}))

test("keeps the layout of the Gatsby plugin store", async () => {
  const store = createFileStore({dir})

  await store.writeActivity({id: "1", name: "Ride"})
  await store.writeState({lastFetch: 1})
  await store.writeAthlete({id: "2"})
  await store.writeRoutes([{id: "3"}])
  await store.writeRouteStream("3", {updated_at: 1, latlng: []})

  expect((await fs.readdir(dir)).sort()).toEqual([
    "activities",
    "athlete.json",
    "route-streams",
    "routes.json",
    "state.json",
  ])
  expect(await fs.readdir(path.join(dir, "activities"))).toEqual(["1.json"])
  expect(await store.readActivities()).toEqual([{id: "1", name: "Ride"}])
  expect(await store.readRouteStream("3")).toEqual({updated_at: 1, latlng: []})
})

test("reads what is missing as empty, and deletes quietly", async () => {
  const store = createFileStore({dir})

  expect(await store.readActivities()).toEqual([])
  expect(await store.readActivity("1")).toBeNull()
  expect(await store.readState()).toEqual({})
  await expect(store.deleteActivity("1")).resolves.toBeUndefined()
})

test("names the file when its JSON is broken", async () => {
  const store = createFileStore({dir})

  await fs.mkdir(path.join(dir, "activities"))
  await fs.writeFile(path.join(dir, "activities", "1.json"), "{")

  await expect(store.readActivity("1")).rejects.toThrow("not valid JSON")
})
