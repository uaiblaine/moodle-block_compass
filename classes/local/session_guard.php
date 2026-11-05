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
 * The session the block's surfaces are willing to serve.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

/**
 * Who may be served at all, decided once for the web services, the page and the block.
 *
 * A "log in as" session started at a course context may act as the user only inside that course
 * (accesslib.php, has_capability_in_accessdata(): every context outside loginascontext answers false),
 * and core keeps it there through require_login($course), which refuses any other course with
 * loginasonecourse. Nothing the block serves is a course: the web services validate the user context
 * and the page logs in to the site, and require_login() skips that check for the site course
 * (lib/moodlelib.php, "Loginas as redirection if needed"). Core's own listings stay inside the course
 * because enrol_get_my_courses() adds courseid = loginas (lib/enrollib.php); the block reads its own
 * statements over every course of the user, so it refuses such a session instead. The same refusal
 * keeps the shared per-user caches (details, calendarstrip, news) from being filled under a capability
 * set that answers false outside one course. A "log in as" from the system context is the whole user,
 * as core treats it, and is served.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class session_guard {
    /**
     * The context a "log in as" session is confined to, or null when the session is not confined.
     *
     * Core confines an impersonation to its loginascontext and the contexts below it
     * (has_capability_in_accessdata()); only one started at the system context is the whole user. Core's
     * own page starts one at the system or a course context (core_user\loginas_helper), and any other level
     * a caller of session\manager::loginas() chose is confined the same way.
     *
     * @return \core\context|null loginascontext when it is not the system context; null otherwise.
     */
    public static function confined_to(): ?\core\context {
        global $USER;

        if (!\core\session\manager::is_loggedinas() || empty($USER->loginascontext)) {
            return null;
        }
        if ((int) $USER->loginascontext->contextlevel === CONTEXT_SYSTEM) {
            return null;
        }

        return $USER->loginascontext;
    }

    /**
     * Whether the block type is enabled on Manage blocks.
     *
     * A hidden block type is never drawn, but core runs the functions of db/services.php whatever the
     * plugin's state (lib/external/classes/external_api.php checks none). The list comes from core's
     * plugin_manager cache, which enable_plugin() resets (lib/classes/plugininfo/block.php), so a warm
     * site answers without a database read.
     *
     * @return bool
     */
    public static function block_enabled(): bool {
        $enabled = \core\plugin_manager::instance()->get_enabled_plugins('block');

        return isset($enabled['compass']);
    }

    /**
     * Refuse what a web service must not serve: a session confined to one course, or a hidden block.
     *
     * Called after require_login() and the guest check, before validate_context().
     *
     * @return void
     * @throws \moodle_exception loginasonecourse, with the course as its link; or blockdoesnotexist.
     */
    public static function require_service(): void {
        self::require_unconfined();
        if (!self::block_enabled()) {
            throw new \moodle_exception('blockdoesnotexist', 'error');
        }
    }

    /**
     * Refuse a "log in as" session confined to one course, the way require_login() refuses another course.
     *
     * @return void
     * @throws \moodle_exception loginasonecourse, with the course as its link (the front page for a category).
     */
    public static function require_unconfined(): void {
        $context = self::confined_to();
        if ($context === null) {
            return;
        }
        $course = $context->get_course_context(false);
        $link = $course ? new \core\url('/course/view.php', ['id' => $course->instanceid]) : new \core\url('/');
        throw new \moodle_exception('loginasonecourse', '', $link->out(false));
    }

    /**
     * Permission callback of block_compass_tier1: the user themself, and never a "log in as" session.
     *
     * The shape is written by the client on its own once tier 1 settles, not by a choice of the viewer,
     * so an impersonator only viewing the dashboard must not leave a trace in the real user's
     * preferences. The three preferences the viewer sets by hand keep core's rule
     * (core_user::is_current_user()), which core applies to its own preferences during "log in as" too.
     *
     * @param \stdClass $user The user whose preference is written.
     * @return bool
     */
    public static function may_remember_shape(\stdClass $user): bool {
        return \core_user::is_current_user($user) && !\core\session\manager::is_loggedinas();
    }
}
