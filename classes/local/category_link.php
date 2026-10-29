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
 * Where the open-courses line's groups lead, from whichever theme or plugin answers the category_link hook.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use block_compass\hook\category_link as category_link_hook;
use core\hook\manager;

/**
 * The one door to the line's destinations: the block's own hook, dispatched once per response.
 *
 * Compass names no theme (ADR-017 decision 8): it dispatches {@see category_link_hook} with the
 * shown groups' categories and the root, and keeps what the listeners answer when it is an address
 * on this site. Every other id, and every id of a response whose listener threw, gets core's
 * category page, so a broken theme costs the filter, never the line. A group of one course does not
 * come here: it links to the course's enrolment page.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class category_link {
    /**
     * The destination of every category asked, in one dispatch of the hook.
     *
     * @param int[] $categoryids The shown groups' categories, 0 for the root; negative ids are dropped.
     * @param string $from The band's first day, Y-m-d in the site timezone (the catalogue entry's from).
     * @param string $to The band's last day, Y-m-d in the site timezone (the catalogue entry's to).
     * @param callable|null $source Stands in for the hook in tests: the asked ids in, category id =>
     *     answer out; null to dispatch {@see category_link_hook}.
     * @return array Category id => absolute URL (out(false)), every id asked present.
     */
    public static function urls(array $categoryids, string $from, string $to, ?callable $source = null): array {
        $ids = [];
        foreach ($categoryids as $categoryid) {
            if ((int) $categoryid >= 0) {
                $ids[(int) $categoryid] = true;
            }
        }
        $ids = array_keys($ids);
        if (!$ids) {
            return [];
        }
        $source ??= static fn(array $asked): array => self::dispatch($asked, $from, $to);

        $answers = $source($ids);
        $urls = [];
        foreach ($ids as $categoryid) {
            $given = is_array($answers) ? self::local_url($answers[$categoryid] ?? null) : null;
            $urls[$categoryid] = $given ?? self::default_url($categoryid);
        }

        return $urls;
    }

    /**
     * Core's page for a category, or the course index for the root.
     *
     * @param int $categoryid A category id, 0 for the root.
     * @return string An absolute URL.
     */
    public static function default_url(int $categoryid): string {
        $params = $categoryid > 0 ? ['categoryid' => $categoryid] : [];

        return (new \core\url('/course/index.php', $params))->out(false);
    }

    /**
     * A listener's answer as an absolute URL on this site, or null when it is not one.
     *
     * A \core\url is taken as it prints; a root-relative string gets wwwroot in front; then the
     * address must pass PARAM_LOCALURL unchanged and start with wwwroot. A protocol-relative
     * "//host" or a relative path without the leading slash is not an address on this site.
     *
     * @param mixed $answer What a listener gave.
     * @return string|null
     */
    private static function local_url(mixed $answer): ?string {
        global $CFG;

        if ($answer instanceof \core\url) {
            $answer = $answer->out(false);
        }
        if (!is_string($answer) || $answer === '') {
            return null;
        }
        if (str_starts_with($answer, '/') && !str_starts_with($answer, '//')) {
            $answer = $CFG->wwwroot . $answer;
        }
        if (clean_param($answer, PARAM_LOCALURL) !== $answer) {
            return null;
        }
        if (!str_starts_with($answer, $CFG->wwwroot . '/') && $answer !== $CFG->wwwroot) {
            return null;
        }

        return $answer;
    }

    /**
     * Dispatches the hook for the given ids and returns what the listeners answered.
     *
     * A listener's exception is reported to developers and answered as nothing, so every id gets
     * core's page for this response.
     *
     * @param int[] $categoryids Category ids, 0 for the root, each once.
     * @param string $from The band's first day, Y-m-d.
     * @param string $to The band's last day, Y-m-d.
     * @return array Category id => \core\url or string, for the ids answered.
     */
    private static function dispatch(array $categoryids, string $from, string $to): array {
        global $USER;

        $hook = new category_link_hook($categoryids, $from, $to, (int) ($USER->id ?? 0));
        try {
            \core\di::get(manager::class)->dispatch($hook);
        } catch (\Throwable $e) {
            debugging('block_compass: a category_link listener failed: ' . $e->getMessage(), DEBUG_DEVELOPER);

            return [];
        }

        return $hook->get_urls();
    }
}
