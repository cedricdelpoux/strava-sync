# Reconciling the store with Strava

```shell
npx strava-sync activities --reconcile
```

`strava-sync` only asks Strava for the activities started after its cursor (see the [store](./store.md#incremental-fetch)), so some changes never reach the store on their own:

- An activity deleted on strava.com stays in the store, a duplicate upload of a ride for instance.
- An activity uploaded again gets a new id but keeps its original start date, older than the cursor, so it never enters the store.
- An activity already in the store never gets what the options start asking for afterwards, a stream added to `streamsTypes` for instance.

The command lists every activity your Strava account holds today, compares them with the store and with the options, and prints the three lists. It costs one request every 200 activities, so about 20 for a history of 4000.

```shell
$ npx strava-sync activities --reconcile
4039 activities on Strava
2 deleted on Strava, still in the store
  19963471569  2026-08-28  Morning Ride
  19891004606  2026-08-25  Lunch Swim
1 missing from the store
  20020096602  2026-08-25  Nage Statique
2 lacking what the options ask for, 2 requests
  9374311551  2023-06-24  Bikepacking day 1  (streams latlng)
  9381126482  2023-06-25  Bikepacking day 2  (streams latlng)
Run again with --write to update the store
```

Nothing is changed unless `--write` is passed. It then deletes the activities gone from Strava, completes the stored ones and adds the missing ones.

When the deleted activities are more than a tenth of the store, `--write` stops before changing anything. A list that short usually means the token sees less than the one the store was built with: the token of another athlete, or one generated with private activities left unchecked on the Strava authorization page. Pass `--force` once you have checked that those activities really are gone.

Once `--write` has run, the store holds your whole account as it stood when the command listed it, so the command moves the cursor to that moment. It leaves the cursor alone when it compared only a part of the history.

## Options

| Option              | Effect                                                                        |
| ------------------- | ----------------------------------------------------------------------------- |
| `--reconcile`       | Compare the store with the account instead of fetching what is new            |
| `--write`           | Delete the activities gone from Strava, complete and add the others           |
| `--force`           | Delete them even when they are more than a tenth of the store                 |
| `--after <date>`    | Only compare the activities started after a date or a timestamp               |
| `--before <date>`   | Only compare the activities started before a date or a timestamp              |
| `--streams [types]` | Add streams to the missing activities, all of them when left empty            |
| `--comments`        | Add comments to the missing activities                                        |
| `--kudos`           | Add kudos to the missing activities                                           |
| `--laps`            | Add laps to the missing activities                                            |
| `--photos[=size]`   | Add photos to the missing activities, 1800 pixels wide unless a size is given |
| `--zones`           | Add zones to the missing activities, needs a Strava subscription              |
| `--all`             | Every detail option above                                                     |
| `--dir <path>`      | Store directory, defaults to the `storeDir` of the config, or `.strava`       |
| `--config <path>`   | Config file, defaults to `strava-sync.config.js`                              |
| `--no-config`       | Rely on the command line options alone                                        |
| `--help`            | Show the usage                                                                |

The detail options mean the same as for [`strava-sync activity`](./fetch-activity.md#options) and cost one request per missing activity.

## Completing the stored activities

A stored activity is checked against the `details` options, a `withStreams` function included, and only what it lacks is fetched and merged into it. That costs one request per detail lacking, and nothing more once the store is complete. The detail flags of the command line are left out of it: they are for the missing activities, and would otherwise cost a request on every activity of your history.

A stream type Strava has no data for, a track on an indoor ride for instance, is stored as `null`, so that it is not asked for again on every run. Each activity is written as soon as it is complete, so a run stopped by the [rate limits](./rate-limits.md) picks up where it left off when run again.

This is how a store keeps some activities more precise than others. The `summary_polyline` Strava lists an activity with is simplified, enough on a long ride to miss a map tile here and there, while the `latlng` stream holds every recorded point:

```js
import {readFileSync} from "node:fs"

const preciseActivities = new Set(
  JSON.parse(readFileSync("precise-activities.json", "utf8"))
)

export default {
  details: {
    withStreams: (activity) => preciseActivities.has(String(activity.id)),
    streamsTypes: ["latlng"],
  },
}
```

## What it does not catch

An activity edited on strava.com keeps its id, so it is in both lists and the command leaves it alone. Use [`strava-sync activity --refresh`](./fetch-activity.md#picking-up-an-edit-made-on-stravacom) to pick up the edit.
