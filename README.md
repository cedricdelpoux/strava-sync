# strava-sync

Use Strava as a content source. This monorepo holds `strava-sync`, which keeps a local copy of your Strava activities and routes within the rate limits, `strava-declutter` and `strava-tiles`, which turn that copy into maps, and the Gatsby packages that put all of it in pages and embeds.

## The core

| Package                                           | Description                                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`strava-sync`](./packages/strava-sync)           | Keep a local copy of your Strava activities and routes up to date, within the rate limits |
| [`strava-declutter`](./packages/strava-declutter) | Draw each road of your activities only once on a map                                      |
| [`strava-tiles`](./packages/strava-tiles)         | Compute the map tiles covered by your activities, and draw them as images                 |

They work without Gatsby, for any static site generator or script. `strava-declutter` and `strava-tiles` read what `strava-sync` stores.

## The Gatsby integrations

| Package                                                         | Description                                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`gatsby-source-strava`](./packages/gatsby-source-strava)       | Gatsby plugin to use Strava as a data source, built on `strava-sync`     |
| [`gatsby-strava-declutter`](./packages/gatsby-strava-declutter) | Gatsby plugin to draw each road of your activities only once on a map    |
| [`gatsby-strava-tiles`](./packages/gatsby-strava-tiles)         | Gatsby plugin to add tiles to your activities                            |
| [`gatsby-remark-strava`](./packages/gatsby-remark-strava)       | Gatsby remark plugin to embed Strava activities and profile by their URL |

`gatsby-source-strava` depends on `strava-sync`. `gatsby-strava-declutter` and `gatsby-strava-tiles` read the nodes of `gatsby-source-strava` and depend on `strava-declutter` and `strava-tiles`. Each package has its own README and CHANGELOG.

## Development

The repository uses [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces) and requires Node.js 22.12 or later.

```shell
npm install
npm run lint   # build, then eslint and tsc in each package, then prettier
npm test       # run the tests of each package
npm run build  # generate the type declarations of the ES module packages
npm run format # format the repository with prettier
```

Use `-w <package>` to run a script in one package, for example `npm test -w strava-sync`.

## Releases

The packages are versioned independently with [changesets](https://github.com/changesets/changesets).

1. Run `npm run changeset` to choose the packages and the bump (patch, minor or major) and to describe the change. Commit the generated file with your pull request.
2. When the pull request is merged into `main`, the `Release` workflow opens a "Version packages" pull request. It bumps the versions, updates the changelogs and the dependency ranges between the packages.
3. Merging the "Version packages" pull request publishes the new versions to npm with their provenance and creates the git tags.

## License

[MIT](./LICENCE.md)
