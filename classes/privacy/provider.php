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
 * Privacy provider.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\privacy;

use block_compass\local\explore_preference;
use core_privacy\local\metadata\collection;
use core_privacy\local\request\user_preference_provider;
use core_privacy\local\request\writer;

/**
 * The two things the plugin stores of its own: the viewer's choice of tier 3 view, and the
 * tier 3 toolbar as they left it.
 *
 * Everything else it shows is core's — courses, enrolments, favourites, the archived-course
 * preferences of the Course overview block — and stays core's to export and to delete.
 *
 * Both interfaces are needed: a component counts as compliant only when it implements the
 * metadata provider and a data provider ({@see \core_privacy\manager::component_is_compliant()}),
 * and user_preference_provider is only the second of those. No deletion method is owed — the
 * interface declares none, and core's own block does not implement one for its preferences
 * either.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class provider implements \core_privacy\local\metadata\provider, user_preference_provider {
    /**
     * Describe the preferences the block stores.
     *
     * @param collection $collection The metadata collection to add to.
     * @return collection The same collection.
     */
    public static function get_metadata(collection $collection): collection {
        $collection->add_user_preference(
            'block_compass_view',
            'privacy:metadata:preference:block_compass_view'
        );
        $collection->add_user_preference(
            explore_preference::NAME,
            'privacy:metadata:preference:block_compass_explore'
        );

        return $collection;
    }

    /**
     * Export the stored preferences of one user.
     *
     * The exported view is the label the viewer chose rather than the stored token, and the
     * match names both keys literally rather than building a string id from the stored value.
     *
     * Anything outside the vocabulary is exported verbatim, on purpose. The rest of the plugin
     * falls back to a default for a stored view it cannot draw
     * ({@see \block_compass\output\block::view()}); an export answers a different question —
     * what is held about this person — so it must not name a view they never chose. The toolbar
     * state is exported as stored for the same reason: it is the JSON the viewer's own browser
     * wrote.
     *
     * @param int $userid The user whose data is being exported.
     * @return void
     */
    public static function export_user_preferences(int $userid): void {
        $view = get_user_preferences('block_compass_view', null, $userid);
        if ($view !== null) {
            $label = match ($view) {
                'list' => get_string('view_list', 'block_compass'),
                'cards' => get_string('view_cards', 'block_compass'),
                default => $view,
            };
            writer::export_user_preference(
                'block_compass',
                'block_compass_view',
                $label,
                get_string('privacy:metadata:preference:block_compass_view', 'block_compass')
            );
        }

        $explore = get_user_preferences(explore_preference::NAME, null, $userid);
        if ($explore !== null) {
            writer::export_user_preference(
                'block_compass',
                explore_preference::NAME,
                $explore,
                get_string('privacy:metadata:preference:block_compass_explore', 'block_compass')
            );
        }
    }
}
