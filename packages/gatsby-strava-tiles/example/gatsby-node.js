const fs = require("fs")
const path = require("path")

// `require("gatsby-strava-tiles/images")` in a real site
const {getActivityImages, renderActivityImage} = require("../images")

// Only the most recent activities get an image
const RECENT_ACTIVITIES = 20

const SIZE = {width: 600, height: 300}

// Neutral, so the green tiles drawn over it stay readable
const STYLE = "mapbox/light-v11"

// Not `public/images`, where the /images page is written
const IMAGES_DIR = path.join(__dirname, "public", "activity-images")
const TILE_CACHE_DIR = path.join(__dirname, ".cache", "image-background-tiles")

const tileUrl = ({z, x, y}) =>
  `https://api.mapbox.com/styles/v1/${STYLE}/tiles/256/${z}/${x}/${y}@2x` +
  `?access_token=${process.env.GATSBY_MAPBOX_TOKEN}`

// The animated pages only draw these. `tiles` comes from a resolver, which a
// page query filter can't read.
const PAGES_WITH_NEW_TILE_ACTIVITIES = ["/dynamic_activity/", "/dynamic_month/"]
let activityIdsWithNewTiles = []

exports.createPages = async (args) => {
  await collectActivityIdsWithNewTiles(args)
  await createImagesPage(args)
}

// `createPages` runs before the pages of src/pages are created
exports.onCreatePage = ({page, actions: {createPage, deletePage}}) => {
  if (!PAGES_WITH_NEW_TILE_ACTIVITIES.includes(page.path)) return

  deletePage(page)
  createPage({...page, context: {...page.context, activityIdsWithNewTiles}})
}

async function collectActivityIdsWithNewTiles({graphql, reporter}) {
  const result = await graphql(`
    {
      allStravaActivity(filter: {coordinates: {ne: null}}) {
        nodes {
          id
          tiles {
            x
          }
        }
      }
    }
  `)

  if (result.errors) {
    reporter.panicOnBuild("Error querying the new tiles", result.errors)
    return
  }

  activityIdsWithNewTiles = result.data.allStravaActivity.nodes
    .filter(({tiles}) => tiles.length > 0)
    .map(({id}) => id)
}

async function createImagesPage({graphql, actions: {createPage}, reporter}) {
  if (!process.env.GATSBY_MAPBOX_TOKEN) {
    reporter.warn(
      "GATSBY_MAPBOX_TOKEN is missing, skipping the activity images"
    )
    return
  }

  // Every activity's tiles, so an image shows the coverage on the day
  const history = await graphql(`
    {
      allStravaActivity(filter: {coordinates: {ne: null}}) {
        nodes {
          id
          start_date
          tiles {
            x
            y
          }
        }
      }
    }
  `)

  if (history.errors) {
    reporter.panicOnBuild("Error querying the activity tiles", history.errors)
    return
  }

  // The heavy fields, for the few activities that actually get drawn
  const recent = await graphql(`
    {
      allStravaActivity(
        sort: {start_date: DESC}
        filter: {coordinates: {ne: null}}
        limit: ${RECENT_ACTIVITIES}
      ) {
        nodes {
          id
          name
          distance
          start_date
          coordinates
          tiles {
            x
            y
          }
        }
      }
    }
  `)

  if (recent.errors) {
    reporter.panicOnBuild(
      "Error querying the activities to draw",
      recent.errors
    )
    return
  }

  // One image per activity. Group several ids to merge a multi-day trip.
  const activities = recent.data.allStravaActivity.nodes
  const drawable = getActivityImages({
    activities: history.data.allStravaActivity.nodes,
    groups: activities.map(({id}) => [id]),
  })
  const byId = new Map(
    drawable.map((activityImage) => [activityImage.ids[0], activityImage])
  )

  fs.mkdirSync(IMAGES_DIR, {recursive: true})

  const images = []

  for (const activity of activities) {
    const name = `${activity.id}.webp`.replace(/[^a-zA-Z0-9.\-_]/g, "_")
    const file = path.join(IMAGES_DIR, name)

    images.push({
      id: activity.id,
      name: activity.name,
      distance: activity.distance,
      startDate: activity.start_date,
      added: activity.tiles.length,
      image: `/activity-images/${name}`,
    })

    // A drawn image never changes
    if (fs.existsSync(file)) continue

    const {image} = await renderActivityImage({
      ...byId.get(activity.id),
      coordinates: activity.coordinates,
      size: SIZE,
      tileUrl,
      cacheDir: TILE_CACHE_DIR,
    })

    fs.writeFileSync(file, image)
  }

  reporter.info(`Activity images: ${images.length} drawn or already on disk`)

  createPage({
    path: "/images",
    component: path.resolve("./src/templates/images.js"),
    context: {images, size: SIZE},
  })
}
