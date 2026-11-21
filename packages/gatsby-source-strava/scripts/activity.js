#! /usr/bin/env node

const {loadPluginOptions} = require("./config.js")

import("strava-sync").then(({exit, fail, runCommand}) =>
  runCommand("activity", process.argv.slice(2), {
    name: "gatsby-source-strava-activity",
    configFile: "gatsby-config",
    loadConfigFile: loadPluginOptions,
  }).then(exit, fail)
)
