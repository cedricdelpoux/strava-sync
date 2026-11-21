import {expect, test} from "vitest"

import {
  buildRateLimitError,
  getNextWindowDate,
  getWaitMs,
  parseRateLimits,
} from "../lib/rate-limit.js"

test("waits until the next quarter hour plus 5 seconds", () => {
  const now = new Date(2026, 0, 1, 10, 7, 30)

  expect(getNextWindowDate(now)).toEqual(new Date(2026, 0, 1, 10, 15, 5))
  expect(getWaitMs(now)).toBe(7 * 60 * 1000 + 35 * 1000)
})

test("rolls over to the next hour from the last quarter", () => {
  const now = new Date(2026, 0, 1, 10, 45, 0)

  expect(getNextWindowDate(now)).toEqual(new Date(2026, 0, 1, 11, 0, 5))
})

test("moves to the following quarter when exactly on one", () => {
  expect(getNextWindowDate(new Date(2026, 0, 1, 10, 30, 0))).toEqual(
    new Date(2026, 0, 1, 10, 45, 5)
  )
})

test("reads the read rate limit headers before the overall ones", () => {
  const headers = new Headers({
    "x-ratelimit-limit": "200,2000",
    "x-ratelimit-usage": "1,1",
    "x-readratelimit-limit": "100,1000",
    "x-readratelimit-usage": "99,500",
  })

  expect(parseRateLimits(headers)).toEqual({
    shortTermLimit: 100,
    longTermLimit: 1000,
    shortTermUsage: 99,
    longTermUsage: 500,
  })
})

test("falls back to the overall headers", () => {
  const headers = new Headers({
    "x-ratelimit-limit": "200,2000",
    "x-ratelimit-usage": "3,4",
  })

  expect(parseRateLimits(headers).longTermUsage).toBe(4)
})

test("types a 429 by the limit that is reached", () => {
  const daily = new Headers({
    "x-readratelimit-limit": "100,1000",
    "x-readratelimit-usage": "10,1000",
  })
  const quarter = new Headers({
    "x-readratelimit-limit": "100,1000",
    "x-readratelimit-usage": "100,200",
  })

  expect(buildRateLimitError({headers: daily, path: "x"}).code).toBe(
    "LONG_LIMIT"
  )
  expect(buildRateLimitError({headers: quarter, path: "x"}).code).toBe(
    "SHORT_LIMIT"
  )
  expect(buildRateLimitError({headers: new Headers(), path: "x"}).code).toBe(
    "SHORT_LIMIT"
  )
})
