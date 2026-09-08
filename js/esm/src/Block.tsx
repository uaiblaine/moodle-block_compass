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
 * the three strips, the cards, the one ghost card, the pending notice, the empty state,
 * the live region - and, once a ghost or a heading link has been pressed, tier 3. Until phase R3 tier 3 was an AMD
 * module writing into a region beside this tree; it is a component now, so opening
 * it is a state change and no code outside React touches the block's DOM.
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
import type {GhostKind} from './Ghost';
import {amd} from './amd';
import {fill} from './str';
import {getAttention, getCardDetails, setFavourite} from './repository';
import type {Attention, BlockConfig, CourseCard} from './types';

/** The chip tier 3 opens on, per kind of control that opened it. */
const CHIP_OF_KIND: Record<GhostKind, string> = {
    tier2: 'all',
    'new': 'new',
    favourites: 'favourites',
    pending: 'pending',
};

/** Get_card_details refuses more than this many ids, so the client batches. */
const DETAILS_BATCH = 24;

type NotificationModule = {
    addNotification: (notification: {message: string, type: string}) => void,
};

/**
 * Apply a change to every strip that holds a course.
 *
 * Since ADR-009 a favourite may sit in Continue or New AND in the favourites strip, so
 * a change to a course can touch two cards; the map over all three strips is what keeps
 * them agreeing, and which strips hold the course stays the server's decision.
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
 * The props ARE the configuration: data-react-props is parsed and handed to the
 * component as its props object, so what the shell exports is what arrives here.
 * Wrapping it in a `config` key was this component's first bug, and an instructive
 * one - React renders nothing, unmounts, and says so only in the console, which is
 * the silent failure ADR-006 names. Nothing types the gap between a Mustache
 * template and a component; the Behat scenario is what catches it.
 *
 * @param {object} config Everything classes/output/block.php exported; see BlockConfig.
 * @returns {object} The rendered block.
 */
const Block = (config: BlockConfig) => {
    const [data, setData] = useState<Attention | null>(null);
    // The message to show, or null. It carries the text rather than a boolean because the
    // two failures are different statements: tier 1 did not load, or it did and some of
    // its progress did not. Saying the first when the cards are on screen is untrue.
    const [error, setError] = useState<string | null>(null);
    // Tier 3 is open once a ghost has been pressed, on the chip that ghost implies.
    const [exploring, setExploring] = useState<string | null>(null);
    // The counter is what makes a repeat announceable: React writes nothing when the text
    // is identical, so a screen reader would hear the first "X added to favourites" and
    // not the second. Keying the region on it remounts the node, which is an announcement.
    const [announcement, setAnnouncement] = useState({text: '', at: 0});
    // Which load is current. A retry supersedes whatever the previous one still owes.
    const seq = useRef(0);
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

    /**
     * Fetch tier 1 and then the progress it could not answer from cache.
     *
     * Both halves live in one function, and the sequence number is why: pressing Try
     * again while a fill is still running must not let the old run write into the new
     * payload. Every write checks that it is still the current run first - the same
     * guard explore.js uses for a superseded page fetch.
     *
     * @param {boolean} keep Whether to keep the cards on screen while the new payload
     *     travels. False on first paint and on Try again; true after an archive, where the
     *     strips are merely stale and blanking them would read as a failure.
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
                setError(labels.loaderror || '');
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
                        nodata: detail.progress === null,
                    })),
                    current
                )
                : current));
        }
    }, [labels]);

    useEffect(() => {
        load();
    }, [load]);

    /**
     * Tier 3 changed which courses exist for this user, so tier 1 is stale (ADR-007,
     * decision 3): the strips and all three ghost counts are the server's decision, and the
     * client cannot patch them without reimplementing which strip a course lands in.
     *
     * @returns {Promise} Resolves when tier 1 has been fetched again.
     */
    const refreshAttention = useCallback((): Promise<void> => load(true), [load]);

    /**
     * Toggle the core course star of one course.
     *
     * @param {number} courseid The course.
     * @param {boolean} favourite The state it becomes.
     * @param {string} fullname The course name, for the announcement.
     * @returns {Promise} Resolves when the write has been answered.
     */
    const toggleFavourite = useCallback(async(courseid: number, favourite: boolean, fullname: string) => {
        try {
            await setFavourite(courseid, favourite);
            setData((current) => (current
                ? withCard(current, courseid, (card) => ({...card, isfavourite: favourite}))
                : current));
            setAnnouncement((current) => ({
                text: fill(favourite ? labels.favouriteadded : labels.favouriteremoved, fullname),
                at: current.at + 1,
            }));
        } catch (e) {
            const notification = await amd<NotificationModule>('core/notification');
            notification.addNotification({message: labels.favouriteerror || '', type: 'error'});
        }
    }, [labels]);

    /**
     * Open tier 3 on the chip the pressed control implies.
     *
     * Until phase R3 this reached an AMD module through the bridge and tier 3 rendered
     * into a region beside React's tree. It is a component now, so opening it is a state
     * change and nothing outside this tree is touched.
     *
     * @param {string} kind What was pressed - the ghost, a heading link or the pending
     *     notice; it decides the chip.
     * @returns {Promise} Resolves once tier 3 is open.
     */
    const explore = useCallback(async(kind: GhostKind): Promise<void> => {
        setExploring(CHIP_OF_KIND[kind]);
    }, []);

    /**
     * The link a strip's heading carries when the server counted more than it sent.
     *
     * @param {string} kind Which strip: new or favourites.
     * @param {number} count How many did not fit.
     * @returns {object} The link description, or null when everything fitted.
     */
    const stripoverflow = (kind: GhostKind, count: number): StripOverflow | null => {
        if (count <= 0) {
            return null;
        }
        const text = kind === 'new' ? labels.strip_more_new : labels.strip_more_favourites;
        const label = kind === 'new' ? labels.strip_more_new_label : labels.strip_more_favourites_label;

        return {count, kind, text: fill(text, String(count)), label: fill(label, String(count))};
    };

    const shown = data ? data.continue.length + data.new.length + data.favourites.length : 0;
    const overflows: Record<string, StripOverflow | null> = data
        ? {
            'continue': null,
            'new': stripoverflow('new', data.counts.newmore),
            favourites: stripoverflow('favourites', data.counts.favouritesmore),
        }
        : {};
    /*
     * One ghost card, the last item of the last strip that has cards, standing for tier 2 as it
     * always did (ADR-009, decision 2): only its position moved, out of a region of its own and
     * into tier 1's grid. It hides once tier 3 is open, because then it has nothing left to open.
     */
    const ghost: StripGhost | null = data && data.counts.more > 0 && exploring === null
        ? {count: data.counts.more, text: labels.ghost_more, cta: labels.ghost_explore}
        : null;
    const laststrip = data
        ? [...config.strips].reverse().find((strip) => data[strip.name].length > 0)?.name ?? null
        : null;
    const pendingcount = data && config.pendingenabled ? data.counts.pending : 0;

    return (
        <div>
            {!data && error === null && (
                <div className="compass-status text-muted small" role="status" aria-live="polite">
                    {labels.loading}
                </div>
            )}
            {error !== null && (
                <div className="alert alert-warning compass-error" role="alert">
                    <span>{error}</span>
                    <button type="button" className="btn btn-sm btn-outline-secondary ms-auto" onClick={() => load()}>
                        {labels.retry}
                    </button>
                </div>
            )}
            {data && config.strips.map((strip) => (
                <Fragment key={strip.name}>
                    <Strip
                        name={strip.name}
                        title={strip.title}
                        cards={data[strip.name]}
                        ghost={strip.name === laststrip ? ghost : null}
                        overflow={overflows[strip.name] || null}
                        config={config}
                        onToggleFavourite={toggleFavourite}
                        onExplore={explore}
                    />
                    {/* The one notice an application gets in tier 1 (ADR-009, decision 3): a line
                        under New enrolments - or where that strip would be - and a link-styled
                        button, because it acts on the page and navigates nowhere. */}
                    {strip.name === 'new' && pendingcount > 0 && (
                        <p className="compass-strip-note small text-muted" data-region="pending-notice">
                            {fill(labels.pendingnotice, String(pendingcount))}
                            {' · '}
                            <button
                                type="button"
                                className="btn btn-link btn-sm p-0 align-baseline compass-linkbtn"
                                aria-label={labels.pendingnoticelabel}
                                onClick={() => explore('pending')}
                            >
                                {labels.pendingnoticeview}
                            </button>
                        </p>
                    )}
                </Fragment>
            ))}
            {/* No strip has cards, yet there are courses: the ghost has no grid to close and
                stands alone, as it did before ADR-009 moved it into the strips. */}
            {ghost && laststrip === null && (
                <div className="compass-ghost-wrap">
                    <Ghost count={ghost.count} text={ghost.text} cta={ghost.cta} kind="tier2" onExplore={explore} />
                </div>
            )}
            {data && shown === 0 && (
                <p className="compass-empty text-muted">
                    {data.counts.total === 0 ? labels.nocourses : labels.emptyattention}
                </p>
            )}
            {exploring !== null && (
                <div className="compass-explore-wrap mt-3">
                    <Explore config={config} chip={exploring} announce={announce} onChanged={refreshAttention} />
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
