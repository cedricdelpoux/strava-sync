<div align="center">
  <h1 align="center">strava-sync<br/><a href="https://www.strava.com"><img src=".github/assets/powered-by-strava.svg" alt="Powered by Strava" height="12"></a></h1>
  <br/>
  <p>
    <img src="./logo.svg" alt="strava-sync" height="100px">
  </p>
  <br/>

[![Build Status][badge-build]][actions] [![Coverage][badge-coverage]][codecov] [![MIT license][badge-licence]](./LICENCE.md) [![PRs welcome][badge-prs]](./CONTRIBUTING.md) [![Sponsor][badge-sponsor]](#support-this-project)

</div>

---

Use Strava as a content source. This monorepo holds the packages that keep a local copy of your Strava activities and routes within the rate limits, turn that copy into maps, and put all of it in Gatsby pages and embeds.

|                                     &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;                                     | Package                                                         | Version                                | Description                                                                               |
| :----------------------------------------------------------------------------------------------------------------------------------------------: | --------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------- |
|             <a href="./packages/strava-sync"><img src=".github/assets/icons/strava-sync.svg" width="24" height="24" align="top"></a>             | [`strava-sync`](./packages/strava-sync)                         | [![npm][v-sync]][n-sync]               | Keep a local copy of your Strava activities and routes up to date, within the rate limits |
|        <a href="./packages/strava-declutter"><img src=".github/assets/icons/strava-declutter.svg" width="24" height="24" align="top"></a>        | [`strava-declutter`](./packages/strava-declutter)               | [![npm][v-declutter]][n-declutter]     | Draw each road of your activities only once on a map                                      |
|            <a href="./packages/strava-tiles"><img src=".github/assets/icons/strava-tiles.svg" width="24" height="24" align="top"></a>            | [`strava-tiles`](./packages/strava-tiles)                       | [![npm][v-tiles]][n-tiles]             | Compute the map tiles covered by your activities, and draw them as images                 |
|    <a href="./packages/gatsby-source-strava"><img src=".github/assets/icons/gatsby-source-strava.svg" width="46" height="24" align="top"></a>    | [`gatsby-source-strava`](./packages/gatsby-source-strava)       | [![npm][v-source]][n-source]           | Gatsby plugin that uses Strava as a data source                                           |
| <a href="./packages/gatsby-strava-declutter"><img src=".github/assets/icons/gatsby-strava-declutter.svg" width="46" height="24" align="top"></a> | [`gatsby-strava-declutter`](./packages/gatsby-strava-declutter) | [![npm][v-g-declutter]][n-g-declutter] | Gatsby plugin that draws each road of your activities only once on a map                  |
|     <a href="./packages/gatsby-strava-tiles"><img src=".github/assets/icons/gatsby-strava-tiles.svg" width="46" height="24" align="top"></a>     | [`gatsby-strava-tiles`](./packages/gatsby-strava-tiles)         | [![npm][v-g-tiles]][n-g-tiles]         | Gatsby plugin that adds tiles to your activities                                          |
|    <a href="./packages/gatsby-remark-strava"><img src=".github/assets/icons/gatsby-remark-strava.svg" width="46" height="24" align="top"></a>    | [`gatsby-remark-strava`](./packages/gatsby-remark-strava)       | [![npm][v-remark]][n-remark]           | Gatsby remark plugin that embeds Strava activities and profile by their URL               |

## Which package do I need?

- **A Gatsby site with your activities and routes as data**: [`gatsby-source-strava`](./packages/gatsby-source-strava).
- **A Gatsby site with a decluttered map**: [`gatsby-strava-declutter`](./packages/gatsby-strava-declutter), next to `gatsby-source-strava`.
- **A Gatsby site with the tiles you covered**: [`gatsby-strava-tiles`](./packages/gatsby-strava-tiles), next to `gatsby-source-strava`.
- **Strava activities embedded in Markdown or MDX**: [`gatsby-remark-strava`](./packages/gatsby-remark-strava).
- **Another framework, a build script or the command line**: [`strava-sync`](./packages/strava-sync).

  ```shell
  npx strava-sync activities
  ```

  ```js
  import {createClient, createFileStore, syncActivities} from "strava-sync"

  const {activities} = await syncActivities({
    client: createClient({
      clientId: process.env.STRAVA_CLIENT_ID,
      clientSecret: process.env.STRAVA_CLIENT_SECRET,
      token: process.env.STRAVA_TOKEN,
    }),
    store: createFileStore({dir: ".strava"}),
  })
  ```

- **Only a decluttered map**: [`strava-declutter`](./packages/strava-declutter).
- **Only the map tiles of your activities**: [`strava-tiles`](./packages/strava-tiles).

## How it works

`strava-sync` owns the Strava API and the store on your disk. The packages that turn your activities into maps read what it stores, and the Gatsby packages are thin adapters over the others. Each package has its own README and CHANGELOG.

```text
strava-sync
  ├─ strava-declutter, strava-tiles       (take the activities it stores)
  └─ gatsby-source-strava
       ├─ gatsby-strava-declutter ─ strava-declutter   (read its nodes)
       └─ gatsby-strava-tiles     ─ strava-tiles       (read its nodes)

gatsby-remark-strava                      (standalone)
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

[badge-build]: https://img.shields.io/github/actions/workflow/status/cedricdelpoux/strava-sync/ci.yml?branch=main&style=flat-square
[badge-coverage]: https://img.shields.io/codecov/c/github/cedricdelpoux/strava-sync/main.svg?style=flat-square
[badge-licence]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square
[badge-prs]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[badge-sponsor]: https://img.shields.io/badge/sponsor-%E2%99%A5-ea4aaa.svg?style=flat-square
[actions]: https://github.com/cedricdelpoux/strava-sync/actions/workflows/ci.yml
[codecov]: https://app.codecov.io/gh/cedricdelpoux/strava-sync
[v-sync]: https://img.shields.io/npm/v/strava-sync.svg?style=flat-square
[n-sync]: https://www.npmjs.com/package/strava-sync
[v-declutter]: https://img.shields.io/npm/v/strava-declutter.svg?style=flat-square
[n-declutter]: https://www.npmjs.com/package/strava-declutter
[v-tiles]: https://img.shields.io/npm/v/strava-tiles.svg?style=flat-square
[n-tiles]: https://www.npmjs.com/package/strava-tiles
[v-source]: https://img.shields.io/npm/v/gatsby-source-strava.svg?style=flat-square
[n-source]: https://www.npmjs.com/package/gatsby-source-strava
[v-g-declutter]: https://img.shields.io/npm/v/gatsby-strava-declutter.svg?style=flat-square
[n-g-declutter]: https://www.npmjs.com/package/gatsby-strava-declutter
[v-g-tiles]: https://img.shields.io/npm/v/gatsby-strava-tiles.svg?style=flat-square
[n-g-tiles]: https://www.npmjs.com/package/gatsby-strava-tiles
[v-remark]: https://img.shields.io/npm/v/gatsby-remark-strava.svg?style=flat-square
[n-remark]: https://www.npmjs.com/package/gatsby-remark-strava
