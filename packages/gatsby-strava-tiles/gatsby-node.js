const loadTiles = () => import("strava-tiles")

const ROUTE_NODE_TYPE_BY_SOURCE = {
  strava: "StravaRoute",
  rideWithGps: "RideWithGpsRoute",
}

exports.pluginOptionsSchema = ({Joi}) =>
  Joi.object({
    // An empty `default()` builds the object from the defaults of its keys
    routes: Joi.object({
      strava: Joi.boolean().default(true),
      rideWithGps: Joi.boolean().default(false),
    }).default(),
  })

const getRouteNodeTypes = (pluginOptions) =>
  Object.entries(ROUTE_NODE_TYPE_BY_SOURCE)
    .filter(([source]) => pluginOptions.routes[source])
    .map(([, nodeType]) => nodeType)

// Declared explicitly: an inferred type drops from the schema when every
// sourced `tiles` is empty
exports.createSchemaCustomization = ({actions: {createTypes}}) => {
  createTypes(`
    type Tile {
      x: Int
      y: Int
    }

    # squareBorder sets \`size\`, rowBorder/columnBorder set \`width\`/\`height\`
    type TileBorder {
      x: Int
      y: Int
      size: Int
      width: Int
      height: Int
    }

    type TileOutlines {
      square: [[[[Float]]]]
      cluster: [[[[Float]]]]
      rest: [[[[Float]]]]
    }

    type MonthlyTileOutlines {
      square: [[[[Float]]]]
      cluster: [[[[Float]]]]
      rest: [[[[Float]]]]
      new: [[[[Float]]]]
    }

    type TileParts {
      squareBorder: TileBorder
      squareSize: Int
      square: [Tile]
      rowBorder: TileBorder
      rowSize: Int
      row: [Tile]
      columnBorder: TileBorder
      columnSize: Int
      column: [Tile]
      cluster: [Tile]
      rest: [Tile]
      outlines: TileOutlines
    }

    type MonthlyTileParts {
      squareBorder: TileBorder
      squareSize: Int
      square: [Tile]
      rowBorder: TileBorder
      rowSize: Int
      row: [Tile]
      columnBorder: TileBorder
      columnSize: Int
      column: [Tile]
      cluster: [Tile]
      rest: [Tile]
      new: [Tile]
      outlines: MonthlyTileOutlines
    }

    type MonthlyTiles {
      yearMonth: String
      year: String
      month: String
      parts: MonthlyTileParts
    }

    type AthleteTiles {
      parts: TileParts
      monthly: [MonthlyTiles]
    }

    # \`new\`: not covered by any activity yet
    type RouteTiles {
      all: [Tile]
      new: [Tile]
    }
  `)
}

// A new activity changes the new tiles of a route, but `createNodeField`
// alone doesn't rerun the queries
const dependOnEveryActivity = (context) =>
  context.nodeModel.findAll({type: "StravaActivity", query: {limit: 1}})

const routeTilesResolver = {
  type: "RouteTiles",
  resolve: async (source, args, context) => {
    await dependOnEveryActivity(context)

    return source.fields.tiles
  },
}

// Not `createTypes`: these types belong to the source plugins, and
// redefining them logs a conflict warning. `fields.tiles` is what
// `createNodeField` persists, `source.tiles` can be `null`.
exports.createResolvers = ({createResolvers}, pluginOptions) => {
  const routeResolvers = Object.fromEntries(
    getRouteNodeTypes(pluginOptions).map((nodeType) => [
      nodeType,
      {tiles: routeTilesResolver},
    ])
  )

  createResolvers({
    StravaActivity: {
      tiles: {
        type: "[Tile]",
        resolve: (source) => source.fields.tiles,
      },
    },
    StravaAthlete: {
      tiles: {
        type: "AthleteTiles",
        resolve: (source) => source.fields.tiles,
      },
    },
    ...routeResolvers,
  })
}

const activityNodesById = new Map()
const routeNodesById = new Map()
let athleteNode = null
let coveredTiles = []
let hasSourced = false

const createLogger = (reporter) => ({
  info: (message) => reporter.info(`strava-tiles: ${message}`),
  warn: (message) => reporter.warn(`strava-tiles: ${message}`),
  error: (message) => reporter.error(`strava-tiles: ${message}`),
})

async function recomputeTiles({createNodeField, reporter}) {
  const {computeTiles} = await loadTiles()
  const computed = computeTiles({
    activities: [...activityNodesById.values()],
    routes: [...routeNodesById.values()],
    logger: createLogger(reporter),
  })
  const {activityTiles, athleteTiles, routeTiles} = computed

  coveredTiles = computed.coveredTiles
  activityTiles.forEach((value, id) =>
    createNodeField({node: activityNodesById.get(id), name: "tiles", value})
  )

  if (athleteNode) {
    createNodeField({node: athleteNode, name: "tiles", value: athleteTiles})
  }

  routeTiles.forEach((value, id) =>
    createNodeField({node: routeNodesById.get(id), name: "tiles", value})
  )
}

async function updateRouteTiles(node, {createNodeField}) {
  const {distinctTiles, getRouteTiles} = await loadTiles()

  createNodeField({
    node,
    name: "tiles",
    value: getRouteTiles(node, distinctTiles(coveredTiles)),
  })
}

exports.onCreateNode = async (
  {node, actions: {createNodeField}, reporter},
  pluginOptions
) => {
  if (node.internal.type === "StravaActivity") {
    createNodeField({node, name: "tiles", value: []})

    if (node.coordinates && node.coordinates.length > 0) {
      activityNodesById.set(node.id, node)

      // A dev-mode refetch, after `createPages`
      if (hasSourced) await recomputeTiles({createNodeField, reporter})
    }
  }

  if (getRouteNodeTypes(pluginOptions).includes(node.internal.type)) {
    routeNodesById.set(node.id, node)

    if (hasSourced) {
      await updateRouteTiles(node, {createNodeField})
    } else {
      createNodeField({node, name: "tiles", value: {all: [], new: []}})
    }
  }

  if (node.internal.type === "StravaAthlete") {
    athleteNode = node
  }
}

// Before the site's `createPages`, which Gatsby runs last. Not `sourceNodes`,
// which warns "has generated no Gatsby nodes".
exports.createPages = async (
  {actions: {createNodeField}, getNodesByType, reporter},
  pluginOptions
) => {
  try {
    // With Gatsby's cache kept, `onCreateNode` only sees new or changed nodes
    getNodesByType("StravaActivity").forEach((node) => {
      if (node.coordinates && node.coordinates.length > 0) {
        activityNodesById.set(node.id, node)
      }
    })

    getRouteNodeTypes(pluginOptions).forEach((nodeType) =>
      getNodesByType(nodeType).forEach((node) => {
        routeNodesById.set(node.id, node)
      })
    )

    const [athlete] = getNodesByType("StravaAthlete")
    if (athlete) athleteNode = athlete

    await recomputeTiles({createNodeField, reporter})
    hasSourced = true
  } catch (e) {
    // Only fatal for `gatsby build`, not `gatsby develop`
    reporter.panicOnBuild(`strava-tiles: ${e.message}`, e)
  }
}
