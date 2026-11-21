const path = require("path")

const {createNormalizers} = require("./utils/normalize.js")
const {restoreFromGatsbyCache} = require("./utils/restore-cache.js")
const {types} = require("./utils/types.js")
const {watchStore} = require("./utils/watch.js")

const createLogger = ({reporter, debug}) => ({
  debug: (message) => debug && reporter.info(`source-strava: ${message}`),
  info: (message) => reporter.info(`source-strava: ${message}`),
  warn: (message) => reporter.warn(`source-strava: ${message}`),
})

exports.createSchemaCustomization = ({actions}) => {
  actions.createTypes(types)
}

exports.sourceNodes = async (
  {actions, createContentDigest, reporter, cache, store, getNode},
  pluginOptions = {}
) => {
  if (!pluginOptions.stravaClientId) {
    reporter.warn("source-strava: Missing `stravaClientId` option")
    return
  }

  if (!pluginOptions.stravaClientSecret) {
    reporter.warn("source-strava: Missing `stravaClientSecret` option")
    return
  }

  if (!pluginOptions.stravaToken) {
    reporter.warn("source-strava: Missing `stravaToken` option")
    return
  }

  try {
    const stravaSync = await import("strava-sync")
    const {
      createClient,
      createFileStore,
      fetchAthlete,
      isRateLimitError,
      normalizeRoute,
      syncActivities,
      syncRoutes,
    } = stravaSync
    const {normalizeActivity, normalizeAthlete} = createNormalizers(stravaSync)
    const logger = createLogger({reporter, debug: pluginOptions.debug})
    const {stopOnRateLimit} = pluginOptions
    const activitiesOptions = pluginOptions.activities || {}
    const client = createClient({
      clientId: pluginOptions.stravaClientId,
      clientSecret: pluginOptions.stravaClientSecret,
      token: pluginOptions.stravaToken,
      waitOnRateLimit: pluginOptions.waitOnRateLimit === true,
      logger,
    })

    // Kept out of the Gatsby cache, which Gatsby empties on its own
    const {directory} = store.getState().program
    const storeDir = path.resolve(
      directory,
      pluginOptions.storeDir || ".strava"
    )
    const stravaStore = createFileStore({dir: storeDir})

    // The activity is normalized before `extend` runs, so that a site adding
    // its own fields reads it in the shape it will query it in, and so that
    // whatever it adds passes through untouched
    const createActivityNode = async (activity) => {
      const normalized = normalizeActivity(activity)

      if (pluginOptions.activities && pluginOptions.activities.extend) {
        pluginOptions.activities.extend({activity: normalized})
      }

      await actions.createNode({
        ...normalized,
        id: normalized.id.toString(),
        internal: {
          type: "StravaActivity",
          contentDigest: createContentDigest(normalized),
        },
      })
    }

    if ((await stravaStore.readActivities()).length === 0) {
      const movedCount = await restoreFromGatsbyCache({
        cache,
        store: stravaStore,
      })

      if (movedCount > 0) {
        reporter.info(
          `source-strava: ${movedCount} activities moved to ${path.relative(process.cwd(), storeDir)}`
        )
      }
    }

    const {activities, fetchedCount} = await syncActivities({
      client,
      store: stravaStore,
      details: activitiesOptions,
      after: activitiesOptions.after,
      before: activitiesOptions.before,
      stopOnRateLimit,
      logger,
    })

    if (activities && activities.length > 0) {
      for (const activity of activities) {
        await createActivityNode(activity)
      }

      reporter.success(`source-strava: ${fetchedCount} new activities fetched`)
    }

    // `gatsby-source-strava-activity`, refetching one activity while the dev
    // server is running, would otherwise need a full restart to show up
    if (store.getState().program._[0] === "develop") {
      watchStore({
        store: stravaStore,
        actions,
        createActivityNode,
        getNode,
        reporter,
      })
    }

    const {withRoutes, withRouteStreams} = pluginOptions.athlete || {}
    let routes = null

    if (withRoutes) {
      const synced = await syncRoutes({
        client,
        store: stravaStore,
        withRouteStreams,
        stopOnRateLimit,
        logger,
      })

      routes = synced.routes

      if (routes) {
        reporter.success(`source-strava: ${routes.length} routes fetched`)
      }

      if (synced.fetchedCount > 0) {
        reporter.success(
          `source-strava: ${synced.fetchedCount} route streams fetched`
        )
      }
    }

    const normalizedRoutes = routes ? routes.map(normalizeRoute) : null

    if (normalizedRoutes) {
      for (const route of normalizedRoutes) {
        await actions.createNode({
          ...route,
          internal: {
            type: "StravaRoute",
            contentDigest: createContentDigest(route),
          },
        })
      }
    }

    let athlete = null

    try {
      athlete = await fetchAthlete({client, details: pluginOptions.athlete})
    } catch (e) {
      if (!isRateLimitError(e) || stopOnRateLimit) throw e
    }

    if (athlete) {
      await stravaStore.writeAthlete(athlete)
    } else {
      athlete = await stravaStore.readAthlete()

      if (athlete) {
        reporter.warn(
          "source-strava: Athlete not fetched, using cached version"
        )
      } else {
        reporter.warn("source-strava: Athlete not fetched")
        return
      }
    }

    const normalizedAthlete = normalizeAthlete(athlete)

    // An athlete stored by an earlier version still holds the raw routes
    delete normalizedAthlete.routes

    if (normalizedRoutes) {
      normalizedAthlete.routes = normalizedRoutes
    }

    if (pluginOptions.athlete && pluginOptions.athlete.extend) {
      // The activities are normalized here rather than upfront, so that a
      // site not using this option pays nothing for it
      pluginOptions.athlete.extend({
        activities: activities ? activities.map(normalizeActivity) : activities,
        athlete: normalizedAthlete,
      })
    }

    // `extend` gets the routes whole, the node only links to them
    if (normalizedAthlete.routes) {
      normalizedAthlete.routes = normalizedAthlete.routes.map(({id}) => id)
    }

    await actions.createNode({
      ...normalizedAthlete,
      id: normalizedAthlete.id.toString(),
      internal: {
        type: "StravaAthlete",
        contentDigest: createContentDigest(normalizedAthlete),
      },
    })

    reporter.success(`source-strava: athlete fetched`)
  } catch (e) {
    if (pluginOptions.debug) {
      reporter.panic(`source-strava: `, e)
    } else {
      reporter.panic(`source-strava: ${e.message}`)
    }
  }
}
