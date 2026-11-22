import fs from "node:fs/promises"
import path from "node:path"
import {parseArgs} from "node:util"

import {createFileStore} from "strava-sync"

import {consoleLogger} from "./logger.js"
import {declutterActivities} from "./run.js"
import {createDeclutterStore} from "./store.js"

export const USAGE = `Usage: strava-declutter [options]

Declutters the activities of a strava-sync store and writes the result to a
JSON file, an object of activity id to {hidden, reason, parts, stubs}.

Options:
  --store <path>     strava-sync store, .strava by default
  --cache <path>     Where the result is kept between runs, .strava-declutter by default
  --out <path>       Output file, declutter.json by default
  --min-zoom <n>     The lowest zoom generalized, 6 by default
  --max-zoom <n>     The highest zoom generalized, 12 by default
  --help             Show this message
`

const parseZoom = (value) => (value === undefined ? undefined : Number(value))

export const runCli = async (argv, {logger = consoleLogger} = {}) => {
  const {values} = parseArgs({
    args: argv,
    options: {
      store: {type: "string", default: ".strava"},
      cache: {type: "string", default: ".strava-declutter"},
      out: {type: "string", default: "declutter.json"},
      "min-zoom": {type: "string"},
      "max-zoom": {type: "string"},
      help: {type: "boolean"},
    },
  })

  if (values.help) return console.log(USAGE)

  const activities = await createFileStore({
    dir: path.resolve(values.store),
  }).readActivities()
  const {results} = await declutterActivities({
    activities,
    store: createDeclutterStore({dir: path.resolve(values.cache)}),
    minZoom: parseZoom(values["min-zoom"]),
    maxZoom: parseZoom(values["max-zoom"]),
    logger,
  })

  await fs.writeFile(values.out, JSON.stringify(Object.fromEntries(results)))
  logger.info(`${values.out} written`)
}
