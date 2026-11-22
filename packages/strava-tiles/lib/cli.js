import fs from "node:fs/promises"
import path from "node:path"
import {parseArgs} from "node:util"

import {createFileStore} from "strava-sync"

import {computeTiles} from "./compute.js"
import {consoleLogger} from "./logger.js"
import {readRoutes} from "./routes.js"

export const USAGE = `Usage: strava-tiles [options]

Computes the tiles of the activities and routes of a strava-sync store and
writes them to a JSON file, an object with the tiles of each activity by id,
the tiles of the athlete, and the tiles of each route by id.

Options:
  --store <path>     strava-sync store, .strava by default
  --out <path>       Output file, tiles.json by default
  --routes           Include the tiles of the routes
  --help             Show this message
`

export const runCli = async (argv, {logger = consoleLogger} = {}) => {
  const {values} = parseArgs({
    args: argv,
    options: {
      store: {type: "string", default: ".strava"},
      out: {type: "string", default: "tiles.json"},
      routes: {type: "boolean"},
      help: {type: "boolean"},
    },
  })

  if (values.help) return console.log(USAGE)

  const store = createFileStore({dir: path.resolve(values.store)})
  const {activityTiles, athleteTiles, routeTiles} = computeTiles({
    activities: await store.readActivities(),
    routes: values.routes ? await readRoutes(store) : [],
    logger,
  })

  await fs.writeFile(
    values.out,
    JSON.stringify({
      activities: Object.fromEntries(activityTiles),
      athlete: athleteTiles,
      routes: Object.fromEntries(routeTiles),
    })
  )
  logger.info(`${values.out} written`)
}
