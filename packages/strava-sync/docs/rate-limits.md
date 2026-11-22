# Rate limits

Be careful with your Strava rate limits. The short limit is 100 requests every 15 minutes, and the long one is 1000 requests a day.

Strava applies two limits: an overall one, 200 requests every 15 minutes and 2000 a day, and a stricter read only one, half of it. `strava-sync` only reads, so the read limits above are the ones you reach first. Limits are set per application: check the `x-readratelimit-limit` response header or your [application settings](https://www.strava.com/settings/api) to know yours.

The 15 minutes window resets on the quarter hour, the daily one at midnight UTC.

Fetching activities costs 1 request per page of 200 activities. Then each detail costs 1 request per activity, so enabling the 6 of them (comments, kudos, laps, photos, streams and zones) lets you fetch around 16 activities before reaching the short limit. The routes cost 1 request per page of 200 routes on every run, plus 1 request per new or edited route when their streams are fetched.

## Short limit

By default, a sync warns and stops when the short limit is reached: the activities already fetched are kept, and the missing ones are fetched on the next run.

To wait for the window to open again and resume instead, set `waitOnRateLimit` on the client. The wait targets the next quarter hour rather than a fixed 15 minutes, so it lasts 15 minutes at worst and around 7 on average.

The first fetch of a history of thousands of activities can take long. The next ones only fetch what is new, see the [store](./store.md).

## Long limit

The daily limit only resets at midnight UTC, so waiting is pointless: a sync always stops when it is reached.

## Failing instead of stopping

With `stopOnRateLimit`, reaching any of the two limits throws instead of leaving you with partial data. Both options apply to every Strava call.

| `waitOnRateLimit` | `stopOnRateLimit` | Short limit   | Long limit    |
| ----------------- | ----------------- | ------------- | ------------- |
| false _(default)_ | false _(default)_ | keeps partial | keeps partial |
| true              | false             | waits 15 min  | keeps partial |
| false             | true              | throws        | throws        |
| true              | true              | waits 15 min  | throws        |

Setting both is the safest combination: it waits for what is worth waiting for, and fails rather than publishing an incomplete site.
