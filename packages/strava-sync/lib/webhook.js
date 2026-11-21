import {fetchActivity} from "./details.js"
import {silentLogger} from "./logger.js"

const toParams = (query) =>
  query instanceof URLSearchParams ? Object.fromEntries(query) : query

/**
 * Answers Strava's subscription challenge.
 * @param {any} query The query string of the GET request
 * @param {{verifyToken: string}} options
 * @returns {{"hub.challenge": string} | null} The JSON body to answer with, or null when the request is not a valid challenge
 */
export const verifyChallenge = (query, {verifyToken}) => {
  const params = toParams(query)

  if (
    params["hub.mode"] !== "subscribe" ||
    !verifyToken ||
    params["hub.verify_token"] !== verifyToken ||
    !params["hub.challenge"]
  ) {
    return null
  }

  return {"hub.challenge": params["hub.challenge"]}
}

/**
 * Applies a webhook event to the store: an activity created or updated is
 * fetched and written, a deleted one is removed, and an athlete who revoked
 * the access calls `onDeauthorize`.
 * @param {object} options
 * @param {any} options.event The JSON body of the POST request
 * @param {import("./client.js").Client} options.client
 * @param {import("./store.js").Store} options.store
 * @param {object} [options.details] Details fetched for an activity
 * @param {(event: object) => void | Promise<void>} [options.onDeauthorize]
 * @param {string | number} [options.ownerId]
 * @param {import("./client.js").Logger} [options.logger] Ignores the events of any other athlete
 * @returns {Promise<{action: "upserted" | "deleted" | "deauthorized" | "ignored"}>}
 */
export const handleEvent = async ({
  event,
  client,
  store,
  details,
  onDeauthorize,
  ownerId,
  logger = silentLogger,
}) => {
  const {object_type, object_id, aspect_type, owner_id, updates} = event || {}

  if (ownerId !== undefined && String(owner_id) !== String(ownerId)) {
    return {action: "ignored"}
  }

  if (object_type === "athlete") {
    if (!updates || updates.authorized !== "false") return {action: "ignored"}

    if (onDeauthorize) await onDeauthorize(event)

    return {action: "deauthorized"}
  }

  if (object_type !== "activity" || !/^\d+$/.test(String(object_id))) {
    return {action: "ignored"}
  }

  if (aspect_type === "delete") {
    await store.deleteActivity(object_id)

    logger.info(`Activity ${object_id} deleted`)

    return {action: "deleted"}
  }

  if (aspect_type === "create" || aspect_type === "update") {
    await fetchActivity({
      client,
      store,
      id: object_id,
      details,
      refresh: true,
    })

    logger.info(`Activity ${object_id} ${aspect_type}d`)

    return {action: "upserted"}
  }

  return {action: "ignored"}
}
