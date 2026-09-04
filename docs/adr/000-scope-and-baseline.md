# ADR-000 — Scope and baseline

- **Status:** Accepted
- **Date:** 2026-09-04
- **Deciders:** Anderson Blaine (maintainer); options and recommendations drafted by the agent

## Context

`PLAN.md` (v2) specifies the block but leaves a set of choices open or
ambiguous, and a few of its statements do not survive contact with the Moodle
5.2 source. Before Phase 0 the maintainer settled each of them. This record
keeps the answers where later sessions can find them; every item below is a
decision, not a suggestion, until a later record supersedes it.

Facts verified on the 5.2 checkout that shaped the options: the core course
star (`core_course_set_favourite_courses`, `course/externallib.php`) stores
favourites with component `core_course`, itemtype `courses`, in the **course**
context, and performs no enrolment check; `core_user/repository` exposes
`setUserPreferences` (batch) over `core_user_update_user_preferences`;
`{course_completions}` has a unique index on `(userid, course)`;
`enrol_get_my_courses()` (`lib/enrollib.php`) defines an active enrolment as
`ue.status = 0 AND e.status = 0 AND ue.timestart <= now AND (ue.timeend = 0 OR
ue.timeend > now)`; `{user_enrolments}.timemodified` exists;
`\core_completion\progress::get_course_progress_percentage()` returns `null`
when completion is disabled or the user is not tracked.

## Decisions

### Baseline (Phase 0)

1. **Supported range.** `$plugin->requires = 2026042000`, `$plugin->supported =
   [502, 502]`. Moodle 5.3 is added, with its CI job and README line, only in the
   commit that verifies the plugin on the m53 stack.
2. **Release naming.** `$plugin->release = 'v5.2-r1'`, in the style of
   `local_unlistedcourses`. A `$plugin->version` bump never changes `release`;
   the release string changes only when the maintainer says so.
3. **Repository.** Git from Phase 0 with one commit per phase, each after the
   maintainer approves the diff. The GitHub repository
   `uaiblaine/moodle-block_compass` is created **public**, only after the first
   commit is approved.
4. **Plan file.** `block_compass-PLAN.md` is renamed `PLAN.md` and stays in
   Portuguese; new planning text goes into English records here.
5. **Placement.** `applicable_formats()` returns `['my' => true]`: the Dashboard
   only. No per-instance configuration, no multiple instances per page.
6. **Phase 0 extras.** One Behat smoke scenario (the block is added to the
   Dashboard and renders), this record and the ADR index, and
   `mutations/gates.conf` with the first guards.
7. **Cache store.** Redis is **recommended, not required** — a plugin cannot
   impose a store. The README and the settings page state that without a
   shared in-memory store performance can be severely degraded. Showing the
   current store mapping on the settings page is deferred to Phase 7.

### Tier 1 and favourites (before Phase 1; ADR-001 builds on these)

8. **Favourites reuse the core star.** Component `core_course`, itemtype
   `courses`, course context, read through `core_favourites` and written by the
   core web service `core_course_set_favourite_courses` from the browser. The
   star therefore agrees between Compass and the Course overview block. Compass
   ships **no** `toggle_favourite` web service, no favourite rows of its own, no
   favourite entries in its privacy provider and no uninstall purge.
   Consequence accepted: `enable_favourites` only hides the UI, and the core
   service performs no enrolment check. Supersedes PLAN.md §4 and §5 on this
   point.
9. **Cards per strip.** `attention_max` defaults to **3**: each strip shows up
   to three cards plus a ghost card ("+N") when there are more, favourites
   included. Supersedes "Favourites: all" in PLAN.md §7.
10. **Progress on first paint.** Hybrid: `get_attention` returns the progress of
    the cards whose `details` entry is cached and marks the rest `pending`; the
    client calls `get_card_details` for the pending ids only. First paint stays
    one request within the six-read budget with the plugin caches cold.
11. **Completed courses leave "Continue"** through a join on
    `{course_completions}.timecompleted IS NOT NULL` (unique index `userid,
    course`), not through the progress percentage.
12. **Hidden courses (`course.visible = 0`)** are excluded in SQL for everyone
    except users holding `moodle/course:viewhiddencourses` in the **system**
    context, evaluated once per request. A teacher's own hidden course does not
    appear in Compass although it does in the Course overview block; the block is
    learner-facing and this is documented.
13. **Active enrolment** is exactly the `enrol_get_my_courses()` predicate quoted
    above. The front page (`SITEID`) is excluded explicitly. Instance-level
    `enrolstartdate`/`enrolenddate` do not filter; they are displayed as the
    "deadline" on new-enrolment cards when set.
14. **"New"** means an active enrolment with `timecreated` inside `new_days` and
    no `{user_lastaccess}` row; an enrolment whose `timestart` is in the future
    is not shown until it starts.

### Inventory, archiving and exploration (before Phases 2, 3 and 5)

15. **Inventory stamp** = `COUNT(*)` and `MAX(timemodified)` of the user's
    `{user_enrolments}` **plus** `MAX(timeaccess)` of their `{user_lastaccess}`
    rows: two indexed aggregates, no observers. Extends PLAN.md §6.3 so that
    "last access" and the dormant classification in tier 3 do not go stale for
    up to the 24 h TTL.
16. **Archiving reuses `block_myoverview_hidden_course_<courseid>`**, written
    from the browser through `core_user_update_user_preferences`
    (`core_user/repository` `setUserPreferences`, batched for "archive all").
    Compass ships **no** `set_hidden` web service. Hidden courses are excluded
    from the ghost count and from the category groups and appear in a collapsed
    "Archived (N)" group with an unarchive action. Supersedes PLAN.md §5 on
    `set_hidden.php`.
17. **List/cards view** is persisted per user in the plugin's own preference
    `block_compass_view`, declared in `lib.php` `block_compass_user_preferences()`
    with `is_current_user` as permission callback and exported by a
    `user_preference_provider` — both in the same commit that introduces it.
18. **Search in degraded mode** is a substring `LIKE` through `$DB->sql_like()`
    over the user's own enrolments (joined first), so its cost is proportional to
    that user's enrolment count, not to `{course}`. PLAN.md §6.5's "indexed LIKE"
    is corrected accordingly in ADR-004; prefix-only search was rejected.
19. **Enrolment method label** is `get_string('pluginname', 'enrol_' . $method)`
    guarded by `string_exists()`, the core idiom. The fleet's ban on dynamic
    string ids targets dynamic *keys*; a dynamic *component* for a plugin name
    has no alternative.

### Interpretations assumed (raise a record to change them)

- `group_depth` is the category depth from the root; a course in a shallower
  category groups under its own category.
- Integer settings are `admin_setting_configtext` with `PARAM_INT`;
  vocabularies are `admin_setting_configselect`; `default_view` defaults to
  `list`.
- Language packs: `en` and `pt_br` only.
- Capabilities: `block/compass:myaddinstance` (authenticated user) only.
  *Amended 2026-09-04, still in Phase 0:* the first draft also declared
  `block/compass:addinstance` (manager, editing teacher); the scaffold review
  showed that with `applicable_formats()` limited to `my`,
  `block_base::user_can_addto()` (`blocks/moodleblock.class.php`) checks
  `myaddinstance` on Dashboard page types and returns false everywhere else, so
  `addinstance` would never be evaluated. Core's own Dashboard-only blocks
  (`block_timeline`, `block_starredcourses`, `block_myoverview`) declare
  `myaddinstance` alone; Compass does the same. Widening
  `applicable_formats()` (decision 5) is what would bring `addinstance` back.
- The course image is read through
  `core_course\external\course_summary_exporter::get_course_image()` and copied
  into `coursemeta`; ADR-001 records the measured cost of that copy versus
  deferring to core's `core/course_image` cache.
- "Pending" (calendar action events) stays out of Phases 0 to 5.
- The concurrency test on the GCP staging environment (200 users on
  `get_attention`) is the maintainer's to run before Phase 2 is declared done.

## Consequences

- `classes/external/` loses two of the five planned functions
  (`toggle_favourite`, `set_hidden`); the client talks to core for both.
- The privacy provider stays a `null_provider` until decision 17 lands.
- Tier 1 shows at most nine cards plus ghosts; the ≤ 15 figure in PLAN.md §6.1
  becomes ≤ 9.
- ADR-001 must state the system-context capability evaluation and the
  `course_completions` join; ADR-002 must state the three-aggregate stamp;
  ADR-004 must state the bounded substring search.

## Evidence

- `course/externallib.php` (5.2), `set_favourite_courses` (registered as
  `core_course_set_favourite_courses`): locates the service with
  `\core_favourites\service_factory::get_service_for_user_context(\context_user::instance($USER->id))`
  — the parameter is type-hinted `\context_user`, so a course context would
  throw — and then calls `favourite_exists()`, `create_favourite()` and
  `delete_favourite()` on it with component `core_course`, itemtype `courses`,
  the course id and `\context_course::instance($courseid)` as the item context.
- `user/amd/src/repository.js` (5.2): `setUserPreference`, `setUserPreferences`.
- `lib/db/install.xml` (5.2): `course_completions` index `useridcourse`
  unique on `(userid, course)`; `user_enrolments` field `timemodified`;
  `user_lastaccess` unique index `(userid, courseid)`.
- `lib/enrollib.php` (5.2) lines 742–743: the active-enrolment predicate.
- `completion/classes/progress.php` (5.2): `get_course_progress_percentage()`.
- Chat with the maintainer, 2026-09-04: answers 1–19 as recorded.
