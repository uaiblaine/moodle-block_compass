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

namespace block_compass\local\progress;

use core_completion\progress;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * Compass's progress against core's, for every learner of a course that holds every case of core's rule.
 *
 * Core is the oracle ({@see progress::get_course_progress_percentage()} and
 * {@see \completion_info::get_user_activities_with_completion()}): each learner gets the same set of
 * counted activities and the same percentage from both, in every scenario. The test runs on every CI
 * leg, so a core release that changes the rule shows up here as a disagreement (ADR-027 decision 3,
 * docs/core-parity.md). The vacuity guards prove the matrix tells learners apart: a fixture where
 * everybody counted everything would pass against any rule.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(learner_progress::class)]
#[CoversClass(learner_restrictions::class)]
#[CoversClass(single_user_capability_checker::class)]
final class core_parity_test extends \advanced_testcase {
    /** @var \stdClass The course holding every case. */
    private \stdClass $course;

    /** @var array Group ids by letter: A and B visible to all, C to nobody, D to members, E to each member; X elsewhere. */
    private array $groups = [];

    /** @var array Grouping ids by name: G1 holds A and B, G2 holds C, G3 holds C and D. */
    private array $groupings = [];

    /** @var array User ids by name. */
    private array $users = [];

    /** @var array Course module ids by case name. */
    private array $cms = [];

    /**
     * The scenarios the whole matrix runs under.
     *
     * @return array
     */
    public static function scenario_provider(): array {
        return [
            'as built' => ['none'],
            'restrictions off for the site' => ['availability_off'],
            'completion off for the site' => ['site_completion_off'],
            'completion off for the course' => ['course_completion_off'],
            'every learner but one has completed the course' => ['course_complete'],
        ];
    }

    /**
     * Every learner gets core's counted activities and core's percentage.
     *
     * @param string $scenario What changes before the comparison.
     * @return void
     */
    #[DataProvider('scenario_provider')]
    public function test_every_learner_gets_cores_answer(string $scenario): void {
        $this->resetAfterTest();
        $this->build_course();
        $this->apply($scenario);

        $sets = [];
        foreach ($this->users as $name => $userid) {
            [$core, $compass] = $this->both($userid);
            $this->assertSame($core['counted'], $compass['counted'], "counted activities, $name, $scenario");
            $this->assertSame($core['percentage'], $compass['percentage'], "percentage, $name, $scenario");
            $sets[$name] = $compass;
        }

        if ($scenario === 'none') {
            $this->assert_the_matrix_tells_learners_apart($sets);
        }
    }

    /**
     * A course with no activity tracked by completion has no progress, for core and for Compass.
     *
     * @return void
     */
    public function test_a_course_with_nothing_tracked_has_no_progress(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $course = $gen->create_course(['enablecompletion' => 1]);
        $gen->create_module('page', ['course' => $course->id]);
        $user = $gen->create_and_enrol($course, 'student');
        $this->setUser($user);

        $this->assertNull(progress::get_course_progress_percentage($course, (int) $user->id));
        $this->assertNull(learner_progress::percentage($course, (int) $user->id));
    }

    /**
     * The two answers for one learner, read as that learner, each from a fresh request's state.
     *
     * @param int $userid The learner.
     * @return array Core's then Compass's: counted (sorted ids) and percentage (float or null).
     */
    private function both(int $userid): array {
        $this->setUser($userid);
        $course = get_course($this->course->id);

        \course_modinfo::clear_instance_cache();
        \cache::make_from_params(\cache_store::MODE_REQUEST, 'core', 'course_progress')->purge();
        $completion = new \completion_info($course);
        $counted = array_map('intval', array_keys($completion->is_enabled()
            ? $completion->get_user_activities_with_completion($userid) : []));
        sort($counted);
        $percentage = progress::get_course_progress_percentage($course, $userid);
        $core = ['counted' => $counted, 'percentage' => $percentage === null ? null : (float) $percentage];

        \course_modinfo::clear_instance_cache();
        $completion = new \completion_info($course);
        $counted = $completion->is_enabled() ? learner_progress::counted_activities($completion, $userid) : [];
        sort($counted);
        $compass = ['counted' => $counted, 'percentage' => learner_progress::percentage($course, $userid)];

        return [$core, $compass];
    }

    /**
     * The guards against a vacuous matrix, each written out by hand.
     *
     * @param array $sets Compass's answer by learner name.
     * @return void
     */
    private function assert_the_matrix_tells_learners_apart(array $sets): void {
        $distinct = array_unique(array_map(fn(array $s): string => implode(',', $s['counted']), $sets));
        $this->assertGreaterThanOrEqual(6, count($distinct), 'Too few learners differ: the matrix proves little.');

        $counts = fn(string $user, string $case): bool => in_array($this->cms[$case], $sets[$user]['counted'], true);
        // A permanent restriction leaves an outsider's count, and an insider's, an exempt holder's and a
        // restored group's member stay in.
        $this->assertFalse($counts('none', 'group A'));
        $this->assertTrue($counts('inA', 'group A'));
        $this->assertTrue($counts('aag', 'group A'));
        $this->assertTrue($counts('inB', 'group X, of another course'));
        $this->assertFalse($counts('inA', 'section G2, activity not in group A'));
        $this->assertTrue($counts('aag', 'section G2, activity not in group A'));
        $this->assertFalse($counts('none', 'subsection, any group'));
        $this->assertFalse($counts('inA', 'subsection, any group'));
        $this->assertTrue($counts('inB', 'subsection, any group'));
        // An activity with no restriction of its own takes core's fast path, with no check; in a section the
        // learner fails it is already off the course page, so the section still decides.
        $this->assertFalse($counts('inA', 'section restricted to grouping G2'));
        $this->assertTrue($counts('aag', 'section restricted to grouping G2'));
        $this->assertFalse($counts('none', 'subsection restricted to group B'));
        $this->assertTrue($counts('inB', 'subsection restricted to group B'));
        // The module override exempts its holder from that activity only.
        $this->assertTrue($counts('override', 'group C, with an override'));
        $this->assertFalse($counts('override', 'group C, visible to nobody'));
        // A condition that does not filter lists counts for everybody: dates, completion.
        $this->assertTrue($counts('none', 'a future date only'));
        $this->assertTrue($counts('none', 'completion of another activity'));
        // What the course page does not show counts for nobody.
        foreach (['hidden activity', 'activity in a hidden section', 'activity being deleted'] as $case) {
            $this->assertFalse($counts('inA', $case), $case);
        }
        // The teacher is not tracked: no progress at all.
        $this->assertNull($sets['teacher']['percentage']);
        $this->assertNotNull($sets['none']['percentage']);
    }

    /**
     * Changes the site or the course for one scenario.
     *
     * @param string $scenario The scenario.
     * @return void
     */
    private function apply(string $scenario): void {
        global $DB;
        switch ($scenario) {
            case 'availability_off':
                set_config('enableavailability', 0);
                break;
            case 'site_completion_off':
                set_config('enablecompletion', 0);
                break;
            case 'course_completion_off':
                $DB->set_field('course', 'enablecompletion', 0, ['id' => $this->course->id]);
                rebuild_course_cache($this->course->id, true);
                break;
            case 'course_complete':
                foreach ($this->users as $name => $userid) {
                    if ($name !== 'none') {
                        (new \completion_completion(['course' => $this->course->id, 'userid' => $userid]))->mark_complete();
                    }
                }
                break;
        }
    }

    /**
     * The course: groups, groupings, eight users and one activity per case, each completed by some learners.
     *
     * @return void
     */
    private function build_course(): void {
        global $DB;
        set_config('enableavailability', 1);
        set_config('enablecompletion', 1);
        set_config('allowstealth', 1);
        $gen = $this->getDataGenerator();
        $this->course = $gen->create_course(['enablecompletion' => 1, 'numsections' => 5, 'format' => 'topics']);
        $courseid = (int) $this->course->id;

        $visibilities = ['A' => GROUPS_VISIBILITY_ALL, 'B' => GROUPS_VISIBILITY_ALL, 'C' => GROUPS_VISIBILITY_NONE,
            'D' => GROUPS_VISIBILITY_MEMBERS, 'E' => GROUPS_VISIBILITY_OWN];
        foreach ($visibilities as $letter => $vis) {
            $this->groups[$letter] = (int) $gen->create_group(['courseid' => $courseid, 'visibility' => $vis,
                'participation' => $vis === GROUPS_VISIBILITY_ALL])->id;
        }
        $other = $gen->create_course();
        $this->groups['X'] = (int) $gen->create_group(['courseid' => $other->id])->id;
        foreach (['G1' => ['A', 'B'], 'G2' => ['C'], 'G3' => ['C', 'D']] as $name => $letters) {
            $this->groupings[$name] = (int) $gen->create_grouping(['courseid' => $courseid])->id;
            foreach ($letters as $letter) {
                $gen->create_grouping_group(['groupingid' => $this->groupings[$name], 'groupid' => $this->groups[$letter]]);
            }
        }

        $members = ['inA' => ['A'], 'inB' => ['B', 'D'], 'inAC' => ['A', 'C', 'E'], 'none' => [], 'city' => [],
            'aag' => [], 'override' => [], 'teacher' => ['B']];
        foreach ($members as $name => $letters) {
            $user = $gen->create_user(['city' => $name === 'city' ? 'Recife' : 'Lisboa']);
            $gen->enrol_user($user->id, $courseid, $name === 'teacher' ? 'teacher' : 'student');
            foreach ($letters as $letter) {
                $gen->create_group_member(['groupid' => $this->groups[$letter], 'userid' => $user->id]);
            }
            if ($name === 'inB') {
                $gen->enrol_user($user->id, $other->id, 'student');
                $gen->create_group_member(['groupid' => $this->groups['X'], 'userid' => $user->id]);
            }
            $this->users[$name] = (int) $user->id;
        }
        $roleid = create_role('All groups', 'allgroups', '');
        assign_capability('moodle/site:accessallgroups', CAP_ALLOW, $roleid, \core\context\system::instance());
        role_assign($roleid, $this->users['aag'], \core\context\course::instance($courseid));

        // Section 1 holds one activity per restriction set; the other sections hold their own cases.
        $this->add('no restriction', 1);
        $this->add('a second without restriction', 1);
        foreach (self::restriction_sets() as $case => $set) {
            $this->add($case, 1, ['availability' => json_encode($this->resolve($set))]);
        }
        $this->add('completion of another activity', 1, ['availability' => json_encode(['op' => '&',
            'c' => [['type' => 'completion', 'cm' => $this->cms['no restriction'], 'e' => COMPLETION_COMPLETE]],
            'showc' => [true]])]);
        $this->add('group C, with an override', 1, ['availability' => json_encode($this->resolve(['op' => '&',
            'c' => [['type' => 'group', 'id' => 'C']], 'showc' => [true]]))]);
        $overrideroleid = create_role('Exempt here', 'exempthere', '');
        $system = \core\context\system::instance();
        assign_capability('moodle/course:ignoreavailabilityrestrictions', CAP_ALLOW, $overrideroleid, $system);
        $overridden = \core\context\module::instance($this->cms['group C, with an override']);
        role_assign($overrideroleid, $this->users['override'], $overridden->id);
        $this->add('separate groups, no restriction', 1, ['groupmode' => SEPARATEGROUPS]);
        $this->add('grouping G2, no restriction', 1, ['groupingid' => $this->groupings['G2']]);
        $this->add('no completion tracking', 1, ['completion' => COMPLETION_TRACKING_NONE]);
        $this->add('hidden activity', 1, ['visible' => 0]);
        $this->add('stealth activity', 1, ['visibleoncoursepage' => 0]);
        $this->add('activity being deleted', 1);
        $DB->set_field('course_modules', 'deletioninprogress', 1, ['id' => $this->cms['activity being deleted']]);

        // Section 2: the section restricted to grouping G2, over an unrestricted and a restricted activity.
        $this->add('section restricted to grouping G2', 2);
        $this->add('section G2, activity not in group A', 2, ['availability' => json_encode($this->resolve(['op' => '!&',
            'c' => [['type' => 'group', 'id' => 'A']], 'show' => true]))]);
        $DB->set_field('course_sections', 'availability', json_encode($this->resolve(['op' => '&',
            'c' => [['type' => 'grouping', 'id' => 'G2']], 'showc' => [true]])), ['course' => $courseid, 'section' => 2]);

        // Section 3: hidden.
        $this->add('activity in a hidden section', 3);
        $hidden = get_fast_modinfo($courseid)->get_section_info(3);
        \core_courseformat\formatactions::section($courseid)->set_visibility($hidden, false);

        // Section 4: a subsection whose delegated section is restricted to group B.
        $subsection = $gen->create_module('subsection', ['course' => $courseid], ['section' => 4]);
        rebuild_course_cache($courseid, true);
        $delegated = get_fast_modinfo($courseid)->get_cm($subsection->cmid)->get_delegated_section_info();
        $this->add('subsection restricted to group B', (int) $delegated->section);
        $this->add('subsection, any group', (int) $delegated->section, ['availability' => json_encode(['op' => '&',
            'c' => [['type' => 'group']], 'showc' => [true]])]);
        $DB->set_field('course_sections', 'availability', json_encode($this->resolve(['op' => '&',
            'c' => [['type' => 'group', 'id' => 'B']], 'showc' => [true]])), ['id' => $delegated->id]);

        rebuild_course_cache($courseid, true);
        $this->complete_some();

        // Preconditions the guards lean on.
        $context = \core\context\course::instance($courseid);
        $this->assertTrue(has_capability('moodle/course:ignoreavailabilityrestrictions', $context, $this->users['teacher']));
        $this->assertFalse(has_capability('moodle/site:accessallgroups', $context, $this->users['teacher']));
        $exempt = 'moodle/course:ignoreavailabilityrestrictions';
        $this->assertFalse(has_capability($exempt, $context, $this->users['override']));
        $this->assertTrue(has_capability($exempt, $overridden, $this->users['override']));
    }

    /**
     * The activity restriction sets, with group letters, grouping names and the words future and past.
     *
     * @return array Set by case name.
     */
    private static function restriction_sets(): array {
        $group = fn($id): array => ['op' => '&', 'c' => [['type' => 'group', 'id' => $id]], 'showc' => [true]];
        $recife = ['type' => 'profile', 'sf' => 'city', 'op' => 'isequalto', 'v' => 'Recife'];
        return [
            'group A' => $group('A'),
            'any group' => ['op' => '&', 'c' => [['type' => 'group']], 'showc' => [true]],
            'group C, visible to nobody' => $group('C'),
            'group D, visible to members' => $group('D'),
            'group E, visible to each member' => $group('E'),
            'group X, of another course' => $group('X'),
            'grouping G1' => ['op' => '&', 'c' => [['type' => 'grouping', 'id' => 'G1']], 'showc' => [true]],
            'grouping G3, of groups not visible to all' => ['op' => '&', 'c' => [['type' => 'grouping', 'id' => 'G3']],
                'showc' => [true]],
            'grouping of the activity' => ['op' => '&', 'c' => [['type' => 'grouping', 'activity' => true]],
                'showc' => [true]],
            'grouping 0' => ['op' => '&', 'c' => [['type' => 'grouping', 'id' => 0]], 'showc' => [true]],
            'not in group A' => ['op' => '!&', 'c' => [['type' => 'group', 'id' => 'A']], 'show' => true],
            'in neither A nor B' => ['op' => '!|', 'c' => [['type' => 'group', 'id' => 'A'], ['type' => 'group', 'id' => 'B']],
                'showc' => [true, true]],
            'a future date or group B' => ['op' => '|', 'c' => [['type' => 'date', 'd' => '>=', 't' => 'future'],
                ['type' => 'group', 'id' => 'B']], 'show' => true],
            'a past date and group A' => ['op' => '&', 'c' => [['type' => 'date', 'd' => '>=', 't' => 'past'],
                ['type' => 'group', 'id' => 'A']], 'showc' => [true, true]],
            'a future date only' => ['op' => '&', 'c' => [['type' => 'date', 'd' => '>=', 't' => 'future']], 'showc' => [true]],
            'city is Recife' => ['op' => '&', 'c' => [$recife], 'showc' => [true]],
            'city is not Recife' => ['op' => '!&', 'c' => [$recife], 'show' => true],
            'nested trees' => ['op' => '|', 'c' => [
                ['op' => '&', 'c' => [['type' => 'group', 'id' => 'A'], ['type' => 'date', 'd' => '<', 't' => 'future']]],
                ['op' => '!|', 'c' => [['type' => 'grouping', 'id' => 'G2'], $recife]],
            ], 'show' => true],
        ];
    }

    /**
     * Adds a page tracked by manual completion, in grouping G1 unless the case says otherwise.
     *
     * @param string $case The case name, the key of $this->cms.
     * @param int $section The section number.
     * @param array $options Module fields that differ.
     * @return void
     */
    private function add(string $case, int $section, array $options = []): void {
        $page = $this->getDataGenerator()->create_module('page', array_merge([
            'course' => $this->course->id,
            'section' => $section,
            'completion' => COMPLETION_TRACKING_MANUAL,
            'groupingid' => $case === 'grouping of the activity' ? $this->groupings['G1'] : 0,
        ], $options));
        $this->cms[$case] = (int) $page->cmid;
    }

    /**
     * Marks every other activity complete, shifted per learner, so the percentages differ too.
     *
     * @return void
     */
    private function complete_some(): void {
        $completion = new \completion_info($this->course);
        $modinfo = get_fast_modinfo($this->course->id);
        $index = 0;
        foreach (array_values($this->users) as $offset => $userid) {
            foreach (array_values($this->cms) as $position => $cmid) {
                $cm = $modinfo->get_cm($cmid);
                if ($cm->completion && ($position + $offset) % 2 === 0) {
                    $completion->update_state($cm, COMPLETION_COMPLETE, $userid);
                    $index++;
                }
            }
        }
        $this->assertGreaterThan(0, $index);
    }

    /**
     * Replaces group letters, grouping names and the words future and past with real values.
     *
     * @param array $node A node of the restriction set.
     * @return array The node with real values.
     */
    private function resolve(array $node): array {
        foreach ($node as $key => $value) {
            if (is_array($value)) {
                $node[$key] = $this->resolve($value);
            }
        }
        if (($node['type'] ?? '') === 'group' && isset($node['id'])) {
            $node['id'] = $this->groups[$node['id']];
        }
        if (($node['type'] ?? '') === 'grouping' && is_string($node['id'] ?? null)) {
            $node['id'] = $this->groupings[$node['id']];
        }
        if (($node['type'] ?? '') === 'date') {
            $node['t'] = $node['t'] === 'future' ? time() + WEEKSECS : time() - WEEKSECS;
        }
        return $node;
    }
}
