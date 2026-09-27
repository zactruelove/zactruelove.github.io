# tv/ — TV Watchlist

A shared "what are we watching and when" page at `https://zactruelove.com/tv/`
plus a calendar feed at `https://zactruelove.com/tv/schedule.ics`.

| File | Role |
|---|---|
| `shows.json` | **The only file you edit.** The watchlist plus config (time zone, alert times, platform map). |
| `build.py` | Standard-library Python. Reads `shows.json`, asks TVmaze for episodes, writes the two files below. |
| `data.json` | Generated. What the page renders. |
| `schedule.ics` | Generated. Subscribe to it on your phone. |
| `index.html`, `tv.css`, `tv.js` | The page. Pulls tokens and shared styles from `../css/`. |

`.github/workflows/tv-feed.yml` runs `build.py` every morning (and whenever
`shows.json` changes) and commits the generated files, which republishes the
page. The schedule only fires on `main`.

## Editing the list

Each entry in `shows.json`:

```json
{ "title": "Survivor", "query": "Survivor", "tvmaze_id": null,
  "category": "competition", "priority": 2, "status": "active",
  "watch_on": null, "notes": "" }
```

- **title** — what the page shows.
- **query** — what to search TVmaze for (defaults to title). Use the show's
  official name if it differs, e.g. `The Great British Bake Off`.
- **tvmaze_id** — once you've confirmed the match, put the numeric ID here.
  Until then the builder searches by name and prefers US listings; the page
  shows a "matched by search" note with the top candidates so you can pin it.
- **category** — `reality`, `competition`, `comedy`, `drama`.
- **priority** — `1` must watch, `2` normal, `3` whenever.
- **status** — `active`, `ignore` (hidden by default, left out of the calendar),
  `finished` (same, for shows you're done with).
- **watch_on** — override the platform (`"Peacock"`). Leave `null` to derive it
  from the network map in `config.network_platforms` (Bravo → Peacock, CBS →
  Paramount+, FX → Hulu, …).
- **notes** — free text shown on the page and in calendar events.
- **next_date** — optional `YYYY-MM-DD`. Used when TVmaze has no date yet
  (new shows, announced seasons). Ignored once TVmaze knows better.
- **date_shift_days** — optional. Shifts every episode by N days and makes
  them all-day, for a show you watch on a later release than the one TVmaze
  tracks.

Config knobs worth knowing: `alerts` (the calendar reminders), `platforms`
(the services you both have; anything else is flagged), `calendar_priorities`
(which priorities go in the feed), `upcoming_window_days`.

## Running it locally

```
python3 tv/build.py --verbose
```

No dependencies. It makes one or two TVmaze calls per show, throttled to stay
under their rate limit, so 30 shows take about half a minute. Commit the two
generated files or let the workflow do it.

## Subscribing on your phone

**iPhone:** open the page and tap *Subscribe to calendar* (a `webcal://`
link). In Settings › Apps › Calendar › Accounts, make sure *Remove Alerts* is
off for the subscription so the feed's own alerts (one week out at 9 AM, the
night before at 8 PM) come through.

**Android / Google Calendar:** on the web, Google Calendar › Other calendars
› + › *From URL* › `https://zactruelove.com/tv/schedule.ics`. Google drops
alerts embedded in feeds, so open that calendar's settings and add your own
notifications (1 week before, 1 day before; there is a separate setting for
all-day events). Google re-fetches URL calendars roughly once a day.

## How events are shaped

- Weekly shows: one timed event per episode, converted to Central from the
  network's air time.
- Streaming drops with no air time: an all-day event.
- Three or more episodes of the same season on the same day collapse into one
  "all N episodes" event, so a Netflix season is one line, not ten.
- Premieres are labelled. Shows marked `ignore` or `finished` are excluded.
