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
 * The courses' institutional crests, from whichever theme or plugin answers the course_badges hook.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use block_compass\hook\course_badges;
use core\hook\manager;

/**
 * The one door to the courses' crests: the block's own hook, dispatched once per response.
 *
 * Compass names no theme: it dispatches {@see course_badges} with the ids it is about to draw and
 * keeps what the listeners add (ADR-013 decision 9, amended 2026-10-14). A site where nothing
 * listens pays nothing, and a listener that throws costs the response its crests, never the
 * response. The listener applies its own viewer rule - a course the reader may not discover gets
 * no crest - and names each image with a content-hashed URL and its alternative text, so Compass
 * builds no URL itself and only bounds and cleans what it is given.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class theme_badges {
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
                'alt' => new \core_external\external_value(PARAM_TEXT, 'Its alternative text, as the answerer gave it'),
            ]),
            'The course\'s institutional crests from the course_badges hook, at most ' . self::MAX . '; present only when any',
            VALUE_OPTIONAL
        );
    }

    /**
     * Whether any component answers the hook, which is when the setting that switches the crests is offered.
     *
     * A callback registered but disabled through $CFG->hooks_callback_overrides does not count.
     *
     * @return bool
     */
    public static function has_answerer(): bool {
        foreach (\core\di::get(manager::class)->get_callbacks_for_hook(course_badges::class) as $definition) {
            if (empty($definition['disabled'])) {
                return true;
            }
        }

        return false;
    }

    /**
     * The crests of many courses, in one dispatch of the hook.
     *
     * Nothing is asked when the setting is off or no course is given. Each course keeps at most
     * MAX crests, in the order the answerers gave them; one without a URL is dropped, and the alternative text is
     * cleaned to what a PARAM_TEXT return field accepts.
     *
     * @param int[] $courseids Course ids.
     * @param callable|null $source Stands in for the hook in tests: course ids in, course id => crests
     *     out; null to dispatch {@see course_badges}.
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
        $source ??= static fn(array $asked): array => self::dispatch($asked);

        $answer = $source($ids);
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

    /**
     * Dispatches the hook for the given ids and returns what the listeners added.
     *
     * A listener's exception is reported to developers and answered as no crests: the crests
     * decorate a card, and a broken theme or plugin must not take the first paint with it.
     *
     * @param int[] $courseids Positive course ids, each once.
     * @return array Course id => list of crests as the listeners gave them, for the ids answered.
     */
    private static function dispatch(array $courseids): array {
        $hook = new course_badges($courseids);
        try {
            \core\di::get(manager::class)->dispatch($hook);
        } catch (\Throwable $e) {
            debugging('block_compass: a course_badges listener failed: ' . $e->getMessage(), DEBUG_DEVELOPER);

            return [];
        }

        return $hook->get_badges();
    }
}
