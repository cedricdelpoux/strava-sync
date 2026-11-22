const path = require("path")

const {createLimiter} = require("./create-limiter.js")

// Gatsby runs the plugin on every document at once: without a limit, a site
// with many embeds opens as many connections to Strava at the same time
const MAX_CONCURRENT_REQUESTS = 4

const sessions = new Map()

const createSession = async ({storeDir = ".strava"}) => {
  const {createClient, createFileStore, getActivityDetails} =
    await import("strava-sync")

  return {
    createClient,
    getActivityDetails,
    store: createFileStore({dir: path.resolve(process.cwd(), storeDir)}),
    limit: createLimiter(MAX_CONCURRENT_REQUESTS),
    client: null,
  }
}

// One per store, so that every document shares the same client and its
// refreshed token
const getSession = (options) => {
  const key = `${options.storeDir}:${options.stravaClientId}`

  if (!sessions.has(key)) {
    const session = createSession(options).catch((error) => {
      sessions.delete(key)
      throw error
    })

    sessions.set(key, session)
  }

  return sessions.get(key)
}

const getClient = (session, options) => {
  const {stravaClientId, stravaClientSecret, stravaToken} = options

  if (!stravaClientId || !stravaClientSecret || !stravaToken) {
    return null
  }

  session.client ||= session.createClient({
    clientId: stravaClientId,
    clientSecret: stravaClientSecret,
    token: stravaToken,
  })

  return session.client
}

exports.getActivity = async ({id, options, cache}) => {
  const session = await getSession(options)
  const stored = await session.store.readActivity(id)

  if (stored) {
    return stored
  }

  const cacheKey = `activity:${id}`
  const cached = await cache.get(cacheKey)

  if (cached) {
    return cached
  }

  const client = getClient(session, options)

  if (!client) {
    throw new Error(
      `Activity ${id} is not in the store, and fetching it needs the \`stravaClientId\`, \`stravaClientSecret\` and \`stravaToken\` options`
    )
  }

  const activity = await session.limit(() =>
    session.getActivityDetails({client, id})
  )

  await cache.set(cacheKey, activity)

  return activity
}
