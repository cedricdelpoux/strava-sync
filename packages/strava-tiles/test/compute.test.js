import {describe, expect, it, vi} from "vitest"

import {computeTiles} from "../lib/compute.js"

const LAT = 43.6

const track = (id, startDate, fromLng, toLng) => {
  const steps = Math.round((toLng - fromLng) / 0.001)

  return {
    id,
    start_date: startDate,
    coordinates: Array.from({length: steps + 1}, (_, i) => [
      fromLng + i * 0.001,
      LAT,
    ]),
  }
}

const walk = track("walk", "2024-01-10T08:00:00Z", 1.4, 1.41)
const ride = track("ride", "2024-03-05T08:00:00Z", 1.37, 1.5)

describe("computeTiles", () => {
  it("gives each tile to the first activity that covered it", () => {
    const {activityTiles} = computeTiles({activities: [ride, walk]})
    const walkTiles = activityTiles.get("walk")
    const rideTiles = activityTiles.get("ride")

    expect(walkTiles.length).toBeGreaterThan(0)
    expect(
      rideTiles.some(({x, y}) =>
        walkTiles.some((tile) => tile.x === x && tile.y === y)
      )
    ).toBe(false)
  })

  it("leaves out the activities without coordinates", () => {
    const {activityTiles} = computeTiles({
      activities: [walk, {id: "indoor", start_date: "2024-02-01T00:00:00Z"}],
    })

    expect([...activityTiles.keys()]).toEqual(["walk"])
  })

  it("does not reorder the activities it is given", () => {
    const activities = [ride, walk]

    computeTiles({activities})

    expect(activities).toEqual([ride, walk])
  })

  it("splits the coverage by month", () => {
    const {athleteTiles} = computeTiles({activities: [ride, walk]})

    expect(athleteTiles.monthly.map(({yearMonth}) => yearMonth)).toEqual([
      "2024-01",
      "2024-03",
    ])
  })

  it("marks the tiles of a route that no activity covered", () => {
    const route = track("route", "2024-01-01T00:00:00Z", 1.395, 1.52)
    const {routeTiles, coveredTiles} = computeTiles({
      activities: [walk],
      routes: [route],
    })
    const {all, new: newTiles} = routeTiles.get("route")

    expect(newTiles.length).toBeGreaterThan(0)
    expect(newTiles.length).toBeLessThan(all.length)
    expect(coveredTiles.length).toBeGreaterThan(0)
  })

  it("logs a summary", () => {
    const logger = {info: vi.fn(), warn: vi.fn(), error: vi.fn()}

    computeTiles({activities: [walk], logger})

    expect(logger.info).toHaveBeenCalledOnce()
  })
})
