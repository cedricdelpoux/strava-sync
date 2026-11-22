import {getActivityTiles} from "./activity.js"
import {getAthleteTiles} from "./athlete.js"
import {silentLogger} from "./logger.js"
import {getRouteTiles} from "./route.js"
import {distinctTiles} from "./tiles.js"

// New tiles only make sense in chronological order, which Strava doesn't
// guarantee
const byStartDate = (a, b) =>
  a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0

/**
 * @typedef {{x: number, y: number}} Tile
 */

/**
 * The tiles each activity was the first to cover, the coverage of the athlete
 * over the whole history and month by month, and the tiles of each route, new
 * or not.
 * @param {object} options
 * @param {{id: string | number, start_date: string, coordinates?: number[][], streams?: any}[]} options.activities
 *   As strava-sync stores them. Those without `coordinates` are left out
 * @param {{id: string | number, coordinates?: number[][]}[]} [options.routes]
 * @param {import("./logger.js").Logger} [options.logger]
 * @returns {{
 *   activityTiles: Map<string | number, Tile[]>,
 *   athleteTiles: ReturnType<typeof getAthleteTiles>,
 *   routeTiles: Map<string | number, {all: Tile[], new: Tile[]}>,
 *   coveredTiles: Tile[],
 * }}
 */
export const computeTiles = ({
  activities,
  routes = [],
  logger = silentLogger,
}) => {
  const activityTiles = new Map()
  const tilesByMonth = {}
  const coveredTiles = []

  activities
    .filter(({coordinates}) => coordinates && coordinates.length > 0)
    .sort(byStartDate)
    .forEach((activity) => {
      const newTiles = getActivityTiles(activity, coveredTiles)
      const yearMonth = activity.start_date.substring(0, 7)

      activityTiles.set(activity.id, newTiles)

      if (!tilesByMonth[yearMonth]) {
        tilesByMonth[yearMonth] = {old: [...coveredTiles], new: []}
      }
      tilesByMonth[yearMonth].new.push(...newTiles)

      coveredTiles.push(...newTiles)
    })

  const isNewTile = distinctTiles(coveredTiles)
  const routeTiles = new Map(
    routes.map((route) => [route.id, getRouteTiles(route, isNewTile)])
  )

  logger.info(
    `${coveredTiles.length} tiles covered by ${activityTiles.size} activities`
  )

  return {
    activityTiles,
    athleteTiles: getAthleteTiles(coveredTiles, tilesByMonth),
    routeTiles,
    coveredTiles,
  }
}
