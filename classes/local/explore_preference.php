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
 * Reader of the block_compass_explore preference.
 *
 * One JSON object holds the sort, the scope, whether the favourites star is pressed, the pressed
 * value of each custom-field group and whether the filter panel is open (ADR-015). The client
 * writes it through core's own preference route, which cleans a PARAM_RAW value not at all; so the
 * reading is where the validation is, and it is a validation of shape at zero cost: a sort or a
 * scope outside the vocabulary, the pending scope while the feature is off, a star that is not a
 * boolean, a field key that is not a shortname or a value that is not an integer are dropped, and
 * what survives ships as the client's initial state. A state stored before ADR-015 carries a chip
 * instead of a scope and a star, and is migrated here, on read: the favourites chip becomes the
 * star on the All scope, any other chip of the old vocabulary becomes that scope. Whether a field
 * is still configured, and whether its value is still one of the field's keys, is decided when the
 * inventory arrives with its fields array (js/esm/src/Explore.tsx): the shell renders the block
 * without a database or cache read, and the eligible fields live in a cache that may be cold. The
 * two paging services validate the same selection a third time, by the allowlist of
 * filter_fields::validate(), before any work.
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

    /** @var string[] The scope cells, the pending one only while the feature is on; explore::CHIPS without favourites. */
    public const SCOPES = ['all', 'new', 'pending', 'scheduled'];

    /** @var string[] The status chips a state stored before ADR-015 may carry; explore::CHIPS's vocabulary. */
    public const CHIPS = ['all', 'new', 'favourites', 'pending', 'scheduled'];

    /**
     * The longest value this reader reads, in bytes; a longer one is refused on write and ignored on read.
     *
     * The client writes {sort, scope, star, cf, panel} with JSON.stringify, no whitespace: 74 bytes
     * with the longest sort and scope and an empty cf. Each cf entry is "<shortname>":<value>, at
     * most 114 bytes (customfield_field.shortname is char(100), PARAM_ALPHANUMEXT needs no escape,
     * a value key of 10 digits, a comma), and the client keeps only the configured fields, at most
     * config::FILTER_FIELDS_MAX (3): 74 + 3 * 114 = 416. The cap is the smallest power of two at
     * least twice that, the rule of the three readers, so a member added later fits.
     *
     * @var int
     */
    public const MAX_BYTES = 1024;

    /**
     * The state the toolbar starts in for a viewer who never changed it.
     *
     * The filter panel starts closed (ADR-015 decision 5): its field groups are a popover over the
     * list, and the line's chips show what it holds in force.
     *
     * @return array sort, scope, star, cf (shortname => value key) and panel.
     */
    public static function defaults(): array {
        return ['sort' => 'category', 'scope' => 'all', 'star' => false, 'cf' => [], 'panel' => false];
    }

    /**
     * The viewer's stored state, validated, or the defaults.
     *
     * A preference read is allowed in the shell ({@see \block_compass\output\block::view()}).
     *
     * @param bool|null $pendingenabled Whether the pending scope may be kept; null for the setting.
     * @return array sort, scope, star, cf and panel, each within its vocabulary.
     */
    public static function read(?bool $pendingenabled = null): array {
        $stored = get_user_preferences(self::NAME, null);

        return self::validate(is_string($stored) ? $stored : null, $pendingenabled ?? config::pending_enabled());
    }

    /**
     * Keep of a stored value what the vocabulary admits, field by field.
     *
     * @param string|null $json The stored JSON, or null when nothing is stored.
     * @param bool $pendingenabled Whether the pending scope may be kept.
     * @return array sort, scope, star, cf and panel, each within its vocabulary.
     */
    public static function validate(?string $json, bool $pendingenabled): array {
        $state = self::defaults();
        $decoded = self::decode($json);
        if ($decoded === null) {
            return $state;
        }
        if (isset($decoded['sort']) && in_array($decoded['sort'], self::SORTS, true)) {
            $state['sort'] = $decoded['sort'];
        }
        // A chip stored before ADR-015 is read first, so a scope or a star stored beside it wins.
        if (isset($decoded['chip']) && in_array($decoded['chip'], self::CHIPS, true)) {
            if ($decoded['chip'] === 'favourites') {
                $state['star'] = true;
            } else {
                $state['scope'] = $decoded['chip'];
            }
        }
        if (isset($decoded['scope']) && in_array($decoded['scope'], self::SCOPES, true)) {
            $state['scope'] = $decoded['scope'];
        }
        if ($state['scope'] === 'pending' && !$pendingenabled) {
            $state['scope'] = 'all';
        }
        if (isset($decoded['star']) && is_bool($decoded['star'])) {
            $state['star'] = $decoded['star'];
        }
        if (isset($decoded['panel'])) {
            $state['panel'] = (bool) $decoded['panel'];
        }
        if (isset($decoded['cf']) && is_array($decoded['cf'])) {
            foreach ($decoded['cf'] as $field => $value) {
                // A shortname is what filter_fields keys its entries by, and a value key is an
                // option index or a checkbox state: anything else is noise.
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

    /**
     * The stored or posted JSON decoded, or null when this reader reads nothing of it.
     *
     * The one door both directions go through: validate() reads what it returns, and clean()
     * admits a write only when it returns an array, so the write rule cannot drift from the read
     * rule. The length is checked before json_decode(), so a value stored before the cap existed
     * costs no decode.
     *
     * @param string|null $json The JSON, or null when nothing is stored.
     * @return array|null The decoded object, or null: empty, longer than MAX_BYTES, or not a JSON object or array.
     */
    public static function decode(?string $json): ?array {
        if ($json === null || $json === '' || strlen($json) > self::MAX_BYTES) {
            return null;
        }
        $decoded = json_decode($json, true);

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * The preference's cleancallback (lib.php): a value this reader reads, unchanged, or null.
     *
     * Core's preference route refuses a write whose cleaned value differs from the posted one
     * (core_user\route\api\preferences::set_single_preference()), so a valid value must come back
     * byte for byte and anything else comes back as null, the declared default: refused there,
     * and stored as no preference by core_user_set_user_preferences, which saves what cleaning gives.
     *
     * @param mixed $value The value after core's PARAM_RAW cleaning.
     * @return string|null
     */
    public static function clean(mixed $value): ?string {
        return is_string($value) && self::decode($value) !== null ? $value : null;
    }
}
