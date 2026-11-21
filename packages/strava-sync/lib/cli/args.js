import {toSeconds} from "../timestamp.js"

export const STREAMS_TYPES = [
  "time",
  "distance",
  "latlng",
  "altitude",
  "velocity_smooth",
  "heartrate",
  "cadence",
  "watts",
  "temp",
  "moving",
  "grade_smooth",
]

const DETAIL_FLAGS = ["comments", "kudos", "laps", "photos", "zones"]

export const DETAILS_OPTIONS = ["streams", ...DETAIL_FLAGS, "all"]
export const CONFIG_OPTIONS = ["config", "no-config"]

const FLAGS = [
  "all",
  "force",
  "help",
  "no-config",
  "reconcile",
  "refresh",
  "route-streams",
  "write",
  ...DETAIL_FLAGS,
]

export const isActivityId = (value) => /^\d+$/.test(value)

const toWithOption = (name) => `with${name[0].toUpperCase()}${name.slice(1)}`

const parseDate = (name, value) => {
  const timestamp = toSeconds(value)

  if (timestamp === null || Number.isNaN(timestamp)) {
    throw new Error(`\`--${name}\` needs a date or a timestamp`)
  }

  return timestamp
}

/**
 * A command lists the options it accepts, `--help` being always one of them,
 * and any other fails rather than being silently ignored.
 * @param {string[]} argv
 * @param {{options: string[], withActivityId?: boolean}} spec
 */
export const parseArgs = (
  argv,
  {options: accepted, withActivityId = false}
) => {
  const args = {
    activityId: undefined,
    after: null,
    all: false,
    before: null,
    configPath: null,
    details: {},
    force: false,
    help: false,
    noConfig: false,
    reconcile: false,
    refresh: false,
    routeStreams: false,
    storeDir: null,
    write: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const [name, inlineValue] = arg.startsWith("--")
      ? [arg.slice(2).split("=")[0], arg.split("=").slice(1).join("=")]
      : [null, null]
    const readValue = () => {
      if (inlineValue) return inlineValue

      const next = argv[i + 1]

      // An activity id is never an option value, so that a script holding
      // `--streams` still reads `strava-sync activity 4291234567`
      if (
        next &&
        !next.startsWith("--") &&
        !(withActivityId && isActivityId(next))
      ) {
        i++

        return next
      }

      return null
    }

    if (name === null) {
      if (!withActivityId || args.activityId !== undefined) {
        throw new Error(`Unexpected argument \`${arg}\``)
      }

      args.activityId = arg
    } else if (name !== "help" && !accepted.includes(name)) {
      throw new Error(`Unknown option \`--${name}\``)
    } else if (FLAGS.includes(name) && inlineValue && name !== "photos") {
      throw new Error(`\`--${name}\` takes no value`)
    } else if (name === "dir") {
      args.storeDir = readValue()
    } else if (name === "config") {
      args.configPath = readValue()

      if (!args.configPath) throw new Error("`--config` needs a path")
    } else if (name === "no-config") {
      args.noConfig = true
    } else if (name === "route-streams") {
      args.routeStreams = true
    } else if (name === "after" || name === "before") {
      args[name] = parseDate(name, readValue())
    } else if (name === "streams") {
      const types = readValue()

      args.details.withStreams = true
      args.details.streamsTypes = types ? types.split(",") : STREAMS_TYPES
    } else if (name === "photos") {
      // Only `--photos=600` carries the size: a bare number after an option
      // is an activity id
      if (inlineValue && !/^\d+$/.test(inlineValue)) {
        throw new Error(`\`--photos=${inlineValue}\` is not a photo size`)
      }

      args.details.withPhotos = inlineValue ? Number(inlineValue) : true
    } else if (name === "all") {
      args.all = true
      args.details.withStreams = true
      args.details.streamsTypes = STREAMS_TYPES
      DETAIL_FLAGS.forEach((option) => {
        args.details[toWithOption(option)] = true
      })
    } else if (DETAIL_FLAGS.includes(name)) {
      args.details[toWithOption(name)] = true
    } else {
      args[name] = true
    }
  }

  return args
}
