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
 * Tests for the uninstall cleanup.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\CoversFunction;

/**
 * Uninstalling removes every user's Compass preferences and nobody else's rows.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(uninstall::class)]
#[CoversFunction('xmldb_block_compass_uninstall')]
final class uninstall_test extends advanced_testcase {
    /**
     * The four preferences go for every user; the archive and a name sharing the prefix stay.
     *
     * The archive rows are the Course overview block's, which Compass shares and must leave to it,
     * and block_compassion is another component's name that a prefix match would reach. The control
     * is the count before: the rows the uninstall must remove were there, so their absence after is
     * the uninstall's doing.
     *
     * @return void
     */
    public function test_uninstall_deletes_the_plugins_preferences_and_nothing_else(): void {
        global $CFG, $DB;

        require_once($CFG->dirroot . '/blocks/compass/db/uninstall.php');
        $this->resetAfterTest();
        $users = [$this->getDataGenerator()->create_user(), $this->getDataGenerator()->create_user()];
        $ours = ['block_compass_view', explore_preference::NAME, calendar_preference::NAME, tier1_preference::NAME];
        foreach ($users as $user) {
            set_user_preference('block_compass_view', 'cards', $user);
            set_user_preference(explore_preference::NAME, '{"sort":"az"}', $user);
            set_user_preference(calendar_preference::NAME, '{"open":true}', $user);
            set_user_preference(tier1_preference::NAME, '{"v":1}', $user);
            set_user_preference('block_myoverview_hidden_course_42', 1, $user);
            set_user_preference('block_compassion', 'kept', $user);
        }
        [$insql, $params] = $DB->get_in_or_equal(array_column($users, 'id'), SQL_PARAMS_NAMED);
        $select = "userid {$insql} ORDER BY name, userid";
        $names = fn(): array => $DB->get_fieldset_select('user_preferences', 'name', $select, $params);
        $this->assertCount(8, array_intersect($names(), $ours), 'control: both users hold the four preferences');

        $this->assertTrue(xmldb_block_compass_uninstall());

        $this->assertSame(
            ['block_compassion', 'block_compassion', 'block_myoverview_hidden_course_42', 'block_myoverview_hidden_course_42'],
            $names()
        );
    }
}
