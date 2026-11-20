import {StravaError} from "./errors.js"
import {silentLogger} from "./logger.js"
import {parseJson} from "./numbers.js"
import {buildRateLimitError, getWaitMs, isRateLimitError} from "./rate-limit.js"

export const API_URL = "https://www.strava.com/api/v3"
export const OAUTH_URL = "https://www.strava.com/oauth/token"

const TIMEOUT_MS = 30000
const RETRY_DELAYS_MS = [1000, 3000]
const EXPIRY_MARGIN_SECONDS = 60

const sleep = (duration) =>
  new Promise((resolve) => setTimeout(resolve, duration))

const isTransientError = (error) =>
  error.name === "TimeoutError" || error.name === "TypeError"

const toQueryString = (query = {}) =>
  Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null)
    .flatMap(([key, value]) =>
      key.endsWith("[]") && Array.isArray(value)
        ? value.map((item) => `${key}=${encodeURIComponent(item)}`)
        : [`${key}=${encodeURIComponent(value)}`]
    )
    .join("&")

const parseToken = (token) => {
  const parsed = typeof token === "string" ? JSON.parse(token) : token

  if (!parsed || !parsed.access_token || !parsed.refresh_token) {
    throw new Error(
      "Invalid token. Please regenerate one with `strava-sync token`"
    )
  }

  return parsed
}

/**
 * @typedef {object} Logger
 * @property {(message: string) => void} debug
 * @property {(message: string) => void} info
 * @property {(message: string) => void} warn
 */

/**
 * @typedef {object} Client
 * @property {(path: string, query?: object) => Promise<any>} get
 * @property {() => any} getToken
 */

/**
 * @param {object} options
 * @param {string} options.clientId
 * @param {string} options.clientSecret
 * @param {string | object} options.token JSON string or object with `access_token`, `refresh_token` and `expires_at`
 * @param {(token: object) => void | Promise<void>} [options.onTokenRefresh]
 * @param {boolean} [options.waitOnRateLimit] Wait for the next quarter hour on the short rate limit
 * @param {Logger} [options.logger]
 * @param {number} [options.timeoutMs]
 * @param {number[]} [options.retryDelaysMs]
 * @param {(url: string, init?: any) => Promise<any>} [options.fetch]
 * @param {(ms: number) => Promise<void>} [options.wait]
 * @param {() => Date} [options.now]
 * @returns {Client}
 */
export const createClient = ({
  clientId,
  clientSecret,
  token,
  onTokenRefresh,
  waitOnRateLimit = false,
  logger = silentLogger,
  timeoutMs = TIMEOUT_MS,
  retryDelaysMs = RETRY_DELAYS_MS,
  fetch = globalThis.fetch,
  wait = sleep,
  now = () => new Date(),
}) => {
  let currentToken = parseToken(token)

  const refreshToken = async () => {
    const response = await fetch(OAUTH_URL, {
      method: "POST",
      headers: {"content-type": "application/x-www-form-urlencoded"},
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: currentToken.refresh_token,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    const body = parseJson(await response.text())

    if (!response.ok) {
      throw new StravaError(
        "error",
        `Token refresh failed: ${body.message || response.statusText}`,
        {status: response.status}
      )
    }

    const {access_token, refresh_token, expires_at, expires_in} = body

    currentToken = {access_token, refresh_token, expires_at, expires_in}

    if (onTokenRefresh) await onTokenRefresh(currentToken)
  }

  const ensureFreshToken = async () => {
    const isExpired =
      !currentToken.expires_at ||
      currentToken.expires_at - EXPIRY_MARGIN_SECONDS < now().getTime() / 1000

    if (isExpired) await refreshToken()
  }

  const requestOnce = async (path, query) => {
    await ensureFreshToken()

    const queryString = toQueryString(query)
    const url = `${API_URL}/${path}${queryString ? `?${queryString}` : ""}`
    const response = await fetch(url, {
      headers: {authorization: `Bearer ${currentToken.access_token}`},
      signal: AbortSignal.timeout(timeoutMs),
    })
    const body = parseJson(await response.text())

    if (response.status === 429) {
      throw buildRateLimitError({headers: response.headers, path})
    }

    if (!response.ok) {
      throw new StravaError(
        "error",
        `[${path}] ${(body && body.message) || response.statusText}`,
        {path, status: response.status}
      )
    }

    return body
  }

  const requestWithRetries = async (path, query) => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await requestOnce(path, query)
      } catch (error) {
        if (!isTransientError(error)) throw error

        if (attempt < retryDelaysMs.length) {
          await wait(retryDelaysMs[attempt])

          continue
        }

        throw new StravaError("network", `[${path}] ${error.message}`, {path})
      }
    }
  }

  /**
   * GETs a path of the Strava API, waiting and trying again on a transient
   * network error, and on the short rate limit when `waitOnRateLimit` is set.
   * An array value is sent comma separated, except under a key ending in `[]`.
   */
  const get = async (path, query) => {
    for (;;) {
      try {
        return await requestWithRetries(path, query)
      } catch (error) {
        if (!isRateLimitError(error)) throw error

        logger.warn(error.message)

        if (error.code !== "SHORT_LIMIT" || !waitOnRateLimit) throw error

        const waitMs = getWaitMs(now())

        logger.warn(`Waiting ${Math.ceil(waitMs / 60000)} min.`)

        await wait(waitMs)
      }
    }
  }

  return {get, getToken: () => currentToken}
}
