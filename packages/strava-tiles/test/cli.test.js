import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import {createFileStore} from "strava-sync"
import {describe, expect, it, vi} from "vitest"

import {runCli} from "../lib/cli.js"
import {silentLogger} from "../lib/logger.js"

describe("runCli", () => {
  it("writes the tiles of a store to a file", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "strava-tiles-"))
    const store = createFileStore({dir: path.join(dir, ".strava")})

    await store.writeActivity({
      id: 1,
      start_date: "2024-01-10T08:00:00Z",
      coordinates: [
        [1.4, 43.6],
        [1.42, 43.6],
      ],
    })

    const out = path.join(dir, "out.json")

    await runCli(["--store", path.join(dir, ".strava"), "--out", out], {
      logger: silentLogger,
    })

    const written = JSON.parse(await fs.readFile(out, "utf8"))

    expect(written.activities["1"].length).toBeGreaterThan(0)
    expect(written.athlete.parts.square).toBeDefined()
    expect(written.routes).toEqual({})
  })

  it("creates the folder of the output file and includes the routes", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "strava-tiles-"))
    const store = createFileStore({dir: path.join(dir, ".strava")})

    await store.writeActivity({
      id: 1,
      start_date: "2024-01-10T08:00:00Z",
      coordinates: [[1.4, 43.6]],
    })
    await store.writeRoutes([
      {
        id_str: "5",
        updated_at: 1,
        map: {summary_polyline: "_p~iF~ps|U_ulLnnqC"},
      },
    ])

    const out = path.join(dir, "public", "nested", "tiles.json")

    await runCli(
      ["--store", path.join(dir, ".strava"), "--out", out, "--routes"],
      {logger: silentLogger}
    )

    const written = JSON.parse(await fs.readFile(out, "utf8"))

    expect(Object.keys(written.routes)).toHaveLength(1)
  })

  it("prints the usage with --help", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {})

    await runCli(["--help"])

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("Usage: strava-tiles")
    )
    log.mockRestore()
  })
})
