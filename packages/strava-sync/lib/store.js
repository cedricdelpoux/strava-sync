import fs from "node:fs/promises"
import path from "node:path"

/**
 * @typedef {object} Store
 * @property {() => Promise<any[]>} readActivities
 * @property {(id: string | number) => Promise<any | null>} readActivity
 * @property {(activity: any) => Promise<void>} writeActivity
 * @property {(id: string | number) => Promise<void>} deleteActivity
 * @property {() => Promise<{lastFetch?: number}>} readState
 * @property {(state: any) => Promise<void>} writeState
 * @property {() => Promise<any | null>} readAthlete
 * @property {(athlete: any) => Promise<void>} writeAthlete
 * @property {() => Promise<any[] | null>} readRoutes
 * @property {(routes: any[]) => Promise<void>} writeRoutes
 * @property {(id: string) => Promise<any | null>} readRouteStream
 * @property {(id: string, stream: any) => Promise<void>} writeRouteStream
 */

const readJson = async (file) => {
  let content

  try {
    content = await fs.readFile(file, "utf8")
  } catch (error) {
    if (error.code === "ENOENT") return null

    throw error
  }

  try {
    return JSON.parse(content)
  } catch {
    throw new Error(`${file} is not valid JSON, delete it to fetch it again`)
  }
}

// Written next to the target then renamed, so that an interrupted write
// leaves the previous version behind rather than a truncated file
const writeJson = async (file, content) => {
  const temporaryFile = `${file}.${process.pid}.${Date.now()}.tmp`

  await fs.mkdir(path.dirname(file), {recursive: true})
  await fs.writeFile(temporaryFile, JSON.stringify(content))
  await fs.rename(temporaryFile, file)
}

/**
 * One JSON file per activity, with `state.json`, `athlete.json`,
 * `routes.json` and `route-streams/<id>.json` next to them.
 * @param {{dir: string}} options
 * @returns {Store & {dir: string}}
 */
export const createFileStore = ({dir}) => {
  const activitiesDir = path.join(dir, "activities")
  const activityFile = (id) => path.join(activitiesDir, `${id}.json`)
  const routeStreamFile = (id) => path.join(dir, "route-streams", `${id}.json`)

  return {
    dir,

    async readActivities() {
      let files

      try {
        files = await fs.readdir(activitiesDir)
      } catch (error) {
        if (error.code === "ENOENT") return []

        throw error
      }

      const activities = []

      for (const file of files.filter((name) => name.endsWith(".json"))) {
        const activity = await readJson(path.join(activitiesDir, file))

        if (activity) activities.push(activity)
      }

      return activities
    },

    readActivity: (id) => readJson(activityFile(id)),

    writeActivity: (activity) => writeJson(activityFile(activity.id), activity),

    deleteActivity: (id) => fs.rm(activityFile(id), {force: true}),

    async readState() {
      return (await readJson(path.join(dir, "state.json"))) || {}
    },

    writeState: (state) => writeJson(path.join(dir, "state.json"), state),

    readAthlete: () => readJson(path.join(dir, "athlete.json")),

    writeAthlete: (athlete) =>
      writeJson(path.join(dir, "athlete.json"), athlete),

    readRoutes: () => readJson(path.join(dir, "routes.json")),

    writeRoutes: (routes) => writeJson(path.join(dir, "routes.json"), routes),

    readRouteStream: (id) => readJson(routeStreamFile(id)),

    writeRouteStream: (id, stream) => writeJson(routeStreamFile(id), stream),
  }
}
