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
 * The per-user cache deletes the access and completion events ask for, sent in batches.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;


/**
 * Collects the user ids whose calendarstrip and news entries, and the details keys, events asked to drop,
 * and deletes them with one delete_many per definition.
 *
 * The three definitions have a TTL, so on Redis every single delete is two commands (the hash field and
 * the TTL set's member); a cohort sync or a CSV enrolment of 10,000 users raised, per user, one or more
 * role, enrolment, group or cohort events, and each deleted two entries on its own: tens of thousands
 * of commands sent while the sync waited. Collected, they go as one delete_many per definition:
 * - when BOUND entries are pending (a sync sends a batch every BOUND events, a few kilobytes of keys);
 * - at the end of the request, through the shutdown manager (registered once per instance);
 * - at the next event once the oldest pending delete has waited more than WAIT seconds: a CLI process
 *   (cron runs task after task in one process, and keeps it alive between runs) may end minutes later.
 *   Core 5.2 has no hook or event when a scheduled or adhoc task ends (only after_failed_task_max_delay,
 *   on exhaustion), so the time bound is the only seam there; a cron container that exits after its run
 *   flushes at its shutdown;
 * - before this process reads or writes an entry of a pending user, through the wrappers
 *   ({@see before_access()}): a request that changes a user's access and then renders their strip never
 *   serves the dropped entry, and an entry written after the event is never dropped by the later batch.
 *   Within the process, the order is the one immediate deletes had.
 *
 * Staleness this adds, for a reader in ANOTHER process (any node): the dropped entry may still be served
 * until this process sends the batch, at most WAIT seconds after the oldest pending delete when another
 * event follows, else until this request ends, or this CLI process does (a cron's keepalive, three
 * minutes by default). It stays bounded by the entries' own TTL (30 minutes for calendarstrip and news, one
 * hour for details), and a calendar strip entry is checked against the inventory stamp and the group set
 * whenever a new day is opened ({@see calendar\strip::revalidated()}). user_deleted does not come here: an
 * account's entries go at once.
 *
 * Cluster: the pending set is node-local, per-process state, held by core's DI container for the process
 * (reset between PHPUnit tests). That is correct here: it only delays deletes of shared entries that this
 * process's own events asked for; nothing else reads it, and no other node decides anything from it.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class pending_deletes {
    /**
     * @var int Pending entries that send the batch at once.
     *
     * 200 cuts a large sync's commands two hundredfold while each batch stays a few kilobytes of keys and
     * a burst of events waits well under a second; a larger bound would gain little and widen the window.
     */
    public const BOUND = 200;

    /** @var int Seconds the oldest pending delete may wait before the next event sends the batch. */
    public const WAIT = 5;

    /** @var array User id => true: the calendarstrip and news entries to drop. */
    private array $access = [];

    /** @var array details key => true: the progress entries to drop. */
    private array $progress = [];

    /** @var array User id => true: the users with a progress entry pending. */
    private array $progressusers = [];

    /** @var int|null The clock's time when the oldest pending delete was asked; null with nothing pending. */
    private ?int $since = null;

    /** @var bool Whether flush() is registered with the shutdown manager. */
    private bool $registered = false;

    /**
     * The process's instance, from core's DI container.
     *
     * @return self
     */
    public static function instance(): self {
        return \core\di::get(self::class);
    }

    /**
     * Drop the user's calendarstrip and news entries, with the next batch.
     *
     * @param int $userid The user.
     * @return void
     */
    public function drop_access(int $userid): void {
        $this->access[$userid] = true;
        $this->queued();
    }

    /**
     * Drop one progress entry, with the next batch.
     *
     * @param int $userid The user.
     * @param int $courseid The course.
     * @return void
     */
    public function drop_progress(int $userid, int $courseid): void {
        $this->progress[details::key($userid, $courseid)] = true;
        $this->progressusers[$userid] = true;
        $this->queued();
    }

    /**
     * Send the batch before an entry of a pending user is read or written in this process.
     *
     * Costs two lookups in memory when the user has nothing pending.
     *
     * @param int $userid The user whose entry is about to be read or written.
     * @return void
     */
    public function before_access(int $userid): void {
        if (isset($this->access[$userid]) || isset($this->progressusers[$userid])) {
            $this->flush();
        }
    }

    /**
     * Whether anything waits to be deleted.
     *
     * @return bool
     */
    public function pending(): bool {
        return $this->access !== [] || $this->progress !== [];
    }

    /**
     * Delete everything pending: one delete_many per definition.
     *
     * A definition's pending keys are forgotten only once its delete returned, so a delete that throws
     * leaves them for the next flush (at the latest the shutdown's), which deletes them again.
     *
     * @return void
     */
    public function flush(): void {
        if ($this->access) {
            $userids = array_keys($this->access);
            $this->delete('calendarstrip', $userids);
            $this->delete('news', $userids);
            $this->access = [];
        }
        if ($this->progress) {
            $this->delete('details', array_keys($this->progress));
            $this->progress = [];
            $this->progressusers = [];
        }
        $this->since = null;
    }

    /**
     * One delete_many on one definition, through its wrapper: the seam a test counts.
     *
     * @param string $area calendarstrip, news or details.
     * @param array $keys The keys.
     * @return void
     */
    protected function delete(string $area, array $keys): void {
        match ($area) {
            'calendarstrip' => calendar_cache::delete_many($keys),
            'news' => news_cache::delete_many($keys),
            'details' => details::delete_keys($keys),
        };
    }

    /**
     * After a delete was queued: register the shutdown flush once, and send the batch at the bound or the wait.
     *
     * @return void
     */
    private function queued(): void {
        $now = \core\di::get(\core\clock::class)->time();
        $this->since ??= $now;
        if (!$this->registered) {
            \core_shutdown_manager::register_function([$this, 'flush']);
            $this->registered = true;
        }
        if (count($this->access) + count($this->progress) >= self::BOUND || $now - $this->since > self::WAIT) {
            $this->flush();
        }
    }
}
