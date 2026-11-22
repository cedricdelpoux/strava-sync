<div align="center">
  <h1>strava-tiles</h1>
  <br/>
  <p>
    <img src="./logo.svg" alt="strava-tiles" height="100px">
  </p>
  <br/>

[![Npm][badge-npm]][npm]
[![Build Status][badge-build]][actions]
[![Coverage][badge-coverage]][codecov]
[![Downloads][badge-downloads]][npm]
[![PRs welcome][badge-prs]][contributing]
[![MIT license][badge-licence]][licence]
[![Sponsor][badge-sponsor]][sponsor]

</div>

---

`strava-tiles` computes the map tiles covered by your [Strava](https://www.strava.com/) activities, like the explorer maps do, and draws an activity as an image.

It powers [gatsby-strava-tiles](https://github.com/cedricdelpoux/strava-sync/tree/main/packages/gatsby-strava-tiles), and it works without Gatsby too, for any static site generator or script. It reads the activities and routes that [strava-sync](https://github.com/cedricdelpoux/strava-sync/tree/main/packages/strava-sync) stores.

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

Images need [`sharp`](https://sharp.pixelplumbing.com), an optional peer dependency: a project using only the tiles never installs it. `npm install sharp` to draw images. The options are described in the [images documentation](https://github.com/cedricdelpoux/strava-sync/blob/main/packages/gatsby-strava-tiles/docs/images.md).

## Support this project

<p align="center">
  <a href="https://github.com/cedricdelpoux"><img src="https://images.weserv.nl/?url=github.com/cedricdelpoux.png&w=128&h=128&fit=cover&mask=circle" width="64" height="64" alt="Cédric Delpoux"></a>
</p>

<p align="center">
  Hi, I'm <a href="https://cedricdelpoux.fr/en">Cédric</a>.<br>
  Between my three kids, I maintain <a href="https://github.com/cedricdelpoux?tab=repositories">open source projects</a> during my free time.<br>
  If my work is useful to you, a star, a one-time tip or a monthly sponsorship all help a lot.<br>
  Thank you very much!
</p>

<p align="center">
  <a href="https://thanks.dev/u/gh/cedricdelpoux"><img src="https://img.shields.io/badge/thanks.dev-000000?style=for-the-badge&logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyMCI%2BPHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIuNiIgZD0iTTkgMkM2IDIgNS41IDMgNS41IDUuNVY4QzUuNSA5LjMgNC41IDEwIDIgMTBDNC41IDEwIDUuNSAxMC43IDUuNSAxMlYxNC41QzUuNSAxNyA2IDE4IDkgMThNMTUgMkMxOCAyIDE4LjUgMyAxOC41IDUuNVY4QzE4LjUgOS4zIDE5LjUgMTAgMjIgMTBDMTkuNSAxMCAxOC41IDEwLjcgMTguNSAxMlYxNC41QzE4LjUgMTcgMTggMTggMTUgMTgiLz48L3N2Zz4%3D" alt="thanks.dev"></a>
  <a href="https://github.com/sponsors/cedricdelpoux"><img src="https://img.shields.io/badge/GitHub%20Sponsors-ea4aaa?style=for-the-badge&logo=githubsponsors&logoColor=white" alt="GitHub Sponsors"></a>
  <a href="https://ko-fi.com/cedricdelpoux"><img src="https://img.shields.io/badge/Ko--fi-FF5E5B?style=for-the-badge&logo=kofi&logoColor=white" alt="Ko-fi"></a>
  <a href="https://paypal.me/cedricdelpoux"><img src="https://img.shields.io/badge/PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white" alt="PayPal"></a>
</p>

[badge-npm]: https://img.shields.io/npm/v/strava-tiles.svg?style=flat-square
[badge-downloads]: https://img.shields.io/npm/dt/strava-tiles.svg?style=flat-square
[badge-build]: https://img.shields.io/github/actions/workflow/status/cedricdelpoux/strava-sync/ci.yml?branch=main&style=flat-square
[badge-coverage]: https://img.shields.io/codecov/c/github/cedricdelpoux/strava-sync/main.svg?flag=strava-tiles&style=flat-square
[badge-prs]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[badge-licence]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square
[badge-sponsor]: https://img.shields.io/badge/sponsor-%E2%99%A5-ea4aaa.svg?style=flat-square
[npm]: https://www.npmjs.com/package/strava-tiles
[actions]: https://github.com/cedricdelpoux/strava-sync/actions/workflows/ci.yml
[codecov]: https://app.codecov.io/gh/cedricdelpoux/strava-sync/tree/main/packages/strava-tiles
[contributing]: https://github.com/cedricdelpoux/strava-sync/blob/main/CONTRIBUTING.md
[licence]: https://github.com/cedricdelpoux/strava-sync/blob/main/LICENCE.md
[sponsor]: #support-this-project
