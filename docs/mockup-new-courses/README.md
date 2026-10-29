# Mockup: open courses the viewer can join (brainstorm, 2026-10-28)

The maintainer asked for a short datum in the block: the courses a viewer can enrol in, in a time
band, under a reference category. It is not a card. The click opens the course, or the category
page with the filter applied. The datum must not compete with the strip or the cards. Their own
idea was the calendar's closed line; mid-session they added that the course start date can be the
reference. The ADR draft is [ADR-017](../adr/017-open-courses-to-join.md) (Proposed); the evaluation is
`evaluation.md`.

The `.dc.html` files are design-canvas artboards, in the format of `docs/mockup-calendar-strip/`.
**To open them in a local browser, use `html/index.html`**: the pages there are generated from the
same sources by `build_standalone.py`, a copy of the strip's script with only its index title
changed. They load Preact and htm from cdn.jsdelivr.net, so the browser needs network access.
Re-run `python3 build_standalone.py` after editing an artboard.

| Artboard | What it shows |
|---|---|
| `Main.dc.html` | Interactive. Four placements (A in the calendar line, refuted; B a line of its own, recommended; C a pill in the block's head; D a plain link) in four situations: nothing due, work due, Up next showing, and a new account with no course. Clicking any part of the datum shows where it leads, with the URL. A side panel lists each option's requests and reads. Tweak: dark. |
| `Regras.dc.html` | The rules behind B. The funnel from the site's catalogue to six courses (what is shared, what is the viewer's). The start-date band with seven worked cases. Depth 1 against depth 2 on one category tree. Where each click leads, with and without a theme answering the hook. The weight rules (calm, busy, Up next, no course, calendar off, nothing counts). The cost table of A to D, the settings, and the strings in en and pt_br. |
| `Celular.dc.html` | Option B at 390 px: calm (the groups wrap under the title), busy (one muted line and a bottom sheet), and a new account (the empty state as tiles). |
| `Rodada2.dc.html` | Round 2 (2026-10-29), after the maintainer's look on m503b: the line as a panel of its own in the feedback_tracker hero's container (warm-to-accent gradient, soft border, radius 16, sparkles), the chips always on the second line with more room, the close in the corner where the hero's Collapse sits, the enrolment icon smaller in a tile of the same size, no uppercase labels. Today against the proposal, the slim busy state, the empty state, a 560 px block and a phone, and the anatomy. Tweaks: close with label or icon only, theme blue or feedback_tracker plum, dark. The maintainer chose the enrolment icon, the labelled close and theme blue (2026-10-29). |

The data is invented. Today is Wednesday 28 October 2026. The band runs from 21 October to
27 November, and six courses in three top-level categories are open to the viewer. Token values are
Boost's, as in the strip's mockups.
