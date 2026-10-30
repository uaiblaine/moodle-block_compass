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
use block_compass\local\tier1_preference;
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
        // The filter line's icon-only controls: list, grid, the sliders, the magnifier, the eraser,
        // the close cross and Organise's sort glyph (ADR-015); the archive boxes and the accordion's
        // chevrons. No reload glyph: a way back appears only with a failure, as RetryNotice's two
        // text buttons (ADR-014 amendment 11).
        $icons = [
            'list', 'grid', 'filter', 'search', 'eraser', 'close', 'organise', 'archive', 'unarchive', 'expanded', 'collapsed',
            'collapsedrtl',
        ];
        foreach ($icons as $icon) {
            $this->assertStringContainsString('<i', $props['icons'][$icon], "the {$icon} icon is server-rendered markup");
        }
        $this->assertStringContainsString('fa-box-archive', $props['icons']['archive']);
        $this->assertStringContainsString('fa-sliders', $props['icons']['filter'], 'Filters is drawn with the sliders');
        $this->assertStringContainsString('fa-eraser', $props['icons']['eraser'], 'the search clears with an eraser');
        $this->assertArrayNotHasKey('reload', $props['icons'], 'no permanent reload control');
        $this->assertArrayNotHasKey('reload', $props['labels'], 'no permanent reload control');
        $this->assertArrayNotHasKey('hide', $props['icons'], 'the archive control is drawn with the archive boxes, not the eye');
        // The category line and the remembered toolbar.
        $this->assertTrue($props['showcategory']);
        // Where the block is, as a heading level: under core's block title, an h3, so 4.
        $this->assertSame(4, $props['headinglevel']);
        $this->assertSame(
            ['sort' => 'category', 'scope' => 'all', 'star' => false, 'cf' => [], 'panel' => false],
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
            'panel' => true,
        ]), $user);
        $props = $this->props();

        $this->assertSame('category', $props['explore']['sort']);
        $this->assertSame('all', $props['explore']['scope'], 'pending is not a scope while the feature is off');
        $this->assertFalse($props['explore']['star']);
        $this->assertSame(['modality' => 2], $props['explore']['cf']);
        $this->assertTrue($props['explore']['panel']);

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
        global $USER;

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
        // Up next (ADR-016): the horizon in hours, not hidden, and the sign-in a hide is written under.
        $this->assertSame(['hours' => 6, 'rank' => null, 'signin' => (int) $user->currentlogin], $calendar['soon']);
        $USER->currentlogin = 1700000000;
        set_user_preference('block_compass_calendar', json_encode(['soon' => ['rank' => 2, 'signin' => 1700000000]]));
        set_config('calendar_soon', '0', 'block_compass');
        $this->assertSame(
            ['hours' => 0, 'rank' => 2, 'signin' => 1700000000],
            $this->props()['calendar']['soon'],
            'off is 0 hours, and a hide under this sign-in ships its rank'
        );
        $USER->currentlogin = 1700003600;
        $this->assertNull($this->props()['calendar']['soon']['rank'], 'another sign-in: shown again');
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
        foreach (self::languages() as $lang) {
            $string = [];
            include($root . '/lang/' . $lang . '/block_compass.php');
            $strings[$lang] = $string;
        }
        foreach (shell::CALENDAR_STRINGS as $key) {
            $this->assertArrayHasKey($key, $strings['en'], $key);
            preg_match_all('/\{\$a(?:->\w+)?\}/', $strings['en'][$key], $en);
            sort($en[0]);
            foreach (array_diff(array_keys($strings), ['en']) as $lang) {
                $this->assertArrayHasKey($key, $strings[$lang], "{$lang}: {$key}");
                preg_match_all('/\{\$a(?:->\w+)?\}/', $strings[$lang][$key], $other);
                sort($other[0]);
                $this->assertSame($en[0], $other[0], "{$lang}: {$key}: placeholder parity");
            }
        }
        $calkeys = array_values(preg_grep('/^cal_/', array_keys($strings['en'])));
        $shipped = shell::CALENDAR_STRINGS;
        sort($calkeys);
        sort($shipped);
        $this->assertSame($calkeys, $shipped, 'the strip\'s strings are exactly the cal_ strings of the language file');

        // The calendar's components, Up next among them (ADR-016): every one reads the strip's strings.
        $files = array_merge(glob($root . '/js/esm/src/Calendar*.tsx'), [$root . '/js/esm/src/UpNext.tsx']);
        $this->assertCount(
            4,
            array_filter($files, 'is_file'),
            'CalendarStrip.tsx, CalendarLine.tsx, CalendarCard.tsx and UpNext.tsx'
        );
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
        $this->assertContains('cal_soon_more_one', $read, 'vacuity: Up next\'s reads were found');
        $this->assertSame(
            [],
            array_values(array_diff($read, shell::CALENDAR_STRINGS)),
            'strings the client reads but the shell does not ship'
        );
    }

    /**
     * The strip's dates are written from the language file: twelve months and seven weekdays, each in
     * two lengths (the short months for a narrow block's month span), and templates that use exactly the
     * placeholders the client fills, in both languages.
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
        $lists = [
            'cal_month_%02d' => range(1, 12),
            'cal_monthshort_%02d' => range(1, 12),
            'cal_weekday_%d' => range(0, 6),
            'cal_weekdayshort_%d' => range(0, 6),
        ];
        foreach (self::languages() as $lang) {
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
            $this->assertCount(38, $names, $lang);
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

    /**
     * With news_enabled off, the shell ships no open-courses props and none of the line's strings.
     *
     * The control is the same Dashboard with the setting on: the key appears, so its absence here is the
     * setting's doing (ADR-017 decision 1: off costs nothing, so the client mounts and asks nothing).
     *
     * @return void
     */
    public function test_the_news_props_are_absent_while_the_line_is_off(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());

        $props = $this->props();
        $this->assertArrayNotHasKey('news', $props, 'off by default: no props, so nothing mounts');
        $this->assertSame([], preg_grep('/^news_/', array_keys($props['labels'])), 'no line string among the labels');

        set_config('news_enabled', 1, 'block_compass');
        $this->assertArrayHasKey('news', $this->props(), 'the control: on, the key appears');

        set_config('news_enabled', 0, 'block_compass');
        $this->assertArrayNotHasKey('news', $this->props(), 'an explicit 0 is off too');
    }

    /**
     * The open-courses props carry the strings, the sign-in markers and, without the calendar, its members.
     *
     * signin is the marker the line was hidden under during this sign-in, 0 when it shows, so a hidden
     * line asks nothing (decision 9); marker is this sign-in's own, the one a hide writes. With the
     * calendar's props absent, the line carries the date strings it writes the band's last day with and
     * the calendar's stored members, which a hide writes back; with them present, neither is duplicated.
     *
     * @return void
     */
    public function test_the_news_props_carry_the_strings_and_the_hidden_marker(): void {
        global $USER;

        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());
        set_config('news_enabled', 1, 'block_compass');
        $USER->currentlogin = 1700000000;
        set_user_preference('block_compass_calendar', json_encode([
            'view' => 'teaching',
            'open' => true,
            'soon' => ['rank' => 2, 'signin' => 1700000000],
        ]));

        $news = $this->props()['news'];
        $this->assertTrue($news['enabled']);
        $this->assertSame(0, $news['signin'], 'not hidden: the line asks');
        $this->assertSame(1700000000, $news['marker'], 'the sign-in a hide is written under');
        $this->assertStringContainsString('aria-hidden="true"', $news['icon']);
        $keys = array_merge(shell::NEWS_STRINGS, shell::NEWS_DATE_STRINGS);
        $this->assertSame($keys, array_keys($news['strings']), 'the calendar is off: the date strings come along');
        foreach ($keys as $key) {
            $this->assertSame(get_string($key, 'block_compass'), $news['strings'][$key], $key);
        }
        $this->assertSame(
            ['view' => 'teaching', 'filter' => 'all', 'relevance' => true, 'open' => true],
            $news['state'],
            'the calendar\'s members a hide writes back, as calendar_preference reads them'
        );
        $this->assertSame(['rank' => 2, 'signin' => 1700000000], $news['soon']);

        // Hidden under this sign-in: the marker ships, and the line asks nothing.
        set_user_preference('block_compass_calendar', json_encode(['news' => ['signin' => 1700000000]]));
        $this->assertSame(1700000000, $this->props()['news']['signin']);
        $this->assertNull($this->props()['news']['soon']);
        // Another sign-in: shown again.
        $USER->currentlogin = 1700003600;
        $this->assertSame(0, $this->props()['news']['signin'], 'another sign-in: shown again');
        $this->assertSame(1700003600, $this->props()['news']['marker']);

        // With the calendar here, its props carry the date strings and the members: nothing is duplicated.
        set_config('calendar_enabled', 1, 'block_compass');
        $props = $this->props();
        $this->assertSame(shell::NEWS_STRINGS, array_keys($props['news']['strings']));
        $this->assertArrayNotHasKey('state', $props['news']);
        $this->assertArrayNotHasKey('soon', $props['news']);
        foreach (shell::NEWS_DATE_STRINGS as $key) {
            $this->assertArrayHasKey($key, $props['calendar']['strings'], $key);
        }
        // The calendar on another surface: the line carries them again.
        set_config('calendar_where', 'page', 'block_compass');
        $this->assertArrayHasKey('state', $this->props()['news']);
    }

    /**
     * Every string the line shows exists in both languages with the same placeholders, and every one the
     * client reads is shipped.
     *
     * The client reads them as strings.<key> from the line's props, never as labels.<key>. Vacuity guards:
     * the scan found OpenCourses.tsx and its reads.
     *
     * @return void
     */
    public function test_the_news_strings_are_shipped_and_in_both_languages(): void {
        $root = dirname(__DIR__);
        $strings = [];
        foreach (self::languages() as $lang) {
            $string = [];
            include($root . '/lang/' . $lang . '/block_compass.php');
            $strings[$lang] = $string;
        }
        $line = array_values(array_filter(
            array_keys($strings['en']),
            static fn(string $key): bool => str_starts_with($key, 'news_') && in_array($key, shell::NEWS_STRINGS, true)
        ));
        $this->assertSame(shell::NEWS_STRINGS, $line, 'the line\'s strings, in the language file\'s order');
        foreach (shell::NEWS_STRINGS as $key) {
            preg_match_all('/\{\$a(?:->\w+)?\}/', $strings['en'][$key], $en);
            sort($en[0]);
            foreach (array_diff(array_keys($strings), ['en']) as $lang) {
                $this->assertArrayHasKey($key, $strings[$lang], "{$lang}: {$key}");
                preg_match_all('/\{\$a(?:->\w+)?\}/', $strings[$lang][$key], $other);
                sort($other[0]);
                $this->assertSame($en[0], $other[0], "{$lang}: {$key}: placeholder parity");
            }
        }
        $source = file_get_contents($root . '/js/esm/src/OpenCourses.tsx');
        $this->assertDoesNotMatchRegularExpression('/\blabels\.news_/', $source, 'a line string read as a label');
        preg_match_all('/\bstrings\.([a-z_]+)\b/', $source, $matches);
        $read = array_values(array_unique($matches[1]));
        $this->assertContains('news_summary_one', $read, 'vacuity: the singular is read');
        $this->assertContains('news_group_label', $read, 'vacuity: the group sentence is read');
        $this->assertSame([], array_values(array_diff($read, shell::NEWS_STRINGS)), 'read but not shipped');
        $this->assertSame([], array_values(array_diff(shell::NEWS_STRINGS, $read)), 'shipped but never read');
    }

    /**
     * With the line on, rendering the shell still reads nothing from the database once core is warm.
     *
     * The protocol of test_the_shell_costs_no_database_reads_when_core_is_warm(): the setting comes from
     * the config cache, the hidden marker from the request's preference bundle, and the line's data from
     * the client's own request (block_compass_get_news).
     *
     * @return void
     */
    public function test_the_shell_with_the_line_costs_no_database_reads_when_core_is_warm(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());
        set_config('news_enabled', 1, 'block_compass');
        set_user_preference('block_compass_calendar', json_encode(['view' => 'learning']));

        $this->make_block()->get_content();

        $block = $this->make_block();
        $block->page->get_renderer('core');

        $meter = budget::start();
        $content = $block->get_content();
        $reads = $meter->reads();

        // The control: the line's props were rendered, so the zero is about a shell that built them.
        preg_match('/data-react-props=\'(.*?)\'/', $content->text, $matches);
        $this->assertArrayHasKey('news', json_decode(html_entity_decode($matches[1]), true));
        $this->assertSame(0, $reads);
    }

    /**
     * The shell's own skeleton, between the mount point's props and the never-mounts sentence.
     *
     * @param string $html The block's content.
     * @return string The preload's markup.
     */
    private function preload(string $html): string {
        $start = strpos($html, '<div class="compass-preload"');
        $end = strpos($html, '<p class="compass-noscript">');
        $this->assertNotFalse($start, 'the shell draws no preload');
        $this->assertNotFalse($end, 'the never-mounts sentence is gone');
        $this->assertLessThan($end, $start, 'the sentence follows the skeleton, which the CSS step relies on');

        return substr($html, $start, $end - $start);
    }

    /**
     * Without a stored shape, the shell draws the fallback: one untitled strip of three cards, in one row.
     *
     * The control is the same viewer with a shape stored: the fallback's markers go, so their presence here
     * is the missing shape's doing (ADR-018 decision 1).
     *
     * @return void
     */
    public function test_without_a_stored_shape_the_shell_draws_the_one_row_fallback(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());

        $html = $this->make_block()->get_content()->text;
        $preload = $this->preload($html);
        $this->assertMatchesRegularExpression('/<div class="compass-preload" aria-hidden="true">/', $preload);
        $this->assertSame(1, substr_count($preload, 'data-region="tier1-skeleton"'));
        $this->assertSame(1, substr_count($preload, '<div class="compass-strip">'));
        $this->assertSame(3, substr_count($preload, '<div class="compass-card card h-100">'));
        $this->assertSame(3, substr_count($preload, '<div class="compass-progress mb-2">'), 'completion drawn, core\'s default');
        $this->assertStringContainsString('compass-sk-cards compass-sk-onerow', $preload);
        $this->assertStringContainsString('compass-skeleton-title', $preload, 'an untitled strip: a bar for its title');
        $this->assertStringNotContainsString('compass-ghost', $preload);
        $this->assertStringNotContainsString('compass-cal', $preload, 'the calendar is off: no head');
        // No heading and no control in it: a hidden placeholder is no section.
        $this->assertDoesNotMatchRegularExpression('/<(h[1-6]|button|a)\b/', $preload);
        $props = $this->props();
        $this->assertSame(['dashboard' => null, 'page' => null], $props['tier1']['shapes']);
        $this->assertSame('dashboard', $props['tier1']['surface']);
        $this->assertSame(3, $props['tier1']['skeleton']['slots'][0]['strip']['count']);
        $this->assertArrayNotHasKey('cards', $props['tier1']['skeleton']['slots'][0]['strip'], 'the client counts');

        // The control.
        set_user_preference(tier1_preference::NAME, json_encode([
            'v' => 1,
            'dashboard' => ['strips' => [['continue', 1, true]], 'ghost' => false, 'pending' => false],
        ]));
        $preload = $this->preload($this->make_block()->get_content()->text);
        $this->assertStringNotContainsString('compass-sk-onerow', $preload);
        $this->assertStringNotContainsString('compass-skeleton-title', $preload);
        $this->assertSame(1, substr_count($preload, '<div class="compass-card card h-100">'));
    }

    /**
     * With a stored shape, the shell draws it: the strips with their real titles in the shell's order, their
     * cards, the ghost closing the last strip that is not Starts soon, and the pending notice after New.
     *
     * @return void
     */
    public function test_with_a_stored_shape_the_shell_draws_that_shape(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());
        set_config('enable_pending', 1, 'block_compass');
        $dashboard = [
            'strips' => [['continue', 2, true], ['new', 1, false], ['scheduled', 3, false]],
            'ghost' => true,
            'pending' => true,
        ];
        $page = ['strips' => [['favourites', 4, true]], 'ghost' => false, 'pending' => false];
        set_user_preference(tier1_preference::NAME, json_encode(['v' => 1, 'dashboard' => $dashboard, 'page' => $page]));

        $preload = $this->preload($this->make_block()->get_content()->text);

        preg_match_all('/<div class="compass-strip-title h6 fw-bold text-muted mb-0">([^<]*)<\/div>/', $preload, $titles);
        $this->assertSame(
            [
                get_string('strip_continue', 'block_compass'),
                get_string('strip_new', 'block_compass'),
                get_string('strip_scheduled', 'block_compass'),
            ],
            array_map('html_entity_decode', $titles[1])
        );
        $this->assertSame(6, substr_count($preload, '<div class="compass-card card h-100">'));
        $this->assertSame(2, substr_count($preload, '<div class="compass-progress mb-2">'), 'Continue\'s two cards');
        $this->assertSame(3, substr_count($preload, 'compass-skeleton-pill'), 'Starts soon\'s three pills');
        $this->assertSame(3, substr_count($preload, 'compass-skeleton-action'), 'and no action on them');
        $this->assertSame(1, substr_count($preload, '<div class="compass-ghost card h-100 text-center w-100">'));
        $this->assertStringNotContainsString('compass-ghost-wrap', $preload, 'the ghost closes a strip');
        // The ghost closes New, the last strip that is not Starts soon.
        $new = strpos($preload, get_string('strip_new', 'block_compass'));
        $ghost = strpos($preload, 'compass-ghost card');
        $scheduled = strpos($preload, get_string('strip_scheduled', 'block_compass'));
        $this->assertTrue($new < $ghost && $ghost < $scheduled, 'New, its ghost, then Starts soon');
        // The notice's line needs the feature, which needs enrol_apply (config::pending_enabled());
        // test_the_skeleton_places_the_ghost_and_the_notice_as_the_block_does reaches it without.
        $pending = config::pending_enabled();
        $this->assertSame($pending ? 1 : 0, substr_count($preload, '<p class="compass-strip-note small">'));

        // The props carry both surfaces, as validated, for the client's comparison and its write.
        $props = $this->props();
        $expected = ['dashboard' => array_merge($dashboard, ['pending' => $pending]), 'page' => $page];
        $this->assertSame($expected, $props['tier1']['shapes']);
    }

    /**
     * The skeleton's model places the ghost and the pending notice as Block.tsx places them.
     *
     * The ghost closes the last remembered strip that is not Starts soon, or stands alone after the strips;
     * the notice follows New enrolments' place whether or not that strip has cards; with no strip, the empty
     * state's line; with no shape, one untitled strip of three cards in one row.
     *
     * @return void
     */
    public function test_the_skeleton_places_the_ghost_and_the_notice_as_the_block_does(): void {
        $strips = [
            ['name' => 'continue', 'title' => 'C'],
            ['name' => 'new', 'title' => 'N'],
            ['name' => 'scheduled', 'title' => 'S'],
            ['name' => 'favourites', 'title' => 'F'],
        ];
        $model = shell::skeleton(
            ['strips' => [['continue', 2, true], ['new', 1, false], ['scheduled', 3, false]], 'ghost' => true, 'pending' => true],
            $strips,
            false
        );
        $this->assertSame([false, true, false], array_column($model['slots'], 'note'), 'the notice follows New');
        $this->assertSame(['C', 'N', 'S'], array_map(fn($slot) => $slot['strip']['title'], $model['slots']));
        $this->assertSame([false, true, false], array_map(fn($slot) => $slot['strip']['closing'], $model['slots']));
        $this->assertSame([false, false, true], array_map(fn($slot) => $slot['strip']['later'], $model['slots']));
        $this->assertSame([2, 1, 3], array_map(fn($slot) => count($slot['strip']['cards']), $model['slots']));
        $this->assertFalse($model['ghostalone']);
        $this->assertFalse($model['empty']);
        $this->assertFalse($model['category']);

        // New without cards: the notice keeps its place, with no strip.
        $model = shell::skeleton(['strips' => [['scheduled', 1, false]], 'ghost' => true, 'pending' => true], $strips, true);
        $this->assertSame([['strip' => null, 'note' => true]], array_slice($model['slots'], 0, 1));
        $this->assertTrue($model['ghostalone'], 'only Starts soon: the ghost stands alone');

        $model = shell::skeleton(['strips' => [], 'ghost' => false, 'pending' => false], $strips, true);
        $this->assertSame([], $model['slots']);
        $this->assertTrue($model['empty']);

        $model = shell::skeleton(null, $strips, true);
        $this->assertCount(1, $model['slots']);
        $this->assertTrue($model['slots'][0]['strip']['onerow']);
        $this->assertFalse($model['slots'][0]['strip']['hastitle']);
        $this->assertSame(3, $model['slots'][0]['strip']['count']);
    }

    /**
     * The skeleton's model holds a strip's card count to the reader's bounds itself: skeleton() is public, and
     * only tier1_preference::read() bounds what reaches it from the stored value.
     *
     * @return void
     */
    public function test_the_skeleton_holds_a_strips_count_to_the_readers_bounds(): void {
        $strips = [['name' => 'continue', 'title' => 'C'], ['name' => 'new', 'title' => 'N']];
        $model = shell::skeleton(
            ['strips' => [['continue', 0, true], ['new', 1000, false]], 'ghost' => false, 'pending' => false],
            $strips,
            false
        );
        $bounds = [1, tier1_preference::MAX_CARDS];
        $this->assertSame($bounds, array_map(fn($slot) => count($slot['strip']['cards']), $model['slots']));
        $this->assertSame($bounds, array_map(fn($slot) => $slot['strip']['count'], $model['slots']));
    }

    /**
     * Where the strip renders, the shell draws its head first: closed, the line's five waiting cells; open,
     * the frame and the row's waiting skeleton.
     *
     * @return void
     */
    public function test_the_calendar_head_is_drawn_from_its_remembered_state(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());
        set_config('calendar_enabled', 1, 'block_compass');

        $preload = $this->preload($this->make_block()->get_content()->text);
        $this->assertMatchesRegularExpression(
            '/<div class="compass-cal compass-cal-style-\w+ compass-cal-closed" aria-hidden="true">/',
            $preload
        );
        $this->assertSame(5, substr_count($preload, '<li class="compass-cal-psk">'));
        $this->assertStringNotContainsString('compass-cal-days-waiting', $preload);
        $this->assertLessThan(strpos($preload, 'tier1-skeleton'), strpos($preload, 'compass-cal'), 'the head comes first');
        $this->assertStringContainsString(get_string('cal_region', 'block_compass'), $preload);

        set_user_preference('block_compass_calendar', json_encode(['open' => true]));
        $preload = $this->preload($this->make_block()->get_content()->text);
        $this->assertStringContainsString('compass-cal-isopen', $preload);
        $this->assertStringContainsString('compass-cal-sk-month', $preload);
        $this->assertStringContainsString('compass-cal-days compass-cal-days-waiting', $preload);
        $this->assertStringNotContainsString('compass-cal-psk', $preload);
    }

    /**
     * The shell with a stored shape and the calendar's head still reads nothing.
     *
     * The protocol of test_the_shell_costs_no_database_reads_when_core_is_warm(); the shape comes from the
     * request's preference bundle (ADR-018 decision 5).
     *
     * @return void
     */
    public function test_the_shell_with_a_stored_shape_costs_no_database_reads_when_core_is_warm(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());
        set_config('calendar_enabled', 1, 'block_compass');
        set_user_preference(tier1_preference::NAME, json_encode([
            'v' => 1,
            'dashboard' => ['strips' => [['continue', 3, true]], 'ghost' => true, 'pending' => false],
        ]));

        $this->make_block()->get_content();

        $block = $this->make_block();
        $block->page->get_renderer('core');

        $meter = budget::start();
        $content = $block->get_content();
        $reads = $meter->reads();

        // The control: the stored shape was drawn, so the zero is about a shell that read it.
        $this->assertSame(3, substr_count($this->preload($content->text), '<div class="compass-card card h-100">'));
        $this->assertSame(0, $reads);
    }

    /**
     * The languages whose pack the plugin directory carries: English always, Portuguese in a git checkout.
     *
     * The release package ships English only (lang/pt_br is export-ignored, and translations reach
     * sites through AMOS), so a run from the package checks the English pack alone.
     *
     * @return string[]
     */
    private static function languages(): array {
        return is_file(dirname(__DIR__) . '/lang/pt_br/block_compass.php') ? ['en', 'pt_br'] : ['en'];
    }
}
