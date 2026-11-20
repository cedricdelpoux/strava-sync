export const to10DigitTimestamp = (timestamp) => {
  if (!timestamp) return null

  if (timestamp.toString().length === 13) return Math.round(timestamp / 1000)

  return Number.parseInt(timestamp)
}

/** Timestamp in seconds from a timestamp in seconds or milliseconds, a date, or a date string. NaN when it is none of them */
export const toSeconds = (value) => {
  if (!value) return null

  if (value instanceof Date) return Math.round(value.getTime() / 1000)

  if (typeof value === "string" && !/^\d+$/.test(value)) {
    return Math.round(Date.parse(value) / 1000)
  }

  return to10DigitTimestamp(value)
}
