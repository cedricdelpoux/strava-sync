# Token

The token is described in the [strava-sync documentation](https://github.com/cedricdelpoux/strava-sync/blob/main/packages/strava-sync/docs/token.md): the variables, the scopes and the refresh.

This package exposes the command that generates it. Run it at the root of your project:

```shell
gatsby-source-strava-token
```

It is a wrapper of `strava-sync token`. The scopes it asks for let the plugin read your private [routes](./routes.md).

## Troubleshooting

If `gatsby-source-strava-token` is not recognized as a command, add an `npm` script to your `package.json`:

```json
{
  "scripts": {
    "token": "gatsby-source-strava-token"
  }
}
```

Then run `npm run token`.
