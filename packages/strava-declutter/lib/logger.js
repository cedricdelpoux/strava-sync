const noop = () => {}

/**
 * @typedef {object} Logger
 * @property {(message: string) => void} info
 * @property {(message: string) => void} warn
 * @property {(message: string) => void} error
 */

/** @type {Logger} */
export const silentLogger = {info: noop, warn: noop, error: noop}

/** @type {Logger} */
export const consoleLogger = {
  info: (message) => console.log(message),
  warn: (message) => console.warn(message),
  error: (message) => console.error(message),
}
