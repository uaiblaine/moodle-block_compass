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
 * The block stores two preferences of its own, and the provider declares and exports them.
 *
 * Preferences are exported into the system context, not the user's: that is where
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
     * The metadata names the two preferences and nothing else.
     *
     * @return void
     */
    public function test_the_two_preferences_are_the_only_things_declared(): void {
        $this->resetAfterTest();

        $items = provider::get_metadata(new collection('block_compass'))->get_collection();

        $this->assertCount(2, $items);
        $this->assertSame('block_compass_view', $items[0]->get_name());
        $this->assertSame('block_compass_explore', $items[1]->get_name());
    }

    /**
     * The remembered toolbar is exported as the JSON the viewer's own browser wrote.
     *
     * The first half is the control: a viewer with no stored toolbar has nothing to export.
     *
     * @return void
     */
    public function test_a_stored_toolbar_is_exported_as_it_stands_and_an_unset_one_is_not(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();

        provider::export_user_preferences((int) $user->id);
        $this->assertFalse(writer::with_context(\context_system::instance())->has_any_data());

        $json = '{"sort":"recent","chip":"new","cf":{},"panel":false}';
        set_user_preference('block_compass_explore', $json, $user);
        provider::export_user_preferences((int) $user->id);
        $exported = writer::with_context(\context_system::instance())->get_user_preferences('block_compass');

        $this->assertSame($json, $exported->block_compass_explore->value);
        $this->assertSame(
            get_string('privacy:metadata:preference:block_compass_explore', 'block_compass'),
            $exported->block_compass_explore->description
        );
        // The view, unset, is not invented alongside it.
        $this->assertObjectNotHasProperty('block_compass_view', $exported);
    }

    /**
     * The plugin counts as compliant: it implements the metadata provider and a data provider.
     *
     * Core's own compliance test sweeps every component but is not in the plugin's testsuite,
     * which is all moodle-plugin-ci runs, so the check is repeated here. A metadata provider
     * without a data provider passes every other test in this file and fails this one
     * ({@see \core_privacy\manager::component_is_compliant()}).
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
     * A stored value the plugin cannot draw is exported as it is, not relabelled as a view.
     *
     * Elsewhere such a value falls back to a view the client can render; the export must not
     * ({@see provider::export_user_preferences()}). The control comes first, for the same user:
     * the default view, the one token no other case stores, is exported as its label, so the
     * verbatim export that follows is the fallback arm's doing and not a relabelling that never
     * happens.
     *
     * Changes that must make it fail: an unknown value exported as a label, or the list token
     * exported as stored.
     *
     * @return void
     */
    public function test_a_value_outside_the_vocabulary_is_exported_as_it_stands(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();

        set_user_preference('block_compass_view', 'list', $user);
        provider::export_user_preferences((int) $user->id);
        $exported = writer::with_context(\context_system::instance())->get_user_preferences('block_compass');
        $this->assertSame(get_string('view_list', 'block_compass'), $exported->block_compass_view->value);

        set_user_preference('block_compass_view', 'sideways', $user);
        provider::export_user_preferences((int) $user->id);
        $exported = writer::with_context(\context_system::instance())->get_user_preferences('block_compass');
        $this->assertSame('sideways', $exported->block_compass_view->value);
    }
}
