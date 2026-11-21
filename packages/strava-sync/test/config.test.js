import {expect, test} from "vitest"

import {resolveOptions} from "../lib/cli/config.js"

const args = {details: {}, noConfig: false}

test("reads the bounds of the config as a date or a timestamp", async () => {
  const loadConfigFile = async () => ({
    after: "2026-01-01",
    before: 1750000000000,
    details: {withLaps: true},
    storeDir: "/store",
  })

  const options = await resolveOptions(args, loadConfigFile)

  expect(options.after).toBe(Date.parse("2026-01-01") / 1000)
  expect(options.before).toBe(1750000000)
  expect(options.storeDir).toBe("/store")
})

test("puts the command line over the config", async () => {
  const loadConfigFile = async () => ({
    after: 1,
    details: {withLaps: true, withKudos: true},
    storeDir: "/store",
  })

  const options = await resolveOptions(
    {...args, after: 2, details: {withKudos: false}, storeDir: "/other"},
    loadConfigFile
  )

  expect(options).toMatchObject({
    after: 2,
    details: {withLaps: true, withKudos: false},
    storeDir: "/other",
  })
})

test("rejects a bound that is not a date", async () => {
  await expect(
    resolveOptions(args, async () => ({after: "soon"}))
  ).rejects.toThrow("not a date")
})
