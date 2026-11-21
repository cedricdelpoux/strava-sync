#! /usr/bin/env node

import {COMMAND_NAMES, exit, fail, runCommand} from "../index.js"

const [command, ...argv] = process.argv.slice(2)

if (!COMMAND_NAMES.includes(command)) {
  console.log(`Usage: strava-sync <${COMMAND_NAMES.join("|")}> [options]`)
  console.log("Run a command with --help to list its options.")

  process.exit(command === undefined || command === "--help" ? 0 : 1)
}

runCommand(command, argv).then(exit, fail)
