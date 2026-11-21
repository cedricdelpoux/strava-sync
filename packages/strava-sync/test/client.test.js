import {expect, test, vi} from "vitest"

import {createClient} from "../lib/client.js"

const token = {
  access_token: "access",
  refresh_token: "refresh",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
}

const jsonResponse = (body, init = {}) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status: 200,
    ...init,
  })

const build = (fetch, options = {}) =>
  createClient({
    clientId: "1",
    clientSecret: "secret",
    token,
    fetch,
    retryDelaysMs: [0, 0],
    wait: async () => {},
    ...options,
  })

test("keeps 19 digit ids intact", async () => {
  const fetch = vi.fn(async () =>
    jsonResponse('{"id":4291234567890123456,"distance":1234.5678901234567}')
  )
  const body = await build(fetch).get("activities/1")

  expect(body.id).toBe("4291234567890123456")
  expect(body.distance).toBeCloseTo(1234.5678901234567)
})

test("sends the bearer token and the query, arrays comma separated", async () => {
  const fetch = vi.fn(async () => jsonResponse([]))

  await build(fetch).get("activities/1/streams", {keys: ["time", "latlng"]})
  await build(fetch).get("activities/1", {"photo_sizes[]": [100, 600]})

  const [url, init] = fetch.mock.calls[0]

  expect(url).toBe(
    "https://www.strava.com/api/v3/activities/1/streams?keys=time%2Clatlng"
  )
  expect(init.headers.authorization).toBe("Bearer access")
  expect(fetch.mock.calls[1][0]).toContain(
    "photo_sizes[]=100&photo_sizes[]=600"
  )
})

test("refreshes an expired token and reports it", async () => {
  const onTokenRefresh = vi.fn()
  const fetch = vi.fn(async (url) =>
    String(url).includes("oauth")
      ? jsonResponse({
          access_token: "new",
          refresh_token: "newer",
          expires_at: 9999999999,
          expires_in: 21600,
        })
      : jsonResponse({})
  )
  const client = build(fetch, {
    token: {...token, expires_at: 1},
    onTokenRefresh,
  })

  await client.get("athlete")

  expect(onTokenRefresh).toHaveBeenCalledWith({
    access_token: "new",
    refresh_token: "newer",
    expires_at: 9999999999,
    expires_in: 21600,
  })
  expect(fetch.mock.calls[1][1].headers.authorization).toBe("Bearer new")
})

test("retries a network failure then gives up as a network error", async () => {
  const fetch = vi.fn(async () => {
    throw new TypeError("fetch failed")
  })

  await expect(build(fetch).get("athlete")).rejects.toMatchObject({
    code: "network",
  })
  expect(fetch).toHaveBeenCalledTimes(3)
})

const limited = () =>
  jsonResponse(
    {message: "Rate Limit Exceeded"},
    {
      status: 429,
      headers: {
        "x-readratelimit-limit": "100,1000",
        "x-readratelimit-usage": "100,200",
      },
    }
  )

test("throws the rate limit error by default", async () => {
  const fetch = vi.fn(async () => limited())

  await expect(build(fetch).get("athlete")).rejects.toMatchObject({
    code: "SHORT_LIMIT",
  })
})

test("waits for the next window and tries again when asked to", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(limited())
    .mockResolvedValueOnce(jsonResponse({ok: true}))
  const wait = vi.fn(async () => {})
  const client = build(fetch, {
    waitOnRateLimit: true,
    wait,
    now: () => new Date(2026, 0, 1, 10, 7, 30),
  })

  await expect(client.get("athlete")).resolves.toEqual({ok: true})
  expect(wait).toHaveBeenCalledWith(7 * 60 * 1000 + 35 * 1000)
})

test("never waits on the daily limit", async () => {
  const fetch = vi.fn(async () =>
    jsonResponse(
      {},
      {
        status: 429,
        headers: {
          "x-readratelimit-limit": "100,1000",
          "x-readratelimit-usage": "1,1000",
        },
      }
    )
  )
  const wait = vi.fn()

  await expect(
    build(fetch, {waitOnRateLimit: true, wait}).get("athlete")
  ).rejects.toMatchObject({code: "LONG_LIMIT"})
  expect(wait).not.toHaveBeenCalled()
})
