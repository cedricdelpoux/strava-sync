const assert = require("node:assert/strict")
const {describe, it} = require("node:test")

const {declutter, declutterWithState, simplify} = require("../utils/declutter")

const LAT = 43.6

// A straight east-west track, a point every ~80 m
const track = (id, startDate, fromLng, toLng) => {
  const steps = Math.round((toLng - fromLng) / 0.001)
  const coordinates = Array.from({length: steps + 1}, (_, i) => [
    fromLng + i * 0.001,
    LAT,
  ])

  return {id, start_date: startDate, coordinates}
}

const walk = track("walk", "2024-01-10T08:00:00Z", 1.4, 1.41)
const ride = track("ride", "2024-03-05T08:00:00Z", 1.37, 1.5)
const secondWalk = track("second-walk", "2024-02-01T08:00:00Z", 1.401, 1.409)
const activities = [ride, secondWalk, walk]

const linesAt = (results, zoom) =>
  [...results.values()]
    .filter(({hidden}) => !hidden)
    .flatMap(({parts, stubs}) => [
      ...parts,
      ...stubs
        .filter(
          ({hideUntil, showUntil}) =>
            hideUntil <= zoom && (!showUntil || showUntil > zoom)
        )
        .map(({coordinates}) => coordinates),
    ])

describe("declutter, start date order", () => {
  const results = declutter(activities)

  it("draws a road with the first activity going through it", () => {
    assert.equal(results.get("walk").hidden, false)
    assert.ok(results.get("walk").parts.length > 0)
  })

  it("hides an activity whose whole track is already drawn", () => {
    assert.deepEqual(results.get("second-walk"), {
      hidden: true,
      reason: "already-traced",
      parts: null,
      stubs: null,
    })
  })

  it("cuts a later activity where it follows a road already drawn", () => {
    const {hidden, stubs} = results.get("ride")

    assert.equal(hidden, false)
    assert.ok(stubs.length > 0)
    // The walk's road, drawn by the walk only
    const drawn = linesAt(new Map([["ride", results.get("ride")]]), 16)
    assert.ok(drawn.flat().every(([lng]) => lng < 1.401 || lng > 1.409))
  })

  it("never depends on later activities", () => {
    const before = declutter([walk, secondWalk])

    assert.deepEqual(before.get("walk"), results.get("walk"))
    assert.deepEqual(before.get("second-walk"), results.get("second-walk"))
  })
})

describe("declutter, out and back", () => {
  // ~1.2 km east along one road, back west along a road ~110 m north of it
  const steps = 15
  const outAndBack = {
    id: "out-and-back",
    start_date: "2024-01-10T08:00:00Z",
    coordinates: [
      ...Array.from({length: steps + 1}, (_, i) => [1.4 + i * 0.001, LAT]),
      ...Array.from({length: steps + 1}, (_, i) => [
        1.4 + (steps - i) * 0.001,
        LAT + 0.001,
      ]),
    ],
  }
  const results = declutter([outAndBack])
  const wayBack = (zoom) =>
    linesAt(results, zoom)
      .flat()
      .filter(([lng, lat]) => lat > LAT + 0.0005 && lng < 1.405)

  it("draws the way back zoomed in, next to the way out", () => {
    assert.ok(wayBack(16).length > 0)
  })

  it("draws a single road zoomed out", () => {
    assert.deepEqual(wayBack(9), [])
  })

  it("draws the lines of `minZoom` below it", () => {
    const lowest = declutter([outAndBack], {minZoom: 12})
    const wayBackAt = (zoom) =>
      linesAt(lowest, zoom)
        .flat()
        .filter(([lng, lat]) => lat > LAT + 0.0005 && lng < 1.405)

    assert.ok(wayBackAt(12).length > 0)
    assert.ok(wayBackAt(7).length > 0)
  })

  it("draws the full tracks above `maxZoom`", () => {
    const highest = declutter([outAndBack], {maxZoom: 9})
    const wayBackAt = (zoom) =>
      linesAt(highest, zoom)
        .flat()
        .filter(([lng, lat]) => lat > LAT + 0.0005 && lng < 1.405)

    assert.ok(wayBackAt(10).length > 0)
    assert.deepEqual(wayBackAt(9), [])
  })

  it("rejects a `minZoom` above `maxZoom`", () => {
    assert.throws(() => declutter([outAndBack], {minZoom: 10, maxZoom: 8}))
  })
})

describe("declutter, no gap", () => {
  const METERS_PER_DEGREE = 111320
  const toMeters = ([lng, lat]) => [
    lng * METERS_PER_DEGREE * Math.cos((lat * Math.PI) / 180),
    lat * METERS_PER_DEGREE,
  ]
  const distanceToSegment = (point, a, b) => {
    const [px, py] = toMeters(point)
    const [ax, ay] = toMeters(a)
    const [bx, by] = toMeters(b)
    const dx = bx - ax
    const dy = by - ay
    const lengthSquared = dx * dx + dy * dy
    const t =
      lengthSquared === 0
        ? 0
        : Math.max(
            0,
            Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared)
          )

    return Math.hypot(px - ax - t * dx, py - ay - t * dy)
  }
  // Every point of a drawn track is near a line drawn at every zoom: 6 px
  // zoomed out, where small loops and bumps are left out, GPS drift zoomed in
  const assertNoGap = (results, {id, coordinates}) => {
    for (let zoom = 7; zoom <= 16; zoom++) {
      const radius = Math.max(
        (6 * 78271.5 * Math.cos((LAT * Math.PI) / 180)) / 2 ** zoom,
        45
      )
      const lines = linesAt(results, zoom)

      coordinates.forEach((point) => {
        const isDrawn = lines.some((line) =>
          line.some(
            (coord, i) =>
              i > 0 && distanceToSegment(point, line[i - 1], coord) <= radius
          )
        )

        assert.ok(isDrawn, `${id} at zoom ${zoom}, [${point}]`)
      })
    }
  }

  it("joins a cut end to the road it leaves", () => {
    const {parts, stubs} = declutter(activities).get("ride")
    const ends = [...parts, ...stubs.map(({coordinates}) => coordinates)]
      .flatMap((line) => [line[0], line[line.length - 1]])
      .map(([lng]) => lng)

    assert.ok(ends.some((lng) => lng >= 1.4 && lng < 1.405))
    assert.ok(ends.some((lng) => lng > 1.405 && lng <= 1.41))
  })

  it("leaves no gap in a cut track", () => {
    const results = declutter(activities)

    ;[ride, walk].forEach((activity) => {
      if (!results.get(activity.id).hidden) assertNoGap(results, activity)
    })
  })

  // Zoomed out, `parallel` falls within a few pixels of `road`
  it("merges a track next to another zoomed out, without a gap", () => {
    const road = track("road", "2024-01-10T08:00:00Z", 1.4, 1.5)
    const line = (from, to, steps) =>
      Array.from({length: steps + 1}, (_, i) => [
        from[0] + ((to[0] - from[0]) * i) / steps,
        from[1] + ((to[1] - from[1]) * i) / steps,
      ])
    const parallel = {
      id: "parallel",
      start_date: "2024-03-05T08:00:00Z",
      coordinates: [
        ...line([1.4, LAT + 0.02], [1.42, LAT + 0.0025], 30),
        ...line([1.421, LAT + 0.0025], [1.48, LAT + 0.0025], 59),
        ...line([1.481, LAT + 0.0025], [1.5, LAT + 0.02], 30),
      ],
    }
    const results = declutter([road, parallel])
    // In degrees of longitude, along the road ~280 m north of `road`
    const middleLengthAt = (zoom) =>
      linesAt(new Map([["parallel", results.get("parallel")]]), zoom)
        .flatMap((line) => line.slice(1).map((coord, i) => [line[i], coord]))
        .filter(([a, b]) =>
          [a, b].every(([, lat]) => lat > LAT + 0.002 && lat < LAT + 0.003)
        )
        .reduce((length, [a, b]) => length + Math.abs(b[0] - a[0]), 0)

    assert.ok(middleLengthAt(16) > 0.05)
    assert.ok(middleLengthAt(8) < 0.01)
    assertNoGap(results, parallel)
  })

  // `detour` leaves the road of `road` ~220 m north, then comes back to it
  it("keeps a detour off a road already drawn", () => {
    const road = track("road", "2024-01-10T08:00:00Z", 1.4, 1.43)
    const along = (fromLng, toLng, lat) =>
      Array.from(
        {length: Math.round((toLng - fromLng) / 0.001) + 1},
        (_, i) => [fromLng + i * 0.001, lat]
      )
    const detour = {
      id: "detour",
      start_date: "2024-03-05T08:00:00Z",
      coordinates: [
        ...along(1.37, 1.41, LAT),
        ...along(1.411, 1.419, LAT + 0.002),
        ...along(1.42, 1.47, LAT),
      ],
    }
    const results = declutter([road, detour])
    const drawn = linesAt(results, 16).flat()

    assert.ok(drawn.some(([, lat]) => lat > LAT + 0.0015))
    assertNoGap(results, detour)
  })
})

describe("declutter", () => {
  it("skips the activities without at least two points", () => {
    const results = declutter([
      {id: "empty", start_date: "2024-01-01", coordinates: []},
      {id: "none", start_date: "2024-01-01"},
      walk,
    ])

    assert.deepEqual([...results.keys()], ["walk"])
  })
})

describe("declutterWithState", () => {
  const readBack = ({entries, results}) => ({
    entries: JSON.parse(JSON.stringify(entries)),
    results: new Map(JSON.parse(JSON.stringify([...results]))),
  })
  const far = track("far", "2024-04-01T08:00:00Z", 5.4, 5.45)
  const assertSame = (list, previous, reused) => {
    const next = declutterWithState(list, {}, readBack(previous))

    assert.deepEqual(next.results, declutter(list))
    assert.equal(next.reused, reused)
  }

  it("only declutters the activities after the last one", () => {
    assertSame(activities, declutterWithState([walk, secondWalk]), 2)
    assertSame([...activities, far], declutterWithState(activities), 3)
  })

  it("declutters again from an activity inserted before", () => {
    assertSame(activities, declutterWithState([walk, ride]), 1)
  })

  it("declutters again from a changed activity", () => {
    const shorterWalk = track("walk", "2024-01-10T08:00:00Z", 1.4, 1.405)

    assertSame(
      [ride, secondWalk, shorterWalk],
      declutterWithState(activities),
      0
    )
  })

  it("declutters again from a deleted activity", () => {
    assertSame([ride, secondWalk], declutterWithState(activities), 0)
  })

  it("keeps the next activities when a hidden one is deleted", () => {
    assertSame([ride, walk], declutterWithState(activities), 2)
  })

  it("keeps every activity when none changed", () => {
    assertSame(activities, declutterWithState(activities), 3)
  })
})

describe("simplify", () => {
  it("drops the points of a straight line", () => {
    assert.deepEqual(simplify(walk.coordinates), [
      [1.4, LAT],
      [1.41, LAT],
    ])
  })
})

describe("package entry point", () => {
  it("exports declutter and simplify", () => {
    assert.deepEqual(require(".."), {declutter, simplify})
  })
})
