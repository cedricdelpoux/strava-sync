---
"strava-tiles": patch
---

The command line now creates the folder of the output file when it does not exist. Running `npx strava-tiles --out public/tiles.json`, as the README shows, used to fail with `ENOENT` unless `public` was already there.
