import {getRouteId, normalizeRoute} from "strava-sync"

/**
 * The routes of a strava-sync store with their `coordinates`, from the stream
 * of each one when it is stored and up to date, from its summary otherwise.
 * @param {{
 *   readRoutes: () => Promise<any[] | null>,
 *   readRouteStream: (id: string) => Promise<any | null>,
 * }} store
 */
export const readRoutes = async (store) => {
  const routes = (await store.readRoutes()) || []

  return Promise.all(
    routes.map(async (route) => {
      const stored = await store.readRouteStream(getRouteId(route))
      const isStreamCurrent = stored && stored.updated_at === route.updated_at

      return normalizeRoute(
        isStreamCurrent ? {...route, streams: {latlng: stored.latlng}} : route
      )
    })
  )
}
