# strava-sync monorepo

npm workspaces monorepo. The core packages (`strava-sync`, `strava-declutter`, `strava-tiles`) are ESM checked with tsc (JSDoc types), the Gatsby packages are CommonJS JavaScript. Node >= 22.12.

## Layout

- `packages/strava-sync`: the core, ESM with JSDoc types built into the git-ignored `types/`, tested with vitest.
- `packages/gatsby-source-strava`: the Gatsby plugin (depends on `strava-sync`), tested with vitest against a stubbed `fetch`. Its `example/` is a Gatsby site with its own tooling, it is not a workspace.
- `packages/strava-declutter` and `packages/strava-tiles`: the declutter and the tiles, framework agnostic like `strava-sync` (ESM, JSDoc types, vitest, a small CLI each). They take the activities as `strava-sync` stores them and return plain data, with an injected `{info, warn, error}` logger. `strava-tiles/images` draws activity images with `sharp`, an optional peer dependency, and `strava-tiles/map` and `strava-tiles/tiles` are the browser-safe helpers.
- `packages/gatsby-strava-declutter` and `packages/gatsby-strava-tiles`: thin Gatsby adapters over them (options, nodes, schema, plugin order check), that read the nodes of `gatsby-source-strava` (peer dependency `>=4.3.0`). Each has an `example/` site. They load the ES module packages with `import()` in `gatsby-node.js` and lazily in their entry points, since a `require()` of an ES module logs a warning when the package is linked rather than installed. Their `utils/map.js` and `utils/tiles.js` entries are kept for the sites importing them, and `images.js` is the entry for `strava-tiles/images`.
- `packages/gatsby-remark-strava`: remark plugin with two modes, with `examples/` sites: the official Strava embed by default (a placeholder, and a `gatsby-browser.js` that loads `embed.js` on the pages that have one), and a `render` mode that reads the activity from the `strava-sync` store (the `gatsby-source-strava` one) and fetches it only when missing. It loads `strava-sync` with `import()` and is tested with vitest.
- Shared at the root: `eslint.config.js` (one flat config with per-package overrides), `.prettierrc`, `.prettierignore`, `.editorconfig`, `.npmrc`, `.github/`, `.changeset/`, and the single `package-lock.json`.
- The dev dependencies shared by the packages (eslint, prettier, typescript, vitest, coverage, `@types/node`, globals) live in the root `package.json`. A package declares only its own (react, sharp).
- Each package keeps its own `LICENCE.md` copy because npm packs it from the package folder.
- Internal dependency ranges (`strava-sync: ^0.1.0`) stay as they are: npm links the workspace packages while the versions satisfy the ranges.

## Logos

Each package has a `logo.svg` (the README header) and a table icon in `.github/assets/icons/<package>.svg` (the root README table). The root `logo.svg` is the `strava-sync` one.

- The logo is the Strava app icon: an orange `#FC4C02` tile (224 px, `rx` 56) with the white Strava chevron centred in it. The chevron never moves.
- The bottom-right badge says what the package does. The bottom-left badge is the framework it plugs into, and only framework packages have one. Both are discs of radius 51 centred on the tile corners, (224, 224) and (0, 224), each with a transparent gap of radius 65 cut into the tile.
- Every logo uses the same `viewBox="-53 -2 330 279"`, so the tile renders at the same size and place in every README header.
- Badge colours, with a white glyph: sync `#0969DA`, declutter funnel `#1A7F37`, tiles grid `#BF3989`, remark M↓ `#3D444D` at 90% opacity, Gatsby `#639`. A new feature or framework (Astro, Next) gets its own colour, distinct from these and from the Strava orange.
- The table icon is the feature disc alone, or for a framework package, the framework disc on the left, partly hidden behind the feature disc on the right, both the same size, with a gap cut between them. A one-disc icon uses `viewBox="0 0 102 102"`, exactly the disc of radius 51. A two-disc icon uses `viewBox="0 0 194 102"` with both discs at that same full size: the framework disc at `translate(0 0)`, the feature disc at `translate(92 0)`, so the discs barely overlap, and a mask cutting a circle of radius 59 centred on the feature disc (`cx` 143) (radius 51 plus an 8 px gap) out of the framework disc. The README table shows every icon 20 px tall (`20x20` for one disc, `38x20` for two), the height of the badges next to it so they line up in each row, so every disc is 20 px, and linked to its package folder because GitHub otherwise wraps the img in a link to the raw SVG.
- The root README packages table is an HTML `<table>`, not a Markdown one, because every cell needs `valign="middle"` and every `<img>` needs `align="texttop"` to be vertically centred on GitHub. In a Markdown table the badge links sit about 3 px above the plain text. GitHub strips `style`, so these attributes are the only lever. Measured with github-markdown-css, `texttop` leaves a 1 px offset, where `middle` gives +4, `absmiddle` +1.8 and `top` -2.

## Examples

The example sites are not workspaces: each one installs on its own with `npm install` in its folder (its `package-lock.json` is git-ignored), then `npx gatsby build`. The tiles one has a `.npmrc` with `legacy-peer-deps` because `@urbica/react-map-gl` does not accept `mapbox-gl` 3.

- They load the plugins by path in `gatsby-config.js` (`require.resolve("..")`, `require.resolve("../..")`, and `require.resolve("../../gatsby-source-strava")` for the declutter and tiles ones) instead of declaring them as dependencies. A `file:` dependency would make Gatsby follow the symlink and scan `packages/gatsby-source-strava`, including its `example/node_modules`, and fail on a TypeScript file of `rxjs`. The declutter and tiles plugins never import `gatsby-source-strava` at runtime, they only read its nodes.
- Their `dev`, `start`, `build` and `serve` scripts set `NODE_OPTIONS=--no-deprecation`. Gatsby prints every stderr line of its worker processes as `ERROR UNKNOWN`, and Node's `DEP0040` punycode warning (`uri-js` and `node-fetch` 2, pulled by Gatsby, call `require("punycode")`, which resolves to the deprecated built-in) would show up as two of them on every build. An `overrides` entry cannot fix it, the built-in wins over the userland package.
- They declare `react` and `react-dom` ^18 directly (Gatsby 5), and `allowScripts` in their `package.json`.
- Each one pins its dev server (`gatsby develop -p`, and `gatsby serve -p` when it has a `serve` script) to its own port: `gatsby-source-strava/example` 8107, `gatsby-strava-declutter/example` 8108, `gatsby-strava-tiles/example` 8109, `gatsby-remark-strava/examples/mdx` 8110 (render mode) and `gatsby-remark-strava/examples/remark` 8111 (embed mode). Gatsby has no strict port option, it offers another port when the pinned one is busy.
- Their `.env` and store folders (`.strava`, `.strava-declutter`) are git-ignored and come from the previous repositories. The `token`, `fetch-activity` and `sync-activities` scripts of the declutter and tiles ones call the scripts of `gatsby-source-strava` by path.

## Commands

Run from the root.

- `npm install`: install everything and link the packages. With npm 10, a fresh resolution without a lock fails on the gatsby peer dependencies (npm bug): use npm 11 (`npx npm@11 install`) when the lock needs to be regenerated.
- `npm run lint`: builds the types first, then runs `eslint` in each package (and `tsc --noEmit` in the ES module ones), then `prettier --check .` at the root.
- `npm test`: runs each package test script (vitest). Each one writes `coverage/lcov.info`, git-ignored and not packed. The tests only write in temporary folders.
- `npm run build`: `tsc` in the ES module packages, it writes the git-ignored `types/` folder.
- `npm run format`: `prettier --write .`.
- `npm pack --dry-run -w <package>`: check the published files.

## Releases

Independent versions with changesets (`.changeset/config.json`, base branch `main`). There is no "Version packages" pull request: the repository has a single maintainer, so releases are versioned locally.

- A change to a package comes with a changeset: `npm run changeset`.
- To release, version locally and push to `main`: run `npx npm@11 run version-packages`, which applies the changesets and refreshes the lock, then commit one `chore(<package>): bump version to vX.Y.Z` per bumped package (the root lock in the last one) and push to `main`.
- `.github/workflows/release.yml` runs `changesets/action` on `main`. With no pending changeset left, it publishes the new versions (`npm run release`, i.e. `changeset publish`) through npm trusted publishing (OIDC, no token). A step before it fails the workflow when a changeset is still pending, so the action never opens a "Version packages" pull request.
- A new package is published once by hand (`npm publish -w <name> --access public`), because npm only sets a trusted publisher on an existing package. Then set its trusted publisher on npmjs.com: `cedricdelpoux/strava-sync`, workflow `release.yml`, no environment. The trusted publisher stays "pending validation" until one CI publish succeeds.
- Never publish a package that depends on a new version before that version is `latest` on npm.
- Tags are `<package>@<version>`. The ones imported before the merge are `gatsby-strava-declutter@0.1.0`, `gatsby-strava-declutter@0.2.0` and `gatsby-remark-strava@1.0.0`, the gatsby plugin keeps its old `v1.0.0` tag.
- `.github/workflows/ci.yml` runs lint and tests on Node 22 and 24 (Gatsby 5 does not support Node 26). The Node 24 job uploads the `coverage/lcov.info` of each package to Codecov, one flag per package (`codecov.yml`, informational statuses, `carryforward`), with the `CODECOV_TOKEN` secret and `fail_ci_if_error: false`.
