# Declutter

Drawing every track of a long Strava history gives a map of blobs: the same
roads drawn tens of times, double lines a few meters apart, and small
activities buried under big ones. The declutter decides, for each activity,
what a map should draw of it, so that each road is drawn only once:

-   each activity loses the parts following a road already drawn, by an
    earlier activity or by itself, like the way back of an out and back. An
    activity is hidden when nothing is left of it. Zoomed in, every street you
    went through is drawn, once.
-   zoomed out, from zoom 12 to 6 by default, the same is done again at each
    zoom, with roads 1.5 pixels apart counting as the same road. However many
    times you went through a place, the lines stay as fine and as far apart as
    anywhere else.

A drawn track never has a gap: only what another line already draws is left
out, within 1.5 pixels at that zoom. Zoomed out, the small loops and spurs, less
than 1.5 pixels across, and the bumps never more than 1.5 pixels away from a line,
are left out too, since they would only be scribbles. Each cut end goes on
along its own track to where it meets the line it leaves or joins, so the
track stays connected to the rest of the map.

It takes a while, about 30 seconds for 3500 activities, but the result is
cached, see below.

## Options

```js
// gatsby-config.js
module.exports = {
    plugins: [
        "gatsby-source-strava",
        {
            resolve: "gatsby-strava-declutter",
            options: {
                // Only the activities the map shows are compared: a private
                // or an indoor activity must not hide a public one
                filter: (activity) =>
                    ["Run", "Ride", "Hike"].includes(activity.type) &&
                    activity.visibility === "everyone",
            },
        },
    ],
}
```

| Option    | Default             | What it is                                                           |
| --------- | ------------------- | -------------------------------------------------------------------- |
| `filter`  | every activity kept | `(activity) => boolean`, the `StravaActivity` nodes to compare       |
| `minZoom` | `6`                 | The lowest zoom generalized, the lower ones draw its lines           |
| `maxZoom` | `12`                | The highest zoom generalized, the full tracks show from the next one |

Only activities with at least two points are ever compared. An activity left
out by `filter` gets no `declutter` (`null`).

### `minZoom` and `maxZoom`

Each zoom from `maxZoom` down to `minZoom` is generalized, cut again from the
one above. Below `minZoom`, the map draws the lines of `minZoom`, which get
denser as you zoom out. A lower `minZoom` keeps the same density further out,
at the cost of gaps: a few pixels at such zooms are kilometers of track.

### Which activity draws a road

The activities are walked by `start_date`: a road is drawn by the first
activity that went through it.

An activity only ever depends on the ones before it: the map of a given month
is exactly the declutter of every activity up to that month, and adding an
activity never changes how the earlier ones are drawn. It makes a timeline, or
a replay of your history month by month, possible.

## `StravaActivity.declutter`

```graphql
{
    allStravaActivity {
        nodes {
            declutter {
                hidden
                reason
                parts
                stubs {
                    hideUntil
                    showUntil
                    coordinates
                }
            }
        }
    }
}
```

| Field    | Type            | What it is                                                          |
| -------- | --------------- | ------------------------------------------------------------------- |
| `hidden` | Boolean         | `true` when nothing of the activity is drawn                        |
| `reason` | String          | Why it is hidden: `"already-traced"`, `null` when drawn             |
| `parts`  | [[[Float]]]     | Pieces of track drawn the same at every zoom, as `[lng, lat]` lines |
| `stubs`  | [DeclutterStub] | Pieces of track depending on the zoom, see below                    |

-   `"already-traced"`: its whole track follows roads already drawn.

A stub is hidden under `hideUntil` and from `showUntil`, `0` meaning never.

With Mapbox or MapLibre, each stub is a feature with these properties, and the
layer filters on the zoom:

```js
;[
    "all",
    ["<=", ["get", "hideUntil"], ["zoom"]],
    [
        "any",
        ["==", ["get", "showUntil"], 0],
        [">", ["get", "showUntil"], ["zoom"]],
    ],
]
```

`declutter` is its own node, `Declutter`, rather than a field added to the
activity: Gatsby runs a page query again when a node it read changes, not when
a field added to another node does.

The result is kept in Gatsby's cache, and only computed again when the
plugin changes, when an activity is added, removed or changed, when `minZoom`
or `maxZoom` change, or when `filter` picks other activities.

## Full tracks

The declutter only draws each road once. To show a whole track when an
activity is selected, write the tracks to a file from your own
`gatsby-node.js`, in the format your site needs:

```js
const {simplify} = require("gatsby-strava-declutter")

// A full track, a few hundred points instead of thousands
simplify(activity.coordinates)
```

The declutter itself can also be called directly, outside of Gatsby:

```js
const {declutter} = require("gatsby-strava-declutter")

// Map of activity id to {hidden, reason, parts, stubs}
const results = declutter(activities, {minZoom: 6, maxZoom: 12})
```
