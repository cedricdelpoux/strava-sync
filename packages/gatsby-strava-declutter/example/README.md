# `gatsby-strava-declutter` example

A map of your Strava activities, with a "With Declutter" checkbox to compare
the tracks as they are with the decluttered ones.

1. Install deps

```
npm install
```

2. Put `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` and `STRAVA_TOKEN` in a
   `.env` file. `npm run strava-token` generates the token.

3. Optionally, list in `PRECISE_ACTIVITIES`, in the `.env` file, the ids of the
   activities whose summary track is too coarse to follow the roads. They are
   fetched with their full `latlng` stream, and `npm run sync-activities` fetches
   it for those already in the `.strava` store.

```
PRECISE_ACTIVITIES=9374311551,11488068367
```

4. Launch dev env

```
npm run dev
```

The basemap comes from [OpenFreeMap](https://openfreemap.org), which needs no
API key.
