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
 * Open for enrolment ("Inscrições abertas", ADR-017): the courses the viewer could join, starting in the
 * band, grouped by reference category, drawn as option B of docs/mockup-new-courses/.
 *
 * Two halves, as Up next. useNews() is the asking, held by the block so a move of the line keeps its
 * answer: get_news once, when the block says it may (after tier 1 has settled), never on a timer and never
 * again on visibilitychange. With the calendar on, that once is the block's batch (ADR-017 amendment 1): the
 * news left in one request with the strip's first read, and useNews() awaits the share it is handed in place
 * of its own ask, under its own sequence number; the line is placed once the strip's answer is in, so the
 * weight is known. A read the batch did not answer is asked again alone.
 * Nothing is asked while the shell says the line is hidden for this sign-in. A failure offers its own Try
 * again, and tier 1's asks again too. The × hides the line at once and writes the news member through
 * calendarpref.ts, which carries every other member of the preference; a failed write puts it back with
 * news_hideerror.
 *
 * OpenCourses is the drawing, in the shape the block chose (decision 7), all three in one panel (round 2,
 * docs/mockup-new-courses/Rodada2.dc.html): the full line (the eyebrow and the summary over a head, up to
 * three groups as links on a row of their own, "+N", and a labelled close), the slim panel with "See", or
 * tier 1's empty state as tiles. "See" and "+N" open the groups in a popover, a dialog that takes the keyboard and
 * gives it back, closed by Escape and by a press outside it; below 640 px of the block's width it is a
 * bottom sheet over a scrim. Nothing is drawn when no course counts: no line, no zero, no reserved space.
 * The line grows in from no height (styles.css, grid rows from 0fr to 1fr, Up next's way), at once under
 * reduced motion.
 *
 * Its strings are the line's own props (news.strings), never the block's labels. The band's last day is
 * written from lang strings (calendar.ts dayMonth()), the calendar's when it renders here, else the ones
 * the shell ships beside the line's.
 *
 * Crests and kinds (ADR-019 decisions 2, 3 and 6, docs/mockup-category-crests/): a group whose category a
 * theme crested draws the first crest beside its name, in the pill (alt empty: the name is beside it), in
 * the popover's rows and in the tiles, where a group without one keeps an empty slot while some group has
 * one. With a theme naming kinds, the summary and the second lines count courses and events apart; with
 * the default kind alone every text reads as before. The pill's name is cut at 12.5 rem and its whole text
 * is in GroupTip, the block's own tooltip, never core's Bootstrap one and never a title: aria-hidden (the
 * pill's accessible name says it all), opened by a hover held 300 ms or at once by keyboard focus, kept
 * while the pointer is on it, closed by Escape without moving focus and by leaving both; it hangs from the
 * anchor beside the clip, above the pill or below it when there is no room, inside the block's width. A tile
 * opens the same tooltip, and only while its name or second line is cut: the tile shows the rest itself.
 * No tooltip below 640 px of the block, where the pill takes the row and a pill's or tile's name wraps to
 * two lines.
 *
 * @module     block_compass/OpenCourses
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import type {FocusEvent, KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode} from 'react';
import RetryNotice from './RetryNotice';
import {dateParts, dayMonth} from './calendar';
import {heldNews, putBackCalendarPreference, writeCalendarPreference} from './calendarpref';
import {sectionTag} from './heading';
import {notify} from './notify';
import {hold} from './pending';
import {getNews} from './repository';
import {fill, fillObject} from './str';
import type {BlockConfig, NewsAnswer, NewsConfig, NewsGroup, NewsGroupKind, NewsKind} from './types';

/** The groups the full line draws as links; the rest are behind "+N". */
const LINE_GROUPS = 3;

/** The tiles' tracks at 640 px of the block and over: in step with .compass-news-tiles in styles.css. */
const TILE_TRACKS = 3;

/** Below this width of the block, in CSS px, the line wraps under its title and the popover is a bottom sheet. */
export const NEWS_NARROW_PX = 640;

/** How long a pointer rests on a pill before its tooltip opens, in ms; keyboard focus opens it at once. */
const TIP_HOVER_MS = 300;

/** How long the tooltip waits after the pointer left the pill or the tooltip, in ms, for it to arrive on the other. */
const TIP_LEAVE_MS = 100;

/** The gap between the pill and its tooltip, in CSS px, which the tooltip's ::before bridges for the pointer. */
const TIP_GAP_PX = 12;

/** How close the tooltip's arrow comes to the tooltip's corners, in CSS px. */
const TIP_ARROW_INSET_PX = 16;

/** The default kind (course_kinds::DEFAULT): a line that counts nothing else reads as before ADR-019. */
const DEFAULT_KIND = 'course';

/** Between a group's kinds on one line: "2 courses · 1 event". */
const KIND_SEPARATOR = ' · ';

/** What the asking hands the block and the drawing. */
export type NewsState = {
    answer: NewsAnswer | null,
    failed: boolean,
    retrying: boolean,
    // Hidden for this sign-in: by the shell's marker, or by the × on this page.
    hidden: boolean,
    retry: () => void,
    hide: () => void,
};

/** The three shapes the block draws the line in (decision 7). */
export type NewsMode = 'full' | 'compact' | 'tiles';

/**
 * Ask for the line once the block says it may, keep the answer, and hide it for the sign-in.
 *
 * @param {object|undefined} news The line's props, absent when news_enabled is off.
 * @param {boolean} ready Whether tier 1 has settled and, with the calendar, the pair has left.
 * @param {number} turn The block's turn: tier 1's Try again bumps it, and a failed ask is asked again.
 * @param {Promise|null} first The news' share of the block's batch, awaited by the first ask; null asks alone.
 * @returns {object} The answer, its failure, the hidden flag and the two actions; see NewsState.
 */
export const useNews = (
    news: NewsConfig | undefined,
    ready: boolean,
    turn: number,
    first: Promise<NewsAnswer> | null,
): NewsState => {
    const [answer, setAnswer] = useState<NewsAnswer | null>(null);
    const [failed, setFailed] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const [hidden, setHidden] = useState(!news || news.signin > 0);
    const asked = useRef(false);
    const seq = useRef(0);
    const turnseen = useRef(turn);

    // Moodle's pending counter, held from the first render until the answer or the failure is in, so
    // Behat never reads the block between tier 1 and the line (pending.ts). A hidden line holds nothing.
    const waiting = !!news && news.enabled && !hidden && ((answer === null && !failed) || retrying);
    const release = useRef<(() => void) | null>(null);
    if (release.current === null && waiting) {
        release.current = hold('block_compass/news');
    }
    useEffect(() => {
        if (!waiting && release.current !== null) {
            release.current();
            release.current = null;
        }
    }, [waiting]);
    useEffect(() => () => release.current?.(), []);

    /**
     * Ask for the line, keeping the answer only while it is the last ask.
     *
     * @param {Promise|null} handed The batch's news for the first ask; null asks alone (every retry).
     * @returns {Promise} Resolves when the answer or the failure is in state.
     */
    const ask = async(handed: Promise<NewsAnswer> | null = null): Promise<void> => {
        const mine = seq.current + 1;
        seq.current = mine;
        try {
            const got = await (handed ?? getNews());
            if (seq.current === mine) {
                setAnswer(got);
                setFailed(false);
            }
        } catch (e) {
            if (seq.current === mine) {
                setFailed(true);
            }
        }
        if (seq.current === mine) {
            setRetrying(false);
        }
    };

    // Once: when the block says the weight is known, unless the line is off or hidden for this sign-in.
    useEffect(() => {
        if (!news || !news.enabled || news.signin > 0 || hidden || !ready || asked.current) {
            return;
        }
        asked.current = true;
        ask(first);
    }, [news, hidden, ready, first]);

    // Tier 1's Try again asks again for a failed line, as it does for the strip.
    useEffect(() => {
        if (turn === turnseen.current) {
            return;
        }
        turnseen.current = turn;
        if (failed && asked.current && !hidden) {
            setRetrying(true);
            ask();
        }
    }, [turn, failed]);

    /**
     * The line's own Try again.
     *
     * @returns {void}
     */
    const retry = (): void => {
        setRetrying(true);
        ask();
    };

    /**
     * Hide the line until the next sign-in: at once, then the news member written with every other one;
     * put back with a notice if the write fails (decision 9).
     *
     * @returns {void}
     */
    const hide = (): void => {
        if (!news) {
            return;
        }
        const before = heldNews();
        setHidden(true);
        writeCalendarPreference({news: {signin: news.marker}}).catch(() => {
            putBackCalendarPreference({news: before});
            setHidden(false);
            notify(news.strings.news_hideerror || '');
        });
    };

    return {answer, failed, retrying, hidden, retry, hide};
};

/**
 * Whether a group stands for one course, which it then names.
 *
 * @param {object} group The group.
 * @returns {boolean} Whether it does.
 */
const isOne = (group: NewsGroup): boolean => (group.courseid ?? 0) > 0 && !!group.coursename;

/**
 * Whether a tile cuts its name or its second line with an ellipsis: only then does its tooltip say more
 * than the tile.
 *
 * @param {object} tile The tile.
 * @returns {boolean} Whether some text of it is cut.
 */
const isCut = (tile: HTMLElement): boolean =>
    [...tile.querySelectorAll<HTMLElement>('.compass-news-tilename, .compass-news-tilesub')]
        .some((text) => text.scrollWidth > text.clientWidth);

/**
 * Whether counts by kind say more than "courses": more than one kind counted, or one that is not the default.
 *
 * Only then do the texts name kinds (ADR-019 decision 6); a site without a theme naming kinds, or one whose
 * courses are all courses, keeps every string of before.
 *
 * @param {Array} kinds Counts by kind, the answer's or a group's.
 * @returns {boolean} Whether to name the kinds.
 */
const tellsKinds = (kinds: NewsGroupKind[]): boolean => {
    const counted = kinds.filter((kind) => kind.count > 0);

    return counted.length > 1 || counted.some((kind) => kind.key !== DEFAULT_KIND);
};

/**
 * A group's counts by kind; a group the server sent none for counts its courses as courses.
 *
 * @param {object} group The group.
 * @returns {Array} Its counts by kind, never empty.
 */
const kindsOf = (group: NewsGroup): NewsGroupKind[] =>
    (group.kinds?.length ? group.kinds : [{key: DEFAULT_KIND, count: group.count}]);

/**
 * Each kind with a count, written: "8 courses", "1 event", the noun for one when the count is one.
 *
 * @param {object} strings The line's strings.
 * @param {Array} nouns The answer's kinds, which carry the nouns.
 * @param {Array} kinds The counts to write.
 * @returns {Array} One text per kind with a count, in the kinds' order.
 */
const kindCounts = (strings: Record<string, string>, nouns: NewsKind[], kinds: NewsGroupKind[]): string[] =>
    kinds.filter((kind) => kind.count > 0).map((kind) => {
        const named = nouns.find((one) => one.key === kind.key) ?? nouns.find((one) => one.key === DEFAULT_KIND);
        const noun = kind.count === 1 ? named?.one : named?.many;

        return fillObject(strings.news_kind_count, {count: String(kind.count), noun: noun ?? kind.key});
    });

/**
 * Items joined into one phrase: "8 courses", "8 courses and 4 events", "6 courses, 4 events and 2 tracks".
 *
 * @param {object} strings The line's strings.
 * @param {Array} items The written items.
 * @returns {string} The phrase.
 */
const listOf = (strings: Record<string, string>, items: string[]): string => {
    if (items.length < 2) {
        return items[0] ?? '';
    }
    const head = items.slice(0, -1).reduce((list, item) => fillObject(strings.news_kinds_join, {list, item}));

    return fillObject(strings.news_kinds_last, {list: head, item: items[items.length - 1]});
};

/**
 * A group's line in the tooltip and the popover: its kinds, "2 courses · 1 event".
 *
 * @param {object} strings The line's strings.
 * @param {Array} nouns The answer's kinds.
 * @param {object} group The group.
 * @returns {string} The line.
 */
const kindsLine = (strings: Record<string, string>, nouns: NewsKind[], group: NewsGroup): string =>
    kindCounts(strings, nouns, kindsOf(group)).join(KIND_SEPARATOR);

/**
 * A group's accessible name when it holds several courses: a sentence that starts with what is visible,
 * its kinds named when they say more than courses.
 *
 * @param {object} strings The line's strings.
 * @param {Array} nouns The answer's kinds.
 * @param {object} group The group.
 * @returns {string|undefined} The name, or undefined for a group of one, whose visible text names it.
 */
const groupLabel = (strings: Record<string, string>, nouns: NewsKind[], group: NewsGroup): string | undefined => {
    if (isOne(group)) {
        return undefined;
    }
    if (!tellsKinds(kindsOf(group))) {
        return fillObject(strings.news_group_label, {name: group.name, count: String(group.count)});
    }
    const list = listOf(strings, kindCounts(strings, nouns, kindsOf(group)));

    return fillObject(strings.news_group_label_kinds, {name: group.name, list});
};

/**
 * The summary: "6 courses start by 27 November", the singular for one; with kinds told apart,
 * "8 courses and 4 events start by 27 November".
 *
 * @param {object} strings The line's strings.
 * @param {number} total The courses counted.
 * @param {string} until The band's last day, written.
 * @param {Array} nouns The answer's kinds.
 * @returns {string} The summary.
 */
const summaryOf = (strings: Record<string, string>, total: number, until: string, nouns: NewsKind[]): string => {
    if (!tellsKinds(nouns)) {
        return (total === 1
            ? fillObject(strings.news_summary_one, {until})
            : fillObject(strings.news_summary, {count: String(total), until}));
    }
    const list = listOf(strings, kindCounts(strings, nouns, nouns));

    return fillObject(total === 1 ? strings.news_summary_kinds_one : strings.news_summary_kinds, {list, until});
};

/** The four-point star of the panel's decoration, from the mockup. */
const SPARK_PATH = 'M12 2 L13.6 9.4 L21 11 L13.6 12.6 L12 20 L10.4 12.6 L3 11 L10.4 9.4 Z';

/**
 * One decorative sparkle: static, hidden from assistive technology, its place and size in styles.css.
 *
 * @param {object} props The variant's class: compass-news-spark-a, -b or -c, written whole.
 * @returns {object} The sparkle.
 */
const Spark = ({place}: {place: string}) => (
    <span className={`compass-news-spark ${place}`} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor" focusable="false"><path d={SPARK_PATH} /></svg>
    </span>
);

/**
 * A group's second line in the popover and the tiles: the course of a group of one, else its kinds when
 * they say more than courses, else nothing.
 *
 * @param {object} strings The line's strings.
 * @param {Array} nouns The answer's kinds.
 * @param {object} group The group.
 * @returns {string} The line, or the empty string.
 */
const secondLine = (strings: Record<string, string>, nouns: NewsKind[], group: NewsGroup): string => {
    if (isOne(group)) {
        return group.coursename ?? '';
    }

    return tellsKinds(kindsOf(group)) ? kindsLine(strings, nouns, group) : '';
};

/**
 * A group's crest in the popover and the tiles, 28 x 31 in a 34 x 36 tile, or the tile's place kept empty
 * so the names align (Q5). Drawn only while some group of the list has a crest. The alt is empty: the
 * name is beside it.
 *
 * @param {object} props The group.
 * @returns {object} The slot.
 */
const CrestSlot = ({group}: {group: NewsGroup}) => (group.crest
    ? <span className="compass-news-slot"><img src={group.crest} alt="" /></span>
    : <span className="compass-news-slot compass-news-slot-empty" />);

/** Where the tooltip stands in the anchor, in CSS px, and whether it hangs below the pill. */
type TipPlace = {
    top: number,
    left: number,
    // The arrow's centre from the tooltip's left edge, under the pill's centre.
    arrow: number,
    below: boolean,
};

/**
 * Where a tooltip goes: centred over its pill, below it when the viewport has no room above, and kept
 * inside the anchor's width (the block's), its arrow still pointing at the pill.
 *
 * @param {object} anchor The anchor's box, which the tooltip is positioned in.
 * @param {object} pill The pill's box.
 * @param {object} tip The tooltip's own box, as laid out.
 * @returns {object} The place; see TipPlace.
 */
const placeTip = (anchor: DOMRect, pill: DOMRect, tip: DOMRect): TipPlace => {
    const below = pill.top - tip.height - TIP_GAP_PX < 0;
    const centre = pill.left + pill.width / 2 - anchor.left;
    const left = Math.max(0, Math.min(centre - tip.width / 2, anchor.width - tip.width));

    return {
        top: below ? pill.bottom - anchor.top + TIP_GAP_PX : pill.top - anchor.top - tip.height - TIP_GAP_PX,
        left,
        arrow: Math.max(TIP_ARROW_INSET_PX, Math.min(centre - left, tip.width - TIP_ARROW_INSET_PX)),
        below,
    };
};

type GroupTipProps = {
    group: NewsGroup,
    // The pill it belongs to, and the anchor it hangs from, beside the clip that grows the line.
    pill: HTMLElement,
    anchor: HTMLElement,
    // Its one line: the course of a group of one, else the group's kinds.
    line: string,
    onEnter: () => void,
    onLeave: () => void,
};

/**
 * A pill's tooltip (ADR-019 decision 3): the crest on its tile, the whole name and one line.
 *
 * aria-hidden: the pill's accessible name already says all of it, and a tooltip of the block's own is never
 * announced twice. Drawn once unplaced and invisible, measured before paint, then placed and shown, so it
 * fades in (120 ms) where it belongs. It takes the pointer only once shown, and its ::before bridges the
 * gap to the pill (styles.css), so the pointer can move onto it and it stays (WCAG 1.4.13).
 *
 * @param {object} props The group, its pill, the anchor, the line and the two pointer callbacks; see GroupTipProps.
 * @returns {object} The tooltip.
 */
const GroupTip = ({group, pill, anchor, line, onEnter, onLeave}: GroupTipProps) => {
    const box = useRef<HTMLDivElement>(null);
    const [place, setPlace] = useState<TipPlace | null>(null);

    useLayoutEffect(() => {
        if (!box.current) {
            return;
        }
        setPlace(placeTip(anchor.getBoundingClientRect(), pill.getBoundingClientRect(), box.current.getBoundingClientRect()));
    }, [group, pill, anchor]);

    const classes = ['compass-news-tip'];
    if (!group.crest) {
        classes.push('compass-news-tip-plain');
    }
    if (place?.below) {
        classes.push('compass-news-tip-below');
    }
    if (place) {
        classes.push('compass-news-tip-on');
    }

    return (
        <div
            ref={box}
            className={classes.join(' ')}
            aria-hidden="true"
            style={place ? {top: `${place.top}px`, left: `${place.left}px`} : undefined}
            onPointerEnter={onEnter}
            onPointerLeave={onLeave}
        >
            {group.crest && (
                <span className="compass-news-tipcrest"><img src={group.crest} alt={group.crestalt ?? ''} /></span>
            )}
            <span className="compass-news-tipbody">
                <span className="compass-news-tipname">{group.name}</span>
                <span className="compass-news-tipmeta">{line}</span>
            </span>
            <span className="compass-news-tiparrow" style={place ? {left: `${place.arrow}px`} : undefined} />
        </div>
    );
};

/** The tooltip shown: the group, and the pill it was opened from. */
type TipState = {group: NewsGroup, pill: HTMLElement};

type OpenCoursesProps = {
    config: BlockConfig,
    news: NewsConfig,
    state: NewsState,
    mode: NewsMode,
    // The block's measured width: below NEWS_NARROW_PX the line wraps and the popover is a bottom sheet.
    width: number,
};

/**
 * The line, the compact sentence or the tiles; a failure notice; or nothing.
 *
 * @param {object} props The configs, the asking's state, the shape and the block's width; see OpenCoursesProps.
 * @returns {object|null} The rendered line.
 */
// A component's render branches all count toward its complexity; the three shapes share one popover,
// so the count is acknowledged here.
// eslint-disable-next-line complexity
const OpenCourses = ({config, news, state, mode, width}: OpenCoursesProps) => {
    const {answer, failed, retrying, hidden, retry, hide} = state;
    // The calendar's date strings when it renders here, else the copies the shell ships with the line's.
    const strings = {...(config.calendar?.strings ?? {}), ...news.strings};
    // A section of its own, never a region of the calendar's: it is the block's first heading when the
    // strip is not here, where a card title's rung would skip a level (axe heading-order).
    const Title = sectionTag(config.headinglevel);
    const baseid = useId();
    const titleid = `${baseid}-news`;
    const popid = `${baseid}-newspop`;
    const narrow = width > 0 && width < NEWS_NARROW_PX;
    const shown = !hidden && !failed && !!answer && answer.total > 0 && answer.groups.length > 0;
    // Grown is set before paint, after the collapsed line has been laid out, so it grows from no height.
    const [grown, setGrown] = useState(false);
    const [popover, setPopover] = useState(false);
    const wrap = useRef<HTMLDivElement>(null);
    const dialog = useRef<HTMLDivElement>(null);
    // The control that opened the popover, which takes the keyboard back when it closes.
    const opener = useRef<HTMLButtonElement | null>(null);
    // The pill's tooltip (GroupTip): the group shown, and the one timer that opens or closes it.
    const [tip, setTip] = useState<TipState | null>(null);
    const tiptimer = useRef(0);
    const anchor = useRef<HTMLDivElement>(null);
    // The full line's pills and the tiles have one, the slim panel none, and none below 640 px of the
    // block: touch has no hover.
    const tips = mode !== 'compact' && !narrow;

    useLayoutEffect(() => {
        if (!shown) {
            setGrown(false);
            setPopover(false);
            setTip(null);
            return;
        }
        wrap.current?.getBoundingClientRect();
        setGrown(true);
    }, [shown]);

    /**
     * Close the popover, and give the keyboard back to the control that opened it.
     *
     * @param {boolean} refocus Whether to move focus to that control: not when it already went elsewhere.
     * @returns {void}
     */
    const close = (refocus: boolean): void => {
        setPopover(false);
        if (refocus) {
            opener.current?.focus();
        }
    };

    // Opened: the keyboard goes to the first link inside. A press outside it closes it.
    useLayoutEffect(() => {
        if (!popover) {
            return undefined;
        }
        dialog.current?.querySelector<HTMLElement>('a, button')?.focus();
        /**
         * Close on a press that lands outside the popover and its opener.
         *
         * @param {object} event The pointer event.
         * @returns {void}
         */
        const outside = (event: PointerEvent): void => {
            const target = event.target as Node | null;
            if (target && (dialog.current?.contains(target) || opener.current?.contains(target))) {
                return;
            }
            close(true);
        };
        document.addEventListener('pointerdown', outside);

        return () => document.removeEventListener('pointerdown', outside);
    }, [popover]);

    // Escape closes the tooltip wherever the keyboard is, and leaves the keyboard where it is (WCAG 1.4.13).
    useEffect(() => {
        if (!tip) {
            return undefined;
        }
        /**
         * Close the tooltip on Escape.
         *
         * @param {object} event The key event.
         * @returns {void}
         */
        const onkey = (event: {key: string}): void => {
            if (event.key === 'Escape') {
                window.clearTimeout(tiptimer.current);
                setTip(null);
            }
        };
        document.addEventListener('keydown', onkey);

        return () => document.removeEventListener('keydown', onkey);
    }, [tip]);

    // A timer left running goes with the line.
    useEffect(() => () => window.clearTimeout(tiptimer.current), []);

    if (hidden) {
        return null;
    }
    if (failed) {
        return (
            <div className="compass-news-fail">
                <RetryNotice message={strings.news_error} retrying={retrying} config={config} onRetry={retry} />
            </div>
        );
    }
    if (!answer || !shown) {
        return null;
    }

    const until = answer.to ? dayMonth(strings, dateParts(answer.to)) : '';
    // The kinds and their nouns; empty from a server before ADR-019, which reads as the default kind alone.
    const nouns = answer.kinds ?? [];
    const summary = summaryOf(strings, answer.total, until, nouns);
    // The popover's and the tiles' crest slots, kept while any group has a crest and drawn for none otherwise (Q5).
    const withslots = answer.groups.some((group) => !!group.crest);

    /**
     * Open the popover from a control.
     *
     * @param {object} control The button pressed.
     * @returns {void}
     */
    const openFrom = (control: HTMLButtonElement): void => {
        opener.current = control;
        window.clearTimeout(tiptimer.current);
        setTip(null);
        setPopover((current) => !current);
    };

    /**
     * Show a pill's tooltip now.
     *
     * @param {object} group The pill's group.
     * @param {object} pill The pill.
     * @returns {void}
     */
    const showTip = (group: NewsGroup, pill: HTMLElement): void => {
        window.clearTimeout(tiptimer.current);
        setTip({group, pill});
    };

    /**
     * Whether a pill or tile wants its tooltip: a pill always (it shows neither the whole name nor the
     * kinds), a tile only while it cuts a text.
     *
     * @param {object} control The pill or the tile.
     * @returns {boolean} Whether to open the tooltip.
     */
    const wantsTip = (control: HTMLElement): boolean => mode !== 'tiles' || isCut(control);

    /**
     * A pointer came to rest on a pill: its tooltip opens after TIP_HOVER_MS, and stays if already shown. A
     * touch opens none, as it has no hover to take back.
     *
     * @param {object} group The pill's group.
     * @param {object} event The pointer event.
     * @returns {void}
     */
    const hoverTip = (group: NewsGroup, event: ReactPointerEvent<HTMLAnchorElement>): void => {
        if (event.pointerType === 'touch' || !wantsTip(event.currentTarget)) {
            return;
        }
        const pill = event.currentTarget;
        window.clearTimeout(tiptimer.current);
        if (tip?.pill === pill) {
            return;
        }
        tiptimer.current = window.setTimeout(() => setTip({group, pill}), TIP_HOVER_MS);
    };

    /**
     * Keyboard focus on a pill opens its tooltip at once; the focus a press gives opens none (the hover does).
     *
     * @param {object} group The pill's group.
     * @param {object} event The focus event.
     * @returns {void}
     */
    const focusTip = (group: NewsGroup, event: FocusEvent<HTMLAnchorElement>): void => {
        if (event.currentTarget.matches(':focus-visible') && wantsTip(event.currentTarget)) {
            showTip(group, event.currentTarget);
        }
    };

    /**
     * The pointer left the pill or the tooltip: it closes unless the pointer arrives on the other in time.
     *
     * @returns {void}
     */
    const leaveTip = (): void => {
        window.clearTimeout(tiptimer.current);
        tiptimer.current = window.setTimeout(() => setTip(null), TIP_LEAVE_MS);
    };

    /**
     * The pointer arrived on the tooltip: it stays.
     *
     * @returns {void}
     */
    const keepTip = (): void => window.clearTimeout(tiptimer.current);

    /**
     * Focus left the pill: its tooltip closes.
     *
     * @returns {void}
     */
    const blurTip = (): void => {
        window.clearTimeout(tiptimer.current);
        setTip(null);
    };

    /**
     * Hide the line, the keyboard going to the block's root first: the × leaves the page with it.
     *
     * @param {object} control The button pressed.
     * @returns {void}
     */
    const hideFrom = (control: HTMLElement): void => {
        control.closest<HTMLElement>('.compass-body')?.focus();
        setPopover(false);
        hide();
    };

    /**
     * Escape closes the popover and gives the keyboard back.
     *
     * @param {object} event The key event.
     * @returns {void}
     */
    const onKey = (event: KeyboardEvent<HTMLDivElement>): void => {
        if (event.key === 'Escape') {
            event.stopPropagation();
            close(true);
        }
    };

    /**
     * Tabbing out of the popover closes it, leaving the keyboard where it went.
     *
     * @param {object} event The focus event.
     * @returns {void}
     */
    const onLeave = (event: FocusEvent<HTMLDivElement>): void => {
        const next = event.relatedTarget as Node | null;
        if (next && !dialog.current?.contains(next) && !opener.current?.contains(next)) {
            close(false);
        }
    };

    const pop: ReactNode = popover && (
        <>
            {narrow && <div className="compass-news-scrim" aria-hidden="true" />}
            <div
                ref={dialog}
                id={popid}
                className={narrow ? 'compass-news-pop compass-news-sheet' : 'compass-news-pop'}
                role="dialog"
                aria-modal={narrow || undefined}
                aria-label={strings.news_title}
                tabIndex={-1}
                onKeyDown={onKey}
                onBlur={onLeave}
            >
                <Spark place="compass-news-spark-d" />
                <div className="compass-news-pophead">
                    <span
                        className="compass-news-icon icon-no-margin"
                        aria-hidden="true"
                        dangerouslySetInnerHTML={{__html: news.icon}}
                    />
                    <div className="compass-news-copy">
                        <p className="compass-news-popeyebrow">{strings.news_title}</p>
                        <p className="compass-news-popsum">{summary}</p>
                    </div>
                </div>
                <ul className="compass-news-poplist">
                    {answer.groups.map((group) => {
                        const sub = secondLine(strings, nouns, group);

                        return (
                            <li key={group.categoryid}>
                                <a className="compass-news-poprow" href={group.url} aria-label={groupLabel(strings, nouns, group)}>
                                    {withslots && <CrestSlot group={group} />}
                                    <span className="compass-news-popname">
                                        <span className="compass-news-popcat" title={group.name}>{group.name}</span>
                                        {sub && <span className="compass-news-popsub" title={sub}>{sub}</span>}
                                    </span>
                                    <span className="compass-news-count">{group.count}</span>
                                </a>
                            </li>
                        );
                    })}
                </ul>
                <div className="compass-news-popfoot">
                    <a className="compass-news-all" href={answer.allurl}>{strings.news_all}</a>
                    <button
                        type="button"
                        className="compass-news-pophide"
                        aria-label={strings.news_hide}
                        title={strings.news_hide}
                        onClick={(event) => hideFrom(event.currentTarget)}
                    >
                        <span
                            className="icon-no-margin"
                            aria-hidden="true"
                            dangerouslySetInnerHTML={{__html: config.icons.close}}
                        />
                        <span className="compass-news-pophidelabel">{strings.news_hide_short}</span>
                    </button>
                </div>
            </div>
        </>
    );

    /**
     * The grow-in wrapper every shape is drawn in, and the popover beside it: inside, the clip that makes
     * the line grow would cut the popover too, so it hangs from the anchor, under the line.
     *
     * @param {object} children The shape.
     * @returns {object} The wrapped shape.
     */
    const grow = (children: ReactNode) => (
        <div ref={anchor} className="compass-news-anchor">
            <div ref={wrap} className={grown ? 'compass-news-wrap compass-news-wrap-open' : 'compass-news-wrap'}>
                <div className="compass-news-inner">{children}</div>
            </div>
            {mode !== 'tiles' && pop}
            {tips && tip && anchor.current && (
                <GroupTip
                    group={tip.group}
                    pill={tip.pill}
                    anchor={anchor.current}
                    line={isOne(tip.group) ? tip.group.coursename ?? '' : kindsLine(strings, nouns, tip.group)}
                    onEnter={keepTip}
                    onLeave={leaveTip}
                />
            )}
        </div>
    );

    const icon = (
        <span className="compass-news-icon icon-no-margin" aria-hidden="true" dangerouslySetInnerHTML={{__html: news.icon}} />
    );

    /**
     * The close, in the corner of the panel: a cross and a short visible label, named in full for
     * assistive technology (the label is inside the name, WCAG 2.5.3). The slim panel draws the cross
     * alone; below 640 px of the block the stylesheet hides the label.
     *
     * @param {boolean} labelled Whether to draw the short label beside the cross.
     * @returns {object} The button.
     */
    const closer = (labelled: boolean) => (
        <button
            type="button"
            className={labelled ? 'compass-news-hide' : 'compass-news-hide compass-news-hide-icon'}
            aria-label={strings.news_hide}
            title={strings.news_hide}
            onClick={(event) => hideFrom(event.currentTarget)}
        >
            <span className="icon-no-margin" aria-hidden="true" dangerouslySetInnerHTML={{__html: config.icons.close}} />
            {labelled && <span className="compass-news-hidelabel">{strings.news_hide_short}</span>}
        </button>
    );

    if (mode === 'tiles') {
        const tileClasses = ['compass-news-tiles'];
        // Fewer tiles than tracks: each is as wide as its name needs, up to the row (styles.css).
        if (!narrow && answer.groups.length < TILE_TRACKS) {
            tileClasses.push('compass-news-tiles-few');
        }
        // The second line starts under the name, past the crest slot.
        if (withslots) {
            tileClasses.push('compass-news-tiles-slotted');
        }

        return grow(
            <section
                className={narrow ? 'compass-news compass-news-empty compass-news-narrow' : 'compass-news compass-news-empty'}
                aria-labelledby={titleid}
            >
                <Spark place="compass-news-spark-a" />
                <Spark place="compass-news-spark-c" />
                <div className="compass-news-head">
                    {icon}
                    <div className="compass-news-copy">
                        <Title id={titleid} className="compass-news-title h6 mb-0">{strings.news_title}</Title>
                        <span className="compass-news-sum">{fill(strings.news_empty_lead, until)}</span>
                    </div>
                </div>
                <ul className={tileClasses.join(' ')}>
                    {answer.groups.map((group) => {
                        const sub = secondLine(strings, nouns, group);

                        return (
                            <li key={group.categoryid}>
                                {/* A cut text's whole is in GroupTip, never in a title, as on the pill: a title would
                                    draw a second tooltip on the same hover. Below 640 px both wrap to two lines. */}
                                <a
                                    className="compass-news-tile"
                                    href={group.url}
                                    aria-label={groupLabel(strings, nouns, group)}
                                    onPointerEnter={tips ? (event) => hoverTip(group, event) : undefined}
                                    onPointerLeave={tips ? leaveTip : undefined}
                                    onFocus={tips ? (event) => focusTip(group, event) : undefined}
                                    onBlur={tips ? blurTip : undefined}
                                >
                                    <span className="compass-news-tiletop">
                                        {withslots && <CrestSlot group={group} />}
                                        <span className={narrow ? 'compass-news-tilename compass-clamp' : 'compass-news-tilename'}>
                                            {group.name}
                                        </span>
                                        <span className="compass-news-count">{group.count}</span>
                                    </span>
                                    {sub && (
                                        <span className={narrow ? 'compass-news-tilesub compass-clamp' : 'compass-news-tilesub'}>
                                            {sub}
                                        </span>
                                    )}
                                </a>
                            </li>
                        );
                    })}
                </ul>
                <p className="compass-news-foot"><a className="compass-news-all" href={answer.allurl}>{strings.news_all}</a></p>
            </section>
        );
    }

    if (mode === 'compact') {
        return grow(
            <section className="compass-news compass-news-compact" aria-labelledby={titleid}>
                <Spark place="compass-news-spark-b" />
                {icon}
                <div className="compass-news-sentence">
                    <Title id={titleid} className="compass-news-title h6 mb-0">{strings.news_title}</Title>
                    <span className="compass-news-sum">{summary}</span>
                </div>
                <button
                    type="button"
                    className="compass-news-see"
                    aria-haspopup="dialog"
                    aria-expanded={popover}
                    aria-controls={popover ? popid : undefined}
                    onClick={(event) => openFrom(event.currentTarget)}
                >
                    {strings.news_see}
                </button>
                {closer(false)}
            </section>
        );
    }

    const more = answer.groups.length - LINE_GROUPS;

    return grow(
        <section className={narrow ? 'compass-news compass-news-narrow' : 'compass-news'} aria-labelledby={titleid}>
            <Spark place="compass-news-spark-a" />
            <Spark place="compass-news-spark-b" />
            <Spark place="compass-news-spark-c" />
            <div className="compass-news-head">
                {icon}
                <div className="compass-news-copy">
                    <Title id={titleid} className="compass-news-title h6 mb-0">{strings.news_title}</Title>
                    <span className="compass-news-sum">{summary}</span>
                </div>
            </div>
            {closer(true)}
            <ul className="compass-news-groups">
                {answer.groups.slice(0, LINE_GROUPS).map((group) => (
                    <li key={group.categoryid} className="compass-news-groupitem">
                        {/* The name is cut, and its whole text is in GroupTip, never in a title (ADR-019 decision 3):
                            a title would draw a second tooltip on the same hover. Below 640 px it wraps to two lines. */}
                        <a
                            className={isOne(group) ? 'compass-news-group compass-news-group-one' : 'compass-news-group'}
                            href={group.url}
                            aria-label={groupLabel(strings, nouns, group)}
                            onPointerEnter={tips ? (event) => hoverTip(group, event) : undefined}
                            onPointerLeave={tips ? leaveTip : undefined}
                            onFocus={tips ? (event) => focusTip(group, event) : undefined}
                            onBlur={tips ? blurTip : undefined}
                        >
                            {group.crest && <span className="compass-news-crestbox"><img src={group.crest} alt="" /></span>}
                            {isOne(group) ? (
                                <span className={narrow ? 'compass-news-gname compass-clamp' : 'compass-news-gname'}>
                                    {group.name}
                                    <span className="compass-news-gsub">{` · ${group.coursename}`}</span>
                                </span>
                            ) : (
                                <>
                                    <span className={narrow ? 'compass-news-gname compass-clamp' : 'compass-news-gname'}>
                                        {group.name}
                                    </span>
                                    <span className="compass-news-count">{group.count}</span>
                                </>
                            )}
                        </a>
                    </li>
                ))}
                {more > 0 && (
                    <li>
                        <button
                            type="button"
                            className="compass-news-more"
                            aria-haspopup="dialog"
                            aria-expanded={popover}
                            aria-controls={popover ? popid : undefined}
                            onClick={(event) => openFrom(event.currentTarget)}
                        >
                            {fill(strings.news_more, String(more))}
                        </button>
                    </li>
                )}
            </ul>
        </section>
    );
};

export default OpenCourses;
