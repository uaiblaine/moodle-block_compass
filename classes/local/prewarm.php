<?php
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
 * Pre-warming: the work behind the warm_active_users task.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use core_php_time_limit;

/**
 * Warm the inventory of every user active inside a window, in batches, under a time budget,
 * resuming where the last run stopped (PLAN.md §6.4, ADR-003).
 *
 * The shape is core's search indexer's (\core_search\manager::index(),
 * search/classes/manager.php:1201): a stop time computed once, checked between units of
 * work, a persisted cursor. A sweep starts at cursor 0, fixes its lastaccess window in
 * plugin config, walks {user} by primary key in batches of BATCH_SIZE, and ends when a
 * batch comes back short — resetting the cursor to 0 and recording the time. A run that
 * exhausts its budget leaves the cursor where it stopped and the next run continues from
 * there. Per user: the inventory is filled (never validated: a valid hit does not renew
 * the TTL, ADR-003 fact 2) and the shared layers are made to hold that user's courses and
 * groups; details is never touched. The task's execute() is a thin caller; tests drive
 * run() directly with a batch of 1 and a budget below the settings floor.
 *
 * No lock of its own: cron takes one named after the task class before running it —
 * "$cronlockfactory->get_lock(($record->classname), 0)", lib/classes/task/manager.php:1067 —
 * so two cron workers never run the task at once.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class prewarm {
    /** @var int Users selected per query: bounds the id list in memory and the interval between cursor writes. */
    public const BATCH_SIZE = 200;

    /** @var string Plugin config key: id of the last user warmed, 0 between sweeps. */
    public const CONFIG_CURSOR = 'prewarm_cursor';

    /** @var string Plugin config key: the lastaccess floor of the running sweep, fixed when it starts. */
    public const CONFIG_SINCE = 'prewarm_since';

    /** @var string Plugin config key: when the last sweep completed. */
    public const CONFIG_LASTSWEEP = 'prewarm_lastsweep';

    /**
     * One run: warm users from the cursor onwards until the sweep ends or the budget runs out.
     *
     * The time budget is checked between users against a stop time computed once, as the
     * search indexer does; core_php_time_limit::raise() is called too, as the indexer does
     * (search/classes/manager.php:1213), knowing it is a no-op under CLI_SCRIPT — every
     * context a scheduled task runs in: "if (self::$currentend === 0 || CLI_SCRIPT) { return; }",
     * lib/classes/php_time_limit.php:66-68 — and that the CLI SAPI has no execution limit by
     * default. The stop-time check is the real protection.
     *
     * Reads: 1 for the opening count; 1 per selection (each batch, including the short one that
     * ends the sweep); per user 1 (the fill) with the shared layers warm — up to 4 cold (fill,
     * coursemeta, categorymeta for the courses' categories, categorymeta for the group ancestors),
     * 2 for a user with no enrolment at all (an empty fill runs the stamp statement,
     * inventory::fill()); and 1 per config write, because set_config() reads the row before it
     * decides between insert and update ("$record = $DB->get_record($table, $conditions, 'id,
     * value')", lib/moodlelib.php:968). The config writes are: the window once per sweep, the
     * cursor after every full batch and at a budget stop, and at completion the cursor reset plus
     * the completion time — so a sweep that completes in one batch writes three times. Bypassing
     * set_config() to save those reads would skip the config cache invalidation and leave the next
     * run reading a stale cursor; the reads are the price of a resumable sweep.
     *
     * @param int|null $batchsize Users per selection; null for BATCH_SIZE.
     * @param int|null $budgetseconds Seconds before the run stops between users; null for the setting.
     *     Not floored here: the setting's reader applies the floor, tests pass what they need.
     * @param int|null $now Unix time to treat as now; null for time().
     * @param callable|null $trace Receives each progress line as a string; null for mtrace().
     * @return array warmed (users warmed this run), batches (selection queries issued), completed (the
     *     sweep ended this run), cursor (0 when completed, else the id of the last user warmed),
     *     remaining (users still to warm when the run started, cursor applied), elapsed (seconds).
     */
    public static function run(
        ?int $batchsize = null,
        ?int $budgetseconds = null,
        ?int $now = null,
        ?callable $trace = null
    ): array {
        global $DB;

        $now ??= time();
        $batchsize = max(1, $batchsize ?? self::BATCH_SIZE);
        $budget = $budgetseconds ?? config::prewarm_budget_seconds();
        $trace ??= static function (string $line): void {
            mtrace($line);
        };
        $started = microtime(true);
        $stopat = $started + $budget;

        // Defensive only: a no-op under CLI_SCRIPT (see the docblock); the stop time does the work.
        core_php_time_limit::raise($budget + 60);

        $cursor = (int) get_config('block_compass', self::CONFIG_CURSOR);
        $since = (int) get_config('block_compass', self::CONFIG_SINCE);
        if ($cursor === 0 || $since === 0) {
            // A sweep starts (or its window went missing under it): fix the window for the whole
            // sweep, so that a sweep spanning several nights keeps one floor from start to end and
            // a change of prewarm_days takes effect at the next sweep.
            $since = $now - config::prewarm_days() * DAYSECS;
            set_config(self::CONFIG_SINCE, $since, 'block_compass');
        }
        $groupdepth = config::group_depth();

        // Once per run, for the opening line — never per batch. Index: the {user} primary key
        // drives the scan and lastaccess/deleted/suspended are applied as an in-scan filter, not
        // a separate index access (ADR-003, evidence: Parallel Index Scan on the primary key,
        // 82.7 ms). Bounded: an aggregate.
        $remaining = $DB->count_records_sql(
            "SELECT COUNT(*)
               FROM {user} u
              WHERE u.lastaccess >= :since AND u.deleted = 0 AND u.suspended = 0 AND u.id > :cursor",
            ['since' => $since, 'cursor' => $cursor]
        );
        $opening = sprintf(
            'block_compass: %d users active since %s to warm, %s.',
            $remaining,
            userdate($since),
            $cursor > 0 ? "resuming after id {$cursor}" : 'new sweep'
        );
        $trace($opening);

        $warmed = 0;
        $batches = 0;
        $completed = false;
        $exhausted = false;
        while (!$completed && !$exhausted) {
            // Index: {user} primary key drives the keyset; the lastaccess window is the filter (index
            // lastaccess exists, but the ordered keyset makes the primary key cheaper — ADR-003,
            // evidence). Bound: the batch size, passed as get_records_sql()'s limitnum
            // (lib/dml/moodle_database.php:1523); get_fieldset_sql() takes no limit on 5.2
            // (moodle_database.php:1797). Keyed by u.id, the first selected column.
            $records = $DB->get_records_sql(
                "SELECT u.id
                   FROM {user} u
                  WHERE u.lastaccess >= :since AND u.deleted = 0 AND u.suspended = 0 AND u.id > :cursor
               ORDER BY u.id",
                ['since' => $since, 'cursor' => $cursor],
                0,
                $batchsize
            );
            $ids = array_keys($records);
            $batches++;

            foreach ($ids as $id) {
                $userid = (int) $id;
                try {
                    self::warm($userid, $now, $groupdepth);
                    $warmed++;
                } catch (\Throwable $e) {
                    /*
                     * One unwarmable user must not wedge the sweep: cron retries a throwing task
                     * for ever (\core\task\manager::scheduled_task_failed(), back-off capped at
                     * 24 h) and the selection is "id > cursor", so an exception escaping here
                     * would re-select the same user on every run, for ever. Nothing warm() does
                     * throws on any data state a fixture can build — every step guards its own
                     * emptiness and indexes no key it has not checked — so this catch is
                     * insurance against the layers underneath (a cache store, the database, a
                     * later change to fill()), and it carries no test and no mutation gate for
                     * exactly that reason. Do not delete it as dead code: what it prevents is a
                     * sweep that never advances again.
                     */
                    $trace(sprintf('block_compass: pre-warm failed for user %d: %s', $userid, $e->getMessage()));
                }
                // Outside the try: advancing the cursor is what makes a failure survivable.
                $cursor = $userid;
                if (microtime(true) >= $stopat) {
                    // Checked between users, never inside one: a user is one fill plus cache reads,
                    // so nobody is left half warmed.
                    $exhausted = true;
                    break;
                }
            }

            if (!$exhausted && count($ids) < $batchsize) {
                // A short batch ends the sweep: the next run starts a new one with a fresh window.
                $completed = true;
                set_config(self::CONFIG_CURSOR, 0, 'block_compass');
                set_config(self::CONFIG_LASTSWEEP, $now, 'block_compass');
            } else {
                set_config(self::CONFIG_CURSOR, $cursor, 'block_compass');
            }
            // In-memory counters only: the progress line costs no query.
            $progress = sprintf(
                'block_compass: batch %d done, %d users warmed, %.1f s elapsed, cursor %d.',
                $batches,
                $warmed,
                microtime(true) - $started,
                $completed ? 0 : $cursor
            );
            $trace($progress);
        }

        // The closing line belongs to the method that holds the trace, so every caller — the
        // scheduled task, a future CLI, a test — reports the same sweep the same way, once.
        $trace($completed
            ? sprintf('block_compass: sweep complete, %d users warmed.', $warmed)
            : sprintf('block_compass: budget reached after %d users; resuming at id %d.', $warmed, $cursor));

        return [
            'warmed' => $warmed,
            'batches' => $batches,
            'completed' => $completed,
            'cursor' => $completed ? 0 : $cursor,
            'remaining' => $remaining,
            'elapsed' => microtime(true) - $started,
        ];
    }

    /**
     * Warm one user: the inventory entry, the course layer of the active courses, the category
     * layer of their categories and of the group ancestors (ADR-003, "What warm one user means").
     *
     * fill() rather than get(): a valid hit does not rewrite the entry, so its TTL is not renewed
     * and a daily visitor's entry would still expire before the visit (fact 2); the fill also sees
     * the status writes the stamp cannot. No hidden set: hidden courses need their coursemeta entry
     * too (the Archived group), and the preferences would cost a read for nothing. No visibility
     * filter, no formatting, no filter preload: this warms stores, it renders nothing. The same
     * two-list shape as explore::resolve() for the category layer. details is never touched.
     *
     * @param int $userid The user.
     * @param int $now Unix time to treat as now, for the active-enrolment rule.
     * @param int $groupdepth Category depth that forms the groups, at least 1.
     * @return void
     */
    private static function warm(int $userid, int $now, int $groupdepth): void {
        $entry = inventory::fill($userid);
        $active = inventory::courses($entry, $now);
        if (empty($active)) {
            return;
        }

        $meta = course_meta::get_many(array_keys($active));
        if (empty($meta)) {
            return;
        }

        $categories = category_meta::get_many(array_unique(array_column($meta, 'category')));
        $missing = [];
        foreach ($categories as $category) {
            $groupid = category_meta::group_id($category, $groupdepth);
            if (!isset($categories[$groupid])) {
                $missing[$groupid] = true;
            }
        }
        if (!empty($missing)) {
            category_meta::get_many(array_keys($missing));
        }
    }
}
