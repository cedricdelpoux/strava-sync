import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import {createFileStore} from "strava-sync"
import {describe, expect, it} from "vitest"

import {runCli} from "../lib/cli.js"
import {silentLogger} from "../lib/logger.js"

describe("runCli", () => {
  it("writes the declutter of a store to a file", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "strava-declutter-"))
    const store = createFileStore({dir: path.join(dir, ".strava")})

    await store.writeActivity({
      id: 1,
      start_date: "2024-01-10T08:00:00Z",
      coordinates: [
        [1.4, 43.6],
        [1.41, 43.6],
      ],
    })

    const out = path.join(dir, "out.json")

    await runCli(
      [
        "--store",
        path.join(dir, ".strava"),
        "--cache",
        path.join(dir, "cache"),
        "--out",
        out,
      ],
      {logger: silentLogger}
    )

    const written = JSON.parse(await fs.readFile(out, "utf8"))

    expect(written["1"].hidden).toBe(false)
  })

  it("creates the folder of the output file", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "strava-declutter-"))
    const store = createFileStore({dir: path.join(dir, ".strava")})

    await store.writeActivity({
      id: 1,
      start_date: "2024-01-10T08:00:00Z",
      coordinates: [
        [1.4, 43.6],
        [1.41, 43.6],
      ],
    })

    const out = path.join(dir, "public", "declutter.json")

    await runCli(
      [
        "--store",
        path.join(dir, ".strava"),
        "--cache",
        path.join(dir, "cache"),
        "--out",
        out,
      ],
      {logger: silentLogger}
    )

    expect(JSON.parse(await fs.readFile(out, "utf8"))["1"]).toBeDefined()
  })
})
