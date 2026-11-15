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
 * One row of the tier 3 list view.
 *
 * A row registers itself with the details store when it mounts and stops when it goes: the
 * observer decides when the row is close enough to the viewport to be worth a request, and
 * the batch that answers brings progress, the image and the theme's crests.
 *
 * Every row is two lines of fixed height, at every width (ADR-026): the thumbnail spans both at
 * the row's start; the first line is the course's name, cut to one line with the whole name in
 * its title, and the controls (the star, the archive control) at its end; the second line holds
 * the qualifiers in the owner's order - the kind and New chips, the state label, Hidden from
 * students, one crest, the date, the progress bar, the teacher's "no completion" note - and never
 * wraps: what does not fit gives way (styles.css says in which order) or is clipped at its end.
 * The grid places the parts; the DOM keeps the reading order, the name's link first, then the
 * second line (nothing in it is focusable), then the controls, so the focus goes name, star,
 * archive, as the eye does on the first line.
 *
 * A row the learner cannot enter yet - an enrolment application awaiting a decision or on the
 * waiting list, or an enrolment that starts later - is a row like the others except where it
 * cannot be: its name links to the course's enrolment page, not into the course, the state label
 * on the second line says which situation it is in, and it has no star, no archive control and no
 * progress; the batch answers it with its image and crest only. It keeps the same two lines.
 *
 * Nothing that arrives with the batch moves the row or its controls: the two lines have a fixed
 * height and the controls their own cell, so the answer only fills the second line in - the
 * skeleton in the bar's place while the batch is out, then the bar, or the completed label and
 * no bar, which reserves no width.
 *
 * The row is the course card contract's list surface (moodle-dev/docs/course-card/CONTRACT.md, section 1):
 * once complete, the bar goes and the state label is the green seal (D4). Boost Union's settings (CardFlags)
 * take the thumbnail away (a 4 px inline-start edge instead, green once complete) and the progress bar.
 * Slot 2, the course's kind and then New, both the light chip (ADR-021 decision 2.6), leads the second line;
 * a course hidden from students says so beside the state label wherever it sits among visible ones
 * (decision 1.8).
 *
 * @module     block_compass/Row
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {memo, useEffect, useRef} from 'react';
import Archive from './Archive';
import {isComplete} from './Card';
import Crests from './Crests';
import Progress from './Progress';
import Star from './Star';
import StatePill, {InvisiblePill} from './StatePill';
import {isEnrolled, relativeTime} from './filter';
import {fill} from './str';
import type {BlockConfig, InventoryRow, RowDetail, RowKind} from './types';

type RowProps = {
    row: InventoryRow,
    config: BlockConfig,
    now: number,
    lang: string,
    detail: RowDetail | undefined,
    waiting: boolean,
    observe: (id: number, element: Element) => () => void,
    kinds: RowKind[],
    markhidden: boolean,
    archived: boolean,
    onArchive: (courseid: number, name: string, archived: boolean) => void,
    onToggleFavourite: (courseid: number, favourite: boolean, fullname: string) => Promise<void>,
    busy: boolean,
};

/**
 * The row.
 *
 * @param {object} props The row, the block config, the instant "ago" is measured from,
 *     the page language, what is known about the row, how to register it, the kinds its kd
 *     indexes, whether a hidden row says so here, and the archive and star actions; see RowProps.
 * @returns {object} The rendered row.
 */
// A component's render branches all count toward its complexity; splitting it into smaller components is
// a refactor of its own, so the count is acknowledged here.
// eslint-disable-next-line complexity
const Row = ({
    row, config, now, lang, detail, waiting, observe, kinds, markhidden, archived, onArchive, onToggleFavourite, busy,
}: RowProps) => {
    const {labels} = config;
    const opened = row.opened || 0;
    const enrolled = isEnrolled(row);
    // The enrolment page takes the course id (enrol/index.php:28,43), so both URLs are a function
    // of the one integer every row carries and nothing travels for the link.
    const url = enrolled
        ? `${window.M.cfg.wwwroot}/course/view.php?id=${row.id}`
        : `${window.M.cfg.wwwroot}/enrol/index.php?id=${row.id}`;
    const element = useRef<HTMLDivElement>(null);

    // Registration belongs to the row rather than to whatever produced it: first render,
    // an appended page or a search hit all arrive here, and all register the same way.
    useEffect(() => {
        const node = element.current;
        if (!node) {
            return undefined;
        }

        return observe(row.id, node);
    }, [observe, row.id]);

    const answered = enrolled && !waiting && detail !== undefined;
    const complete = answered && isComplete(detail.progress);
    const nothumb = !config.card.thumb;
    let thumb = <span className="compass-row-thumb-fill compass-card-img-empty"></span>;
    if (waiting) {
        thumb = <span className="compass-row-thumb-fill compass-skeleton"></span>;
    } else if (detail?.hasimage) {
        thumb = <img className="compass-row-thumb-fill" src={detail.imageurl} alt="" loading="lazy" />;
    }
    // An application says when access comes; an enrolment that starts later says it in its pill.
    let meta: string | null = null;
    if (row.pend) {
        meta = labels.pendingmeta;
    } else if (enrolled) {
        meta = opened > 0 ? fill(labels.lastopened, relativeTime(opened, now, lang)) : labels.neveropened;
    }
    // The course's kind (ADR-021 decision 2): none without a listener, none for the default kind, none for an
    // index the held list does not have.
    const kind: RowKind | undefined = row.kd === undefined ? undefined : kinds[row.kd];

    return (
        <div
            className={`compass-row${enrolled ? '' : ' compass-row-pending'}`
                + `${nothumb ? ' compass-row-nothumb' : ''}${complete ? ' compass-row-done' : ''}`}
            data-course-id={row.id}
            ref={element}
        >
            {/* The image is the name's decoration: the link already says which course this is. */}
            {!nothumb && <span className="compass-row-thumb" aria-hidden="true">{thumb}</span>}
            {/* The first line: the name, one line, the whole of it in the title. */}
            <a href={url} className="compass-row-link text-reset text-decoration-none">
                <span className="compass-row-name" title={row.name}>{row.name}</span>
            </a>
            {/* The second line, in the owner's order (ADR-026): slot 2 of the course card contract first, the kind and
                then New, each the light chip with the card's border (styles.css), its word in the title since a narrow
                line cuts it; then the state label, Hidden from students, one crest, the date, the progress bar and the
                teacher's note. Nothing here is focusable. */}
            <div className="compass-row-line">
                {kind !== undefined && (
                    <span className="compass-card-kind compass-row-chip" title={kind.name}>{kind.name}</span>
                )}
                {row.new && <span className="compass-card-kind compass-row-chip" title={labels.badge_new}>{labels.badge_new}</span>}
                <StatePill row={row} labels={labels} complete={complete} />
                {markhidden && row.invis && <InvisiblePill label={labels.hiddenfromstudents} />}
                <Crests badges={detail?.badges} label={labels.crests} inline />
                {meta !== null && <span className="compass-row-meta small text-muted" title={meta}>{meta}</span>}
                {/* The bar's place, only while it holds something: the skeleton while the batch is out, then the rule
                    of Card.tsx completion() - the bar for a known percentage below 100. A completed course draws its
                    label and no bar, and nothing keeps the bar's width for it; nor for a course with no progress yet,
                    or a failed batch. "No completion configured" goes to a teacher only. */}
                {enrolled && row.comp && config.card.progress && waiting && (
                    <div className="compass-row-progress">
                        <span className="compass-skeleton compass-skeleton-progress" aria-hidden="true"></span>
                    </div>
                )}
                {enrolled && row.comp && config.card.progress && answered && !complete && detail.hascompletion
                    && detail.progress !== null && (
                    <div className="compass-row-progress">
                        <Progress progress={detail.progress} labels={labels} compact />
                    </div>
                )}
                {answered && !detail.hascompletion && detail.teacher && (
                    <span className="compass-row-nocompletion small text-muted" title={labels.nocompletion}>
                        {labels.nocompletion}
                    </span>
                )}
            </div>
            {/* The controls, at the first line's end: the star that toggles, beside the archive control. A row with
                neither keeps its two lines. */}
            {enrolled && (
                <span className="compass-row-controls">
                    {config.favouritesenabled && (
                        <Star
                            courseid={row.id}
                            fullname={row.name}
                            favourite={row.fav}
                            config={config}
                            onToggle={onToggleFavourite}
                        />
                    )}
                    <Archive
                        courseid={row.id}
                        name={row.name}
                        archived={archived}
                        busy={busy}
                        config={config}
                        onArchive={onArchive}
                    />
                </span>
            )}
        </div>
    );
};

// Memoised: tier 3 renders every row it holds on each of its renders, and a keystroke or a batch of details
// changes the props of a few rows at most (docs/performance-audit/PLAN.md, item 2).
export default memo(Row);
