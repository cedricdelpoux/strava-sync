import fs from "node:fs"
import path from "node:path"
import {pathToFileURL} from "node:url"

import {toSeconds} from "../timestamp.js"

const CONFIG_FILES = [
  "strava-sync.config.js",
  "strava-sync.config.mjs",
  "strava-sync.config.cjs",
]

/**
 * Reads `strava-sync.config.js`, or the file `--config` points to:
 * `{storeDir, after, before, details, withRouteStreams, waitOnRateLimit}`.
 * Returns null when there is none.
 */
export const loadConfig = async (
  /** @type {{configPath?: string}} */ {configPath} = {}
) => {
  const file = configPath
    ? path.resolve(configPath)
    : CONFIG_FILES.map((name) => path.resolve(name)).find(fs.existsSync)

  if (!file) return null

  if (!fs.existsSync(file)) throw new Error(`${configPath} does not exist`)

  let exported

  try {
    exported = (await import(pathToFileURL(file).href)).default
  } catch (error) {
    throw new Error(
      `Could not read ${path.basename(file)}: ${error.message}\n` +
        "Pass --no-config to rely on the command line options alone.",
      {cause: error}
    )
  }

  const bounds = {
    after: toSeconds(exported.after),
    before: toSeconds(exported.before),
  }

  for (const [name, value] of Object.entries(bounds)) {
    if (Number.isNaN(value)) {
      throw new Error(`\`${name}\` of ${path.basename(file)} is not a date`)
    }
  }

  return {
    ...exported,
    ...bounds,
    file,
    storeDir: path.resolve(path.dirname(file), exported.storeDir || ".strava"),
  }
}

// The config options with the command line ones on top: a detail option adds
// to the config or overrides it, as do `--after`, `--before` and `--dir`
export const resolveOptions = async (args, loadConfigFile = loadConfig) => {
  const config = args.noConfig
    ? null
    : await loadConfigFile({configPath: args.configPath})

  return {
    after: args.after || config?.after,
    before: args.before || config?.before,
    config,
    configDetails: config?.details || {},
    details: {...config?.details, ...args.details},
    storeDir: args.storeDir || config?.storeDir || ".strava",
    waitOnRateLimit: Boolean(config?.waitOnRateLimit),
    withRouteStreams: args.routeStreams || config?.withRouteStreams || false,
  }
}
