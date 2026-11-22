const {getDeclutterNodeId} = require("./utils/nodes")

// Loaded on the first call: Gatsby loads this file too, and the `require()` of
// an ES module logs a warning when the package is linked rather than installed
const lazy =
  (name) =>
  (...args) =>
    require("strava-declutter")[name](...args)

module.exports = {
  declutter: lazy("declutter"),
  getDeclutterNodeId,
  simplify: lazy("simplify"),
}
