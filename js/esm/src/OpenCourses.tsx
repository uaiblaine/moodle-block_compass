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
 * @module     block_compass/OpenCourses
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import type {FocusEvent, KeyboardEvent, ReactNode} from 'react';
import RetryNotice from './RetryNotice';
import {dateParts, dayMonth} from './calendar';
import {heldNews, putBackCalendarPreference, writeCalendarPreference} from './calendarpref';
import {sectionTag} from './heading';
import {notify} from './notify';
import {hold} from './pending';
import {getNews} from './repository';
import {fill, fillObject} from './str';
import type {BlockConfig, NewsAnswer, NewsConfig, NewsGroup} from './types';

/** The groups the full line draws as links; the rest are behind "+N". */
const LINE_GROUPS = 3;

/** Below this width of the block, in CSS px, the line wraps under its title and the popover is a bottom sheet. */
export const NEWS_NARROW_PX = 640;

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
 * A group's accessible name when it holds several courses: a sentence that starts with what is visible.
 *
 * @param {object} strings The line's strings.
 * @param {object} group The group.
 * @returns {string|undefined} The name, or undefined for a group of one, whose visible text names it.
 */
const groupLabel = (strings: Record<string, string>, group: NewsGroup): string | undefined =>
    (isOne(group) ? undefined : fillObject(strings.news_group_label, {name: group.name, count: String(group.count)}));

/**
 * The summary: "6 courses start by 27 November", the singular for one.
 *
 * @param {object} strings The line's strings.
 * @param {number} total The courses counted.
 * @param {string} until The band's last day, written.
 * @returns {string} The summary.
 */
const summaryOf = (strings: Record<string, string>, total: number, until: string): string =>
    (total === 1
        ? fillObject(strings.news_summary_one, {until})
        : fillObject(strings.news_summary, {count: String(total), until}));

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

    useLayoutEffect(() => {
        if (!shown) {
            setGrown(false);
            setPopover(false);
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
    const summary = summaryOf(strings, answer.total, until);

    /**
     * Open the popover from a control.
     *
     * @param {object} control The button pressed.
     * @returns {void}
     */
    const openFrom = (control: HTMLButtonElement): void => {
        opener.current = control;
        setPopover((current) => !current);
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
                    {answer.groups.map((group) => (
                        <li key={group.categoryid}>
                            <a className="compass-news-poprow" href={group.url} aria-label={groupLabel(strings, group)}>
                                <span className="compass-news-popname">
                                    <span className="compass-news-popcat" title={group.name}>{group.name}</span>
                                    {isOne(group) && (
                                        <span className="compass-news-popsub" title={group.coursename}>{group.coursename}</span>
                                    )}
                                </span>
                                <span className="compass-news-count">{group.count}</span>
                            </a>
                        </li>
                    ))}
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
        <div className="compass-news-anchor">
            <div ref={wrap} className={grown ? 'compass-news-wrap compass-news-wrap-open' : 'compass-news-wrap'}>
                <div className="compass-news-inner">{children}</div>
            </div>
            {mode !== 'tiles' && pop}
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
                <ul className="compass-news-tiles">
                    {answer.groups.map((group) => (
                        <li key={group.categoryid}>
                            <a className="compass-news-tile" href={group.url} aria-label={groupLabel(strings, group)}>
                                <span className="compass-news-tiletop">
                                    <span className="compass-news-tilename" title={group.name}>{group.name}</span>
                                    <span className="compass-news-count">{group.count}</span>
                                </span>
                                {isOne(group) && (
                                    <span className="compass-news-tilesub" title={group.coursename}>{group.coursename}</span>
                                )}
                            </a>
                        </li>
                    ))}
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
                    <li key={group.categoryid}>
                        <a
                            className={isOne(group) ? 'compass-news-group compass-news-group-one' : 'compass-news-group'}
                            href={group.url}
                            aria-label={groupLabel(strings, group)}
                        >
                            {isOne(group) ? (
                                <span className="compass-news-gname" title={`${group.name} · ${group.coursename}`}>
                                    {group.name}
                                    <span className="compass-news-gsub">{` · ${group.coursename}`}</span>
                                </span>
                            ) : (
                                <>
                                    <span className="compass-news-gname" title={group.name}>{group.name}</span>
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
