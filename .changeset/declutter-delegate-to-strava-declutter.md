---
"gatsby-strava-declutter": patch
---

Delegate the declutter to `strava-declutter`, which works without Gatsby too. The options, the `Declutter` nodes, the `StravaActivity.declutter` field, the `.strava-declutter` store and the `declutter`, `simplify` and `getDeclutterNodeId` exports stay the same. The plugin no longer reloads the declutter when its file changes in development, and the first build after the update declutters every activity again, since the store digest changed.
