import JSONbig from "json-bigint"

// json-bigint turns any number of about sixteen digits or more into a
// BigNumber. Decimals of that size are measurements, and a rounding way below
// what a GPS records is harmless. Integers of that size are ids: a double
// would change their last digits, so they stay strings.
export const toNumbers = (value) => {
  if (Array.isArray(value)) return value.map(toNumbers)

  if (value && typeof value === "object") {
    if (value._isBigNumber === true) {
      return value.isInteger() ? value.toString() : Number(value.toString())
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, toNumbers(nested)])
    )
  }

  return value
}

export const parseJson = (text) => {
  try {
    return toNumbers(JSONbig.parse(text))
  } catch {
    return text
  }
}
