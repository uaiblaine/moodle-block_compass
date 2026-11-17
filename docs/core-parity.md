# Core parity of the progress rule

Compass computes a learner's course progress by core's rule
(`core_completion\progress::get_course_progress_percentage()`), with one call replaced: the list filter
of a restricted activity is judged for the one learner instead of listing every member of every group
(ADR-027). This file is how the copy stays equal to core: what holds it, when to audit, and the log of
every audit.

## What holds it

| Guard | Where | Reddens when |
|---|---|---|
| The oracle | `tests/local/progress/core_parity_test.php` | Compass and core count a different set of activities, or a different percentage, for any learner of the matrix course, in any of its five scenarios. Runs on every CI leg. |
| The fingerprint | `tests/local/progress/core_fingerprint_test.php`, `tests/fixtures/core_parity.json` | Core changed the code of a mirrored function (comments and whitespace aside), removed one, or changed which condition types filter user lists. |
| The restrictions' own oracle | `tests/local/progress/learner_restrictions_test.php` | `learner_restrictions` and `info_module::filter_user_list()` disagree for one learner, read by four viewers. |
| The weekly look upstream | the fleet's scheduled check (ADR-027 decision 7) | Core's `MOODLE_503_STABLE` moved a fingerprinted function. Report only. |

The fingerprint reddens on purpose. The fleet runs the GitHub pipeline only on the commit a release
tag goes on, so a core point release that moved this code stops the release until it is audited; a
development stack moved to a new core stops the same way.

The same rule has a twin in `local_dimensions` (`local\learner_restrictions` and
`local\single_user_capability_checker`, copied whole). An audit reads both, and a change to one is
made to the other in the same round.

## When to audit

- The fingerprint or the oracle reddens (a stack, `mdl ci`, the release pipeline).
- The weekly look upstream reports a moved function.
- Before every release of this plugin, even with everything green: step 3 below is the part no test
  can do.

## The audit

1. **Run the oracle on the new core.** `mdl phpunit <stack> blocks/compass/tests/local/progress/`
   on a stack at that core (or `mdl ci moodle-block_compass-503 --only phpunit`). A red oracle is a
   behaviour difference: the rule must follow core before anything else.
2. **Read core's diff for every symbol the fingerprint names.**
   `git -C ~/dev/moodle-503 diff <audited tag> <new tag> -- public/<file>`, the tag in the manifest's
   `audited`. `php blocks/compass/cli/core_parity.php` on the stack lists what moved; with
   `--root=<path>` it reads another checkout.
3. **Search the tracker** for issues fixed since the audited release in `core_completion` (progress,
   `get_user_activities_with_completion`, `count_modules_completed`) and `core_availability`
   (`filter_user_list`, `is_applied_to_user_lists`, `capability_checker`, the group, grouping and
   profile conditions), and for new condition types in core.
4. **Decide, change by change.** Either the rule follows it (code in `classes/local/progress/`, a new
   case in the oracle's matrix that reddens without the code, the twin in `local_dimensions`), or it
   changes nothing the rule depends on (a line in the log below saying why).
5. **Record it.** `php blocks/compass/cli/core_parity.php --rebuild=<new tag> > tests/fixtures/core_parity.json`
   on a stack at the new core, then a log line below, a `CHANGELOG.md` line and the version bump in the
   same commit. The manifest's symbols are a list to extend: a new function the rule comes to lean on
   gets an entry, with `"hash": null`, before the rebuild.

If a site already runs a core whose answer differs, *Progress calculation*
(`block_compass/progress_source`) set to *Moodle core* brings core's own function back at once, until
the release that follows core is installed.

## Log

| Date | Core audited | Result |
|---|---|---|
| 2026-11-17 | v5.3.1 (`cfe123f26fc`) | First manifest, 23 functions; list-filtering condition types group, grouping, profile. The oracle agrees in all five scenarios. Recorded: core's fast path (MDL-88922) skips every check for an activity with no restriction of its own, its section's included; in effect nothing is skipped, because such an activity in a section the learner fails is already off the course page. The rule follows the fast path as written. |
