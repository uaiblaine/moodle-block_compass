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
 * Checks the Bootstrap vocabulary of the templates, the React sources and the stylesheet.
 *
 * phpcs, the Mustache lint and stylelint never read a class name out of markup, so this
 * test is the only check on it. The plugin is Bootstrap 5 only: the Bootstrap 4 names that
 * Moodle 5.x still bridges (theme/boost/scss/moodle/bs4-compat.scss for classes, whose rules
 * outline them in red on Behat and theme-designer sites, and theme/boost/amd/src/bs4-compat.js
 * for data attributes) are deprecated and removed in Moodle 6.0 (MDL-84465), so their presence
 * is the defect. Every badge states its text colour, because Bootstrap 5's default is white.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversNothing]
final class bootstrap_compat_test extends basic_testcase {
    /** @var string[] Bootstrap 4 class names and data-API attributes that 5.x resolves only through the deprecated bridge. */
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
     * A badge's class attribute, as class="..." (Mustache) or className="..." (TSX).
     *
     * One pattern, shared by the badge rule and by the check that the rule still reads TSX,
     * so the check cannot pass while the rule has gone blind.
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
        // Every place the plugin writes a class name. The client's markup is in js/esm/src; a
        // new markup location must join this list, or the rules below never read it.
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
     * One file per place the plugin writes markup is named rather than counted: a glob that
     * stopped matching would leave a count passing with js/esm/src empty.
     *
     * @return void
     */
    public function test_the_scan_covers_templates_javascript_and_the_stylesheet(): void {
        $files = $this->sources();

        // The templates are the shell, the page wrapper and the preload links; every card,
        // row and toolbar class is written in a .tsx.
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
     * Bootstrap 5 badges default to white text, which is unreadable on the light
     * backgrounds (secondary, warning, light): those need text-dark, the rest text-white.
     * The attribute is read in both spellings, {@see self::BADGE_ATTRIBUTE}.
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

        // The total above could be met by a Mustache badge alone; this count proves the
        // className spelling of the pattern still reads the React badges.
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
     * Bootstrap writes its display utilities as `display: flex !important`, and its reboot
     * writes `[hidden] { display: none !important; }`. The two have the same specificity and
     * the utilities come later in the sheet, so an element carrying both is always visible,
     * whatever the JavaScript does with `hidden`. Put the layout in a plugin class guarded by
     * :not([hidden]) instead, as styles.css does for .compass-error and .compass-fpanel.
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
     * A badge's classes are a literal, so that the badge rule can read them.
     *
     * {@see self::test_every_badge_states_its_text_colour()} reads a quoted attribute value,
     * so a computed className={cx('badge', tone)} would carry a badge it cannot see. React
     * sources therefore write a badge's className as a string literal; a conditional badge
     * picks between whole elements, as Row.tsx does for its New and pending badges.
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
