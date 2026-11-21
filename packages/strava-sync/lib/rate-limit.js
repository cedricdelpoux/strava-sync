import {StravaError} from "./errors.js"

const WINDOW_MINUTES = 15
const MARGIN_SECONDS = 5

export const parseRateLimits = (headers) => {
  const read = (name) =>
    headers.get(`x-read${name}`) || headers.get(`x-${name}`)
  const limit = read("ratelimit-limit")
  const usage = read("ratelimit-usage")

  if (!limit || !usage) return null

  const [shortTermLimit, longTermLimit] = limit.split(",").map(Number)
  const [shortTermUsage, longTermUsage] = usage.split(",").map(Number)
  const limits = {
    shortTermLimit,
    longTermLimit,
    shortTermUsage,
    longTermUsage,
  }

  return Object.values(limits).some(Number.isNaN) ? null : limits
}

export const isRateLimitError = (error) =>
  error.code === "SHORT_LIMIT" || error.code === "LONG_LIMIT"

export const buildRateLimitError = ({headers, path}) => {
  const limits = parseRateLimits(headers)
  const isLong =
    limits &&
    limits.longTermLimit > 0 &&
    limits.longTermUsage >= limits.longTermLimit

  if (isLong) {
    return new StravaError(
      "LONG_LIMIT",
      `Long Rate Limit Exceeded. ${limits.longTermUsage}/${limits.longTermLimit} daily requests.`,
      {path, status: 429}
    )
  }

  const usage = limits
    ? ` ${limits.shortTermUsage}/${limits.shortTermLimit} requests per 15 min.`
    : ""

  return new StravaError("SHORT_LIMIT", `Short Rate Limit Exceeded.${usage}`, {
    path,
    status: 429,
  })
}

// Strava resets the short limit at 0, 15, 30 and 45 minutes after the hour,
// not 15 minutes after the limit was reached
export const getNextWindowDate = (now = new Date()) => {
  const date = new Date(now)

  date.setMinutes(
    (Math.floor(date.getMinutes() / WINDOW_MINUTES) + 1) * WINDOW_MINUTES,
    MARGIN_SECONDS,
    0
  )

  return date
}

export const getWaitMs = (now = new Date()) =>
  getNextWindowDate(now).getTime() - now.getTime()
