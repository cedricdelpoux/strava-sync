const ID_TWIN_SUFFIX = "_str"

const isId = (key) =>
  (key === "id" || key.endsWith("_id")) && !key.endsWith("type_id")

const isIdTwin = (key) =>
  key.endsWith(ID_TWIN_SUFFIX) && isId(key.slice(0, -ID_TWIN_SUFFIX.length))

// Strava sends an id as a number and again as an `id_str` string, because a
// 64 bit id does not survive a double. Every id becomes a string and the
// `_str` twins are dropped. A null id stays null.
export const normalizeIds = (value) => {
  if (Array.isArray(value)) return value.map(normalizeIds)

  if (!value || typeof value !== "object") return value

  const plain = {}

  for (const [key, nested] of Object.entries(value)) {
    if (isIdTwin(key)) continue

    plain[key] =
      isId(key) && (typeof nested === "number" || typeof nested === "string")
        ? String(nested)
        : normalizeIds(nested)
  }

  return plain
}

// Removes from the items of each collection the fields that point back at the
// owner: `{laps: ["activity", "athlete"]}`. Mutates the node.
export const pruneBacklinks = (node, fields) => {
  for (const [collection, backlinks] of Object.entries(fields)) {
    if (!Array.isArray(node[collection])) continue

    for (const item of node[collection]) {
      backlinks.forEach((field) => delete item[field])
    }
  }
}
