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
 * The course custom fields that can be offered as filters, and their vocabularies.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use core\context\system as context_system;
use core\exception\invalid_parameter_exception;
use core_cache\cache;
use core_course\customfield\course_handler;

/**
 * Wrapper of the block_compass/filterfields definition (ADR-009, decision 5).
 *
 * One entry for the whole site, listing every ELIGIBLE course custom field — the select and
 * checkbox types, visible to everyone — with its id, shortname, raw name, type, the raw
 * option list of a select and its default value key. The whole eligible set and not the
 * configured subset, so a change to the filter_fields setting invalidates nothing and simply
 * reads fewer entries out of it. Filled through core's own handler, which owns the
 * shared-category merge, and cached precisely because that fill is two recordsets plus one
 * query per shared category — three reads each on the PostgreSQL meter against one on
 * MariaDB, a number that must never sit inside a per-request budget. Dropped by the four
 * core_customfield observers of db/events.php.
 *
 * Nothing formatted is stored: names and options are formatted at response time in the
 * configuration context, as core's own field and option formatting does
 * (customfield/classes/field_controller.php:261-267 and
 * customfield/field/select/classes/field_controller.php:50-67).
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class filter_fields {
    /** @var string[] The field types with a finite vocabulary a chip can be drawn for. */
    public const TYPES = ['select', 'checkbox'];

    /** @var string The one key of the definition. */
    private const KEY = 'fields';

    /**
     * The cache instance (never memoised here: see course_meta::cache()).
     *
     * @return cache
     */
    private static function cache(): cache {
        return cache::make('block_compass', 'filterfields');
    }

    /**
     * Every eligible field, keyed by shortname, filled on a miss.
     *
     * @return array Shortname => entry (id, shortname, name, type, options, default).
     */
    public static function eligible(): array {
        $entry = self::cache()->get(self::KEY);
        if ($entry !== false) {
            return $entry;
        }

        return self::fill();
    }

    /**
     * Rebuild the entry through core's handler and store it.
     *
     * The type restriction is the difference between a finite vocabulary and an open list;
     * the visibility restriction is a security rule: this plugin reads {customfield_data}
     * directly rather than through can_view(), so a chip over a teachers-only field would be
     * an oracle for its value (course/classes/customfield/course_handler.php:81-90).
     *
     * @return array The stored entry.
     */
    public static function fill(): array {
        $fields = [];
        foreach (course_handler::create()->get_fields() as $field) {
            $type = (string) $field->get('type');
            if (!in_array($type, self::TYPES, true)) {
                continue;
            }
            $visibility = $field->get_configdata_property('visibility') ?? course_handler::VISIBLETOALL;
            if ((int) $visibility !== course_handler::VISIBLETOALL) {
                continue;
            }
            $entry = [
                'id' => (int) $field->get('id'),
                'shortname' => (string) $field->get('shortname'),
                'name' => (string) $field->get('name'),
                'type' => $type,
                'options' => [],
                'default' => 0,
            ];
            if ($type === 'select') {
                // Core's own parsing of the option textarea, one option per line, with the empty
                // "no selection" slot at 0 (customfield/field/select/classes/field_controller.php:56-66).
                $raw = trim((string) ($field->get_configdata_property('options') ?? ''));
                $options = $raw === '' ? [] : preg_split("/\s*\n\s*/", $raw, -1, PREG_SPLIT_NO_EMPTY);
                foreach (array_values($options) as $index => $option) {
                    $entry['options'][$index + 1] = $option;
                }
                $default = (string) ($field->get_configdata_property('defaultvalue') ?? '');
                $key = $default === '' ? false : array_search($default, $entry['options'], true);
                $entry['default'] = $key === false ? 0 : (int) $key;
            } else {
                $entry['default'] = $field->get_configdata_property('checkbydefault') ? 1 : 0;
            }
            $fields[$entry['shortname']] = $entry;
        }
        self::cache()->set(self::KEY, $fields);

        return $fields;
    }

    /**
     * The fields the administrator chose, in the setting's order, among the eligible ones.
     *
     * A shortname that is no longer eligible — deleted, retyped, made teachers-only — is dropped
     * here rather than answered with an empty chip group. Costs nothing when nothing is
     * configured: the vocabulary is read only when there is a name to look up.
     *
     * @param array|null $shortnames The configured shortnames; null for config::filter_fields().
     * @return array Shortname => entry, in the configured order.
     */
    public static function configured(?array $shortnames = null): array {
        $shortnames = $shortnames ?? config::filter_fields();
        if (empty($shortnames)) {
            return [];
        }
        $eligible = self::eligible();
        $configured = [];
        foreach ($shortnames as $shortname) {
            if (isset($eligible[$shortname])) {
                $configured[$shortname] = $eligible[$shortname];
            }
        }

        return $configured;
    }

    /**
     * The value keys a field's chips are drawn for, with their labels formatted for the viewer.
     *
     * A select has one chip per option, keyed the way core stores the choice — the option's
     * 1-based index, 0 being "no selection" and never a chip; a checkbox has two, yes (1) and
     * no (0), exactly the two words core's own data controller exports
     * (customfield/field/checkbox/classes/data_controller.php:83-86).
     *
     * @param array $field An entry from eligible().
     * @return array Value key => formatted label, in display order.
     */
    public static function values(array $field): array {
        if ($field['type'] === 'checkbox') {
            return [1 => get_string('yes'), 0 => get_string('no')];
        }
        $context = context_system::instance();
        $values = [];
        foreach ($field['options'] as $key => $option) {
            $values[(int) $key] = format_string($option, true, ['context' => $context, 'escape' => false]);
        }

        return $values;
    }

    /**
     * The top-level fields array of a tier 3 response: the configured groups, in order.
     *
     * Each carries its key (the shortname), its label and its ordered values, so the chips exist
     * in both modes before any group opens. A row's cf refers to a field by its INDEX in this
     * list and to a value by its key (explore::cf()).
     *
     * @param array $configured Entries from configured().
     * @return array List of ['key', 'label', 'values' => list of ['key', 'label']].
     */
    public static function payload(array $configured): array {
        $context = context_system::instance();
        $payload = [];
        foreach ($configured as $field) {
            $values = [];
            foreach (self::values($field) as $key => $label) {
                $values[] = ['key' => $key, 'label' => $label];
            }
            $payload[] = [
                'key' => $field['shortname'],
                'label' => format_string($field['name'], true, ['context' => $context, 'escape' => false]),
                'values' => $values,
            ];
        }

        return $payload;
    }

    /**
     * Check a filters parameter against the allowlist and return it as a selection.
     *
     * Refused, each with invalid_parameter_exception: a field outside the configured set, a
     * value outside that field's own value keys, and a second entry for the same field. The
     * shape checks cost nothing; the membership checks read the vocabulary, which is one cache
     * read when warm.
     *
     * @param array $filters List of ['field' => shortname, 'value' => int].
     * @param array|null $configured Entries from configured(); null to read them.
     * @return array Shortname => value key, the selection explore applies.
     * @throws invalid_parameter_exception On any entry outside the allowlist.
     */
    public static function validate(array $filters, ?array $configured = null): array {
        if (empty($filters)) {
            return [];
        }
        $selection = [];
        foreach ($filters as $filter) {
            if (!is_array($filter) || !isset($filter['field'], $filter['value'])) {
                throw new invalid_parameter_exception('a filter needs a field and a value');
            }
            $field = (string) $filter['field'];
            if (array_key_exists($field, $selection)) {
                throw new invalid_parameter_exception("filters name the field {$field} twice");
            }
            $selection[$field] = (int) $filter['value'];
        }
        $configured = $configured ?? self::configured();
        foreach ($selection as $field => $value) {
            if (!isset($configured[$field])) {
                throw new invalid_parameter_exception("{$field} is not a configured filter field");
            }
            if (!array_key_exists($value, self::values($configured[$field]))) {
                throw new invalid_parameter_exception("{$value} is not a value of the filter field {$field}");
            }
        }

        return $selection;
    }

    /**
     * Drop the entry, on any of the four core_customfield events.
     *
     * @return void
     */
    public static function purge(): void {
        self::cache()->purge();
    }
}
