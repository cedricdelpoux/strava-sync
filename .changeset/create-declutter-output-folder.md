---
"strava-declutter": patch
---

The command line now creates the folder of the output file when it does not exist. Running `npx strava-declutter --out public/declutter.json`, as the README shows, used to fail with `ENOENT` unless `public` was already there.
