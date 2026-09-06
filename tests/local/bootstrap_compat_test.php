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
 * Bootstrap 5 vocabulary guard.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use basic_testcase;
use PHPUnit\Framework\Attributes\CoversNothing;

/**
 * Scans templates, JavaScript sources and the stylesheet for what no gate reads.
 *
 * Nothing in the pipeline reads a class name out of a Mustache or JS file, and
 * the fleet shipped the same Bootstrap defect class several times with CI green
 * (CLAUDE.md, "Moodle 5.2-only"). This plugin is Bootstrap 5 only: the Bootstrap
 * 4 names that Moodle 5.x still bridges are deprecated with a red outline under
 * behat and disappear in Moodle 6.0, so their mere presence is the defect. And
 * every badge states its text colour, because Bootstrap 5's default is white.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversNothing]
final class bootstrap_compat_test extends basic_testcase {
    /** @var string[] Bootstrap 4 class families that resolve on 5.x only through the deprecated bridge. */
    private const BS4_PATTERNS = [
        '/\b(?:ml|mr|pl|pr)-(?:0|1|2|3|4|5|auto|n1|n2|n3|n4|n5)\b/',
        '/\btext-(?:left|right)\b/',
        '/\bfloat-(?:left|right)\b/',
        '/\bsr-only(?:-focusable)?\b/',
        '/\bno-gutters\b/',
        '/\bbadge-(?:primary|secondary|success|danger|warning|info|light|dark|pill)\b/',
        '/\bcustom-(?:select|control|checkbox|radio|switch|file)\b/',
        '/\bform-row\b/',
        '/\bmedia-body\b/',
        '/\bdata-toggle=/',
        '/\bdata-dismiss=/',
        '/\bdropdown-menu-right\b/',
    ];

    /**
     * A badge's class attribute, under both spellings the client writes.
     *
     * ONE pattern, shared by the rule and by the guard that proves the rule reads both
     * languages. Two copies would let the guard pass while the rule went blind, which is
     * the shape this whole file exists to prevent - and the first draft of the guard had
     * exactly that bug.
     */
    private const BADGE_ATTRIBUTE = '/\bclass(?:Name)?="([^"]*\bbadge\b[^"]*)"/';

    /**
     * Every file the scan covers, with its contents.
     *
     * @return array Relative path => contents.
     */
    private function sources(): array {
        $root = dirname(__DIR__, 2);
        $files = [];
        /*
         * js/esm/src joins the scan in phase R1 (ADR-006): the class names of the client
         * are moving out of templates/ and amd/src/ into .tsx, and this file is the only
         * thing in any pipeline that reads a class name -- phpcs reads PHP, the Mustache
         * lint reads structure, stylelint reads CSS, and eslint reads neither vocabulary
         * nor contrast. A migration that left this list alone would carry the protection
         * away with the markup it protects.
         */
        $paths = array_merge(
            glob($root . '/templates/*.mustache'),
            glob($root . '/js/esm/src/*.ts'),
            glob($root . '/js/esm/src/*.tsx'),
            [$root . '/styles.css']
        );
        foreach ($paths as $path) {
            $files[substr($path, strlen($root) + 1)] = file_get_contents($path);
        }

        return $files;
    }

    /**
     * The scan sees the files it is meant to see.
     *
     * A scan is only worth what it reads, and every one of these paths is a place this
     * plugin writes a Bootstrap class name. The React source is named explicitly rather
     * than left to the count: a glob that silently stops matching is how this defect
     * class ships, and the count alone would still pass with js/esm/src empty.
     *
     * @return void
     */
    public function test_the_scan_covers_templates_javascript_and_the_stylesheet(): void {
        $files = $this->sources();

        // One file per place the plugin writes markup, named rather than counted: a glob
        // that silently stops matching is how this defect class ships, and a count alone
        // would pass with js/esm/src empty. Since R3 there is one template left - the shell
        // - and every class name the client writes is in a .tsx.
        $this->assertArrayHasKey('templates/block.mustache', $files);
        $this->assertArrayHasKey('js/esm/src/Card.tsx', $files);
        $this->assertArrayHasKey('js/esm/src/Row.tsx', $files);
        $this->assertArrayHasKey('styles.css', $files);
        $this->assertGreaterThanOrEqual(8, count($files));
    }

    /**
     * No Bootstrap 4 vocabulary anywhere the plugin writes markup or classes.
     *
     * @return void
     */
    public function test_no_bootstrap4_class_names(): void {
        foreach ($this->sources() as $file => $contents) {
            foreach (self::BS4_PATTERNS as $pattern) {
                $this->assertDoesNotMatchRegularExpression(
                    $pattern,
                    $contents,
                    "{$file} carries a Bootstrap 4 name matching {$pattern}; write the Bootstrap 5 spelling"
                );
            }
        }
    }

    /**
     * Every badge pairs its background with an explicit text colour.
     *
     * Bootstrap 4 badges had no colour, Bootstrap 5 badges default to white; the
     * failing cases are disjoint between the branches and the light backgrounds
     * (secondary, warning, light) fail on 5.x.
     *
     * The attribute is matched under both spellings because the client writes markup in
     * two languages during the React migration (ADR-006): a Mustache template writes
     * class="..." and a .tsx writes className="...". Reading only the first would have
     * left every badge React renders unchecked from the phase that writes one - a green
     * gate over the exact defect class this file exists for, which is how it has shipped
     * four times elsewhere in the fleet. Found and closed in R1, before R2 writes a badge.
     *
     * @return void
     */
    public function test_every_badge_states_its_text_colour(): void {
        $badges = 0;
        foreach ($this->sources() as $file => $contents) {
            preg_match_all(self::BADGE_ATTRIBUTE, $contents, $matches);
            foreach ($matches[1] as $classes) {
                $badges++;
                $this->assertMatchesRegularExpression(
                    '/\bbg-[a-z]+\b/',
                    $classes,
                    "{$file}: a badge without a bg-* background: {$classes}"
                );
                $this->assertMatchesRegularExpression(
                    '/\btext-(?:white|dark|body|light)\b/',
                    $classes,
                    "{$file}: a badge without an explicit text colour: {$classes}"
                );
                if (preg_match('/\bbg-(?:secondary|warning|light)\b/', $classes)) {
                    $this->assertMatchesRegularExpression('/\btext-dark\b/', $classes, "{$file}: light badge needs text-dark");
                } else {
                    $this->assertMatchesRegularExpression('/\btext-white\b/', $classes, "{$file}: dark badge needs text-white");
                }
            }
        }
        // The rule must have had something to check, or a renamed class silently disables it.
        $this->assertGreaterThanOrEqual(1, $badges, 'no badge found: has the card template lost its New badge?');

        /*
         * And it must have checked a badge on EACH side of the migration, which the count
         * above cannot tell: while one Mustache badge survives in tier 3, dropping the
         * className half of the regex would leave every React badge unread and the total
         * still non-zero. Phase R1 recorded this gate as owed by the phase that wrote the
         * first .tsx badge; this is that phase.
         */
        $reactbadges = 0;
        foreach ($this->sources() as $file => $contents) {
            if (!str_ends_with($file, '.tsx')) {
                continue;
            }
            $reactbadges += preg_match_all(self::BADGE_ATTRIBUTE, $contents);
        }
        $this->assertGreaterThanOrEqual(
            1,
            $reactbadges,
            'no badge found in the React sources: has Card.tsx lost its New badge, or has the '
                . 'attribute regex stopped reading className?'
        );
    }

    /**
     * Nothing carries both the hidden attribute and a Bootstrap display utility.
     *
     * Bootstrap writes its display utilities as `display: flex !important`, and Boost's
     * own reset writes `[hidden] { display: none !important; }`. The two have the SAME
     * specificity, so source order decides, and the utility comes later: an element with
     * both is permanently visible however carefully the JavaScript sets `hidden`.
     *
     * This shipped in this plugin from Phase 1 to R1 - the error region carried `d-flex`,
     * so every Dashboard showed an empty warning with a Try again button - and no gate in
     * the fleet could see it. phpcs reads PHP, the Mustache lint reads structure,
     * stylelint reads the stylesheet, and Behat's "I should see" never asks whether an
     * empty span is displayed. Only opening the page found it, which is not a gate.
     *
     * The rule is general: put the layout in a plugin class guarded by :not([hidden]).
     *
     * @return void
     */
    public function test_nothing_hidden_also_carries_a_display_utility(): void {
        $checked = 0;
        foreach ($this->sources() as $file => $contents) {
            if (!str_ends_with($file, '.mustache') && !str_ends_with($file, '.tsx')) {
                continue;
            }
            $checked++;
            preg_match_all('/<[a-zA-Z][^>]*>/s', $contents, $tags);
            foreach ($tags[0] as $tag) {
                // The bare attribute only: visually-hidden and data-region="hidden" are not it.
                if (!preg_match('/(?<![-\w"])hidden(?![-\w=])/', $tag)) {
                    continue;
                }
                $this->assertDoesNotMatchRegularExpression(
                    '/\bd-(?:none|inline|inline-block|inline-flex|block|grid|table|flex)\b/',
                    $tag,
                    "{$file}: this element is hidden AND carries a Bootstrap display utility, "
                        . 'which is !important and wins - it will never actually hide: ' . trim($tag)
                );
            }
        }
        // Vacuity guard: the markup files must have been read.
        $this->assertGreaterThanOrEqual(1, $checked, 'no markup scanned: have the templates moved?');
    }

    /**
     * A badge's classes are a literal, so that the rule above can read them.
     *
     * The check above is a regex over an attribute value, which a computed JSX className
     * defeats: className={cx('badge', tone)} carries a badge the scan cannot see, and it
     * would pass in silence. Rather than pretend the regex is cleverer than it is, the
     * construct is banned in this plugin's React sources - a badge names its classes as a
     * string, and anything conditional picks between whole literals.
     *
     * @return void
     */
    public function test_react_sources_write_badge_classes_as_literals(): void {
        $checked = 0;
        foreach ($this->sources() as $file => $contents) {
            if (!str_ends_with($file, '.tsx') && !str_ends_with($file, '.ts')) {
                continue;
            }
            $checked++;
            $this->assertDoesNotMatchRegularExpression(
                '/className=\{[^}]*badge/',
                $contents,
                "{$file}: a computed className carrying a badge is invisible to the badge rule; "
                    . 'name the classes in a string literal'
            );
        }
        // Vacuity guard: the loop must have seen the React sources, not skipped them all.
        $this->assertGreaterThanOrEqual(1, $checked, 'no React source scanned: has js/esm/src moved?');
    }

    /**
     * Custom properties use the frankenstyle prefix, never core's design-system namespace.
     *
     * @return void
     */
    public function test_custom_properties_use_the_plugin_prefix_only(): void {
        // Comments are prose and may mention what the rule forbids; declarations may not.
        $css = preg_replace('#/\*.*?\*/#s', '', $this->sources()['styles.css']);

        $this->assertDoesNotMatchRegularExpression('/--mds-/', $css, 'never declare --mds-* names');
        preg_match_all('/--([a-z0-9_-]+)\s*:/', $css, $declared);
        $this->assertNotEmpty($declared[1]);
        foreach ($declared[1] as $name) {
            $this->assertStringStartsWith('block_compass-', $name, "custom property --{$name} is not namespaced");
        }
        $this->assertDoesNotMatchRegularExpression('/!important/', $css, 'stylelint forbids !important');
    }
}
