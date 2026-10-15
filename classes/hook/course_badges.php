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
 * The hook through which a theme or plugin gives the courses Compass draws their institutional crests.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\hook;

/**
 * Asks any listener for the institutional crests (badges) of the courses the block is about to draw.
 *
 * Dispatched once per response by {@see \block_compass\local\theme_badges::for_courses()}, never
 * while the block's show_theme_badges setting is off and never without a course id. The block
 * names no theme and no plugin: whoever registers a callback for this class in its db/hooks.php
 * answers, and a site where nothing listens draws no crest at no cost.
 *
 * The contract a listener keeps:
 *
 * - It answers only for courses the CURRENT USER may see. A crest's address and its alternative
 *   text name a file and say what the course carries, so a course the reader may not discover
 *   (hidden, unlisted, in a listing they cannot view) gets nothing, whatever the block passed.
 *   The block passes only the ids it draws, which it has already filtered for this user, but a
 *   listener decides on its own rule and never trusts the list to be filtered for it.
 * - It calls add_badges() with a list of ['url' => string, 'alt' => string] per course, in the
 *   order the card should show them: the address of the image (content-hashed, so a changed file
 *   is a new address) and its alternative text as plain text. The block keeps at most three a
 *   course, drops one whose address PARAM_URL refuses and cleans the text to PARAM_TEXT.
 * - It answers in one batch for every id, never with a query per course.
 * - It writes nothing to $SESSION: the block's services that dispatch this hook run with a
 *   read-only session.
 * - It guards itself as any hook callback must: core lists db/hooks.php from disk whether or not
 *   the plugin is installed yet, so a callback checks its plugin is installed before touching its
 *   own tables. The block catches what a listener throws and draws no crest for that response.
 *
 * A badge for an id the block did not ask for is ignored. Two listeners answering the same course
 * add up, in the order core calls them.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\core\attribute\label('Lets a theme or plugin give the courses the Compass block draws their institutional crests')]
#[\core\attribute\tags('block_compass', 'course')]
final class course_badges {
    /** @var int[] The course ids asked, positive and each once, in the order given. */
    private array $courseids;

    /** @var array Course id => true, for the ids asked: the allowlist add_badges() checks. */
    private array $asked;

    /** @var array Course id => list of badges, for the asked ids a listener answered. */
    private array $badges = [];

    /**
     * Creates the question for a set of courses.
     *
     * @param int[] $courseids The course ids the block is about to draw; anything not a positive
     *     integer is dropped, and a repeated id counts once.
     */
    public function __construct(array $courseids) {
        $asked = [];
        foreach ($courseids as $courseid) {
            if ((int) $courseid > 0) {
                $asked[(int) $courseid] = true;
            }
        }
        $this->asked = $asked;
        $this->courseids = array_keys($asked);
    }

    /**
     * The course ids the block asks about, the only ones an answer is kept for.
     *
     * @return int[]
     */
    public function get_courseids(): array {
        return $this->courseids;
    }

    /**
     * Gives one course its badges, after those any earlier listener gave it.
     *
     * Ignored for an id the block did not ask for.
     *
     * @param int $courseid A course id from get_courseids().
     * @param array $badges A list of ['url' => string, 'alt' => string], in display order.
     * @return void
     */
    public function add_badges(int $courseid, array $badges): void {
        if (!isset($this->asked[$courseid])) {
            return;
        }
        $this->badges[$courseid] = array_merge($this->badges[$courseid] ?? [], array_values($badges));
    }

    /**
     * The answers so far.
     *
     * @return array Course id => list of badges as the listeners gave them, for the asked ids that
     *     received any call to add_badges(); an id no listener answered is absent.
     */
    public function get_badges(): array {
        return $this->badges;
    }
}
