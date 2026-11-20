# Changelog

## 0.1.0

The Strava logic of [gatsby-source-strava](https://github.com/cedricdelpoux/gatsby-source-strava) v4, as a library of its own.

- `createClient` with token refresh, retries and rate limit handling
- `syncActivities`, `reconcileActivities`, `fetchActivity` and `syncRoutes`
- A file store with the layout of the Gatsby plugin
- `verifyChallenge` and `handleEvent` for webhooks
- The `strava-sync` command line: `token`, `activities`, `activity` and `routes`
