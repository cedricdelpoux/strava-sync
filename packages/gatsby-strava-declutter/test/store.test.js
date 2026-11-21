const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const {describe, it} = require("node:test")

const {createStore} = require("../utils/store")

const createTemporaryStore = () =>
  createStore({
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

    assert.deepEqual(await store.read("digest"), declutter)
  })

  it("reads nothing with another digest", async () => {
    const store = createTemporaryStore()

    await store.write("digest", declutter)

    assert.equal(await store.read("other"), null)
  })

  it("reads nothing from a missing or unreadable store", async () => {
    const store = createTemporaryStore()

    assert.equal(await store.read("digest"), null)

    await store.write("digest", declutter)
    fs.writeFileSync(path.join(store.dir, "results.json"), "{")

    assert.equal(await store.read("digest"), null)
  })
})
