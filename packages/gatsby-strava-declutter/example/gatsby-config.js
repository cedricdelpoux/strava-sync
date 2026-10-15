require("dotenv").config()

// Activities given their full `latlng` stream, since their `summary_polyline`
// is too coarse to follow the roads. Their ids are comma separated, in `.env`.
const preciseActivities = new Set(
  (process.env.PRECISE_ACTIVITIES || "").split(",").filter(Boolean)
)

module.exports = {
  plugins: [
    {
      resolve: "gatsby-source-strava",
      options: {
        stravaClientId: process.env.STRAVA_CLIENT_ID,
        stravaClientSecret: process.env.STRAVA_CLIENT_SECRET,
        stravaToken: process.env.STRAVA_TOKEN,
        debug: true,
        activities: {
          // Also read by `yarn sync-activities`, which fetches the stream of
          // the listed activities already in the store
          streamsTypes: ["latlng"],
          withStreams: (activity) => preciseActivities.has(String(activity.id)),
        },
      },
    },
    {
      resolve: require.resolve(`..`), // `gatsby-strava-declutter`
    },
  ],
}
