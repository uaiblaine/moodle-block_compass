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
 * Tier 1: one request on first paint, then the strips.
 *
 * Everything the block shows is rendered from here: the loading and error states,
 * the four strips, the cards, the one ghost card, the pending notice, the empty state,
 * the live region - and, once a ghost or a heading link has been pressed, tier 3. Opening
 * tier 3 is a state change, and no code outside React touches the block's DOM.
 *
 * The block also owns the reload control at the content's top-right, the "Reconnecting…"
 * line the repository's bounded retry reports through, and the amber notice with a way back
 * from a failed first paint.
 *
 * @module     block_compass/Block
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {Fragment, useCallback, useEffect, useRef, useState} from 'react';
import Strip from './Strip';
import type {StripGhost, StripOverflow} from './Strip';
import Ghost from './Ghost';
import Explore from './Explore';
import Reload from './Reload';
import RetryNotice from './RetryNotice';
import type {GhostKind} from './Ghost';
import {notify} from './notify';
import {cardColumns} from './columns';
import {fill, fillObject} from './str';
import {getAttention, getCardDetails, isTransportFailure, onRetry, setFavourite} from './repository';
import type {Attention, BlockConfig, CourseCard, KeptToolbar, Reconnecting, StarChange} from './types';

/**
 * The chip tier 3 opens on, per kind of control that opened it.
 *
 * The ghost carries none: "Explore all" opens tier 3 as the reader left it, which is what
 * remembering the toolbar is for. The heading links and the pending notice press their chip over
 * the remembered one.
 */
const CHIP_OF_KIND: Record<GhostKind, string | null> = {
    tier2: null,
    'new': 'new',
    favourites: 'favourites',
    pending: 'pending',
    scheduled: 'scheduled',
};

/** The card details service refuses more ids than this in one call (cards::DETAILS_BATCH). */
const DETAILS_BATCH = 24;

/**
 * Apply a change to every strip that holds a course.
 *
 * A favourite may sit in Continue or New and in the favourites strip, so a change to a
 * course can touch two cards; the map over all three strips is what keeps them agreeing,
 * and which strips hold the course stays the server's decision.
 *
 * @param {object} data The payload.
 * @param {number} courseid The course to change.
 * @param {Function} change What to do to the card.
 * @returns {object} A new payload; the old one is untouched.
 */
const withCard = (data: Attention, courseid: number, change: (card: CourseCard) => CourseCard): Attention => {
    /**
     * Map one strip.
     *
     * @param {object[]} cards The strip's cards.
     * @returns {object[]} The strip, with the card changed if it is here.
     */
    const strip = (cards: CourseCard[]): CourseCard[] =>
        cards.map((card) => (card.id === courseid ? change(card) : card));

    return {...data, "continue": strip(data.continue), "new": strip(data.new), favourites: strip(data.favourites)};
};

/**
 * The block.
 *
 * The props are the configuration: data-react-props is parsed and handed to the
 * component as its props object, so what the shell exports is what arrives here.
 * Nesting the fields under a key of their own renders nothing, and the error shows
 * only in the console. Nothing type-checks the gap between the Mustache template and
 * this component; the Behat scenario is what catches it.
 *
 * @param {object} config Everything classes/output/block.php exported; see BlockConfig.
 * @returns {object} The rendered block.
 */
const Block = (config: BlockConfig) => {
    const [data, setData] = useState<Attention | null>(null);
    // The message to show, or null. It carries the text rather than a boolean because the
    // failures are different statements: the network dropped, tier 1 did not load, or it did
    // and some of its progress did not. Saying the first when the cards are on screen is untrue.
    const [error, setError] = useState<string | null>(null);
    // Tier 3 is open once a ghost, a heading link or the pending notice has been pressed.
    const [exploring, setExploring] = useState(false);
    // The chip the last press implies, or null for "as the reader left it" (the ghost).
    const [chip, setChip] = useState<string | null>(null);
    // Bumped by every press that opens or re-aims tier 3, so a tier 3 that is already open
    // scrolls into view again; never by a render.
    const [reveal, setReveal] = useState(0);
    // The last star toggled here, for tier 3 to apply to the rows it holds; null until one is.
    const [starred, setStarred] = useState<StarChange | null>(null);
    // Bumped by the reload control: tier 3 remounts under it, a fresh open.
    const [reloadkey, setReloadkey] = useState(0);
    const [reloading, setReloading] = useState(false);
    // Which attempt the repository's bounded retry is on, while it is; null otherwise.
    const [reconnecting, setReconnecting] = useState<Reconnecting | null>(null);
    // Tier 3's toolbar as it is now, and the JSON last read or written for it: a reload remounts
    // Explore under a new key, and a remount seeded from the props - parsed once, at page load -
    // would revert a sort, chip, selection or view changed since.
    const kept = useRef<KeptToolbar | null>(null);
    // The counter is what makes a repeat announceable: React writes nothing when the text
    // is identical, so a screen reader would hear the first "X added to favourites" and
    // not the second. Keying the region on it remounts the node, which is an announcement.
    const [announcement, setAnnouncement] = useState({text: '', at: 0});
    // Which load is current. A retry supersedes whatever the previous one still owes.
    const seq = useRef(0);
    // The width the block has, measured, for the strips' column count (columns.ts): the block
    // may sit in a drawer or a narrow column, so it is the block that is measured, never the
    // viewport - tier 3's category index does the same.
    const root = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    const {labels} = config;

    /**
     * Say something through the assertive live region, even when it repeats.
     *
     * @param {string} text The already-translated message.
     * @returns {void}
     */
    const announce = useCallback((text: string): void => {
        setAnnouncement((current) => ({text, at: current.at + 1}));
    }, []);

    // The one listener the repository's retries report to: shown as a line at the top of the
    // content, so a first paint over a link that is not up yet reads as work in progress, and
    // handed to tier 3 for its own loading region. Attempt 0 is the settle: the last read that
    // was retrying answered or gave up, whichever caller's it was, and the line goes.
    useEffect(() => {
        onRetry((attempt, attempts) => setReconnecting(attempt === 0 ? null : {attempt, attempts}));

        return () => onRetry(null);
    }, []);

    /**
     * Fetch tier 1 and then the progress it could not answer from cache.
     *
     * Both halves live in one function, and the sequence number is why: pressing Try
     * again while a fill is still running must not let the old run write into the new
     * payload. Every write checks that it is still the current run first - the same
     * guard Explore uses for a superseded page fetch.
     *
     * @param {boolean} keep Whether to keep the cards on screen while the new payload
     *     travels. False on first paint and on Try again; true for a refresh (after a tier 3
     *     archive or favourite, and on reload), where the strips are merely stale and blanking
     *     them would read as a failure.
     * @returns {Promise} Resolves when the payload and its details are in state, or
     *     when the failure is.
     */
    const load = useCallback(async(keep = false): Promise<void> => {
        const mine = seq.current + 1;
        seq.current = mine;
        setError(null);
        if (!keep) {
            setData(null);
        }

        let payload;
        try {
            payload = await getAttention();
        } catch (e) {
            if (seq.current === mine) {
                // A transport failure says so; a server that answered gets the generic line.
                setError((isTransportFailure(e) ? labels.connectionlost : labels.loaderror) || '');
            }

            return;
        }
        if (seq.current !== mine) {
            return;
        }
        setData(payload);

        const pending = [payload.continue, payload.new, payload.favourites]
            .flat()
            .filter((card) => card.pending)
            .map((card) => card.id);

        for (let at = 0; at < pending.length; at += DETAILS_BATCH) {
            let answer;
            try {
                answer = await getCardDetails(pending.slice(at, at + DETAILS_BATCH));
            } catch (e) {
                /*
                 * Say so, and stop claiming to be loading. A card whose progress never
                 * arrives must not keep the loading text for ever - that becomes a lie the
                 * moment we give up - and must not claim 0% either: an unknown percentage
                 * is not a zero one. So the remaining cards lose their pending flag and
                 * render no progress at all, and the banner says which half failed. The
                 * cards themselves stay on screen; only their progress is missing.
                 */
                if (seq.current === mine) {
                    setError(labels.progresserror || '');
                    setData((current) => (current
                        ? pending.slice(at).reduce(
                            (into, id) => withCard(into, id, (card) => ({...card, pending: false})),
                            current
                        )
                        : current));
                }

                return;
            }
            if (seq.current !== mine) {
                return;
            }
            setData((current) => (current
                ? answer.details.reduce(
                    (into, detail) => withCard(into, detail.id, (card) => ({
                        ...card,
                        pending: false,
                        hascompletion: detail.hascompletion,
                        progress: detail.progress,
                        teacher: detail.teacher,
                    })),
                    current
                )
                : current));
        }
    }, [labels]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const element = root.current;
        if (!element || typeof ResizeObserver === 'undefined') {
            return undefined;
        }
        const observer = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    // When the browser comes back online and tier 1 is in its error state, one retry the reader
    // should never have to ask for. Listening always and deciding in the handler, as Explore
    // does: a listener attached only once the error is set would miss an online event fired
    // while the repository's own retries were still running.
    useEffect(() => {
        /**
         * Load again, once, on the online event, if tier 1 is in its error state.
         *
         * @returns {void}
         */
        const again = (): void => {
            if (error !== null) {
                load();
            }
        };
        window.addEventListener('online', again);

        return () => window.removeEventListener('online', again);
    }, [error, load]);

    /**
     * Tier 3 changed which courses exist for this user, so tier 1 is stale: the strips and
     * the counts behind the ghost, the overflow links and the pending notice are the server's
     * decision, and the client cannot patch them without reimplementing which strip a course
     * lands in.
     *
     * @returns {Promise} Resolves when tier 1 has been fetched again.
     */
    const refreshAttention = useCallback((): Promise<void> => load(true), [load]);

    /**
     * Everything the page holds, again: tier 1 through load, tier 3 as a fresh open under a
     * new key when it is open - with the toolbar as it is now, from the kept ref, and without
     * the scroll and focus a press would bring: the reveal counter goes back to zero, because
     * a reload is not a gesture towards tier 3.
     *
     * @returns {Promise} Resolves when tier 1 has been fetched again.
     */
    const reloadAll = useCallback(async(): Promise<void> => {
        setReloading(true);
        setReveal(0);
        setReloadkey((current) => current + 1);
        try {
            await load(true);
        } finally {
            setReloading(false);
        }
    }, [load]);

    /**
     * Toggle the core course star of one course.
     *
     * The strips are patched in place, and tier 3, when it is open, is handed the change for the
     * rows it holds; the reverse direction refetches tier 1 instead (see refreshAttention).
     *
     * @param {number} courseid The course.
     * @param {boolean} favourite The state it becomes.
     * @param {string} fullname The course name, for the announcement.
     * @returns {Promise} Resolves when the write has been answered.
     */
    const toggleFavourite = useCallback(async(courseid: number, favourite: boolean, fullname: string) => {
        try {
            await setFavourite(courseid, favourite);
        } catch (e) {
            await notify(labels.favouriteerror || '');

            return;
        }
        setData((current) => (current
            ? withCard(current, courseid, (card) => ({...card, isfavourite: favourite}))
            : current));
        setStarred({courseid, favourite});
        announce(fill(favourite ? labels.favouriteadded : labels.favouriteremoved, fullname));
    }, [labels, announce]);

    /**
     * Open tier 3, or re-aim it, on the chip the pressed control implies.
     *
     * The reveal counter is what makes the press scroll tier 3 into view and hand it the
     * keyboard, every time.
     *
     * @param {string} kind What was pressed - the ghost, a heading link or the pending
     *     notice; it decides the chip.
     * @returns {Promise} Resolves once tier 3 is open.
     */
    const explore = useCallback(async(kind: GhostKind): Promise<void> => {
        setChip(CHIP_OF_KIND[kind]);
        setExploring(true);
        setReveal((current) => current + 1);
    }, []);

    /**
     * The link a strip's heading carries when the server counted more than it sent.
     *
     * @param {string} kind Which strip: new, favourites or scheduled.
     * @param {number} count How many did not fit.
     * @param {string} text The link text, taking the count.
     * @param {string} label The link's accessible name, taking the count.
     * @returns {object} The link description, or null when everything fitted.
     */
    const stripoverflow = (kind: GhostKind, count: number, text: string, label: string): StripOverflow | null => {
        if (count <= 0) {
            return null;
        }

        return {count, kind, text: fill(text, String(count)), label: fill(label, String(count))};
    };

    const shown = data ? data.continue.length + data.new.length + data.favourites.length + data.scheduled.length : 0;
    const overflows: Record<string, StripOverflow | null> = data
        ? {
            'continue': null,
            'new': stripoverflow('new', data.counts.newmore, labels.strip_more_new, labels.strip_more_new_label),
            favourites: stripoverflow(
                'favourites',
                data.counts.favouritesmore,
                labels.strip_more_favourites,
                labels.strip_more_favourites_label
            ),
            scheduled: stripoverflow(
                'scheduled',
                data.counts.scheduledmore,
                labels.strip_more_scheduled,
                labels.strip_more_scheduled_label
            ),
        }
        : {};
    /*
     * The Starts-soon strip comes after the others and the ghost: its courses cannot be entered
     * yet, and they are not among the courses the ghost counts, so the ghost never closes its grid.
     */
    const activestrips = config.strips.filter((strip) => strip.name !== 'scheduled');
    const laterstrips = config.strips.filter((strip) => strip.name === 'scheduled');
    /*
     * One ghost card, the last item of the last active strip that has cards, standing for tier 2.
     * It hides once tier 3 is open, because then it has nothing left to open.
     */
    const ghost: StripGhost | null = data && data.counts.more > 0 && !exploring
        ? {count: data.counts.more, text: labels.ghost_more, cta: labels.ghost_explore}
        : null;
    const laststrip = data
        ? [...activestrips].reverse().find((strip) => data[strip.name].length > 0)?.name ?? null
        : null;
    const columns = cardColumns(width);
    const pendingcount = data && config.pendingenabled ? data.counts.pending : 0;

    /**
     * The line tier 1 gives the applications, which only tier 3 lists: under New enrolments - or
     * where that strip would be - and a link-styled button, because it acts on the page and
     * navigates nowhere.
     *
     * @param {string} kind pending: the chip tier 3 opens on.
     * @param {string} text The line, already filled.
     * @param {string} label The button's accessible name.
     * @param {string} view The button's visible text.
     * @returns {object} The rendered line.
     */
    const notice = (kind: GhostKind, text: string, label: string, view: string) => (
        <p className="compass-strip-note small text-muted" data-region={`${kind}-notice`}>
            {text}
            {' · '}
            <button
                type="button"
                className="btn btn-link btn-sm p-0 align-baseline compass-linkbtn"
                aria-label={label}
                onClick={() => explore(kind)}
            >
                {view}
            </button>
        </p>
    );

    return (
        <div ref={root}>
            {/* The block's own top-right corner: the title bar beside it is core's, so the reload
                control sits on the first row of the content. */}
            <div className="compass-content-head">
                <Reload busy={reloading} config={config} onReload={reloadAll} />
            </div>
            {reconnecting !== null && (
                <div className="compass-status compass-reconnecting text-muted small" role="status" aria-live="polite">
                    {fillObject(labels.reconnecting, {
                        attempt: String(reconnecting.attempt),
                        attempts: String(reconnecting.attempts),
                    })}
                </div>
            )}
            {!data && error === null && reconnecting === null && (
                <div className="compass-status text-muted small" role="status" aria-live="polite">
                    {labels.loading}
                </div>
            )}
            {error !== null && (
                <RetryNotice message={error} retrying={false} config={config} onRetry={() => load()} />
            )}
            {data && activestrips.map((strip) => (
                <Fragment key={strip.name}>
                    <Strip
                        name={strip.name}
                        title={strip.title}
                        cards={data[strip.name]}
                        ghost={strip.name === laststrip ? ghost : null}
                        overflow={overflows[strip.name] || null}
                        columns={columns}
                        config={config}
                        onToggleFavourite={toggleFavourite}
                        onExplore={explore}
                    />
                    {/* The one notice an application gets in tier 1: it is never a card in a strip
                        (ADR-009). */}
                    {strip.name === 'new' && pendingcount > 0 && notice(
                        'pending',
                        fill(labels.pendingnotice, String(pendingcount)),
                        labels.pendingnoticelabel,
                        labels.pendingnoticeview
                    )}
                </Fragment>
            ))}
            {/* No active strip has cards, yet there are courses: the ghost has no grid to close and
                stands alone. */}
            {ghost && laststrip === null && (
                <div className={`compass-ghost-wrap compass-cards-${columns}`}>
                    <Ghost count={ghost.count} text={ghost.text} cta={ghost.cta} kind="tier2" onExplore={explore} />
                </div>
            )}
            {/* Starts soon (ADR-013, 2026-10-08 amendment): drawn whenever an enrolment starts later,
                so a learner whose only courses start later sees them here rather than the empty text. */}
            {data && laterstrips.map((strip) => (
                <Strip
                    key={strip.name}
                    name={strip.name}
                    title={strip.title}
                    cards={data[strip.name]}
                    ghost={null}
                    overflow={overflows[strip.name] || null}
                    columns={columns}
                    config={config}
                    onToggleFavourite={toggleFavourite}
                    onExplore={explore}
                />
            ))}
            {data && shown === 0 && (
                <p className="compass-empty text-muted">
                    {data.counts.total === 0 ? labels.nocourses : labels.emptyattention}
                </p>
            )}
            {exploring && (
                <div className="compass-explore-wrap mt-3">
                    <Explore
                        key={reloadkey}
                        config={config}
                        chip={chip}
                        reveal={reveal}
                        starred={starred}
                        reconnecting={reconnecting}
                        kept={kept}
                        announce={announce}
                        onChanged={refreshAttention}
                    />
                </div>
            )}
            {/* Always in the DOM: a live region added at the moment of the change is
                not reliably announced, because there was nothing to observe before it. */}
            <span key={announcement.at} className="visually-hidden" role="alert" aria-live="assertive">
                {announcement.text}
            </span>
        </div>
    );
};

export default Block;
