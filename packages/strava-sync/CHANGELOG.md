# Changelog

## 0.1.1

### Patch Changes

- d07c4d9: The OAuth helpers are now exported from the main entry. `getAuthorizationUrl` builds the Strava authorization page, `exchangeCode` trades the returned code for a token, and `generateToken` runs the whole flow from the terminal, with the same behaviour as `npx strava-sync token`. They are typed, so you can build your own sign-in flow without copying the command.

## 0.1.0

The Strava logic of [gatsby-source-strava](https://github.com/cedricdelpoux/gatsby-source-strava) v4, as a library of its own.

- `createClient` with token refresh, retries and rate limit handling
- `syncActivities`, `reconcileActivities`, `fetchActivity` and `syncRoutes`
- A file store with the layout of the Gatsby plugin
- `verifyChallenge` and `handleEvent` for webhooks
- The `strava-sync` command line: `token`, `activities`, `activity` and `routes`
