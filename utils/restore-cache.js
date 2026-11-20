// Activities were stored in the Gatsby cache until 3.1.0. They are moved to
// the store on the first build, so that an existing history is not fetched
// again, and the Gatsby cache is never written to afterwards.
const restoreFromGatsbyCache = async ({cache, store}) => {
  const cachedActivitiesIds = (await cache.get("activities")) || []
  const activities = []

  for (const activityId of cachedActivitiesIds) {
    const activity = await cache.get(`${activityId}`)

    if (activity) {
      await store.writeActivity(activity)

      activities.push(activity)
    }
  }

  const lastFetch = await cache.get("last-fetch")

  if (activities.length > 0 && lastFetch) {
    await store.writeState({lastFetch})
  }

  return activities.length
}

module.exports = {restoreFromGatsbyCache}
