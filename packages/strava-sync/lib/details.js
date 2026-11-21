import {getCoordinates} from "./coordinates.js"

const PRIMARY_PHOTO_SIZES = [100, 600, 1800]
const DEFAULT_PHOTO_SIZE = 1800
const KUDOS_PER_PAGE = 200

export const getActivityDetails = ({client, id}) =>
  client.get(`activities/${id}`, {"photo_sizes[]": PRIMARY_PHOTO_SIZES})

const getActivityStreams = async ({client, id, streamsTypes}) => {
  const payload = await client.get(`activities/${id}/streams`, {
    keys: streamsTypes,
  })
  const streams = Object.fromEntries(streamsTypes.map((type) => [type, null]))

  for (const {type, data} of payload || []) streams[type] = data

  return streams
}

const shouldFetchStreams = ({activity, withStreams}) =>
  withStreams === true ||
  (typeof withStreams === "function" && Boolean(withStreams(activity)))

/**
 * Adds to an activity everything `details` asks for. `existing`, the stored
 * activity, fills in every detail not asked for this time, and streams are
 * merged type by type, so a later call never drops what an earlier one added.
 * @param {object} options
 * @param {import("./client.js").Client} options.client
 * @param {any} options.activity
 * @param {any} [options.existing]
 * @param {any} [options.details]
 */
export const enrichActivity = async ({
  client,
  activity,
  existing = null,
  details = {},
}) => {
  const {
    streamsTypes = [],
    withComments = false,
    withKudos = false,
    withLaps = false,
    withPhotos = false,
    withStreams = false,
    withZones = false,
  } = details
  const {id} = activity
  const get = (path, query) => client.get(`activities/${id}/${path}`, query)

  const comments = withComments ? await get("comments") : existing?.comments
  const kudos = withKudos
    ? await get("kudos", {per_page: KUDOS_PER_PAGE})
    : existing?.kudos
  const laps = withLaps ? await get("laps") : existing?.laps
  const photos = withPhotos
    ? await get("photos", {
        size: typeof withPhotos === "number" ? withPhotos : DEFAULT_PHOTO_SIZE,
      })
    : existing?.photos
  const zones = withZones ? await get("zones") : existing?.zones

  const freshStreams =
    shouldFetchStreams({activity, withStreams}) && streamsTypes.length > 0
      ? await getActivityStreams({client, id, streamsTypes})
      : null
  const streams =
    freshStreams || existing?.streams
      ? {...existing?.streams, ...freshStreams}
      : null

  const coordinates = getCoordinates({map: activity.map, streams})

  // Strava puts a `{primary, count}` summary under `photos`, the name the
  // fetched list takes
  const photosSummary =
    activity.photos && !Array.isArray(activity.photos) ? activity.photos : null

  return {
    ...activity,
    ...(coordinates.length > 0 && {coordinates}),
    ...(comments && {comments}),
    ...(kudos && {kudos}),
    ...(laps && {laps}),
    ...(photosSummary && {photos_summary: photosSummary}),
    ...(photos && {photos}),
    ...(streams && {streams}),
    ...(zones && {zones}),
  }
}

/**
 * Fetches one activity and writes it to the store, with the details asked.
 * The activity itself is fetched when `refresh` is set or when the store has
 * none yet, otherwise the stored one only gets the new details.
 * @returns {Promise<any>} The stored activity
 */
export const fetchActivity = async ({
  client,
  store,
  id,
  details,
  refresh = false,
}) => {
  const existing = await store.readActivity(id)
  const activity =
    refresh || !existing ? await getActivityDetails({client, id}) : existing
  const full = await enrichActivity({client, activity, existing, details})

  await store.writeActivity(full)

  return full
}
