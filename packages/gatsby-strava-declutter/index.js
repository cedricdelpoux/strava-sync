// Gatsby only runs gatsby-node.js. This entry point is for a site's own code.
const {declutter, simplify} = require("./utils/declutter")
const {getDeclutterNodeId} = require("./utils/nodes")

module.exports = {declutter, getDeclutterNodeId, simplify}
