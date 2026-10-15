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
 * Tests for the block class.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass;

use advanced_testcase;
use block_compass;
use block_compass\local\budget;
use block_compass\local\calendar\day;
use block_compass\local\config;
use block_compass\output\block as shell;
use core\context\system as context_system;
use core\context\user as context_user;
use moodle_page;
use moodle_url;
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The block is a shell: it renders for logged-in users, nothing for guests,
 * and touches no data while doing so.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(block_compass::class)]
final class block_compass_test extends advanced_testcase {
    /**
     * Load the block class, which lives outside the autoloaded classes/ tree.
     *
     * @return void
     */
    public static function setUpBeforeClass(): void {
        global $CFG;

        require_once($CFG->dirroot . '/blocks/moodleblock.class.php');
        require_once(__DIR__ . '/../block_compass.php');
        parent::setUpBeforeClass();
    }

    /**
     * Build a block instance attached to a Dashboard-like page.
     *
     * @return block_compass
     */
    private function make_block(): block_compass {
        global $USER;

        // The real Dashboard runs in the user's context (my/index.php); the system
        // context is only for the tests that run before any user is set.
        $context = isloggedin() ? context_user::instance((int) $USER->id) : context_system::instance();
        $page = new moodle_page();
        $page->set_context($context);
        $page->set_url(new moodle_url('/my/index.php'));
        $page->set_pagelayout('mydashboard');

        $block = new block_compass();
        $block->init();
        $block->page = $page;

        return $block;
    }

    /**
     * The block is a Dashboard block and nothing else.
     *
     * @return void
     */
    public function test_it_is_a_dashboard_only_single_instance_block(): void {
        $block = $this->make_block();

        $this->assertSame(['my' => true], $block->applicable_formats());
        $this->assertFalse($block->instance_allow_multiple());
        $this->assertTrue($block->has_config());
        $this->assertSame(get_string('pluginname', 'block_compass'), $block->title);
    }

    /**
     * A logged-in user gets the shell with the root the JS mounts on.
     *
     * @return void
     */
    public function test_a_logged_in_user_gets_the_shell(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $content = $this->make_block()->get_content();

        $this->assertStringContainsString('data-region="block_compass"', $content->text);
        // The component name and its props are the contract between the server and the client,
        // so they are what is asserted; the component is the bundle of the whole client.
        $this->assertStringContainsString('data-react-component="@moodle/lms/block_compass/bundle"', $content->text);
        $this->assertMatchesRegularExpression('/data-react-props=\'(.*?)\'/', $content->text);
        preg_match('/data-react-props=\'(.*?)\'/', $content->text, $matches);
        $props = json_decode(html_entity_decode($matches[1]), true);
        $this->assertIsArray($props, 'the props attribute must decode as JSON');

        $this->assertTrue($props['favouritesenabled']);
        $this->assertSame(get_string('ghost_more', 'block_compass'), $props['labels']['ghost_more']);
        // The strips travel in the props in order, with their headings: a client cannot ask
        // for a string, so an absent label is an absent feature rather than a missing word.
        $this->assertSame(
            ['continue', 'new', 'scheduled', 'favourites'],
            array_column($props['strips'], 'name')
        );
        $headings = [
            'continue' => get_string('strip_continue', 'block_compass'),
            'new' => get_string('strip_new', 'block_compass'),
            'scheduled' => get_string('strip_scheduled', 'block_compass'),
            'favourites' => get_string('strip_favourites', 'block_compass'),
        ];
        $this->assertSame(array_values($headings), array_column($props['strips'], 'title'));
        // The icons are server-rendered markup because there is no pix helper for ESM.
        $this->assertStringContainsString('<i', $props['icons']['staron']);
        $this->assertStringContainsString('<i', $props['icons']['staroff']);
        // The tier 3 toolbar's icon-only controls: list, grid and filter glyphs; the archive
        // boxes and the accordion's chevrons. No reload glyph: a way back appears only with a
        // failure, as RetryNotice's two text buttons (ADR-014 amendment 11).
        $icons = ['list', 'grid', 'filter', 'archive', 'unarchive', 'expanded', 'collapsed', 'collapsedrtl'];
        foreach ($icons as $icon) {
            $this->assertStringContainsString('<i', $props['icons'][$icon], "the {$icon} icon is server-rendered markup");
        }
        $this->assertStringContainsString('fa-box-archive', $props['icons']['archive']);
        $this->assertArrayNotHasKey('reload', $props['icons'], 'no permanent reload control');
        $this->assertArrayNotHasKey('reload', $props['labels'], 'no permanent reload control');
        $this->assertArrayNotHasKey('hide', $props['icons'], 'the archive control is drawn with the archive boxes, not the eye');
        // The category line and the remembered toolbar.
        $this->assertTrue($props['showcategory']);
        // Where the block is, as a heading level: under core's block title, an h3, so 4.
        $this->assertSame(4, $props['headinglevel']);
        $this->assertSame(
            ['sort' => 'category', 'chip' => 'all', 'cf' => [], 'panel' => true],
            $props['explore']
        );
        // Both surfaces of an application awaiting approval hang off this flag; off by default.
        $this->assertFalse($props['pendingenabled']);
        $this->assertSame(get_string('chip_pending', 'block_compass'), $props['labels']['chip_pending']);
        $this->assertSame(get_string('chip_scheduled', 'block_compass'), $props['labels']['chip_scheduled']);

        // Every label the client reads is one the shell exports: an ES module has no core/str, so
        // a key missing from the list renders as nothing at all, with no error anywhere.
        $read = [];
        foreach (glob(__DIR__ . '/../js/esm/src/*.{ts,tsx}', GLOB_BRACE) as $file) {
            preg_match_all('/\blabels\.([a-z_]+)\b/', file_get_contents($file), $matches);
            $read = array_merge($read, $matches[1]);
        }
        $string = [];
        include(__DIR__ . '/../lang/en/block_compass.php');
        $english = $string;
        // Keys handed to fillCount() as string literals read both the plain string and, where the
        // language file defines one, its singular twin; the ghost's direct pick of ghost_more_one
        // is a plain labels.* access. The strip links pass their keys to stripoverflow() as literals.
        $literals = [];
        foreach (glob(__DIR__ . '/../js/esm/src/*.{ts,tsx}', GLOB_BRACE) as $file) {
            preg_match_all("/fillCount\\(\\s*labels,\\s*'([a-z_]+)'/", file_get_contents($file), $matches);
            $literals = array_merge($literals, $matches[1]);
        }
        preg_match_all("/'(strip_more_[a-z_]+)'/", file_get_contents(__DIR__ . '/../js/esm/src/Block.tsx'), $matches);
        foreach (array_merge($literals, $matches[1]) as $key) {
            $read[] = $key;
            if (isset($english[$key . '_one'])) {
                $read[] = $key . '_one';
            }
        }
        $read = array_values(array_unique($read));
        sort($read);
        // Vacuity guard: the scan read the client, the new state labels included.
        $this->assertContains('state_scheduled', $read);
        $this->assertContains('strip_more_scheduled_label', $read);
        $this->assertContains('ghost_more', $read);
        $this->assertContains('coursesingroup_one', $read, 'found through fillCount()');
        $this->assertContains('pendingnotice_one', $read, 'found through fillCount()');
        $this->assertSame(
            [],
            array_values(array_diff($read, array_keys($props['labels']))),
            'labels the client reads but the shell does not export'
        );

        // The shell carries one mount point and nothing else of the block's own: tier 3 renders
        // inside the component and needs no region of its own.
        $this->assertStringNotContainsString('data-region="explore"', $content->text);
        $this->assertSame(
            1,
            substr_count($content->text, 'data-react-component'),
            'the shell mounts exactly one component'
        );
        $this->assertStringContainsString(get_string('javascriptrequired', 'block_compass'), $content->text);
        $this->assertSame('', $content->footer);
    }

    /**
     * The props the shell shipped, decoded.
     *
     * @return array The props object.
     */
    private function props(): array {
        preg_match('/data-react-props=\'(.*?)\'/', $this->make_block()->get_content()->text, $matches);

        return (array) json_decode(html_entity_decode($matches[1]), true);
    }

    /**
     * The view the shell ships is the viewer's own choice, or the site default.
     *
     * Four states and each one matters: nothing configured and nothing chosen; a site default
     * reaching a viewer who never chose; a viewer's choice outranking that default; and a
     * stored word the client does not know, which must not travel - a view React cannot draw
     * renders no rows at all and says nothing anywhere.
     *
     * @return void
     */
    public function test_the_view_the_shell_ships_is_the_viewers_own_or_the_site_default(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->assertSame('list', $this->props()['view']);

        set_config('default_view', 'cards', 'block_compass');
        $this->assertSame('cards', $this->props()['view']);

        set_user_preference('block_compass_view', 'list', $user);
        $this->assertSame('list', $this->props()['view']);

        // Only the endpoints clean a preference; set_user_preference() writes what it is given.
        // So a value outside the vocabulary can be in the column, and the shell is where it stops.
        set_user_preference('block_compass_view', 'sideways', $user);
        $this->assertSame('cards', $this->props()['view']);
    }

    /**
     * The remembered toolbar ships validated: a stored state names what the client can draw and no more.
     *
     * Three drops in one stored value, each a different check: a sort outside the vocabulary,
     * the pending chip while the feature is off, and a field key that is not a shortname. What
     * survives is what ships.
     *
     * The second half is about the shape of an empty selection. The shell cannot ship it as {}:
     * core's react helper decodes the template's JSON block associatively and encodes it again
     * (lib/classes/output/mustache_react_helper.php), so [] is what reaches the client whatever
     * the shell wrote, and the client - which writes {} back - normalises it where it reads it.
     * Nothing runs the client here, so the normalisation is pinned in its source: the lines that
     * read the selection off the props must go through it, or every mount would write the same
     * state once over a difference that means nothing.
     *
     * @return void
     */
    public function test_the_remembered_toolbar_ships_only_what_the_client_can_draw(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        set_user_preference('block_compass_explore', json_encode([
            'sort' => 'sideways',
            'chip' => 'pending',
            'cf' => ['modality' => 2, 'bad key' => 1],
            'panel' => false,
        ]), $user);
        $props = $this->props();

        $this->assertSame('category', $props['explore']['sort']);
        $this->assertSame('all', $props['explore']['chip'], 'pending is not a chip while the feature is off');
        $this->assertSame(['modality' => 2], $props['explore']['cf']);
        $this->assertFalse($props['explore']['panel']);

        // The raw attribute, before decoding: an empty selection is [] on the wire, by core's doing.
        set_user_preference('block_compass_explore', json_encode(['sort' => 'name']), $user);
        preg_match('/data-react-props=\'(.*?)\'/', $this->make_block()->get_content()->text, $matches);
        $this->assertStringContainsString('"cf":[]', html_entity_decode($matches[1]));
        // ...so the client normalises it, on the line that reads it and on the remembered copy.
        $source = file_get_contents(__DIR__ . '/../js/esm/src/Explore.tsx');
        $this->assertSame(
            2,
            preg_match_all('/shippedSelection\(config\.explore\.cf\)/', $source),
            'Explore.tsx must read the shipped selection through shippedSelection() twice: the state and the remembered copy'
        );
        $this->assertMatchesRegularExpression(
            '/const shippedSelection = .*Array\.isArray\(cf\) \? \{\} : cf/',
            $source,
            'shippedSelection() must turn the [] core ships into {}'
        );

        set_config('show_category', 0, 'block_compass');
        $this->assertFalse($this->props()['showcategory']);
    }

    /**
     * Guests get an empty block, which Moodle then does not display.
     *
     * @return void
     */
    public function test_a_guest_gets_nothing(): void {
        $this->resetAfterTest();
        $this->setGuestUser();

        $content = $this->make_block()->get_content();

        $this->assertSame('', $content->text);
        $this->assertSame('', $content->footer);
    }

    /**
     * Rendering the shell reads nothing from the database once core is warm.
     *
     * Protocol: warm core by rendering once, then measure a second, fresh block whose
     * page has already initialised its theme and output. That last step matters:
     * moodle_page::initialise_theme_and_output() runs
     * filter_manager::setup_page_for_globally_available_filters(), whose
     * filter_get_active_in_context() is a recordset that PostgreSQL executes as
     * DECLARE, FETCH and CLOSE — three reads on the meter — and that is core's
     * per-page cost, not the shell's. The shell reads no plugin cache; if it ever
     * does, purge that cache between the two renders.
     *
     * @return void
     */
    public function test_the_shell_costs_no_database_reads_when_core_is_warm(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->make_block()->get_content();

        $block = $this->make_block();
        $block->page->get_renderer('core');

        $meter = budget::start();
        $content = $block->get_content();

        $this->assertStringContainsString('data-region="block_compass"', $content->text);
        $this->assertSame(0, $meter->reads());
    }

    /**
     * With the calendar off, the shell ships no calendar props and none of the strip's strings.
     *
     * The control is the same Dashboard with the setting on: the key appears, so its absence here
     * is the setting's doing (ADR-014 decision 1).
     *
     * @return void
     */
    public function test_the_calendar_props_are_absent_while_the_strip_is_off(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());

        $props = $this->props();
        $this->assertArrayNotHasKey('calendar', $props, 'off by default: no props, so nothing mounts');
        $this->assertSame([], preg_grep('/^cal_/', array_keys($props['labels'])), 'no strip string among the labels');

        set_config('calendar_enabled', 1, 'block_compass');
        $this->assertArrayHasKey('calendar', $this->props(), 'the control: on, the key appears');

        set_config('calendar_enabled', 0, 'block_compass');
        $this->assertArrayNotHasKey('calendar', $this->props(), 'an explicit 0 is off too');
    }

    /**
     * The strip renders on the surfaces calendar_where names, and only there.
     *
     * The Dashboard block is one surface; the block's own page is the other (tests/output/page_test.php
     * asserts the page's half).
     *
     * @return void
     */
    public function test_the_calendar_props_follow_where_the_strip_shows(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());
        set_config('calendar_enabled', 1, 'block_compass');

        $expected = ['both' => true, 'dashboard' => true, 'page' => false];
        foreach ($expected as $where => $shown) {
            set_config('calendar_where', $where, 'block_compass');
            $this->assertSame($shown, array_key_exists('calendar', $this->props()), "calendar_where = {$where}");
        }
        // An unknown value reads as both, the default.
        set_config('calendar_where', 'nowhere', 'block_compass');
        $this->assertArrayHasKey('calendar', $this->props());
    }

    /**
     * The calendar props carry the settings, the viewer's remembered state, core's calendar URLs,
     * core's glyphs and every string, translated.
     *
     * @return void
     */
    public function test_the_calendar_props_carry_what_the_client_draws(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user(['timezone' => 'America/Sao_Paulo']);
        $this->setUser($user);
        set_config('calendar_enabled', 1, 'block_compass');
        set_config('calendar_style', 'ring', 'block_compass');
        set_config('calendar_relevance', 0, 'block_compass');
        set_user_preference('block_compass_calendar', json_encode(['view' => 'teaching', 'filter' => 'todo']));

        $calendar = $this->props()['calendar'];

        $this->assertSame('ring', $calendar['style']);
        $this->assertFalse($calendar['relevance'], 'the site default of the switch');
        $this->assertSame(
            ['view' => 'teaching', 'filter' => 'todo', 'relevance' => false, 'open' => false],
            $calendar['state'],
            'the remembered members, and the site defaults for the ones never stored'
        );
        // The closed strip counts grading work only from block_feedback_tracker's ledger: on by default
        // where the plugin is installed, off without it, and off when the admin keeps core's count.
        $this->assertSame(\block_compass\local\calendar\grading::tracker_installed(), $calendar['grading']);
        set_config('calendar_grading', 'core', 'block_compass');
        $this->assertFalse($this->props()['calendar']['grading']);
        $this->assertSame((new \core\url('/calendar/view.php', ['view' => 'month']))->out(false), $calendar['url']);
        $this->assertSame((new \core\url('/calendar/view.php', ['view' => 'day']))->out(false), $calendar['dayurl']);
        $this->assertSame('America/Sao_Paulo', $calendar['timezone']);
        $this->assertSame(config::inventory_max(), $calendar['bound']);
        $this->assertSame(day::LIMIT, $calendar['daylimit']);
        $this->assertSame(shell::CALENDAR_STRINGS, array_keys($calendar['strings']));
        foreach (shell::CALENDAR_STRINGS as $key) {
            $this->assertSame(get_string($key, 'block_compass'), $calendar['strings'][$key], $key);
        }
        // Core's own glyphs, rendered with an empty alt, so core hides each from assistive technology.
        $this->assertSame(['prev', 'next', 'calendar', 'learning', 'teaching'], array_keys($calendar['icons']));
        foreach ($calendar['icons'] as $name => $icon) {
            $this->assertStringContainsString('aria-hidden="true"', $icon, $name);
        }
    }

    /**
     * Every string the strip shows exists in both languages with the same placeholders, and every
     * one the client reads is shipped.
     *
     * The client reads its strings as strings.<key> and through fillCount() with a quoted key,
     * never as labels.<key>, so the block's own label check does not see them; this is theirs.
     * Vacuity guards: the scan found the calendar sources and some of their reads.
     *
     * @return void
     */
    public function test_the_calendar_strings_are_shipped_and_in_both_languages(): void {
        $root = dirname(__DIR__);
        $strings = [];
        foreach (['en', 'pt_br'] as $lang) {
            $string = [];
            include($root . '/lang/' . $lang . '/block_compass.php');
            $strings[$lang] = $string;
        }
        foreach (shell::CALENDAR_STRINGS as $key) {
            $this->assertArrayHasKey($key, $strings['en'], $key);
            $this->assertArrayHasKey($key, $strings['pt_br'], $key);
            preg_match_all('/\{\$a(?:->\w+)?\}/', $strings['en'][$key], $en);
            preg_match_all('/\{\$a(?:->\w+)?\}/', $strings['pt_br'][$key], $pt);
            sort($en[0]);
            sort($pt[0]);
            $this->assertSame($en[0], $pt[0], "{$key}: placeholder parity");
        }
        $calkeys = array_values(preg_grep('/^cal_/', array_keys($strings['en'])));
        $shipped = shell::CALENDAR_STRINGS;
        sort($calkeys);
        sort($shipped);
        $this->assertSame($calkeys, $shipped, 'the strip\'s strings are exactly the cal_ strings of the language file');

        $files = glob($root . '/js/esm/src/Calendar*.tsx');
        $this->assertCount(3, $files, 'CalendarStrip.tsx, CalendarLine.tsx and CalendarCard.tsx');
        $read = [];
        foreach ($files as $file) {
            $source = file_get_contents($file);
            $this->assertDoesNotMatchRegularExpression(
                '/\blabels\.cal_/',
                $source,
                basename($file) . ' reads a strip string as a label'
            );
            preg_match_all('/\bstrings\.([a-z_]+)\b/', $source, $matches);
            $read = array_merge($read, $matches[1]);
            // A key handed to fillCount(), as a literal argument or from a literal in a list, reads
            // its singular twin too where the language file has one.
            preg_match_all("/'(cal_[a-z_]+)'/", $source, $matches);
            foreach ($matches[1] as $key) {
                $read[] = $key;
                if (isset($strings['en'][$key . '_one'])) {
                    $read[] = $key . '_one';
                }
            }
        }
        $read = array_values(array_unique($read));
        $this->assertContains('cal_daylabel', $read, 'vacuity: a plain read was found');
        $this->assertContains('cal_items_one', $read, 'vacuity: a fillCount() read was found');
        $this->assertSame(
            [],
            array_values(array_diff($read, shell::CALENDAR_STRINGS)),
            'strings the client reads but the shell does not ship'
        );
    }

    /**
     * The strip's dates are written from the language file: twelve months, seven weekdays in two
     * lengths, and templates that use exactly the placeholders the client fills, in both languages.
     *
     * The time templates differ between the languages only in which one the client picks:
     * cal_format_clock is 12 in English, as core's own strftimetime ('%I:%M %p', lang/en/langconfig.php),
     * and 24 in Brazilian Portuguese ("14:30"). A placeholder the client does not fill would print
     * literally, and one it fills but the template lacks would lose the number.
     *
     * @return void
     */
    public function test_the_calendar_date_strings_cover_every_name_in_both_languages(): void {
        $root = dirname(__DIR__);
        $vocabulary = [
            'cal_format_daymonth' => ['day', 'month'],
            'cal_format_dayname' => ['day', 'month', 'weekday'],
            'cal_format_monthyear' => ['month', 'year'],
            'cal_format_time12' => ['ampm', 'hour', 'minute'],
            'cal_format_time24' => ['hour', 'minute'],
        ];
        $clock = ['en' => '12', 'pt_br' => '24'];
        $lists = ['cal_month_%02d' => range(1, 12), 'cal_weekday_%d' => range(0, 6), 'cal_weekdayshort_%d' => range(0, 6)];
        foreach (['en', 'pt_br'] as $lang) {
            $string = [];
            include($root . '/lang/' . $lang . '/block_compass.php');
            $names = [];
            foreach ($lists as $pattern => $numbers) {
                $set = [];
                foreach ($numbers as $number) {
                    $key = sprintf($pattern, $number);
                    $this->assertArrayHasKey($key, $string, "{$lang}: {$key}");
                    $this->assertNotSame('', trim($string[$key]), "{$lang}: {$key}");
                    $this->assertContains($key, shell::CALENDAR_STRINGS, $key);
                    $set[] = $string[$key];
                }
                $this->assertCount(count($numbers), array_unique($set), "{$lang}: {$pattern} names are distinct");
                $names = array_merge($names, $set);
            }
            $this->assertCount(26, $names, $lang);
            foreach ($vocabulary as $key => $placeholders) {
                preg_match_all('/\{\$a->(\w+)\}/', $string[$key], $found);
                $used = array_values(array_unique($found[1]));
                sort($used);
                $this->assertSame($placeholders, $used, "{$lang}: {$key}");
            }
            $this->assertSame($clock[$lang], $string['cal_format_clock'], $lang);
            $this->assertStringContainsString('{$a}', $string['cal_upto'], $lang);
        }
    }

    /**
     * With the strip on, rendering the shell still reads nothing from the database once core is warm.
     *
     * The protocol of test_the_shell_costs_no_database_reads_when_core_is_warm(); the preference and
     * the settings the calendar props read come from the request's preference bundle and the
     * config cache, and the strip's data from the client's own request.
     *
     * @return void
     */
    public function test_the_shell_with_the_strip_costs_no_database_reads_when_core_is_warm(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());
        set_config('calendar_enabled', 1, 'block_compass');
        set_user_preference('block_compass_calendar', json_encode(['view' => 'learning', 'filter' => 'all']));

        $this->make_block()->get_content();

        $block = $this->make_block();
        $block->page->get_renderer('core');

        $meter = budget::start();
        $content = $block->get_content();
        $reads = $meter->reads();

        // The control: the strip's props were rendered, so the zero is about a shell that built them.
        preg_match('/data-react-props=\'(.*?)\'/', $content->text, $matches);
        $this->assertArrayHasKey('calendar', json_decode(html_entity_decode($matches[1]), true));
        $this->assertSame(0, $reads);
    }
}
