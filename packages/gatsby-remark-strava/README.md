<div align="center">
  <h1>gatsby-remark-strava</h1>
  <br/>
  <p>
    <img src="./logo.svg" alt="gatsby-remark-strava" height="100px">
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

Gatsby remark plugin to embed [Strava](https://www.strava.com/) activities and routes by their URL.

It works in two modes, chosen by its options:

- **Embed mode**, the default, shows the official [Strava embed](https://support.strava.com/hc/en-us/articles/216919437-Sharing-Your-Activities-and-Routes-With-a-Strava-Embed). It needs no token and makes no request.
- **Render mode**, when you give a `render` function, builds your own markup from the activity. The activity comes from the store of [strava-sync](https://github.com/cedricdelpoux/strava-sync), the one `gatsby-source-strava` fills, and is fetched from Strava only when it is missing.

> Requires Node 22.12 or later.

## Usage

1. Download `gatsby-remark-strava` from the NPM registry:

```shell
npm install gatsby-remark-strava
```

2. Add the plugin to your `gatsby-config.js` file. It must be a child plugin of `gatsby-transformer-remark`, or a `gatsbyRemarkPlugins` entry of `gatsby-plugin-mdx`.

```js
module.exports = {
  plugins: [
    {
      resolve: "gatsby-transformer-remark",
      options: {
        plugins: ["gatsby-remark-strava"],
      },
    },
  ],
}
```

3. Add a link to your content, alone in its paragraph:

```md
[strava activity 3657585594 embed](https://www.strava.com/activities/3657585594)

[strava route 3350146254546787420 embed](https://www.strava.com/routes/3350146254546787420)
```

The link text must contain "embed" (whatever the case), so that a plain link to an activity stays a link. The URL is `https://www.strava.com/activities/<id>` or `https://www.strava.com/routes/<id>`, with an optional trailing slash or query.

## Embed mode

The link becomes the placeholder of the official embed, and a small script of the plugin loads `https://strava-embeds.com/embed.js` on the pages that have one. The script replaces each placeholder with an iframe, also when the page is reached by a client side navigation.

```html
<div
  class="strava-embed-placeholder"
  data-embed-type="activity"
  data-embed-id="3657585594"
></div>
```

Strava only shows what is public:

- an activity needs its profile and its visibility set to Everyone,
- a route needs to be public.

Segments are not supported.

## Render mode

Give a `render` function that receives the activity and returns the markup. Routes keep the official embed.

```js
module.exports = {
  plugins: [
    {
      resolve: "gatsby-plugin-mdx",
      options: {
        gatsbyRemarkPlugins: [
          {
            resolve: "gatsby-remark-strava",
            options: {
              output: "mdx",
              storeDir: ".strava",
              stravaClientId: process.env.STRAVA_CLIENT_ID,
              stravaClientSecret: process.env.STRAVA_CLIENT_SECRET,
              stravaToken: process.env.STRAVA_TOKEN,
              render: (activity) => {
                const date = new Date(activity.start_date).toLocaleDateString(
                  "en-us",
                  {year: "numeric", month: "short", day: "numeric"}
                )

                return `
                  <strava
                    id="${activity.id}"
                    name="${activity.name}"
                    distance="${activity.distance}"
                    start_date="${date}"
                    photo="${activity.photos?.primary?.urls["600"] || ""}"
                  />
                `
              },
            },
          },
        ],
      },
    },
  ],
}
```

- The activity is read from the `storeDir` folder first, so a site that uses `gatsby-source-strava` needs no request, and no token. The store holds what that plugin fetched: details such as `calories` or the primary photo are there only if it fetched them.
- An activity missing from the store is fetched with `strava-sync`, which needs `stravaClientId`, `stravaClientSecret` and `stravaToken`. Up to 4 requests run at once, and the activity is kept in the Gatsby cache.
- Generate the token with `npx strava-sync token`, see the [strava-sync](https://github.com/cedricdelpoux/strava-sync) documentation.

## Usage with MDX

`gatsby-plugin-mdx` turns raw HTML nodes into inert `<span dangerouslySetInnerHTML>` elements. Set `output: "mdx"` to emit JSX elements instead, in both modes.

With `output: "mdx"`, the markup returned by `render` must be a single JSX element, so use `className` instead of `class` and an object for `style`. Every tag goes through the components given to `MDXProvider`, so a custom tag such as `<strava>` can be mapped to a React component. A capitalized tag must be provided there, otherwise MDX throws.

See the [remark](./examples/remark) example for the embed mode, and the [mdx](./examples/mdx) one for the render mode.

## Options

| Option               | Default     | Description                                                                          |
| -------------------- | ----------- | ------------------------------------------------------------------------------------ |
| `render`             |             | Function receiving the activity and returning the markup. It switches to render mode |
| `output`             | `"html"`    | `"html"` for `gatsby-transformer-remark`, `"mdx"` for `gatsby-plugin-mdx` (MDX v2+)  |
| `storeDir`           | `".strava"` | Store folder, relative to the site, the same as the `gatsby-source-strava` option    |
| `stravaClientId`     |             | Strava application client ID, to fetch an activity missing from the store            |
| `stravaClientSecret` |             | Strava application client secret                                                     |
| `stravaToken`        |             | Strava token, as generated by `strava-sync token`                                    |
| `debug`              | `false`     | Logs every embed that succeeds                                                       |

A link that cannot be turned into an embed, because of a failing `render` or a missing activity, stays a link and logs a warning.

## Migrating from 1.x

- The iframe `https://www.strava.com/activities/<id>/embed/<token>` stopped displaying, Strava no longer supports it. The default is now the official embed, which needs a public activity and no token. Remove the three Strava options if you do not use `render`.
- Routes links are embedded too.
- The `gatsby-remark-strava-token` command is gone. Run `npx strava-sync token` instead, it writes the same `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` and `STRAVA_TOKEN` variables.
- `render` is kept, and now switches to render mode. The activity is read from the `gatsby-source-strava` store before Strava is called, so the token is only needed for an activity that is not in it. Set `storeDir` if you moved the store.
- `output` and `debug` are kept. The fetched activity is cached, not the markup.
- Node 22.12 or later is required.

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

[badge-npm]: https://img.shields.io/npm/v/gatsby-remark-strava.svg?style=flat-square
[badge-downloads]: https://img.shields.io/npm/dt/gatsby-remark-strava.svg?style=flat-square
[badge-build]: https://img.shields.io/github/actions/workflow/status/cedricdelpoux/strava-sync/ci.yml?branch=main&style=flat-square
[badge-coverage]: https://img.shields.io/codecov/c/github/cedricdelpoux/strava-sync/main.svg?flag=gatsby-remark-strava&style=flat-square
[badge-prs]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[badge-licence]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square
[badge-sponsor]: https://img.shields.io/badge/sponsor-%E2%99%A5-ea4aaa.svg?style=flat-square
[npm]: https://www.npmjs.com/package/gatsby-remark-strava
[actions]: https://github.com/cedricdelpoux/strava-sync/actions/workflows/ci.yml
[codecov]: https://app.codecov.io/gh/cedricdelpoux/strava-sync/tree/main/packages/gatsby-remark-strava
[contributing]: https://github.com/cedricdelpoux/strava-sync/blob/main/CONTRIBUTING.md
[licence]: https://github.com/cedricdelpoux/strava-sync/blob/main/LICENCE.md
[sponsor]: #support-this-project
