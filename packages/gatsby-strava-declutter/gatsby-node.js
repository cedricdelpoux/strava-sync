const fs = require("fs")
const path = require("path")

const {checkPlugins} = require("./utils/plugins.js")

const DECLUTTER_PATH = require.resolve("./utils/declutter.js")

// Loaded again when it changes in development, see `watchDeclutter`. Its
// source is part of the cache digest, since it can change under the same
// version, in development or with yalc.
let declutterModule = require(DECLUTTER_PATH)
let declutterSource = fs.readFileSync(DECLUTTER_PATH, "utf8")

exports.pluginOptionsSchema = ({Joi}) =>
  Joi.object({
    filter: Joi.function(),
    minZoom: Joi.number().integer().min(0),
    maxZoom: Joi.number().integer().min(0),
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

const declutterNodeId = (activityId) => `declutter-${activityId}`

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
            id: declutterNodeId(source.id),
            type: "Declutter",
          }),
      },
    },
  })
}

let hasBootstrapped = false

// Gatsby clears this cache when the plugin's version changes
async function getDeclutterResults(
  activities,
  {minZoom, maxZoom},
  {cache, createContentDigest, reporter}
) {
  const timer = reporter.activityTimer(
    "strava-declutter: declutter the activities"
  )

  timer.start()

  const digest = createContentDigest([
    declutterSource,
    minZoom,
    maxZoom,
    activities.map((node) => [
      node.id,
      node.start_date,
      node.coordinates.length,
      node.coordinates[0],
      node.coordinates[node.coordinates.length - 1],
    ]),
  ])
  const cached = await cache.get("declutter")

  let results

  if (cached && cached.digest === digest) {
    results = new Map(cached.results)
  } else {
    results = declutterModule.declutter(activities, {
      minZoom,
      maxZoom,
    })
    await cache.set("declutter", {digest, results: [...results]})
  }

  const hiddenCount = [...results.values()].filter(
    (result) => result.hidden
  ).length

  timer.setStatus(`${results.size - hiddenCount} shown, ${hiddenCount} hidden`)
  timer.end()

  return results
}

// Every activity from the store, not only those `onCreateNode` saw: with
// Gatsby's cache kept, it only sees the new or changed ones. Nodes rather than
// `createNodeField`, whose changes don't rerun the queries. Stateful nodes, so
// the obsolete ones are deleted here.
async function updateDeclutter(args, options) {
  const {
    node,
    actions: {createNode, deleteNode},
    createContentDigest,
    getNodesByType,
  } = args
  const {filter = () => true, minZoom, maxZoom} = options
  const activityNodesById = new Map(
    getNodesByType("StravaActivity").map((activity) => [activity.id, activity])
  )

  // A dev-mode refetch, the latest version of the node
  if (node) activityNodesById.set(node.id, node)

  // Sorted, so the cache digest doesn't depend on the sourcing order
  const activities = [...activityNodesById.values()]
    .filter(
      (activity) =>
        activity.coordinates &&
        activity.coordinates.length > 1 &&
        filter(activity)
    )
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const results = await getDeclutterResults(
    activities,
    {minZoom, maxZoom},
    args
  )
  const nodeIds = new Set()

  results.forEach((value, activityId) => {
    const id = declutterNodeId(activityId)

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

// Gatsby doesn't reload a plugin's code in development. The declutter is
// loaded again when its file changes, and the `Declutter` nodes it changes
// rerun the page queries. The directory is watched, since yalc replaces the
// file.
function watchDeclutter(args, options) {
  let timeout = null

  fs.watch(path.dirname(DECLUTTER_PATH), (event, filename) => {
    if (filename !== path.basename(DECLUTTER_PATH)) return

    // An editor saves in several writes
    clearTimeout(timeout)
    timeout = setTimeout(async () => {
      try {
        const source = fs.readFileSync(DECLUTTER_PATH, "utf8")

        if (source === declutterSource) return

        delete require.cache[DECLUTTER_PATH]
        declutterModule = require(DECLUTTER_PATH)
        declutterSource = source
        args.reporter.info("strava-declutter: utils/declutter.js changed")
        await updateDeclutter(args, options)
      } catch (e) {
        args.reporter.error(`strava-declutter: ${e.message}`, e)
      }
    }, 200)
  })
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

  if (process.env.gatsby_executing_command === "develop") {
    watchDeclutter(args, options)
  }
}
