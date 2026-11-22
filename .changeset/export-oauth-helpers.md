---
"strava-sync": minor
---

The OAuth helpers are now exported from the main entry. `getAuthorizationUrl` builds the Strava authorization page, `exchangeCode` trades the returned code for a token, and `generateToken` runs the whole flow from the terminal, with the same behaviour as `npx strava-sync token`. They are typed, so you can build your own sign-in flow without copying the command.
