import {expect, test, vi} from "vitest"

import {handleEvent, verifyChallenge} from "../lib/webhook.js"
import {createFakeClient, createMemoryStore} from "./helpers.js"

const query = {
  "hub.mode": "subscribe",
  "hub.verify_token": "secret",
  "hub.challenge": "abc",
}

test("echoes the challenge of a valid subscription request", () => {
  expect(verifyChallenge(query, {verifyToken: "secret"})).toEqual({
    "hub.challenge": "abc",
  })
  expect(
    verifyChallenge(new URLSearchParams(query), {verifyToken: "secret"})
  ).toEqual({"hub.challenge": "abc"})
})

test("rejects a wrong token, mode, or an empty configured token", () => {
  expect(verifyChallenge(query, {verifyToken: "other"})).toBeNull()
  expect(
    verifyChallenge(
      {...query, "hub.mode": "unsubscribe"},
      {verifyToken: "secret"}
    )
  ).toBeNull()
  expect(
    verifyChallenge({...query, "hub.verify_token": ""}, {verifyToken: ""})
  ).toBeNull()
})

const event = (overrides) => ({
  object_type: "activity",
  object_id: 42,
  aspect_type: "create",
  owner_id: 7,
  ...overrides,
})

test("fetches and stores a created or updated activity", async () => {
  const store = createMemoryStore()
  const client = createFakeClient({"activities/:id": {id: "42", name: "Ride"}})

  for (const aspect_type of ["create", "update"]) {
    const result = await handleEvent({
      event: event({aspect_type}),
      client,
      store,
    })

    expect(result).toEqual({action: "upserted"})
  }

  expect((await store.readActivity(42)).name).toBe("Ride")
})

test("removes a deleted activity without calling Strava", async () => {
  const store = createMemoryStore([{id: "42"}])
  const client = createFakeClient({})

  const result = await handleEvent({
    event: event({aspect_type: "delete"}),
    client,
    store,
  })

  expect(result).toEqual({action: "deleted"})
  expect(store.activitiesById.size).toBe(0)
  expect(client.calls).toEqual([])
})

test("calls back when the athlete revokes the access", async () => {
  const onDeauthorize = vi.fn()
  const deauthorization = {
    object_type: "athlete",
    object_id: 7,
    aspect_type: "update",
    owner_id: 7,
    updates: {authorized: "false"},
  }

  const result = await handleEvent({
    event: deauthorization,
    client: createFakeClient({}),
    store: createMemoryStore(),
    onDeauthorize,
  })

  expect(result).toEqual({action: "deauthorized"})
  expect(onDeauthorize).toHaveBeenCalledWith(deauthorization)
})

test("ignores other athlete updates, other owners and malformed events", async () => {
  const base = {client: createFakeClient({}), store: createMemoryStore()}

  expect(
    await handleEvent({
      ...base,
      event: {
        object_type: "athlete",
        aspect_type: "update",
        updates: {title: "x"},
      },
    })
  ).toEqual({action: "ignored"})
  expect(await handleEvent({...base, event: event(), ownerId: 8})).toEqual({
    action: "ignored",
  })
  expect(
    await handleEvent({...base, event: event({object_id: "../x"})})
  ).toEqual({action: "ignored"})
  expect(await handleEvent({...base, event: null})).toEqual({action: "ignored"})
})
