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

namespace block_compass\external;

use advanced_testcase;
use block_compass\fixtures\category_badges_listener;
use block_compass\fixtures\course_kinds_listener;
use block_compass\fixtures\open_courses_fixture;
use block_compass\hook\category_link as category_link_hook;
use block_compass\local\calendar_preference;
use core\hook\manager;
use core_external\external_api;
use PHPUnit\Framework\Attributes\CoversClass;

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/../fixtures/open_courses_fixture.php');

/**
 * The open-courses line as an allowlisted service (ADR-017 stage 14c): who is refused, when it
 * answers empty, where each group leads, and what travels.
 *
 * The real clock, as news_test: local_unlistedcourses' next action judges windows at time(), and
 * every course starts a day from now, inside the default band. Every case replaces core's hook
 * manager with one that knows no component's callbacks, so a theme installed on the stack never
 * answers the category_link hook; a listener is a redirection of the hook to a closure. Each empty
 * answer has a control in the same case that answers with the course.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(get_news::class)]
final class get_news_test extends advanced_testcase {
    use open_courses_fixture;

    /** @var string[] The keys the service returns at the top level, in order. */
    private const TOP_KEYS = ['from', 'to', 'total', 'groupcount', 'truncated', 'groups', 'allurl', 'kinds'];

    /** @var string[] The keys of each group, in order. */
    private const GROUP_KEYS = ['categoryid', 'name', 'count', 'url', 'courseid', 'coursename', 'kinds'];

    /** @var array What an off or hidden line answers. */
    private const EMPTY = [
        'from' => '',
        'to' => '',
        'total' => 0,
        'groupcount' => 0,
        'truncated' => false,
        'groups' => [],
        'allurl' => '',
        'kinds' => [],
    ];

    /**
     * A fresh site in a fixed site timezone, the line on, the open layers empty, no listener.
     *
     * @return void
     */
    protected function setUp(): void {
        parent::setUp();

        $this->resetAfterTest();
        set_config('timezone', 'America/Sao_Paulo');
        set_config('forcetimezone', 99);
        set_config('news_enabled', 1, 'block_compass');
        $this->purge_open_caches();
        \core\di::set(manager::class, manager::phpunit_get_instance([]));
    }

    /**
     * resetAfterTest() does not restore superglobals: drop the sesskey call() plants in $_POST.
     *
     * @return void
     */
    protected function tearDown(): void {
        unset($_POST['sesskey']);
        parent::tearDown();
    }

    /**
     * Call the service the way the browser does, in a new request.
     *
     * @return array Its data, cleaned against the return structure.
     */
    private function call(): array {
        $this->new_request();
        $_POST['sesskey'] = sesskey();
        $result = external_api::call_external_function('block_compass_get_news', [], true);
        $this->assertFalse($result['error'], json_encode($result['exception'] ?? null));

        return external_api::clean_returnvalue(get_news::execute_returns(), $result['data']);
    }

    /**
     * The groups of an answer by category id.
     *
     * @param array $data An answer.
     * @return array Category id => group.
     */
    private static function by_category(array $data): array {
        $groups = [];
        foreach ($data['groups'] as $group) {
            $groups[(int) $group['categoryid']] = $group;
        }

        return $groups;
    }

    /**
     * A category with a given number of open courses.
     *
     * @param int $courses How many courses.
     * @param array $record Extra category fields.
     * @return \core_course_category The category.
     */
    private function category_with(int $courses, array $record = []): \core_course_category {
        $category = $this->getDataGenerator()->create_category($record);
        for ($i = 0; $i < $courses; $i++) {
            $this->open_course(time() + DAYSECS + $i, (int) $category->id);
        }

        return $category;
    }

    /**
     * The guest is refused, with the line on and a course it could otherwise be offered.
     *
     * @return void
     */
    public function test_the_guest_is_refused(): void {
        $this->category_with(1);
        $this->setGuestUser();
        $this->new_request();
        $_POST['sesskey'] = sesskey();

        $result = external_api::call_external_function('block_compass_get_news', [], true);

        $this->assertTrue($result['error']);
        $this->assertSame('noguest', $result['exception']->errorcode);
    }

    /**
     * With the line off the answer is the empty one; switched on, the same viewer gets the course.
     *
     * @return void
     */
    public function test_off_means_empty(): void {
        $this->category_with(1);
        $this->setUser($this->getDataGenerator()->create_user());
        set_config('news_enabled', 0, 'block_compass');

        $this->assertSame(self::EMPTY, $this->call());

        set_config('news_enabled', 1, 'block_compass');
        $this->assertSame(1, $this->call()['total'], 'The control: the line on offers the course.');
    }

    /**
     * Hidden during this sign-in the answer is empty; at another sign-in the line answers again.
     *
     * @return void
     */
    public function test_hidden_for_this_signin_means_empty_until_the_next(): void {
        global $USER;

        $this->category_with(1);
        $this->setUser($this->getDataGenerator()->create_user());
        $USER->currentlogin = time() - HOURSECS;
        set_user_preference(calendar_preference::NAME, json_encode(['news' => ['signin' => (int) $USER->currentlogin]]));

        $this->assertSame(self::EMPTY, $this->call());

        $USER->currentlogin = (int) $USER->currentlogin + 60;
        $this->assertSame(1, $this->call()['total'], 'Another sign-in marker shows the line again.');
    }

    /**
     * A group of one course leads to its enrolment page and names the course; the root leads to
     * core's course index with no listener.
     *
     * @return void
     */
    public function test_a_group_of_one_leads_to_the_enrolment_page(): void {
        global $CFG, $DB;

        $category = $this->category_with(1);
        $courseid = (int) $DB->get_field('course', 'id', ['category' => $category->id], MUST_EXIST);
        $this->setUser($this->getDataGenerator()->create_user());

        $data = $this->call();

        $group = self::by_category($data)[(int) $category->id];
        $this->assertSame(1, $group['count']);
        $this->assertSame($courseid, $group['courseid']);
        $this->assertNotSame('', $group['coursename']);
        $this->assertSame($CFG->wwwroot . '/enrol/index.php?id=' . $courseid, $group['url']);
        $this->assertSame($CFG->wwwroot . '/course/index.php', $data['allurl']);
    }

    /**
     * A group of several leads to core's category page when nothing listens, and carries no course.
     *
     * @return void
     */
    public function test_a_group_of_several_leads_to_core_without_a_listener(): void {
        global $CFG;

        $category = $this->category_with(2);
        $this->setUser($this->getDataGenerator()->create_user());

        $data = $this->call();

        $group = self::by_category($data)[(int) $category->id];
        $this->assertSame(2, $group['count']);
        $this->assertSame($CFG->wwwroot . '/course/index.php?categoryid=' . $category->id, $group['url']);
        $this->assertSame(0, $group['courseid']);
        $this->assertSame('', $group['coursename']);
        $this->assertSame($CFG->wwwroot . '/course/index.php', $data['allurl']);
    }

    /**
     * A listener leads the groups of several and the root, asked once with the band and the viewer; a
     * group of one is never asked and keeps its enrolment page.
     *
     * @return void
     */
    public function test_a_listener_leads_the_groups_of_several_and_the_root(): void {
        global $CFG;

        $several = $this->category_with(2);
        $one = $this->category_with(1);
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);
        $asked = [];
        \core\di::get(manager::class)->phpunit_redirect_hook(
            category_link_hook::class,
            static function (category_link_hook $hook) use (&$asked): void {
                $asked[] = [$hook->get_categoryids(), $hook->get_from(), $hook->get_to(), $hook->get_userid()];
                foreach ($hook->get_categoryids() as $categoryid) {
                    $url = new \core\url('/course/index.php', ['categoryid' => $categoryid, 'chip' => 'open']);
                    $hook->set_url($categoryid, $url);
                }
            }
        );

        $data = $this->call();

        $this->assertSame([[[(int) $several->id, 0], $data['from'], $data['to'], (int) $user->id]], $asked, 'One dispatch.');
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}$/', $data['from']);
        $groups = self::by_category($data);
        $this->assertSame(
            $CFG->wwwroot . '/course/index.php?categoryid=' . $several->id . '&chip=open',
            $groups[(int) $several->id]['url']
        );
        $this->assertStringStartsWith($CFG->wwwroot . '/enrol/index.php?id=', $groups[(int) $one->id]['url']);
        $this->assertSame($CFG->wwwroot . '/course/index.php?categoryid=0&chip=open', $data['allurl']);
    }

    /**
     * The answer is the allowlist: the top keys and each group's, in order, nothing of the entry's
     * markers (sign-in, language, depth, digest, build time).
     *
     * @return void
     */
    public function test_the_answer_is_the_allowlist(): void {
        $this->category_with(2);
        $this->category_with(1);
        $this->setUser($this->getDataGenerator()->create_user());

        $data = $this->call();

        $this->assertSame(self::TOP_KEYS, array_keys($data));
        $this->assertCount(2, $data['groups']);
        foreach ($data['groups'] as $group) {
            $this->assertSame(self::GROUP_KEYS, array_keys($group));
        }
        $this->assertSame(3, $data['total']);
        $this->assertSame(2, $data['groupcount']);
        $this->assertFalse($data['truncated']);
        $this->assertNotSame('', $data['to']);
        $this->assertNotSame('', $data['allurl']);
    }

    /**
     * Names with an ampersand, markup and a bare "<" pass PARAM_TEXT: the response is not refused, the
     * ampersand travels unescaped, the markup is gone and the bare "<" stays.
     *
     * @return void
     */
    public function test_names_with_markup_and_ampersands_pass(): void {
        global $DB;

        $several = $this->category_with(2, ['name' => 'R&D <b>Labs</b> 1 < 2']);
        $one = $this->getDataGenerator()->create_category(['name' => 'Arts & Crafts']);
        $course = $this->open_course(time() + DAYSECS, (int) $one->id, 'self', ['fullname' => 'Fish & Chips <i>101</i> 2 < 3']);
        $this->setUser($this->getDataGenerator()->create_user());

        $groups = self::by_category($this->call());

        $stored = $DB->get_field('course_categories', 'name', ['id' => $several->id]);
        $context = \core\context\coursecat::instance((int) $several->id);
        $expected = format_string($stored, true, ['context' => $context, 'escape' => false]);
        $this->assertSame($expected, $groups[(int) $several->id]['name']);
        $this->assertStringContainsString('R&D', $groups[(int) $several->id]['name']);
        $this->assertStringContainsString('1 < 2', $groups[(int) $several->id]['name']);
        $this->assertStringNotContainsString('<b>', $groups[(int) $several->id]['name']);
        $this->assertSame('Arts & Crafts', $groups[(int) $one->id]['name']);
        $this->assertSame((int) $course->id, $groups[(int) $one->id]['courseid']);
        $this->assertStringContainsString('Fish & Chips', $groups[(int) $one->id]['coursename']);
        $this->assertStringContainsString('2 < 3', $groups[(int) $one->id]['coursename']);
        $this->assertStringNotContainsString('<i>', $groups[(int) $one->id]['coursename']);
    }

    /**
     * A course the viewer teaches is never offered to them; the control course in another category is.
     *
     * @return void
     */
    public function test_a_teachers_course_is_never_listed(): void {
        $gen = $this->getDataGenerator();
        $taught = $gen->create_category();
        $other = $gen->create_category();
        $teaches = $this->open_course(time() + DAYSECS, (int) $taught->id);
        $control = $this->open_course(time() + DAYSECS + 1, (int) $other->id);
        $user = $gen->create_user();
        $gen->enrol_user($user->id, $teaches->id, 'editingteacher', 'manual');
        $this->setUser($user);

        $data = $this->call();

        $this->assertSame(1, $data['total']);
        $this->assertSame([(int) $control->id], array_column($data['groups'], 'courseid'));
        $this->assertArrayNotHasKey((int) $taught->id, self::by_category($data));
    }

    /**
     * Use a hook manager that knows the two ADR-019 fixture listeners, reset, or no listener at all.
     *
     * @param bool $listening Whether the course_kinds and category_badges fixtures are registered.
     * @return void
     */
    private function use_listeners(bool $listening): void {
        require_once(__DIR__ . '/../fixtures/course_kinds_listener.php');
        require_once(__DIR__ . '/../fixtures/category_badges_listener.php');
        course_kinds_listener::reset();
        category_badges_listener::reset();
        $files = $listening ? [
            'block_compass_kinds' => __DIR__ . '/../fixtures/course_kinds_hooks.php',
            'block_compass_crests' => __DIR__ . '/../fixtures/category_badges_hooks.php',
        ] : [];
        \core\di::set(manager::class, manager::phpunit_get_instance($files));
    }

    /**
     * With a listener the counts fold by kind and carry its nouns, the default kind first; each group
     * carries its own counts by kind (ADR-019 decisions 5 and 6).
     *
     * @return void
     */
    public function test_kinds_fold_by_the_listener_and_carry_its_nouns(): void {
        $this->use_listeners(true);
        $plugin = $this->getDataGenerator()->get_plugin_generator('block_compass');
        $model = $plugin->course_field('select', 'model', ['options' => "Course\nEvent", 'visibility' => 2]);
        course_kinds_listener::$field = 'model';
        course_kinds_listener::$kinds = [[2, 'event', 'evento', 'eventos'], [1, 'course', 'curso', 'cursos']];
        $mixed = $this->getDataGenerator()->create_category();
        $events = $this->getDataGenerator()->create_category();
        $plugin->field_value($model, (int) $this->open_course(time() + DAYSECS, (int) $mixed->id)->id, 2);
        $this->open_course(time() + DAYSECS + 1, (int) $mixed->id);
        $plugin->field_value($model, (int) $this->open_course(time() + DAYSECS + 2, (int) $events->id)->id, 2);
        $this->setUser($this->getDataGenerator()->create_user());

        $data = $this->call();

        $this->assertSame([
            ['key' => 'course', 'count' => 1, 'one' => 'curso', 'many' => 'cursos'],
            ['key' => 'event', 'count' => 2, 'one' => 'evento', 'many' => 'eventos'],
        ], $data['kinds'], 'the default kind first; the listener\'s nouns');
        $groups = self::by_category($data);
        $this->assertSame(
            [['key' => 'course', 'count' => 1], ['key' => 'event', 'count' => 1]],
            $groups[(int) $mixed->id]['kinds']
        );
        $this->assertSame([['key' => 'event', 'count' => 1]], $groups[(int) $events->id]['kinds']);
    }

    /**
     * With no listener every course is a course, named with the block's own nouns; no crest is drawn.
     *
     * @return void
     */
    public function test_without_listeners_every_course_is_a_course_and_none_has_a_crest(): void {
        $this->use_listeners(false);
        $this->category_with(2);
        $this->setUser($this->getDataGenerator()->create_user());

        $data = $this->call();

        $default = [
            'key' => 'course',
            'count' => 2,
            'one' => get_string('news_kind_course', 'block_compass'),
            'many' => get_string('news_kind_courses', 'block_compass'),
        ];
        $this->assertSame([$default], $data['kinds']);
        $this->assertSame([['key' => 'course', 'count' => 2]], $data['groups'][0]['kinds']);
        $this->assertArrayNotHasKey('crest', $data['groups'][0]);
    }

    /**
     * A category's crest reaches its group, a category with none has no crest key, and the setting off
     * asks nothing (ADR-019 decision 1).
     *
     * @return void
     */
    public function test_crests_reach_their_groups_only_with_the_setting(): void {
        $this->use_listeners(true);
        $crested = $this->category_with(1);
        $plain = $this->category_with(1);
        category_badges_listener::$answers = [
            (int) $crested->id => [['url' => 'https://example.com/pluginfile.php/1/theme_x/b/crest.png', 'alt' => 'Crest']],
        ];
        $this->setUser($this->getDataGenerator()->create_user());

        set_config('show_theme_badges', 1, 'block_compass');
        $groups = self::by_category($this->call());
        $this->assertSame('https://example.com/pluginfile.php/1/theme_x/b/crest.png', $groups[(int) $crested->id]['crest']);
        $this->assertSame('Crest', $groups[(int) $crested->id]['crestalt']);
        $this->assertArrayNotHasKey('crest', $groups[(int) $plain->id]);
        $this->assertArrayNotHasKey('crestalt', $groups[(int) $plain->id]);

        category_badges_listener::$asked = [];
        set_config('show_theme_badges', 0, 'block_compass');
        $groups = self::by_category($this->call());
        $this->assertArrayNotHasKey('crest', $groups[(int) $crested->id]);
        $this->assertSame([], category_badges_listener::$asked, 'the setting off asks nothing');
    }
}
