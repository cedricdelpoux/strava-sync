# Store

The store is owned by [strava-sync](https://github.com/cedricdelpoux/strava-sync/blob/main/packages/strava-sync/docs/store.md), which describes its layout, the incremental fetch and what to do about activities changed on Strava.

Here, the directory sits next to your `gatsby-config.js`, and the `storeDir` option puts it somewhere else:

```js
module.exports = {
  plugins: [
    {
      resolve: "gatsby-source-strava",
      options: {
        storeDir: ".strava",
      },
    },
  ],
}
```

Until 3.0.0 the activities were kept in the Gatsby cache. They are moved to the store on the first build, so upgrading does not refetch anything.

## Watching for changes in `gatsby develop`

While `gatsby develop` is running, the plugin watches `activities/` for changes made outside of it, typically `gatsby-source-strava-activity` refetching one activity in another terminal. On any change, it replays every activity from the store. This is cheap, since it only reads local files and makes no Strava request. There is nothing to configure, and it never runs during `gatsby build`.

## Fetching only a part of the history

The `after` and `before` options take over the cursor, so a site configured with them never uses the incremental fetch. See the [options](./options.md#activities).
