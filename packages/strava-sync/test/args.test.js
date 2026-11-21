import {expect, test} from "vitest"

import {STREAMS_TYPES, parseArgs} from "../lib/cli/args.js"

const options = ["streams", "photos", "all", "after", "dir", "write"]

test("reads detail options into the shape the sync takes", () => {
  const args = parseArgs(["--streams", "latlng,time", "--photos=600"], {
    options,
  })

  expect(args.details).toEqual({
    withStreams: true,
    streamsTypes: ["latlng", "time"],
    withPhotos: 600,
  })
})

test("asks for every stream type when none is given", () => {
  expect(parseArgs(["--streams"], {options}).details.streamsTypes).toEqual(
    STREAMS_TYPES
  )
})

test("reads the activity id after a valueless option", () => {
  const args = parseArgs(["--streams", "4291234567"], {
    options,
    withActivityId: true,
  })

  expect(args.activityId).toBe("4291234567")
})

test("rejects an unknown option and a stray argument", () => {
  expect(() => parseArgs(["--nope"], {options})).toThrow("Unknown option")
  expect(() => parseArgs(["stray"], {options})).toThrow("Unexpected argument")
})

test("takes a date or a timestamp", () => {
  expect(parseArgs(["--after", "2026-01-01"], {options}).after).toBe(
    Date.parse("2026-01-01") / 1000
  )
  expect(parseArgs(["--after=1750000000000"], {options}).after).toBe(1750000000)
})

test("rejects a date it cannot read", () => {
  expect(() => parseArgs(["--after", "soon"], {options})).toThrow(
    "needs a date or a timestamp"
  )
})
