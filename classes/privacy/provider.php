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
 * preferences of the Course overview block — and stays core's to export and to delete
 * (ADR-000, decisions 8 and 16). Since Phase R4 the block writes block_compass_view, and since
 * Phase 9 block_compass_explore (ADR-010, decision 9), so the null provider it used to be would
 * now be a false statement.
 *
 * Both interfaces are needed and neither is optional: a component counts as compliant only
 * when it implements the metadata provider AND a data provider
 * (privacy/classes/manager.php:143-159), and user_preference_provider is only the second of
 * those. No deletion method is owed — the interface declares none, and core's own block does
 * not implement one for its preferences either.
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
     * match names both keys literally: get_string() with a key built from the stored value
     * would be a dynamic string id, which this fleet forbids.
     *
     * Anything outside the vocabulary is exported verbatim, and that is the point of the
     * default arm rather than an oversight. The rest of the plugin re-validates a stored
     * view because a value it cannot draw would render nothing (config::default_view(),
     * block\view()); an export answers a different question — what is held about this
     * person — so naming a view they never chose would be a false statement in the one
     * document that exists to be true. The toolbar state is exported as stored for the same
     * reason: it is the JSON the viewer's own browser wrote.
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
