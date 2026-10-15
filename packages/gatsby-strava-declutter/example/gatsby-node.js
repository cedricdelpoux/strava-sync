const fs = require("fs")
const path = require("path")

// `require("gatsby-strava-declutter")` in a real site
const {simplify} = require("..")

// MapLibre loads its worker from a separate file (see src/components/map.js),
// since the path it computes itself does not survive webpack. The version in
// its name keeps a cached worker from running with another version.
exports.onPreBootstrap = ({store}) => {
  const publicDir = path.join(store.getState().program.directory, "public")
  const {version} = require("maplibre-gl/package.json")

  fs.mkdirSync(publicDir, {recursive: true})
  fs.copyFileSync(
    require.resolve("maplibre-gl/dist/maplibre-gl-worker.mjs"),
    path.join(publicDir, `maplibre-gl-worker-${version}.mjs`)
  )
}

// The tracks as they are, for the map without the declutter. A file rather
// than the page query, which they would make several times heavier.
exports.createPages = ({getNodesByType, store}) => {
  const publicDir = path.join(store.getState().program.directory, "public")
  const tracks = getNodesByType("StravaActivity")
    .filter((node) => node.coordinates && node.coordinates.length > 1)
    .map((node) => simplify(node.coordinates))

  fs.mkdirSync(publicDir, {recursive: true})
  fs.writeFileSync(path.join(publicDir, "tracks.json"), JSON.stringify(tracks))
}

// MapLibre only runs in the browser
exports.onCreateWebpackConfig = ({stage, loaders, actions}) => {
  if (stage === "build-html" || stage === "develop-html") {
    actions.setWebpackConfig({
      module: {
        rules: [
          {
            test: /node_modules\/(maplibre-gl|react-map-gl)\//,
            use: loaders.null(),
          },
        ],
      },
    })
  }
}
