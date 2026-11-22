# Contributing

Pull requests are welcome. For bugs and feature requests, please [create an issue](https://github.com/cedricdelpoux/strava-sync/issues).

The repository uses npm workspaces and Node.js 22.12 or later:

```shell
npm install
npm test          # or npm test -w <package>
npm run lint
npm run format
npm run changeset # describe your change, it drives the release
```

With npm 10, a fresh resolution without a lock file fails on the Gatsby peer dependencies because of an npm bug. Use npm 11 (`npx npm@11 install`) when the lock file needs to be regenerated.

Every change to a package comes with a changeset. The maintainer versions the packages locally and pushes the result to `main`, and the `Release` workflow then publishes the new versions to npm.

## Examples

The examples are Gatsby sites that use the packages of the repository. They are not workspaces: run `npm install` in one of them, then `npx gatsby develop` or `npx gatsby build`. Each one pins its dev server to its own port:

| Example                                | Port |
| -------------------------------------- | ---- |
| `gatsby-source-strava/example`         | 8107 |
| `gatsby-strava-declutter/example`      | 8108 |
| `gatsby-strava-tiles/example`          | 8109 |
| `gatsby-remark-strava/examples/mdx`    | 8110 |
| `gatsby-remark-strava/examples/remark` | 8111 |

Gatsby has no strict port option, so it offers another port when the pinned one is busy.

## Commit messages

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org): `type: subject`, for example `fix:`, `feat:`, `chore:` or `docs:`. The subject starts with a verb in the imperative mood, such as `fix: refresh the token before it expires`.
