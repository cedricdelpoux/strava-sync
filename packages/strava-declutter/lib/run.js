import crypto from "node:crypto"
import fs from "node:fs"

import {declutterWithState} from "./declutter.js"
import {silentLogger} from "./logger.js"

// Part of the digest, since the declutter can change under the same version,
// in development or when linked
const declutterSource = fs.readFileSync(
  new URL("./declutter.js", import.meta.url),
  "utf8"
)

const getDigest = (minZoom, maxZoom) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify([declutterSource, minZoom, maxZoom]))
    .digest("hex")

const hasTrack = ({coordinates}) => coordinates && coordinates.length > 1

/**
 * @typedef {object} DeclutterActivity
 * @property {string | number} id
 * @property {string} start_date
 * @property {number[][]} coordinates  `[lng, lat]` points
 */

/**
 * @typedef {object} DeclutterResult
 * @property {boolean} hidden
 * @property {string | null} reason
 * @property {number[][][]} [parts]
 * @property {{hideUntil: number, showUntil: number, coordinates: number[][]}[]} [stubs]
 */

/**
 * Declutters the activities with a track, reusing what a previous run kept in
 * the store for the activities that did not change.
 * @param {object} options
 * @param {DeclutterActivity[]} options.activities
 * @param {ReturnType<typeof import("./store.js").createDeclutterStore>} [options.store]
 * @param {(activity: any) => boolean} [options.filter]
 * @param {number} [options.minZoom]
 * @param {number} [options.maxZoom]
 * @param {import("./logger.js").Logger} [options.logger]
 * @returns {Promise<{results: Map<string | number, DeclutterResult>, shownCount: number, hiddenCount: number, declutteredCount: number}>}
 */
export const declutterActivities = async ({
  activities,
  store,
  filter = () => true,
  minZoom,
  maxZoom,
  logger = silentLogger,
}) => {
  const compared = activities.filter(
    (activity) => hasTrack(activity) && filter(activity)
  )
  const digest = getDigest(minZoom, maxZoom)
  const previous = store ? await store.read(digest) : null
  const {results, entries, reused} = declutterWithState(
    compared,
    {minZoom, maxZoom},
    previous
  )

  if (
    store &&
    (!previous ||
      reused < entries.length ||
      entries.length < previous.entries.length)
  ) {
    await store.write(digest, {entries, results})
  }

  const hiddenCount = [...results.values()].filter(
    (result) => result.hidden
  ).length
  const declutteredCount = entries.length - reused
  const shownCount = results.size - hiddenCount

  logger.info(
    `${shownCount} shown, ${hiddenCount} hidden, ${declutteredCount} decluttered`
  )

  return {results, shownCount, hiddenCount, declutteredCount}
}
