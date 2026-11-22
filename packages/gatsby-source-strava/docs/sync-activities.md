# Syncing the activities with Strava

```shell
gatsby-source-strava-activities
```

This command is a wrapper of `strava-sync activities --reconcile`, described in the [strava-sync documentation](https://github.com/cedricdelpoux/strava-sync/blob/main/packages/strava-sync/docs/sync-activities.md): the lists it prints, `--write`, `--force` and the options.

It reads the plugin options from the `gatsby-config.js` of the current directory (`.cjs` and `.mjs` work too), and uses them the way a build would:

- A missing activity gets the details the `activities` options ask for, a `withStreams` function included.
- The comparison stays within the `after` and `before` options, so that the activities a site leaves out on purpose are not listed as missing.
- The store is the one `storeDir` names.

The command line options come on top: a detail option adds to the plugin options, and `--after`, `--before` and `--dir` override them. `--config <path>` reads another file, and `--no-config` reads none. That is the way to go with a `gatsby-config.ts`, which only Gatsby knows how to load.

While `gatsby develop` is running, the change shows up without a restart, see [watching for changes](./store.md#watching-for-changes-in-gatsby-develop).

A site keeps some activities more precise than others with a `withStreams` function:

```js
const preciseActivities = new Set(require("./precise-activities.json"))

module.exports = {
  plugins: [
    {
      resolve: "gatsby-source-strava",
      options: {
        activities: {
          withStreams: (activity) => preciseActivities.has(String(activity.id)),
          streamsTypes: ["latlng"],
        },
      },
    },
  ],
}
```

A build fetches the stream of the listed activities it sources, and `gatsby-source-strava-activities --write` the stream of the ones already in the store.
