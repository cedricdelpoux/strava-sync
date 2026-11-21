---
"gatsby-source-strava": major
---

Delegate the Strava logic to `strava-sync`. The `strava-v3`, `express`, `inquirer`, `glob`, `open`, `json-bigint` and `@mapbox/polyline` dependencies are gone, the helpers of `utils` are replaced by the functions of `strava-sync`, the commands are thin wrappers with the same flags and the same store layout, and Node 22.12 or later is required.
