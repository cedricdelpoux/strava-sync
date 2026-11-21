import polyline from "@mapbox/polyline"

const COORDINATE_FACTOR = 10 ** 5

export const roundPoint = (point) =>
  point.map(
    (value) => Math.round(value * COORDINATE_FACTOR) / COORDINATE_FACTOR
  )

// The full resolution latlng stream beats `polyline`, which Strava simplifies
// for display, which beats `summary_polyline`. Points are [lng, lat].
export const getCoordinates = ({map, streams}) => {
  const encoded = map && (map.polyline || map.summary_polyline)
  const points =
    (streams && streams.latlng) || (encoded ? polyline.decode(encoded) : [])

  return points.map(([lat, lng]) => roundPoint([lng, lat]))
}
