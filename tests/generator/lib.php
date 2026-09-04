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
 * Compass block data generator.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Block generator plus the fixtures tier 1 is defined by: enrolments with explicit
 * timestamps and last-access rows.
 *
 * "New" and "Continue" are functions of user_enrolments.timecreated and
 * user_lastaccess.timeaccess, so every fixture takes them as arguments instead of
 * relying on time() — the trap that made another plugin's suite weekday-dependent.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class block_compass_generator extends testing_block_generator {
    /**
     * Enrol a user with an explicit creation time, status, window and method.
     *
     * @param int $userid The user.
     * @param int $courseid The course.
     * @param int $timecreated user_enrolments.timecreated.
     * @param string $method Enrolment plugin name ('manual', 'self', ...); its instance is created if missing.
     * @param int $status ENROL_USER_ACTIVE or ENROL_USER_SUSPENDED.
     * @param int $timestart Enrolment start, 0 for none.
     * @param int $timeend Enrolment end, 0 for none.
     * @return int The user_enrolments id.
     */
    public function enrol_at(
        int $userid,
        int $courseid,
        int $timecreated,
        string $method = 'manual',
        int $status = ENROL_USER_ACTIVE,
        int $timestart = 0,
        int $timeend = 0
    ): int {
        global $DB;

        $this->datagenerator->enrol_user($userid, $courseid, null, $method, $timestart, $timeend, $status);
        $instance = $DB->get_record('enrol', ['courseid' => $courseid, 'enrol' => $method], '*', MUST_EXIST);
        $ue = $DB->get_record('user_enrolments', ['userid' => $userid, 'enrolid' => $instance->id], '*', MUST_EXIST);
        $DB->set_field('user_enrolments', 'timecreated', $timecreated, ['id' => $ue->id]);
        $DB->set_field('user_enrolments', 'timemodified', $timecreated, ['id' => $ue->id]);

        return (int) $ue->id;
    }

    /**
     * Record that the user opened the course at the given time.
     *
     * @param int $userid The user.
     * @param int $courseid The course.
     * @param int $timeaccess The access time.
     * @return void
     */
    public function access_at(int $userid, int $courseid, int $timeaccess): void {
        global $DB;

        if ($existing = $DB->get_record('user_lastaccess', ['userid' => $userid, 'courseid' => $courseid])) {
            $DB->set_field('user_lastaccess', 'timeaccess', $timeaccess, ['id' => $existing->id]);
            return;
        }
        $DB->insert_record('user_lastaccess', (object) [
            'userid' => $userid,
            'courseid' => $courseid,
            'timeaccess' => $timeaccess,
        ]);
    }

    /**
     * Mark the course complete for the user at the given time.
     *
     * @param int $userid The user.
     * @param int $courseid The course.
     * @param int $timecompleted The completion time.
     * @return void
     */
    public function complete_at(int $userid, int $courseid, int $timecompleted): void {
        global $DB;

        $record = (object) [
            'userid' => $userid,
            'course' => $courseid,
            'timeenrolled' => $timecompleted - DAYSECS,
            'timestarted' => $timecompleted - DAYSECS,
            'timecompleted' => $timecompleted,
            'reaggregate' => 0,
        ];
        if ($existing = $DB->get_record('course_completions', ['userid' => $userid, 'course' => $courseid])) {
            $record->id = $existing->id;
            $DB->update_record('course_completions', $record);
            return;
        }
        $DB->insert_record('course_completions', $record);
    }

    /**
     * Star a course for the user the way the Course overview block does.
     *
     * @param int $userid The user.
     * @param int $courseid The course.
     * @return void
     */
    public function favourite(int $userid, int $courseid): void {
        $usercontext = \core\context\user::instance($userid);
        $service = \core_favourites\service_factory::get_service_for_user_context($usercontext);
        $service->create_favourite(
            \block_compass\local\attention::FAVOURITE_COMPONENT,
            \block_compass\local\attention::FAVOURITE_ITEMTYPE,
            $courseid,
            \core\context\course::instance($courseid)
        );
    }

    /**
     * Hide a course for the user the way the Course overview block does.
     *
     * @param int $userid The user.
     * @param int $courseid The course.
     * @return void
     */
    public function hide(int $userid, int $courseid): void {
        set_user_preference(\block_compass\local\hidden_courses::PREFIX . $courseid, 1, $userid);
    }
}
