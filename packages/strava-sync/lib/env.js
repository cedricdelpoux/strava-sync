import fs from "node:fs"
import path from "node:path"

export const getEnvFiles = (dir = process.cwd()) => {
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(".env"))
    .map((name) => path.join(dir, name))

  return files.length > 0 ? files : [path.join(dir, ".env")]
}

export const parseEnv = (content) => {
  const variables = {}

  for (const line of content.split("\n")) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith("#")) continue

    const separator = trimmed.indexOf("=")

    if (separator === -1) continue

    const name = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim()

    variables[name] = value.replace(/^(['"])(.*)\1$/, "$2")
  }

  return variables
}

// Existing variables win, so that an environment set by a CI is not
// overwritten by a file left over in the project
export const loadEnvFiles = () => {
  for (const file of getEnvFiles()) {
    if (!fs.existsSync(file)) continue

    for (const [name, value] of Object.entries(
      parseEnv(fs.readFileSync(file, "utf8"))
    )) {
      if (process.env[name] === undefined) process.env[name] = value
    }
  }
}

// Sets the variable in place when it is already there, so that running the
// command again refreshes it instead of stacking an outdated one
export const setEnvVariable = (content, name, value) => {
  const lines = content ? content.replace(/\n+$/, "").split("\n") : []
  const isVariable = (line) => line.startsWith(`${name}=`)
  const index = lines.findIndex(isVariable)
  const others = lines.filter((line) => !isVariable(line))

  if (index === -1) {
    others.push(`${name}=${value}`)
  } else {
    others.splice(index, 0, `${name}=${value}`)
  }

  return others.join("\n") + "\n"
}

export const writeToEnvFiles = (name, value) => {
  for (const file of getEnvFiles()) {
    const content = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""

    fs.writeFileSync(file, setEnvVariable(content, name, value))
  }
}

const TOKEN_VARIABLE = "STRAVA_TOKEN"

export const toTokenJson = ({
  access_token,
  refresh_token,
  expires_at,
  expires_in,
}) => JSON.stringify({access_token, refresh_token, expires_at, expires_in})

/**
 * The default `onTokenRefresh`: rewrites `STRAVA_TOKEN` in the .env files that
 * already hold it, so that a refreshed token survives the process.
 */
export const persistTokenToEnvFiles = (token) => {
  for (const file of getEnvFiles()) {
    if (!fs.existsSync(file)) continue

    const content = fs.readFileSync(file, "utf8")

    if (!(TOKEN_VARIABLE in parseEnv(content))) continue

    fs.writeFileSync(
      file,
      setEnvVariable(content, TOKEN_VARIABLE, toTokenJson(token))
    )
  }
}
