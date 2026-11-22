---
"gatsby-source-strava": major
---

Delegate the Strava logic to `strava-sync`. The `strava-v3`, `express`, `inquirer`, `glob`, `open`, `json-bigint` and `@mapbox/polyline` dependencies are gone, the helpers of `utils` are replaced by the functions of `strava-sync`, the commands are thin wrappers with the same flags and the same store layout, and Node 22.12 or later is required.

Breaking changes:

- The `utils/strava.js`, `utils/routes.js`, `utils/store.js` and the other helpers are gone. Use the functions of `strava-sync` instead (`createClient`, `fetchRoutes`, `getRoutesVersion`, `createFileStore`...).
- The three commands are thin wrappers of `strava-sync`, with the same flags and the same store layout.
- Node 22.12 or later is required.
