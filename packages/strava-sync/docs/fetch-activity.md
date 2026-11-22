# Fetching an activity again

```shell
npx strava-sync activity <activityId>
```

This fetches one activity from Strava and replaces its file in the [store](./store.md). `strava-sync` never asks Strava again for an activity older than its cursor, so this command is how you pick up an activity you edited on strava.com, and how you add details to an activity without paying for them on your whole history.

It fetches the [detailed activity](https://developers.strava.com/docs/reference/#api-Activities-getActivityById), which holds more than the listed one: `description`, `calories`, `gear`, `segment_efforts`, `splits_metric`, and the complete `polyline` of the track rather than its simplified version.

The command never moves the cursor, so the next sync still fetches only what is new. Running it again never drops what an earlier run added: an option not passed this time falls back to what is already in the store, and streams are merged type by type, so asking for `heartrate` after a `latlng` run keeps both.

## Options

| Option              | Effect                                                                  |
| ------------------- | ----------------------------------------------------------------------- |
| `--streams [types]` | Add streams, comma separated, all of them when left empty               |
| `--comments`        | Add comments                                                            |
| `--kudos`           | Add kudos                                                               |
| `--laps`            | Add laps                                                                |
| `--photos[=size]`   | Add photos, 1800 pixels wide unless a size is given                     |
| `--zones`           | Add zones, needs a Strava subscription                                  |
| `--refresh`         | Re-fetch the activity itself, to pick up an edit made on strava.com     |
| `--all`             | Every option above, `--refresh` included                                |
| `--dir <path>`      | Store directory, defaults to the `storeDir` of the config, or `.strava` |
| `--config <path>`   | Config file, defaults to `strava-sync.config.js`                        |
| `--no-config`       | Rely on the command line options alone                                  |
| `--help`            | Show the usage                                                          |

Each option costs one request against your [rate limits](./rate-limits.md), on that single activity. `--refresh` is skipped by default, and implied the first time an activity is fetched, since there is nothing yet to add options onto. An activity not yet in the store gets the details of the `details` option of your config, plus the ones passed on the command line.

## Picking up an edit made on strava.com

```shell
npx strava-sync activity 4291234567 --refresh
```

This refreshes the name, the description, the gear or anything else that is not a stream, comments, kudos, laps, photos or zones. Without `--refresh`, and with no other option either, an activity already in the store is left alone and the command fails rather than doing nothing silently:

```shell
$ npx strava-sync activity 4291234567
Nothing to fetch: pass --refresh, or an option like --streams, --photos...
```

## Adding to an activity you already fetched

Adding a stream, some photos or anything else does not need `--refresh`. It only costs the one request for what you asked:

```shell
npx strava-sync activity 4291234567 --streams heartrate
```

## Streams

The `latlng` stream holds the recorded points at their full precision, and is what `coordinates` is built from when you fetch it. An activity without GPS data, an indoor workout for instance, comes back without that stream, with no error and no `coordinates`.

`coordinates` is built from the stream when it is there, then from `map.polyline`, the complete track, then from `map.summary_polyline`, its simplified version. It is rounded to 5 decimals, about a meter. `--refresh` alone is enough to get `polyline`, without spending a request on a stream.

```shell
npx strava-sync activity 4291234567 --streams latlng,heartrate,altitude
npx strava-sync activity 4291234567 --streams
```

The available types are `time`, `distance`, `latlng`, `altitude`, `velocity_smooth`, `heartrate`, `cadence`, `watts`, `temp`, `moving` and `grade_smooth`. See the [Strava documentation](https://developers.strava.com/docs/reference/#api-models-StreamSet).

## Photos

A photo comes back at 1800 pixels, capped at its own resolution, under the `_1800` key, since Strava keys a photo url by the size it was asked for. Ask for another size with `--photos=600`, and the key follows it, `_600`. Strava answers a single size a call, so keep to one size across a store. The size has to be written with an `=`, because a bare number after `--photos` is read as the activity id.

`photos` is the list `--photos` fetches. The `{primary, count}` summary Strava puts on an activity is stored as `photos_summary`, and it is the only one that names the photo Strava leads with. Its primary photo comes at three sizes, `urls { _100 _600 _1800 }`, all three on the call `--refresh` already makes.

Each lap, effort, comment and photo comes back from Strava with the activity and the athlete it belongs to embedded on it. Those are dropped, since they are the very activity and athlete they hang off. The athlete on a comment is kept, because it is whoever wrote it.
