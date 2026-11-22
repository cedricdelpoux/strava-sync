import fs from "node:fs"
import path from "node:path"

// Unlike the strava-sync store, a missing or unreadable store only means a full declutter
const readJson = async (file) => {
  try {
    return JSON.parse(await fs.promises.readFile(file, "utf8"))
  } catch (e) {
    if (e.code === "ENOENT" || e instanceof SyntaxError) return null

    throw e
  }
}

// Renamed once written, so that an interrupted run never leaves a truncated
// file
const writeJson = async (file, content) => {
  const temporaryFile = `${file}.tmp`

  await fs.promises.mkdir(path.dirname(file), {recursive: true})
  await fs.promises.writeFile(temporaryFile, JSON.stringify(content))
  await fs.promises.rename(temporaryFile, file)
}

export const createDeclutterStore = ({dir}) => {
  const stateFile = path.join(dir, "state.json")
  const resultsFile = path.join(dir, "results.json")

  return {
    dir,

    async read(digest) {
      const state = await readJson(stateFile)

      if (!state || state.digest !== digest) return null

      const results = await readJson(resultsFile)

      return results && {entries: state.entries, results: new Map(results)}
    },

    // Without `state.json` until both are written, so that they always match
    async write(digest, {entries, results}) {
      await fs.promises.rm(stateFile, {force: true})
      await writeJson(resultsFile, [...results])
      await writeJson(stateFile, {digest, entries})
    },
  }
}
