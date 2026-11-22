# Store

Fetching a whole Strava history takes minutes and hundreds of requests, so `strava-sync` keeps it on disk and only fetches what is new on the next runs.

```
.strava/
├── activities/
│   ├── 4291234567.json
│   └── 4291234568.json
├── athlete.json
├── route-streams/
│   └── 3549024706549908168.json
├── routes.json
└── state.json
```

There is one file per activity, named after its id, plus a `state.json` holding the timestamp of the last complete fetch. `athlete.json` and `routes.json` keep the last athlete and routes fetched, for a run that cannot reach Strava because of a network error or a [rate limit](./rate-limits.md). `route-streams/` holds the full track of each route, along with the `updated_at` of the route it was fetched for. A route edited on Strava gets its track fetched again, the others never do.

The directory is yours: nothing but you empties it. Add it to your `.gitignore`, or commit it to give your continuous integration a full history without spending a single request. The `storeDir` option, or the `--dir` flag, puts it somewhere else.

## Why not the cache of a framework

Frameworks empty their cache whenever a dependency changes or their configuration is edited, and a continuous integration job usually starts without one. Adding a dependency to your site would then cost a complete refetch of your history, against a quota of 1000 requests a day. A framework cache is meant for data you can afford to lose, which this is not.

## Incremental fetch

The first run fetches the whole history, then writes the cursor to `state.json`. The next runs read the activities from the store and only ask Strava for the ones started after the cursor.

The cursor is only written once the whole history has been walked through. A fetch interrupted by a [rate limit](./rate-limits.md) keeps the activities it managed to fetch, leaves the cursor where it was, and the next run resumes from there.

The `after` and `before` options take over the cursor, so a run configured with them never uses the incremental fetch.

## Activities changed on Strava

`strava-sync` never asks Strava again for an activity older than the cursor, so an activity edited after it was stored keeps the version it had when it was fetched, and an activity deleted on Strava stays in the store.

Deleting a single file does not bring it back either, since it is older than the cursor. Use [`strava-sync activity`](./fetch-activity.md), which fetches one activity and replaces its file, or delete the whole directory to start over.

[`strava-sync activities --reconcile`](./sync-activities.md) takes care of the deleted activities, and of the ones uploaded again, which get a new id but keep a start date older than the cursor.

## A custom store

Any object with the same methods as `createFileStore` is a store: `readActivities`, `readActivity`, `writeActivity`, `deleteActivity`, `readState`, `writeState`, `readAthlete`, `writeAthlete`, `readRoutes`, `writeRoutes`, `readRouteStream` and `writeRouteStream`. A database store can be plugged in that way.
