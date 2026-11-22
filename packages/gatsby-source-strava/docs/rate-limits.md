# Rate limits

What Strava allows, and how a sync stops or waits, is described in the [strava-sync documentation](https://github.com/cedricdelpoux/strava-sync/blob/main/packages/strava-sync/docs/rate-limits.md).

In this plugin, the two behaviors are options of `gatsby-source-strava`:

```js
module.exports = {
  plugins: [
    {
      resolve: "gatsby-source-strava",
      options: {
        waitOnRateLimit: true,
        stopOnRateLimit: true,
      },
    },
  ],
}
```

- `waitOnRateLimit` waits for the short limit to reset instead of stopping the build with partial data.
- `stopOnRateLimit` fails the build instead of building a site with partial data.

The `with` options of the activities each cost one request per activity, see the cost in the strava-sync documentation above.
