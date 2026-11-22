## 2.0.0

### Major Changes

- cd5f67d: Embed Strava activities and routes with the official Strava embed, and read the activity of the `render` option from the `strava-sync` store. The iframe that this plugin used to emit stopped displaying, because Strava no longer supports it.
  
  Breaking changes:
  
  - Without a `render` option, a link to an activity or to a route now becomes the placeholder of the official embed, and the plugin loads the Strava script on the pages that have one. It needs no token and makes no request, but the activity or the route must be public. The `stravaClientId`, `stravaClientSecret` and `stravaToken` options are no longer needed in that mode.
  - With a `render` option, the activity is read from the `strava-sync` store first, the one `gatsby-source-strava` fills (the new `storeDir` option, `.strava` by default), and fetched from Strava only when it is missing. The fetched activity is cached instead of the markup.
  - The `gatsby-remark-strava-token` command is gone, and so are the `strava-v3`, `express` and `inquirer` dependencies. Generate the token with `npx strava-sync token`.
  - Node 22.12 or later is required.

# 1.6.0

-   Added: `output` option, set it to `"mdx"` to emit embeds as JSX elements for `gatsby-plugin-mdx` (MDX v2+). The default `"html"` output is unchanged

# 1.5.1

-   Fixed: Build crashing with an unhandled `AggregateError` on machines without cache: the Strava token is now refreshed once for all documents, at most 4 requests run at once, and network errors only skip the embed with a warning

# 1.5.0

-   Added: **Gatsby v5** compatibility
-   Fixed: Embed not rendering under Gatsby v5 / `gatsby-plugin-mdx` (`mdast-util-to-hast` checks `"children" in node`, so a key merely set to `undefined` still crashed)

# 1.4.0

-   Added: `render` option to customize the embed HTML from the Strava activity

# 1.3.0

-   Added: **Gatsby v4** compatibility

# 1.2.0

-   Added: `debug` option
-   Updated: Handle incorrect URLs

# 1.1.0

-   Updated: Links texts can now contain extra text additional to "embed"

# 1.0.0

-   Added: `gatsby-remark-strava` initial commit
-   Added: `gatsby-remark-strava-token` script for token generation
