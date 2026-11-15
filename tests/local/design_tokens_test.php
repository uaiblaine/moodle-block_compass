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
 * The fleet Design System's token contract, pinned by reading the stylesheet.
 *
 * The contract is moodle-dev/docs/design-system/tokens.md: a colour is the chain
 * var(--dimensions-X, var(--bs-Y, literal)) under the block's own prefix, a rule reads the block's
 * token and nothing of the theme's, and the scales (radius, elevation, motion, the focus ring and its width,
 * the control line) are the family's with a literal fallback. No linter reads a token chain, so each
 * rule is a test here; each method names the change that must redden it, and mutations/gates.conf
 * makes that change.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversNothing]
final class design_tokens_test extends basic_testcase {
    /** @var string The block's token prefix. */
    private const PREFIX = '--block_compass-';

    /**
     * @var array Token suffix => why it reads Bootstrap or a literal with no family token before it.
     *
     * Exact: a name listed here that no longer needs the exception fails the test, and so does a new
     * one that is not listed.
     */
    private const OWN = [
        'surface' => 'the card this element is (--bs-card-bg) comes before the family\'s surface, the page\'s ground',
        'cal-warn' => 'the heat scale\'s source is the solid warning; the family has the warning tone triple only',
        'cal-danger' => 'a late mark is the solid danger; the family has the danger tone triple only',
        'cal-fg-on-heat-3' => 'text on a fill that is mostly the solid warning in either mode stays dark',
        'cal-fg-on-heat-4' => 'text on a fill that is mostly the solid warning in either mode stays dark',
        'cal-shadow' => 'the day card\'s own shadow, a literal until the containers step reads an elevation',
        'news-crest-tile' => 'a crest\'s tile is light in both modes (ADR-019): gray-200 in the dark one',
        'news-warm' => 'the open-courses panel\'s warm gradient stop, decoration',
        'news-sand' => 'the open-courses panel\'s sparkle, decoration',
        'news-tip-shadow' => 'a group tooltip\'s own shadow, a literal until the containers step reads an elevation',
    ];

    /**
     * @var array The rules that still read a theme property themselves, selector => declaration.
     *
     * Both are a shadow or a veil, which the containers step replaces with an elevation and a scrim.
     */
    private const DIRECT = [
        '.block_compass .compass-news-group'
            => 'box-shadow: 0 1px 2px color-mix(in oklab, var(--bs-emphasis-color, #000) 6%, transparent)',
        '.block_compass .compass-news-scrim'
            => 'background: color-mix(in oklab, var(--bs-black, #000) 35%, transparent)',
    ];

    /** @var array The scale tokens, suffix => the exact declaration tokens.md gives. */
    private const SCALES = [
        'radius-xs' => 'var(--dimensions-radius-xs, 4px)',
        'radius-sm' => 'var(--dimensions-radius-sm, 6px)',
        'radius-md' => 'var(--dimensions-radius-md, 8px)',
        'radius-lg' => 'var(--dimensions-radius-lg, 12px)',
        'radius-xl' => 'var(--dimensions-radius-xl, 16px)',
        'elevation-sm' => 'var(--dimensions-elevation-sm, 0 1px 2px rgba(7, 0, 147, 0.08), 0 1px 3px rgba(7, 0, 147, 0.06))',
        'elevation-md' => 'var(--dimensions-elevation-md, 0 4px 12px rgba(7, 0, 147, 0.1))',
        'elevation-lg' => 'var(--dimensions-elevation-lg, 0 12px 32px rgba(7, 0, 147, 0.14))',
        'focus-ring' => 'var(--dimensions-focus-ring, var(--bs-emphasis-color, #000))',
        'focus-width' => 'var(--dimensions-focus-width, 2px)',
        'control-line' => 'var(--dimensions-control-line, var(--bs-gray-500, #8f959e))',
        'motion-fast' => 'var(--dimensions-motion-fast, 150ms)',
        'motion-ease' => 'var(--dimensions-motion-ease, cubic-bezier(0.4, 0, 0.2, 1))',
    ];

    /** @var array The names that were a second name of another token or not the family's; each is one token now. */
    private const COLLAPSED = [
        'brand', 'brand-text', 'brand-onink',
        'x3-text', 'x3-soft', 'x3-track', 'x3-fg-dim',
        'cal-text', 'cal-soft', 'cal-fg-dim',
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
     * Every declaration of one of the block's custom properties.
     *
     * @return array A list of [selector list, token suffix, value].
     */
    private function tokens(): array {
        $tokens = [];
        foreach ($this->rules() as [$selector, $declarations]) {
            foreach ($declarations as $declaration) {
                if (preg_match('/^' . preg_quote(self::PREFIX, '/') . '([\w-]+)\s*:\s*(.*)$/s', $declaration, $match)) {
                    $tokens[] = [$selector, $match[1], $match[2]];
                }
            }
        }
        $this->assertGreaterThanOrEqual(100, count($tokens), 'fewer than 100 token declarations read');

        return $tokens;
    }

    /**
     * A colour token reads the family's name first, in the light rules and in the dark ones.
     *
     * A token that names a Bootstrap property or writes a colour literal is a link of the chain, so
     * its value starts with var(--dimensions-: the theme answers first, Bootstrap second, the
     * literal last. A token built from the block's other tokens (an alias, a color-mix(), a remap in
     * a dim scope) names neither and inherits their chains. The exceptions are OWN, each with its
     * reason.
     *
     * Changes that must make it fail: a token back on var(--bs-...) alone; a new token with a
     * literal palette; an exception left in OWN after its token joined the chain.
     *
     * @return void
     */
    public function test_every_colour_token_reads_the_family_first(): void {
        $outside = [];
        $excepted = [];
        $chained = 0;
        foreach ($this->tokens() as [$selector, $name, $value]) {
            $themed = str_contains($value, 'var(--bs-') || preg_match('/#[0-9a-f]{3,8}\b|\brgba?\(/i', $value);
            if (!$themed) {
                continue;
            }
            if (preg_match('/^var\(\s*--dimensions-/', $value)) {
                $chained++;
                continue;
            }
            if (array_key_exists($name, self::OWN)) {
                $excepted[$name] = true;
                continue;
            }
            $outside[] = "{$selector} { " . self::PREFIX . "{$name}: {$value} }";
        }
        $this->assertSame([], $outside, 'outside the chain var(--dimensions-X, var(--bs-Y, literal)): ' . implode('; ', $outside));
        $this->assertGreaterThanOrEqual(50, $chained, 'fewer than 50 chained tokens: the rule above checked little');
        $this->assertSame(
            [],
            array_values(array_diff(array_keys(self::OWN), array_keys($excepted))),
            'listed as the block\'s own but no longer outside the chain: drop it from OWN'
        );
    }

    /**
     * A rule reads the block's tokens, never a property of Bootstrap's or of the family's.
     *
     * The chain lives in one declaration per name, on the block's root; a rule that reads --bs-* or
     * --dimensions-* itself paints outside it, and a theme of the family cannot move it. DIRECT is
     * the whole list of what is left, compared for equality.
     *
     * Changes that must make it fail: a background back on var(--bs-secondary-bg, ...); a rule
     * reading var(--dimensions-ink) itself.
     *
     * @return void
     */
    public function test_no_rule_reads_the_theme_itself(): void {
        $direct = [];
        $read = 0;
        foreach ($this->rules() as [$selector, $declarations]) {
            foreach ($declarations as $declaration) {
                if (str_starts_with($declaration, '--')) {
                    continue;
                }
                $read++;
                if (preg_match('/var\(\s*--(?:bs|dimensions)-/', $declaration)) {
                    $direct[$selector] = $declaration;
                }
            }
        }
        $this->assertGreaterThanOrEqual(1000, $read, 'fewer than 1000 declarations read');
        ksort($direct);
        $this->assertSame(self::DIRECT, $direct);
    }

    /**
     * The scale tokens are declared on the block's root, each the family's name with tokens.md's fallback.
     *
     * The control line's Bootstrap link is gray-500 since the filter bar's step (D45), and the motion
     * tokens came with it: the bar's transitions read them.
     *
     * Changes that must make it fail: a scale token dropped or renamed; a fallback other than the
     * scale's step; the control line back on gray-600.
     *
     * @return void
     */
    public function test_scale_tokens_are_declared(): void {
        $root = [];
        foreach ($this->tokens() as [$selector, $name, $value]) {
            if ($selector === '.block_compass') {
                $root[$name] = $value;
            }
        }
        foreach (self::SCALES as $name => $value) {
            $this->assertSame($value, $root[$name] ?? null, self::PREFIX . $name);
        }
    }

    /**
     * One meaning has one token: the second names stay gone, and the family's namespace is the theme's.
     *
     * Changes that must make it fail: --block_compass-cal-text or --block_compass-brand declared or
     * read again, in the stylesheet or in the client; a --dimensions-* or --mds-* name declared here.
     *
     * @return void
     */
    public function test_second_names_and_foreign_declarations_stay_gone(): void {
        $sources = [(string) file_get_contents(dirname(__DIR__, 2) . '/styles.css')];
        $client = glob(dirname(__DIR__, 2) . '/js/esm/src/*.{ts,tsx}', GLOB_BRACE);
        $this->assertGreaterThanOrEqual(30, count($client), 'the client\'s sources were not found');
        foreach ($client as $file) {
            $sources[] = (string) file_get_contents($file);
        }
        $all = implode("\n", $sources);
        foreach (self::COLLAPSED as $name) {
            $this->assertDoesNotMatchRegularExpression(
                '/' . preg_quote(self::PREFIX . $name, '/') . '(?![\w-])/',
                $all,
                self::PREFIX . $name . ' is a second name of another token'
            );
        }
        // The names the second ones became, so the loop above cannot pass on an emptied stylesheet.
        foreach (['ink', 'ink-dim', 'surface-alt', 'surface-inset', 'accent', 'accent-text', 'on-accent'] as $name) {
            $this->assertMatchesRegularExpression('/' . preg_quote(self::PREFIX . $name, '/') . '\s*:/', $sources[0], $name);
        }
        foreach ($this->rules() as [$selector, $declarations]) {
            foreach ($declarations as $declaration) {
                $this->assertDoesNotMatchRegularExpression(
                    '/^--(?:dimensions|mds)-/',
                    $declaration,
                    "{$selector} declares a name of the theme's or of core's"
                );
            }
        }
    }
}
