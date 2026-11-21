const PLUGIN = "gatsby-strava-declutter"
const REQUIRED_BEFORE = ["gatsby-source-strava"]

// `plugins`: Gatsby's `flattenedPlugins`, in the order of gatsby-config.js
function checkPlugins(plugins) {
  const names = plugins.map(({name}) => name)
  const position = names.indexOf(PLUGIN)
  const errors = []

  REQUIRED_BEFORE.forEach((name) => {
    const index = names.indexOf(name)

    if (index === -1) {
      errors.push(
        `${name} is missing, add it to gatsby-config.js before ${PLUGIN}`
      )
    } else if (index > position) {
      errors.push(`${name} must come before ${PLUGIN} in gatsby-config.js`)
    }
  })

  return errors
}

module.exports = {checkPlugins}
