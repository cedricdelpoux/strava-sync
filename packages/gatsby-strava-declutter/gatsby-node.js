const path = require("path")

const {getDeclutterNodeId} = require("./utils/nodes.js")
const {checkPlugins} = require("./utils/plugins.js")

exports.pluginOptionsSchema = ({Joi}) =>
  Joi.object({
    filter: Joi.function(),
    minZoom: Joi.number().integer().min(0),
    maxZoom: Joi.number().integer().min(0),
    storeDir: Joi.string(),
  })

exports.onPreInit = ({store, reporter}) => {
  const errors = checkPlugins(store.getState().flattenedPlugins)

  if (errors.length > 0) {
    reporter.panic(`strava-declutter: ${errors.join("\n")}`)
  }
}

exports.createSchemaCustomization = ({actions: {createTypes}}) => {
  createTypes(`
    type Declutter implements Node @dontInfer {
      hidden: Boolean!
      reason: String
      parts: [[[Float!]!]!]
      stubs: [DeclutterStub!]
    }

    # Hidden under \`hideUntil\` and from \`showUntil\`
    type DeclutterStub {
      hideUntil: Int!
      showUntil: Int!
      coordinates: [[Float!]!]!
    }
  `)
}

// Not `createTypes`: `StravaActivity` belongs to gatsby-source-strava, and
// redefining it logs a conflict warning. `nodeModel` makes the page query
// depend on the `Declutter` node.
exports.createResolvers = ({createResolvers}) => {
  createResolvers({
    StravaActivity: {
      declutter: {
        type: "Declutter",
        resolve: (source, args, context) =>
          context.nodeModel.getNodeById({
            id: getDeclutterNodeId(source.id),
            type: "Declutter",
          }),
      },
    },
  })
}

let hasBootstrapped = false

const createLogger = (reporter) => ({
  info: (message) => reporter.info(`strava-declutter: ${message}`),
  warn: (message) => reporter.warn(`strava-declutter: ${message}`),
  error: (message) => reporter.error(`strava-declutter: ${message}`),
})

// Every activity from the store, not only those `onCreateNode` saw: with
// Gatsby's cache kept, it only sees the new or changed ones. Nodes rather than
// `createNodeField`, whose changes don't rerun the queries. Stateful nodes, so
// the obsolete ones are deleted here.
async function runUpdate(args, options) {
  const {
    node,
    actions: {createNode, deleteNode},
    createContentDigest,
    getNodesByType,
    reporter,
    store,
  } = args
  const {minZoom, maxZoom, filter, storeDir = ".strava-declutter"} = options
  const {createDeclutterStore, declutterActivities} =
    await import("strava-declutter")
  const activityNodesById = new Map(
    getNodesByType("StravaActivity").map((activity) => [activity.id, activity])
  )

  // A dev-mode refetch, the latest version of the node
  if (node) activityNodesById.set(node.id, node)

  const {results} = await declutterActivities({
    activities: [...activityNodesById.values()],
    store: createDeclutterStore({
      dir: path.resolve(store.getState().program.directory, storeDir),
    }),
    filter,
    minZoom,
    maxZoom,
    logger: createLogger(reporter),
  })
  const nodeIds = new Set()

  results.forEach((value, activityId) => {
    const id = getDeclutterNodeId(activityId)

    nodeIds.add(id)
    createNode({
      ...value,
      id,
      internal: {type: "Declutter", contentDigest: createContentDigest(value)},
    })
  })

  getNodesByType("Declutter")
    .filter((declutterNode) => !nodeIds.has(declutterNode.id))
    .forEach((declutterNode) => deleteNode(declutterNode))
}

let lastUpdate = Promise.resolve()

// Serialized, since each one writes the store
function updateDeclutter(args, options) {
  lastUpdate = lastUpdate.catch(() => {}).then(() => runUpdate(args, options))

  return lastUpdate
}

// Created after sourcing, the `Declutter` nodes would otherwise be deleted as
// stale at each start. Gatsby 5.12+.
exports.onPluginInit = ({actions}) => {
  if (actions.enableStatefulSourceNodes) actions.enableStatefulSourceNodes()
}

exports.onCreateNode = async (args, options) => {
  const {node} = args

  if (
    hasBootstrapped &&
    node.internal.type === "StravaActivity" &&
    node.coordinates &&
    node.coordinates.length > 0
  ) {
    await updateDeclutter(args, options)
  }
}

// Only the page queries read the declutter, and they run after this hook
exports.onPostBootstrap = async (args, options) => {
  hasBootstrapped = true

  try {
    await updateDeclutter(args, options)
  } catch (e) {
    // Only fatal for `gatsby build`, not `gatsby develop`
    args.reporter.panicOnBuild(`strava-declutter: ${e.message}`, e)
  }
}
