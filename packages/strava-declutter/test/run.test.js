import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import {describe, expect, it, vi} from "vitest"

import {declutterActivities} from "../lib/run.js"
import {createDeclutterStore} from "../lib/store.js"

const line = (id, startDate, fromLng, toLng) => ({
  id,
  start_date: startDate,
  coordinates: [
    [fromLng, 43.6],
    [toLng, 43.6],
  ],
})

const walk = line("walk", "2024-01-10T08:00:00Z", 1.4, 1.41)
const ride = line("ride", "2024-03-05T08:00:00Z", 1.37, 1.5)
const point = {
  id: "point",
  start_date: "2024-01-01T00:00:00Z",
  coordinates: [[1, 1]],
}

const createTemporaryStore = () =>
  createDeclutterStore({
    dir: path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), "strava-declutter-")),
      "cache"
    ),
  })

describe("declutterActivities", () => {
  it("ignores the activities without a track or out of the filter", async () => {
    const {results} = await declutterActivities({
      activities: [walk, ride, point],
      filter: ({id}) => id !== "ride",
    })

    expect([...results.keys()]).toEqual(["walk"])
  })

  it("counts and logs what it did", async () => {
    const logger = {info: vi.fn(), warn: vi.fn(), error: vi.fn()}
    const counts = await declutterActivities({activities: [walk, ride], logger})

    expect(counts.shownCount + counts.hiddenCount).toBe(2)
    expect(counts.declutteredCount).toBe(2)
    expect(logger.info).toHaveBeenCalledOnce()
  })

  it("reuses the store on the next run", async () => {
    const store = createTemporaryStore()
    const options = {activities: [walk, ride], store}
    const first = await declutterActivities(options)
    const second = await declutterActivities(options)

    expect(second.declutteredCount).toBe(0)
    expect(second.results).toEqual(first.results)
  })

  it("declutters again when the zooms change", async () => {
    const store = createTemporaryStore()

    await declutterActivities({activities: [walk, ride], store})

    const {declutteredCount} = await declutterActivities({
      activities: [walk, ride],
      store,
      minZoom: 8,
    })

    expect(declutteredCount).toBe(2)
  })
})
