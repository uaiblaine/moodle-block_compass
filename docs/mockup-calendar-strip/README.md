# Mockup: the calendar strip (ADR-014)

The design behind [ADR-014](../adr/014-calendar-strip.md), kept as the sources of a
design canvas, not as a standalone page: each `.dc.html` file is one artboard in the
canvas's component format and needs the canvas runtime (`support.js`) to render. Open
them on the canvas they were drawn on:
<https://claude.ai/artifact/EdPDdzj7fxfgbdL9kGGHTC> (private to the maintainer until
shared). `canvas.json` is the canvas's index: artboard frames and order.

**To open them in a local browser**, use `html/index.html`. The pages in `html/` are generated from
the same `.dc.html` sources by `build_standalone.py`, which turns each template into Preact + htm
(loaded from cdn.jsdelivr.net, so the browser needs network access) and the artboard's tweaks into
a small floating panel. Re-run `python3 build_standalone.py` after editing an artboard.

| Artboard | What it shows |
|---|---|
| `Main.dc.html` | The Dashboard with the strip above Compass's real tier 1 strips (Continue where you left off, My favourites with the ghost; the cards as the block draws them), interactive. Loading is staged as decision 2 orders it: skeletons, then tier 1's cards, then the strip in its reserved place. The header carries the month between the arrows; the row opens centred on today, never goes further back, and reaches the end of next month. Hover card over the course cards, click to pin, Esc to close, the Everything / To do / Events filter, the relevance switch, a course card lighting its days and a day lighting its course cards, and a request log simulating the cached two-request model ("Simulate coming back to the page" shows the cache hit). Tweaks: strip style (dots 21 days, ring 15 days, pulse), dark theme, the request log, latency. |
| `Anatomy.dc.html` | The signals of a day, the kinds (graded, graded due soon, to do, late still open, event, done), the weights and steps, the same week by relevance and by count, every state a day can be in, and the three strip styles. |
| `Mobile.dc.html` | A phone: seven days, a tap opens the day as a bottom sheet. |
| `Settings.dc.html` | The admin settings page section the ADR proposes. |

The data is invented for the picture (five courses, 13 October 2026 as today). Token
values are Boost 5.2's, as in the earlier mockups; the activity icon colours are core's
`--activity<purpose>` custom properties.
