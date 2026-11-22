// Gatsby only runs gatsby-node.js. This entry point is for a site's own code.
//
// The functions load `strava-tiles` on the first call: Gatsby loads this file
// too, and the `require()` of an ES module logs a warning when the package is
// linked rather than installed
const FUNCTION_NAMES = [
  "computeTiles",
  "getActivityTiles",
  "getAthleteTiles",
  "getRouteTiles",
  "readRoutes",
  "cellsAlongLine",
  "distanceInMeters",
  "lngToX",
  "latToY",
  "lngToXf",
  "latToYf",
  "xToLng",
  "yToLat",
  "getCluster",
  "getMaxColumn",
  "getMaxRow",
  "tilesToOutline",
  "getSquare",
  "getMonthly",
  "uniqueTiles",
  "distinctTiles",
  "pointsToTiles",
  "getTileActivities",
  "tileToCoords",
]

module.exports = Object.fromEntries(
  FUNCTION_NAMES.map((name) => [
    name,
    (...args) => require("strava-tiles")[name](...args),
  ])
)

// Not enumerable, so that spreading this entry point does not load the package
Object.defineProperty(module.exports, "Z", {
  get: () => require("strava-tiles").Z,
})
