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

namespace block_compass\local;

use basic_testcase;
use PHPUnit\Framework\Attributes\CoversNothing;

/**
 * The fleet Design System's scale ratchet, pinned by reading the stylesheet.
 *
 * This is the Design System's ratchet (decisions D3 and D24 of moodle-dev/docs/design-system/DECISIONS.md):
 * type and space are literals held to the scales by a test. Today's off-scale uses are listed in the
 * OFF_SCALE_* constants so they can only go down; the component steps that follow bring them to zero. The
 * scales themselves are the constants at the top of the class so the file can become the fleet's template.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversNothing]
final class scale_ratchet_test extends basic_testcase {
    /** @var array The font sizes in rem: the type scale and the headings. */
    private const FONT_SIZES = ['0.75', '0.8125', '0.875', '1', '1.25', '2.5', '2', '1.75', '1.5'];

    /** @var array The font-size keywords that are not a size of their own. */
    private const FONT_SIZE_WORDS = ['inherit', '1em'];

    /** @var array The font weights. */
    private const WEIGHTS = ['400', '500', '600', '700', 'inherit', 'normal', 'bold'];

    /** @var array The space steps in rem: 2, 4, 6, 8, 12, 16, 20 and 32 px, and the 3 px exception. */
    private const SPACE_REM = ['0', '0.125', '0.25', '0.375', '0.5', '0.75', '1', '1.25', '2', '0.1875'];

    /** @var array The space steps in px, the same steps as SPACE_REM. */
    private const SPACE_PX = ['0', '2', '4', '6', '8', '12', '16', '20', '32', '3'];

    /** @var array The space keywords that are on the scale. */
    private const SPACE_WORDS = ['auto', 'inherit', 'initial', 'unset'];

    /** @var array The radius steps in px. */
    private const RADIUS_PX = ['0', '4', '6', '8', '12', '16', '999'];

    /** @var array The radius steps in rem, and the round one (50rem). */
    private const RADIUS_REM = ['0', '0.25', '0.375', '0.5', '0.75', '1', '50'];

    /** @var array The radius values that are not a length of the steps. */
    private const RADIUS_WORDS = ['50%', 'inherit'];

    /** @var array The durations of the motion scale: fast and base. */
    private const DURATIONS = ['150ms', '250ms'];

    /**
     * @var array Glyphs drawn as an illustration, not as text, selector => font-size: off the type scale by design and
     *     outside its ratchet. Only the cover's watermark (ADR-029), 64 px as the course card contract's slot 1 sets it.
     */
    private const ILLUSTRATION_FONT_SIZE = [
        '.block_compass .compass-card .compass-card-watermark' => '64px',
    ];

    /**
     * @var array Off-scale font sizes today, value => uses.
     *
     * Lower a count when a use is brought onto the scale; never raise it.
     */
    private const OFF_SCALE_FONT_SIZE = [
        '0.625rem' => 1,
        '0.6875rem' => 1,
        '0.72rem' => 1,
        '0.78125rem' => 2,
        '0.78rem' => 9,
        '0.8rem' => 1,
        '0.9375rem' => 1,
        '1.03125rem' => 1,
        '1.125rem' => 2,
    ];

    /**
     * @var array Off-scale font weights today, value => uses.
     *
     * Lower a count when a use is brought onto the scale; never raise it.
     */
    private const OFF_SCALE_FONT_WEIGHT = [
        650 => 2,
    ];

    /**
     * @var array Off-scale space values today, value => uses.
     *
     * Lower a count when a use is brought onto the scale; never raise it.
     */
    private const OFF_SCALE_SPACE = [
        '-1px' => 1,
        '-2.5px' => 1,
        '-4.5px' => 1,
        '-5px' => 3,
        '0.15rem' => 1,
        '0.1rem' => 1,
        '0.3125rem' => 1,
        '0.35rem' => 1,
        '0.3rem' => 5,
        '0.4375rem' => 2,
        '0.45rem' => 1,
        '0.4rem' => 3,
        '0.55rem' => 1,
        '0.5625rem' => 3,
        '0.625rem' => 13,
        '0.6875rem' => 1,
        '0.6rem' => 6,
        '0.875rem' => 12,
        '0.9rem' => 1,
        '1.125rem' => 2,
        '1.1rem' => 5,
        '1.375rem' => 1,
        '10px' => 4,
        '128px' => 1,
        '14px' => 1,
        '1px' => 5,
        '2.625rem' => 1,
        '2.875rem' => 1,
        '3.375rem' => 3,
        '5px' => 1,
        '7.375rem' => 1,
    ];

    /**
     * @var array Off-scale radius values today, value => uses.
     *
     * Lower a count when a use is brought onto the scale; never raise it.
     */
    private const OFF_SCALE_RADIUS = [
        '0.4375rem' => 1,
        '0.55rem' => 1,
        '0.5625rem' => 1,
        '0.625rem' => 3,
        '0.6rem' => 3,
        '0.7rem' => 2,
        '0.875rem' => 4,
        '1.5px' => 2,
        '1px' => 2,
        '2px' => 2,
        '7px' => 1,
    ];

    /**
     * @var array Off-scale durations today, value => uses.
     *
     * Lower a count when a use is brought onto the scale; never raise it.
     */
    private const OFF_SCALE_MOTION = [
        // The third is the icon tooltips' 100 ms rest (.compass-tip, Tip.tsx), shorter than the base step on purpose.
        '100ms' => 3,
        '10s' => 2,
        '120ms' => 5,
        '1300ms' => 1,
        '1600ms' => 1,
        '160ms' => 3,
        '170ms' => 1,
        '200ms' => 5,
    ];

    /**
     * The stylesheet's rule blocks, comments removed, in source order.
     *
     * @return array A list of [selector list, declarations], each declaration trimmed and on one line.
     */
    private function rules(): array {
        $css = preg_replace('#/\*.*?\*/#s', '', (string) file_get_contents(dirname(__DIR__, 2) . '/styles.css'));
        preg_match_all('/([^{}]+)\{([^{}]*)\}/s', $css, $matches, PREG_SET_ORDER);
        $rules = [];
        foreach ($matches as $match) {
            $declarations = [];
            foreach (explode(';', $match[2]) as $declaration) {
                $declaration = trim(preg_replace('/\s+/', ' ', $declaration));
                if ($declaration !== '') {
                    $declarations[] = $declaration;
                }
            }
            $rules[] = [trim(preg_replace('/\s+/', ' ', $match[1])), $declarations];
        }
        $this->assertGreaterThanOrEqual(300, count($rules), 'fewer than 300 rules read: has the stylesheet moved?');

        return $rules;
    }

    /**
     * Every declaration whose property matches, with the value trimmed of its !important.
     *
     * @param string $property A regular expression body matched against the whole property name.
     * @return array A list of [selector, property, value].
     */
    private function declarations(string $property): array {
        $found = [];
        foreach ($this->rules() as [$selector, $declarations]) {
            foreach ($declarations as $declaration) {
                $colon = strpos($declaration, ':');
                if ($colon === false) {
                    continue;
                }
                $name = strtolower(trim(substr($declaration, 0, $colon)));
                if (!preg_match('/^(?:' . $property . ')$/', $name)) {
                    continue;
                }
                $value = trim(preg_replace('/\s*!important$/i', '', trim(substr($declaration, $colon + 1))));
                $found[] = [$selector, $name, $value];
            }
        }

        return $found;
    }

    /**
     * A value split on whitespace outside parentheses.
     *
     * @param string $value A declaration value.
     * @return array The tokens, in order.
     */
    private function tokens(string $value): array {
        $tokens = [];
        $depth = 0;
        $current = '';
        foreach (str_split($value) as $char) {
            if ($char === '(') {
                $depth++;
            } else if ($char === ')') {
                $depth--;
            }
            if ($depth === 0 && ctype_space($char)) {
                if ($current !== '') {
                    $tokens[] = $current;
                }
                $current = '';
            } else {
                $current .= $char;
            }
        }
        if ($current !== '') {
            $tokens[] = $current;
        }

        return $tokens;
    }

    /**
     * Whether a token is a var() or a calc(), which is on every scale by definition.
     *
     * @param string $token One token of a value.
     * @return bool True when it is not judged.
     */
    private function is_computed(string $token): bool {
        return (bool) preg_match('/^-?(?:var|calc)\(/i', $token);
    }

    /**
     * Whether a length is one of the steps, in the unit it is written in.
     *
     * @param string $token One token of a value.
     * @param array $rem The steps in rem.
     * @param array $px The steps in px.
     * @return bool True when the length is a step; a negative length counts by its absolute value.
     */
    private function on_length_scale(string $token, array $rem, array $px): bool {
        if (!preg_match('/^-?(\d*\.?\d+)(rem|px)?$/i', $token, $m)) {
            return false;
        }
        $number = (float) $m[1];
        $unit = strtolower($m[2] ?? '');
        if ($unit === '') {
            return $number == 0;
        }
        foreach ($unit === 'rem' ? $rem : $px as $step) {
            if ($number == (float) $step) {
                return true;
            }
        }

        return false;
    }

    /**
     * Compare the off-scale uses found with the listed ones, and say what to do on a difference.
     *
     * @param array $off A list of [value, "selector { property: value }"] for every off-scale use.
     * @param array $expected The constant, value => uses, sorted by key.
     * @param string $name The constant's name, for the message.
     * @return void
     */
    private function assert_ratchet(array $off, array $expected, string $name): void {
        $counts = [];
        $where = [];
        foreach ($off as [$value, $declaration]) {
            $counts[$value] = ($counts[$value] ?? 0) + 1;
            $where[$value][] = $declaration;
        }
        ksort($counts);
        $this->assertSame($expected, $counts, "Off-scale uses differ from {$name}: a new value, or one more use of a listed one,"
            . " fails; lower the count in {$name} when a use is brought onto the scale; never raise it.\n"
            . 'Found: ' . var_export($counts, true) . "\n"
            . 'Uses: ' . var_export($where, true));
    }

    /**
     * Font sizes sit on the type scale, and the ones that do not are only ever fewer.
     *
     * Changes that must make it fail: a font-size of 0.83rem, or one more use of a size already listed.
     *
     * @return void
     */
    public function test_font_sizes_are_on_the_type_scale(): void {
        $declarations = $this->declarations('font-size');
        $this->assertGreaterThanOrEqual(60, count($declarations), 'fewer than 60 font-size declarations read');
        $off = [];
        $illustrations = 0;
        foreach ($declarations as [$selector, $property, $value]) {
            if ((self::ILLUSTRATION_FONT_SIZE[$selector] ?? null) === $value) {
                $illustrations++;
                continue;
            }
            $token = strtolower($value);
            $on = $this->is_computed($token) || in_array($token, self::FONT_SIZE_WORDS, true);
            if (!$on && preg_match('/^(\d*\.?\d+)rem$/', $token, $m)) {
                $on = in_array((float) $m[1], array_map('floatval', self::FONT_SIZES), true);
            }
            if (!$on) {
                $off[] = [$value, "{$selector} { {$property}: {$value} }"];
            }
        }
        $this->assertSame(count(self::ILLUSTRATION_FONT_SIZE), $illustrations, 'an illustration\'s rule moved or went');
        $this->assert_ratchet($off, self::OFF_SCALE_FONT_SIZE, 'OFF_SCALE_FONT_SIZE');
    }

    /**
     * Font weights sit on the weight scale, and the ones that do not are only ever fewer.
     *
     * Changes that must make it fail: a font-weight of 800, or one more use of a weight already listed.
     *
     * @return void
     */
    public function test_font_weights_are_on_the_weight_scale(): void {
        $declarations = $this->declarations('font-weight');
        $this->assertGreaterThanOrEqual(20, count($declarations), 'fewer than 20 font-weight declarations read');
        $off = [];
        foreach ($declarations as [$selector, $property, $value]) {
            if (!$this->is_computed($value) && !in_array(strtolower($value), self::WEIGHTS, true)) {
                $off[] = [$value, "{$selector} { {$property}: {$value} }"];
            }
        }
        $this->assert_ratchet($off, self::OFF_SCALE_FONT_WEIGHT, 'OFF_SCALE_FONT_WEIGHT');
    }

    /**
     * Gaps, paddings and margins sit on the space scale, each length of a shorthand on its own.
     *
     * Changes that must make it fail: a padding of 0.7rem, or one more use of a value already listed.
     *
     * @return void
     */
    public function test_space_is_on_the_space_scale(): void {
        $declarations = $this->declarations('(?:row-|column-)?gap|(?:padding|margin)(?:-[a-z-]+)?');
        $this->assertGreaterThanOrEqual(250, count($declarations), 'fewer than 250 space declarations read');
        $off = [];
        foreach ($declarations as [$selector, $property, $value]) {
            foreach ($this->tokens($value) as $token) {
                $lower = strtolower($token);
                if (
                    $this->is_computed($lower)
                    || in_array($lower, self::SPACE_WORDS, true)
                    || $this->on_length_scale($lower, self::SPACE_REM, self::SPACE_PX)
                ) {
                    continue;
                }
                $off[] = [$token, "{$selector} { {$property}: {$value} }"];
            }
        }
        $this->assert_ratchet($off, self::OFF_SCALE_SPACE, 'OFF_SCALE_SPACE');
    }

    /**
     * Radii sit on the radius scale, each length of a shorthand on its own.
     *
     * Changes that must make it fail: a border-radius of 10px, or one more use of a value already listed.
     *
     * @return void
     */
    public function test_radii_are_on_the_radius_scale(): void {
        $declarations = $this->declarations('border-(?:(?:top|bottom|start|end)-(?:left|right|start|end)-)?radius');
        $this->assertGreaterThanOrEqual(60, count($declarations), 'fewer than 60 radius declarations read');
        $off = [];
        foreach ($declarations as [$selector, $property, $value]) {
            foreach ($this->tokens($value) as $token) {
                $lower = strtolower($token);
                if (
                    $token === '/'
                    || $this->is_computed($lower)
                    || in_array($lower, self::RADIUS_WORDS, true)
                    || $this->on_length_scale($lower, self::RADIUS_REM, self::RADIUS_PX)
                ) {
                    continue;
                }
                $off[] = [$token, "{$selector} { {$property}: {$value} }"];
            }
        }
        $this->assert_ratchet($off, self::OFF_SCALE_RADIUS, 'OFF_SCALE_RADIUS');
    }

    /**
     * Transition and animation durations are the fast or the base step, or come from a var().
     *
     * Changes that must make it fail: a transition of 0.3s, or one more use of a duration already listed.
     *
     * @return void
     */
    public function test_durations_are_on_the_motion_scale(): void {
        $declarations = $this->declarations('(?:transition|animation)(?:-[a-z-]+)?');
        $this->assertGreaterThanOrEqual(25, count($declarations), 'fewer than 25 transition and animation declarations read');
        $off = [];
        foreach ($declarations as [$selector, $property, $value]) {
            $bare = $value;
            do {
                $bare = preg_replace('/var\([^()]*\)/i', '', $bare, -1, $replaced);
            } while ($replaced > 0);
            preg_match_all('/(?<![\w.-])(\d+ms|\d*\.?\d+s)(?![\w-])/i', $bare, $found);
            foreach ($found[1] as $duration) {
                if (!in_array(strtolower($duration), self::DURATIONS, true)) {
                    $off[] = [$duration, "{$selector} { {$property}: {$value} }"];
                }
            }
        }
        $this->assert_ratchet($off, self::OFF_SCALE_MOTION, 'OFF_SCALE_MOTION');
    }
}
