# strava-sync

[![Npm][badge-npm]][npm]
[![Build Status][badge-build]][actions]
[![MIT license][badge-licence]](./LICENCE.md)

`strava-sync` keeps a local copy of your [Strava](https://www.strava.com/) activities and routes up to date, within the rate limits.

It powers [gatsby-source-strava](https://github.com/cedricdelpoux/strava-sync/tree/master/packages/gatsby-source-strava), and it works without Gatsby too, for any static site generator or script.

Strava allows 100 requests every 15 minutes and 1000 a day. A history fetched over and over burns that quota, so `strava-sync` fetches each activity once, writes it to a store you own, and only asks Strava for what is new.

## Features

- Incremental sync: only the activities started since the last complete run are fetched
- Rate limits: reads the read limit headers, waits for the next quarter hour on the short limit, never waits on the daily one
- Details per activity: laps, comments, kudos, photos, zones and streams at full resolution
- Additive updates: fetching one more detail never drops what an earlier run stored
- Reconciliation with the account: activities deleted on strava.com, missed or incomplete ones, with a safety brake on mass deletions
- Routes, with their full stream cached until the route is edited
- Token refresh that you can persist, and a default that rewrites your `.env` files
- Webhook helpers that work with any HTTP framework
- A pluggable store, with one JSON file per activity by default

## Installation

```shell
npm install strava-sync
```

Node 22.12 or later is required. The package is an ES module, which `require()` loads too, and it comes with its TypeScript types.

## Command line

Generate a token first. It asks for the Client ID and Secret of your [Strava application](https://www.strava.com/settings/api), opens Strava to authorize it, and writes `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` and `STRAVA_TOKEN` to your `.env` files:

```shell
npx strava-sync token
```

Then:

```shell
npx strava-sync activities                 # fetch what is new
npx strava-sync activities --after 2026-01-01 --streams latlng
npx strava-sync activities --reconcile     # compare the store with the account
npx strava-sync activities --reconcile --write
npx strava-sync activity 4291234567 --streams --refresh
npx strava-sync routes --route-streams
```

Run a command with `--help` to list its options. Options can also come from a `strava-sync.config.js`, the flags of the command line adding to it or overriding it:

```js
export default {
  storeDir: ".strava",
  after: "2026-01-01",
  details: {
    withStreams: true,
    streamsTypes: ["latlng", "time"],
    withLaps: true,
  },
  withRouteStreams: true,
  waitOnRateLimit: false,
}
```

`withStreams` and `withRouteStreams` also take a function, which receives the activity or the route and returns whether to fetch its streams.

## Usage

```js
import {
  createClient,
  createFileStore,
  persistTokenToEnvFiles,
  syncActivities,
} from "strava-sync"

const client = createClient({
  clientId: process.env.STRAVA_CLIENT_ID,
  clientSecret: process.env.STRAVA_CLIENT_SECRET,
  token: process.env.STRAVA_TOKEN,
  onTokenRefresh: persistTokenToEnvFiles,
  waitOnRateLimit: true,
})
const store = createFileStore({dir: ".strava"})

const {activities, fetchedCount} = await syncActivities({
  client,
  store,
  details: {withLaps: true, withStreams: true, streamsTypes: ["latlng"]},
})
```

| Function                                  | What it does                                                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `createClient(options)`                   | Client with token refresh, retries and rate limit handling. `client.get(path, query)` reads the API       |
| `syncActivities({client, store, ...})`    | Incremental sync. The cursor advances only after a complete walk                                          |
| `reconcileActivities({client, store, …})` | Deletes, additions and missing details. Changes nothing without `write`, and brakes past 10% of deletions |
| `fetchActivity({client, store, id, ...})` | Fetches one activity with the details asked, merged into the stored one                                   |
| `syncRoutes({client, store, ...})`        | Lists the routes, and fetches the streams of the new and edited ones                                      |
| `getRoutesVersion(routes)`                | A short hash that changes when a route is added, edited or deleted                                        |
| `fetchAthlete({client, details})`         | The athlete, with koms, stats and zones on demand                                                         |
| `verifyChallenge`, `handleEvent`          | Webhook helpers                                                                                           |

Every function that logs takes a `logger` with `debug`, `info` and `warn` methods. Nothing is logged by default, `consoleLogger` prints to the console.

### Rate limits

`stopOnRateLimit` makes a sync throw instead of stopping quietly with what it has. Without it, a sync stops on the first rate limit, keeps what it wrote, and leaves the cursor where it was, so the next run picks up the rest. With `waitOnRateLimit` on the client, the short limit is waited out instead, until the next quarter hour plus 5 seconds.

### Token refresh

Strava access tokens last 6 hours. The client refreshes an expired one and calls `onTokenRefresh` with the new token, which you should keep. `persistTokenToEnvFiles` rewrites `STRAVA_TOKEN` in the `.env` files that already hold it. The command line does it for you.

### Store

`createFileStore({dir})` writes one JSON file per activity, written to a temporary file then renamed so an interrupted run never leaves a truncated one:

```
.strava/
  activities/<id>.json
  state.json            the lastFetch cursor
  athlete.json
  routes.json
  route-streams/<id>.json
```

Any object with the same methods is a store: `readActivities`, `readActivity`, `writeActivity`, `deleteActivity`, `readState`, `writeState`, `readAthlete`, `writeAthlete`, `readRoutes`, `writeRoutes`, `readRouteStream` and `writeRouteStream`. A database store can be plugged in that way.

### Webhooks

Strava can call you when an activity changes, which saves polling. The helpers know nothing of your HTTP framework:

```js
import {handleEvent, verifyChallenge} from "strava-sync"

app.get("/strava", (req, res) => {
  const body = verifyChallenge(req.query, {
    verifyToken: process.env.VERIFY_TOKEN,
  })

  if (!body) return res.sendStatus(403)

  res.json(body)
})

app.post("/strava", async (req, res) => {
  res.sendStatus(200)

  await handleEvent({
    event: req.body,
    client,
    store,
    details: {withLaps: true},
    ownerId: process.env.STRAVA_ATHLETE_ID,
    onDeauthorize: () => console.log("Access revoked"),
  })
})
```

An activity created or updated is fetched and written to the store, a deleted one is removed, and an athlete who revokes the access calls `onDeauthorize`. Answer Strava within 2 seconds, then handle the event.

## Technical notes

- **HTTP client**: `strava-sync` uses a small `fetch` client of its own. The `strava` package (v3.1.0) was evaluated and rejected: it parses responses with the native `response.json()`, which rounds the 19 digit ids of segment efforts and routes, it only exposes the overall rate limit rather than the read one that binds first, and it sets no timeout. `strava-v3`, used by the first versions of `gatsby-source-strava`, has the same parsing problem and a 10 second timeout that cannot be changed through its public API.
- **Ids**: responses are parsed with `json-bigint`. A number of 16 digits or more that is an integer stays a string, and a decimal of that size becomes a number again.
- **Streams**: fetched at full resolution, without Strava's resampling past 10000 points. A type the activity has no data for is stored as `null`, so it is not asked for again.
- **Coordinates**: taken from the `latlng` stream, then `polyline`, then `summary_polyline`, rounded to 5 decimals, as `[lng, lat]`.
- **Cursor**: `lastFetch` means everything older is stored, so it only moves after a complete walk of the history.

## Contributing

- ⇄ Pull requests and ★ Stars are always welcome.
- For bugs and feature requests, please [create an issue][github-issue].

The tests mock the HTTP layer and never call Strava. The code is plain JavaScript. The types of the public API are written as [JSDoc](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html) comments: `npm run lint` checks them with TypeScript, and `npm pack` turns them into the `.d.ts` files of the package.

Versions are released from the [monorepo](../../README.md#releases) with changesets.

[badge-npm]: https://img.shields.io/npm/v/strava-sync.svg?style=flat-square
[badge-build]: https://img.shields.io/github/actions/workflow/status/cedricdelpoux/strava-sync/ci.yml?branch=master&style=flat-square
[badge-licence]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square
[npm]: https://www.npmjs.org/package/strava-sync
[actions]: https://github.com/cedricdelpoux/strava-sync/actions/workflows/ci.yml
[github-issue]: https://github.com/cedricdelpoux/strava-sync/issues/new
