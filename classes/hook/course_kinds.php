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
 * The hook through which a theme or plugin tells Compass which custom field says what kind of offering a course is.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\hook;

/**
 * Asks any listener for the course custom field that classifies courses, and what each of its values is called.
 *
 * Dispatched by {@see \block_compass\local\course_kinds} (ADR-019 decision 4): when the open catalogue is
 * built, for the field alone (no language enters the shared entry), and per response of the open-courses
 * line, for the nouns in the current language. The block names no theme and no field: a site where
 * nothing listens counts every course as a course.
 *
 * The contract a listener keeps:
 * - It names one course custom field of the select type by its shortname (set_field()). The block uses it
 *   only while it is visible to everyone, the condition filter_fields::eligible() reads.
 * - It describes the field's stored values it gives a kind to (add_kind()): the value (a select stores
 *   the option's 1-based index), a key of lowercase letters, and the kind's noun for one and for many,
 *   in the current language, as plain text. Values that share a key count together. A value given no
 *   kind, and a course with no value, count under the block's own `course`.
 * - It reads nothing: it answers from code and lang strings, because the block asks on every response.
 * - It guards itself as installed, as any hook callback must.
 *
 * The first listener to name a field wins, and the first kind given for a value wins, in the order core
 * calls them.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\core\attribute\label('Lets a theme or plugin name the course custom field that tells courses from events in the Compass block')]
#[\core\attribute\tags('block_compass', 'course')]
final class course_kinds {
    /** @var string|null The classifier's shortname, null until a listener names one. */
    private ?string $field = null;

    /** @var array Stored value => ['key' => string, 'one' => string, 'many' => string], in the order given. */
    private array $kinds = [];

    /**
     * Names the classifier field, unless an earlier listener named one.
     *
     * A shortname that is not a plain shortname (PARAM_ALPHANUMEXT) is ignored.
     *
     * @param string $shortname The course custom field's shortname.
     * @return void
     */
    public function set_field(string $shortname): void {
        if ($this->field !== null || $shortname === '' || clean_param($shortname, PARAM_ALPHANUMEXT) !== $shortname) {
            return;
        }
        $this->field = $shortname;
    }

    /**
     * Gives one stored value its kind, unless an earlier listener gave it one.
     *
     * Ignored for a value that is not positive, a key that is not 1 to 20 lowercase letters, or a noun
     * that is empty once cleaned to PARAM_TEXT.
     *
     * @param int $value The stored value: a select's 1-based option index.
     * @param string $key The kind's key, such as `course` or `event`.
     * @param string $one The noun for one, as plain text: "event".
     * @param string $many The noun for more than one, as plain text: "events".
     * @return void
     */
    public function add_kind(int $value, string $key, string $one, string $many): void {
        if ($value <= 0 || isset($this->kinds[$value]) || !preg_match('/^[a-z]{1,20}$/', $key)) {
            return;
        }
        $one = trim(clean_param($one, PARAM_TEXT));
        $many = trim(clean_param($many, PARAM_TEXT));
        if ($one === '' || $many === '') {
            return;
        }
        $this->kinds[$value] = ['key' => $key, 'one' => $one, 'many' => $many];
    }

    /**
     * The classifier's shortname, or null when no listener named one.
     *
     * @return string|null
     */
    public function get_field(): ?string {
        return $this->field;
    }

    /**
     * The kinds given so far.
     *
     * @return array Stored value => ['key' => string, 'one' => string, 'many' => string], in the order given.
     */
    public function get_kinds(): array {
        return $this->kinds;
    }
}
