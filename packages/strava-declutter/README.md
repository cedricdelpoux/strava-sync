# strava-declutter

[![Npm][badge-npm]][npm]
[![Build Status][badge-build]][actions]
[![Coverage][badge-coverage]][codecov]
[![MIT license][badge-licence]](./LICENCE.md)

`strava-declutter` draws each road of your [Strava](https://www.strava.com/) activities only once on a map.

Drawing every track of a long Strava history gives a map of blobs. It cuts the parts of a track following a road already drawn, so that zoomed in every street you went through is drawn once, and zoomed out the lines stay as fine and as far apart everywhere, however many times you went through a place.

It powers [gatsby-strava-declutter](https://github.com/cedricdelpoux/strava-sync/tree/main/packages/gatsby-strava-declutter), and it works without Gatsby too, for any static site generator or script. It reads the activities that [strava-sync](https://github.com/cedricdelpoux/strava-sync/tree/main/packages/strava-sync) stores.

## Installation

```shell
npm install strava-declutter
```

Node 22.12 or later is required. The package is an ES module, which `require()` loads too, and it comes with its TypeScript types.

## Command line

```shell
npx strava-declutter                       # .strava to declutter.json
npx strava-declutter --store .strava --out public/declutter.json
npx strava-declutter --min-zoom 8 --max-zoom 14
```

It reads the store of `strava-sync`, keeps its work in `.strava-declutter` between runs (`--cache`), and writes an object of activity id to `{hidden, reason, parts, stubs}`. Run it with `--help` to list its options.

## Usage

```js
import {createFileStore} from "strava-sync"
import {
  consoleLogger,
  createDeclutterStore,
  declutterActivities,
} from "strava-declutter"

const activities = await createFileStore({dir: ".strava"}).readActivities()

const {results} = await declutterActivities({
  activities,
  store: createDeclutterStore({dir: ".strava-declutter"}),
  filter: (activity) => activity.visibility === "everyone",
  minZoom: 6,
  maxZoom: 12,
  logger: consoleLogger,
})

results.get(activities[0].id) // {hidden, reason, parts, stubs}
```

An activity is any object with an `id`, a `start_date` and `coordinates`, a list of `[lng, lat]` points, which is what `strava-sync` stores.

| Function                                            | What it does                                                                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `declutterActivities({activities, ...})`            | Declutters the activities with a track, reusing the store. Returns `{results, shownCount, hiddenCount, declutteredCount}` |
| `createDeclutterStore({dir})`                       | The files that keep the result between runs                                                                               |
| `declutter(activities, {minZoom, maxZoom})`         | The same without a store or a filter, returns the `results` map                                                           |
| `declutterWithState(activities, options, previous)` | `{results, entries, reused}`, to keep the state yourself                                                                  |
| `simplify(coordinates, tolerance)`                  | A full track with a few hundred points instead of thousands                                                               |

Every function that logs takes a `logger` with `info`, `warn` and `error` methods. Nothing is logged by default, `consoleLogger` prints to the console.

> Read the [declutter](./docs/declutter.md) documentation for the options, the result and the store.

## Contributing

- ⇄ Pull requests and ★ Stars are always welcome.
- For bugs and feature requests, please [create an issue][github-issue].

Versions are released from the [monorepo](../../README.md#releases) with changesets.

[badge-npm]: https://img.shields.io/npm/v/strava-declutter.svg?style=flat-square
[badge-build]: https://img.shields.io/github/actions/workflow/status/cedricdelpoux/strava-sync/ci.yml?branch=main&style=flat-square
[badge-licence]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square
[badge-coverage]: https://img.shields.io/codecov/c/github/cedricdelpoux/strava-sync/main.svg?flag=strava-declutter&style=flat-square
[npm]: https://www.npmjs.org/package/strava-declutter
[codecov]: https://app.codecov.io/gh/cedricdelpoux/strava-sync/tree/main/packages/strava-declutter
[actions]: https://github.com/cedricdelpoux/strava-sync/actions/workflows/ci.yml
[github-issue]: https://github.com/cedricdelpoux/strava-sync/issues/new
