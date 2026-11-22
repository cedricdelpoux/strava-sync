# Fetching an activity again

```shell
gatsby-source-strava-activity <activityId>
```

This command is a wrapper of `strava-sync activity`, described in the [strava-sync documentation](https://github.com/cedricdelpoux/strava-sync/blob/main/packages/strava-sync/docs/fetch-activity.md): the options, `--refresh` and the streams.

It reads the plugin options from the `gatsby-config.js` of the current directory, for `storeDir` and for the first fetch of an activity, which gets the details the `activities` options ask for. `--config <path>` reads another file, and `--no-config` reads none, which is the way to go with a `gatsby-config.ts`.

A shortcut in your `package.json` leaves only the activity id to type:

```json
{
  "scripts": {
    "fetch-activity": "gatsby-source-strava-activity --streams latlng"
  }
}
```

```shell
npm run fetch-activity -- 4291234567
```

## Querying what you fetched

The added fields are not part of the types the plugin declares, Gatsby infers them from the activities that carry them. They are queryable as soon as one activity in the store holds them. Their ids are strings, like every id the plugin creates, since a segment effort id at 19 digits is past what a number holds exactly:

```graphql
{
  stravaActivity(id: {eq: "4291234567"}) {
    name
    calories
    coordinates
    gear {
      name
    }
    segment_efforts {
      name
      elapsed_time
    }
  }
}
```

A photo is keyed by its size, `_1800` by default, because GraphQL cannot name a field starting with a digit. The photos the primary photo of Strava comes with are under `photos_summary`.
