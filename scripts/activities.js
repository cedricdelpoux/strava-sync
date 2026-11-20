#! /usr/bin/env node

const {loadPluginOptions} = require("./config.js")

import("strava-sync").then(({exit, fail, runCommand}) =>
  runCommand("activities", ["--reconcile", ...process.argv.slice(2)], {
    name: "gatsby-source-strava-activities",
    configFile: "gatsby-config",
    loadConfigFile: loadPluginOptions,
  }).then(exit, fail)
)
