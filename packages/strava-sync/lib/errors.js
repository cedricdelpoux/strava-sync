export class StravaError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {{path?: string, status?: number}} [extra]
   */
  constructor(code, message, {path, status} = {}) {
    super(message)

    this.name = "StravaError"
    this.code = code
    this.path = path
    this.status = status
  }
}
