import {createRequire} from "node:module"

import * as stravaSync from "strava-sync"
import {describe, expect, it} from "vitest"

const require = createRequire(import.meta.url)
const {createNormalizers} = require("../utils/normalize.js")

const {normalizeActivity, normalizeAthlete} = createNormalizers(stravaSync)

describe("normalizeActivity", () => {
  it("turns the ids into strings", () => {
    const activity = normalizeActivity({id: 12345, upload_id: 678, id_str: "x"})

    expect(activity).toEqual({id: "12345", upload_id: "678"})
  })

  it("rounds the coordinates", () => {
    const activity = normalizeActivity({coordinates: [[1.234567, 2.345678]]})

    expect(activity.coordinates).toEqual([[1.23457, 2.34568]])
  })

  it("turns the coordinates stored as strings back into numbers", () => {
    const activity = normalizeActivity({
      start_latlng: ["43.5", 1.5],
      end_latlng: ["", null],
    })

    expect(activity.start_latlng).toEqual([43.5, 1.5])
    expect(activity.end_latlng).toEqual(["", null])
  })

  it("moves the photos summary aside", () => {
    const activity = normalizeActivity({photos: {count: 1, primary: null}})

    expect(activity.photos).toBeUndefined()
    expect(activity.photos_summary).toEqual({count: 1, primary: null})
  })

  it("keeps the list of photos fetched over the summary", () => {
    const photos = [{unique_id: "a"}]
    const activity = normalizeActivity({photos})

    expect(activity.photos).toEqual(photos)
    expect(activity.photos_summary).toBeUndefined()
  })

  it("prefixes the photo sizes that start with a digit", () => {
    const activity = normalizeActivity({
      photos: {primary: {urls: {100: "a", 600: "b", other: "c"}}},
    })

    expect(activity.photos_summary.primary.urls).toEqual({
      _100: "a",
      _600: "b",
      other: "c",
    })
  })

  it("prefixes the sizes of each photo", () => {
    const activity = normalizeActivity({
      photos: [{urls: {1800: "a"}, sizes: {1800: [1, 2]}}],
    })

    expect(activity.photos[0]).toEqual({
      urls: {_1800: "a"},
      sizes: {_1800: [1, 2]},
    })
  })

  it("removes the backlinks of the laps and efforts", () => {
    const activity = normalizeActivity({
      laps: [{id: 1, activity: {id: 9}, athlete: {id: 8}}],
      comments: [{id: 2, activity_id: 9, athlete: {id: 7}}],
      photos: [{id: 3, activity_id: 9, activity_name: "x", athlete_id: 8}],
      segment_efforts: [{id: 4, activity: {id: 9}, athlete: {id: 8}}],
    })

    expect(activity.laps).toEqual([{id: "1"}])
    expect(activity.comments).toEqual([{id: "2", athlete: {id: "7"}}])
    expect(activity.photos).toEqual([{id: "3"}])
    expect(activity.segment_efforts).toEqual([{id: "4"}])
  })
})

describe("normalizeAthlete", () => {
  it("removes the athlete backlink of the koms only", () => {
    const athlete = normalizeAthlete({
      id: 1,
      koms: [{kom_rank: 1, athlete: {id: 1}, activity: {id: 5}}],
    })

    expect(athlete).toEqual({
      id: "1",
      koms: [{kom_rank: 1, activity: {id: "5"}}],
    })
  })
})
