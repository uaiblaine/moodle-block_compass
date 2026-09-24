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
     * A badge's class attribute, as class="..." (Mustache) or className="..." (TSX), in double or single quotes.
     *
     * One pattern, shared by the badge rule and by the check that the rule still reads TSX,
     * so the check cannot pass while the rule has gone blind. The branch reset puts the
     * classes in the first group whichever quote matched.
     */
    private const BADGE_ATTRIBUTE = '/(?|\bclass(?:Name)?="([^"]*\bbadge\b[^"]*)"|\bclass(?:Name)?=\'([^\']*\bbadge\b[^\']*)\')/';

    /**
     * A className written as a braced expression, from its opening brace to the matching one.
     *
     * The braces are matched recursively, so the brace that closes a template literal's
     * placeholder does not end the expression before the classes written after it.
     */
    private const COMPUTED_CLASSNAME = '/className=(\{(?:[^{}]++|(?1))*+\})/';

    /** @var string A Bootstrap display utility at any breakpoint or for print; every one of them is !important. */
    private const DISPLAY_UTILITY = '/\bd-(?:(?:sm|md|lg|xl|xxl|print)-)?'
        . '(?:none|inline|inline-block|inline-flex|block|grid|table|flex)\b/';

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
     * Every tag in a template or a React source, as written.
     *
     * A tag ends at the first closing angle bracket outside quotes and braces, so an arrow
     * function or a comparison inside a JSX expression does not end it early. Every opening
     * angle bracket followed by a letter is a candidate, so an element written inside another
     * element's attribute is returned on its own as well. A candidate that opens no tag, such
     * as a comparison or a type argument in TypeScript, is dropped at the first semicolon or
     * parenthesis outside braces, or at a closing brace it did not open.
     *
     * @param string $contents The file's contents.
     * @return string[] The tags, each from its opening angle bracket to its closing one.
     */
    private static function tags(string $contents): array {
        preg_match_all('/<[a-zA-Z]/', $contents, $starts, PREG_OFFSET_CAPTURE);
        $length = strlen($contents);
        $tags = [];
        foreach ($starts[0] as $start) {
            $offset = $start[1];
            $depth = 0;
            $quote = '';
            for ($i = $offset + 1; $i < $length; $i++) {
                $char = $contents[$i];
                if ($quote !== '') {
                    // A quoted attribute value ends only at its own quote.
                    if ($char === $quote) {
                        $quote = '';
                    }
                } else if ($char === '{') {
                    $depth++;
                } else if ($char === '}') {
                    $depth--;
                    if ($depth < 0) {
                        break;
                    }
                } else if ($depth > 0) {
                    // Inside a JSX expression or a Mustache tag nothing ends the tag.
                    continue;
                } else if ($char === '"' || $char === "'") {
                    $quote = $char;
                } else if ($char === '>') {
                    $tags[] = substr($contents, $offset, $i - $offset + 1);
                    break;
                } else if (str_contains(';()', $char)) {
                    break;
                }
            }
        }

        return $tags;
    }

    /**
     * A tag with its braced expressions and quoted values removed, leaving the element and attribute names.
     *
     * Braces are removed innermost first because they nest: a Mustache section tag, a
     * template literal's placeholder, an object inside a JSX expression.
     *
     * @param string $tag One tag, as {@see self::tags()} returns it.
     * @return string The tag without its values.
     */
    private static function attribute_names(string $tag): string {
        do {
            $tag = preg_replace('/\{[^{}]*\}/', '', $tag, -1, $count);
        } while ($count > 0);

        return preg_replace('/"[^"]*"|\'[^\']*\'/', '', $tag);
    }

    /**
     * The tags in one file that carry the hidden attribute and a Bootstrap display utility.
     *
     * The attribute is found by name among the attribute names, so hidden bare, hidden={expr}
     * and a hidden inside a Mustache section all count, while aria-hidden, visually-hidden and
     * a value that happens to read hidden do not.
     *
     * @param string $contents A template or a React source.
     * @return string[] The offending tags.
     */
    private static function hidden_with_display_utility(string $contents): array {
        $offending = [];
        foreach (self::tags($contents) as $tag) {
            $names = self::attribute_names($tag);
            if (preg_match('/(?<![-\w])hidden(?![-\w])/', $names) && preg_match(self::DISPLAY_UTILITY, $tag)) {
                $offending[] = trim($tag);
            }
        }

        return $offending;
    }

    /**
     * The badges in one file.
     *
     * @param string $contents A template or a React source.
     * @return string[] The class list of every badge, {@see self::BADGE_ATTRIBUTE}.
     */
    private static function badges(string $contents): array {
        preg_match_all(self::BADGE_ATTRIBUTE, $contents, $matches);

        return $matches[1];
    }

    /**
     * What is wrong with one badge's colours.
     *
     * @param string $classes A badge's class list.
     * @return string|null The defect, or null when the badge names a background and the text colour that suits it.
     */
    private static function badge_defect(string $classes): ?string {
        if (!preg_match('/\bbg-[a-z]+\b/', $classes)) {
            return 'a badge without a bg-* background';
        }
        if (!preg_match('/\btext-(?:white|dark|body|light)\b/', $classes)) {
            return 'a badge without an explicit text colour';
        }
        if (preg_match('/\bbg-(?:secondary|warning|light)\b/', $classes)) {
            return preg_match('/\btext-dark\b/', $classes) ? null : 'a light badge needs text-dark';
        }

        return preg_match('/\btext-white\b/', $classes) ? null : 'a dark badge needs text-white';
    }

    /**
     * The computed classNames in one file that name a badge.
     *
     * @param string $contents A React source.
     * @return string[] Each offending expression, braces included, {@see self::COMPUTED_CLASSNAME}.
     */
    private static function computed_badge_classnames(string $contents): array {
        preg_match_all(self::COMPUTED_CLASSNAME, $contents, $matches);

        return array_values(array_filter(
            $matches[1],
            static fn(string $expression): bool => str_contains($expression, 'badge')
        ));
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
     * The attribute is read in both spellings and both quote styles, {@see self::BADGE_ATTRIBUTE}.
     *
     * Changes that must make it fail: BADGE_ATTRIBUTE losing the className spelling or the
     * single-quoted value, badge_defect() dropping any of its colour checks, and a badge in the
     * sources without a background, without a text colour or with the wrong one.
     *
     * @return void
     */
    public function test_every_badge_states_its_text_colour(): void {
        // Controls: the rule reads both spellings in both quote styles, and rejects each of them
        // when the colours are wrong; a correct badge passes.
        $controls = [
            "<span className='badge bg-warning'>" => 'badge bg-warning',
            '<span className="badge bg-success text-dark">' => 'badge bg-success text-dark',
            "<span class='badge bg-secondary text-white'>" => 'badge bg-secondary text-white',
        ];
        foreach ($controls as $markup => $classes) {
            $this->assertSame([$classes], self::badges($markup), "the badge rule does not read {$markup}");
            $this->assertNotNull(self::badge_defect($classes), "the badge rule accepts {$markup}");
        }
        // A badge with a text colour and no background: without the background check, text-white
        // would pass it as a dark badge, so the defect named must be the missing background.
        $this->assertSame(
            'a badge without a bg-* background',
            self::badge_defect('badge text-white'),
            'the badge rule accepts a badge that names no background'
        );
        $this->assertNull(self::badge_defect('badge bg-warning text-dark'), 'the badge rule rejects a correct badge');

        $badges = 0;
        foreach ($this->sources() as $file => $contents) {
            foreach (self::badges($contents) as $classes) {
                $badges++;
                $defect = self::badge_defect($classes);
                $this->assertNull($defect, "{$file}: {$defect}: {$classes}");
            }
        }
        // The rule must have had something to check, or a renamed class silently disables it.
        $this->assertGreaterThanOrEqual(
            1,
            $badges,
            'no badge found: have the New badges of Card.tsx, Row.tsx and RowCard.tsx been removed, or '
                . 'has the attribute pattern stopped reading them?'
        );

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
     * React writes the attribute with a value, hidden={expression}, and its tags hold arrow
     * functions whose closing angle bracket is not the tag's; both are read,
     * {@see self::hidden_with_display_utility()}.
     *
     * Changes that must make it fail: reading the bare attribute only, ending a tag at an angle
     * bracket inside its braces, dropping the breakpoint utilities from DISPLAY_UTILITY, and an
     * element in the sources that carries both.
     *
     * @return void
     */
    public function test_nothing_hidden_also_carries_a_display_utility(): void {
        // Controls: the attribute with a value, bare after an arrow function, inside a Mustache
        // section, and beside a breakpoint utility must be rejected; the look-alikes must not.
        $rejected = [
            '<div hidden={x} className="d-flex">',
            '<div className="d-flex" onClick={() => go()} hidden>',
            '<div class="d-flex" {{^open}}hidden{{/open}}>',
            '<div hidden className="d-lg-block">',
        ];
        foreach ($rejected as $control) {
            $this->assertCount(1, self::hidden_with_display_utility($control), "the rule lets through {$control}");
        }
        $accepted = [
            '<div className="compass-fpanel" hidden={x}>',
            '<span aria-hidden="true" className="d-inline-flex">',
            '<span className="visually-hidden d-block">',
        ];
        foreach ($accepted as $control) {
            $this->assertSame([], self::hidden_with_display_utility($control), "the rule rejects {$control}");
        }

        $checked = 0;
        foreach ($this->sources() as $file => $contents) {
            if (!str_ends_with($file, '.mustache') && !str_ends_with($file, '.tsx')) {
                continue;
            }
            $checked++;
            $this->assertSame(
                [],
                self::hidden_with_display_utility($contents),
                "{$file}: an element is hidden AND carries a Bootstrap display utility, which is "
                    . '!important and wins, so it never actually hides'
            );
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
     * picks between whole elements, as Row.tsx does for its New and pending badges. The
     * expression is read to its matching brace, so a badge written after a template literal's
     * placeholder is seen, {@see self::COMPUTED_CLASSNAME}.
     *
     * Changes that must make it fail: ending the expression at its first closing brace, which
     * in a template literal closes a placeholder, and a computed className naming a badge in the
     * sources.
     *
     * @return void
     */
    public function test_react_sources_write_badge_classes_as_literals(): void {
        // Controls: a call, a template literal naming the badge after a placeholder, and a string
        // in braces are all computed as far as the badge rule can tell; a plain literal is not.
        // The backtick is built with chr(): Moodle's coding standard forbids one inside a string.
        $tick = chr(96);
        $rejected = [
            "<span className={cx('badge', tone)}>",
            '<span className={' . $tick . 'x ${y} badge' . $tick . '}>',
            "<span className={'badge bg-info text-white'}>",
        ];
        foreach ($rejected as $control) {
            $this->assertCount(1, self::computed_badge_classnames($control), "the ban lets through {$control}");
        }
        $accepted = [
            '<span className="badge bg-info text-white">',
            '<span className={' . $tick . 'compass-row ${x}' . $tick . '}>',
        ];
        foreach ($accepted as $control) {
            $this->assertSame([], self::computed_badge_classnames($control), "the ban rejects {$control}");
        }

        $checked = 0;
        foreach ($this->sources() as $file => $contents) {
            if (!str_ends_with($file, '.tsx') && !str_ends_with($file, '.ts')) {
                continue;
            }
            $checked++;
            $this->assertSame(
                [],
                self::computed_badge_classnames($contents),
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
