export const createMemoryStore = (activities = [], state = {}) => {
  const activitiesById = new Map(activities.map((a) => [String(a.id), a]))
  let currentState = state

  return {
    activitiesById,
    readActivities: async () => [...activitiesById.values()],
    readActivity: async (id) => activitiesById.get(String(id)) || null,
    writeActivity: async (activity) => {
      activitiesById.set(String(activity.id), activity)
    },
    deleteActivity: async (id) => {
      activitiesById.delete(String(id))
    },
    readState: async () => currentState,
    writeState: async (state) => {
      currentState = state
    },
    readRouteStream: async () => null,
    writeRouteStream: async () => {},
  }
}

export const createFakeClient = (routes) => ({
  calls: [],
  async get(path, query) {
    this.calls.push({path, query})

    const route = routes[path] ?? routes[path.replace(/\d+/, ":id")]

    if (route instanceof Error) throw route

    return typeof route === "function" ? route(query, path) : route
  },
})
