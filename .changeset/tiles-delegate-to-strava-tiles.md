---
"gatsby-strava-tiles": major
---

Delegate the tiles to `strava-tiles`, which works without Gatsby too. The options, the `tiles` fields and the `gatsby-strava-tiles/utils/map` and `gatsby-strava-tiles/utils/tiles` entries stay the same. The main entry also exports `computeTiles`, `getAthleteTiles`, `getRouteTiles` and `readRoutes`.

Breaking changes:

- `gatsby-strava-tiles/card` is now `gatsby-strava-tiles/images`, and `getActivityCards` and `renderActivityCard` are now `getActivityImages` and `renderActivityImage`.
