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
 * Tests for the privacy provider.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\privacy;

use core_privacy\local\metadata\collection;
use core_privacy\local\request\writer;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The block stores one thing of its own, and this is what says so.
 *
 * The preference is exported into the system context, not the user's: that is where
 * writer::export_user_preference() puts every preference
 * (privacy/classes/local/request/writer.php:127-135), so a test reading the user context
 * would find nothing and pass for the wrong reason.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(provider::class)]
final class provider_test extends \core_privacy\tests\provider_testcase {
    /**
     * The metadata names the preference and nothing else.
     *
     * @return void
     */
    public function test_the_view_preference_is_the_only_thing_declared(): void {
        $this->resetAfterTest();

        $items = provider::get_metadata(new collection('block_compass'))->get_collection();

        $this->assertCount(1, $items);
        $this->assertSame('block_compass_view', $items[0]->get_name());
    }

    /**
     * The plugin counts as compliant, which is a statement about the pair of interfaces.
     *
     * Core's own compliance test sweeps every component, and nothing in this plugin's
     * pipeline runs it: moodle-plugin-ci runs the component's own testsuite. So the check is
     * made here, where it is part of the phase that made it necessary — a metadata provider
     * without a data provider passes every other test in this file and fails this one
     * (privacy/classes/manager.php:143-159).
     *
     * @return void
     */
    public function test_the_component_is_compliant(): void {
        $this->assertTrue((new \core_privacy\manager())->component_is_compliant('block_compass'));
    }

    /**
     * A viewer who never chose has nothing to export; one who chose has their choice.
     *
     * The first half is the control: without it the second would pass against a provider
     * that exported the same sentence for everybody.
     *
     * @return void
     */
    public function test_a_stored_view_is_exported_and_an_unset_one_is_not(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();

        provider::export_user_preferences((int) $user->id);
        $this->assertFalse(writer::with_context(\context_system::instance())->has_any_data());

        set_user_preference('block_compass_view', 'cards', $user);
        provider::export_user_preferences((int) $user->id);
        $exported = writer::with_context(\context_system::instance())->get_user_preferences('block_compass');

        $this->assertSame(
            get_string('view_cards', 'block_compass'),
            $exported->block_compass_view->value
        );
        $this->assertSame(
            get_string('privacy:metadata:preference:block_compass_view', 'block_compass'),
            $exported->block_compass_view->description
        );
    }

    /**
     * A stored value the plugin cannot draw is exported as it is, not as a view.
     *
     * Everywhere else in the plugin such a value falls back to something renderable, because
     * a view React does not know renders nothing. An export is the one place where that
     * would be wrong: it answers "what is held about me", so labelling an unknown token
     * "List" would tell the person they chose something they never chose.
     *
     * @return void
     */
    public function test_a_value_outside_the_vocabulary_is_exported_as_it_stands(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        set_user_preference('block_compass_view', 'sideways', $user);

        provider::export_user_preferences((int) $user->id);
        $exported = writer::with_context(\context_system::instance())->get_user_preferences('block_compass');

        $this->assertSame('sideways', $exported->block_compass_view->value);
        // Control: the same export names a value it does know.
        $this->assertNotSame(get_string('view_list', 'block_compass'), $exported->block_compass_view->value);
    }
}
