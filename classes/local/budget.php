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
 * Query budget meter.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use core\exception\coding_exception;

/**
 * Counts the database reads a piece of code costs (PLAN.md §6.6).
 *
 * Wraps $DB->perf_get_reads(), which counts every SELECT the connection has
 * issued since it opened — core's own included. Take a reading, run the code,
 * assert the delta. Because core's reads are counted too, the measurement
 * protocol is fixed, and it counts reads per REQUEST. Warm what core keeps
 * across requests (config, strings, contexts, capabilities — MUC and the
 * session) by running the code once. Then reset what core keeps for one request
 * only, in PHP globals, and would reload on a real second request: the filter
 * array $FILTERLIB_PRIVATE and the user's preference bundle ($USER->preference,
 * reloaded by check_user_preferences_loaded() in lib/moodlelib.php whenever it
 * is unset) — core's MODE_REQUEST caches are the same kind of state, which is why
 * this plugin reads none of them on its hot path. Purge the user's own layers
 * (inventory, details), keep the shared layers (coursemeta, categorymeta) warm,
 * and measure the second run. The budget table's figures are that state; every
 * cold shared layer adds one read, and the fully-cold bound stands beside each
 * figure.
 *
 * The counter is per statement, not per logical query. On PostgreSQL a
 * recordset ($DB->get_recordset*) is executed as DECLARE, FETCH and CLOSE and
 * costs three reads where MariaDB counts one (measured on 5.2). Budgets are
 * therefore written for array-returning, bounded queries only; classes/local/
 * never opens a recordset.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class budget {
    /** @var int Reads the connection had issued when the meter started. */
    private int $startreads;

    /** @var float Wall-clock time when the meter started, in seconds. */
    private float $starttime;

    /**
     * Use start().
     *
     * @param int $startreads Reads at start.
     * @param float $starttime Microtime at start.
     */
    private function __construct(int $startreads, float $starttime) {
        $this->startreads = $startreads;
        $this->starttime = $starttime;
    }

    /**
     * Start a meter now.
     *
     * @return self
     */
    public static function start(): self {
        global $DB;

        return new self((int) $DB->perf_get_reads(), microtime(true));
    }

    /**
     * Database reads issued since the meter started.
     *
     * @return int
     */
    public function reads(): int {
        global $DB;

        return (int) $DB->perf_get_reads() - $this->startreads;
    }

    /**
     * Seconds elapsed since the meter started.
     *
     * @return float
     */
    public function elapsed(): float {
        return microtime(true) - $this->starttime;
    }

    /**
     * Run a callable and report what it cost.
     *
     * @param callable $fn The code to measure.
     * @return array The callable's return value at index 0 and the reads it cost at index 1.
     */
    public static function measure(callable $fn): array {
        $meter = self::start();
        $result = $fn();

        return [$result, $meter->reads()];
    }

    /**
     * Fail loudly when the reads exceed the budget.
     *
     * @param int $max The budget, in reads.
     * @param string $label What was measured, for the message.
     * @return void
     * @throws coding_exception When the reads exceed the budget.
     */
    public function assert_reads_at_most(int $max, string $label): void {
        $reads = $this->reads();
        if ($reads > $max) {
            throw new coding_exception("block_compass budget exceeded for {$label}: {$reads} reads, budget {$max}.");
        }
    }
}
