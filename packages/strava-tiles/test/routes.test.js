import {describe, expect, it} from "vitest"

import {readRoutes} from "../lib/routes.js"

const encoded = "_p~iF~ps|U_ulLnnqC_mqNvxq`@"

const createStore = (stream) => ({
  readRoutes: async () => [
    {
      id: 12,
      id_str: "12",
      updated_at: "2024-01-01",
      map: {summary_polyline: encoded},
    },
  ],
  readRouteStream: async () => stream,
})

describe("readRoutes", () => {
  it("reads the coordinates of the summary without a stream", async () => {
    const [route] = await readRoutes(createStore(null))

    expect(route.coordinates.length).toBe(3)
  })

  it("prefers a stream that is up to date", async () => {
    const [route] = await readRoutes(
      createStore({
        updated_at: "2024-01-01",
        latlng: [
          [1, 2],
          [3, 4],
        ],
      })
    )

    expect(route.coordinates).toEqual([
      [2, 1],
      [4, 3],
    ])
  })

  it("ignores a stream of an older version of the route", async () => {
    const [route] = await readRoutes(
      createStore({
        updated_at: "2023-01-01",
        latlng: [
          [1, 2],
          [3, 4],
        ],
      })
    )

    expect(route.coordinates.length).toBe(3)
  })
})
