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
 * Scheduled task: pre-warm the inventory of recently active users.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\task;

use block_compass\local\config;
use block_compass\local\prewarm;
use core\task\scheduled_task;

/**
 * Optional, selective, budgeted pre-warming (PLAN.md §6.4, ADR-003).
 *
 * Always scheduled (db/tasks.php, 04:00 site time by default) and gated by the
 * enable_prewarm setting, so one switch controls the feature. A thin caller: the
 * work — selection, resume cursor, time budget, what "warm one user" means — lives
 * in prewarm::run(), which tests drive directly with a small batch and budget.
 * Nothing here throws on a permanent condition: cron would retry it for ever.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class warm_active_users extends scheduled_task {
    /**
     * The name shown on the scheduled tasks page.
     *
     * @return string
     */
    public function get_name(): string {
        return get_string('task_warm_active_users', 'block_compass');
    }

    /**
     * Run one budgeted slice of the sweep, or say why nothing was done.
     *
     * @return void
     */
    public function execute(): void {
        if (!config::prewarm_enabled()) {
            mtrace('block_compass: pre-warming is off (enable_prewarm); nothing to do.');
            return;
        }

        // The sweep's own trace prints the opening count, one line per batch and the closing
        // summary through mtrace(); printing it again here would double every cron log.
        prewarm::run();
    }
}
