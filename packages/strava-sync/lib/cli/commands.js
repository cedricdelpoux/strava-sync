import path from "node:path"

import {ACTIVITIES_PER_PAGE, syncActivities} from "../activities.js"
import {generateToken} from "../auth.js"
import {createClient} from "../client.js"
import {fetchActivity} from "../details.js"
import {loadEnvFiles, persistTokenToEnvFiles} from "../env.js"
import {consoleLogger} from "../logger.js"
import {countMissingRequests, reconcileActivities} from "../reconcile.js"
import {syncRoutes} from "../routes.js"
import {createFileStore} from "../store.js"
import {
  CONFIG_OPTIONS,
  DETAILS_OPTIONS,
  isActivityId,
  parseArgs,
} from "./args.js"
import {loadConfig, resolveOptions} from "./config.js"

const DETAILS_USAGE = `  --streams [types]  Add streams, comma separated, all of them when empty
  --comments         Add comments
  --kudos            Add kudos
  --laps             Add laps
  --photos[=size]    Add photos, 1800 pixels wide unless a size is given
  --zones            Add zones, needs a Strava subscription
  --all              Every detail option above`

const getSharedUsage = (
  configFile
) => `  --dir <path>       Store directory, defaults to the storeDir of the config, or .strava
  --config <path>    Config file, defaults to ${configFile}
  --no-config        Rely on the options above alone
  --help             Show this message`

const getUsages = (name, configFile) => ({
  token: `Usage: ${name} token

Asks for the Client ID and Client Secret of your Strava application, opens
Strava to authorize it, and writes STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET and
STRAVA_TOKEN to your .env files. The token can read your private activities,
your full profile, and your private routes.
`,
  activities: `Usage: ${name} activities [options]

Fetches the activities started since the last complete run and writes them to
the store. Costs one request every ${ACTIVITIES_PER_PAGE} activities, plus the
requests of the details asked.

Options:
  --after <date>     Only fetch the activities started after this date or timestamp
  --before <date>    Only fetch the activities started before this date or timestamp
${DETAILS_USAGE}
  --reconcile        Compare the whole store with the account instead: lists the
                      activities deleted on strava.com and still in the store, the
                      ones missing from it, and the ones lacking the details of
                      the config. Nothing is changed unless --write is passed
  --write            With --reconcile, delete the activities gone from Strava, add
                      the missing ones, and complete the stored ones
  --force            With --reconcile, delete them even when they are more than a
                      tenth of the store
${getSharedUsage(configFile)}
`,
  activity: `Usage: ${name} activity <activityId> [options]

Fetches one activity from Strava and replaces its file in the store, to pick up
an activity edited on strava.com or to add details to it. Never drops what an
earlier run added: asking for one stream keeps the others.

Options:
${DETAILS_USAGE}
  --refresh          Fetch the activity itself again, to pick up an edit made on
                      strava.com. Costs one request, implied the first time an
                      activity is fetched, and by --all
${getSharedUsage(configFile)}
`,
  routes: `Usage: ${name} routes [options]

Fetches your routes and writes them to the store.

Options:
  --route-streams    Fetch the full stream of each route, one request each, only
                      for the routes that are new or edited
${getSharedUsage(configFile)}
`,
})

const formatActivity = (activity, suffix = "") =>
  `  ${activity.id}  ${activity.start_date.substring(0, 10)}  ${activity.name}${suffix}`

const describeMissingDetails = (missingDetails) =>
  Object.keys(missingDetails)
    .filter((option) => option !== "streamsTypes")
    .map((option) =>
      option === "withStreams"
        ? `streams ${missingDetails.streamsTypes.join(",")}`
        : option.replace(/^with/, "").toLowerCase()
    )
    .join(", ")

const printReconcileReport = ({accountCount, deleted, missing, incomplete}) => {
  const requestCount = incomplete.reduce(
    (count, {missingDetails}) => count + countMissingRequests(missingDetails),
    0
  )

  console.log(`${accountCount} activities on Strava`)
  console.log(`${deleted.length} deleted on Strava, still in the store`)
  deleted.forEach((activity) => console.log(formatActivity(activity)))
  console.log(`${missing.length} missing from the store`)
  missing.forEach((activity) => console.log(formatActivity(activity)))
  console.log(
    `${incomplete.length} lacking what the config asks for, ` +
      `${requestCount} request${requestCount === 1 ? "" : "s"}`
  )
  incomplete.forEach(({activity, missingDetails}) =>
    console.log(
      formatActivity(activity, `  (${describeMissingDetails(missingDetails)})`)
    )
  )
}

/** Creates a client from the STRAVA_* variables of the environment and the .env files */
export const connectClient = ({waitOnRateLimit = false} = {}) => {
  loadEnvFiles()

  const {STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_TOKEN} = process.env

  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_TOKEN) {
    throw new Error(
      "Missing STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET or STRAVA_TOKEN. Run `strava-sync token` first."
    )
  }

  return createClient({
    clientId: STRAVA_CLIENT_ID,
    clientSecret: STRAVA_CLIENT_SECRET,
    token: STRAVA_TOKEN,
    onTokenRefresh: persistTokenToEnvFiles,
    waitOnRateLimit,
    logger: consoleLogger,
  })
}

const relativeToCwd = (dir) => path.relative(process.cwd(), dir) || "."

const runActivities = async (argv, {usage, loadConfigFile}) => {
  const args = parseArgs(argv, {
    options: [
      ...DETAILS_OPTIONS,
      ...CONFIG_OPTIONS,
      "after",
      "before",
      "dir",
      "force",
      "reconcile",
      "write",
    ],
  })

  if (args.help) {
    console.log(usage)

    return true
  }

  const options = await resolveOptions(args, loadConfigFile)
  const {config, storeDir} = options

  if (config) {
    console.log(`Options read from ${relativeToCwd(config.file)}`)
  }

  const client = connectClient(options)
  const store = createFileStore({dir: path.resolve(storeDir)})

  if (!args.reconcile) {
    const {fetchedCount, isTruncated} = await syncActivities({
      client,
      store,
      details: options.details,
      after: options.after,
      before: options.before,
      logger: consoleLogger,
    })

    console.log(
      `${fetchedCount} activities fetched, stored in ${relativeToCwd(path.join(storeDir, "activities"))}`
    )

    return !isTruncated
  }

  const reconcile = () =>
    reconcileActivities({
      client,
      store,
      details: options.details,
      requiredDetails: options.configDetails,
      after: options.after,
      before: options.before,
      write: args.write,
      force: args.force,
      advanceCursor: Boolean(config),
    })
  let report

  try {
    report = await reconcile()
  } catch (error) {
    if (error.report) printReconcileReport(error.report)

    throw error
  }

  printReconcileReport(report)

  if (!args.write) {
    const {deleted, missing, incomplete} = report

    if (deleted.length + missing.length + incomplete.length > 0) {
      console.log("Run again with --write to update the store")
    }

    return true
  }

  console.log(`Store updated in ${relativeToCwd(storeDir)}`)

  return true
}

const runActivity = async (argv, {usage, loadConfigFile}) => {
  const args = parseArgs(argv, {
    options: [...DETAILS_OPTIONS, ...CONFIG_OPTIONS, "refresh", "dir"],
    withActivityId: true,
  })
  const {activityId, all, details, help, refresh} = args

  if (help || !activityId) {
    console.log(usage)

    return Boolean(help)
  }

  if (!isActivityId(activityId)) {
    throw new Error(`\`${activityId}\` is not an activity id`)
  }

  const options = await resolveOptions(args, loadConfigFile)
  const client = connectClient(options)
  const store = createFileStore({dir: path.resolve(options.storeDir)})
  const existing = await store.readActivity(activityId)

  if (existing && !refresh && !all && Object.keys(details).length === 0) {
    throw new Error(
      "Nothing to fetch: pass --refresh, or an option like --streams, --photos..."
    )
  }

  // A first fetch starts from the config, so that the activity has what a
  // sync would have given it. Later ones only add what is asked.
  const activity = await fetchActivity({
    client,
    store,
    id: activityId,
    details: existing ? details : options.details,
    refresh: refresh || all,
  })

  console.log(activity.name)
  console.log(
    `Stored in ${relativeToCwd(path.join(options.storeDir, "activities"))}`
  )

  return true
}

const runRoutes = async (argv, {usage, loadConfigFile}) => {
  const args = parseArgs(argv, {
    options: [...CONFIG_OPTIONS, "dir", "route-streams"],
  })

  if (args.help) {
    console.log(usage)

    return true
  }

  const options = await resolveOptions(args, loadConfigFile)
  const {routes, fetchedCount} = await syncRoutes({
    client: connectClient(options),
    store: createFileStore({dir: path.resolve(options.storeDir)}),
    withRouteStreams: options.withRouteStreams,
    logger: consoleLogger,
  })

  console.log(
    `${routes ? routes.length : 0} routes stored, ${fetchedCount} streams fetched`
  )

  return Boolean(routes)
}

const runToken = async (argv, {usage}) => {
  if (parseArgs(argv, {options: []}).help) {
    console.log(usage)

    return true
  }

  await generateToken()

  return true
}

const RUNNERS = {
  activities: runActivities,
  activity: runActivity,
  routes: runRoutes,
  token: runToken,
}

export const COMMAND_NAMES = Object.keys(RUNNERS)

/**
 * Runs a command of the CLI. `loadConfigFile` replaces the reading of
 * `strava-sync.config.js`, `name` and `configFile` are shown in the usage.
 * @param {"token" | "activities" | "activity" | "routes"} command
 * @param {string[]} argv
 * @param {{name?: string, configFile?: string, loadConfigFile?: Function}} [options]
 * @returns {Promise<boolean>} Whether it succeeded
 */
export const runCommand = (
  command,
  argv,
  {
    name = "strava-sync",
    configFile = "strava-sync.config.js",
    loadConfigFile = loadConfig,
  } = {}
) =>
  RUNNERS[command](argv, {
    usage: getUsages(name, configFile)[command],
    loadConfigFile,
  })

// A command resolves to whether it succeeded. Exiting here, rather than
// letting node wind down, stops a command whose work is done while a socket or
// a prompt still holds the event loop.
export const exit = (done) => process.exit(done ? 0 : 1)

export const fail = (error) => {
  console.error(error.message)
  process.exit(1)
}
