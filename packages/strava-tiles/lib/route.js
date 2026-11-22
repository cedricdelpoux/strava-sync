import {pointsToTiles} from "./tiles.js"

// No stream for a route, so no gap to read as a GPS pause
function getRouteTiles(route, isNewTile) {
  const all = route.coordinates ? pointsToTiles(route.coordinates) : []

  return {all, new: all.filter(isNewTile)}
}

export {getRouteTiles}
