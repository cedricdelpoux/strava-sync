#! /usr/bin/env node

import("strava-sync").then(({exit, fail, runCommand}) =>
  runCommand("token", process.argv.slice(2), {
    name: "gatsby-source-strava-token",
  }).then(exit, fail)
)
