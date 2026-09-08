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
 * The tier 3 toolbar as the viewer left it.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

/**
 * Reader of the block_compass_explore preference (ADR-010, decision 9).
 *
 * One JSON object holds the sort, the status chip, the pressed value of each custom-field group
 * and whether the filter panel is open. The client writes it through core's own preference
 * route, which cleans a PARAM_RAW value not at all; so the reading is where the validation is,
 * and it is a validation of SHAPE at zero cost: a sort or a chip outside the vocabulary, a
 * pending chip while the feature is off, a field key that is not a shortname or a value that is
 * not an integer are dropped, and what survives ships as the client's initial state. Whether a
 * field is still configured, and whether its value is still one of the field's keys, is decided
 * when the inventory arrives with its fields array (js/esm/src/Explore.tsx): the shell renders
 * the block without a database or cache read (PLAN.md §3.2, non-negotiable 2), and the eligible
 * fields live in a cache that may be cold. The two paging services validate the same selection
 * a third time, by the allowlist of filter_fields::validate(), before any work.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class explore_preference {
    /** @var string The preference name, declared in lib.php. */
    public const NAME = 'block_compass_explore';

    /** @var string[] The sorts the toolbar offers. */
    public const SORTS = ['category', 'name', 'recent'];

    /** @var string[] The status chips, the pending one only while the feature is on. */
    public const CHIPS = ['all', 'new', 'favourites', 'pending'];

    /**
     * The state the toolbar starts in for a viewer who never changed it.
     *
     * The panel is open at first render, so its platters are on screen when axe reads the
     * block (ADR-009, decision 8).
     *
     * @return array sort, chip, cf (shortname => value key) and panel.
     */
    public static function defaults(): array {
        return ['sort' => 'category', 'chip' => 'all', 'cf' => [], 'panel' => true];
    }

    /**
     * The viewer's stored state, validated, or the defaults.
     *
     * Reading a preference is not the data access the shell is forbidden: get_user_preferences()
     * answers from the bundle the session already carries.
     *
     * @param bool|null $pendingenabled Whether the pending chip may be kept; null for the setting.
     * @return array sort, chip, cf and panel, each within its vocabulary.
     */
    public static function read(?bool $pendingenabled = null): array {
        $stored = get_user_preferences(self::NAME, null);

        return self::validate(is_string($stored) ? $stored : null, $pendingenabled ?? config::pending_enabled());
    }

    /**
     * Keep of a stored value what the vocabulary admits, field by field.
     *
     * @param string|null $json The stored JSON, or null when nothing is stored.
     * @param bool $pendingenabled Whether the pending chip may be kept.
     * @return array sort, chip, cf and panel, each within its vocabulary.
     */
    public static function validate(?string $json, bool $pendingenabled): array {
        $state = self::defaults();
        if ($json === null || $json === '') {
            return $state;
        }
        $decoded = json_decode($json, true);
        if (!is_array($decoded)) {
            return $state;
        }
        if (isset($decoded['sort']) && in_array($decoded['sort'], self::SORTS, true)) {
            $state['sort'] = $decoded['sort'];
        }
        if (isset($decoded['chip']) && in_array($decoded['chip'], self::CHIPS, true)) {
            $state['chip'] = $decoded['chip'] === 'pending' && !$pendingenabled ? 'all' : $decoded['chip'];
        }
        if (isset($decoded['panel'])) {
            $state['panel'] = (bool) $decoded['panel'];
        }
        if (isset($decoded['cf']) && is_array($decoded['cf'])) {
            foreach ($decoded['cf'] as $field => $value) {
                // A shortname is what filter_fields keys its entries by, and a value key is an
                // option index or a checkbox state (ADR-009, decision 5): anything else is noise.
                if (!is_string($field) || $field === '' || clean_param($field, PARAM_ALPHANUMEXT) !== $field) {
                    continue;
                }
                if (!is_int($value) || $value < 0) {
                    continue;
                }
                $state['cf'][$field] = $value;
            }
        }

        return $state;
    }
}
