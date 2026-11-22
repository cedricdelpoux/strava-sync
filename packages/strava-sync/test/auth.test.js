import {expect, test, vi} from "vitest"

import {exchangeCode, getAuthorizationUrl} from "../index.js"

test("builds the authorization url with the scopes and the redirect", () => {
  const url = new URL(
    getAuthorizationUrl({
      clientId: "42",
      redirectUri: "http://localhost:1234/callback",
    })
  )

  expect(url.origin + url.pathname).toBe(
    "https://www.strava.com/oauth/authorize"
  )
  expect(Object.fromEntries(url.searchParams)).toEqual({
    client_id: "42",
    redirect_uri: "http://localhost:1234/callback",
    response_type: "code",
    approval_prompt: "auto",
    scope: "read_all,activity:read_all,profile:read_all",
  })
})

test("exchanges the code for a token", async () => {
  const fetch = vi.fn(async () => ({
    ok: true,
    text: async () => JSON.stringify({access_token: "a", refresh_token: "r"}),
  }))

  const token = await exchangeCode({
    clientId: "42",
    clientSecret: "s",
    code: "c",
    fetch,
  })

  expect(token).toEqual({access_token: "a", refresh_token: "r"})

  const [url, init] = fetch.mock.calls[0]

  expect(url).toBe("https://www.strava.com/oauth/token")
  expect(Object.fromEntries(init.body)).toEqual({
    client_id: "42",
    client_secret: "s",
    code: "c",
    grant_type: "authorization_code",
  })
})

test("throws the message Strava returns when the exchange fails", async () => {
  const fetch = async () => ({
    ok: false,
    statusText: "Bad Request",
    text: async () => JSON.stringify({message: "Bad Request"}),
  })

  await expect(
    exchangeCode({clientId: "1", clientSecret: "s", code: "c", fetch})
  ).rejects.toThrow("Token exchange failed: Bad Request")
})
