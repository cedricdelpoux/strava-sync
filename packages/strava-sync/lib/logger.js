const noop = () => {}

/** @type {import("./client.js").Logger} */
export const silentLogger = {debug: noop, info: noop, warn: noop}

/** @type {import("./client.js").Logger} */
export const consoleLogger = {
  debug: noop,
  info: (message) => console.log(message),
  warn: (message) => console.warn(message),
}
