# Changelog

## [0.3.0] - 2026-10-19

### Added

-   `getDeclutterNodeId` is exported, to read the `Declutter` node of an
    activity from your own `gatsby-node.js` with
    `getNode(getDeclutterNodeId(activityNode.id))`. See the
    [declutter](./docs/declutter.md#stravaactivitydeclutter) documentation.

## [0.2.0] - 2026-10-17

### Added

-   The declutter is kept in a `.strava-declutter` directory next to
    `gatsby-config.js` rather than in Gatsby's cache, which is emptied whenever
    any plugin changes. Add it to your `.gitignore`, and keep it in your
    continuous integration cache. See [Store](./docs/declutter.md#store).
-   `storeDir` option, to put the store somewhere else.
-   Only the activities from the first one added, changed or removed since the
    last build are decluttered again. A new activity takes less than a second
    instead of about 40 seconds for 3600 activities. Removing a hidden
    activity declutters nothing again.
-   `declutterWithState` in `utils/declutter.js`, the declutter resumed from
    the result of an earlier call.

### Changed

-   Activities with the same `start_date` are walked by id, whatever the order
    they are given in.

## [0.1.0] - 2026-10-15

### Added

-   `StravaActivity.declutter`: whether the activity is drawn, the pieces of
    its track drawn at every zoom (`parts`), and the pieces depending on the
    zoom (`stubs`, with `hideUntil` and `showUntil`). See the
    [declutter](./docs/declutter.md) documentation.
-   Every street you went through is drawn, once. An activity is only hidden
    when its whole track follows roads already drawn (`"already-traced"`).
-   A drawn track never has a gap. Only what another line already draws is
    left out, and a cut end goes on along its own track to where it meets the
    road it leaves or joins.
-   Zoomed out, the lines have the same density everywhere. At each zoom from
    12 to 6, the roads are cut again, as if roads 1.5 pixels apart were the
    same road. The small loops, spurs and bumps, within 1.5 pixels of a line,
    are left out. What is left is simplified to half a pixel at the next zoom,
    the highest one it is drawn at, so the lines keep the shape of the tracks.
-   Every line is drawn solid.
-   The activities are walked by start date, and each road is drawn by the
    first activity going through it. An activity only depends on the earlier
    ones, so a month's map never changes when an activity is added.
-   `filter`, `minZoom` and `maxZoom` options. `minZoom` and `maxZoom` are the
    range of zooms generalized, from 6 to 12 by default. Below `minZoom`, the
    map draws the lines of `minZoom`.
-   `declutter` and `simplify` are exported from the package entry point.
-   The plugin checks at startup that `gatsby-source-strava` is declared
    before it in `gatsby-config.js`.
-   With `gatsby develop`, the declutter is computed again when
    `utils/declutter.js` changes, without restarting.
