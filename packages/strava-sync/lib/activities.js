import {enrichActivity} from "./details.js"
import {silentLogger} from "./logger.js"
import {isRateLimitError} from "./rate-limit.js"
import {to10DigitTimestamp} from "./timestamp.js"

export const ACTIVITIES_PER_PAGE = 200

export const listActivitiesPage = ({client, page, after, before}) =>
  client.get("athlete/activities", {
    page,
    per_page: ACTIVITIES_PER_PAGE,
    after,
    before,
  })

// Without an `after`, Strava returns the newest activities first
export const getResumeDate = ({after, storedCount, lastFetch}) =>
  after || (storedCount > 0 && lastFetch ? to10DigitTimestamp(lastFetch) : null)

/**
 * Fetches the activities started since the last complete walk, page by page,
 * and writes each one to the store as soon as its page is complete.
 * The `lastFetch` cursor only advances after a complete walk, because it means
 * that everything older is stored.
 * @param {object} options
 * @param {import("./client.js").Client} options.client
 * @param {import("./store.js").Store} options.store
 * @param {object} [options.details] Details to fetch for each new activity
 * @param {number} [options.after] Timestamp in seconds, overrides the cursor
 * @param {number} [options.before] Timestamp in seconds
 * @param {boolean} [options.stopOnRateLimit]
 * @param {import("./client.js").Logger} [options.logger] Throws on a rate limit instead of stopping the walk
 * @returns {Promise<{activities: object[], fetchedCount: number, isTruncated: boolean}>}
 */
export const syncActivities = async ({
  client,
  store,
  details,
  after,
  before,
  stopOnRateLimit = false,
  logger = silentLogger,
}) => {
  const fetchDate = Date.now()
  const stored = await store.readActivities()
  const activitiesById = new Map(
    stored.map((activity) => [activity.id, activity])
  )
  const {lastFetch} = await store.readState()
  const resumeDate = getResumeDate({
    after,
    storedCount: stored.length,
    lastFetch,
  })
  let fetchedCount = 0
  let isTruncated = false

  logger.debug(`${stored.length} activities in the store`)

  if (resumeDate) {
    logger.debug(
      `Fetching activities since ${new Date(resumeDate * 1000).toLocaleString()}`
    )
  }

  for (let page = 1; ; page++) {
    try {
      const listed = await listActivitiesPage({
        client,
        page,
        after: resumeDate,
        before,
      })

      if (listed.length === 0) break

      const enriched = await Promise.all(
        listed.map((activity) => enrichActivity({client, activity, details}))
      )

      for (const activity of enriched) {
        activitiesById.set(activity.id, activity)

        await store.writeActivity(activity)
      }

      fetchedCount += enriched.length
    } catch (error) {
      if (!isRateLimitError(error) || stopOnRateLimit) throw error

      isTruncated = true

      logger.warn("Fetch stopped, some activities are missing")

      break
    }
  }

  if (!isTruncated) {
    await store.writeState({...(await store.readState()), lastFetch: fetchDate})
  }

  return {
    activities: [...activitiesById.values()],
    fetchedCount,
    isTruncated,
  }
}
