var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * The calendar strip's arithmetic: days, the window, what a day shows and how much it weighs.
 *
 * Every date here is a Y-m-d string in the user's Moodle timezone, as the strip payload sends
 * them, and is handled as a UTC midnight: the server already bucketed the instants into local
 * days (classes/local/calendar/strip.php), so the client only counts calendar days, and a UTC
 * day is always 24 hours long. The browser's own clock and zone are never asked what today is.
 *
 * Dates and times are written in the site language from the strings the shell ships (month and
 * weekday names, the cal_format_* templates), never by Intl's own names; Intl is asked only for the
 * numbers of an instant in the user's timezone (timeParts()).
 *
 * @module     block_compass/calendar
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { fillObject } from "./str";
const DAY_MS = 864e5;
const LEARNING_KINDS = ["gradedsoon", "graded", "todo", "late", "event", "done"];
const TEACHING_KINDS = ["gradesoon", "grade", "class", "event"];
const OPEN_KINDS = ["gradedsoon", "graded", "todo", "late", "gradesoon", "grade"];
const MIN_WEIGHT = {
  gradedsoon: 4.5,
  graded: 1.5,
  todo: 1,
  late: 1,
  event: 0.5,
  done: 0,
  gradesoon: 3.5,
  grade: 1.5,
  "class": 0.5
};
const pad = /* @__PURE__ */ __name((value) => value < 10 ? `0${value}` : String(value), "pad");
const dayTime = /* @__PURE__ */ __name((date) => {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}, "dayTime");
const dayString = /* @__PURE__ */ __name((time) => {
  const moment = new Date(time);
  return `${moment.getUTCFullYear()}-${pad(moment.getUTCMonth() + 1)}-${pad(moment.getUTCDate())}`;
}, "dayString");
const addDays = /* @__PURE__ */ __name((date, days) => dayString(dayTime(date) + days * DAY_MS), "addDays");
const daysBetween = /* @__PURE__ */ __name((from, to) => Math.round((dayTime(to) - dayTime(from)) / DAY_MS), "daysBetween");
const windowDays = /* @__PURE__ */ __name((firstday, today) => {
  const [year, month] = today.split("-").map(Number);
  const last = Date.UTC(year, month + 1, 1) - DAY_MS;
  const days = [];
  for (let time = dayTime(firstday); time <= last; time += DAY_MS) {
    days.push(dayString(time));
  }
  return days;
}, "windowDays");
const DAY_PITCH_PX = 50;
const RING_PITCH_PX = 60;
const DAY_GAP_PX = 6;
const RING_GAP_PX = 12;
const EDGE_INSET_PX = 32;
const NARROW_INSET_PX = 4;
const NARROW_SHOWN = 7.5;
const NARROW_SHOWN_RING = 5.5;
const TARGET_PX = 44;
const DISC_PX = 36;
const PULSE_DISC_PX = 30;
const HOME_PAST = 5;
const NARROW_HOME_PAST = 3;
const MARK_SLOTS = 4;
const fit = /* @__PURE__ */ __name((width, narrow, style) => {
  const gap = style === "ring" ? RING_GAP_PX : DAY_GAP_PX;
  const inset = narrow ? NARROW_INSET_PX : EDGE_INSET_PX;
  let pitch = style === "ring" ? RING_PITCH_PX : DAY_PITCH_PX;
  if (narrow && width > 0) {
    pitch = Math.max(gap + 24, Math.floor((width - 2 * inset + gap) / (style === "ring" ? NARROW_SHOWN_RING : NARROW_SHOWN)));
  }
  const column = pitch - gap;
  const whole = width > 0 ? Math.max(1, Math.floor((width - 2 * inset + gap) / pitch)) : 1;
  return {
    pitch,
    gap,
    column,
    inset,
    target: Math.min(TARGET_PX, column),
    disc: Math.min(style === "pulse" ? PULSE_DISC_PX : DISC_PX, column),
    whole
  };
}, "fit");
const homeIndex = /* @__PURE__ */ __name((todayindex, narrow) => Math.max(0, todayindex - (narrow ? NARROW_HOME_PAST : HOME_PAST)), "homeIndex");
const stepOf = /* @__PURE__ */ __name((whole) => 7 * Math.max(1, Math.floor(whole / 7)), "stepOf");
const whollyInView = /* @__PURE__ */ __name((index, row, scroll, width) => {
  const start = row.inset + index * row.pitch - scroll;
  return start >= row.inset - 0.5 && start + row.column <= width - row.inset + 0.5;
}, "whollyInView");
const leastScroll = /* @__PURE__ */ __name((index, row, scroll, width) => {
  if (whollyInView(index, row, scroll, width)) {
    return scroll;
  }
  if (row.inset + index * row.pitch - scroll < row.inset) {
    return index * row.pitch;
  }
  return Math.max(0, (index - row.whole + 1) * row.pitch);
}, "leastScroll");
const PERIOD_KEYS = ["late", "today", "tomorrow", "week", "later"];
const WEEK_DAYS = 5;
const LEARNING_COUNTED = ["gradedsoon", "graded", "todo", "late", "event"];
const TEACHING_COUNTED_CORE = ["class", "event"];
const periodsOf = /* @__PURE__ */ __name((days, view, today, past, grading) => {
  const tomorrow = addDays(today, 1);
  const weekend = addDays(today, 1 + WEEK_DAYS);
  let kinds = LEARNING_COUNTED;
  let pastkinds = past ? ["late"] : [];
  if (view === "teaching") {
    kinds = grading ? TEACHING_KINDS : TEACHING_COUNTED_CORE;
    pastkinds = grading ? ["grade", "gradesoon"] : [];
  }
  const periods = /* @__PURE__ */ new Map();
  PERIOD_KEYS.forEach((key) => {
    if (key !== "late" || pastkinds.length > 0) {
      periods.set(key, { key, count: 0, step: 0, countstep: 0, courseids: [] });
    }
  });
  let waiting = 0;
  const waitingcourseids = [];
  days.forEach((day) => {
    let key = "later";
    if (day.date < today) {
      key = "late";
    } else if (day.date === today) {
      key = "today";
    } else if (day.date === tomorrow) {
      key = "tomorrow";
    } else if (day.date <= weekend) {
      key = "week";
    }
    if (grading && view === "teaching") {
      waiting += day.waiting ?? 0;
      (day.waitingcourseids ?? []).forEach((id) => {
        if (!waitingcourseids.includes(id)) {
          waitingcourseids.push(id);
        }
      });
    }
    const period = periods.get(key);
    if (!period) {
      return;
    }
    const count = (key === "late" ? pastkinds : kinds).reduce((sum, kind) => sum + (day[kind] ?? 0), 0);
    if (count === 0) {
      return;
    }
    period.count += count;
    period.step = Math.max(period.step, day.step);
    period.countstep = Math.max(period.countstep, day.countstep);
    day.courseids.forEach((id) => {
      if (!period.courseids.includes(id)) {
        period.courseids.push(id);
      }
    });
  });
  return { periods: Array.from(periods.values()), waiting, waitingcourseids, upcoming: [], events: [] };
}, "periodsOf");
const countsOf = /* @__PURE__ */ __name((payload, grading) => {
  const days = windowDays(payload.firstday, payload.today);
  return {
    enabled: payload.enabled,
    today: payload.today,
    lastday: days[days.length - 1],
    past: true,
    grading,
    truncated: payload.truncated,
    bounded: payload.bounded,
    haslearning: payload.haslearning,
    hasteaching: payload.hasteaching,
    views: {
      learning: {
        ...periodsOf(payload.views.learning.days, "learning", payload.today, true, grading),
        upcoming: payload.views.learning.upcoming,
        events: payload.views.learning.events
      },
      teaching: {
        ...periodsOf(payload.views.teaching.days, "teaching", payload.today, true, grading),
        upcoming: payload.views.teaching.upcoming,
        events: payload.views.teaching.events
      }
    },
    now: payload.now
  };
}, "countsOf");
const LEVEL_CALM = 0;
const LEVEL_SOON = 1;
const LEVEL_IMMINENT = 2;
const LEVEL_NOW = 3;
const LEVEL_PASSED = -1;
const IMMINENT_S = 3600;
const gateOpens = /* @__PURE__ */ __name((lists, now, horizon) => {
  if (horizon <= 0) {
    return false;
  }
  for (const time of lists.upcoming) {
    if (time >= now && time <= now + horizon) {
      return true;
    }
  }
  for (const [start, end] of lists.events) {
    if (start <= now + horizon && end > now) {
      return true;
    }
  }
  return false;
}, "gateOpens");
const gateNext = /* @__PURE__ */ __name((lists, now, horizon) => {
  if (horizon <= 0) {
    return null;
  }
  let next = null;
  for (const time of [...lists.upcoming, ...lists.events.map(([start]) => start)]) {
    const opens = time - horizon;
    if (opens > now && (next === null || opens < next)) {
      next = opens;
    }
  }
  return next;
}, "gateNext");
const ringClass = /* @__PURE__ */ __name((level) => {
  if (level === LEVEL_NOW) {
    return "compass-soon-ring-now";
  }
  return level === LEVEL_IMMINENT ? "compass-soon-ring-imminent" : "";
}, "ringClass");
const soonLevel = /* @__PURE__ */ __name((item, view, now, horizon) => {
  const lasts = item.kind === "event" && item.timeduration > 0;
  if (lasts && item.timestart <= now && now < item.timestart + item.timeduration) {
    return LEVEL_NOW;
  }
  if (item.timestart < now) {
    return LEVEL_PASSED;
  }
  if (item.timestart > now + horizon) {
    return LEVEL_CALM;
  }
  if (view === "teaching" && item.kind === "class") {
    return LEVEL_SOON;
  }
  return item.timestart - now <= IMMINENT_S ? LEVEL_IMMINENT : LEVEL_SOON;
}, "soonLevel");
const periodSpan = /* @__PURE__ */ __name((key, firstday, today, lastday) => {
  switch (key) {
    case "late":
      return [firstday, addDays(today, -1)];
    case "today":
      return [today, today];
    case "tomorrow":
      return [addDays(today, 1), addDays(today, 1)];
    case "week":
      return [addDays(today, 2), addDays(today, 1 + WEEK_DAYS)];
    default:
      return [addDays(today, 2 + WEEK_DAYS), lastday];
  }
}, "periodSpan");
const kindsOf = /* @__PURE__ */ __name((view) => view === "teaching" ? TEACHING_KINDS : LEARNING_KINDS, "kindsOf");
const shownKinds = /* @__PURE__ */ __name((view, filter) => {
  const kinds = kindsOf(view);
  if (filter === "events") {
    return ["event"];
  }
  if (filter === "todo") {
    return kinds.filter((kind) => kind !== "event" && kind !== "class");
  }
  return kinds;
}, "shownKinds");
const fromPayload = /* @__PURE__ */ __name((day, view) => {
  const counts = {};
  kindsOf(view).forEach((kind) => {
    counts[kind] = day ? day[kind] ?? 0 : 0;
  });
  return { counts, weight: day ? day.weight : 0, settled: false };
}, "fromPayload");
const settle = /* @__PURE__ */ __name((before, items, view) => {
  const counts = {};
  kindsOf(view).forEach((kind) => {
    counts[kind] = 0;
  });
  items.forEach((item) => {
    counts[item.kind] = (counts[item.kind] ?? 0) + 1;
  });
  const open = /* @__PURE__ */ __name((of) => kindsOf(view).filter((kind) => kind !== "event" && kind !== "class").reduce((sum, kind) => sum + (of[kind] ?? 0) * MIN_WEIGHT[kind], 0), "open");
  const informative = /* @__PURE__ */ __name((of) => ((of.event ?? 0) + (of.class ?? 0)) * MIN_WEIGHT.event, "informative");
  const openbefore = Math.max(0, before.weight - informative(before.counts));
  const minbefore = open(before.counts);
  const minafter = open(counts);
  const openafter = minbefore > 0 ? openbefore * (minafter / minbefore) : minafter;
  return { counts, weight: openafter + informative(counts), settled: true };
}, "settle");
const score = /* @__PURE__ */ __name((day, view, filter, relevance) => {
  const shown = shownKinds(view, filter);
  if (!relevance) {
    return shown.filter((kind) => kind !== "done").reduce((sum, kind) => sum + (day.counts[kind] ?? 0), 0);
  }
  const events = (day.counts.event ?? 0) * MIN_WEIGHT.event;
  const classes = (day.counts.class ?? 0) * MIN_WEIGHT.class;
  if (filter === "events") {
    return events;
  }
  if (filter === "todo") {
    return Math.max(0, day.weight - events - classes);
  }
  return day.weight;
}, "score");
const step = /* @__PURE__ */ __name((value, relevance) => {
  if (value <= 0) {
    return 0;
  }
  if (!relevance) {
    return Math.min(4, value);
  }
  if (value < 2) {
    return 1;
  }
  if (value < 4) {
    return 2;
  }
  return value < 8 ? 3 : 4;
}, "step");
const itemKinds = /* @__PURE__ */ __name((day, kinds) => {
  const list = [];
  kinds.forEach((kind) => {
    for (let at = 0; at < (day.counts[kind] ?? 0); at++) {
      list.push(kind);
    }
  });
  return list;
}, "itemKinds");
const MARK_PRIORITY = {
  learning: [["gradedsoon", "graded"], ["late"], ["todo"], ["event"], ["done"]],
  teaching: [["gradesoon", "grade"], ["class"], ["event"]]
};
const marks = /* @__PURE__ */ __name((day, kinds, view) => {
  const present = [];
  MARK_PRIORITY[view].forEach((group) => {
    const shown = group.find((kind) => kinds.includes(kind) && (day.counts[kind] ?? 0) > 0);
    if (shown) {
      present.push(shown);
    }
  });
  if (present.length <= MARK_SLOTS) {
    return { kinds: present, more: 0 };
  }
  return { kinds: present.slice(0, MARK_SLOTS - 1), more: present.length - (MARK_SLOTS - 1) };
}, "marks");
const sortItems = /* @__PURE__ */ __name((items, view) => {
  const order = kindsOf(view);
  return [...items].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.timestart - b.timestart);
}, "sortItems");
const MONTH_KEYS = [
  "cal_month_01",
  "cal_month_02",
  "cal_month_03",
  "cal_month_04",
  "cal_month_05",
  "cal_month_06",
  "cal_month_07",
  "cal_month_08",
  "cal_month_09",
  "cal_month_10",
  "cal_month_11",
  "cal_month_12"
];
const MONTH_SHORT_KEYS = [
  "cal_monthshort_01",
  "cal_monthshort_02",
  "cal_monthshort_03",
  "cal_monthshort_04",
  "cal_monthshort_05",
  "cal_monthshort_06",
  "cal_monthshort_07",
  "cal_monthshort_08",
  "cal_monthshort_09",
  "cal_monthshort_10",
  "cal_monthshort_11",
  "cal_monthshort_12"
];
const WEEKDAY_KEYS = [
  "cal_weekday_0",
  "cal_weekday_1",
  "cal_weekday_2",
  "cal_weekday_3",
  "cal_weekday_4",
  "cal_weekday_5",
  "cal_weekday_6"
];
const WEEKDAY_SHORT_KEYS = [
  "cal_weekdayshort_0",
  "cal_weekdayshort_1",
  "cal_weekdayshort_2",
  "cal_weekdayshort_3",
  "cal_weekdayshort_4",
  "cal_weekdayshort_5",
  "cal_weekdayshort_6"
];
const BOUND_KINDS = ["gradedsoon", "graded", "todo"];
const weekdayOf = /* @__PURE__ */ __name((year, month, day) => new Date(Date.UTC(year, month - 1, day)).getUTCDay(), "weekdayOf");
const dateParts = /* @__PURE__ */ __name((date) => {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day, weekday: weekdayOf(year, month, day) };
}, "dateParts");
const inWeekend = /* @__PURE__ */ __name((mask, weekday) => Math.floor(mask / 2 ** weekday) % 2 === 1, "inWeekend");
const dayOff = /* @__PURE__ */ __name((date, mask, special) => {
  if (special) {
    return { mark: special.type === "schoolday" ? "" : "holiday", special };
  }
  return { mark: inWeekend(mask, dateParts(date).weekday) ? "weekend" : "", special: null };
}, "dayOff");
const extractors = /* @__PURE__ */ new Map();
const extractor = /* @__PURE__ */ __name((timezone) => {
  const known = extractors.get(timezone);
  if (known) {
    return known;
  }
  const options = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23"
  };
  let made;
  try {
    made = new Intl.DateTimeFormat("en-US-u-nu-latn", { ...options, timeZone: timezone });
  } catch (e) {
    made = new Intl.DateTimeFormat("en-US-u-nu-latn", options);
  }
  extractors.set(timezone, made);
  return made;
}, "extractor");
const timeParts = /* @__PURE__ */ __name((time, timezone) => {
  const numbers = {};
  extractor(timezone).formatToParts(new Date(time * 1e3)).forEach((part) => {
    if (part.type !== "literal") {
      numbers[part.type] = Number(part.value);
    }
  });
  const { year, month, day } = numbers;
  return { year, month, day, weekday: weekdayOf(year, month, day), hour: numbers.hour % 24, minute: numbers.minute };
}, "timeParts");
const monthName = /* @__PURE__ */ __name((strings, month) => strings[MONTH_KEYS[month - 1]] ?? "", "monthName");
const monthShort = /* @__PURE__ */ __name((strings, month) => strings[MONTH_SHORT_KEYS[month - 1]] ?? "", "monthShort");
const monthYear = /* @__PURE__ */ __name((strings, month, year) => fillObject(strings.cal_format_monthyear, { month: monthName(strings, month), year: String(year) }), "monthYear");
const longDay = /* @__PURE__ */ __name((strings, parts) => fillObject(strings.cal_format_dayname, {
  weekday: strings[WEEKDAY_KEYS[parts.weekday]] ?? "",
  day: String(parts.day),
  month: monthName(strings, parts.month)
}), "longDay");
const shortWeekday = /* @__PURE__ */ __name((strings, parts) => strings[WEEKDAY_SHORT_KEYS[parts.weekday]] ?? "", "shortWeekday");
const dayMonth = /* @__PURE__ */ __name((strings, parts) => fillObject(strings.cal_format_daymonth, { day: String(parts.day), month: monthName(strings, parts.month) }), "dayMonth");
const clockTime = /* @__PURE__ */ __name((strings, parts) => {
  if (strings.cal_format_clock === "12") {
    return fillObject(strings.cal_format_time12, {
      hour: String(parts.hour % 12 || 12),
      minute: pad(parts.minute),
      ampm: parts.hour < 12 ? strings.cal_am : strings.cal_pm
    });
  }
  return fillObject(strings.cal_format_time24, { hour: pad(parts.hour), minute: pad(parts.minute) });
}, "clockTime");
export {
  BOUND_KINDS,
  DAY_PITCH_PX,
  EDGE_INSET_PX,
  IMMINENT_S,
  LEARNING_KINDS,
  LEVEL_CALM,
  LEVEL_IMMINENT,
  LEVEL_NOW,
  LEVEL_PASSED,
  LEVEL_SOON,
  MARK_SLOTS,
  OPEN_KINDS,
  PERIOD_KEYS,
  RING_PITCH_PX,
  TEACHING_KINDS,
  addDays,
  clockTime,
  countsOf,
  dateParts,
  dayMonth,
  dayOff,
  dayString,
  dayTime,
  daysBetween,
  fit,
  fromPayload,
  gateNext,
  gateOpens,
  homeIndex,
  inWeekend,
  itemKinds,
  kindsOf,
  leastScroll,
  longDay,
  marks,
  monthName,
  monthShort,
  monthYear,
  periodSpan,
  periodsOf,
  ringClass,
  score,
  settle,
  shortWeekday,
  shownKinds,
  soonLevel,
  sortItems,
  step,
  stepOf,
  timeParts,
  whollyInView,
  windowDays
};
//# sourceMappingURL=calendar.dev.js.map
