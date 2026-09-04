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
     * Every file the scan covers, with its contents.
     *
     * @return array Relative path => contents.
     */
    private function sources(): array {
        $root = dirname(__DIR__, 2);
        $files = [];
        $paths = array_merge(
            glob($root . '/templates/*.mustache'),
            glob($root . '/amd/src/*.js'),
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
     * @return void
     */
    public function test_the_scan_covers_templates_javascript_and_the_stylesheet(): void {
        $files = $this->sources();

        $this->assertArrayHasKey('templates/card.mustache', $files);
        $this->assertArrayHasKey('amd/src/attention.js', $files);
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
     * @return void
     */
    public function test_every_badge_states_its_text_colour(): void {
        $badges = 0;
        foreach ($this->sources() as $file => $contents) {
            preg_match_all('/class="([^"]*\bbadge\b[^"]*)"/', $contents, $matches);
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
