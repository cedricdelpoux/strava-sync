import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import {describe, expect, it} from "vitest"

import {createDeclutterStore} from "../lib/store.js"

const createTemporaryStore = () =>
  createDeclutterStore({
    dir: path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), "strava-declutter-")),
      ".strava-declutter"
    ),
  })

const declutter = {
  entries: [{id: "walk", fingerprint: "abc", ranges: [[0, 10]]}],
  results: new Map([
    ["walk", {hidden: false, reason: null, parts: [], stubs: []}],
  ]),
}

describe("store", () => {
  it("reads back what it wrote with the same digest", async () => {
    const store = createTemporaryStore()

    await store.write("digest", declutter)

    expect(await store.read("digest")).toEqual(declutter)
  })

  it("reads nothing with another digest", async () => {
    const store = createTemporaryStore()

    await store.write("digest", declutter)

    expect(await store.read("other")).toBe(null)
  })

  it("reads nothing from a missing or unreadable store", async () => {
    const store = createTemporaryStore()

    expect(await store.read("digest")).toBe(null)

    await store.write("digest", declutter)
    fs.writeFileSync(path.join(store.dir, "results.json"), "{")

    expect(await store.read("digest")).toBe(null)
  })
})
