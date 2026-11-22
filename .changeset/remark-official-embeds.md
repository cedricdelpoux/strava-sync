---
"gatsby-remark-strava": major
---

Embed Strava activities and routes with the official Strava embed, and read the activity of the `render` option from the `strava-sync` store. The iframe that this plugin used to emit stopped displaying, because Strava no longer supports it.

Breaking changes:

- Without a `render` option, a link to an activity or to a route now becomes the placeholder of the official embed, and the plugin loads the Strava script on the pages that have one. It needs no token and makes no request, but the activity or the route must be public. The `stravaClientId`, `stravaClientSecret` and `stravaToken` options are no longer needed in that mode.
- With a `render` option, the activity is read from the `strava-sync` store first, the one `gatsby-source-strava` fills (the new `storeDir` option, `.strava` by default), and fetched from Strava only when it is missing. The fetched activity is cached instead of the markup.
- The `gatsby-remark-strava-token` command is gone, and so are the `strava-v3`, `express` and `inquirer` dependencies. Generate the token with `npx strava-sync token`.
- Node 22.12 or later is required.
