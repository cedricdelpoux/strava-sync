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
      resolve: "gatsby-transformer-remark",
      options: {
        plugins: [
          {
            //resolve: "gatsby-remark-strava"
            resolve: require.resolve(`../..`),
            options: {
              debug: true,
            },
          },
        ],
      },
    },
  ],
}
