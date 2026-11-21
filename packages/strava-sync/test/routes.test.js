import {expect, test} from "vitest"

import {StravaError} from "../lib/errors.js"
import {
  addRouteStreams,
  getRoutesVersion,
  normalizeRoute,
  syncRoutes,
} from "../lib/routes.js"
import {createFakeClient, createMemoryStore} from "./helpers.js"

const route = {id: 1, id_str: "1", updated_at: 10}
const stream = [{type: "latlng", data: [[1, 2]]}]

const createStreamStore = (stored) => ({
  ...createMemoryStore(),
  readRouteStream: async () => stored,
  writeRouteStream: async () => {},
})

test("reuses a stored stream while the route keeps its updated_at", async () => {
  const client = createFakeClient({})
  const store = createStreamStore({updated_at: 10, latlng: [[3, 4]]})

  const {routes, fetchedCount} = await addRouteStreams({
    client,
    routes: [route],
    store,
    withRouteStreams: true,
  })

  expect(routes[0].streams.latlng).toEqual([[3, 4]])
  expect(fetchedCount).toBe(0)
  expect(client.calls).toEqual([])
})

test("fetches the stream of an edited route", async () => {
  const client = createFakeClient({"routes/:id/streams": stream})
  const store = createStreamStore({updated_at: 9, latlng: [[3, 4]]})

  const {routes} = await addRouteStreams({
    client,
    routes: [route],
    store,
    withRouteStreams: true,
  })

  expect(routes[0].streams.latlng).toEqual([[1, 2]])
})

test("keeps the summary of the routes left once a rate limit is hit", async () => {
  const client = createFakeClient({
    "routes/:id/streams": new StravaError("SHORT_LIMIT", "limit"),
  })

  const {routes} = await addRouteStreams({
    client,
    routes: [route, {...route, id: 2, id_str: "2"}],
    store: createStreamStore(null),
    withRouteStreams: true,
  })

  expect(routes.every((item) => !item.streams)).toBe(true)
  expect(client.calls).toHaveLength(1)
})

test("falls back to the stored routes when the list cannot be fetched", async () => {
  const store = createMemoryStore()

  store.readRoutes = async () => [route]

  const client = createFakeClient({
    "athlete/routes": new StravaError("network", "down"),
  })

  const {routes} = await syncRoutes({client, store})

  expect(routes).toEqual([route])
})

test("normalizes a route to string ids and coordinates", () => {
  const normalized = normalizeRoute({
    ...route,
    streams: {latlng: [[44.1, 5.2]]},
  })

  expect(normalized).toEqual({
    id: "1",
    updated_at: 10,
    coordinates: [[5.2, 44.1]],
  })
})

test("hashes the routes the same whatever their order", () => {
  const other = {id: 2, updated_at: 20}

  expect(getRoutesVersion([route, other])).toBe(
    getRoutesVersion([other, route])
  )
  expect(getRoutesVersion([route])).not.toBe(
    getRoutesVersion([{...route, updated_at: 11}])
  )
})
