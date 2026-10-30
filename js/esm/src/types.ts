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
 * The shapes the server sends and the shell exports.
 *
 * These mirror the return structures declared in classes/external/ and the array
 * classes/output/block.php builds, and must be kept in step with them by hand: the type
 * check holds the client to these types, but nothing checks the types against the PHP.
 *
 * @module     block_compass/types
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * One of a course's institutional crests, from the \block_compass\hook\course_badges hook,
 * answered by a theme such as theme_dimensions.
 *
 * The URL carries the file's content hash and the alternative text is the theme's; Compass
 * builds neither. A course without crests carries no badges key at all.
 */
export type Crest = {
    url: string,
    alt: string,
};

/** One tier 1 card, as block_compass_get_attention returns it. */
export type CourseCard = {
    id: number,
    fullname: string,
    shortname: string,
    url: string,
    imageurl: string,
    hasimage: boolean,
    category: string,
    hascompletion: boolean,
    progress: number | null,
    pending: boolean,
    iscomplete: boolean,
    isfavourite: boolean,
    isnew: boolean,
    lastaccess: number | null,
    lastaccesstext: string,
    enrolmethod: string,
    enrolledtext: string,
    deadline: number | null,
    deadlinetext: string,
    actiontext: string,
    // Present only on a Starts-soon card: the date its enrolment starts, already formatted for the
    // reader, the value a tier 3 row ships as sched, so StatePill reads both.
    sched?: string,
    // Present, and true, only when completion is off and the viewer is not a learner of the
    // course: the one reader "No completion configured" is said to.
    teacher?: boolean,
    badges?: Crest[],
};

/**
 * The counts that decide the ghost card, the strip overflow links and the pending notice.
 *
 * scheduled counts the courses whose enrolment starts later, which total never includes: they
 * are not active, and the ghost stands for active courses only.
 */
export type Counts = {
    total: number,
    shown: number,
    more: number,
    newmore: number,
    favouritesmore: number,
    pending: number,
    scheduled: number,
    scheduledmore: number,
};

/** The whole tier 1 payload. */
export type Attention = {
    continue: CourseCard[],
    new: CourseCard[],
    favourites: CourseCard[],
    // The Starts-soon strip: enrolments that start later, soonest first.
    scheduled: CourseCard[],
    counts: Counts,
    favouritesenabled: boolean,
};

/** Progress and image for one course, from block_compass_get_card_details. */
export type CardDetail = {
    id: number,
    hascompletion: boolean,
    progress: number | null,
    teacher?: boolean,
    imageurl: string,
    hasimage: boolean,
    badges?: Crest[],
};

/**
 * What a tier 3 row learns once it has been seen.
 *
 * The same batch answers both views, image included, so switching between them costs no
 * request: a row filled while the list was showing is a card the moment the cards are.
 */
export type RowDetail = {
    hascompletion: boolean,
    progress: number | null,
    teacher?: boolean,
    imageurl: string,
    hasimage: boolean,
    badges?: Crest[],
};

/** Which attempt the repository's bounded retry is on. */
export type Reconnecting = {attempt: number, attempts: number};

/**
 * A star toggled in tier 1, handed to tier 3 so that the rows it holds for the course agree.
 *
 * A new object per toggle, so that one repeating the previous toggle's values is still applied:
 * tier 3's own star may have changed the row in between.
 */
export type StarChange = {courseid: number, favourite: boolean};

/**
 * Tier 3's toolbar as it is now, kept by Block across a reload's remount, and the JSON of the
 * state last read from or written to the preference, so the remounted Explore neither reverts
 * a change nor writes a state that is already stored.
 */
export type KeptToolbar = {explore: ExploreState, view: string, remembered: string};

/**
 * The tier 3 filter line as the viewer left it (ADR-015): the shell reads the block_compass_explore
 * preference, validates its shape - migrating a chip stored before the line to a scope and a star -
 * and ships the survivors. Whether a field in cf is still configured is decided when the
 * inventory's fields array arrives.
 */
export type ExploreState = {
    sort: string,
    scope: string,
    star: boolean,
    cf: Record<string, number>,
    panel: boolean,
};

/** One strip of tier 1: its payload key and its heading. */
export type Strip = {
    name: 'continue' | 'new' | 'favourites' | 'scheduled',
    title: string,
};

/**
 * Everything the shell hands the client, as one props object.
 *
 * Labels are resolved in PHP and shipped whole because there is no core/str for ESM: a
 * string the client needs is a key here or it does not exist. Icons are server-rendered
 * markup for the same reason - there is no pix helper either.
 */
export type BlockConfig = {
    labels: Record<string, string>,
    icons: {
        staron: string,
        staroff: string,
        archive: string,
        unarchive: string,
        list: string,
        grid: string,
        filter: string,
        search: string,
        eraser: string,
        close: string,
        organise: string,
        expanded: string,
        collapsed: string,
        collapsedrtl: string,
    },
    strips: Strip[],
    favouritesenabled: boolean,
    pendingenabled: boolean,
    showsearch: boolean,
    showindex: boolean,
    showcategory: boolean,
    // Where the block is, as a heading level for its sections: 4 under core's block title, 3
    // with the title hidden, 2 on the block's own page under its h1. See heading.ts.
    headinglevel: number,
    view: string,
    explore: ExploreState,
    // Present only where the calendar strip renders (ADR-014 decision 1): absent when the setting
    // is off or calendar_where leaves this surface out, and then nothing is mounted.
    calendar?: CalendarConfig,
    // Present only while news_enabled is on (ADR-017 decision 1): absent, nothing is mounted or asked.
    news?: NewsConfig,
    // Tier 1's place while get_attention travels (ADR-018): the surface, the stored shapes and the skeleton.
    tier1: Tier1Config,
};

/** One remembered strip: its name, how many cards it drew and whether any drew a completion area. */
export type Tier1Strip = [Strip['name'], number, boolean];

/**
 * Tier 1's shape on one surface, as classes/local/tier1_preference.php validates it and tier1shape.ts writes
 * it: its strips with cards, in the shell's order; whether the tier 2 ghost showed; whether the pending notice
 * under New enrolments showed.
 */
export type Tier1Shape = {strips: Tier1Strip[], ghost: boolean, pending: boolean};

/** One skeleton strip (classes/output/block.php skeleton_strip(), without the template's card list). */
export type SkeletonStrip = {
    hastitle: boolean,
    title: string,
    count: number,
    // Starts soon: a state pill and no action on its cards.
    later: boolean,
    completion: boolean,
    // Whether the ghost closes its grid.
    closing: boolean,
    // The fallback's grid, one row at any column count.
    onerow: boolean,
};

/** Tier 1's skeleton, the one the template draws (templates/tier1_skeleton.mustache); see Tier1Skeleton.tsx. */
export type SkeletonModel = {
    slots: {strip: SkeletonStrip | null, note: boolean}[],
    ghostalone: boolean,
    empty: boolean,
    category: boolean,
};

/**
 * What the shell ships for tier 1's place (ADR-018): where the block is, the validated shape of every surface
 * (the client compares what it settles to with its own surface's and carries the other's in a write), and the
 * skeleton drawn while the answer travels.
 */
export type Tier1Config = {
    surface: 'dashboard' | 'page',
    shapes: Record<string, Tier1Shape | null>,
    skeleton: SkeletonModel,
};

/** The two views of the strip (decision 11): the courses the viewer is graded in, and the rest. */
export type CalendarView = 'learning' | 'teaching';

/** What the strip and a day's card list: everything, only what is to do, or only events. */
export type CalendarFilter = 'all' | 'todo' | 'events';

/**
 * The strip as the viewer left it, validated by classes/local/calendar_preference.php: open is the
 * row of days, closed the line of counts (ADR-014 amendment 11).
 */
export type CalendarState = {
    view: CalendarView,
    filter: CalendarFilter,
    relevance: boolean,
    open: boolean,
    // Up next hidden by the viewer (ADR-016 decision 7), carried along by every write of the preference
    // so a toggle never drops it; absent when it is not hidden. JSON.stringify leaves an undefined out.
    soon?: SoonMember,
    // The open-courses line hidden by the viewer (ADR-017 decision 9), carried along the same way.
    news?: NewsMember,
};

/** The open-courses line hidden: the sign-in it holds for, as calendar_preference::news() validates it. */
export type NewsMember = {signin: number};

/**
 * Up next hidden: the level it was hidden at (1 soon, 2 imminent, 3 now) and the sign-in it holds for,
 * as calendar_preference::soon() validates it on read.
 */
export type SoonMember = {rank: number, signin: number};

/**
 * Up next's part of the calendar props: the horizon in hours (calendar_soon; 0 is off, and then nothing
 * is asked), the rank the viewer hid it at during this sign-in or null, and the sign-in marker a hide is
 * written with.
 */
export type SoonConfig = {hours: number, rank: number | null, signin: number};

/**
 * The calendar strip's part of the shell's props (classes/output/block.php, calendar()).
 *
 * Its strings travel here rather than among the block's labels, so a site with the strip off
 * ships none of them; they include the month and weekday names and the date and time templates
 * every date is written with, in the site language. The timezone is the user's Moodle one, in which
 * the client reads an instant's numbers: the browser's own zone may differ.
 */
export type CalendarConfig = {
    style: 'dots' | 'ring' | 'pulse',
    relevance: boolean,
    state: CalendarState,
    // Whether the closed line counts grading work: only with block_feedback_tracker's ledger as the source.
    grading: boolean,
    url: string,
    dayurl: string,
    timezone: string,
    bound: number,
    daylimit: number,
    soon: SoonConfig,
    // Core's own glyphs, rendered by the shell with an empty alt (aria-hidden): the arrows' chevrons,
    // the calendar link's glyph and the two views' glyphs.
    icons: {prev: string, next: string, calendar: string, learning: string, teaching: string},
    strings: Record<string, string>,
};

/**
 * The open-courses line's part of the shell's props (classes/output/block.php, news()).
 *
 * signin is the marker the line was hidden under during this sign-in, 0 when it shows; marker is this
 * sign-in's own, which the hide writes. Its strings travel here rather than among the block's labels;
 * without the calendar's props they carry the date strings too, and state and soon are the calendar's
 * stored members, which a hide writes back.
 */
export type NewsConfig = {
    enabled: boolean,
    signin: number,
    marker: number,
    // Core's glyph, rendered by the shell with an empty alt (aria-hidden).
    icon: string,
    strings: Record<string, string>,
    state?: CalendarState,
    soon?: SoonMember | null,
};

/**
 * One group of block_compass_get_news: a reference category, its formatted name and its count; for a
 * group of one, the course and its formatted name (courseid 0 and an empty name otherwise). The url is
 * the course's enrolment page for a group of one, else the category's (the block's hook decides).
 */
export type NewsGroup = {
    categoryid: number,
    name: string,
    count: number,
    url: string,
    courseid?: number,
    coursename?: string,
};

/**
 * The whole block_compass_get_news answer (ADR-017 decision 5): the band's two days (Y-m-d, site
 * timezone), the courses counted, the groups before the cut, whether the probe was cut, at most twenty
 * groups and the link to every course open for enrolment.
 */
export type NewsAnswer = {
    from: string,
    to: string,
    total: number,
    groupcount: number,
    truncated: boolean,
    groups: NewsGroup[],
    allurl: string,
};

/**
 * What the calendar strip tells the block for the open-courses line's weight (ADR-017 decision 7), read
 * from what it holds and never asked for: whether its counts have settled (answered or failed), whether
 * Up next's first reading is over too, whether the drawn view counts work late, today or tomorrow, and
 * whether Up next is showing.
 */
export type StripWeight = {
    counted: boolean,
    weighed: boolean,
    busy: boolean,
    upnext: boolean,
};

/** Every kind a day counts, in either view (strip::KINDS and strip::TEACHING_KINDS). */
export type CalendarKind = 'gradedsoon' | 'graded' | 'todo' | 'late' | 'event' | 'done' | 'gradesoon' | 'grade' | 'class';

/**
 * One day of one view, as block_compass_get_strip lists it: only days with an item travel.
 *
 * The kind counters are the view's (the learning kinds or the teaching ones); waiting and
 * waitingcourseids (the courses of that day's grading work alone) are the teaching view's.
 */
export type StripDay = Partial<Record<CalendarKind, number>> & {
    date: string,
    waiting?: number,
    weight: number,
    step: number,
    countstep: number,
    courseids: number[],
    waitingcourseids?: number[],
};

/**
 * Up next's gate for one view (ADR-016 decision 3): the deadline times of today and tomorrow, and the
 * events not over as [start, end] pairs, both sorted, Unix times. An upper bound, like the counts.
 */
export type GateLists = {
    upcoming: number[],
    events: [number, number][],
};

/** One view of the strip payload, with its gate lists. */
export type StripView = GateLists & {
    days: StripDay[],
    needle: string | null,
};

/**
 * A day the institution's calendar marks (block_feedback_tracker, ADR-014 amendment 10): a day off
 * (holiday, recess, closed, optional) or a school day that falls on a weekend and cancels its mark.
 * The label is the type in that plugin's words, the note the institution's, both formatted text.
 */
export type SpecialDay = {
    date: string,
    type: 'holiday' | 'recess' | 'closed' | 'optional' | 'schoolday',
    label: string,
    note: string,
};

/** The whole block_compass_get_strip answer. */
export type StripPayload = {
    enabled: boolean,
    firstday: string,
    today: string,
    from: number,
    to: number,
    truncated: boolean,
    bounded: boolean,
    haslearning: boolean,
    hasteaching: boolean,
    views: {learning: StripView, teaching: StripView},
    // Weekend days as core's mask: bit i for weekday i, 0 = Sunday.
    weekend: number,
    specialdays: SpecialDay[],
    // The server's clock when it answered, Unix time: the client's offset for the gate.
    now: number,
};

/** A period of the closed strip (amendment 11): late, today, tomorrow, the rest of the week, later. */
export type PeriodKey = 'late' | 'today' | 'tomorrow' | 'week' | 'later';

/**
 * What a press on the closed line opens the strip on: a period's days, or, from the teaching view's
 * grading cell, the days with grading work.
 */
export type LineTarget = PeriodKey | 'grading';

/** One period's plain count, the heat of its busiest day and the courses it counts. */
export type Period = {
    key: PeriodKey,
    count: number,
    step: number,
    countstep: number,
    courseids: number[],
};

/**
 * One view of the closed strip: its periods in order, the unknown ones absent, the submissions waiting
 * and the courses they wait in (both empty unless grading is counted).
 */
export type PeriodView = GateLists & {
    periods: Period[],
    waiting: number,
    waitingcourseids: number[],
};

/**
 * The closed strip's counts: block_compass_get_strip_counts's answer, or the same shape summed in the
 * browser from an open strip's payload (calendar.ts, periodsOf()).
 */
export type StripCounts = {
    enabled: boolean,
    today: string,
    lastday: string,
    // The past is counted, so the learning view's Late period is known.
    past: boolean,
    // The teaching view counts grading work.
    grading: boolean,
    truncated: boolean,
    bounded: boolean,
    haslearning: boolean,
    hasteaching: boolean,
    views: {learning: PeriodView, teaching: PeriodView},
    // The server's clock when it answered, Unix time: the client's offset for the gate.
    now: number,
};

/** Core's action for an event, as the Timeline shows it. */
export type DayAction = {
    name: string,
    url: string,
    itemcount: number,
    actionable: boolean,
};

/**
 * One item of a day, as block_compass_get_day returns it (day::ALLOWLIST).
 *
 * formattedtime is core's rendered humantimeperiod, and the client does not inject it: the
 * time is formatted from timestart instead (CalendarCard.tsx says why).
 */
export type DayItem = {
    id: number,
    name: string,
    courseid: number,
    courseshortname: string,
    modulename: string,
    purpose: string,
    iconurl: string,
    timestart: number,
    // Seconds; 0 for an instant such as a deadline (ADR-016 decision 4).
    timeduration: number,
    formattedtime: string,
    viewurl: string,
    action: DayAction | null,
    kind: CalendarKind,
    graded: boolean,
    gradedsoon: boolean,
    criterion: boolean,
    lateuntil: number,
    starred: boolean,
};

/**
 * The whole block_compass_get_soon answer (ADR-016 decision 4): at most ten open items in time order,
 * the range's further open items, the view's pruned gate lists, the server's clock and the horizon in
 * seconds (0 when the calendar or Up next is off).
 */
export type SoonAnswer = GateLists & {
    now: number,
    horizon: number,
    view: CalendarView,
    items: DayItem[],
    more: number,
    truncated: boolean,
};

/** The whole block_compass_get_day answer. */
export type DayAnswer = {
    date: string,
    view: CalendarView,
    items: DayItem[],
    truncated: boolean,
};

/**
 * The two group ids that are not categories; dormancy::GROUP_DORMANT and GROUP_ARCHIVED in PHP.
 *
 * Negative on purpose: every other group id in the payload is a category id. The dormant
 * group is a re-grouping of rows the browser already holds; the archived group is a header
 * whose rows never travel in the first payload and arrive on first open, in both modes.
 */
export const GROUP_DORMANT = -1;
export const GROUP_ARCHIVED = -2;

/**
 * One tier 3 row, as get_inventory and its two paging services return it.
 *
 * pend is present, and true, only on an enrolment application awaiting approval or on the
 * waiting list, and wait beside it only on the waiting list; sched is present only on an
 * enrolment that starts later, as its start date already formatted for the reader; comp is
 * present, and true, only when get_card_details will answer hascompletion true for the course,
 * so a row keeps the room for its progress before the answer lands; cf is present only when the
 * row holds a custom-field value, as a flat list read in pairs — the field's index in the
 * payload's fields array, then the value key. All five are omitted rather than sent false or
 * empty, because omission costs nothing on the wire.
 */
export type InventoryRow = {
    id: number,
    name: string,
    opened: number | null,
    new: boolean,
    fav: boolean,
    dorm: boolean,
    pend?: boolean,
    wait?: boolean,
    sched?: string,
    comp?: boolean,
    cf?: number[],
};

/** One chip of a custom-field group: the stored value key and its label. */
export type FilterValue = {
    key: number,
    label: string,
};

/** One custom-field chip group, as get_inventory's fields array names it. */
export type FilterField = {
    key: string,
    label: string,
    values: FilterValue[],
};

/** One custom-field filter as the two paging services take it. */
export type FilterParam = {
    field: string,
    value: number,
};

/** A search hit is a row that also says which group it belongs to. */
export type SearchRow = InventoryRow & {groupid: number};

/** One group of tier 3. `courses` is empty in paged mode, and for the archived group in both modes. */
export type InventoryGroup = {
    id: number,
    name: string,
    count: number,
    courses: InventoryRow[],
};

/** The whole tier 3 payload. */
export type Inventory = {
    total: number,
    mode: 'full' | 'paged',
    fields: FilterField[],
    groups: InventoryGroup[],
};

/** One page of one group, in paged mode. */
export type RowPage = {
    groupid: number,
    rows: InventoryRow[],
    hasmore: boolean,
    after: number,
};

/** What the server-side search answers. */
export type SearchHits = {
    rows: SearchRow[],
    truncated: boolean,
};

