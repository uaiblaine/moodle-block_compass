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
 * Add, then remove, the days off the strip shows in the screenshots (development sites only, CLI).
 *
 * With block_feedback_tracker installed the strip reads the institution's days off from
 * {block_feedback_tracker_cday} (ADR-014 amendment 10). This script writes a recess and a holiday
 * into the strip's visible row for the capture only: --add inserts them on dates relative to today,
 * refusing any date that already has a row, and records the new ids in holidays-state.json beside
 * it; --remove deletes exactly those ids and forgets them. Both purge the calendarstrip cache, so
 * that every strip is rebuilt with, then without, the rows.
 *
 * Usage, inside the stack's webserver container:
 *   php public/blocks/compass/docs/screenshots/tools/holidays.php --add
 *   php public/blocks/compass/docs/screenshots/tools/holidays.php --remove
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('CLI_SCRIPT', true);

require(__DIR__ . '/../../../../../config.php');
require_once($CFG->libdir . '/clilib.php');

[$options] = cli_get_params(['add' => false, 'remove' => false, 'help' => false], ['h' => 'help']);
if ($options['help'] || $options['add'] === $options['remove']) {
    echo "Add or remove the screenshot days off.\n\nOptions:\n  --add     insert them and record their ids\n"
        . "  --remove  delete the recorded ids\n";
    exit($options['help'] ? 0 : 1);
}

$table = 'block_feedback_tracker_cday';
if (!$DB->get_manager()->table_exists($table)) {
    cli_error('block_feedback_tracker is not installed: the strip reads core\'s weekend only.');
}
$statefile = __DIR__ . '/holidays-state.json';

if ($options['add']) {
    if (file_exists($statefile)) {
        cli_error('Rows from an earlier --add are still recorded in ' . $statefile . '; run --remove first.');
    }
    $today = (new \DateTimeImmutable('now', \core_date::get_server_timezone_object()))->setTime(0, 0);
    $rows = [
        [5, 'recess', 'Mid-term break'],
        [9, 'holiday', 'Founders\' Day'],
    ];
    $ids = [];
    foreach ($rows as [$days, $type, $note]) {
        $daydate = (int) $today->modify('+' . $days . ' days')->format('Ymd');
        if ($DB->record_exists($table, ['daydate' => $daydate])) {
            cli_error('A row for ' . $daydate . ' already exists; nothing was changed for it.');
        }
        $ids[] = (int) $DB->insert_record($table, (object) [
            'daydate' => $daydate,
            'daytype' => $type,
            'starttime' => null,
            'endtime' => null,
            'note' => $note,
            'usermodified' => get_admin()->id,
            'timecreated' => time(),
            'timemodified' => time(),
        ]);
        mtrace("Inserted {$type} on {$daydate}");
    }
    file_put_contents($statefile, json_encode(['ids' => $ids]));
    mtrace('Ids: ' . implode(', ', $ids));
} else {
    if (!file_exists($statefile)) {
        cli_error('No recorded rows in ' . $statefile . '.');
    }
    $ids = json_decode(file_get_contents($statefile), true)['ids'];
    $DB->delete_records_list($table, 'id', $ids);
    unlink($statefile);
    mtrace('Deleted ids: ' . implode(', ', $ids));
}

\cache_helper::purge_by_definition('block_compass', 'calendarstrip');
mtrace('Purged block_compass/calendarstrip.');
