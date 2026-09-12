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
 * Tests for the settings accessor.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * One place reads the settings, so one place is where the defaults and the clamps are proved.
 *
 * Two rules the fleet has paid for elsewhere are pinned here. An
 * admin_setting_configtext with PARAM_INT stores whatever an administrator
 * types, so a typed 99 must not turn tier 1 into tier 3 — the accessor clamps,
 * the setting does not. And a default-on checkbox is off only when an explicit
 * '0' is stored: "never set" and "stored 1" both mean on, which is why
 * favourites_enabled() cannot be written as a plain cast.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(config::class)]
final class config_test extends advanced_testcase {
    /**
     * Remove every stored value, so "unset" really is unset whatever install wrote.
     *
     * @return void
     */
    private function forget_every_setting(): void {
        $names = [
            'attention_max', 'new_days', 'group_depth',
            'enable_favourites', 'enable_search', 'show_index', 'hide_block_title',
            'inventory_max', 'enable_prewarm', 'prewarm_days', 'prewarm_budget_seconds',
            'default_view', 'dormant_months', 'filter_fields', 'enable_pending', 'show_category', 'enable_page',
        ];
        foreach ($names as $name) {
            unset_config($name, 'block_compass');
        }
    }

    /**
     * With nothing stored, every accessor returns its documented default.
     *
     * @return void
     */
    public function test_the_documented_defaults_hold_when_nothing_is_stored(): void {
        $this->resetAfterTest();
        $this->forget_every_setting();

        $this->assertSame(config::DEFAULT_ATTENTION_MAX, config::attention_max());
        $this->assertSame(3, config::attention_max());
        $this->assertSame(config::DEFAULT_NEW_DAYS, config::new_days());
        $this->assertSame(30, config::new_days());
        $this->assertSame(config::DEFAULT_GROUP_DEPTH, config::group_depth());
        $this->assertSame(1, config::group_depth());
        $this->assertTrue(config::favourites_enabled());
        $this->assertTrue(config::search_enabled());
        $this->assertTrue(config::index_shown());
        $this->assertFalse(config::hide_block_title());
        $this->assertSame(config::DEFAULT_INVENTORY_MAX, config::inventory_max());
        $this->assertSame(250, config::inventory_max());
        $this->assertFalse(config::prewarm_enabled());
        $this->assertSame(config::DEFAULT_PREWARM_DAYS, config::prewarm_days());
        $this->assertSame(7, config::prewarm_days());
        $this->assertSame(config::DEFAULT_PREWARM_BUDGET_SECONDS, config::prewarm_budget_seconds());
        $this->assertSame(600, config::prewarm_budget_seconds());
        $this->assertSame([], config::filter_fields());
        $this->assertFalse(config::pending_enabled(true));
    }

    /**
     * filter_fields is at most FILTER_FIELDS_MAX distinct shortnames, cleaned to the shortname
     * alphabet, in the stored order (ADR-009, decision 5).
     *
     * The control is a stored list of three, which comes back whole: without it a clamp that
     * always answered the empty list would pass.
     *
     * @return void
     */
    public function test_filter_fields_is_clamped_cleaned_and_kept_in_order(): void {
        $this->resetAfterTest();
        $this->forget_every_setting();

        $this->assertSame(3, config::FILTER_FIELDS_MAX);
        set_config('filter_fields', 'modality,level,campus', 'block_compass');
        $this->assertSame(['modality', 'level', 'campus'], config::filter_fields());

        set_config('filter_fields', 'modality,level,campus,period', 'block_compass');
        $this->assertSame(['modality', 'level', 'campus'], config::filter_fields(), 'the fourth is dropped');

        // Duplicates and empties are dropped, a space is outside the alphabet and is stripped, and
        // the clamp applies after: four survivors, three kept. Whether a survivor still names a
        // field is filter_fields::configured()'s question.
        set_config('filter_fields', ' modality , modality,,bad name,x_y,level', 'block_compass');
        $this->assertSame(['modality', 'badname', 'x_y'], config::filter_fields());

        set_config('filter_fields', '', 'block_compass');
        $this->assertSame([], config::filter_fields());
    }

    /**
     * Applications awaiting approval are shown only when the setting is on AND enrol_apply is present.
     *
     * The presence is injected so both branches run on every site: the CI runtime has no
     * enrol_apply, the development stack does. A stored one with the plugin absent is off — the
     * forced-off of ADR-009 decision 7 — and never set is off whatever is installed.
     *
     * @return void
     */
    public function test_pending_is_on_only_with_the_setting_and_the_plugin_together(): void {
        $this->resetAfterTest();
        $this->forget_every_setting();

        $this->assertFalse(config::pending_enabled(true));
        $this->assertFalse(config::pending_enabled(false));

        set_config('enable_pending', 1, 'block_compass');
        $this->assertTrue(config::pending_enabled(true));
        $this->assertFalse(config::pending_enabled(false), 'without enrol_apply the setting cannot be on');
        // The default argument asks the plugin manager, and agrees with whichever answer it gives.
        $this->assertSame(config::pending_plugin_present(), config::pending_enabled());

        set_config('enable_pending', 0, 'block_compass');
        $this->assertFalse(config::pending_enabled(true));
    }

    /**
     * Stored values for attention_max and what the accessor makes of them.
     *
     * @return array Case name => [stored value, expected result].
     */
    public static function attention_max_provider(): array {
        return [
            'zero falls back to the default' => [0, 3],
            'a negative falls back to the default' => [-5, 3],
            'an empty string falls back to the default' => ['', 3],
            'one is honoured' => [1, 1],
            'a sensible value is honoured' => [5, 5],
            'the ceiling is honoured' => [12, 12],
            'above the ceiling is clamped' => [99, 12],
        ];
    }

    /**
     * attention_max is clamped between 1 and the ceiling.
     *
     * @param mixed $stored What the administrator's setting holds.
     * @param int $expected What the accessor must return.
     * @return void
     */
    #[DataProvider('attention_max_provider')]
    public function test_attention_max_is_clamped($stored, int $expected): void {
        $this->resetAfterTest();
        set_config('attention_max', $stored, 'block_compass');

        $this->assertSame($expected, config::attention_max());
        $this->assertLessThanOrEqual(config::MAX_ATTENTION_MAX, config::attention_max());
    }

    /**
     * Stored values for new_days and what the accessor makes of them.
     *
     * @return array Case name => [stored value, expected result].
     */
    public static function new_days_provider(): array {
        return [
            'zero falls back to the default' => [0, 30],
            'a negative falls back to the default' => [-1, 30],
            'an empty string falls back to the default' => ['', 30],
            'one day is honoured' => [1, 1],
            'a week is honoured' => [7, 7],
            'a long window is not clamped' => [365, 365],
        ];
    }

    /**
     * new_days is at least one day, and has no upper bound.
     *
     * @param mixed $stored What the administrator's setting holds.
     * @param int $expected What the accessor must return.
     * @return void
     */
    #[DataProvider('new_days_provider')]
    public function test_new_days_falls_back_below_one_day($stored, int $expected): void {
        $this->resetAfterTest();
        set_config('new_days', $stored, 'block_compass');

        $this->assertSame($expected, config::new_days());
    }

    /**
     * Stored values for group_depth and what the accessor makes of them.
     *
     * @return array Case name => [stored value, expected result].
     */
    public static function group_depth_provider(): array {
        return [
            'zero falls back to the top level' => [0, 1],
            'a negative falls back to the top level' => [-2, 1],
            'an empty string falls back to the top level' => ['', 1],
            'the top level is honoured' => [1, 1],
            'a subcategory depth is honoured' => [2, 2],
            'a deep tree is not clamped' => [5, 5],
        ];
    }

    /**
     * group_depth is at least one, and has no upper bound.
     *
     * Depth 0 does not exist in {course_categories} — the top level is depth 1
     * — so a stored zero must not reach explore::group_id(), where it would
     * index the path array at -1 and roll every course up to nothing.
     *
     * @param mixed $stored What the administrator's setting holds.
     * @param int $expected What the accessor must return.
     * @return void
     */
    #[DataProvider('group_depth_provider')]
    public function test_group_depth_is_at_least_the_top_level($stored, int $expected): void {
        $this->resetAfterTest();
        set_config('group_depth', $stored, 'block_compass');

        $this->assertSame($expected, config::group_depth());
        $this->assertGreaterThanOrEqual(1, config::group_depth());
    }

    /**
     * Favourites are on unless an explicit zero says otherwise.
     *
     * The three states are the whole rule, and the middle one is the only
     * "off": a checkbox that was never saved must not read as disabled.
     *
     * @return void
     */
    public function test_favourites_are_off_only_when_an_explicit_zero_is_stored(): void {
        $this->resetAfterTest();

        unset_config('enable_favourites', 'block_compass');
        $this->assertTrue(config::favourites_enabled());

        set_config('enable_favourites', 0, 'block_compass');
        $this->assertSame('0', get_config('block_compass', 'enable_favourites'));
        $this->assertFalse(config::favourites_enabled());

        set_config('enable_favourites', 1, 'block_compass');
        $this->assertTrue(config::favourites_enabled());
    }

    /**
     * The category line on cards is shown unless an explicit zero says otherwise (ADR-010, decision 11).
     *
     * The same three states as the favourites rule, and the same trap: a site that never
     * opened the settings page has nothing stored, and a plain cast of that "nothing" would
     * strip the category from every card on every such site.
     *
     * @return void
     */
    public function test_the_category_is_hidden_only_when_an_explicit_zero_is_stored(): void {
        $this->resetAfterTest();

        unset_config('show_category', 'block_compass');
        $this->assertTrue(config::category_shown());

        set_config('show_category', 0, 'block_compass');
        $this->assertSame('0', get_config('block_compass', 'show_category'));
        $this->assertFalse(config::category_shown());

        set_config('show_category', 1, 'block_compass');
        $this->assertTrue(config::category_shown());
    }

    /**
     * The block's own page is off unless an explicit 1 is stored (ADR-012, decision 1).
     *
     * The opposite default from the other checkboxes, on purpose: an upgrade must change
     * nothing for a site that never asked for the page, so "never set" and "0" both mean off.
     *
     * @return void
     */
    public function test_the_page_is_off_unless_an_explicit_one_is_stored(): void {
        $this->resetAfterTest();

        unset_config('enable_page', 'block_compass');
        $this->assertFalse(config::page_enabled());

        set_config('enable_page', 0, 'block_compass');
        $this->assertFalse(config::page_enabled());

        set_config('enable_page', 1, 'block_compass');
        $this->assertTrue(config::page_enabled());
    }

    /**
     * The page's title is shown unless an explicit 1 hides it (ADR-012, amendment 4).
     *
     * Same shape as enable_page: "never set" and "0" both keep the theme's heading.
     *
     * @return void
     */
    public function test_the_page_title_is_shown_unless_an_explicit_one_hides_it(): void {
        $this->resetAfterTest();

        unset_config('hide_page_title', 'block_compass');
        $this->assertFalse(config::hide_page_title());

        set_config('hide_page_title', 0, 'block_compass');
        $this->assertFalse(config::hide_page_title());

        set_config('hide_page_title', 1, 'block_compass');
        $this->assertTrue(config::hide_page_title());
    }

    /**
     * The tier 3 search box is on unless an explicit zero says otherwise.
     *
     * Same three states as the favourites rule, and the same trap: a site that
     * never opened the settings page has nothing stored, and a plain cast of
     * that "nothing" would hide the search box on every such site.
     *
     * @return void
     */
    public function test_search_is_off_only_when_an_explicit_zero_is_stored(): void {
        $this->resetAfterTest();

        unset_config('enable_search', 'block_compass');
        $this->assertTrue(config::search_enabled());

        set_config('enable_search', 0, 'block_compass');
        $this->assertSame('0', get_config('block_compass', 'enable_search'));
        $this->assertFalse(config::search_enabled());

        set_config('enable_search', 1, 'block_compass');
        $this->assertTrue(config::search_enabled());
    }

    /**
     * The tier 3 category index is on unless an explicit zero says otherwise.
     *
     * @return void
     */
    public function test_the_index_is_off_only_when_an_explicit_zero_is_stored(): void {
        $this->resetAfterTest();

        unset_config('show_index', 'block_compass');
        $this->assertTrue(config::index_shown());

        set_config('show_index', 0, 'block_compass');
        $this->assertSame('0', get_config('block_compass', 'show_index'));
        $this->assertFalse(config::index_shown());

        set_config('show_index', 1, 'block_compass');
        $this->assertTrue(config::index_shown());
    }

    /**
     * The title bar is hidden only when an explicit one is stored.
     *
     * The mirror image of the rule above: a default-off checkbox is on only
     * when it says so.
     *
     * @return void
     */
    public function test_the_title_is_hidden_only_when_an_explicit_one_is_stored(): void {
        $this->resetAfterTest();

        unset_config('hide_block_title', 'block_compass');
        $this->assertFalse(config::hide_block_title());

        set_config('hide_block_title', 1, 'block_compass');
        $this->assertTrue(config::hide_block_title());

        set_config('hide_block_title', 0, 'block_compass');
        $this->assertFalse(config::hide_block_title());
    }

    /**
     * Stored values for inventory_max and what the accessor makes of them.
     *
     * @return array Case name => [stored value, expected result].
     */
    public static function inventory_max_provider(): array {
        return [
            'zero falls back to the default' => [0, 250],
            'a negative falls back to the default' => [-1, 250],
            'an empty string falls back to the default' => ['', 250],
            'one is honoured' => [1, 1],
            'the default typed by hand is honoured' => [250, 250],
            'a large site is not clamped' => [5000, 5000],
        ];
    }

    /**
     * inventory_max is at least one, and has no upper bound.
     *
     * Zero would make every user paged, including one with a single course, so a stored zero
     * means "unset" and the default applies.
     *
     * @param mixed $stored What the administrator's setting holds.
     * @param int $expected What the accessor must return.
     * @return void
     */
    #[DataProvider('inventory_max_provider')]
    public function test_inventory_max_falls_back_below_one(mixed $stored, int $expected): void {
        $this->resetAfterTest();
        set_config('inventory_max', $stored, 'block_compass');

        $this->assertSame($expected, config::inventory_max());
        $this->assertGreaterThanOrEqual(1, config::inventory_max());
    }

    /**
     * Stored values for prewarm_days and what the accessor makes of them.
     *
     * @return array Case name => [stored value, expected result].
     */
    public static function prewarm_days_provider(): array {
        return [
            'zero falls back to the default' => [0, 7],
            'a negative falls back to the default' => [-3, 7],
            'an empty string falls back to the default' => ['', 7],
            'one day is honoured' => [1, 1],
            'a month is honoured' => [30, 30],
        ];
    }

    /**
     * prewarm_days is at least one day, and has no upper bound.
     *
     * @param mixed $stored What the administrator's setting holds.
     * @param int $expected What the accessor must return.
     * @return void
     */
    #[DataProvider('prewarm_days_provider')]
    public function test_prewarm_days_falls_back_below_one_day(mixed $stored, int $expected): void {
        $this->resetAfterTest();
        set_config('prewarm_days', $stored, 'block_compass');

        $this->assertSame($expected, config::prewarm_days());
        $this->assertGreaterThanOrEqual(1, config::prewarm_days());
    }

    /**
     * Stored values for prewarm_budget_seconds and what the accessor makes of them.
     *
     * @return array Case name => [stored value, expected result].
     */
    public static function prewarm_budget_seconds_provider(): array {
        return [
            'zero falls back to the default' => [0, 600],
            'a negative falls back to the default' => [-1, 600],
            'an empty string falls back to the default' => ['', 600],
            'one below the floor falls back to the default' => [59, 600],
            'the floor is honoured' => [60, 60],
            'one above the floor is honoured' => [61, 61],
            'an hour is not clamped' => [3600, 3600],
        ];
    }

    /**
     * prewarm_budget_seconds is at least the floor, and has no upper bound.
     *
     * The settings page enforces the floor through set_min_duration(); the accessor enforces it
     * again because a value can reach {config_plugins} by other roads, and a budget of a few
     * seconds would stop every run after its first user.
     *
     * @param mixed $stored What the administrator's setting holds.
     * @param int $expected What the accessor must return.
     * @return void
     */
    #[DataProvider('prewarm_budget_seconds_provider')]
    public function test_prewarm_budget_seconds_falls_back_below_the_floor(mixed $stored, int $expected): void {
        $this->resetAfterTest();
        set_config('prewarm_budget_seconds', $stored, 'block_compass');

        $this->assertSame($expected, config::prewarm_budget_seconds());
        $this->assertGreaterThanOrEqual(config::MIN_PREWARM_BUDGET_SECONDS, config::prewarm_budget_seconds());
        $this->assertSame(60, config::MIN_PREWARM_BUDGET_SECONDS);
    }

    /**
     * Pre-warming is on only when an explicit one is stored.
     *
     * The mirror image of the default-on rule: this task costs database time on a schedule, so a
     * site that never opened the settings page must not start it. Never set, an explicit zero
     * and an empty string are all off; only the stored one is on.
     *
     * @return void
     */
    public function test_pre_warming_is_on_only_when_an_explicit_one_is_stored(): void {
        $this->resetAfterTest();

        unset_config('enable_prewarm', 'block_compass');
        $this->assertFalse(config::prewarm_enabled());

        set_config('enable_prewarm', 0, 'block_compass');
        $this->assertSame('0', get_config('block_compass', 'enable_prewarm'));
        $this->assertFalse(config::prewarm_enabled());

        set_config('enable_prewarm', '', 'block_compass');
        $this->assertFalse(config::prewarm_enabled());

        set_config('enable_prewarm', 1, 'block_compass');
        $this->assertTrue(config::prewarm_enabled());
    }

    /**
     * The site default view is one of two words, and anything else is the list.
     *
     * The setting is a select, so an administrator cannot type a third word — but the column
     * can also be written by an upgrade, a restore or a hand-edited database, and a view the
     * client does not know renders no rows at all rather than failing loudly. The control is
     * the stored 'cards': without it this test would pass against an accessor that always
     * answered 'list'.
     *
     * @return void
     */
    public function test_the_default_view_is_list_unless_cards_is_stored(): void {
        $this->resetAfterTest();
        $this->forget_every_setting();

        $this->assertSame('list', config::default_view());

        set_config('default_view', 'cards', 'block_compass');
        $this->assertSame('cards', config::default_view());

        set_config('default_view', 'list', 'block_compass');
        $this->assertSame('list', config::default_view());

        set_config('default_view', 'sideways', 'block_compass');
        $this->assertSame('list', config::default_view());

        set_config('default_view', '', 'block_compass');
        $this->assertSame('list', config::default_view());
    }

    /**
     * Months of silence default to twelve, refuse anything below one, and have no ceiling.
     *
     * The ceiling is absent on purpose (ADR-007, decision 5): unlike attention_max a large
     * value degrades nothing, it empties the group. The control is a stored 36, which must
     * come back as 36 and not as the default.
     *
     * @return void
     */
    public function test_dormant_months_defaults_to_twelve_and_refuses_less_than_one(): void {
        $this->resetAfterTest();
        $this->forget_every_setting();

        $this->assertSame(12, config::dormant_months());

        set_config('dormant_months', 36, 'block_compass');
        $this->assertSame(36, config::dormant_months());

        set_config('dormant_months', 0, 'block_compass');
        $this->assertSame(12, config::dormant_months());

        set_config('dormant_months', -4, 'block_compass');
        $this->assertSame(12, config::dormant_months());
    }
}
