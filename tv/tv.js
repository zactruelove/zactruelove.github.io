// ===================================
// tv/ — Watchlist page
// Renders data.json (built by tv/build.py). No dependencies.
// ===================================

(function () {
    'use strict';

    const SECTION_ORDER = ['this_week', 'upcoming', 'between_seasons', 'unmatched', 'ended', 'ignored', 'finished'];
    const HIDDEN_PHASES = new Set(['ignored', 'finished']);
    const DAY_MS = 86400000;

    const state = {
        category: 'all',
        priority: 'all',
        platform: 'all',
        search: '',
        showHidden: false,
    };

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

    function relative(iso) {
        const d = daysFromToday(iso);
        if (d === 0) return 'today';
        if (d === 1) return 'tomorrow';
        if (d === -1) return 'yesterday';
        if (d < 0) return `${-d} days ago`;
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
        const today = todayLocal().toISOString().slice(0, 10);
        const upcoming = (show.upcoming || []).filter((e) => e.date >= today);
        const next = upcoming[0] || null;
        let phase;
        if (show.status === 'ignore') phase = 'ignored';
        else if (show.status === 'finished') phase = 'finished';
        else if (next) phase = daysFromToday(next.date) <= 7 ? 'this_week' : 'upcoming';
        else if (!show.tvmaze) phase = 'unmatched';
        else if (show.tvmaze.status === 'Ended') phase = 'ended';
        else phase = 'between_seasons';
        return Object.assign({}, show, { upcoming, next, phase });
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
        if (!state.showHidden && HIDDEN_PHASES.has(show.phase)) return false;
        return true;
    }

    // ---------- rendering ----------

    function el(tag, cls, text) {
        const node = document.createElement(tag);
        if (cls) node.className = cls;
        if (text != null) node.textContent = text;
        return node;
    }

    function tag(text, cls) {
        return el('span', 'tag' + (cls ? ' ' + cls : ''), text);
    }

    function priorityTag(p) {
        const label = { 1: 'Must watch', 2: 'Normal', 3: 'Whenever' }[p] || `P${p}`;
        return tag(label, p === 1 ? 'tag-p1' : p === 3 ? 'tag-p3' : '');
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

    // A row for a scheduled event (this week / coming up).
    function eventRow(show, ev) {
        const row = el('article', 'row');
        const when = el('div', 'row-when', fmtShort(ev.date));
        when.appendChild(el('span', 'time', fmtTime(ev.time)));
        row.appendChild(when);

        const main = el('div', 'row-main');
        main.appendChild(el('div', 'row-title', show.title));
        const sub = el('div', 'row-sub');
        sub.appendChild(el('span', 'ep-code', ev.code));
        sub.appendChild(document.createTextNode(ev.kind === 'binge' ? 'Full season drops' : (ev.name || '')));
        main.appendChild(sub);
        if (show.notes) main.appendChild(el('div', 'row-notes', show.notes));
        const md = matchDetails(show);
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

    function renderSection(id, shows) {
        const section = document.getElementById('sec-' + id);
        const list = section.querySelector('.tv-list');
        list.textContent = '';
        section.hidden = shows.length === 0;
        section.querySelector('.tv-count').textContent = shows.length ? String(shows.length) : '';
        if (!shows.length) return;

        if (id === 'this_week' || id === 'upcoming') {
            // Event-centric: every scheduled event in the window, grouped by day.
            const horizon = id === 'this_week' ? 7 : Infinity;
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
            void horizon;
        } else {
            shows.sort((a, b) => {
                const la = a.last ? a.last.date : '', lb = b.last ? b.last.date : '';
                return lb.localeCompare(la) || a.priority - b.priority || a.title.localeCompare(b.title);
            });
            shows.forEach((show) => list.appendChild(showRow(show)));
        }
    }

    function render() {
        const shows = DATA.shows.map(derive).filter(matches);
        SECTION_ORDER.forEach((id) => renderSection(id, shows.filter((s) => s.phase === id)));
        document.getElementById('empty').hidden = shows.length > 0;
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
            const chip = el('button', 'chip', p === 'other' ? 'Other' : p);
            chip.dataset.value = p;
            chip.setAttribute('aria-pressed', 'false');
            group.appendChild(chip);
        });
    }

    // ---------- filters ----------

    function syncChips() {
        document.querySelectorAll('.tv-filter-group[data-filter]').forEach((group) => {
            const key = group.dataset.filter;
            group.querySelectorAll('.chip').forEach((chip) => {
                chip.setAttribute('aria-pressed', String(chip.dataset.value === state[key]));
            });
        });
        document.getElementById('search').value = state.search;
        document.getElementById('showHidden').checked = state.showHidden;
    }

    function bindFilters() {
        document.querySelectorAll('.tv-filter-group[data-filter]').forEach((group) => {
            group.addEventListener('click', (e) => {
                const chip = e.target.closest('.chip');
                if (!chip) return;
                state[group.dataset.filter] = chip.dataset.value;
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
    }

    function bindTheme() {
        const toggle = document.getElementById('themeToggle');
        toggle.addEventListener('click', () => {
            const isLight = document.documentElement.classList.toggle('light-mode');
            try { localStorage.setItem('theme', isLight ? 'light' : 'dark'); } catch (e) { /* ignore */ }
        });
    }

    // ---------- boot ----------

    let DATA = null;
    let PLATFORMS = [];

    async function boot() {
        bindTheme();
        loadState();
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
        bindFilters();
        renderMeta();
        render();
    }

    document.addEventListener('DOMContentLoaded', boot);
})();
