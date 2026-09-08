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
 * Tests for the filter panel's vocabulary.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use core\exception\invalid_parameter_exception;
use core_cache\cache;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The filterfields wrapper (ADR-009, decision 5): which fields are offered, how their chips are
 * keyed, what the configured subset is, and what a filters parameter may say.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(filter_fields::class)]
final class filter_fields_test extends advanced_testcase {
    /** @var \block_compass_generator The plugin's fixture helpers. */
    private $plugingen;

    /**
     * A clean definition and the plugin generator.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        cache::make('block_compass', 'filterfields')->purge();
        $this->plugingen = $this->getDataGenerator()->get_plugin_generator('block_compass');
    }

    /**
     * Only the select and checkbox types visible to everyone are offered, with core's own keys.
     *
     * Excluded, each for one reason: a text field (open vocabulary), a teachers-only select and
     * a hidden checkbox (a chip over either is an oracle for a value the learner may not see). A
     * select's options are keyed 1..n in core's order — 0 is core's empty slot and never a chip —
     * and its default is the key of the configured default option; a checkbox has no options and
     * its default is checkbydefault. Names and options are stored raw. The site may carry course
     * custom fields of its own (other plugins install some), so the assertions are about the
     * fields this test created and their relative order, never about the whole list.
     *
     * @return void
     */
    public function test_only_select_and_checkbox_fields_visible_to_everyone_are_eligible(): void {
        $modality = $this->plugingen->course_field(
            'select',
            'modality',
            ['options' => "Online\nOn campus\nHybrid", 'defaultvalue' => 'On campus'],
            'Course & modality'
        );
        $certified = $this->plugingen->course_field('checkbox', 'certified', ['checkbydefault' => 1]);
        $this->plugingen->course_field('text', 'code');
        $this->plugingen->course_field('select', 'internal', ['options' => "A\nB", 'visibility' => 1]);
        $this->plugingen->course_field('checkbox', 'secret', ['visibility' => 0]);
        $this->plugingen->course_field('select', 'plain', ['options' => "One\nTwo"]);

        $eligible = filter_fields::eligible();

        $ours = ['modality', 'certified', 'code', 'internal', 'secret', 'plain'];
        $this->assertSame(['modality', 'certified', 'plain'], array_values(array_intersect(array_keys($eligible), $ours)));
        $this->assertSame([
            'id' => (int) $modality->get('id'),
            'shortname' => 'modality',
            'name' => 'Course & modality',
            'type' => 'select',
            'options' => [1 => 'Online', 2 => 'On campus', 3 => 'Hybrid'],
            'default' => 2,
        ], $eligible['modality']);
        $this->assertSame([
            'id' => (int) $certified->get('id'),
            'shortname' => 'certified',
            'name' => 'certified',
            'type' => 'checkbox',
            'options' => [],
            'default' => 1,
        ], $eligible['certified']);
        $this->assertSame(0, $eligible['plain']['default'], 'no configured default is the empty slot');

        // The chips: a select's options as formatted labels, a checkbox as yes and no.
        $this->assertSame([1 => 'Online', 2 => 'On campus', 3 => 'Hybrid'], filter_fields::values($eligible['modality']));
        $this->assertSame([1 => get_string('yes'), 0 => get_string('no')], filter_fields::values($eligible['certified']));
    }

    /**
     * The vocabulary is read once and cached; the configured subset is read out of it in the setting's order.
     *
     * A configured shortname that is not eligible — never existed, or is a text field — is
     * dropped rather than answered with an empty group. With nothing configured nothing is read.
     *
     * @return void
     */
    public function test_the_configured_subset_follows_the_setting_and_drops_what_is_not_eligible(): void {
        $this->plugingen->course_field('select', 'modality', ['options' => "Online\nOn campus"]);
        $this->plugingen->course_field('checkbox', 'certified');
        $this->plugingen->course_field('text', 'code');
        filter_fields::eligible();

        $meter = budget::start();
        $configured = filter_fields::configured(['certified', 'code', 'gone', 'modality']);
        $this->assertSame(0, $meter->reads(), 'the vocabulary is one cached entry');
        $this->assertSame(['certified', 'modality'], array_keys($configured));

        $this->assertSame([], filter_fields::configured([]));

        cache::make('block_compass', 'filterfields')->purge();
        $meter = budget::start();
        $this->assertSame([], filter_fields::configured([]));
        $this->assertSame(0, $meter->reads(), 'nothing configured reads nothing, even cold');

        // The default argument is the setting.
        set_config('filter_fields', 'modality', 'block_compass');
        $this->assertSame(['modality'], array_keys(filter_fields::configured()));
    }

    /**
     * The payload names the groups in order, each with its formatted label and its chips.
     *
     * @return void
     */
    public function test_the_payload_carries_the_groups_in_order_with_their_chips(): void {
        $this->plugingen->course_field('select', 'modality', ['options' => "Online\nOn campus"], 'Modality & mode');
        $this->plugingen->course_field('checkbox', 'certified', [], 'Certified');

        $payload = filter_fields::payload(filter_fields::configured(['certified', 'modality']));

        $this->assertSame([
            [
                'key' => 'certified',
                'label' => 'Certified',
                'values' => [['key' => 1, 'label' => get_string('yes')], ['key' => 0, 'label' => get_string('no')]],
            ],
            [
                'key' => 'modality',
                'label' => 'Modality & mode',
                'values' => [['key' => 1, 'label' => 'Online'], ['key' => 2, 'label' => 'On campus']],
            ],
        ], $payload);
        $this->assertSame([], filter_fields::payload([]));
    }

    /**
     * A filters parameter is checked against the allowlist, and each way of being outside it is refused.
     *
     * @return void
     */
    public function test_a_filter_outside_the_allowlist_is_refused(): void {
        $this->plugingen->course_field('select', 'modality', ['options' => "Online\nOn campus"]);
        $this->plugingen->course_field('checkbox', 'certified');
        $this->plugingen->course_field('text', 'code');
        $this->plugingen->course_field('select', 'internal', ['options' => "A\nB", 'visibility' => 1]);
        $configured = filter_fields::configured(['modality', 'certified', 'code', 'internal']);

        // The good case first, so the refusals below are about the entry and not the fixture.
        $this->assertSame(
            ['modality' => 2, 'certified' => 0],
            filter_fields::validate([['field' => 'modality', 'value' => 2], ['field' => 'certified', 'value' => 0]], $configured)
        );
        $this->assertSame([], filter_fields::validate([], $configured));

        $refused = [
            'a field that is not configured' => [['field' => 'campus', 'value' => 1]],
            'a text field, never eligible' => [['field' => 'code', 'value' => 1]],
            'a teachers-only field, not eligible' => [['field' => 'internal', 'value' => 1]],
            'a value outside the select options' => [['field' => 'modality', 'value' => 3]],
            'the empty slot of a select' => [['field' => 'modality', 'value' => 0]],
            'a value outside yes and no' => [['field' => 'certified', 'value' => 2]],
            'a field named twice' => [['field' => 'modality', 'value' => 1], ['field' => 'modality', 'value' => 2]],
            'an entry with no value' => [['field' => 'modality']],
        ];
        foreach ($refused as $case => $filters) {
            try {
                filter_fields::validate($filters, $configured);
                $this->fail("{$case}: must be refused");
            } catch (invalid_parameter_exception $e) {
                $this->assertInstanceOf(invalid_parameter_exception::class, $e, $case);
            }
        }
    }

    /**
     * purge() drops the entry, and the next read fills it again from core's handler.
     *
     * @return void
     */
    public function test_purge_drops_the_entry(): void {
        $this->plugingen->course_field('select', 'modality', ['options' => "Online\nOn campus"]);
        filter_fields::eligible();
        $raw = cache::make('block_compass', 'filterfields');
        $this->assertNotFalse($raw->get('fields'));

        filter_fields::purge();

        $this->assertFalse($raw->get('fields'));
        $this->assertArrayHasKey('modality', filter_fields::eligible());
        $this->assertNotFalse($raw->get('fields'), 'the next read filled the entry again');
    }
}
