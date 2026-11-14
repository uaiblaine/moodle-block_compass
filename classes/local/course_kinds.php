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
 * The kinds of offering the open-courses line and tier 3's rows tell apart, from whichever theme or plugin answers
 * the course_kinds hook.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use block_compass\hook\course_kinds as course_kinds_hook;
use core\hook\manager;
use core_text;

/**
 * The one door to the course kinds (ADR-019 decisions 4 and 5, ADR-021 decision 2): the block's own hook,
 * dispatched where asked, once per caller.
 *
 * Compass names no theme and no field: it dispatches {@see course_kinds_hook} and keeps the field a
 * listener names only while filter_fields::eligible() lists it as a select, so a field made
 * teachers-only, retyped or deleted turns the kinds off rather than reading a value nobody may see. A
 * listener that throws costs the kinds, never the line: every course then counts as a course.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class course_kinds {
    /** @var string The kind of a course whose value no listener describes, and of a course with no value. */
    public const DEFAULT = 'course';

    /**
     * What the listeners answer: the classifier's shortname and the kinds of its values.
     *
     * @param callable|null $source Stands in for the hook in tests: no argument in, ['field' => ?string,
     *     'kinds' => array] out; null to dispatch {@see course_kinds_hook}.
     * @return array ['field' => string|null, 'kinds' => stored value => ['key', 'one', 'many']].
     */
    public static function ask(?callable $source = null): array {
        $answer = $source ? $source() : self::dispatch();
        $field = is_string($answer['field'] ?? null) ? $answer['field'] : null;
        $kinds = is_array($answer['kinds'] ?? null) ? $answer['kinds'] : [];

        return ['field' => $field, 'kinds' => $kinds];
    }

    /**
     * The id of the classifier field, or 0 when the kinds are off.
     *
     * Off when no listener names a field, when it gives no kind, or when the field is not an eligible
     * select (filter_fields::eligible(): visible to everyone). Reads nothing while that entry is warm.
     *
     * @param callable|null $source Stands in for the hook in tests; see ask().
     * @return int The field id, 0 when off.
     */
    public static function field_id(?callable $source = null): int {
        return self::answer($source)['fieldid'];
    }

    /**
     * The classifier field's id and the kinds, from a single dispatch.
     *
     * The one accessor a caller that needs both uses: field_id() and ask() each dispatch the hook, so
     * calling the two would ask every listener twice per response (ADR-021 decision 2.2). The field is
     * kept on field_id()'s conditions; when they fail the kinds are dropped with it, since a kind
     * describes a value of a field the block may not read.
     *
     * @param callable|null $source Stands in for the hook in tests; see ask().
     * @return array ['fieldid' => int, 0 when off, 'kinds' => stored value => ['key', 'one', 'many'],
     *     empty when off].
     */
    public static function answer(?callable $source = null): array {
        $off = ['fieldid' => 0, 'kinds' => []];
        $answer = self::ask($source);
        if ($answer['field'] === null || !$answer['kinds']) {
            return $off;
        }
        $field = filter_fields::eligible()[$answer['field']] ?? null;
        if ($field === null || ($field['type'] ?? '') !== 'select') {
            return $off;
        }

        return ['fieldid' => (int) $field['id'], 'kinds' => $answer['kinds']];
    }

    /**
     * The kinds a tier 3 row may draw as a pill, from one dispatch: every kind but DEFAULT, in the
     * listener's order, one entry per key.
     *
     * The default kind is never drawn (ADR-021 decision 2.5): in a list of one's courses a course is
     * the normal case, and a site whose only kind is DEFAULT draws nothing. Values that share a key
     * share an entry, and the entry is named by the first value given that key, as counts() folds
     * them. The name is the listener's noun for one with its first letter upper-cased (label()): the
     * hook's nouns are made for sentences, and the pill starts one.
     *
     * @param callable|null $source Stands in for the hook in tests; see ask().
     * @return array 'fieldid' (0 when no kind can be drawn, and then nothing else is set), 'kinds'
     *     (list of ['key' => string, 'name' => string], the payload's kinds) and 'index' (stored value
     *     => position in 'kinds', for the values whose kind is drawn).
     */
    public static function pills(?callable $source = null): array {
        $answer = self::answer($source);
        $kinds = [];
        $positions = [];
        $index = [];
        foreach ($answer['kinds'] as $value => $kind) {
            $key = (string) $kind['key'];
            if ($key === self::DEFAULT) {
                continue;
            }
            if (!isset($positions[$key])) {
                $positions[$key] = count($kinds);
                $kinds[] = ['key' => $key, 'name' => self::label((string) $kind['one'])];
            }
            $index[(int) $value] = $positions[$key];
        }
        if (empty($kinds)) {
            return ['fieldid' => 0, 'kinds' => [], 'index' => []];
        }

        return ['fieldid' => $answer['fieldid'], 'kinds' => $kinds, 'index' => $index];
    }

    /**
     * A listener's noun in sentence case: its first character upper-cased, the rest as given.
     *
     * The noun is already plain text that PARAM_TEXT gives back unchanged
     * ({@see \block_compass\hook\course_kinds::add_kind()}); upper-casing one letter adds no markup, so
     * the label is as safe in a PARAM_TEXT return. Multibyte-aware through core_text: "évènement"
     * becomes "Évènement".
     *
     * @param string $noun The listener's noun for one.
     * @return string
     */
    public static function label(string $noun): string {
        return core_text::strtoupper(core_text::substr($noun, 0, 1)) . core_text::substr($noun, 1);
    }

    /**
     * Counts by stored value folded into counts by kind: DEFAULT first, then the kinds in the order given.
     *
     * A value no kind describes, 0 (no value) included, counts under DEFAULT; values that share a key count
     * together; a kind with no course is left out.
     *
     * @param array $byvalue Stored value => count.
     * @param array $kinds Stored value => ['key' => string, ...], as ask() returns them.
     * @return array Kind key => count, every count positive.
     */
    public static function counts(array $byvalue, array $kinds): array {
        $counts = [self::DEFAULT => 0];
        foreach ($kinds as $kind) {
            $counts[(string) $kind['key']] ??= 0;
        }
        foreach ($byvalue as $value => $count) {
            $key = isset($kinds[(int) $value]) ? (string) $kinds[(int) $value]['key'] : self::DEFAULT;
            $counts[$key] += (int) $count;
        }

        return array_filter($counts, static fn(int $count): bool => $count > 0);
    }

    /**
     * Dispatches the hook and returns what the listeners answered.
     *
     * A listener's exception is reported to developers and answered as nothing, so every course counts
     * as a course for this request.
     *
     * @return array ['field' => string|null, 'kinds' => array], as the hook holds them.
     */
    private static function dispatch(): array {
        $hook = new course_kinds_hook();
        try {
            \core\di::get(manager::class)->dispatch($hook);
        } catch (\Throwable $e) {
            debugging('block_compass: a course_kinds listener failed: ' . $e->getMessage(), DEBUG_DEVELOPER);

            return ['field' => null, 'kinds' => []];
        }

        return ['field' => $hook->get_field(), 'kinds' => $hook->get_kinds()];
    }
}
