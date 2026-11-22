<div align="center">
  <h1>strava-declutter</h1>
  <br/>
  <p>
    <img src="./logo.svg" alt="strava-declutter" height="100px">
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

> Read the [declutter](https://github.com/cedricdelpoux/strava-sync/blob/main/packages/strava-declutter/docs/declutter.md) documentation for the options, the result and the store.

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

[badge-npm]: https://img.shields.io/npm/v/strava-declutter.svg?style=flat-square
[badge-downloads]: https://img.shields.io/npm/dt/strava-declutter.svg?style=flat-square
[badge-build]: https://img.shields.io/github/actions/workflow/status/cedricdelpoux/strava-sync/ci.yml?branch=main&style=flat-square
[badge-coverage]: https://img.shields.io/codecov/c/github/cedricdelpoux/strava-sync/main.svg?flag=strava-declutter&style=flat-square
[badge-prs]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[badge-licence]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square
[badge-sponsor]: https://img.shields.io/badge/sponsor-%E2%99%A5-ea4aaa.svg?style=flat-square
[npm]: https://www.npmjs.com/package/strava-declutter
[actions]: https://github.com/cedricdelpoux/strava-sync/actions/workflows/ci.yml
[codecov]: https://app.codecov.io/gh/cedricdelpoux/strava-sync/tree/main/packages/strava-declutter
[contributing]: https://github.com/cedricdelpoux/strava-sync/blob/main/CONTRIBUTING.md
[licence]: https://github.com/cedricdelpoux/strava-sync/blob/main/LICENCE.md
[sponsor]: #support-this-project
