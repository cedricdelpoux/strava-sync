import polyline from "@mapbox/polyline"
import {expect, test} from "vitest"

import {getCoordinates} from "../lib/coordinates.js"
import {enrichActivity} from "../lib/details.js"
import {createFakeClient} from "./helpers.js"

const latlng = [
  [44.321220000000004, 5.1],
  [44.32123, 5.10001],
]

test("rounds the coordinates to 5 decimals as [lng, lat]", () => {
  expect(getCoordinates({streams: {latlng}})).toEqual([
    [5.1, 44.32122],
    [5.10001, 44.32123],
  ])
})

test("falls back from latlng to polyline to summary_polyline", () => {
  const map = {
    polyline: polyline.encode([[1, 2]]),
    summary_polyline: polyline.encode([[3, 4]]),
  }

  expect(getCoordinates({map, streams: {latlng}})[0]).toEqual([5.1, 44.32122])
  expect(getCoordinates({map, streams: {latlng: null}})).toEqual([[2, 1]])
  expect(
    getCoordinates({map: {summary_polyline: map.summary_polyline}})
  ).toEqual([[4, 3]])
  expect(getCoordinates({map: {}})).toEqual([])
})

test("adds streams type by type and keeps what an earlier run added", async () => {
  const client = createFakeClient({
    "activities/:id/streams": [{type: "heartrate", data: [120, 130]}],
  })
  const existing = {
    id: "1",
    laps: [{id: "lap"}],
    streams: {latlng, time: [0, 1]},
  }

  const activity = await enrichActivity({
    client,
    activity: existing,
    existing,
    details: {withStreams: true, streamsTypes: ["heartrate"]},
  })

  expect(activity.streams).toEqual({
    latlng,
    time: [0, 1],
    heartrate: [120, 130],
  })
  expect(activity.laps).toEqual([{id: "lap"}])
  expect(activity.coordinates).toHaveLength(2)
})

test("stores a stream type Strava has no data for as null", async () => {
  const client = createFakeClient({"activities/:id/streams": []})

  const activity = await enrichActivity({
    client,
    activity: {id: "1"},
    details: {withStreams: true, streamsTypes: ["watts"]},
  })

  expect(activity.streams).toEqual({watts: null})
  expect(activity).not.toHaveProperty("coordinates")
})

test("asks for no stream unless withStreams says so", async () => {
  const client = createFakeClient({})

  await enrichActivity({
    client,
    activity: {id: "1"},
    details: {withStreams: () => false, streamsTypes: ["time"]},
  })

  expect(client.calls).toEqual([])
})

test("keeps the photos summary apart from the fetched photos", async () => {
  const client = createFakeClient({"activities/:id/photos": [{unique_id: "p"}]})

  const activity = await enrichActivity({
    client,
    activity: {id: "1", photos: {count: 1, primary: {}}},
    details: {withPhotos: 600},
  })

  expect(activity.photos).toEqual([{unique_id: "p"}])
  expect(activity.photos_summary).toEqual({count: 1, primary: {}})
  expect(client.calls[0].query).toEqual({size: 600})
})
