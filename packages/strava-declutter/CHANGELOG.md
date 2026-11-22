# Changelog

## 0.1.1

### Patch Changes

- 518c8ae: The command line now creates the folder of the output file when it does not exist. Running `npx strava-declutter --out public/declutter.json`, as the README shows, used to fail with `ENOENT` unless `public` was already there.
- Updated dependencies [d07c4d9]
  - strava-sync@0.1.1
