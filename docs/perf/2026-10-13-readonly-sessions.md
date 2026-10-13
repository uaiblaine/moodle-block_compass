# Read-only sessions for the five read services (2026-10-13)

Version 2026101300 declares `'readonlysession' => true` on `block_compass_get_attention`,
`get_inventory`, `get_inventory_rows`, `search_inventory` and `get_card_details`. This note
records why that is safe, what it changes, and the numbers measured on m502 before and after.

## What the flag does, and when

`core_external\external_api::call_external_function()` (lib/external/classes/external_api.php:189-191)
calls `\core\session\manager::restart_with_write_lock()` for every service that does not declare
the flag. That call re-opens the session with the lock and holds it until the request ends, so
two AJAX requests of the same user run one after the other.

**The flag does nothing unless the site sets `$CFG->enable_read_only_sessions`**
(`external_api.php:190`, `lib/classes/session/manager.php:120`). It is off by default and off on
every moodle-dev stack. A site that turns it on must first map its session-mode caches outside the
default session store, or every request throws (`manager.php:172-177`).

## Why no service writes the session

Core's contract for a read-only request is the check in `manager::write_close()`: no `$SESSION`
key added, removed or changed between session start and close. `$USER` is not checked, and
changes to it are discarded at the end of a read-only request.

- **The plugin**: no `$SESSION` reference anywhere in `classes/`. All six cache definitions are
  `MODE_APPLICATION` (`db/caches.php`). The only preference access on these paths is reading
  (`hidden_courses.php`, `explore_preference.php`); `get_user_preferences()` loads the bundle
  into `$USER->preference`, which is `$USER`, not `$SESSION`. The plugin's preference writes
  go through core's own write services from the browser.
- **`require_login()` and `validate_context()`** (`external_api::validate_context()` calls
  `require_login($course, false, $cm, false, true)`). For a logged-in user in an AJAX request,
  every `$SESSION->wantsurl` branch is either not reached or disabled
  (`$setwantsurltome` is forced off for `AJAX_SCRIPT`), and `user_accesstime_log()` is skipped
  for AJAX. `sesskey()` touches `$USER` only. The `after_require_login` callbacks belong to other
  plugins and run inside every service, including core's own read-only services. On m502 the only
  one is `tool_mfa_after_require_login`, which reads `$SESSION` and writes a marker only under
  `PHPUNIT_TEST`.
- **What the services call outside the plugin**: `core_completion\progress` and
  `get_fast_modinfo()` (the `cm_info_dynamic` callbacks of the mounted modules were checked;
  `interactivevideo_cm_info_dynamic()` returns before its session-writing helper outside a page
  that lists activities), `core/course_image` (an application cache), `format_string()`, and the
  theme's `course_badges` callback (`theme_boost_union_fundaseg/lib.php:458`), whose call chain
  does not reach the theme's three `$SESSION` writers, which handle page requests.

`tests/external/readonly_session_test.php` holds this in place:

- it reads the flag through `external_function_info()`;
- it requires every read-only service to be exercised;
- it runs each service on a fixture that takes its fullest path, with cold caches, and compares
  `$SESSION` before and after the call.

Three gates in `mutations/gates.conf` prove the check is not vacuous: one drops the flag, and two
plant a write, one in the progress computation and one in the inventory fill.

## Measurements (m502, Moodle 5.2.4, Redis sessions, the built-in browser)

The account logged in on the pane, `/blocks/compass/index.php`, full mode, four category groups.
Three conditions:

- **A**: `enable_read_only_sessions` unset (m502 as configured).
- **B**: flag on (set in the config table for the run), services not yet declared.
- **C**: flag on, services declared.

The flag was unset again afterwards.

### Probe: four identical calls at once

The probe runs from the page with `fetch()` to `lib/ajax/service.php`. For each service:

- **one**: the median of 7 single calls, after one warm-up call;
- **four at once**: the median span of 7 rounds of 4 parallel calls;
- **×**: four at once divided by one.

Serialised calls give about ×4 or more, because Redis lock polling adds to it; parallel calls give
about ×1. `get_card_details` was called with 24 ids, `get_inventory_rows` with the first group,
and `search_inventory` with the query "a".

| Service | B one / four at once (×) | C one / four at once (×), run 1 | C run 2 | A, declared (×) |
|---|---|---|---|---|
| get_attention | 58 / 424 ms (7.31) | 56 / 107 ms (1.90) | 168 / 279 ms (1.66) | 154 / 490 ms (3.17) |
| get_inventory | 42 / 451 ms (10.73) | 56 / 87 ms (1.56) | 97 / 146 ms (1.51) | 116 / 449 ms (3.87) |
| get_inventory_rows | 63 / 419 ms (6.69) | 52 / 68 ms (1.32) | 124 / 160 ms (1.29) | 120 / 414 ms (3.46) |
| search_inventory | 48 / 230 ms (4.75) | 35 / 54 ms (1.53) | 146 / 126 ms (0.87) | 57 / 395 ms (6.94) |
| get_card_details (24 ids) | 54 / 406 ms (7.60) | 39 / 63 ms (1.59) | 142 / 136 ms (0.95) | 79 / 470 ms (5.96) |

The single-call times vary by a factor of about three between runs: other sessions were using the
machine. The ratio is the measure; it does not depend on that load.

### The page's own concurrent requests (Network timing, 5 reloads per condition)

The block's own reads never overlap one another:

- tier 1 sends its detail batches one after another (`Block.tsx`);
- tier 3 keeps one detail request in flight at a time (`rowdetails.ts`).

So the lock only costs time when a block read meets another request of the same session. Two such
pairs happen on every use of the page:

- **First paint**: `get_attention` and `local_mail_count_messages` start within 20-40 ms of each
  other.
- **Tier 3**: opening the groups and switching the view at once sends `get_inventory_rows` beside
  the core preference write (`/api/rest/v2/user/current/preferences`).

The figure is the gap between the two responses' ends: serialised, the later one ends a whole
server run after the earlier one; in parallel they end together. Medians, with the range in
brackets:

| Pair | A | B | C |
|---|---|---|---|
| First paint: attention + mail count | 165 ms (125-668) | 88 ms (14-106) | 24 ms (7-56) |
| Tier 3: inventory rows + preference write | 150 ms (60-177) | 94 ms (78-116) | 12 ms (1-49) |

What each condition shows:

- **In A**, whichever request arrived first held the lock: the mail count ended after
  `get_attention`, and the preference write after the rows.
- **In B**, the preference write took the lock first. The undeclared rows request starts
  read-only and upgrades only at `call_external_function()`, so it then waited behind the write.
- **In C**, the block's reads take no lock, so each pair ends together.

`local_mail_count_messages` is not this plugin's. Declaring it read-only too is the next win on
the same first paint.

Core logged no "defined READ_ONLY_SESSION but the following SESSION attributes were changed" line
during the C runs. That log line goes to Apache's error log (stderr, `docker logs`), but nothing
proved that a violation would have shown up there. The PHPUnit check is the proof, not this.

## What it means for a site

Nothing changes until the site sets `$CFG->enable_read_only_sessions = true` in `config.php`,
with session-mode caches mapped outside the session store. Once it does, the block's reads stop
queueing behind each other and behind the rest of the page: other blocks, a star or archive write,
a second tab, a click on a course link while tier 3 is still filling.
