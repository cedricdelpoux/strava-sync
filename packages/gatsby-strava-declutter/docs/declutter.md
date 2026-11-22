# Declutter

Drawing every track of a long Strava history gives a map of blobs: the same
roads drawn tens of times, double lines a few meters apart, and small
activities buried under big ones. The declutter decides, for each activity,
what a map should draw of it, so that each road is drawn only once:

- each activity loses the parts following a road already drawn, by an
  earlier activity or by itself, like the way back of an out and back. An
  activity is hidden when nothing is left of it. Zoomed in, every street you
  went through is drawn, once.
- zoomed out, from zoom 12 to 6 by default, the same is done again at each
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
kept between builds, and a new activity takes less than a second. See
[Store](#store).

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

| Option     | Default               | What it is                                                           |
| ---------- | --------------------- | -------------------------------------------------------------------- |
| `filter`   | every activity kept   | `(activity) => boolean`, the `StravaActivity` nodes to compare       |
| `minZoom`  | `6`                   | The lowest zoom generalized, the lower ones draw its lines           |
| `maxZoom`  | `12`                  | The highest zoom generalized, the full tracks show from the next one |
| `storeDir` | `".strava-declutter"` | Where the result is kept between builds, see [Store](#store)         |

Only activities with at least two points are ever compared. An activity left
out by `filter` gets no `declutter` (`null`).

The zoom options, the order of the activities and the store are those of [strava-declutter](https://github.com/cedricdelpoux/strava-sync/tree/master/packages/strava-declutter/docs/declutter.md). `filter` receives the `StravaActivity` node.

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

- `"already-traced"`: its whole track follows roads already drawn.

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

From your own `gatsby-node.js`, in `onPostBootstrap` or later, read it with
`getDeclutterNodeId`:

```js
const {getDeclutterNodeId} = require("gatsby-strava-declutter")

exports.onPostBootstrap = ({getNode, getNodesByType}) => {
  getNodesByType("StravaActivity").forEach((activityNode) => {
    const declutterNode = getNode(getDeclutterNodeId(activityNode.id))
    const isHidden = declutterNode ? declutterNode.hidden : false
  })
}
```

The plugin creates the `Declutter` nodes in its own `onPostBootstrap`, which
runs before your site's. An activity without a track has none.

## Store

The result is kept in a `.strava-declutter` directory next to your
`gatsby-config.js`, rather than in Gatsby's cache, which is emptied whenever
any plugin changes. Add it to your `.gitignore`, and keep it in your continuous
integration cache along with the `.strava` store of `gatsby-source-strava`.
Use the `storeDir` option to put it somewhere else. Unlike `.strava`, it can be
deleted at any time. See [Store](https://github.com/cedricdelpoux/strava-sync/tree/master/packages/strava-declutter/docs/declutter.md#store)
for what it holds.

## Outside of the plugin

To declutter without Gatsby, use [strava-declutter](https://github.com/cedricdelpoux/strava-sync/tree/master/packages/strava-declutter). The plugin re-exports its `declutter` and `simplify`.
