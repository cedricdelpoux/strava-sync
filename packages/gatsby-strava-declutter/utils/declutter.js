const DENSIFY_STEP_METERS = 20
const NEAR_METERS = 40 // Wider than GPS drift, narrower than two parallel roads
const JOIN_REACH_FACTOR = 3
const MIN_DETOUR_FACTOR = 2
const BUMP_FACTOR = 1
const MIN_SHARED_STRETCH_FACTOR = 4
const SELF_GAP_FACTOR = 2 // Along a track, passes closer are its own neighbours
const DEFAULT_MIN_ZOOM = 6
const DEFAULT_MAX_ZOOM = 12
const GENERALIZE_PIXELS = 1.5
const SIMPLIFY_PIXELS = 0.5
const METERS_PER_PIXEL_Z0 = 78271.5 // With 512 px Mapbox tiles
const SIMPLIFY_METERS = 3 // Invisible, and `latlng` streams drop to ~300 points

const METERS_PER_DEGREE = 111320

const toMeters = ([lng, lat]) => [
  lng * METERS_PER_DEGREE * Math.cos((lat * Math.PI) / 180),
  lat * METERS_PER_DEGREE,
]

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

const round = (value) => Math.round(value * 1e5) / 1e5

const roundCoord = ([lng, lat]) => [round(lng), round(lat)]

const byStartDate = (a, b) =>
  a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0

// `seg` ties each point to its original segment, to cut without losing vertices
function densify(coordinates) {
  const points = []

  coordinates.forEach((coord, index) => {
    const [x, y] = toMeters(coord)
    const point = {coord, x, y, seg: index}

    if (index > 0) {
      const prev = points[points.length - 1]
      const steps = Math.floor(distance(prev, point) / DENSIFY_STEP_METERS)
      const [prevLng, prevLat] = coordinates[index - 1]
      const [lng, lat] = coord

      for (let step = 1; step < steps; step++) {
        const t = step / steps
        points.push({
          coord: [prevLng + (lng - prevLng) * t, prevLat + (lat - prevLat) * t],
          x: prev.x + (x - prev.x) * t,
          y: prev.y + (y - prev.y) * t,
          seg: index - 1,
        })
      }
    }

    points.push(point)
  })

  return points
}

// Hash grid: a near point can only be in a neighbouring cell
function createTrace(cellSize = NEAR_METERS) {
  const cells = new Map()
  const keyOf = (cx, cy) => `${cx}:${cy}`

  return {
    add(point) {
      const key = keyOf(
        Math.floor(point.x / cellSize),
        Math.floor(point.y / cellSize)
      )
      if (!cells.has(key)) cells.set(key, [])
      cells.get(key).push(point)
    },
    findNearest(point, radius, accept = () => true) {
      const cx = Math.floor(point.x / cellSize)
      const cy = Math.floor(point.y / cellSize)
      const reach = Math.ceil(radius / cellSize)
      let nearest = null
      let nearestDistance = radius

      for (let dx = -reach; dx <= reach; dx++) {
        for (let dy = -reach; dy <= reach; dy++) {
          ;(cells.get(keyOf(cx + dx, cy + dy)) || []).forEach((other) => {
            const d = distance(point, other)
            if (d <= nearestDistance && accept(other)) {
              nearest = other
              nearestDistance = d
            }
          })
        }
      }

      return nearest
    },
    isNear(point, radius = NEAR_METERS) {
      const cx = Math.floor(point.x / cellSize)
      const cy = Math.floor(point.y / cellSize)
      const reach = Math.ceil(radius / cellSize)

      for (let dx = -reach; dx <= reach; dx++) {
        for (let dy = -reach; dy <= reach; dy++) {
          const cell = cells.get(keyOf(cx + dx, cy + dy))
          if (cell && cell.some((other) => distance(point, other) <= radius)) {
            return true
          }
        }
      }

      return false
    },
  }
}

function getRuns(points, covered, start, end) {
  const runs = []

  for (let i = start; i <= end; i++) {
    const last = runs[runs.length - 1]

    if (last && last.covered === covered[i]) {
      last.end = i
      last.length += distance(points[i - 1], points[i])
    } else {
      runs.push({covered: covered[i], start: i, end: i, length: 0})
    }
  }

  return runs
}

function mergeRuns(runs) {
  return runs.reduce((merged, run) => {
    const last = merged[merged.length - 1]

    if (last && last.covered === run.covered) {
      last.end = run.end
      last.length += run.length
    } else {
      merged.push({...run})
    }

    return merged
  }, [])
}

// A short new stretch between two drawn roads is a detour, and a short shared
// one a crossing: both are absorbed by their neighbours
function getKeptRanges(points, covered, [start, end], near) {
  let runs = getRuns(points, covered, start, end)

  if (runs.every((run) => !run.covered)) return [[start, end]]

  runs = mergeRuns(
    runs.map((run, i) =>
      !run.covered &&
      i > 0 &&
      i < runs.length - 1 &&
      run.length < MIN_DETOUR_FACTOR * near
        ? {...run, covered: true}
        : run
    )
  )
  runs = mergeRuns(
    runs.map((run, i) =>
      run.covered &&
      i > 0 &&
      i < runs.length - 1 &&
      run.length < MIN_SHARED_STRETCH_FACTOR * near
        ? {...run, covered: false}
        : run
    )
  )

  return runs.filter((run) => !run.covered).map((run) => [run.start, run.end])
}

function getCumulativeDistances(points) {
  const cumulative = [0]

  for (let i = 1; i < points.length; i++) {
    cumulative.push(cumulative[i - 1] + distance(points[i - 1], points[i]))
  }

  return cumulative
}

// Cuts `pieces` where they pass within `near` of `trace` or of the track's own
// earlier passes, testing every `every` points. A new cut end goes on along the
// track to where it meets the line, and is joined to it there. With
// `dropBumps`, small pieces and pieces close to a line all along are left out.
function cutPieces(track, pieces, trace, {near, every = 1, dropBumps = false}) {
  const {points, cumulative} = track
  const covered = new Uint8Array(points.length).fill(1)
  const self = createTrace(near)
  const behind = []

  pieces.forEach(({range: [start, end]}) => {
    for (let i = start; i <= end; i += every) {
      while (
        behind.length > 0 &&
        cumulative[i] - cumulative[behind[0]] > SELF_GAP_FACTOR * near
      ) {
        const j = behind.shift()
        self.add({...points[j], index: j})
      }

      const isCovered =
        trace.isNear(points[i], near) || self.isNear(points[i], near)

      for (let j = i; j < Math.min(i + every, end + 1); j++) {
        covered[j] = isCovered
      }
      if (!isCovered) behind.push(i)
    }
  })

  const nearestLine = (i, radius) => {
    const isAway = ({index}) =>
      Math.abs(cumulative[index] - cumulative[i]) > SELF_GAP_FACTOR * near

    return [
      trace.findNearest(points[i], radius),
      self.findNearest(points[i], radius, isAway),
    ]
      .filter(Boolean)
      .map((line) => ({line, d: distance(points[i], line)}))
      .reduce((best, line) => (!best || line.d < best.d ? line : best), null)
  }
  // The junction follows the track to where it comes closest to the line,
  // rather than a straight line that could go back and draw a loop
  const meet = (end, step, [first, last]) => {
    let best = null

    for (
      let j = end + step;
      j >= first &&
      j <= last &&
      covered[j] &&
      Math.abs(cumulative[j] - cumulative[end]) <= JOIN_REACH_FACTOR * near;
      j += step
    ) {
      const nearest = nearestLine(j, near)

      if (nearest && (!best || nearest.d < best.d)) {
        best = {index: j, d: nearest.d, coord: nearest.line.coord}
      }
    }

    return best
  }

  // A small piece joining two lines is a bridge, which keeps the map continuous
  const isSmall = ({range: [start, end], join}) => {
    const ends = [join.before, join.after].filter(Boolean).map((coord) => {
      const [x, y] = toMeters(coord)

      return {x, y}
    })

    if (ends.length === 0) return false
    if (ends.length === 2 && distance(ends[0], ends[1]) > near) return false

    const extent = [...ends, ...points.slice(start, end + 1)]
    const xs = extent.map(({x}) => x)
    const ys = extent.map(({y}) => y)

    return (
      Math.hypot(
        Math.max(...xs) - Math.min(...xs),
        Math.max(...ys) - Math.min(...ys)
      ) <
      BUMP_FACTOR * near
    )
  }
  const isBump = ([start, end]) => {
    const radius = BUMP_FACTOR * near
    const isNearLine = (i) =>
      trace.isNear(points[i], radius) ||
      self.findNearest(
        points[i],
        radius,
        ({index}) =>
          Math.abs(cumulative[index] - cumulative[i]) >
          (SELF_GAP_FACTOR + BUMP_FACTOR) * near
      ) !== null

    for (let i = start; i <= end; i += every) {
      if (!isNearLine(i)) return false
    }

    return true
  }

  return pieces.flatMap(({range, join}) =>
    getKeptRanges(points, covered, range, near)
      .filter((kept) => !(dropBumps && isBump(kept)))
      .map(([start, end]) => {
        const before = start === range[0] ? null : meet(start, -1, range)
        const after = end === range[1] ? null : meet(end, 1, range)

        return {
          range: [before ? before.index : start, after ? after.index : end],
          join: {
            before: start === range[0] ? join.before : before && before.coord,
            after: end === range[1] ? join.after : after && after.coord,
          },
        }
      })
      .filter((piece) => !(dropBumps && isSmall(piece)))
      .reduce(mergeOverlaps, [])
  )
}

// Extended to meet a line, two pieces of a track can overlap
function mergeOverlaps(merged, piece) {
  const last = merged[merged.length - 1]

  if (last && piece.range[0] <= last.range[1]) {
    if (piece.range[1] > last.range[1]) {
      last.range = [last.range[0], piece.range[1]]
      last.join = {before: last.join.before, after: piece.join.after}
    }
  } else if (piece.range[0] < piece.range[1]) {
    merged.push(piece)
  }

  return merged
}

// Iterative Douglas-Peucker, on the coordinates projected in meters
function simplify(coordinates, tolerance = SIMPLIFY_METERS) {
  if (coordinates.length < 3) return coordinates

  const projected = coordinates.map(toMeters)
  const keep = new Uint8Array(coordinates.length)
  keep[0] = keep[coordinates.length - 1] = 1
  const stack = [[0, coordinates.length - 1]]

  while (stack.length > 0) {
    const [first, last] = stack.pop()
    const [ax, ay] = projected[first]
    const [bx, by] = projected[last]
    const dx = bx - ax
    const dy = by - ay
    const lengthSquared = dx * dx + dy * dy
    let maxDistance = 0
    let index = -1

    for (let i = first + 1; i < last; i++) {
      const [px, py] = projected[i]
      const t =
        lengthSquared === 0
          ? 0
          : Math.max(
              0,
              Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared)
            )
      const d = Math.hypot(px - ax - t * dx, py - ay - t * dy)

      if (d > maxDistance) {
        maxDistance = d
        index = i
      }
    }

    if (maxDistance > tolerance) {
      keep[index] = 1
      stack.push([first, index], [index, last])
    }
  }

  return coordinates
    .filter((_, i) => keep[i])
    .map(([lng, lat]) => [round(lng), round(lat)])
}

// `join`: the points a cut range ends on, before its first point and after
// its last one
function sliceTrack(coordinates, points, start, end, tolerance, join = {}) {
  const result = [points[start].coord]

  for (let seg = points[start].seg + 1; seg <= points[end].seg; seg++) {
    result.push(coordinates[seg])
  }

  const last = points[end].coord
  const prev = result[result.length - 1]
  if (last[0] !== prev[0] || last[1] !== prev[1]) result.push(last)

  const line = simplify(result, tolerance)

  return [
    ...(join.before ? [roundCoord(join.before)] : []),
    ...line,
    ...(join.after ? [roundCoord(join.after)] : []),
  ]
}

// A cut end is joined to the nearest road drawn before, or by the track itself
function getJoins(track, pieces, trace) {
  const {activity, points, cumulative, rank} = track
  const radius = JOIN_REACH_FACTOR * NEAR_METERS
  const accept = (index) => (other) =>
    other.owner === activity.id
      ? Math.abs(cumulative[other.index] - cumulative[index]) >
        SELF_GAP_FACTOR * NEAR_METERS
      : other.rank < rank
  const joinAt = (i) => {
    const nearest = trace.findNearest(points[i], radius, accept(i))

    return nearest ? nearest.coord : null
  }

  return pieces.map(({range: [start, end], join}) => ({
    range: [start, end],
    join: {
      before: join.before || (start > 0 ? joinAt(start) : null),
      after: join.after || (end < points.length - 1 ? joinAt(end) : null),
    },
  }))
}

const metersPerPixel = (latitude, zoom) =>
  (METERS_PER_PIXEL_Z0 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom

function generalizeTracks(tracks, piecesOf, zoom) {
  // Sized for the equator, where the near distance in meters is the widest
  const cellSize = Math.max(
    NEAR_METERS,
    (GENERALIZE_PIXELS * METERS_PER_PIXEL_Z0) / 2 ** zoom
  )
  const trace = createTrace(cellSize)
  // Thousands of points per cell at zoom 3 otherwise
  const every = Math.max(1, Math.floor(cellSize / 4 / DENSIFY_STEP_METERS))

  return new Map(
    tracks.map((track) => {
      const {activity, points} = track
      const latitude = points[0].coord[1]
      const near = Math.max(
        NEAR_METERS,
        GENERALIZE_PIXELS * metersPerPixel(latitude, zoom)
      )
      const pieces = cutPieces(track, piecesOf.get(track), trace, {
        near,
        every,
        dropBumps: true,
      })

      pieces.forEach(({range: [start, end]}) => {
        for (let i = start; i <= end; i += every) {
          trace.add({...points[i], owner: activity.id})
        }
      })

      return [track, pieces]
    })
  )
}

const isSameLine = (a, b) =>
  a.length === b.length && a.every((coord, i) => coord.join() === b[i].join())

// The full pieces above the highest zoom, and the generalized ones below,
// simplified. The same line at consecutive zooms is a single stub, and a line
// the same at every zoom is a part.
function drawTrack(track, networkPieces, piecesByZoom, zooms) {
  const {activity, points} = track
  const stubs = []
  const lastStubs = []
  const draw = ({range: [start, end], join}, tolerance) =>
    sliceTrack(activity.coordinates, points, start, end, tolerance, join)

  networkPieces.forEach((piece) => {
    const stub = {
      hideUntil: zooms[0] + 1,
      showUntil: 0,
      coordinates: draw(piece),
    }

    stubs.push(stub)
    lastStubs.push(stub)
  })

  zooms.forEach((zoom, z) => {
    const latitude = points[0].coord[1]
    // Drawn until the next zoom
    const tolerance = SIMPLIFY_PIXELS * metersPerPixel(latitude, zoom + 1)
    const hideUntil = z === zooms.length - 1 ? 0 : zoom
    const previous = [...lastStubs]

    lastStubs.length = 0
    piecesByZoom[z].get(track).forEach((piece) => {
      const coordinates = draw(piece, tolerance)
      const same = previous.find(
        (stub) =>
          stub.hideUntil === zoom + 1 &&
          isSameLine(stub.coordinates, coordinates)
      )

      if (same) {
        same.hideUntil = hideUntil
        lastStubs.push(same)
      } else {
        const stub = {hideUntil, showUntil: zoom + 1, coordinates}

        stubs.push(stub)
        lastStubs.push(stub)
      }
    })
  })

  return {
    parts: stubs
      .filter(({hideUntil, showUntil}) => hideUntil === 0 && showUntil === 0)
      .map(({coordinates}) => coordinates),
    stubs: stubs.filter(
      ({hideUntil, showUntil}) => hideUntil !== 0 || showUntil !== 0
    ),
  }
}

// Walks the activities by start date: a road is drawn by the first activity
// going through it, and an activity only depends on the earlier ones. See
// docs/declutter.md.
function declutter(
  activities,
  {minZoom = DEFAULT_MIN_ZOOM, maxZoom = DEFAULT_MAX_ZOOM} = {}
) {
  if (
    !Number.isInteger(minZoom) ||
    !Number.isInteger(maxZoom) ||
    minZoom < 0 ||
    minZoom > maxZoom
  ) {
    throw new Error(
      `Invalid declutter zooms ${minZoom} to ${maxZoom}, expected integers with 0 <= minZoom <= maxZoom`
    )
  }

  const zooms = Array.from(
    {length: maxZoom - minZoom + 1},
    (_, i) => maxZoom - i
  )

  const candidates = activities
    .filter(
      (activity) => activity.coordinates && activity.coordinates.length > 1
    )
    .map((activity) => ({activity}))
    .sort((a, b) => byStartDate(a.activity, b.activity))

  const results = new Map()
  const trace = createTrace()
  const kept = []

  const hide = ({activity}) =>
    results.set(activity.id, {
      hidden: true,
      reason: "already-traced",
      parts: null,
      stubs: null,
    })

  candidates.forEach((selected) => {
    const points = densify(selected.activity.coordinates)
    const track = {
      ...selected,
      points,
      cumulative: getCumulativeDistances(points),
      rank: kept.length,
    }
    const whole = {range: [0, points.length - 1], join: {}}
    const pieces = cutPieces(track, [whole], trace, {near: NEAR_METERS})

    if (pieces.length === 0) return hide(selected)

    pieces.forEach(({range: [start, end]}) => {
      for (let i = start; i <= end; i++) {
        trace.add({
          ...points[i],
          owner: selected.activity.id,
          rank: track.rank,
          index: i,
        })
      }
    })

    kept.push({...track, pieces})
  })

  const piecesOf = new Map(
    kept.map((track) => [track, getJoins(track, track.pieces, trace)])
  )
  const drawn = kept.filter((track) => piecesOf.get(track).length > 0)
  const piecesByZoom = []

  zooms.forEach((zoom, z) => {
    piecesByZoom.push(
      generalizeTracks(drawn, z === 0 ? piecesOf : piecesByZoom[z - 1], zoom)
    )
  })

  kept.forEach((track) => {
    const {activity} = track
    const pieces = piecesOf.get(track)

    if (pieces.length === 0) return hide(track)

    const drawing = drawTrack(track, pieces, piecesByZoom, zooms)

    results.set(activity.id, {
      hidden: false,
      reason: null,
      ...drawing,
    })
  })

  return results
}

module.exports = {declutter, simplify}
