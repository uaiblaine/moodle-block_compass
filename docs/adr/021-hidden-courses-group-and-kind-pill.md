# ADR-021: Hidden courses in a group of their own, and the kind pill on Explore's cards

**Status:** Accepted (2026-11-13; proposed the same day). The maintainer answered the eleven questions as
proposed, adding two specifics: the reachability gap of decision 1.6 is a known limit with a named follow-up,
and the Portuguese *New* chip becomes "Novidade" (decision 2.4). Drafted by the agent against the code of
`MOODLE_503_STABLE` at `4a6c12c` and the 5.3 core checkout; nothing here is implemented yet.

**Date:** 2026-11-13
**Phase:** 16 (5.3 first, on `main` = `MOODLE_503_STABLE`; the 5.2 port is stage P)
**Supersedes:** ADR-000 decision 12 for tier 3 and `get_card_details`. Tier 1 keeps it as written.
**Amends:**
- **ADR-007 decision 2:** three groups that are not categories, not two; and its consequence "a course both
  dormant and archived is archived" becomes a precedence of three.
- **ADR-007 amendment 3 (2026-09-08):** its rules for the archive in full mode apply to the new group too.
- **ADR-019 decision 4:** `course_kinds` is also dispatched once per tier 3 response that ships rows.
- **ADR-020 decision 1:** slot 2 holds the course's kind as well as *New*.
- **CLAUDE.md**, "SQL in `classes/local/`": "`viewhiddencourses` evaluated once per request" stays true of
  tier 1's SQL only; tier 3 and the details evaluate it per hidden course, in PHP.

**Builds on:** ADR-000 decisions 12 and 22; ADR-001 (the course layer); ADR-004 (paged mode); ADR-007 (the
dormant and archived groups); ADR-019 decision 4 (the `course_kinds` hook); ADR-020 (the course card);
`moodle-dev/docs/course-card/CONTRACT.md` sections 2, 3 and 7.

## Context

An audit found that tier 3 never shows a teacher the hidden course they teach. ADR-000 decision 12 chose
that on purpose, before Phase 0: hidden courses (`course.visible = 0`) are left out for everyone except a
holder of `moodle/course:viewhiddencourses` in the **system** context, "evaluated once per request", because
the block is learner-facing. The maintainer now wants it fixed, without raising tier 1's cost, and asked
(2026-11-13, translated): *"In Explore, the course card needs to be identified as a course: do we already
have a visual proposal? Just as there is an area for archived courses, create one for hidden courses. Same
behaviour as archived: it loads on demand when the accordion is expanded."*

The visual proposal exists: slot 2 of the fleet's course card is the course's kind, "Curso", "Evento",
"Trilha", from the theme's `course_kinds`, and "the compass puts 'Novo' in the same place" (CONTRACT.md
section 2). Compass reads kinds today only for the open-for-enrolment line (ADR-019 decision 4). Decision 2
draws them on Explore's cards.

What the code does today, read on `4a6c12c`:

1. **Three places read the capability at the system context.** Tier 1, once in the constructor
   (`classes/local/attention.php:119`), turned into ` AND c.visible = 1` on every statement
   (`:614-616`). Tier 3, once in `explore::resolve()` over the union of every population
   (`classes/local/explore.php:560-570`). The details batch, lazily, the first time the batch holds a
   hidden course (`classes/local/cards.php:401-415`). Core decides per course, at the **course** context:
   `enrol_get_users_courses()` (`public/lib/enrollib.php:956-968`) and `enrol_get_my_courses()`, which the
   Course overview block uses (`:825-836`). A teacher whose role is in the course holds the capability there
   and not at the system context, so core lists the course and Compass does not.
2. **The holder at the system context sees hidden courses mixed into the category groups.** The same branch
   that drops them for everyone else keeps them, unmarked, in their category or in *Dormant*
   (`explore.php:562-565`, then `build()` at `:153-194`). Nothing on the row says the course is hidden.
3. **"Hidden" already means "archived" in the code.** `classes/local/hidden_courses.php` reads the Course
   overview block's `block_myoverview_hidden_course_*` preferences (`:18,36-40`), and every `$hidden` in
   `resolve()` and `inventory.php` is that set (`explore.php:527`, `inventory.php:327,362,399`). The new
   group cannot take that word in code.
4. **The archived group is the model to copy.** A header and a count in the first payload in both modes
   (`explore.php:218-222`), its rows only through `get_inventory_rows` for `GROUP_ARCHIVED = -2`
   (`dormancy.php:51`; the population switch at `explore.php:320-326`; the reserved ids validated before
   any work at `classes/external/get_inventory_rows.php:64,161-165`). In full mode the client fetches it
   page after page on first open and filters the held rows like any group's (`js/esm/src/Explore.tsx:503,
   522, 1479-1490`, `passesRow()` through `archivedvisible` at `:715-722`); it stays drawn, closed, under any
   filter; a search does not open it (`:1711`); its matching rows count in "N courses shown" (`:729`) but not
   in the chips' numbers. In paged mode it pages with the chip, the sort and the filters as parameters, as
   every group does (`:430-436`). The paged search never sees it (`explore.php:471-475`).
5. **Tier 3 is reachable only from tier 1.** `Explore` mounts once the ghost, a strip's overflow link or the
   pending notice is pressed (`js/esm/src/Block.tsx:173,485,533-534,643,666`), and the ghost exists only while
   `counts.more > 0` (`classes/external/get_attention.php:117`), a count of tier 1's own visible courses.
6. **The course layer already knows which courses are hidden.** `coursemeta` stores `visible` and the six
   context columns (`classes/local/course_meta.php:48-56,161-174`); `context_of()` rebuilds the course context
   with no read (`:181-185`). Core hides a category's courses with `set_field('course', 'visible', 0)` and no
   course event (`public/course/classes/category.php:2441,2448`), and the observer of
   `course_category_updated` drops only the category layer (`classes/observer.php:129-134`): a course hidden
   with its category keeps `visible = 1` in `coursemeta` until its next `course_updated`.
7. **The kind field's value is in a cache Explore already reads, but only when a filter is configured.**
   `course_fields` keeps, per course, the stored values of **every eligible field** (`course_fields.php:30-35,
   72-74`), and `course_kinds::field_id()` accepts only an eligible select (`course_kinds.php:70-80`), so the
   kind's value is in every `coursefields` entry. Explore asks that layer only while `filter_fields` names a
   field (`explore.php:621-627`).

## Decision

### 1. A Hidden group, the third group that is not a category

**1.1 The id and the name.** `dormancy::GROUP_INVISIBLE = -3`, beside the two reserved ids; the client's
`GROUP_INVISIBLE` beside `types.ts:600-601`; `get_inventory_rows::RESERVED_GROUPS` gains it, so -4 and below
are still refused. In code the group and its row key say *invisible*, the column's own sense and the word the
tests already use for `visible = 0` (`explore_test.php:456-463`), so that *hidden* keeps meaning archived. On
screen it is **Hidden (N)**, collapsed, after *Dormant* and before *Archived*. Its anchor follows the rule the
negative ids already have (`Explore.tsx:1737`, "3r"), and the side index skips it (`:1677`).

**1.2 Who is in it.** The listed population of `resolve()`: active, scheduled, and pending or waitlisted while
`enable_pending` is on (`explore.php:526-552`), whose `coursemeta` entry has `visible = 0`, for which
`has_capability('moodle/course:viewhiddencourses', course_meta::context_of($entry), $userid)` is true. The
capability is asked at the **course** context, per hidden course and only for the hidden ones, as
`enrol_get_users_courses()` asks it. A course core is deleting is in no group for anyone, before the
capability is asked (`explore.php:567-569`, unchanged). In practice an application never passes: the viewer
holds no role in the course yet, unless one above it. The archived population gets the same per-course rule:
a course-level teacher's archived hidden course, dropped today with the rest (`explore.php:560-572`), comes
back in *Archived*.

**The category groups and *Dormant* then hold only visible courses, for every viewer.** This is a change for
the holder of the capability at the system context: their hidden courses leave the category groups for
*Hidden*, the headline *All courses (N)* stops counting them, and `get_inventory`'s first payload stops
carrying their rows. Asked per course, the rule is also exact where the system read was not: a prohibit or an
override in a category or a course now counts, as it does for core (answer 1).

**1.3 Precedence: Archived, then Hidden, then Dormant, then the category.** A course both archived and hidden
is **archived**. ADR-007 put the archive above dormancy because "it is a statement the learner made and
dormancy is one the plugin inferred"; hiding is a statement too, but somebody else's, about every learner of
the course, while archiving is the viewer's own about their own list, and the archive is the one place they
undo it. The row keeps saying the course is hidden (1.8). A hidden course in a dormant state goes to *Hidden*:
dormancy is inferred, and a teacher's quiet hidden course is usually one being prepared. Unarchiving such a
course sends it to *Hidden*.

**1.4 How it fills: exactly as Archived.**
- **Server.** `build()` ships `{id: -3, name, count, courses: []}` in both modes, only when `count > 0`;
  `rows()` pages over the invisible population for `-3` with the chip, the selection and the sort applied
  before the cut, as for `-2`; the population does not count towards `inventory_max`, so hiding courses never
  pushes a teacher into paged mode (`explore.php:119-121`). `search()` keeps its population (answer 5).
- **Client.** `pagedgroup()` becomes true for `-2` and `-3`; the fetch-on-open effect fetches `-3` page after
  page in full mode until `hasmore` is false; `slices` gives it the archive's slice (held rows through
  `passesRow()`, the server's count until every page is here, drawn closed whatever the filter); its matching
  rows count in `shown` and in "No course matches.", not in the chips'; the normalised-name map takes its rows
  (`Explore.tsx:588-595`); a search leaves it closed. `reloadBoth()` already drops every page after an archive
  or an unarchive (`:1004-1017`), which is what moves a course between *Hidden* and *Archived*. The rows keep the
  star and the archive control; *Archive all* stays on *Dormant* alone.
- **Like the archive, it is drawn only in the grouped view.** The A to Z and Recent sorts draw a flat list
  built from the first payload's groups (`Explore.tsx:1251-1252,1595`), which holds neither group, so neither
  is reachable there; that is today's behaviour of *Archived*, kept.

**1.5 The count N, and what it costs.** The count must be in the first payload, and it can be had for no read.
- `resolve()` already loads every population's `coursemeta` entries in one `get_many()` (`explore.php:560`):
  which courses are hidden is known for nothing.
- `has_capability()` with `$userid` equal to `$USER->id`, which every caller passes (the three services take no
  userid), reads the session's `$USER->access`, loaded at sign-in (`public/lib/accesslib.php:569-573`). The role
  definitions come from a request static, then the shared `core/roledefs` application cache, and from the
  database only on a cache miss, one recordset for the missing roles (`:303-330,337-366`). The dirty-context and
  dirty-user flags are read once per request (`public/lib/classes/context.php:1000-1025`), and today's
  system-context check in the same request already pays that read. `is_siteadmin()` reads `$CFG`.
- For **another** user, core loads that user's role assignments with a recordset (`accesslib.php:575-579,
  915-947`), and on the CLI it re-reads a dirty flag per call (`:986-990`). No caller does that: the pre-warm task
  never builds tier 3 and never asks a capability (`classes/local/prewarm.php:253`, the course layer only).

So the per-course check adds **zero database reads** on a warm request: CPU per hidden course (a walk up the
context path), bounded by the viewer's enrolments. On a site whose `roledefs` entry is cold (after a role edit
or a purge), the first request that meets a course-level role pays core's one recordset, as any core page does
on its first capability check there; the budget protocol warms core first and does not count it. The
alternative, a *Hidden* header with no count, or one shown whenever a candidate row has `visible = 0` with the
capability decided when the group opens, is rejected: it would show a student enrolled in a course their
teacher hid a header that opens empty, and it saves nothing.

**1.6 Tier 1 is unchanged** (the maintainer's constraint): `attention.php` keeps its system-context read and
its SQL. What that leaves visible:
- A course-level teacher's hidden course is in *Hidden* and in none of *Continue*, *New*, *Favourites*,
  *Starts soon*, the counts or the ghost. **A favourited hidden course is absent from the Favourites strip and
  present, starred, in *Hidden*.** Inside *Hidden* the star and the filters act as they act inside *Archived*:
  full mode applies the scope, the star, the selection and the query to the held rows; paged mode sends the
  chip and the filters with each page.
- **Reachability, a known limit.** *Hidden* ships with the reach *Archived* has. Because tier 3 opens only from
  tier 1 (fact 5), a teacher whose visible courses all fit the strips gets no ghost, and one whose every course
  is hidden reads "no courses": **neither can open Explore, so neither reaches *Hidden*.** The archive has had
  the same gap since Phase 5 (archived courses are left out of `counts.total` too). **Follow-up, in a record of
  its own: "A way into tier 3 when the ghost is zero".** One shape it may weigh, costing no read: the counting
  statement adds one `SUM` of the active enrolments in hidden courses, and the client draws a bare *Explore all*
  when the ghost is zero and that sum is not; against it, a student of a hidden course would get the same door
  to a tier 3 that adds nothing, and the statement's visibility filter would move into a `CASE` (answer 6).
- The calendar strip keeps leaving hidden courses out for everyone (`classes/local/calendar/strip.php:957-973`).

**1.7 Card details.** `cards::details()` applies the same rule: for each hidden entry of the batch, the
capability at that course's context, rebuilt from the entry (`cards.php:401-415`, the lazy system read
replaced). Zero reads warm, for the reasons of 1.5; the budget "1 + computed courses" does not move.

**1.8 How a hidden row is drawn.** A state pill, **Hidden from students**, core's own string
(`hiddenfromstudents`, `lang/en/moodle.php:1028` in 5.3, `:1023` in 5.2), which core's course card draws under
the name as `badge bg-info text-white` (`public/course/templates/coursecard.mustache:68-72`, which the Course
overview block's cards extend). Compass draws it as its other states, `compass-state compass-state-invisible`
in `StatePill.tsx`, an icon (`fa-eye-slash`, decorative) and the sentence, and ships the label from the shell
as it ships `loading` and `confirm` (`classes/output/block.php:206-208`).
- **Where.** CONTRACT.md section 3: a state pill is "drawn only when the state is not the normal one for the
  list", and Compass already prints no category on a card inside its category's group (`show_category_desc`).
  Inside *Hidden* the heading says it; the pill is drawn where a hidden row sits among visible ones, which is
  *Archived* (answer 4). A row can then be hidden and complete: the two pills share slot 9 and wrap.
- **The wire.** One optional row key, `invis` (true, only on a course with `visible = 0`), in
  `get_inventory_rows::row_fields()`, which the three services share. Hidden rows travel only in pages of `-2`
  and `-3`, so `get_inventory`'s first payload gains no byte.
- **No new colour.** The pill paints with the card's quiet pair, `--block_compass-card-extra-bg` and
  `--block_compass-card-ink` (`styles.css:51,57`), added to `contrast_rules_test`. The family's `neutral` state
  tokens would be the semantic match, but Compass's state pills read Bootstrap's properties directly
  (`styles.css:32-38`), not `--dimensions-state-*` as CONTRACT.md section 7 asks; that gap is older than this
  record and is left to the contract's own follow-up.

**1.9 Cache and invalidation.** The flag is `coursemeta`'s `visible`: no new cache, no new key, no stamp change.
A course hidden through its own form fires `course_updated`, which drops its entry already. A course hidden with
its category does not (fact 6): **this group depends on the fix in flight in another worktree that drops the
`coursemeta` entries of a category's subtree on `course_category_updated`.** The same fix bounds the known limit
of ADR-000 decision 22, which now matters more: the capability is evaluated on the context path stored in the
entry, so a moved course's stale path would ask the old category's roles. Cluster-first: everything read is
shared (`coursemeta` in MUC, the role definitions in MUC, `$USER->access` in the session store); a cold node pays
the course layer's one fill and core's role cache, nothing node-local.

**1.10 Strings, settings, privacy, documents.**
- **Strings:** one, `invisible` = *Hidden* / *Ocultos*, the group's heading, in `lang/en` and `lang/pt_br` in
  lockstep. The pill is core's string.
- **Settings:** none. `enable_pending` and its kin switch a feature on; this is a correction of who sees what,
  and a switch to turn it off would put the gap back for the sites that keep the default (answer 7).
- **Privacy:** no personal data added: the flag is course data, the capability is core's.
- **README:** the overview (`README.md:34-37`), *All courses and the Compass page* (the groups paragraph,
  `:198-203`), *Troubleshooting* ("A course vanished", `:595-596`), and a sentence under *Capabilities* that the
  block reads `moodle/course:viewhiddencourses` at the course context in tier 3 and at the system context in
  tier 1.
- **Records:** ADR-000 decision 12 gains a line pointing here; ADR-007 gains an amendment for the third group
  and the precedence; ADR-001's statement of the system-context evaluation is narrowed to tier 1.

### 2. The kind pill on Explore's cards

**2.1 Where the value comes from.** From `coursefields`, which already holds it (fact 7). When
`course_kinds` gives a field (2.2), `build()` (full mode), `rows()` and `search()` ask
`course_fields::get_many()` for the ids they ship, with every eligible field, as `values()` does; while
`filter_fields` names a field the entry read is the one `values()` makes anyway, so the kind costs no
second read. A course with no value, value 0 or a value no kind describes is of the default kind, `course`
(`course_kinds.php:93-104`, ADR-019 Q3).

**2.2 One dispatch per response.** `course_kinds::field_id()` dispatches the hook through `ask()`
(`course_kinds.php:53-80`), so calling both would dispatch twice. The class gains one accessor returning the
field id and the kinds of a single dispatch, called once by each tier 3 response that ships rows. The hook's
nouns are plain, lower-case text, made for sentences ("event", `classes/hook/course_kinds.php`, `add_kind()`);
the pill needs sentence case, so the server upper-cases the first letter of the singular with `core_text`, and
the hook's contract does not change (theme_dimensions needs no release).

**2.3 The payload.** `get_inventory` gains `kinds`, a list of `{key, name}` in the listener's order without the
default kind, present only while the kinds are on (`VALUE_OPTIONAL`). A row gains `kd`, the index of its kind in
that list, omitted for the default kind, as `cf` indexes the top-level `fields` (`explore.php:879-892`). Rows of
`get_inventory_rows` and `search_inventory` index the same list, as their `cf` already indexes `get_inventory`'s
`fields`. At most 7 bytes a row, 1.75 KB raw at 250 rows all non-default, inside the ≤ 40 KB ceiling
(`test_the_saturated_payload_stays_under_the_ceiling`).

**2.4 Sharing the slot with New.** Slot 2 is one light pill at the cover's top left; today it holds *New* only
(`RowCard.tsx:133`, `Card.tsx:122`). Three ways:
- **A. New replaces the kind while the course is new.** It drops slot 2's own content for weeks, on the cards
  the learner is most likely to open, and an event that is new reads like a new course.
- **B. Both, kind first, then New.** Each pill keeps its meaning and its look; slot 2 becomes a row of at most
  two pills that wraps. On a card without a cover the row is the existing `compass-card-top`, whose inline end is
  kept free for the star and the crests (`styles.css:551-563`); two short pills fit, a long noun wraps.
- **C. The kind in slot 2, New as a state pill in slot 9.** It moves *New* on every site, with or without a
  listener.

**Decision: B** (answer 8). It is the only option that keeps both of the contract's sentences about slot 2:
the slot holds the kind "when the course has a kind" (A breaks it), and "the compass puts *Novo* in the same
place" (C breaks it, and the contract's rule that a surface "never reorders or restyles" a slot). It is also the
only one that leaves a site with no listener exactly as it is today.

**The Portuguese chip becomes "Novidade".** The maintainer's point: "Novo" is masculine and would sit beside a
kind noun of either gender ("novo curso", but "nova trilha"). The chip's string is `badge_new`, shipped by the
shell (`classes/output/block.php:183`) and drawn by `Card.tsx:122`, `RowCard.tsx:133` and `Row.tsx:133`. Its
`pt_br` value goes from "Novo" to the gender-neutral noun **"Novidade"** (`lang/pt_br/block_compass.php:42`);
the English "New" (`lang/en/block_compass.php:42`) does not change, nor does the key. On a list row the chip sits
inside the course link (`Row.tsx:131-134`), so the link's accessible name reads "{name} Novidade"; on the cards
it is outside the link. The strings that name a set of courses or enrolments keep their own wording, because they
agree with their own noun, never with a kind: `chip_new` "Novos" (the scope, drawn by `Explore.tsx:1360`),
`strip_new` "Novas inscrições", `strip_more_new` "+{$a} novos" and its labels `strip_more_new_label` and
`strip_more_new_label_one` (the strip's overflow link, `Block.tsx:510`), all in
`lang/pt_br/block_compass.php:289,454-456,460`. No test or Behat step names "Novo". This wording is revisable
on sight of the capture.

**2.5 Which kinds are drawn.** Not the default kind. With no listener, or a field that is not eligible, there is
no `kinds` member and no `kd`: today's cards, byte for byte. With a listener, a course of the default kind
draws no pill, so on a site where `course` is the only kind nothing is drawn; an event draws *Event*. The
argument is the contract's own state rule (D7): what is normal for the list is not said on every card, and in
a list of one's courses a course is normal. The theme's Vitrine draws *Curso* on every card; this departs from
it on purpose (answer 9).

**2.6 Surfaces.** `RowCard.tsx`, Explore's cards view, as above. `Row.tsx`, the list view, draws the kind before
*New* after the name, in the chip pair with the card's border, as the coverless card draws its chip
(`styles.css:560-563`); `Row.tsx:133` draws *New* as `badge bg-primary text-white`, not the chip, and is left as
it is. Tier 1's `Card.tsx` does not get it here: `get_attention` would dispatch the hook and read
`coursefields` for its cards, zero reads warm but up to two cold (the `filterfields` and `coursefields` fills),
against a budget of 8 that this record must not move (answer 11).

## Rejected

- **Reading the capability once at the course category, or keeping the system read and adding the teacher's
  course roles by SQL:** a second rule beside core's, wrong under overrides; core asks per course, so does this.
- **A *Hidden* header without a count, or decided on open:** 1.5. It shows students an empty door and saves no
  read.
- **Hidden rows in the first payload, marked in their category:** it grows the first paint by courses students
  cannot open, and leaves them padding the categories the teacher teaches in; the archive's reasons (ADR-007
  decision 2) hold.
- **The group named *hidden* in code:** `hidden_courses` and every `$hidden` are the archive (fact 3).
- **An `enable_hidden` setting:** 1.10.
- **Core's `badge bg-info text-white` for the pill:** a second look for one kind of fact; the contract's state
  pill is Compass's.
- **A `label` member added to the `course_kinds` hook:** a contract change for a capital letter `core_text`
  gives.
- **Reading the kind in tier 1 now:** 2.6.

## Consequences

- Tier 3 gains a group, a row key, a string and a pill; the details batch's visibility rule moves to the course
  context; no web service, cache definition, setting, schema or observer is added.
- Holders of the capability at the system context see their hidden courses move out of the category groups and
  the headline count fall by that number. Course-level teachers see their hidden courses, in *Hidden*, and their
  archived hidden courses, in *Archived*, for the first time.
- Tier 1 and tier 3 disagree on purpose about hidden courses for course-level teachers (1.6), and *Hidden* is as
  hard to reach as *Archived* until the follow-up record of 1.6 lands.
- `badge_new` reads "Novidade" in Portuguese wherever the chip is drawn, with or without a listener (2.4).
- `get_inventory`'s returns gain `kinds` and the shared row fields `invis` and `kd`, all optional, so a site
  with no hidden course and no listener sends exactly today's bytes.
- **Behat:** no scenario. The two features hold eight scenarios today against CLAUDE.md's "seven at most"; the
  maintainer should reconcile that line first.

### Tests and mutation gates

Behaviour, each with its control:
- A student enrolled in a hidden course never gets the group: no `-3` header from `get_inventory`, and an empty
  page from `get_inventory_rows` for `-3`, with a visible course of theirs listed as the control.
- A course-level teacher gets the group with the right count, its rows through `-3`, and not the course in its
  category group, in tier 1's strips or in `counts.total`.
- A holder at the system context gets the hidden course only in *Hidden*, never in a category group or in
  *Dormant*; a prohibit at the course's category keeps it out for them.
- Archived and hidden: in *Archived*, carrying `invis`, not in *Hidden*; unarchived, in *Hidden*. Hidden and
  dormant: in *Hidden*, not in *Dormant*.
- A course being deleted, hidden by core, is in no group for the capability's holder.
- `-4` is refused; `invis` and `kd` survive `clean_returnvalue()` in the three services and are omitted
  elsewhere.
- `get_card_details` answers a teacher's hidden course and drops a student's.
- Kinds: no listener, no `kinds` and no `kd`; a default-kind course has no `kd`; an event's `kd` names *Event*;
  the hook dispatched once per response.
- **Budgets:** `get_inventory` with a course-level teacher and three hidden courses costs the same as without
  (the claim of 1.5, `budget::start()` with the protocol of `get_inventory_test.php:472-486`); opening *Hidden*
  costs what opening *Archived* costs (`get_inventory_rows_test.php:569`); `get_card_details` with a hidden
  course stays at 1; kinds on add no read warm, and the cold cost is stated from H0's measurement.

Mutation gates, under "Phase 16" in `mutations/gates.conf`, swept on both database families before the commit
that adds them: the course-context capability in `resolve()` (made `false`, the teacher's test reddens; made
`true`, the student's); the hidden branch in `build()` (the system holder's test); `-3` in `RESERVED_GROUPS`;
archived before hidden; hidden before dormant; the per-course rule in `cards::details()`; the omission of
`kd` for the default kind; the single dispatch.

## Questions for the maintainer

All eleven were answered on 2026-11-13, each as the record proposed, and each answer is folded into the decision
it names: one rule for every viewer, the system-context holder included (1.2); *Archived* over *Hidden* (1.3);
the exact count (1.5); no pill inside *Hidden* (1.8); the paged search blind to it (1.4); no setting (1.10);
kind and *New* side by side, kind first (2.4), no default kind (2.5), the list view drawing it and tier 1 waiting
for its measurement (2.6). Two answers carried more than a yes. Answer 6 makes the reachability gap a known
limit with a named follow-up record, no longer an open question (1.6). Answer 8 adds the maintainer's wording
point: the Portuguese *New* chip becomes "Novidade", gender-neutral beside any kind, revisable on sight of the
capture (2.4). They are kept as written, for a reader arriving later.

1. Do hidden courses leave the category groups for holders of the capability at the system context too?
   (proposed: yes)
2. Does *Archived* win over *Hidden* for a course that is both? (proposed: yes)
3. Is the exact count in the *Hidden* header, asked per course at no read, accepted? (proposed: yes)
4. Is the *Hidden from students* pill drawn inside the *Hidden* group too? (proposed: no)
5. Does the paged-mode search stay blind to *Hidden*, as to *Archived*? (proposed: yes)
6. Should tier 1 offer *Explore all* when the ghost is zero but tier 3 holds a special group? (proposed: later, its
   own record)
7. Is the change unconditional, with no `enable_hidden` setting? (proposed: yes)
8. Do the kind and *New* share slot 2, kind first? (proposed: yes)
9. Is the default kind, *Course*, left undrawn? (proposed: yes)
10. Does the list view draw the kind too? (proposed: yes)
11. Does tier 1's card wait for its own measurement before drawing the kind? (proposed: yes)

## Cost

Reads through the service, CLAUDE.md §6.6's accounting (each "+ 1" the web-service layer's context read). "After"
assumes the protocol each budget test states: core warm, the shared layers warm unless the row says cold.

| Service | Before | After: Hidden | After: kinds on |
|---|---|---|---|
| `get_attention` | ≤ 7 warm / 8 cold, + 1 | unchanged (not touched) | unchanged (not touched) |
| `get_inventory` | ≤ 3 user layers cold / 6 all cold, + 1 | unchanged: the hidden header is 0 reads | 0 warm; cold + 1 (`coursefields` fill) and the `filterfields` fill when no filter field is configured, to be measured in H0 |
| `get_inventory_rows` | ≤ 3, + 1 | unchanged; a page of `-3` costs a page of `-2` | 0 warm; + 1 on a cold `coursefields` for the page |
| `search_inventory` | ≤ 3, + 1 | unchanged (the population is unchanged) | as `get_inventory_rows` |
| `get_card_details` | 1 + computed courses (+ 3 or 4 for a generated image, ADR-020) | unchanged: the per-course check is 0 reads | unchanged (not touched) |
| The shell | 0 | 0 (one more core string) | 0 |

The one cost that is not a read: one `has_capability()` per hidden course of the viewer, per tier 3 request
and per details batch holding one, measured in H0 with 200 hidden courses before the claim is written into a
docblock.

## Implementation stages

Tier 3 of the fleet's merge gate (capabilities and web services): `mdl ci moodle-block_compass --matrix --behat`
on the final head, the `security-diff-read` skill over the diff, and an MDL Shield review of the 5.3 pull request
only.

- **H0, measurements.** The budget tests of the Cost table written first, against the current code where they
  can be (the teacher's fixture, the hidden header's zero), and the cold cost of kinds without a filter field.
  Results go in this record before it is accepted.
- **H1, server (5.3).** `GROUP_INVISIBLE`; the per-course rule and the invisible population in `resolve()`,
  for the listed and the archived populations; `build()`, `rows()`; `RESERVED_GROUPS`; `invis` in `row()` and
  `row_fields()`; `cards::details()`; the string; the `total` description in `get_inventory`'s returns; docblocks
  (`explore.php:497-499` says the opposite today); `version.php` and `CHANGELOG.md`.
- **H2, client (5.3).** `types.ts`, `Explore.tsx` (`pagedgroup()`, the fetch-on-open effect, `slices`, `shown`,
  the name map, `isopen`), `StatePill.tsx` and the label from `block.php`, the `compass-state-invisible` rule;
  `mdl grunt m503 blocks/compass`, `mdl purge m503`.
- **H3, tests and gates.** The list above; `contrast_rules_test` gains the pill's pair; the sweep with
  `--fast --changed` on both families before the commit that adds the gates.
- **H4, documents.** README sections of 1.10; the ADR-000, ADR-007 and ADR-001 pointers; CLAUDE.md's SQL rule
  and the dormant and archived line of the client rules.
- **K1 to K3, kinds (5.3).** The single-dispatch accessor and `kinds`/`kd` on the server; the slot 2 row and the
  list view's chip on the client; `badge_new` = "Novidade" in `lang/pt_br` (the English string unchanged); tests
  and gates. Independent of H1 to H4, and may ship after them.
- **P, the 5.2 port (`MOODLE_502_STABLE`, version `20260420XX`).** The same server change, without the deletion
  clause: 5.2's `coursemeta` has no `deletioninprogress`. The client differs in transport only: 5.2's
  `repository.ts` reads through AMD `core/ajax` `call()`, not `fetchMany`, and the hidden group's pages are single
  `get_inventory_rows` reads on both branches, so the port touches no batching code; `mdl grunt m502
  blocks/compass` rebuilds the bundle. Kinds follow on 5.2 only where ADR-019's port has landed.

## Evidence

- The three system reads: `classes/local/attention.php:119,614-616`; `classes/local/explore.php:560-570`;
  `classes/local/cards.php:401-415`. Core's per-course rule: `public/lib/enrollib.php:825-836,956-968` (5.3).
- The system holder's mixed groups: `explore.php:562-565,153-194`.
- The word *hidden* is the archive: `classes/local/hidden_courses.php:18,38-40`; `explore.php:527`;
  `classes/local/inventory.php:327,362,399`.
- The archive's shape: `dormancy.php:48,51`; `explore.php:218-222,238-245,320-326,471-475`;
  `classes/external/get_inventory_rows.php:64,161-165`; `js/esm/src/Explore.tsx:503,522,588-595,715-722,729,
  1251-1252,1479-1490,1595,1677,1711,1737`; the populations: `explore.php:526-552`, `inventory.php:331-347`
  (active only for the archive), `:366-383,403-427`.
- Reachability: `js/esm/src/Block.tsx:173,485,533-534,643,666`; `classes/external/get_attention.php:117`.
- The capability's cost: `public/lib/accesslib.php:303-330,337-366,569-579,915-947,986-990`;
  `public/lib/classes/context.php:1000-1025`; `classes/local/prewarm.php:253`; the budget protocol,
  `tests/external/get_inventory_test.php:472-486` and `tests/generator/lib.php` (`simulate_new_request()`, which
  resets the context cache and the filters, not the access data).
- The course layer: `classes/local/course_meta.php:48-56,161-174,181-185`. Category hiding without a course event:
  `public/course/classes/category.php:2441,2448`; `classes/observer.php:129-134`.
- Core's pill: `public/lang/en/moodle.php:1028` (5.3), `:1023` (5.2); `public/course/templates/coursecard.mustache:68-72`.
  Core strings in the shell: `classes/output/block.php:206-208`. The state tokens: `styles.css:32-38,51,57`.
- The kinds: `classes/local/course_kinds.php:53-80,93-104`; `classes/hook/course_kinds.php` (`add_kind()`);
  `classes/local/course_fields.php:30-35,72-74`; `explore.php:621-627,879-892`. Slot 2 today: `RowCard.tsx:133`,
  `Card.tsx:122`, `Row.tsx:133`; `styles.css:551-563,580-594`.
