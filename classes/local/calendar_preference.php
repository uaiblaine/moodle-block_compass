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
 * The calendar strip as the viewer left it.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

/**
 * Reader of the block_compass_calendar preference (ADR-014 decisions 10 and 11).
 *
 * One JSON object holds the view (studying or teaching), the item filter and the relevance
 * switch. The client writes it through core's preference route, which leaves a PARAM_RAW value
 * uncleaned, so the reading is where the validation is, as for
 * {@see explore_preference}: a member outside its vocabulary, or of the wrong type, falls back to
 * its default and the rest is kept. Whether the stored view can be drawn (a teaching view for
 * someone who no longer teaches) is the client's decision once the strip payload says which
 * views exist; the shell reads this without a database or cache read.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class calendar_preference {
    /** @var string The preference name, declared in lib.php. */
    public const NAME = 'block_compass_calendar';

    /** @var string[] The views; calendar\strip::VIEWS's vocabulary. */
    public const VIEWS = ['learning', 'teaching'];

    /** @var string[] The item filters: everything, only what is to do, only events. */
    public const FILTERS = ['all', 'todo', 'events'];

    /**
     * The state the strip starts in for a viewer who never changed it.
     *
     * @param bool|null $relevance The relevance default; null for the site's calendar_relevance setting.
     * @return array view, filter and relevance.
     */
    public static function defaults(?bool $relevance = null): array {
        return ['view' => 'learning', 'filter' => 'all', 'relevance' => $relevance ?? config::calendar_relevance()];
    }

    /**
     * The current viewer's stored state, validated, or the defaults.
     *
     * @return array view, filter and relevance, each within its vocabulary.
     */
    public static function read(): array {
        $stored = get_user_preferences(self::NAME, null);

        return self::validate(is_string($stored) ? $stored : null, config::calendar_relevance());
    }

    /**
     * Keep of a stored value what the vocabulary admits, member by member.
     *
     * The relevance switch is kept only as a JSON boolean: "0", 0 or "false" are not the
     * viewer's switch, and reading them as one would turn a malformed value into a choice.
     *
     * @param string|null $json The stored JSON, or null when nothing is stored.
     * @param bool $relevancedefault The relevance default, the site's setting.
     * @return array view, filter and relevance, each within its vocabulary.
     */
    public static function validate(?string $json, bool $relevancedefault): array {
        $state = self::defaults($relevancedefault);
        if ($json === null || $json === '') {
            return $state;
        }
        $decoded = json_decode($json, true);
        if (!is_array($decoded)) {
            return $state;
        }
        if (isset($decoded['view']) && in_array($decoded['view'], self::VIEWS, true)) {
            $state['view'] = $decoded['view'];
        }
        if (isset($decoded['filter']) && in_array($decoded['filter'], self::FILTERS, true)) {
            $state['filter'] = $decoded['filter'];
        }
        if (isset($decoded['relevance']) && is_bool($decoded['relevance'])) {
            $state['relevance'] = $decoded['relevance'];
        }

        return $state;
    }
}
