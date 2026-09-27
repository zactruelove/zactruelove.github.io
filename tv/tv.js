// ===================================
// tv/ — Watchlist page
// Renders data.json (built by tv/build.py) in three views:
//   #schedule          drops grouped by when they land
//   #shows             every tracked show with last / next dates
//   #calendar/YYYY-MM  month grid (events.json, loaded on demand)
// No dependencies.
// ===================================

(function () {
    'use strict';

    const SECTION_ORDER = ['this_week', 'upcoming', 'between_seasons', 'unmatched', 'ended', 'ignored', 'finished'];
    const HIDDEN_PHASES = new Set(['ignored', 'finished']);
    const HIDDEN_STATUSES = new Set(['ignore', 'finished']);
    const VIEWS = ['schedule', 'shows', 'calendar'];
    const DAY_MS = 86400000;
    const MAX_CHIPS = 4;

    const state = {
        category: 'all',
        priority: 'all',
        platform: 'all',
        search: '',
        showHidden: false,
        sortKey: 'next',
        sortDir: 'asc',
    };

    let DATA = null;
    let EVENTS = null;          // events.json, once fetched
    let eventsPromise = null;
    let PLATFORMS = [];
    let view = 'schedule';
    let month = null;           // 'YYYY-MM' shown in the calendar
    let selectedDay = null;     // 'YYYY-MM-DD'

    // ---------- persistence (per-viewer convenience only) ----------

    function loadState() {
        try {
            const saved = JSON.parse(localStorage.getItem('tv-filters') || '{}');
            Object.keys(state).forEach((k) => { if (k in saved) state[k] = saved[k]; });
        } catch (e) { /* storage unavailable */ }
    }

    function saveState() {
        try { localStorage.setItem('tv-filters', JSON.stringify(state)); } catch (e) { /* ignore */ }
    }

    // ---------- date helpers ----------

    function todayLocal() {
        const n = new Date();
        return new Date(n.getFullYear(), n.getMonth(), n.getDate());
    }

    function isoOf(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function parseDate(iso) {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    function daysFromToday(iso) {
        return Math.round((parseDate(iso) - todayLocal()) / DAY_MS);
    }

    function fmtTime(hhmm) {
        if (!hhmm) return 'all day';
        const [h, m] = hhmm.split(':').map(Number);
        const suffix = h >= 12 ? 'PM' : 'AM';
        const hour = ((h + 11) % 12) + 1;
        return m ? `${hour}:${String(m).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`;
    }

    function fmtShort(iso) {
        return parseDate(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    function fmtLong(iso) {
        return parseDate(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }

    function fmtMonth(ym) {
        return parseDate(ym + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    function shiftMonth(ym, delta) {
        const [y, m] = ym.split('-').map(Number);
        const d = new Date(y, m - 1 + delta, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    function relative(iso) {
        const d = daysFromToday(iso);
        if (d === 0) return 'today';
        if (d === 1) return 'tomorrow';
        if (d === -1) return 'yesterday';
        if (d < 0 && d > -14) return `${-d} days ago`;
        if (d < 0 && d > -60) return `${Math.round(-d / 7)} weeks ago`;
        if (d < 0) return `${Math.round(-d / 30)} months ago`;
        if (d < 14) return `in ${d} days`;
        if (d < 60) return `in ${Math.round(d / 7)} weeks`;
        return `in ${Math.round(d / 30)} months`;
    }

    function ago(isoStamp) {
        const mins = Math.round((Date.now() - new Date(isoStamp)) / 60000);
        if (mins < 2) return 'just now';
        if (mins < 90) return `${mins} min ago`;
        const hours = Math.round(mins / 60);
        if (hours < 36) return `${hours} hours ago`;
        return `${Math.round(hours / 24)} days ago`;
    }

    // ---------- derived data ----------

    // Phases are recomputed here so the page stays right even if the daily
    // build is a day behind: an episode that aired since then moves out of
    // "this week" and the show's next event advances.
    function derive(show) {
        const today = isoOf(todayLocal());
        const upcoming = (show.upcoming || []).filter((e) => e.date >= today);
        const next = upcoming[0] || null;
        // If the build is stale, an episode that was "upcoming" may now be the last one aired.
        const aired = (show.upcoming || []).filter((e) => e.date < today);
        const last = aired.length ? aired[aired.length - 1] : show.last;
        let phase;
        if (show.status === 'ignore') phase = 'ignored';
        else if (show.status === 'finished') phase = 'finished';
        else if (next) phase = daysFromToday(next.date) <= 7 ? 'this_week' : 'upcoming';
        else if (!show.tvmaze) phase = 'unmatched';
        else if (show.tvmaze.status === 'Ended') phase = 'ended';
        else phase = 'between_seasons';
        return Object.assign({}, show, { upcoming, next, last, phase });
    }

    function matches(show) {
        if (state.category !== 'all' && show.category !== state.category) return false;
        if (state.priority !== 'all' && String(show.priority) !== state.priority) return false;
        if (state.platform !== 'all') {
            if (state.platform === 'other') {
                if (show.platform && PLATFORMS.includes(show.platform)) return false;
            } else if (show.platform !== state.platform) return false;
        }
        if (state.search && !show.title.toLowerCase().includes(state.search.toLowerCase())) return false;
        if (!state.showHidden && HIDDEN_STATUSES.has(show.status)) return false;
        return true;
    }

    function visibleShows() {
        return DATA.shows.map(derive).filter(matches);
    }

    // ---------- small builders ----------

    function el(tag, cls, text) {
        const node = document.createElement(tag);
        if (cls) node.className = cls;
        if (text != null) node.textContent = text;
        return node;
    }

    function tag(text, cls) {
        return el('span', 'tag' + (cls ? ' ' + cls : ''), text);
    }

    function priorityLabel(p) {
        return { 1: 'Must watch', 2: 'Normal', 3: 'Whenever' }[p] || `P${p}`;
    }

    function priorityTag(p) {
        return tag(priorityLabel(p), p === 1 ? 'tag-p1' : p === 3 ? 'tag-p3' : '');
    }

    function eventLabel(ev) {
        if (ev.kind === 'binge') return 'Full season drops';
        if (ev.kind === 'manual') return ev.name;
        return ev.name || '';
    }

    function matchDetails(show) {
        if (!show.tvmaze || show.matched_by !== 'search') return null;
        const det = el('details', 'row-match');
        det.appendChild(el('summary', null, `Auto-matched to "${show.tvmaze.name}" · pin tvmaze_id: ${show.tvmaze.id} to confirm`));
        const list = el('ul');
        (show.candidates || []).forEach((c) => {
            const li = el('li');
            const a = el('a', null, `${c.name} · id ${c.id}`);
            a.href = `https://www.tvmaze.com/shows/${c.id}`;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            li.appendChild(a);
            li.appendChild(document.createTextNode(` · ${[c.premiered ? c.premiered.slice(0, 4) : null, c.source, c.country, c.status].filter(Boolean).join(' · ')}`));
            list.appendChild(li);
        });
        det.appendChild(list);
        return det;
    }

    function sideTags(show, ev) {
        const side = el('div', 'row-side');
        if (ev && ev.kind === 'binge') side.appendChild(tag(`All ${ev.count} episodes`, 'tag-strong'));
        else if (ev && ev.premiere) side.appendChild(tag('Premiere', 'tag-strong'));
        if (ev && ev.kind === 'manual') side.appendChild(tag('Manual date', 'tag-dim'));
        if (show.platform) side.appendChild(tag(show.platform, show.on_our_platforms === false ? 'tag-dim' : ''));
        else side.appendChild(tag('Platform ?', 'tag-dim'));
        side.appendChild(priorityTag(show.priority));
        return side;
    }

    // A row for a scheduled event (this week / coming up / calendar day).
    function eventRow(show, ev, opts) {
        opts = opts || {};
        const row = el('article', 'row');
        const when = el('div', 'row-when', opts.timeOnly ? fmtTime(ev.time) : fmtShort(ev.date));
        if (!opts.timeOnly) when.appendChild(el('span', 'time', fmtTime(ev.time)));
        row.appendChild(when);

        const main = el('div', 'row-main');
        main.appendChild(el('div', 'row-title', show.title));
        const sub = el('div', 'row-sub');
        sub.appendChild(el('span', 'ep-code', ev.code));
        sub.appendChild(document.createTextNode(eventLabel(ev)));
        if (ev.url) {
            sub.appendChild(document.createTextNode(' · '));
            const a = el('a', 'tv-link', 'TVmaze');
            a.href = ev.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
            sub.appendChild(a);
        }
        main.appendChild(sub);
        if (show.notes && !opts.compact) main.appendChild(el('div', 'row-notes', show.notes));
        const md = opts.compact ? null : matchDetails(show);
        if (md) main.appendChild(md);
        row.appendChild(main);

        row.appendChild(sideTags(show, ev));
        return row;
    }

    // A row for a show with nothing scheduled.
    function showRow(show) {
        const row = el('article', 'row');
        const when = el('div', 'row-when');
        if (show.last) {
            when.textContent = 'Last aired';
            when.appendChild(el('span', 'time', `${fmtShort(show.last.date)} · ${relative(show.last.date)}`));
        } else {
            when.textContent = show.tvmaze ? 'No episodes' : 'No listing';
        }
        row.appendChild(when);

        const main = el('div', 'row-main');
        main.appendChild(el('div', 'row-title', show.title));
        const sub = el('div', 'row-sub');
        if (show.last) {
            sub.appendChild(el('span', 'ep-code', show.last.code));
            sub.appendChild(document.createTextNode(show.last.kind === 'binge' ? `All ${show.last.count} episodes` : (show.last.name || '')));
        }
        if (show.tvmaze && show.tvmaze.status) {
            sub.appendChild(document.createTextNode((show.last ? ' · ' : '') + `TVmaze: ${show.tvmaze.status}`));
        }
        main.appendChild(sub);
        if (show.notes) main.appendChild(el('div', 'row-notes', show.notes));
        const md = matchDetails(show);
        if (md) main.appendChild(md);
        row.appendChild(main);

        row.appendChild(sideTags(show, null));
        return row;
    }

    // ---------- schedule view ----------

    function renderSection(id, shows) {
        const section = document.getElementById('sec-' + id);
        const list = section.querySelector('.tv-list');
        list.textContent = '';
        section.hidden = shows.length === 0;
        section.querySelector('.tv-count').textContent = shows.length ? String(shows.length) : '';
        if (!shows.length) return;

        if (id === 'this_week' || id === 'upcoming') {
            // Event-centric: every scheduled event in the window, grouped by day.
            const events = [];
            shows.forEach((show) => {
                show.upcoming.forEach((ev) => {
                    const d = daysFromToday(ev.date);
                    if (id === 'this_week' ? d <= 7 : d > 7) events.push({ show, ev });
                });
            });
            events.sort((a, b) => (a.ev.date + (a.ev.time || '')).localeCompare(b.ev.date + (b.ev.time || ''))
                || a.show.priority - b.show.priority || a.show.title.localeCompare(b.show.title));
            let lastDay = null;
            events.forEach(({ show, ev }) => {
                if (ev.date !== lastDay) {
                    const day = el('div', 'tv-day', fmtLong(ev.date));
                    day.appendChild(el('span', 'tv-day-rel', relative(ev.date)));
                    list.appendChild(day);
                    lastDay = ev.date;
                }
                list.appendChild(eventRow(show, ev));
            });
            section.querySelector('.tv-count').textContent = `${events.length} ${events.length === 1 ? 'drop' : 'drops'}`;
        } else {
            shows.sort((a, b) => {
                const la = a.last ? a.last.date : '', lb = b.last ? b.last.date : '';
                return lb.localeCompare(la) || a.priority - b.priority || a.title.localeCompare(b.title);
            });
            shows.forEach((show) => list.appendChild(showRow(show)));
        }
    }

    function renderSchedule() {
        const shows = visibleShows();
        SECTION_ORDER.forEach((id) => renderSection(id, shows.filter((s) => s.phase === id)));
        document.getElementById('empty').hidden = shows.length > 0;
    }

    // ---------- shows view ----------

    const SORTERS = {
        title: (s) => s.title.toLowerCase(),
        category: (s) => s.category,
        priority: (s) => s.priority,
        platform: (s) => (s.platform || '￿').toLowerCase(),
        last: (s) => (s.last ? s.last.date : ''),
        next: (s) => (s.next ? s.next.date : '￿'),   // nothing scheduled sorts last
        status: (s) => `${HIDDEN_STATUSES.has(s.status) ? 1 : 0}${s.tvmaze ? s.tvmaze.status : 'zz'}`,
    };

    function dateCell(ev, past) {
        const td = el('td', 'date');
        if (!ev) {
            td.classList.add('muted');
            td.textContent = '—';
            return td;
        }
        td.appendChild(document.createTextNode(fmtShort(ev.date)));
        const code = el('span', 'ep-code', ev.code + (ev.time ? ' · ' + fmtTime(ev.time) : ''));
        if (ev.kind === 'binge') code.appendChild(tag(`×${ev.count}`, 'tag-strong'));
        else if (ev.premiere && !past) code.appendChild(tag('Premiere', 'tag-strong'));
        if (ev.kind === 'manual') code.appendChild(tag('Manual', 'tag-dim'));
        td.appendChild(code);
        td.title = relative(ev.date);
        return td;
    }

    function renderShows() {
        const shows = visibleShows();
        const key = SORTERS[state.sortKey] ? state.sortKey : 'next';
        const dir = state.sortDir === 'desc' ? -1 : 1;
        shows.sort((a, b) => {
            const ka = SORTERS[key](a), kb = SORTERS[key](b);
            if (ka < kb) return -dir;
            if (ka > kb) return dir;
            return a.title.localeCompare(b.title);
        });

        document.querySelectorAll('#showsTable th button').forEach((b) => {
            if (b.dataset.sort === key) b.dataset.dir = dir === 1 ? 'asc' : 'desc';
            else delete b.dataset.dir;
        });

        const body = document.querySelector('#showsTable tbody');
        body.textContent = '';
        shows.forEach((show) => {
            const tr = el('tr', HIDDEN_STATUSES.has(show.status) ? 'is-hidden' : '');
            const title = el('td', 'title', show.title);
            if (show.tvmaze && show.tvmaze.url) {
                title.textContent = '';
                const a = el('a', 'tv-link', show.title);
                a.href = show.tvmaze.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
                title.appendChild(a);
            }
            tr.appendChild(title);
            tr.appendChild(el('td', 'muted', show.category));
            const pr = el('td'); pr.appendChild(priorityTag(show.priority)); tr.appendChild(pr);
            const pl = el('td');
            pl.appendChild(show.platform ? tag(show.platform, show.on_our_platforms === false ? 'tag-dim' : '') : tag('?', 'tag-dim'));
            tr.appendChild(pl);
            tr.appendChild(dateCell(show.last, true));
            tr.appendChild(dateCell(show.next, false));
            const st = el('td', 'muted', HIDDEN_STATUSES.has(show.status)
                ? (show.status === 'ignore' ? 'Ignored' : 'Finished')
                : (show.tvmaze ? show.tvmaze.status : 'Not on TVmaze'));
            tr.appendChild(st);
            body.appendChild(tr);
        });
        document.getElementById('showsCount').textContent = shows.length ? `${shows.length} shows` : '';
        document.getElementById('showsEmpty').hidden = shows.length > 0;
        document.getElementById('showsTable').hidden = shows.length === 0;
    }

    // ---------- calendar view ----------

    function loadEvents() {
        if (EVENTS) return Promise.resolve(EVENTS);
        if (!eventsPromise) {
            eventsPromise = fetch(DATA.events_file || 'events.json', { cache: 'no-cache' })
                .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
                .then((json) => { EVENTS = json; return json; })
                .catch((e) => { eventsPromise = null; throw e; });
        }
        return eventsPromise;
    }

    // Events for the visible month, filtered like everything else, keyed by day.
    function monthEvents(ym) {
        const byTitle = {};
        visibleShows().forEach((s) => { byTitle[s.title] = s; });
        const days = {};
        EVENTS.events.forEach((ev) => {
            if (!ev.date.startsWith(ym)) return;
            const show = byTitle[ev.show];
            if (!show) return;
            (days[ev.date] = days[ev.date] || []).push({ show, ev });
        });
        Object.values(days).forEach((list) => list.sort((a, b) =>
            ((a.ev.time || '') + a.show.title).localeCompare((b.ev.time || '') + b.show.title)));
        return days;
    }

    function chip(show, ev) {
        const c = el('div', 'ev' + (show.priority === 1 ? ' p1' : '') + (ev.kind === 'binge' ? ' binge' : ''));
        c.appendChild(document.createTextNode(show.title + ' '));
        c.appendChild(el('span', 'code', ev.kind === 'binge' ? `${ev.code} ×${ev.count}` : ev.code));
        c.title = `${show.title} ${ev.code} · ${fmtTime(ev.time)}${show.platform ? ' · ' + show.platform : ''}`;
        return c;
    }

    function renderDayDetail(days) {
        const panel = document.getElementById('calDay');
        panel.textContent = '';
        if (!selectedDay || !selectedDay.startsWith(month)) { panel.hidden = true; return; }
        const list = days[selectedDay] || [];
        const head = el('div', 'tv-section-head');
        head.appendChild(el('span', 'eyebrow', fmtLong(selectedDay)));
        head.appendChild(el('span', 'tv-count', list.length ? `${list.length} ${list.length === 1 ? 'drop' : 'drops'} · ${relative(selectedDay)}` : relative(selectedDay)));
        panel.appendChild(head);
        if (!list.length) {
            panel.appendChild(el('p', 'tv-section-note', 'Nothing dropped this day.'));
        } else {
            const wrap = el('div', 'tv-list');
            list.forEach(({ show, ev }) => wrap.appendChild(eventRow(show, ev, { timeOnly: true, compact: true })));
            panel.appendChild(wrap);
        }
        panel.hidden = false;
    }

    function renderCalendar() {
        const grid = document.getElementById('calGrid');
        const agenda = document.getElementById('calAgenda');
        const loading = document.getElementById('calLoading');
        grid.textContent = '';
        agenda.textContent = '';
        document.getElementById('calTitle').textContent = fmtMonth(month);

        if (!EVENTS) {
            loading.hidden = false;
            loadEvents().then(() => { loading.hidden = true; if (view === 'calendar') renderCalendar(); })
                .catch(() => { loading.textContent = 'Calendar data is not available yet. It appears after the next daily build.'; });
            return;
        }
        loading.hidden = true;

        const first = EVENTS.from.slice(0, 7), last = EVENTS.to.slice(0, 7);
        document.getElementById('calPrev').disabled = month <= first;
        document.getElementById('calNext').disabled = month >= last;
        document.getElementById('calRange').textContent =
            `Showing ${fmtMonth(first)} through ${fmtMonth(last)}. History runs ${Math.round((parseDate(EVENTS.today) - parseDate(EVENTS.from)) / DAY_MS)} days back; drops beyond that stay in TVmaze.`;

        const days = monthEvents(month);
        const today = isoOf(todayLocal());
        const [y, m] = month.split('-').map(Number);
        const firstDow = new Date(y, m - 1, 1).getDay();
        const daysInMonth = new Date(y, m, 0).getDate();
        let total = 0;

        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((d) => grid.appendChild(el('div', 'dow', d)));
        for (let i = 0; i < firstDow; i++) grid.appendChild(el('div', 'cell blank'));
        for (let d = 1; d <= daysInMonth; d++) {
            const iso = `${month}-${String(d).padStart(2, '0')}`;
            const list = days[iso] || [];
            total += list.length;
            const cell = el('button', 'cell');
            cell.type = 'button';
            if (iso === today) cell.classList.add('today');
            if (iso < today) cell.classList.add('past');
            if (iso === selectedDay) cell.classList.add('selected');
            cell.appendChild(el('span', 'daynum', String(d)));
            list.slice(0, MAX_CHIPS).forEach(({ show, ev }) => cell.appendChild(chip(show, ev)));
            if (list.length > MAX_CHIPS) cell.appendChild(el('span', 'more', `+${list.length - MAX_CHIPS} more`));
            cell.setAttribute('aria-label', `${fmtLong(iso)}, ${list.length} drops`);
            cell.addEventListener('click', () => {
                selectedDay = selectedDay === iso ? null : iso;
                renderCalendar();
            });
            grid.appendChild(cell);

            if (list.length) {
                const day = el('div', 'tv-day', fmtLong(iso));
                day.appendChild(el('span', 'tv-day-rel', relative(iso)));
                agenda.appendChild(day);
                const wrap = el('div', 'tv-list');
                list.forEach(({ show, ev }) => wrap.appendChild(eventRow(show, ev, { timeOnly: true, compact: true })));
                agenda.appendChild(wrap);
            }
        }
        document.getElementById('calEmpty').hidden = total > 0;
        renderDayDetail(days);
    }

    // ---------- views & routing ----------

    function parseHash() {
        const h = (location.hash || '#schedule').slice(1);
        const [name, arg] = h.split('/');
        view = VIEWS.includes(name) ? name : 'schedule';
        if (view === 'calendar') {
            month = /^\d{4}-\d{2}$/.test(arg || '') ? arg : isoOf(todayLocal()).slice(0, 7);
        }
    }

    function setHash(next) {
        if (location.hash !== next) history.replaceState(null, '', next);
    }

    function render() {
        VIEWS.forEach((v) => { document.getElementById('view-' + v).hidden = v !== view; });
        document.querySelectorAll('.tv-tab').forEach((t) => {
            if (t.dataset.view === view) t.setAttribute('aria-current', 'page');
            else t.removeAttribute('aria-current');
        });
        if (view === 'schedule') renderSchedule();
        else if (view === 'shows') renderShows();
        else renderCalendar();
    }

    function renderMeta() {
        const meta = document.getElementById('meta');
        meta.textContent = '';
        const active = DATA.shows.filter((s) => s.status === 'active').length;
        const thisWeek = DATA.shows.map(derive).filter((s) => s.phase === 'this_week').length;
        const parts = [
            `${DATA.shows.length} shows, ${active} active`,
            `${thisWeek} airing this week`,
            `updated ${ago(DATA.generated_at)}`,
        ];
        parts.forEach((p, i) => {
            if (i) meta.appendChild(el('span', 'sep', '·'));
            meta.appendChild(document.createTextNode(p));
        });
    }

    function renderPlatformChips() {
        const group = document.getElementById('platformFilters');
        PLATFORMS.concat(['other']).forEach((p) => {
            const c = el('button', 'chip', p === 'other' ? 'Other' : p);
            c.dataset.value = p;
            c.setAttribute('aria-pressed', 'false');
            group.appendChild(c);
        });
    }

    // ---------- filters & controls ----------

    function syncChips() {
        document.querySelectorAll('.tv-filter-group[data-filter]').forEach((group) => {
            const key = group.dataset.filter;
            group.querySelectorAll('.chip').forEach((c) => {
                c.setAttribute('aria-pressed', String(c.dataset.value === state[key]));
            });
        });
        document.getElementById('search').value = state.search;
        document.getElementById('showHidden').checked = state.showHidden;
    }

    function bindControls() {
        document.querySelectorAll('.tv-filter-group[data-filter]').forEach((group) => {
            group.addEventListener('click', (e) => {
                const c = e.target.closest('.chip');
                if (!c) return;
                state[group.dataset.filter] = c.dataset.value;
                saveState(); syncChips(); render();
            });
        });
        document.getElementById('search').addEventListener('input', (e) => {
            state.search = e.target.value.trim();
            saveState(); render();
        });
        document.getElementById('showHidden').addEventListener('change', (e) => {
            state.showHidden = e.target.checked;
            saveState(); render();
        });

        document.querySelector('#showsTable thead').addEventListener('click', (e) => {
            const b = e.target.closest('button[data-sort]');
            if (!b) return;
            if (state.sortKey === b.dataset.sort) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
            else { state.sortKey = b.dataset.sort; state.sortDir = b.dataset.sort === 'last' ? 'desc' : 'asc'; }
            saveState(); renderShows();
        });

        document.getElementById('calPrev').addEventListener('click', () => { month = shiftMonth(month, -1); setHash('#calendar/' + month); renderCalendar(); });
        document.getElementById('calNext').addEventListener('click', () => { month = shiftMonth(month, 1); setHash('#calendar/' + month); renderCalendar(); });
        document.getElementById('calToday').addEventListener('click', () => {
            month = isoOf(todayLocal()).slice(0, 7); selectedDay = isoOf(todayLocal());
            setHash('#calendar/' + month); renderCalendar();
        });

        window.addEventListener('hashchange', () => { parseHash(); render(); });
    }

    function bindTheme() {
        const toggle = document.getElementById('themeToggle');
        toggle.addEventListener('click', () => {
            const isLight = document.documentElement.classList.toggle('light-mode');
            try { localStorage.setItem('theme', isLight ? 'light' : 'dark'); } catch (e) { /* ignore */ }
        });
    }

    // ---------- boot ----------

    async function boot() {
        bindTheme();
        loadState();
        parseHash();
        // The subscribe link should point at wherever this page is actually served from.
        const link = document.getElementById('subscribeLink');
        if (location.protocol.startsWith('http')) {
            link.href = 'webcal://' + location.host + location.pathname.replace(/[^/]*$/, '') + 'schedule.ics';
        }
        try {
            const resp = await fetch('data.json', { cache: 'no-cache' });
            if (!resp.ok) throw new Error(resp.status);
            DATA = await resp.json();
        } catch (e) {
            document.getElementById('meta').textContent = 'No data';
            document.getElementById('nodata').hidden = false;
            return;
        }
        PLATFORMS = DATA.platforms || [];
        renderPlatformChips();
        // A saved platform filter that no longer exists falls back to All.
        if (state.platform !== 'all' && state.platform !== 'other' && !PLATFORMS.includes(state.platform)) state.platform = 'all';
        syncChips();
        bindControls();
        renderMeta();
        render();
    }

    document.addEventListener('DOMContentLoaded', boot);
})();
