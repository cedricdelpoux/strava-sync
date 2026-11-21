import {ACTIVITIES_PER_PAGE, listActivitiesPage} from "./activities.js"
import {enrichActivity} from "./details.js"

// Past this share of the store, a deletion is more likely a token that sees
// less than the one the store was built with (another athlete, or private
// activities left unchecked on the Strava authorization page) than that many
// activities deleted on strava.com
export const MAX_DELETED_SHARE = 0.1

const DETAIL_FIELDS = {
  withComments: "comments",
  withKudos: "kudos",
  withLaps: "laps",
  withPhotos: "photos",
  withZones: "zones",
}

export const isDeleteBraked = ({deletedCount, comparedCount}) =>
  deletedCount > comparedCount * MAX_DELETED_SHARE

/**
 * What `requiredDetails` asks for and the stored activity lacks, as details
 * asking for that alone, or null. A stream type counts as there once asked
 * for, even stored as null.
 */
export const getMissingDetails = (activity, requiredDetails = {}) => {
  const {streamsTypes = [], withStreams} = requiredDetails
  const streams = activity.streams || {}
  const missing = {}

  if (
    withStreams === true ||
    (typeof withStreams === "function" && withStreams(activity))
  ) {
    const missingTypes = streamsTypes.filter((type) => !(type in streams))

    if (missingTypes.length > 0) {
      missing.withStreams = true
      missing.streamsTypes = missingTypes
    }
  }

  for (const [option, field] of Object.entries(DETAIL_FIELDS)) {
    if (requiredDetails[option] && activity[field] === undefined) {
      missing[option] = requiredDetails[option]
    }
  }

  return Object.keys(missing).length > 0 ? missing : null
}

export const countMissingRequests = (missingDetails) =>
  Object.keys(missingDetails).filter((option) => option !== "streamsTypes")
    .length

export const listAccountActivities = async ({client, after, before}) => {
  const activities = []

  for (let page = 1; ; page++) {
    const listed = await listActivitiesPage({client, page, after, before})

    activities.push(...listed)

    if (listed.length < ACTIVITIES_PER_PAGE) return activities
  }
}

/**
 * Compares the store with the activities the account holds today: activities
 * deleted on strava.com, activities the incremental sync cannot see (a file
 * uploaded again keeps its original start date), and stored activities lacking
 * `requiredDetails`. Nothing is changed unless `write` is set.
 * @param {object} options
 * @param {import("./client.js").Client} options.client
 * @param {import("./store.js").Store} options.store
 * @param {any} [options.details] Details fetched for the missing activities
 * @param {any} [options.requiredDetails] Details every stored activity should hold
 * @param {number} [options.after] Timestamp in seconds
 * @param {number} [options.before] Timestamp in seconds
 * @param {boolean} [options.write]
 * @param {boolean} [options.force] Deletes even past the safety brake
 * @param {boolean} [options.advanceCursor] Moves the `lastFetch` cursor once written, only valid for a whole history
 */
export const reconcileActivities = async ({
  client,
  store,
  details,
  requiredDetails,
  after,
  before,
  write = false,
  force = false,
  advanceCursor = false,
}) => {
  const stored = await store.readActivities()
  const listDate = Date.now()
  const account = await listAccountActivities({client, after, before})

  // One outside the window was never asked for, and one right on a bound may
  // or may not be returned depending on how Strava compares it
  const isInWindow = ({start_date}) => {
    const startDate = Date.parse(start_date) / 1000

    return (!after || startDate > after) && (!before || startDate < before)
  }

  const compared = stored.filter(isInWindow)
  const accountIds = new Set(account.map(({id}) => String(id)))
  const storedIds = new Set(stored.map(({id}) => String(id)))

  const deleted = compared.filter(({id}) => !accountIds.has(String(id)))
  const missing = account.filter(({id}) => !storedIds.has(String(id)))
  const incomplete = compared
    .filter(({id}) => accountIds.has(String(id)))
    .map((activity) => ({
      activity,
      missingDetails: getMissingDetails(activity, requiredDetails),
    }))
    .filter(({missingDetails}) => missingDetails !== null)

  const report = {
    accountCount: account.length,
    deleted,
    missing,
    incomplete,
    isWritten: false,
  }

  if (!write) return report

  if (
    !force &&
    isDeleteBraked({
      deletedCount: deleted.length,
      comparedCount: compared.length,
    })
  ) {
    throw Object.assign(
      new Error(
        `Nothing written: ${deleted.length} of the ${compared.length} stored activities would be deleted. ` +
          "Check that STRAVA_TOKEN belongs to the right athlete and can read private activities, " +
          "then run again with --force to delete them anyway."
      ),
      {report}
    )
  }

  for (const {id} of deleted) await store.deleteActivity(id)

  for (const activity of missing) {
    await store.writeActivity(await enrichActivity({client, activity, details}))
  }

  // Written one by one, so that a run stopped by the rate limit picks up
  // where it left off
  for (const {activity, missingDetails} of incomplete) {
    await store.writeActivity(
      await enrichActivity({
        client,
        activity,
        existing: activity,
        details: missingDetails,
      })
    )
  }

  if (advanceCursor && !after && !before) {
    await store.writeState({...(await store.readState()), lastFetch: listDate})
  }

  return {...report, isWritten: true}
}
