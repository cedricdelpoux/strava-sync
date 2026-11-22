# strava-sync monorepo

npm workspaces monorepo. The core packages (`strava-sync`, `strava-declutter`, `strava-tiles`) are ESM checked with tsc (JSDoc types), the Gatsby packages are CommonJS JavaScript. Node >= 22.12.

## Layout

- `packages/strava-sync`: the core, ESM with JSDoc types built into the git-ignored `types/`, tested with vitest.
- `packages/gatsby-source-strava`: the Gatsby plugin (depends on `strava-sync`), tested with vitest against a stubbed `fetch`. Its `example/` is a Gatsby site with its own tooling, it is not a workspace.
- `packages/strava-declutter` and `packages/strava-tiles`: the declutter and the tiles, framework agnostic like `strava-sync` (ESM, JSDoc types, vitest, a small CLI each). They take the activities as `strava-sync` stores them and return plain data, with an injected `{info, warn, error}` logger. `strava-tiles/images` draws activity images with `sharp`, an optional peer dependency, and `strava-tiles/map` and `strava-tiles/tiles` are the browser-safe helpers.
- `packages/gatsby-strava-declutter` and `packages/gatsby-strava-tiles`: thin Gatsby adapters over them (options, nodes, schema, plugin order check), that read the nodes of `gatsby-source-strava` (peer dependency `>=4.3.0`). Each has an `example/` site. They load the ES module packages with `import()` in `gatsby-node.js` and lazily in their entry points, since a `require()` of an ES module logs a warning when the package is linked rather than installed. Their `utils/map.js` and `utils/tiles.js` entries are kept for the sites importing them, and `images.js` is the entry for `strava-tiles/images`.
- `packages/gatsby-remark-strava`: remark plugin, with `examples/` sites. It does not use `strava-sync` yet.
- Shared at the root: `eslint.config.js` (one flat config with per-package overrides), `.prettierrc`, `.prettierignore`, `.editorconfig`, `.npmrc`, `.github/`, `.changeset/`, and the single `package-lock.json`.
- The dev dependencies shared by the packages (eslint, prettier, typescript, vitest, coverage, `@types/node`, globals) live in the root `package.json`. A package declares only its own (react, sharp).
- Each package keeps its own `LICENCE.md` copy because npm packs it from the package folder.
- Internal dependency ranges (`strava-sync: ^0.1.0`) stay as they are: npm links the workspace packages while the versions satisfy the ranges.

## Examples

The example sites are not workspaces: each one installs on its own with `npm install` in its folder (its `package-lock.json` is git-ignored), then `npx gatsby build`. The tiles one has a `.npmrc` with `legacy-peer-deps` because `@urbica/react-map-gl` does not accept `mapbox-gl` 3.

- They load the plugins by path in `gatsby-config.js` (`require.resolve("..")`, `require.resolve("../..")`, and `require.resolve("../../gatsby-source-strava")` for the declutter and tiles ones) instead of declaring them as dependencies. A `file:` dependency would make Gatsby follow the symlink and scan `packages/gatsby-source-strava`, including its `example/node_modules`, and fail on a TypeScript file of `rxjs`. The declutter and tiles plugins never import `gatsby-source-strava` at runtime, they only read its nodes.
- They declare `react` and `react-dom` ^18 directly (Gatsby 5), and `allowScripts` in their `package.json`.
- Each one pins its dev server (`gatsby develop -p`, and `gatsby serve -p` when it has a `serve` script) to its own port: `gatsby-source-strava/example` 8107, `gatsby-strava-declutter/example` 8108, `gatsby-strava-tiles/example` 8109, `gatsby-remark-strava/examples/mdx` 8110 and `gatsby-remark-strava/examples/remark` 8111. Gatsby has no strict port option, it offers another port when the pinned one is busy.
- Their `.env` and store folders (`.strava`, `.strava-declutter`) are git-ignored and come from the previous repositories. The `token`, `fetch-activity` and `sync-activities` scripts of the declutter and tiles ones call the scripts of `gatsby-source-strava` by path.

## Commands

Run from the root.

- `npm install`: install everything and link the packages. With npm 10, a fresh resolution without a lock fails on the gatsby peer dependencies (npm bug): use npm 11 (`npx npm@11 install`) when the lock needs to be regenerated.
- `npm run lint`: builds the types first, then runs `eslint` in each package (and `tsc --noEmit` in the ES module ones), then `prettier --check .` at the root.
- `npm test`: runs each package test script (vitest everywhere except `gatsby-remark-strava`, which has none yet). Each one writes `coverage/lcov.info`, git-ignored and not packed. The tests only write in temporary folders.
- `npm run build`: `tsc` in the ES module packages, it writes the git-ignored `types/` folder.
- `npm run format`: `prettier --write .`.
- `npm pack --dry-run -w <package>`: check the published files.

## Releases

Independent versions with changesets (`.changeset/config.json`, base branch `main`).

- A change to a package comes with a changeset: `npm run changeset`.
- `.github/workflows/release.yml` runs `changesets/action` on `main`: it opens the "Version packages" pull request (`npm run version-packages`, which also refreshes the lock), and when that is merged it publishes (`npm run release`, i.e. `changeset publish`) through npm trusted publishing (OIDC, no token).
- A new package is published once by hand (`npm publish -w <name> --access public`), because npm only sets a trusted publisher on an existing package. Then set its trusted publisher on npmjs.com: `cedricdelpoux/strava-sync`, workflow `release.yml`, no environment.
- Tags are `<package>@<version>`. The ones imported before the merge are `gatsby-strava-declutter@0.1.0`, `gatsby-strava-declutter@0.2.0` and `gatsby-remark-strava@1.0.0`, the gatsby plugin keeps its old `v1.0.0` tag.
- `.github/workflows/ci.yml` runs lint and tests on Node 22 and 24 (Gatsby 5 does not support Node 26). The Node 24 job uploads the `coverage/lcov.info` of each package to Codecov, one flag per package (`codecov.yml`, informational statuses, `carryforward`), with the `CODECOV_TOKEN` secret and `fail_ci_if_error: false`.
