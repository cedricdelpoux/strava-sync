# strava-tiles

[![Npm][badge-npm]][npm]
[![Build Status][badge-build]][actions]
[![MIT license][badge-licence]](./LICENCE.md)

`strava-tiles` computes the map tiles covered by your [Strava](https://www.strava.com/) activities, like the explorer maps do, and draws an activity as an image.

It powers [gatsby-strava-tiles](https://github.com/cedricdelpoux/strava-sync/tree/master/packages/gatsby-strava-tiles), and it works without Gatsby too, for any static site generator or script. It reads the activities and routes that [strava-sync](https://github.com/cedricdelpoux/strava-sync/tree/master/packages/strava-sync) stores.

All the `x`/`y` pairs are [slippy map](https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames) tile coordinates at zoom level 14.

## Installation

```shell
npm install strava-tiles
```

Node 22.12 or later is required. The package is an ES module, which `require()` loads too, and it comes with its TypeScript types.

## Command line

```shell
npx strava-tiles                      # .strava to tiles.json
npx strava-tiles --store .strava --out public/tiles.json --routes
```

It writes an object with the tiles of each activity by id (`activities`), the coverage of the athlete (`athlete`) and the tiles of each route by id (`routes`, with `--routes`). Run it with `--help` to list its options.

## Usage

```js
import {createFileStore} from "strava-sync"
import {computeTiles, consoleLogger, readRoutes} from "strava-tiles"

const store = createFileStore({dir: ".strava"})

const {activityTiles, athleteTiles, routeTiles} = computeTiles({
  activities: await store.readActivities(),
  routes: await readRoutes(store),
  logger: consoleLogger,
})

activityTiles.get(activityId) // [{x, y}, ...], the tiles it was the first to cover
athleteTiles.parts.square // the largest fully covered square
routeTiles.get(routeId) // {all, new}
```

An activity is any object with an `id`, a `start_date` and `coordinates`, a list of `[lng, lat]` points, which is what `strava-sync` stores. A raw `latlng` stream in its `streams` makes a gap of more than 10 km a GPS pause, whose tiles do not count.

| Function                                  | What it does                                                                                             |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `computeTiles({activities, routes, ...})` | `{activityTiles, athleteTiles, routeTiles, coveredTiles}`, the maps being keyed by id                    |
| `readRoutes(store)`                       | The routes of a `strava-sync` store with their `coordinates`                                             |
| `getActivityTiles(activity, allTiles)`    | The tiles of an activity that `allTiles` does not hold                                                   |
| `getAthleteTiles(tiles, tilesByMonth)`    | The coverage of the athlete: square, cluster, rest, row, column and outlines, overall and month by month |
| `getRouteTiles(route, isNewTile)`         | `{all, new}`                                                                                             |
| `pointsToTiles`, `getTileActivities`      | The tiles of a track, and the activities crossing each tile                                              |
| `tileToCoords`, `tilesToOutline`          | The corners of a tile, and the outlines of a set of tiles                                                |
| `lngToX`, `latToY`, `xToLng`, `yToLat`... | The conversions between coordinates and tiles, and `distanceInMeters`                                    |

Every function that logs takes a `logger` with `info`, `warn` and `error` methods. Nothing is logged by default, `consoleLogger` prints to the console.

The `strava-tiles/map` and `strava-tiles/tiles` entry points hold the helpers above and nothing else, for code running in the browser.

## Activity images

`strava-tiles/images` draws an activity as a single image: the ground already covered around it, the tiles it was the first to cover, the tiles it closed in, and the track.

```js
import {getActivityImages, renderActivityImage} from "strava-tiles/images"

const [activityImage] = getActivityImages({
  activities: [{id, start_date, tiles}], // every activity, `tiles` being its `activityTiles`
  groups: [[id]],
})
const {image} = await renderActivityImage({...activityImage, coordinates})
```

Images need [`sharp`](https://sharp.pixelplumbing.com), an optional peer dependency: a project using only the tiles never installs it. `npm install sharp` to draw images. The options are described in the [images documentation](https://github.com/cedricdelpoux/strava-sync/blob/master/packages/gatsby-strava-tiles/docs/images.md).

## Contributing

- ⇄ Pull requests and ★ Stars are always welcome.
- For bugs and feature requests, please [create an issue][github-issue].

Versions are released from the [monorepo](../../README.md#releases) with changesets.

[badge-npm]: https://img.shields.io/npm/v/strava-tiles.svg?style=flat-square
[badge-build]: https://img.shields.io/github/actions/workflow/status/cedricdelpoux/strava-sync/ci.yml?branch=master&style=flat-square
[badge-licence]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square
[npm]: https://www.npmjs.org/package/strava-tiles
[actions]: https://github.com/cedricdelpoux/strava-sync/actions/workflows/ci.yml
[github-issue]: https://github.com/cedricdelpoux/strava-sync/issues/new
