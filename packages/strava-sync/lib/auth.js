import http from "node:http"
import readline from "node:readline/promises"

import open from "open"

import {OAUTH_URL} from "./client.js"
import {toTokenJson, writeToEnvFiles} from "./env.js"
import {parseJson} from "./numbers.js"

const SCOPE = "read_all,activity:read_all,profile:read_all"

// The port is picked by the system: a hardcoded one fails as soon as
// something else listens on it, the AirPlay receiver owns 5000 on macOS.
// Strava only checks the callback domain, not its port.
export const startCallbackServer = async () => {
  let resolveCode
  let rejectCode
  const code = new Promise((resolve, reject) => {
    resolveCode = resolve
    rejectCode = reject
  })
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://localhost")

    if (url.pathname !== "/callback") {
      response.writeHead(404).end()

      return
    }

    const authorizationCode = url.searchParams.get("code")

    response.end(
      authorizationCode
        ? "Succeed! You can close this tab and go back to your terminal."
        : "Authorization failed. Go back to your terminal and retry."
    )

    if (authorizationCode) {
      resolveCode(authorizationCode)
    } else {
      rejectCode(new Error("Strava did not return an authorization code"))
    }
  })

  await /** @type {Promise<void>} */ (
    new Promise((resolve, reject) => {
      server.once("error", reject)
      server.listen(0, () => resolve())
    })
  )

  return {
    code,
    port: /** @type {import("node:net").AddressInfo} */ (server.address()).port,
    close: () => server.close(),
  }
}

/**
 * @param {{clientId: string, redirectUri: string}} options
 * @returns {string} The Strava page where the user authorizes the application
 */
export const getAuthorizationUrl = ({clientId, redirectUri}) =>
  "https://www.strava.com/oauth/authorize?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: SCOPE,
  })

/**
 * @param {{clientId: string, clientSecret: string, code: string, fetch?: typeof globalThis.fetch}} options
 * @returns {Promise<any>} The token Strava returns for the authorization code
 */
export const exchangeCode = async ({
  clientId,
  clientSecret,
  code,
  fetch = globalThis.fetch,
}) => {
  const response = await fetch(OAUTH_URL, {
    method: "POST",
    headers: {"content-type": "application/x-www-form-urlencoded"},
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  })
  const body = parseJson(await response.text())

  if (!response.ok) {
    throw new Error(
      `Token exchange failed: ${body.message || response.statusText}`
    )
  }

  return body
}

const ask = async (rl, question) => {
  for (;;) {
    const answer = (await rl.question(question)).trim()

    if (answer) return answer
  }
}

/** Asks for the Client ID and Secret, authorizes in the browser, and writes the three variables to the .env files */
export const generateToken = async () => {
  console.log("Create a Strava application API at")
  console.log("https://www.strava.com/settings/api")
  console.log("")
  console.log("Copy your `Client ID` and `Client secret`")

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  const clientId = await ask(rl, "Strava Client ID: ")
  const clientSecret = await ask(rl, "Strava Client Secret: ")

  rl.close()

  writeToEnvFiles("STRAVA_CLIENT_ID", clientId)
  writeToEnvFiles("STRAVA_CLIENT_SECRET", clientSecret)

  const callbackServer = await startCallbackServer()

  await open(
    getAuthorizationUrl({
      clientId,
      redirectUri: `http://localhost:${callbackServer.port}/callback`,
    })
  )

  const code = await callbackServer.code

  callbackServer.close()

  writeToEnvFiles(
    "STRAVA_TOKEN",
    toTokenJson(await exchangeCode({clientId, clientSecret, code}))
  )

  console.log("")
  console.log("Token added successfully to your .env files")
}
