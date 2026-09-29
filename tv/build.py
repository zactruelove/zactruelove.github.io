#!/usr/bin/env python3
"""
Build the TV watchlist data file and calendar feed.

Reads  tv/shows.json   (the hand-edited watchlist + config)
Writes tv/data.json    (what tv/index.html renders)
       tv/events.json  (every drop from history_days back through the upcoming
                        window; the calendar view loads it on demand)
       tv/schedule.ics (subscribe to it on your phone for alerts)

Episode data comes from the free TVmaze API (https://api.tvmaze.com), which
needs no key. Standard library only — no pip installs. Run it from anywhere:

    python3 tv/build.py            # normal run
    python3 tv/build.py --verbose  # show every API call and match decision

The GitHub Actions workflow in .github/workflows/tv-feed.yml runs this daily
and commits the two output files when they change.
"""

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

API = "https://api.tvmaze.com"
HERE = Path(__file__).resolve().parent
SHOWS_FILE = HERE / "shows.json"
DATA_FILE = HERE / "data.json"
ICS_FILE = HERE / "schedule.ics"
EVENTS_FILE = HERE / "events.json"

VALID_CATEGORIES = {"reality", "competition", "comedy", "drama"}
VALID_STATUSES = {"active", "ignore", "finished"}

VERBOSE = False


def log(msg):
    if VERBOSE:
        print(msg, file=sys.stderr)


# ---------------------------------------------------------------------------
# TVmaze client (throttled: the public API allows ~20 calls per 10 seconds)
# ---------------------------------------------------------------------------

_last_call = 0.0


def fetch_json(path):
    """GET a TVmaze path and decode JSON. Returns None on 404."""
    global _last_call
    url = API + path
    for attempt in range(4):
        wait = 0.55 - (time.monotonic() - _last_call)
        if wait > 0:
            time.sleep(wait)
        _last_call = time.monotonic()
        log(f"GET {url}")
        req = urllib.request.Request(url, headers={"User-Agent": "zactruelove.com tv watchlist"})
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code == 429 and attempt < 3:
                time.sleep(2 * (attempt + 1))
                continue
            raise
        except (urllib.error.URLError, TimeoutError):
            if attempt < 3:
                time.sleep(2 * (attempt + 1))
                continue
            raise
    return None


# ---------------------------------------------------------------------------
# Matching a watchlist entry to a TVmaze show
# ---------------------------------------------------------------------------

def country_of(show):
    for key in ("network", "webChannel"):
        src = show.get(key)
        if src and src.get("country"):
            return src["country"].get("code")
    return None


def source_name(show):
    """The network or streaming channel TVmaze lists for the show."""
    for key in ("webChannel", "network"):
        src = show.get(key)
        if src and src.get("name"):
            return src["name"]
    return None


def normalize(text):
    """Lowercase letters and digits only, so "Is It Cake?" == "is it cake"."""
    return re.sub(r"[^a-z0-9]+", "", (text or "").lower())


def rank_key(result, query, country):
    """Sort search results: exact title first, then titles containing the query,
    then same country, then global streamers, then TVmaze's own score.
    (TVmaze's fuzzy search will happily rank "The Love Boat" above "The GOAT".)"""
    show = result["show"]
    q, name = normalize(query), normalize(show.get("name"))
    if q and name == q:
        name_tier = 0
    elif q and q in name:
        name_tier = 1
    else:
        name_tier = 2
    code = country_of(show)
    if code == country:
        country_tier = 0
    elif code is None and show.get("webChannel"):
        country_tier = 1
    else:
        country_tier = 2
    return (name_tier, country_tier, -(result.get("score") or 0))


def brief(show):
    return {
        "id": show["id"],
        "name": show.get("name"),
        "premiered": show.get("premiered"),
        "source": source_name(show),
        "country": country_of(show),
        "status": show.get("status"),
    }


def resolve_show(entry, country):
    """Return (tvmaze_show_with_embedded_episodes, matched_by, candidates)."""
    if entry.get("tvmaze_id"):
        show = fetch_json(f"/shows/{entry['tvmaze_id']}?embed=episodes")
        if show is None:
            log(f"  id {entry['tvmaze_id']} not found on TVmaze")
        return show, "id", []

    query = entry.get("query") or entry["title"]
    results = fetch_json(f"/search/shows?q={urllib.parse.quote(query)}") or []
    if not results:
        log(f"  no search results for {query!r}")
        return None, "search", []
    results.sort(key=lambda r: rank_key(r, query, country))
    candidates = [brief(r["show"]) for r in results[:5]]
    pick = results[0]["show"]
    log(f"  {query!r} -> {pick['name']} ({pick['id']}, {source_name(pick)}, {country_of(pick)})")
    show = fetch_json(f"/shows/{pick['id']}?embed=episodes")
    return show, "search", candidates


def find_variants(entry, main_show, country):
    """Spin-offs and specials TVmaze lists as separate shows ("Is It Cake? Holiday").

    Only for entries with include_variants: true. A variant is any search
    result whose title starts with the entry's query (punctuation and case
    ignored), from the same country or a global streamer, that is not the
    main show and not in exclude_ids. Returns shows with embedded episodes.
    """
    if not entry.get("include_variants") or not main_show:
        return []
    query = entry.get("query") or entry["title"]
    q = normalize(query)
    skip = {main_show["id"]} | {int(i) for i in entry.get("exclude_ids") or []}
    results = fetch_json(f"/search/shows?q={urllib.parse.quote(query)}") or []
    variants = []
    for r in results:
        show = r["show"]
        if show["id"] in skip or not normalize(show.get("name")).startswith(q):
            continue
        code = country_of(show)
        if code not in (country, None):
            log(f"  variant skipped (country {code}): {show['name']} ({show['id']})")
            continue
        full = fetch_json(f"/shows/{show['id']}?embed=episodes")
        if full:
            log(f"  variant: {full['name']} ({full['id']}, {source_name(full)})")
            variants.append(full)
            skip.add(show["id"])
    return variants


# ---------------------------------------------------------------------------
# Episodes -> local dates
# ---------------------------------------------------------------------------

def localize_episode(ep, tz, shift_days, variant=None):
    """Convert a TVmaze episode into a record with dates in the target time zone."""
    if not ep.get("airdate"):
        return None
    air_date = date.fromisoformat(ep["airdate"])
    local_dt = None
    if ep.get("airtime") and ep.get("airstamp"):
        try:
            local_dt = datetime.fromisoformat(ep["airstamp"].replace("Z", "+00:00")).astimezone(tz)
        except ValueError:
            local_dt = None
    if shift_days:
        # A shifted show is being watched on a different service than the one
        # that airs it, so the original air time means nothing here: all-day.
        if local_dt is not None:
            air_date = local_dt.date()
            local_dt = None
        air_date = air_date + timedelta(days=shift_days)

    season = ep.get("season")
    number = ep.get("number")
    if season is not None and number is not None:
        code = f"S{season:02d}E{number:02d}"
    elif season is not None:
        code = f"S{season:02d} special"
    else:
        code = "special"

    return {
        "id": ep["id"],
        "season": season,
        "number": number,
        "code": code,
        "name": ep.get("name") or "",
        "type": ep.get("type") or "regular",
        "date": air_date.isoformat(),
        "time": local_dt.strftime("%H:%M") if local_dt else None,
        "datetime": local_dt.isoformat() if local_dt else None,
        "url": ep.get("url"),
        "variant_id": variant["id"] if variant else None,
        "variant": variant["name"] if variant else None,
    }


def group_events(episodes, threshold):
    """Collapse same-season, same-day drops of `threshold`+ episodes into one event."""
    by_day = {}
    order = []
    for ep in episodes:
        key = (ep["variant_id"], ep["season"], ep["date"])
        if key not in by_day:
            by_day[key] = []
            order.append(key)
        by_day[key].append(ep)

    events = []
    for key in order:
        group = by_day[key]
        if len(group) >= threshold:
            first = group[0]
            events.append({
                "kind": "binge",
                "id": (f"v{first['variant_id']}-" if first["variant_id"] else "") + f"s{first['season']}-{first['date']}",
                "season": first["season"],
                "code": f"S{first['season']:02d}" if first["season"] is not None else "Season",
                "name": f"All {len(group)} episodes",
                "count": len(group),
                "date": first["date"],
                "time": None,
                "datetime": None,
                "premiere": any(e["number"] == 1 for e in group),
                "url": first["url"],
                "variant": first["variant"],
            })
        else:
            for ep in group:
                events.append({
                    "kind": "episode",
                    "id": str(ep["id"]),
                    "season": ep["season"],
                    "code": ep["code"],
                    "name": ep["name"],
                    "count": 1,
                    "date": ep["date"],
                    "time": ep["time"],
                    "datetime": ep["datetime"],
                    "premiere": ep["number"] == 1,
                    "url": ep["url"],
                    "variant": ep["variant"],
                })
    return events


# ---------------------------------------------------------------------------
# Per-show assembly
# ---------------------------------------------------------------------------

def platform_for(entry, tvshow, network_map):
    if entry.get("watch_on"):
        return entry["watch_on"], "override"
    if tvshow:
        for key in ("webChannel", "network"):
            src = tvshow.get(key)
            if src and src.get("name"):
                name = src["name"]
                if name in network_map:
                    return network_map[name], key
                return name, key
    return None, "unknown"


def phase_for(entry, tvshow, next_event, today):
    if entry["status"] == "ignore":
        return "ignored"
    if entry["status"] == "finished":
        return "finished"
    if next_event:
        days = (date.fromisoformat(next_event["date"]) - today).days
        return "this_week" if days <= 7 else "upcoming"
    if tvshow and tvshow.get("status") == "Ended":
        return "ended"
    return "between_seasons"


def build_show(entry, cfg, tz, today):
    tvshow, matched_by, candidates = resolve_show(entry, cfg["country"])
    shift = int(entry.get("date_shift_days") or 0)
    threshold = int(cfg.get("binge_threshold", 3))
    window_end = today + timedelta(days=int(cfg.get("upcoming_window_days", 120)))
    recent_start = today - timedelta(days=int(cfg.get("recent_window_days", 14)))
    history_start = today - timedelta(days=int(cfg.get("history_days", 90)))

    variants = find_variants(entry, tvshow, cfg["country"])
    episodes = []
    for source, variant in ([(tvshow, None)] if tvshow else []) + [(v, v) for v in variants]:
        raw = (source.get("_embedded") or {}).get("episodes") or []
        for ep in raw:
            if ep.get("type") == "insignificant_special":
                continue
            rec = localize_episode(ep, tz, shift, variant)
            if rec:
                episodes.append(rec)
    if episodes:
        episodes.sort(key=lambda e: (e["date"], e["time"] or "", e["season"] or 0, e["number"] or 0))

    today_iso = today.isoformat()
    future = [e for e in episodes if e["date"] >= today_iso]
    past = [e for e in episodes if e["date"] < today_iso]

    future_events = group_events(future, threshold)
    upcoming = [e for e in future_events if e["date"] <= window_end.isoformat()]
    recent = [e for e in group_events(past, threshold) if e["date"] >= recent_start.isoformat()]
    next_event = future_events[0] if future_events else None
    past_events = group_events(past, threshold)
    last_event = past_events[-1] if past else None
    # Everything for the calendar view: history_days back through the upcoming window.
    calendar = [e for e in past_events if e["date"] >= history_start.isoformat()] + upcoming

    manual = None
    if not next_event and entry.get("next_date"):
        manual = {
            "kind": "manual",
            "id": f"manual-{entry['next_date']}",
            "season": None,
            "code": "New season",
            "name": "Date from shows.json, not TVmaze",
            "count": 1,
            "date": entry["next_date"],
            "time": None,
            "datetime": None,
            "premiere": True,
            "url": None,
        }
        if manual["date"] >= today_iso:
            next_event = manual
            upcoming = [manual]
            calendar = calendar + [manual]

    platform, platform_source = platform_for(entry, tvshow, cfg["network_platforms"])

    return {
        "title": entry["title"],
        "category": entry["category"],
        "priority": int(entry["priority"]),
        "status": entry["status"],
        "notes": entry.get("notes") or "",
        "platform": platform,
        "platform_source": platform_source,
        "on_our_platforms": platform in cfg["platforms"] if platform else None,
        "phase": phase_for(entry, tvshow, next_event, today),
        "matched_by": matched_by,
        "candidates": candidates if matched_by == "search" else [],
        "tvmaze": {
            "id": tvshow["id"],
            "name": tvshow.get("name"),
            "url": tvshow.get("url"),
            "status": tvshow.get("status"),
            "source": source_name(tvshow),
            "premiered": tvshow.get("premiered"),
            "image": (tvshow.get("image") or {}).get("medium"),
            "episode_count": len(episodes),
        } if tvshow else None,
        "variants": [{
            "id": v["id"],
            "name": v.get("name"),
            "url": v.get("url"),
            "status": v.get("status"),
            "source": source_name(v),
        } for v in variants],
        "next": next_event,
        "last": last_event,
        "upcoming": upcoming,
        "recent": recent,
        "calendar": calendar,
    }


# ---------------------------------------------------------------------------
# iCalendar output
# ---------------------------------------------------------------------------

def ics_escape(text):
    return (str(text).replace("\\", "\\\\").replace(";", "\\;")
            .replace(",", "\\,").replace("\r\n", "\\n").replace("\n", "\\n"))


def ics_fold(line):
    """Fold at 75 octets per RFC 5545, without splitting a multibyte character."""
    out = []
    data = line.encode("utf-8")
    first = True
    while data:
        limit = 75 if first else 74
        chunk = data[:limit]
        while True:
            try:
                chunk.decode("utf-8")
                break
            except UnicodeDecodeError:
                chunk = chunk[:-1]
        out.append(("" if first else " ") + chunk.decode("utf-8"))
        data = data[len(chunk):]
        first = False
    return "\r\n".join(out)


def utc_stamp(dt):
    return dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def alarm_lines(event_date, cfg, tz, now, summary):
    lines = []
    for alert in cfg.get("alerts", []):
        hh, mm = (alert.get("time") or "09:00").split(":")
        when = datetime.combine(event_date - timedelta(days=int(alert["days_before"])),
                                datetime.min.time(), tzinfo=tz).replace(hour=int(hh), minute=int(mm))
        if when <= now:
            continue
        lines += [
            "BEGIN:VALARM",
            "ACTION:DISPLAY",
            f"TRIGGER;VALUE=DATE-TIME:{utc_stamp(when)}",
            f"DESCRIPTION:{ics_escape(summary + ' · ' + alert.get('label', ''))}",
            "END:VALARM",
        ]
    return lines


def build_ics(shows, cfg, tz, now):
    site = cfg.get("site_url", "https://zactruelove.com/tv/")
    domain = urllib.parse.urlparse(site).hostname or "zactruelove.com"
    wanted = set(int(p) for p in cfg.get("calendar_priorities", [1, 2, 3]))
    recent_start = (now.date() - timedelta(days=int(cfg.get("recent_window_days", 14)))).isoformat()

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        f"PRODID:-//{domain}//tv watchlist//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{ics_escape(cfg.get('calendar_name', 'TV Watchlist'))}",
        f"X-WR-TIMEZONE:{cfg['timezone']}",
        "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
        "X-PUBLISHED-TTL:PT12H",
    ]

    stamp = utc_stamp(now)
    for show in shows:
        if show["status"] != "active" or show["priority"] not in wanted:
            continue
        sid = show["tvmaze"]["id"] if show["tvmaze"] else "manual"
        for ev in show["recent"] + show["upcoming"]:
            if ev["date"] < recent_start:
                continue
            ev_date = date.fromisoformat(ev["date"])
            summary = f"{ev.get('variant') or show['title']} {ev['code']}"
            if ev["kind"] == "binge":
                summary += f" · all {ev['count']} episodes"
            elif ev["premiere"]:
                summary += " · premiere"
            if show["platform"]:
                summary += f" ({show['platform']})"

            desc_parts = []
            if ev["kind"] == "episode" and ev["name"]:
                desc_parts.append(ev["name"])
            if ev["kind"] == "manual":
                desc_parts.append(ev["name"])
            if show["notes"]:
                desc_parts.append(show["notes"])
            if ev["url"]:
                desc_parts.append(ev["url"])
            desc_parts.append(site)

            lines += [
                "BEGIN:VEVENT",
                f"UID:tv-{sid}-{ev['id']}@{domain}",
                f"DTSTAMP:{stamp}",
            ]
            if ev["datetime"]:
                start = datetime.fromisoformat(ev["datetime"])
                lines.append(f"DTSTART:{utc_stamp(start)}")
                lines.append(f"DTEND:{utc_stamp(start + timedelta(hours=1))}")
            else:
                lines.append(f"DTSTART;VALUE=DATE:{ev_date.strftime('%Y%m%d')}")
                lines.append(f"DTEND;VALUE=DATE:{(ev_date + timedelta(days=1)).strftime('%Y%m%d')}")
            lines.append(f"SUMMARY:{ics_escape(summary)}")
            lines.append(f"DESCRIPTION:{ics_escape(chr(10).join(desc_parts))}")
            lines.append(f"CATEGORIES:{ics_escape(show['category'])}")
            if ev["url"]:
                lines.append(f"URL:{ev['url']}")
            lines += alarm_lines(ev_date, cfg, tz, now, summary)
            lines.append("END:VEVENT")

    lines.append("END:VCALENDAR")
    return "\r\n".join(ics_fold(l) for l in lines) + "\r\n"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def validate(entries):
    problems = []
    seen = set()
    for i, e in enumerate(entries):
        where = f"shows[{i}] ({e.get('title', '?')})"
        if not e.get("title"):
            problems.append(f"{where}: missing title")
        if e.get("category") not in VALID_CATEGORIES:
            problems.append(f"{where}: category must be one of {sorted(VALID_CATEGORIES)}")
        if e.get("status") not in VALID_STATUSES:
            problems.append(f"{where}: status must be one of {sorted(VALID_STATUSES)}")
        if e.get("priority") not in (1, 2, 3):
            problems.append(f"{where}: priority must be 1, 2 or 3")
        if e.get("next_date"):
            try:
                date.fromisoformat(e["next_date"])
            except ValueError:
                problems.append(f"{where}: next_date must be YYYY-MM-DD")
        if "include_variants" in e and not isinstance(e["include_variants"], bool):
            problems.append(f"{where}: include_variants must be true or false")
        if e.get("exclude_ids") is not None and not all(isinstance(i, int) for i in e["exclude_ids"]):
            problems.append(f"{where}: exclude_ids must be a list of TVmaze ids")
        if e.get("title") in seen:
            problems.append(f"{where}: duplicate title")
        seen.add(e.get("title"))
    return problems


def main(argv=None):
    global VERBOSE
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--verbose", action="store_true", help="log API calls and match decisions")
    parser.add_argument("--shows", type=Path, default=SHOWS_FILE, help="watchlist file (default: tv/shows.json)")
    parser.add_argument("--out-dir", type=Path, default=HERE, help="where to write data.json and schedule.ics")
    args = parser.parse_args(argv)
    VERBOSE = args.verbose

    doc = json.loads(args.shows.read_text(encoding="utf-8"))
    cfg = doc["config"]
    entries = doc["shows"]
    problems = validate(entries)
    if problems:
        for p in problems:
            print(f"shows.json: {p}", file=sys.stderr)
        return 1

    tz = ZoneInfo(cfg["timezone"])
    now = datetime.now(tz)
    today = now.date()

    shows = []
    for entry in entries:
        log(f"{entry['title']}")
        try:
            shows.append(build_show(entry, cfg, tz, today))
        except Exception as exc:  # keep going; one bad show should not kill the feed
            print(f"{entry['title']}: {exc}", file=sys.stderr)
            shows.append({
                "title": entry["title"], "category": entry["category"], "priority": int(entry["priority"]),
                "status": entry["status"], "notes": entry.get("notes") or "",
                "platform": entry.get("watch_on"), "platform_source": "override" if entry.get("watch_on") else "unknown",
                "on_our_platforms": None, "phase": "error", "matched_by": "error", "candidates": [],
                "tvmaze": None, "variants": [], "next": None, "last": None, "upcoming": [], "recent": [], "calendar": [],
                "error": str(exc),
            })

    data = {
        "generated_at": now.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "today": today.isoformat(),
        "timezone": cfg["timezone"],
        "platforms": cfg["platforms"],
        "calendar_file": ICS_FILE.name,
        "alerts": cfg.get("alerts", []),
        "shows": shows,
    }

    events = []
    for show in shows:
        for ev in show.pop("calendar"):
            events.append(dict(ev, show=show["title"]))
    events.sort(key=lambda e: (e["date"], e["time"] or "", e["show"]))
    events_doc = {
        "generated_at": data["generated_at"],
        "today": today.isoformat(),
        "from": (today - timedelta(days=int(cfg.get("history_days", 90)))).isoformat(),
        "to": (today + timedelta(days=int(cfg.get("upcoming_window_days", 120)))).isoformat(),
        "events": events,
    }
    data["events_file"] = EVENTS_FILE.name

    args.out_dir.mkdir(parents=True, exist_ok=True)
    (args.out_dir / DATA_FILE.name).write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (args.out_dir / EVENTS_FILE.name).write_text(json.dumps(events_doc, ensure_ascii=False) + "\n", encoding="utf-8")
    (args.out_dir / ICS_FILE.name).write_text(build_ics(shows, cfg, tz, now), encoding="utf-8", newline="")

    matched = sum(1 for s in shows if s["tvmaze"])
    unverified = sum(1 for s in shows if s["tvmaze"] and s["matched_by"] == "search")
    print(f"{len(shows)} shows · {matched} matched on TVmaze ({unverified} by search, not pinned) · "
          f"{sum(len(s['upcoming']) for s in shows)} upcoming events · {len(events)} calendar events")
    for s in shows:
        if not s["tvmaze"]:
            why = f" ({s['error']})" if s.get("error") else (" (using next_date from shows.json)" if s["next"] else "")
            print(f"  not on TVmaze: {s['title']}{why}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
