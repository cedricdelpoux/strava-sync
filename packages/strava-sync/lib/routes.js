import {getCoordinates} from "./coordinates.js"
import {silentLogger} from "./logger.js"
import {normalizeIds} from "./normalize.js"
import {isRateLimitError} from "./rate-limit.js"

const ROUTES_PER_PAGE = 200

export const fetchRoutes = async ({client}) => {
  const routes = []

  for (let page = 1; ; page++) {
    const routesPage =
      (await client.get("athlete/routes", {page, per_page: ROUTES_PER_PAGE})) ||
      []

    routes.push(...routesPage)

    if (routesPage.length < ROUTES_PER_PAGE) return routes
  }
}

// A route id has 19 digits, `id` loses precision where `id_str` does not
export const getRouteId = (route) => route.id_str || String(route.id)

// The stream has a point at every turn and at least one every 100 m, where
// `summary_polyline` keeps one every 300 m or so
const fetchRouteLatlng = async ({client, routeId}) => {
  const streams = await client.get(`routes/${routeId}/streams`)
  const latlng = (streams || []).find(({type}) => type === "latlng")

  return latlng ? latlng.data : []
}

const shouldFetchStream = ({route, withRouteStreams}) =>
  withRouteStreams === true ||
  (typeof withRouteStreams === "function" && Boolean(withRouteStreams(route)))

/**
 * Adds a `streams.latlng` to the routes `withRouteStreams` selects. A stored
 * stream is reused as long as its route keeps its `updated_at`. A stream that
 * cannot be fetched leaves its route with `summary_polyline`.
 */
export const addRouteStreams = async ({
  client,
  routes,
  store,
  withRouteStreams,
  stopOnRateLimit = false,
  logger = silentLogger,
}) => {
  const routesWithStreams = []
  let fetchedCount = 0
  let skippedCount = 0
  let isRateLimited = false

  for (const route of routes) {
    if (!shouldFetchStream({route, withRouteStreams})) {
      routesWithStreams.push(route)
      continue
    }

    const routeId = getRouteId(route)
    const stored = await store.readRouteStream(routeId)
    let latlng =
      stored && stored.updated_at === route.updated_at ? stored.latlng : null

    if (!latlng && !isRateLimited) {
      try {
        latlng = await fetchRouteLatlng({client, routeId})

        fetchedCount++

        await store.writeRouteStream(routeId, {
          updated_at: route.updated_at,
          latlng,
        })
      } catch (error) {
        if (isRateLimitError(error)) {
          if (stopOnRateLimit) throw error

          isRateLimited = true
        } else {
          logger.warn(
            `Stream of route ${routeId} not fetched, using its summary: ${error.message}`
          )
        }
      }
    }

    if (!latlng && isRateLimited) skippedCount++

    routesWithStreams.push(
      latlng && latlng.length > 0 ? {...route, streams: {latlng}} : route
    )
  }

  if (skippedCount > 0) {
    logger.warn(
      `${skippedCount} route streams not fetched, using their summary`
    )
  }

  return {routes: routesWithStreams, fetchedCount}
}

/**
 * Lists the routes, writes them to the store, and fetches their streams.
 * Falls back to the stored routes when the list cannot be fetched.
 * @returns {Promise<{routes: object[] | null, fetchedCount: number}>}
 */
export const syncRoutes = async ({
  client,
  store,
  withRouteStreams = false,
  stopOnRateLimit = false,
  logger = silentLogger,
}) => {
  let routes

  try {
    routes = await fetchRoutes({client})

    await store.writeRoutes(routes)
  } catch (error) {
    if (isRateLimitError(error) && stopOnRateLimit) throw error

    if (!isRateLimitError(error) && error.code !== "network") throw error

    logger.warn(error.message)

    routes = await store.readRoutes()

    logger.warn(
      routes
        ? "Routes not fetched, using the stored ones"
        : "Routes not fetched"
    )
  }

  if (!routes || !withRouteStreams) return {routes, fetchedCount: 0}

  return addRouteStreams({
    client,
    routes,
    store,
    withRouteStreams,
    stopOnRateLimit,
    logger,
  })
}

// `streams` only feeds `coordinates`
export const normalizeRoute = ({streams, ...route}) => {
  const coordinates = getCoordinates({map: route.map, streams})

  return {
    ...normalizeIds(route),
    id: getRouteId(route),
    ...(coordinates.length > 0 && {coordinates}),
  }
}
