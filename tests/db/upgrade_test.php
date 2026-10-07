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
 * Tests for the Compass block's upgrade steps.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\db;

use advanced_testcase;
use PHPUnit\Framework\Attributes\CoversFunction;

/**
 * The upgrade steps, run against a site on the version before each.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversFunction('xmldb_block_compass_upgrade')]
final class upgrade_test extends advanced_testcase {
    /**
     * Load the upgrade library and the plugin's steps.
     *
     * @return void
     */
    public static function setUpBeforeClass(): void {
        global $CFG;

        require_once($CFG->libdir . '/upgradelib.php');
        require_once($CFG->dirroot . '/blocks/compass/db/upgrade.php');
        parent::setUpBeforeClass();
    }

    /**
     * An upgrading site gets the theme's crests off, unless an administrator already chose.
     *
     * The step writes off only when the setting is unset: a new install takes the setting's
     * default instead, which the step never sees, and a value already stored is a choice. The
     * control is the second run, over a stored on, which stays on.
     *
     * @return void
     */
    public function test_an_upgrade_turns_the_crests_off_unless_they_were_set(): void {
        $this->resetAfterTest();

        unset_config('show_theme_badges', 'block_compass');
        set_config('version', 2026092403, 'block_compass');
        $this->assertTrue(xmldb_block_compass_upgrade(2026092403));
        $this->assertSame('0', get_config('block_compass', 'show_theme_badges'));
        $this->assertGreaterThanOrEqual(2026092404, (int) get_config('block_compass', 'version'));

        set_config('show_theme_badges', 1, 'block_compass');
        set_config('version', 2026092403, 'block_compass');
        xmldb_block_compass_upgrade(2026092403);
        $this->assertSame('1', get_config('block_compass', 'show_theme_badges'));
    }
}
