const fs = require("fs")
const path = require("path")

const {checkPlugins} = require("./utils/plugins.js")
const {createStore} = require("./utils/store.js")

const DECLUTTER_PATH = require.resolve("./utils/declutter.js")

// Loaded again when it changes in development, see `watchDeclutter`. Its
// source is part of the store digest, since it can change under the same
// version, in development or with yalc.
let declutterModule = require(DECLUTTER_PATH)
let declutterSource = fs.readFileSync(DECLUTTER_PATH, "utf8")

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

async function getDeclutterResults(
  activities,
  {minZoom, maxZoom, storeDir = ".strava-declutter"},
  {createContentDigest, reporter, store}
) {
  const timer = reporter.activityTimer(
    "strava-declutter: declutter the activities"
  )

  timer.start()

  const declutterStore = createStore({
    dir: path.resolve(store.getState().program.directory, storeDir),
  })
  const digest = createContentDigest([declutterSource, minZoom, maxZoom])
  const previous = await declutterStore.read(digest)
  const {results, entries, reused} = declutterModule.declutterWithState(
    activities,
    {minZoom, maxZoom},
    previous
  )

  if (
    !previous ||
    reused < entries.length ||
    entries.length < previous.entries.length
  ) {
    await declutterStore.write(digest, {entries, results})
  }

  const hiddenCount = [...results.values()].filter(
    (result) => result.hidden
  ).length

  timer.setStatus(
    `${results.size - hiddenCount} shown, ${hiddenCount} hidden, ${
      entries.length - reused
    } decluttered`
  )
  timer.end()

  return results
}

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
  } = args
  const {filter = () => true} = options
  const activityNodesById = new Map(
    getNodesByType("StravaActivity").map((activity) => [activity.id, activity])
  )

  // A dev-mode refetch, the latest version of the node
  if (node) activityNodesById.set(node.id, node)

  const activities = [...activityNodesById.values()].filter(
    (activity) =>
      activity.coordinates &&
      activity.coordinates.length > 1 &&
      filter(activity)
  )
  const results = await getDeclutterResults(activities, options, args)
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
