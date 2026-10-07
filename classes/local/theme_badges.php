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
 * The courses' institutional crests, when the FUNDASEG theme is installed.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

/**
 * The one door to theme_boost_union_fundaseg's crests: its public callback, asked once per response.
 *
 * The theme publishes the crests a course's hotsite carries through one function,
 * theme_boost_union_fundaseg_course_badges(), and that function is the whole of the contract:
 * Compass reaches it through component_callback(), which answers its default when the theme or the
 * function is absent, so nothing here names the theme's classes, checks for them, or declares the
 * theme as a dependency (ADR-013 decision 9). The callback applies the theme's own viewer rule - a
 * course the reader may not discover gets no crest - and names each image with a content-hashed
 * URL and the theme's alternative text, so Compass builds no URL itself and only bounds and
 * cleans what it is given.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class theme_badges {
    /** @var string The component that publishes the crests. */
    public const THEME = 'theme_boost_union_fundaseg';

    /** @var int Most crests a card shows: the theme card's own three. */
    public const MAX = 3;

    /**
     * The return structure of one course's crests, shared by every service that carries them.
     *
     * Optional, and omitted when the course has none: an absent key costs nothing on the wire.
     *
     * @return \core_external\external_multiple_structure
     */
    public static function structure(): \core_external\external_multiple_structure {
        return new \core_external\external_multiple_structure(
            new \core_external\external_single_structure([
                'url' => new \core_external\external_value(PARAM_URL, 'The crest image, its address carrying a content hash'),
                'alt' => new \core_external\external_value(PARAM_TEXT, 'Its alternative text, the theme\'s'),
            ]),
            'The course\'s institutional crests from theme_boost_union_fundaseg, at most ' . self::MAX . '; present only when any',
            VALUE_OPTIONAL
        );
    }

    /**
     * Whether the theme is installed, which is when the setting that switches the crests is offered.
     *
     * @return bool
     */
    public static function theme_installed(): bool {
        return array_key_exists('boost_union_fundaseg', \core_component::get_plugin_list('theme'));
    }

    /**
     * The crests of many courses, in one call to the theme.
     *
     * Nothing is asked when the setting is off or no course is given. Each course keeps at most
     * MAX crests, in the theme's order; one without a URL is dropped, and the alternative text is
     * cleaned to what a PARAM_TEXT return field accepts.
     *
     * @param int[] $courseids Course ids.
     * @param callable|null $source Stands in for the theme in tests: course ids in, the callback's
     *     answer out; null for the theme's callback.
     * @return array Course id => list of ['url' => string, 'alt' => string], every positive id given present.
     */
    public static function for_courses(array $courseids, ?callable $source = null): array {
        $ids = [];
        foreach ($courseids as $courseid) {
            if ((int) $courseid > 0) {
                $ids[(int) $courseid] = true;
            }
        }
        $ids = array_keys($ids);
        $crests = array_fill_keys($ids, []);
        if (empty($ids) || !config::theme_badges_enabled()) {
            return $crests;
        }

        $answer = $source !== null
            ? $source($ids)
            : component_callback(self::THEME, 'course_badges', [$ids], []);
        foreach ($ids as $courseid) {
            $given = is_array($answer) ? ($answer[$courseid] ?? []) : [];
            foreach (array_slice(array_values(is_array($given) ? $given : []), 0, self::MAX) as $crest) {
                $url = clean_param((string) ($crest['url'] ?? ''), PARAM_URL);
                if ($url === '') {
                    continue;
                }
                $crests[$courseid][] = ['url' => $url, 'alt' => clean_param((string) ($crest['alt'] ?? ''), PARAM_TEXT)];
            }
        }

        return $crests;
    }
}
