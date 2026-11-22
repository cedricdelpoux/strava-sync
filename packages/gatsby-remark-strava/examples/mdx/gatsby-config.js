require("dotenv").config()

module.exports = {
  plugins: [
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `posts`,
        path: `${__dirname}/content`,
      },
    },
    {
      resolve: "gatsby-plugin-mdx",
      options: {
        extensions: [".md"],
        gatsbyRemarkPlugins: [
          {
            //resolve: "gatsby-remark-strava"
            resolve: require.resolve(`../..`),
            options: {
              debug: true,
              output: "mdx",
              // Rendered by the `strava` component of src/templates/page.js
              render: ({id, name}) =>
                `<strava id="${id}" name="${name.replace(/"/g, "&quot;")}" />`,
              // Read first, so the token is only needed for an activity
              // that gatsby-source-strava has not stored
              storeDir: ".strava",
              stravaClientId: process.env.STRAVA_CLIENT_ID,
              stravaClientSecret: process.env.STRAVA_CLIENT_SECRET,
              stravaToken: process.env.STRAVA_TOKEN,
            },
          },
        ],
      },
    },
  ],
}
