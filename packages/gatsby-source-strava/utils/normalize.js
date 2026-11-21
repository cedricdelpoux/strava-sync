// Ids become strings on their way into a node. Gatsby matches a filter against
// the value it stored, so `upload_id: {eq: "10055306406"}` only works on strings.

// A coordinate of 16 digits or more was parsed as a BigNumber, and written to
// the store as a string, by every version before the one that turns those
// decimals back into numbers. Repairing the activities already stored would
// cost a request each, thousands of them on a long history, so they are
// coerced here instead, on their way into a node. `coordinates` is built by
// the plugin rather than read from Strava, and never caught this.
const COORDINATE_FIELDS = ["start_latlng", "end_latlng"]

// Strava uses `photos` for two shapes: the `{primary, count}` summary it puts
// on an activity, and the array of photos that `gatsby-source-strava-activity
// --photos` fetches over the top of it. Gatsby, meeting both across a store,
// drops every field of the type rather than choosing. The summary moves aside
// so that `photos` is always the list.
//
// `activity.js` keeps the two apart from now on, so this is here for the
// activities a previous version already stored under the one name.
const PHOTOS_SUMMARY_FIELD = "photos_summary"

// Strava embeds, on every lap, effort, comment and photo, a backlink to the
// activity and the athlete they belong to — the very ones being read. A long
// ride carries 240 copies of those same two ids, and the schema ends up
// offering `laps { activity { name } }`, a way round to a name sitting one
// level up.
//
// `comments[].athlete` is the exception kept: that one is whoever left the
// comment, another person entirely, not the activity's own athlete.
const REDUNDANT_ACTIVITY_FIELDS = {
  comments: ["activity_id"],
  laps: ["activity", "athlete"],
  photos: ["activity_id", "activity_name", "athlete_id"],
  segment_efforts: ["activity", "athlete"],
}

// The athlete's koms are efforts too, and carry the same two backlinks. Only
// one of them is redundant here: a kom points at whichever activity set it,
// which is the one thing the list does not otherwise say.
const REDUNDANT_ATHLETE_FIELDS = {
  koms: ["athlete"],
}

// Strava keys a photo's urls and sizes by the size asked of it — `100`,
// `600`, `1800` — and GraphQL forbids a field name starting with a digit:
// its parser rejects `100:`, and `"100":` too, before Gatsby ever sees them.
// Inference already works around it by serving them prefixed, as `_100`, so
// prefixing the key itself changes no query that already works, and is what
// lets `types.js` declare them at all.
//
// A size Strava has not used before needs nothing here: prefixed the same
// way, it reaches inference exactly as it does today.
const SIZE_KEYED_FIELDS = ["urls", "sizes"]

const prefixSizeKeys = (owner) => {
  if (!owner || typeof owner !== "object") return

  SIZE_KEYED_FIELDS.forEach((field) => {
    const sized = owner[field]

    if (!sized || typeof sized !== "object" || Array.isArray(sized)) return

    Object.keys(sized).forEach((key) => {
      if (!/^\d/.test(key)) return

      sized[`_${key}`] = sized[key]
      delete sized[key]
    })
  })
}

const toNumber = (value) =>
  typeof value === "string" && value.trim() !== "" && Number.isFinite(+value)
    ? +value
    : value

// The helpers of strava-sync are passed in, an ES module being loaded with a
// dynamic `import()` rather than `require()`
const createNormalizers = ({normalizeIds, pruneBacklinks, roundPoint}) => {
  // Everything an activity needs on its way into a node: its ids, and the
  // shapes above that a store filled over several versions can hold. Rounding
  // `coordinates` here covers the activities stored before it was rounded.
  const normalizeActivity = (activity) => {
    const normalized = normalizeIds(activity)

    if (Array.isArray(normalized.coordinates)) {
      normalized.coordinates = normalized.coordinates.map(roundPoint)
    }

    COORDINATE_FIELDS.forEach((field) => {
      if (Array.isArray(normalized[field])) {
        normalized[field] = normalized[field].map(toNumber)
      }
    })

    const {photos} = normalized

    if (photos && !Array.isArray(photos)) {
      normalized[PHOTOS_SUMMARY_FIELD] = photos
      delete normalized.photos
    }

    pruneBacklinks(normalized, REDUNDANT_ACTIVITY_FIELDS)

    const summary = normalized[PHOTOS_SUMMARY_FIELD]

    if (summary) prefixSizeKeys(summary.primary)
    if (Array.isArray(normalized.photos)) {
      normalized.photos.forEach(prefixSizeKeys)
    }

    return normalized
  }

  // The athlete needs none of the shapes above, only its ids and the backlinks
  // its koms carry
  const normalizeAthlete = (athlete) => {
    const normalized = normalizeIds(athlete)

    pruneBacklinks(normalized, REDUNDANT_ATHLETE_FIELDS)

    return normalized
  }

  return {normalizeActivity, normalizeAthlete}
}

module.exports = {createNormalizers}
