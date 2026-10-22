# Mockup: a deadline hours away (brainstorm, 2026-10-20)

The maintainer's question: the strip gives the horizon, but an item closing in a few hours deserves
more weight on entry, without making the block heavier. The sources under `project/` are the
artboards of a design canvas (`.dc.html`, canvas runtime only), drawn on
<https://claude.ai/artifact/LJzxxvJyAYsADzLwGTviXe> (private to the maintainer until shared).
The maintainer chose B plus A's ring on 2026-10-21: [ADR-016](../adr/016-up-next.md) (Proposed).

| Artboard | What it shows |
|---|---|
| `Main.dc.html` | Interactive: options A to D at four moments of the same Tuesday (08:00 calm, 15:00 two items under 6 h, 17:10 under 1 h, 18:05 a meeting on), tier 1 below, dark tweak. |
| `Escada.dc.html` | The urgency ladder (calm, soon ≤ 6 h, imminent ≤ 1 h, now, passed) for A, B and D, and the rules: what never enters, time and screen readers, weight. |
| `Ensinando.dc.html` | The teaching view: a session the teacher runs and grading due rise; the class's deadline is listed but capped at "soon". |
| `Celular.dc.html` | A and B at 390 px. |

## Options

- **A, the Today cell names the next item.** No new surface; the closed line's Today cell shows
  the next item's time, countdown and name. A button, so no direct action.
- **B, "Em seguida".** A row between the calendar and tier 1, drawn only while something is inside
  the horizon, at most two items with their own actions, hidden by the reader until the level rises.
  Works open or closed and for any course. The candidate recommendation, with A's ring on Today.
- **C, on the course card.** A time badge and an action on the tier 1 card. Misses every course
  tier 1 does not show (the meeting's course in the example).
- **D, today in the open strip.** A countdown ring on today's disc and the day docked under the
  row. Only for readers who keep the strip open; closed, it falls back to A.
- Set aside: a toast or a banner outside the block (out of the block's line, and UI injected into
  a core page is a theme's job), opening the strip by itself (overrides the reader's `open`).

## Facts the design rests on

- The closed line's counts are a cached upper bound for the future (`calendarstrip`, keyed to the
  sign-in, 30 min TTL): a learner who submitted still counts. The highlight must decide from core's
  answer for the event (`<mod>_core_calendar_provide_event_action`; null = submitted, attempted
  or closed), read fresh for the few candidates, never from the count.
- `DayItem` carries no duration: "now" for a meeting needs the event's `timeduration`.
- The timeline service is on the plugin's "what not to do" list; candidates come from the
  strip's own day machinery, asked only when Today (or tomorrow inside the horizon) counts
  something, so a calm day costs no request. Its read budget is still to be measured.

## Open questions for the maintainer

1. A, B, or B with A's ring? C and D as complements or not at all?
2. The horizon: fixed 6 h, an admin setting (off, 3, 6, 12 h), or "the rest of today"?
3. Should the reader be able to hide B, and should it come back when the level rises?
4. Teaching view: is "12 de 30 enviaram" on a class deadline worth a new count?
