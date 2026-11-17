# ADR-027: Progress judged for one learner, held to core's answer by an oracle and an audit

**Status:** Accepted (2026-11-17). The owner chose the single-learner path in conversation on 2026-11-17, after the
measurements under Evidence, asked for a way to keep the result equal to core's when core changes, and accepted the
record with both of its open decisions (6 and 7: yes). Written with the implementation, version `2026100548`; the
points the record left to the implementation are under "Decided in implementation".
**Date:** 2026-11-17
**Phase:** `details::compute()`, 5.3 only (`main` = `MOODLE_503_STABLE`); the 5.2 branch follows in its own pull
request if this one is accepted.
**Amends:**
- **PLAN.md §4, "Progresso"** (`core_completion\progress::get_course_progress_percentage()`): the percentage keeps
  core's rule and every core call except one, the list filter of restrictions, which is answered for the learner
  alone (decision 1).
- **ADR-001**, the `details` layer: unchanged in shape, key, TTL and invalidation; only what fills it changes.

## Context

`details::compute()` fills the `details` entry on a miss (the 1 h TTL, or the learner's own completion event) by
calling `progress::get_course_progress_percentage()`. Since MDL-60912 and MDL-51447 (5.1 and 5.2.0, January 2026),
that function counts only the activities the learner sees on the course page, through
`completion_info::get_user_activities_with_completion()`. For each activity with a restriction, a group mode of
separate groups or a grouping, it builds an `info_module` and calls `filter_user_list()` with a list holding the
learner alone. That API is made for long lists: its contract asks for a fixed number of queries whatever the list's
length, so the group conditions read every member of the group (or of every group of the course for "any group"),
and each `capability_checker`, built fresh per activity, lists every holder of
`moodle/course:ignoreavailabilityrestrictions` and `moodle/site:accessallgroups` in the context. When the section is
restricted too, the section's check runs on the course context, where `get_users_by_capability()` joins
`user_lastaccess` and sorts by it: the query the owner's DBA reported. MDL-88922 (5.3.1) added a fast path for
activities with no restriction; the restricted ones still pay the list price, once per activity.

The cache bounds how often a learner pays (a warm `get_card_details` is 4 reads), not what a miss costs: 470 to 850
queries, about half a second and 50 MB of PHP memory per miss on a course of 100,000 learners (Evidence). A
whole-course percentage costs as much as per-section rings: core filters every restricted activity either way.

`local_dimensions` met the same cost in its tracker and answered it with `local\learner_restrictions` (#140): the
section's and the activity's trees walked as `tree::filter_user_list()` walks them, the group and grouping
conditions answered from the learner's own groups, each capability one `has_capability()`, and every other
list-filtering condition passed to its own `filter_user_list()` with a one-person list. Its test takes core's
`info_module::filter_user_list()` as the oracle, case by case.

What the owner asked for beyond the speed: the percentage must stay equal to core's when core adds or changes
something on this path, so the copy cannot drift silently between Moodle releases.

## Decision

1. **`details::compute()` keeps core's rule and replaces one call.** A new `classes/local/progress/learner_progress.php`
   does what `progress::get_course_progress_percentage()` does, in its order, with core's own calls:
   `completion_info::is_enabled()` (null when off), `is_tracked_user()` (null when not tracked),
   `is_course_complete()` (100), `get_activities()`, `cm_info::is_visible_on_course_page()`, the fast path for an
   activity with no restriction, separate-groups mode or grouping, then `count_modules_completed()` over the counted
   ids and the same division. The one replacement is the list filter of a restricted activity:
   `learner_restrictions::passes($cm, $userid)` instead of `(new info_module($cm))->filter_user_list([$userid])`.
   The floor stays where it is (`details::compute()`). Like core's, the rule reads the current user's modinfo, so it
   runs only as the learner (`get_card_details` is the one caller, in the user's own session).
2. **`learner_restrictions` and `single_user_capability_checker` are copied from `local_dimensions`**, unchanged but
   for the namespace, into `classes/local/progress/`, with its test. Each copy names the other in its docblock
   (`{@see}` cannot cross plugins, so in prose) and the fleet audit (decision 5) covers both. A dependency on
   `local_dimensions` is rejected (ADR-013 keeps one hard dependency); a shared library plugin is deferred until a
   third consumer appears.
3. **Core is the oracle, end to end.** `tests/local/progress/core_parity_test.php` builds a course matrix and asserts,
   for every learner of every course, that `learner_progress` gives what `progress::get_course_progress_percentage()`
   gives (same null, same float before the floor). The matrix covers every branch of core's rule: completion off; an
   untracked user; a completed course; no restriction; separate groups with no restriction; an activity grouping; a
   hidden activity; a hidden section; a stealth activity; an activity being deleted; the group condition (member,
   non-member, negated, any group, a group of another course, every group visibility, a viewer who cannot see all
   groups); the grouping condition (member, non-member, the activity's own grouping); the profile condition (the
   generic path every third-party list condition takes); date, completion and grade conditions (conditions that do not
   filter lists, so the activity counts); AND, OR and NOT trees, nested, and an OR with a child that filters no list;
   a restricted section over a restricted activity; a restricted subsection (a delegated section); a learner holding
   `ignoreavailabilityrestrictions` by an override at the module context, and one holding `accessallgroups`;
   availability off for the site. It runs on every leg, so a new core on any leg is checked against it.
4. **A fingerprint of the core code the rule mirrors.** `tests/fixtures/core_parity.json` records, for each mirrored
   symbol, the core release audited and a hash of the symbol's source with comments and whitespace removed
   (`token_get_all()`, so a comment or a reformat is not a change). The symbols:
   `progress::get_course_progress_percentage`, `completion_info::get_user_activities_with_completion`,
   `get_activities`, `is_enabled`, `is_tracked_user`, `is_course_complete`, `count_modules_completed`,
   `cm_info::is_visible_on_course_page` and `update_user_visible` (the getter only returns what the second
   computes; MDL-66780 changed it in 5.1.5 and 5.2.1), `info::filter_user_list` (which `info_section` inherits),
   `info_module::filter_user_list`, `tree::filter_user_list`, `tree::get_logic_flags`,
   `capability_checker::get_users_by_capability`, and the `filter_user_list` and `is_applied_to_user_lists` of the
   group, grouping and profile conditions, plus the list of core condition types that answer
   `is_applied_to_user_lists()` true. `tests/local/progress/core_fingerprint_test.php` fails when any of them differs,
   naming the symbols and the command that shows core's diff. It is a test on purpose: the fleet runs GitHub's
   pipeline only on the commit a release tag goes on, so a core point release that moved this code reddens the
   release commit before the tag, and the local stacks redden it the day they move to that release.
5. **An audit routine, written down and run each time the fingerprint or the oracle reddens, and before every
   release.** `docs/core-parity.md` holds the procedure and its log: (a) run the oracle on the new core; (b) for each
   symbol the fingerprint names, read core's diff between the audited tag and the new one; (c) search the tracker for
   issues touching `core_completion` progress and `core_availability` user lists since the last audit; (d) decide,
   per change, whether the rule follows it (code and a new matrix row) or it changes nothing (a log line saying why);
   (e) update the manifest's hashes and release in the same commit, with a `CHANGELOG.md` line. The same procedure
   names `local_dimensions`, whose copy of `learner_restrictions` gets the same fingerprint in its own pull request.
6. **A switch back to core** (the owner: yes). A setting `block_compass/progress_source`
   (`admin_setting_configselect`: *Compass, for one learner* by default, *Moodle core*) makes `details::compute()`
   call core's function again, at once and with no deploy, if an audit finds a difference after a site has already
   upgraded core.
7. **A weekly look upstream** (the owner: yes). A scheduled check (the fleet's scheduled tasks, outside the plugin)
   fetches core's `MOODLE_503_STABLE` and compares the fingerprinted symbols with the manifest, so a drift is known
   when core merges it, before any stack or release meets it. A report only; it changes nothing.
8. **The cache stays.** `details` keeps its key, its 1 h TTL and its per-user, per-course delete on the learner's
   completion events; a cheap miss is no reason to drop a layer that makes a warm page cost nothing.

## Decided in implementation

- **Core's fast path is followed as written.** MDL-88922 counts an activity with no restriction, no
  separate-groups mode and no grouping without any check, so its section's restriction is not asked either. That
  skips nothing in effect: an activity in a section the learner fails is already off the course page
  (`is_visible_on_course_page()`), and the oracle pins both sides with hand-written guards. Asking every activity's
  restrictions instead is an equivalent mutation (the same answer, no read more), so the fast path carries no gate.
- **The fingerprint reads source, not loaded classes.** `classes/local/progress/core_fingerprint.php` tokenises the
  files (`token_get_all()`), so the same code checks the running core and any other checkout;
  `cli/core_parity.php` prints the differences (exit 1) or, with `--rebuild=<release>`, the manifest read again
  from a tree, the step that records an audit. 23 functions, listed in the manifest; `info_section` inherits
  `info::filter_user_list()`, so only its `get_view_hidden_capability()` is listed. The core condition types that
  filter user lists are read from each `condition.php`: a type counts unless its `is_applied_to_user_lists()` is
  exactly `return false;`, so a computed answer is never missed.
- **The weekly look upstream** is the scheduled task `core-parity-weekly-upstream` (Mondays, 08:00 local): it
  fetches core's `MOODLE_503_STABLE`, extracts the six paths the manifest names into a 5.3 stack's `/tmp` and runs
  the CLI with `--root`. On 2026-11-17 upstream (`1156a935ba4`, weekly 5.3.1+) matched.
- **Oracle scenarios:** as built; availability off for the site; completion off for the site; completion off for the
  course; the course completed by all but one learner. Eight users (one per membership shape, an exempt holder of
  `accessallgroups`, a holder of an override at one module, an untracked teacher), 33 pages and a subsection.

- **The 5.2 branch** (`2026042045`) carries the same rule and its own manifest, audited against v5.2.5: its
  `get_activities()` differs from 5.3.1's only in not sorting the activities, which changes no count
  (`docs/core-parity.md`, log).

## Consequences

**Positive**
- A miss on the 100k course costs 34 ms, 147 queries and 0.3 MB warm, where core's function cost 442 ms, 467 queries
  and 50 MB (3,951 ms with every section restricted to "any group", 43 ms now); a course whose groups are all visible
  costs 2 queries warm. The DBA's query and the 100,000-row group reads leave the block's path. What remains on the
  100k course is core's own: `cm_info` evaluates each restricted activity's availability for the course page, and
  where a course has groups of restricted visibility core skips its group cache and reads the learner's groups once
  per restricted activity (a recordset, three reads, 0.2 ms, on `groups_members.userid`).
- The answer stays core's: the oracle compares the two on every leg; the fingerprint names the day core's code moves;
  the routine says what to do then; condition plugins keep their own rule (decision 1 passes them through).

**Negative and limits**
- A second copy of `learner_restrictions` in the fleet, kept in step by the audit, not by the compiler.
- The fingerprint reddens on any change of a mirrored symbol, a harmless one too; each costs an audit entry.
- The oracle proves parity on its matrix only. A new core condition type, or a third-party one, that filters lists
  goes through its own `filter_user_list()` and stays correct, but its cost is its own.
- `get_card_details`'s budget changes: "1 + computed courses" stays, and each computed course gains a bound that does
  not grow with its restricted activities (a budget test with 5 and with 50 restricted activities, equal reads).
- Core's other callers keep their cost: My courses (`block_myoverview`), Recently accessed courses and Starred
  courses compute progress through core on every view, with no cache. Outside this plugin.

**New surface**
- `classes/local/progress/learner_progress.php`, `learner_restrictions.php`, `single_user_capability_checker.php`.
- `classes/local/progress/core_fingerprint.php`, `cli/core_parity.php`.
- `tests/local/progress/core_parity_test.php`, `core_fingerprint_test.php`, `learner_restrictions_test.php`,
  `learner_progress_test.php` (the budget of a computed course and the setting), `tests/fixtures/core_parity.json`.
- `docs/core-parity.md` (procedure and log); with decision 6, the setting, its two strings and its README line.
- Gates under "Progress for one learner" in `mutations/gates.conf`; CI tier 3 (capabilities, code that depends on the
  core version): `mdl ci moodle-block_compass --matrix --behat`.

## Evidence

Measured on m503b (core 5.3.1, `cfe123f26fc`, PostgreSQL 18), learner `ldperf_learner`, fixture `ldperf_` (course
LDPERF100K: 100,001 learners, 2,000 groups, 62 restricted activities); scripts and raw output in
`moodle-dev/docs/client-performance-audit/block_compass-2026-11-17/`. Medians of five runs.

| `progress::get_course_progress_percentage()`, LDPERF100K | ms | Queries | Peak MB | `get_users_by_capability` | of them the DBA's |
|---|---:|---:|---:|---:|---:|
| As seeded, warm | 442 | 467 | 50.6 | 113 | 0 |
| Every section restricted to the learner's group, warm | 555 | 845 | 50.6 | 233 | 120 |
| Every section restricted to "any group", warm | 3,951 | 785 | 50.6 | 233 | 120 |
| No restriction anywhere, warm | 18 | 2 | 0.3 | 0 | 0 |

| `get_card_details`, the learner's 12 courses | ms | Queries |
|---|---:|---:|
| Every entry cached | 9.6 | 4 |
| TTL expired (core caches warm) | 991 | 1,346 |
| After one completion in LDPERF100K | 493 | 471 |
| Same, every section restricted by group | 644 | 849 |
| Core's My courses service, every view | 861 | 1,359 |

**After** (the same fixture, `learner_progress::percentage()`, medians of five, warm):

| LDPERF100K | Before ms / queries / MB | After ms / queries / MB |
|---|---:|---:|
| As seeded | 442 / 467 / 50.6 | 34 / 147 / 0.3 |
| Every section restricted to the learner's group | 555 / 845 / 50.6 | 34 / 165 / 0.3 |
| Every section restricted to "any group" | 3,951 / 785 / 50.6 | 43 / 165 / 0.3 |
| LDPERF-H1 (groups all visible) | 54 / 146 / 0.6 | 20 / 2 / 0.6 |

| `get_card_details`, the learner's 12 courses | Before ms / queries | After ms / queries |
|---|---:|---:|
| TTL expired (core caches warm) | 991 / 1,346 | 171 / 162 |
| After one completion in LDPERF100K | 493 / 471 | 45 / 151 |
| Peak memory | 50 MB | 5.4 MB |

The percentages are equal before and after on every course (38.1, 33.3, 40.0, null).

The DBA's query itself costs 0.15 to 0.26 ms (`EXPLAIN ANALYZE`, 45 role holders), still 0.15 ms with 100,046
`user_lastaccess` rows for the course: its weight is the count, 120 per computation. The heaviest reads are the
group conditions: "any group" reads all 106,352 group members of the course once per restricted activity.
`local_dimensions`' tracker on the same course went from 470 ms and 402 queries to 8.6 ms and 8 with the same class
(#140).

**Alternatives rejected.**
- *Keep core's call; rely on the cache.* The cache already serves warm views at 4 reads; what remains is the miss,
  which it cannot make cheaper.
- *A longer TTL.* Fewer misses, a staler bar, and the completion events still force one each.
- *`info_module::is_available()` for the learner.* Applies the conditions that do not filter lists (dates, grades,
  completion), which core counts on purpose, and treats group visibility differently from the list filter.
- *Patch core* (one `capability_checker` per request, a single-user path in `get_user_activities_with_completion()`).
  Worth proposing upstream; it would reach sites only after their next upgrade, and the oracle would show the day the
  two paths can merge back.
