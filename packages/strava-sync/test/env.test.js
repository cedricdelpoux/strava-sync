import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import {afterEach, beforeEach, expect, test, vi} from "vitest"

import {persistTokenToEnvFiles, setEnvVariable} from "../lib/env.js"
import {normalizeIds, pruneBacklinks} from "../lib/normalize.js"

let dir

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "strava-sync-env-"))
  vi.spyOn(process, "cwd").mockReturnValue(dir)
})

afterEach(() => {
  vi.restoreAllMocks()
  fs.rmSync(dir, {recursive: true, force: true})
})

test("sets a variable in place", () => {
  expect(setEnvVariable("A=1\nB=2\n", "A", "3")).toBe("A=3\nB=2\n")
  expect(setEnvVariable("A=1\n", "B", "2")).toBe("A=1\nB=2\n")
})

test("rewrites STRAVA_TOKEN only in the files that hold it", () => {
  fs.writeFileSync(path.join(dir, ".env"), "OTHER=1\nSTRAVA_TOKEN={}\n")
  fs.writeFileSync(path.join(dir, ".env.example"), "OTHER=1\n")

  persistTokenToEnvFiles({
    access_token: "a",
    refresh_token: "r",
    expires_at: 1,
    expires_in: 2,
    scope: "ignored",
  })

  expect(fs.readFileSync(path.join(dir, ".env"), "utf8")).toBe(
    'OTHER=1\nSTRAVA_TOKEN={"access_token":"a","refresh_token":"r","expires_at":1,"expires_in":2}\n'
  )
  expect(fs.readFileSync(path.join(dir, ".env.example"), "utf8")).toBe(
    "OTHER=1\n"
  )
})

test("turns ids into strings and drops their _str twins", () => {
  expect(
    normalizeIds({
      id: 1,
      id_str: "1",
      upload_id: null,
      badge_type_id: 3,
      athlete: {id: 2},
    })
  ).toEqual({id: "1", upload_id: null, badge_type_id: 3, athlete: {id: "2"}})
})

test("prunes the backlinks of a collection", () => {
  const node = {laps: [{id: 1, activity: {}, athlete: {}}]}

  pruneBacklinks(node, {laps: ["activity", "athlete"]})

  expect(node.laps).toEqual([{id: 1}])
})
