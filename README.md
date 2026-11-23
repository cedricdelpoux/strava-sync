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

<table>
  <tr>
    <th></th>
    <th align="left">Package</th>
    <th align="left">Version</th>
    <th align="left">Downloads</th>
    <th align="left">Use it for</th>
  </tr>
  <tr>
    <td align="center" valign="middle"><a href="./packages/strava-sync"><img align="texttop" src=".github/assets/icons/strava-sync.svg" width="20" height="20" alt="strava-sync"></a></td>
    <td valign="middle"><a href="./packages/strava-sync"><img align="texttop" src="https://img.shields.io/static/v1?style=flat-square&label=%20&message=strava-sync&color=000605&logo=github&logoColor=white&labelColor=000605" alt="strava-sync"></a></td>
    <td valign="middle"><a href="https://www.npmjs.com/package/strava-sync"><img align="texttop" src="https://img.shields.io/npm/v/strava-sync.svg?style=flat-square" alt="npm"></a></td>
    <td valign="middle"><img align="texttop" src="https://img.shields.io/npm/dt/strava-sync.svg?style=flat-square&label=Downloads" alt="Downloads"></td>
    <td valign="middle">Local cache, rate limits, incremental sync</td>
  </tr>
  <tr>
    <td align="center" valign="middle"><a href="./packages/strava-declutter"><img align="texttop" src=".github/assets/icons/strava-declutter.svg" width="20" height="20" alt="strava-declutter"></a></td>
    <td valign="middle"><a href="./packages/strava-declutter"><img align="texttop" src="https://img.shields.io/static/v1?style=flat-square&label=%20&message=strava-declutter&color=000605&logo=github&logoColor=white&labelColor=000605" alt="strava-declutter"></a></td>
    <td valign="middle"><a href="https://www.npmjs.com/package/strava-declutter"><img align="texttop" src="https://img.shields.io/npm/v/strava-declutter.svg?style=flat-square" alt="npm"></a></td>
    <td valign="middle"><img align="texttop" src="https://img.shields.io/npm/dt/strava-declutter.svg?style=flat-square&label=Downloads" alt="Downloads"></td>
    <td valign="middle">Decluttered activities on map</td>
  </tr>
  <tr>
    <td align="center" valign="middle"><a href="./packages/strava-tiles"><img align="texttop" src=".github/assets/icons/strava-tiles.svg" width="20" height="20" alt="strava-tiles"></a></td>
    <td valign="middle"><a href="./packages/strava-tiles"><img align="texttop" src="https://img.shields.io/static/v1?style=flat-square&label=%20&message=strava-tiles&color=000605&logo=github&logoColor=white&labelColor=000605" alt="strava-tiles"></a></td>
    <td valign="middle"><a href="https://www.npmjs.com/package/strava-tiles"><img align="texttop" src="https://img.shields.io/npm/v/strava-tiles.svg?style=flat-square" alt="npm"></a></td>
    <td valign="middle"><img align="texttop" src="https://img.shields.io/npm/dt/strava-tiles.svg?style=flat-square&label=Downloads" alt="Downloads"></td>
    <td valign="middle">Tiles on map</td>
  </tr>
  <tr>
    <td align="center" valign="middle"><a href="./packages/gatsby-source-strava"><img align="texttop" src=".github/assets/icons/gatsby-source-strava.svg" width="38" height="20" alt="gatsby-source-strava"></a></td>
    <td valign="middle"><a href="./packages/gatsby-source-strava"><img align="texttop" src="https://img.shields.io/static/v1?style=flat-square&label=%20&message=gatsby-source-strava&color=000605&logo=github&logoColor=white&labelColor=000605" alt="gatsby-source-strava"></a></td>
    <td valign="middle"><a href="https://www.npmjs.com/package/gatsby-source-strava"><img align="texttop" src="https://img.shields.io/npm/v/gatsby-source-strava.svg?style=flat-square" alt="npm"></a></td>
    <td valign="middle"><img align="texttop" src="https://img.shields.io/npm/dt/gatsby-source-strava.svg?style=flat-square&label=Downloads" alt="Downloads"></td>
    <td valign="middle">Gatsby site</td>
  </tr>
  <tr>
    <td align="center" valign="middle"><a href="./packages/gatsby-strava-declutter"><img align="texttop" src=".github/assets/icons/gatsby-strava-declutter.svg" width="38" height="20" alt="gatsby-strava-declutter"></a></td>
    <td valign="middle"><a href="./packages/gatsby-strava-declutter"><img align="texttop" src="https://img.shields.io/static/v1?style=flat-square&label=%20&message=gatsby-strava-declutter&color=000605&logo=github&logoColor=white&labelColor=000605" alt="gatsby-strava-declutter"></a></td>
    <td valign="middle"><a href="https://www.npmjs.com/package/gatsby-strava-declutter"><img align="texttop" src="https://img.shields.io/npm/v/gatsby-strava-declutter.svg?style=flat-square" alt="npm"></a></td>
    <td valign="middle"><img align="texttop" src="https://img.shields.io/npm/dt/gatsby-strava-declutter.svg?style=flat-square&label=Downloads" alt="Downloads"></td>
    <td valign="middle">Gatsby decluttered map</td>
  </tr>
  <tr>
    <td align="center" valign="middle"><a href="./packages/gatsby-strava-tiles"><img align="texttop" src=".github/assets/icons/gatsby-strava-tiles.svg" width="38" height="20" alt="gatsby-strava-tiles"></a></td>
    <td valign="middle"><a href="./packages/gatsby-strava-tiles"><img align="texttop" src="https://img.shields.io/static/v1?style=flat-square&label=%20&message=gatsby-strava-tiles&color=000605&logo=github&logoColor=white&labelColor=000605" alt="gatsby-strava-tiles"></a></td>
    <td valign="middle"><a href="https://www.npmjs.com/package/gatsby-strava-tiles"><img align="texttop" src="https://img.shields.io/npm/v/gatsby-strava-tiles.svg?style=flat-square" alt="npm"></a></td>
    <td valign="middle"><img align="texttop" src="https://img.shields.io/npm/dt/gatsby-strava-tiles.svg?style=flat-square&label=Downloads" alt="Downloads"></td>
    <td valign="middle">Gatsby covered tiles</td>
  </tr>
  <tr>
    <td align="center" valign="middle"><a href="./packages/gatsby-remark-strava"><img align="texttop" src=".github/assets/icons/gatsby-remark-strava.svg" width="38" height="20" alt="gatsby-remark-strava"></a></td>
    <td valign="middle"><a href="./packages/gatsby-remark-strava"><img align="texttop" src="https://img.shields.io/static/v1?style=flat-square&label=%20&message=gatsby-remark-strava&color=000605&logo=github&logoColor=white&labelColor=000605" alt="gatsby-remark-strava"></a></td>
    <td valign="middle"><a href="https://www.npmjs.com/package/gatsby-remark-strava"><img align="texttop" src="https://img.shields.io/npm/v/gatsby-remark-strava.svg?style=flat-square" alt="npm"></a></td>
    <td valign="middle"><img align="texttop" src="https://img.shields.io/npm/dt/gatsby-remark-strava.svg?style=flat-square&label=Downloads" alt="Downloads"></td>
    <td valign="middle">Markdown / MDX</td>
  </tr>
</table>

## Support this project

<p align="center">
  <a href="https://github.com/cedricdelpoux"><img src="https://images.weserv.nl/?url=github.com/cedricdelpoux.png&w=128&h=128&fit=cover&mask=circle" width="64" height="64" alt="Cédric Delpoux"></a>
</p>

<p align="center">
  Hi, I'm <a href="https://cedricdelpoux.fr/en">Cédric</a>.<br>
  Between my three kids, I maintain <a href="https://github.com/cedricdelpoux">open source projects</a> during my free time.<br>
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
