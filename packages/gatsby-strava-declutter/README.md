<div align="center">
  <h1>gatsby-strava-declutter</h1>
  <br/>
  <p>
    <img src="./logo.svg" alt="gatsby-strava-declutter" height="100px">
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

Gatsby plugin that draws each road of your Strava activities only once on a map

Drawing every track of a long Strava history gives a map of blobs. This
plugin cuts the parts of a track following a road already drawn, so that
zoomed in every street you went through is drawn once, and zoomed out the
lines stay as fine and as far apart everywhere, however many times you went
through a place.

| With declutter                                                                                                                                 | Without declutter                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| ![With declutter](https://raw.githubusercontent.com/cedricdelpoux/strava-sync/main/packages/gatsby-strava-declutter/images/zoom-10.2-with.png) | ![Without declutter](https://raw.githubusercontent.com/cedricdelpoux/strava-sync/main/packages/gatsby-strava-declutter/images/zoom-10.2-without.png) |
| ![With declutter](https://raw.githubusercontent.com/cedricdelpoux/strava-sync/main/packages/gatsby-strava-declutter/images/zoom-6.9-with.png)  | ![Without declutter](https://raw.githubusercontent.com/cedricdelpoux/strava-sync/main/packages/gatsby-strava-declutter/images/zoom-6.9-without.png)  |

## Usage

1. Download [gatsby-source-strava][gatsby-source-strava] and `gatsby-strava-declutter` from the NPM registry:

```shell
npm install gatsby-source-strava gatsby-strava-declutter
```

2.  Add both plugins in your `gatsby-config.js` file

```js
require("dotenv").config()

module.exports = {
  plugins: [
    "gatsby-source-strava", // MANDATORY
    //
    // It MUST be after `gatsby-source-strava`
    "gatsby-strava-declutter",
  ],
}
```

> [gatsby-source-strava][gatsby-source-strava] needs `clientId`, `clientSecret` and `token` options to works.
>
> Checkout [documentation][gatsby-source-strava].

## Options

| Option     | Default               | What it is                                                                                                                                                            |
| ---------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `filter`   | every activity kept   | `(activity) => boolean`, the `StravaActivity` nodes to compare                                                                                                        |
| `minZoom`  | `6`                   | The lowest zoom generalized, the lower ones draw its lines                                                                                                            |
| `maxZoom`  | `12`                  | The highest zoom generalized, the full tracks show from the next one                                                                                                  |
| `storeDir` | `".strava-declutter"` | Where the result is kept between builds, see [Store](https://github.com/cedricdelpoux/strava-sync/blob/main/packages/gatsby-strava-declutter/docs/declutter.md#store) |

## Data

The plugin adds a `declutter` field to the `StravaActivity` nodes: whether the
activity is drawn, the pieces of its track drawn at every zoom, and the pieces
that depend on the zoom.

> Read the [declutter](https://github.com/cedricdelpoux/strava-sync/blob/main/packages/gatsby-strava-declutter/docs/declutter.md) documentation for the options, the
> full field reference, and how to draw it with Mapbox or MapLibre.

## Functions

The logic of the plugin lives in [strava-declutter][strava-declutter], which
works without Gatsby too. The declutter and the track simplification can be
called from your own `gatsby-node.js`:

```js
const {declutter, simplify} = require("gatsby-strava-declutter")
```

To read the declutter of an activity in your own `gatsby-node.js`, get its
`Declutter` node:

```js
const {getDeclutterNodeId} = require("gatsby-strava-declutter")

const declutterNode = getNode(getDeclutterNodeId(activityNode.id))
```

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

[badge-npm]: https://img.shields.io/npm/v/gatsby-strava-declutter.svg?style=flat-square
[badge-downloads]: https://img.shields.io/npm/dt/gatsby-strava-declutter.svg?style=flat-square
[badge-build]: https://img.shields.io/github/actions/workflow/status/cedricdelpoux/strava-sync/ci.yml?branch=main&style=flat-square
[badge-coverage]: https://img.shields.io/codecov/c/github/cedricdelpoux/strava-sync/main.svg?flag=gatsby-strava-declutter&style=flat-square
[badge-prs]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[badge-licence]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square
[badge-sponsor]: https://img.shields.io/badge/sponsor-%E2%99%A5-ea4aaa.svg?style=flat-square
[npm]: https://www.npmjs.com/package/gatsby-strava-declutter
[actions]: https://github.com/cedricdelpoux/strava-sync/actions/workflows/ci.yml
[codecov]: https://app.codecov.io/gh/cedricdelpoux/strava-sync/tree/main/packages/gatsby-strava-declutter
[contributing]: https://github.com/cedricdelpoux/strava-sync/blob/main/CONTRIBUTING.md
[licence]: https://github.com/cedricdelpoux/strava-sync/blob/main/LICENCE.md
[sponsor]: #support-this-project
[strava-declutter]: https://github.com/cedricdelpoux/strava-sync/tree/main/packages/strava-declutter
[gatsby-source-strava]: https://github.com/cedricdelpoux/strava-sync/tree/main/packages/gatsby-source-strava
