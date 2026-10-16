// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Capture the README screenshots from a development site seeded by seed_demo.php.
 *
 * Headless Google Chrome over the DevTools protocol (cdp.mjs), at a 2x device scale, with real
 * pointer events to open the calendar cards. Nothing here holds a credential: the session cookies
 * come from a JSON file named by COMPASS_SESSIONS ({"demo.student": "MoodleSession...=...", ...}),
 * written by running session.php once per user, and kept out of the repository.
 *
 *   COMPASS_SESSIONS=/path/sessions.json COMPASS_BASE=http://localhost:9502 \
 *       node capture.mjs [shot ...]
 *
 * The strip opens and closes from its heading and the choice is a user preference, so every shot
 * states the state it needs and presses the heading's toggle when the user is in the other one.
 * Wait for the strip's data (the closed line's counts, or the open row's days), never a fixed sleep.
 *
 * With no shot named, every shot runs except ring and pulse, which need the site's calendar_style
 * set to that style first (finish.py composes styles-ring.png and styles-pulse.png into
 * calendar-styles.png; pulse also writes calendar-pulse.png and calendar-pulse-card.png). Output goes to the
 * parent directory, docs/screenshots/, or to COMPASS_OUT.
 *
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {launch, sleep} from './cdp.mjs';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.COMPASS_BASE || 'http://localhost:9502';
const OUT = process.env.COMPASS_OUT || join(here, '..');
const SESSIONS = JSON.parse(readFileSync(process.env.COMPASS_SESSIONS, 'utf8'));
const DESKTOP = 1200;

// The day the calendar card opens on: tomorrow, the richest day of the seeded data.
const tomorrow = (() => {
    const date = new Date(Date.now() + 86400000);
    return date.toLocaleDateString('en-GB', {day: 'numeric', month: 'long', timeZone: 'Europe/London'});
})();
// The strip and the reload control at its top-right corner, which a crop of the strip alone would cut.
const STRIP = ['section.compass-cal', '.block_compass button[aria-label="Reload courses"]'];
const DAY = (label) => `.compass-cal-days button[aria-label*="${label}"]`;
// The open strip's data is there when its days exist; the closed one's when its counts have replaced the skeleton.
const OPEN_READY = `document.querySelector('.compass-cal-days .compass-cal-day') &&
    !document.querySelector('section.compass-cal[aria-busy="true"]')`;
const LINE_READY = `document.querySelector('.compass-cal-periods:not([aria-busy]) .compass-cal-period') &&
    !document.querySelector('section.compass-cal[aria-busy="true"]')`;

/**
 * Open a page as a user and wait for the block: cards first, then the strip (ADR-014 decision 2).
 *
 * @param {object} browser From launch().
 * @param {string} user A key of the sessions file.
 * @param {string} path Site-relative URL.
 * @param {object} options width, height, mobile, strip ('open', 'closed' or false: the state the strip
 *     is put in, and waited for), dark.
 * @returns {Promise<object>} The page.
 */
const open = async(browser, user, path, options = {}) => {
    const {width = DESKTOP, height = 1000, mobile = false, strip = 'open', dark = false} = options;
    const page = await browser.newPage();
    await page.viewport(width, height, mobile);
    await page.cookie(BASE, SESSIONS[user]);
    await page.goto(BASE + path);
    if (dark) {
        await page.eval(`document.documentElement.setAttribute('data-bs-theme', 'dark')`);
    }
    if (path.startsWith('/admin/')) {
        return page;
    }
    await page.until(`document.querySelector('.block_compass .compass-card, .compass-page .compass-card')`);
    if (strip) {
        await setStrip(page, strip === 'open');
    }
    await settle(page);
    return page;
};

/**
 * Put the strip in the open or the closed state by its heading's toggle, then wait for that state's data.
 * The choice is remembered per user, so the press is made only when the user is in the other state.
 *
 * @param {object} page The page.
 * @param {boolean} wantOpen Whether the row of days (true) or the line of counts (false) is wanted.
 */
const setStrip = async(page, wantOpen) => {
    await page.until(`document.querySelector('.compass-cal-toggle')`);
    const isOpen = await page.eval(`document.querySelector('.compass-cal-toggle').getAttribute('aria-expanded') === 'true'`);
    if (isOpen !== wantOpen) {
        await page.click('.compass-cal-toggle');
    }
    await page.until(wantOpen ? OPEN_READY : LINE_READY, 30000);
    await sleep(400);
    await page.until(wantOpen ? OPEN_READY : LINE_READY, 30000);
};

/**
 * Let lazy images, the progress batch and transitions finish.
 *
 * @param {object} page The page.
 */
const settle = async(page) => {
    await page.until(`[...document.querySelectorAll('img')]
        .filter((i) => i.getBoundingClientRect().top < innerHeight).every((i) => i.complete)`, 15000);
    await sleep(1800);
};

/**
 * Open a day's card by a click, so that it is pinned, and wait for its items.
 *
 * @param {object} page The page.
 * @param {string} label Part of the day button's accessible name.
 */
const pinDay = async(page, label) => {
    await page.click(DAY(label));
    await page.until(`document.querySelector('.compass-cal-card') &&
        !document.querySelector('.compass-cal-card [aria-busy="true"], .compass-cal-card .compass-cal-sk')`);
    await sleep(900);
};

/**
 * Switch the strip to the Teaching view with its icon-only switch, unless it is already drawn.
 *
 * @param {object} page The page.
 */
const teachingView = async(page) => {
    // Icon-only (an aria-label) in a block wide enough for the switch's text, text otherwise.
    const teaching = `[...document.querySelectorAll('.compass-cal-segbtn')]
        .find((b) => (b.getAttribute('aria-label') || b.textContent).trim() === 'Teaching')`;
    await page.until(`${teaching}`);
    if (!(await page.eval(`${teaching}.getAttribute('aria-pressed') === 'true'`))) {
        await page.eval(`${teaching}.setAttribute('data-capture', 'teaching')`);
        await page.click('[data-capture="teaching"]');
        await sleep(1500);
        await page.until(`!document.querySelector('section.compass-cal[aria-busy="true"]')`, 30000);
        await sleep(600);
    }
};

/**
 * The accessible-name part of the first upcoming day whose label mentions submissions to grade, in the
 * open Teaching view; tomorrow when none does.
 *
 * @param {object} page The page.
 * @returns {Promise<string>} Part of a day button's name.
 */
const gradingDay = async(page) => {
    const label = await page.eval(`(() => {
        const days = [...document.querySelectorAll('.compass-cal-days button')];
        const hit = days.find((b) => /grad|submission/i.test(b.getAttribute('aria-label')));
        return hit ? hit.getAttribute('aria-label') : '';
    })()`);
    // The day's label starts with its date ("Tomorrow, 17 October, ..." or "17 October ..."): pick "17 October".
    const match = /(\d{1,2} [A-Z][a-z]+)/.exec(label);
    return match ? match[1] : tomorrow;
};

const save = (name, png) => {
    writeFileSync(join(OUT, name), png);
    // eslint-disable-next-line no-console
    console.log(`wrote ${name} (${png.length} bytes)`);
};

const SHOTS = {
    // The Dashboard: the strip above tier 1 and the tier 2 ghost, the block cropped.
    async dashboard(browser) {
        const page = await open(browser, 'demo.student', '/my/');
        await page.fit(DESKTOP);
        await settle(page);
        await page.mouseAway();
        save('dashboard.png', await page.shot(await page.box('.block_compass', 12)));
    },

    // The open strip alone, nothing hovered: the scroller at home, floating arrows, the scrubber map, one mark per kind.
    async strip(browser) {
        const page = await open(browser, 'demo.student', '/my/');
        await page.mouseAway();
        save('calendar-strip.png', await page.shot(await page.box(STRIP, 12)));
    },

    // Tomorrow's card, pinned by a click.
    async card(browser) {
        const page = await open(browser, 'demo.student', '/my/');
        await page.fit(DESKTOP);
        await pinDay(page, tomorrow);
        save('calendar-day-card.png', await page.shot(await page.box([...STRIP, '.compass-cal-card'], 12)));
    },

    // The teacher's Teaching view open, a day holding submissions to grade pinned: grading counts and class deadlines.
    async teaching(browser) {
        const page = await open(browser, 'demo.teacher', '/my/');
        await page.fit(DESKTOP);
        await teachingView(page);
        const day = await gradingDay(page);
        await pinDay(page, day);
        save('calendar-teaching.png', await page.shot(await page.box([...STRIP, '.compass-cal-card'], 12)));
    },

    // The closed line for the student: Late, Today, Tomorrow, This week and Later.
    async line(browser) {
        const page = await open(browser, 'demo.student', '/my/', {strip: 'closed'});
        await page.mouseAway();
        save('calendar-line.png', await page.shot(await page.box(STRIP, 12)));
    },

    // The closed line for the teacher: the To grade cell first, then the periods. Written only when the cell is there.
    async lineteaching(browser) {
        const page = await open(browser, 'demo.teacher', '/my/', {strip: 'closed'});
        await teachingView(page);
        await page.until(LINE_READY, 30000);
        await sleep(600);
        if (!(await page.eval(`!!document.querySelector('.compass-cal-queue')`))) {
            // eslint-disable-next-line no-console
            console.log('SKIPPED calendar-line-teaching.png: no To grade cell (the ledger does not cover the teacher)');
            return;
        }
        await page.mouseAway();
        save('calendar-line-teaching.png', await page.shot(await page.box(STRIP, 12)));
    },

    // Pointing at a first-tier card: the days that do not hold its course dim, their numbers stay legible.
    async dim(browser) {
        const page = await open(browser, 'demo.student', '/my/');
        await page.fit(DESKTOP);
        await page.hover('.block_compass .compass-card');
        await sleep(900);
        save('calendar-dim.png', await page.shot(await page.box([...STRIP, '.block_compass .compass-card'], 12)));
    },

    // The ring style (calendar_style = ring on the site), for calendar-styles.png.
    async ring(browser) {
        const page = await open(browser, 'demo.student', '/my/');
        await page.mouseAway();
        save('styles-ring.png', await page.shot(await page.box(STRIP, 12)));
    },

    // The pulse style (calendar_style = pulse on the site): the strip on its own, which is also
    // calendar-styles.png's right half, and a second picture with tomorrow pinned.
    async pulse(browser) {
        const page = await open(browser, 'demo.student', '/my/');
        await page.mouseAway();
        const png = await page.shot(await page.box(STRIP, 12));
        save('calendar-pulse.png', png);
        save('styles-pulse.png', png);
        await page.fit(DESKTOP);
        await pinDay(page, tomorrow);
        save('calendar-pulse-card.png', await page.shot(await page.box([...STRIP, '.compass-cal-card'], 12)));
    },

    // Dark mode through Bootstrap's colour-mode attribute, tomorrow pinned.
    async dark(browser) {
        const page = await open(browser, 'demo.student', '/my/', {dark: true});
        await page.fit(DESKTOP);
        await pinDay(page, tomorrow);
        save('calendar-dark.png', await page.shot(await page.box([...STRIP, '.compass-cal-card'], 12)));
    },

    // Tier 3, opened from the ghost, the filter panel open.
    async explore(browser) {
        const page = await open(browser, 'demo.student', '/my/');
        await page.fit(DESKTOP);
        await page.click('.compass-ghost');
        await page.until(`document.querySelector('.compass-explore .compass-toolbar')`);
        await settle(page);
        await page.fit(DESKTOP);
        // A click during the panel's first layout can be lost: press again until it is open.
        for (let i = 0; i < 3 && !(await page.eval(`!!document.querySelector('.compass-filterbtn[aria-expanded="true"]')`)); i++) {
            await page.click('.compass-filterbtn');
            await sleep(1000);
        }
        await sleep(800);
        await page.fit(DESKTOP);
        await settle(page);
        await page.mouseAway();
        save('explore.png', await page.shot(await page.box('.compass-explore', 12)));
    },

    // The block's own page (enable_page).
    async page(browser) {
        const page = await open(browser, 'demo.student', '/blocks/compass/index.php');
        await page.fit(DESKTOP);
        await settle(page);
        await page.mouseAway();
        save('page.png', await page.shot(await page.box(['#page-header', '#region-main'], 12)));
    },

    // A phone: three past days, a tap opens tomorrow as a bottom sheet; the screen as the phone shows it.
    async mobile(browser) {
        const page = await open(browser, 'demo.student', '/my/', {width: 390, height: 844, mobile: true});
        // Three past days at home, a half-day peek of the next one at the row's edge.
        const top = await page.eval(`document.querySelector('section.compass-cal').getBoundingClientRect().top + scrollY`);
        await page.eval(`scrollTo(0, ${Math.max(0, top - 70)})`);
        await sleep(500);
        await page.tap(DAY(tomorrow));
        await page.until(`document.querySelector('.compass-cal-card') &&
            !document.querySelector('.compass-cal-card [aria-busy="true"], .compass-cal-card .compass-cal-sk')`);
        await sleep(1200);
        save('mobile.png', await page.screen());
    },

    // The calendar section of the block's settings, as the admin.
    async settings(browser) {
        const page = await open(browser, 'admin', '/admin/settings.php?section=blocksettingcompass', {strip: false});
        await page.fit(DESKTOP);
        const heading = await page.eval(`(() => {
            const h = [...document.querySelectorAll('#region-main h3')].find((e) => e.textContent.trim() === 'Calendar strip');
            h.setAttribute('data-capture', 'calendar');
            return true;
        })()`);
        if (!heading) {
            throw new Error('No calendar heading');
        }
        // The settings page's own column, from the section heading to its last setting.
        const column = await page.box('#region-main', 0);
        // The last of the section's settings: calendar_grading exists only with block_feedback_tracker.
        const last = await page.eval(`document.querySelector('#admin-calendar_grading') ? '#admin-calendar_grading' : '#admin-calendar_start'`);
        const rows = await page.box(['[data-capture="calendar"]', last], 16);
        save('settings.png', await page.shot({x: column.x, y: rows.y, width: column.width, height: rows.height}));
    },
};

const DEFAULT = ['dashboard', 'strip', 'card', 'teaching', 'line', 'lineteaching', 'dim', 'dark', 'explore', 'page', 'mobile', 'settings'];
const names = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT;
const browser = await launch();
try {
    for (const name of names) {
        if (!SHOTS[name]) {
            throw new Error(`Unknown shot ${name}`);
        }
        await SHOTS[name](browser);
    }
} finally {
    await browser.close();
}
