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
 * The calendar strip's colour pairs, read and computed from the stylesheet.
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
 * A filled background and its text are one pair (styles.css, the calendar's tokens).
 *
 * The defect this file holds: a fill whose text colour a later or equally specific colour-only rule
 * replaces. Today's ink chip at zero took the muted colour of zero (1.19:1), and today's ink disc took
 * the hover's soft fill under its ink-coloured number (1.05:1). Axe saw neither, because no scenario
 * reaches those states, and a contrast sweep sees only the states it renders. So the rules are read:
 *
 * - every colour-only rule that can reach a filled element either carries a :not() guard for the fill
 *   or loses to the filled rule on specificity, then order (a concrete list of pairs);
 * - every filled rule declares its paired foreground;
 * - the dim of the lighting never fades with opacity, and swaps its fills and text instead;
 * - every declared (foreground, background) pair is computed, in light and dark mode and for two
 *   brands, from the stylesheet's own tokens: 4.5:1 for text, 3:1 for marks.
 *
 * Each rule carries a vacuity guard: every selector a pair names must be found in the stylesheet,
 * and the matrix counts the pairs it computed.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversNothing]
final class contrast_rules_test extends basic_testcase {
    /** @var string The colour-mode attribute that selects the dark override (accessibility_rules_test says why). */
    private const DARK_ATTRIBUTE = '[data-bs-theme="dark"]';

    /** @var string The ink disc of today's day. */
    private const TODAY_DISC = '.block_compass .compass-cal-disc.compass-cal-today';

    /** @var string The ink chip of today's period on the closed line. */
    private const TODAY_CHIP = '.block_compass .compass-cal-period-today .compass-cal-pchip';

    /** @var string[] The filter line's filled rules (ADR-015), each declaring its paired text. */
    private const LINE_FILLS = [
        '.block_compass .compass-scope', '.block_compass .compass-scope-cell',
        '.block_compass .compass-scope-cell[aria-checked="true"]', '.block_compass .compass-scope-count',
        '.block_compass .compass-scope-cell[aria-checked="true"] .compass-scope-count',
        '.block_compass .compass-search .compass-search-input', '.block_compass .compass-search-eraser:hover',
        '.block_compass .compass-line-iconbtn', '.block_compass .compass-line-iconbtn:hover',
        '.block_compass .compass-line-iconbtn[aria-expanded="true"]', '.block_compass .compass-line-star[aria-pressed="true"]',
        '.block_compass .compass-filterbtn', '.block_compass .compass-filterbtn:hover',
        '.block_compass .compass-filterbtn[aria-expanded="true"]', '.block_compass .compass-filtercount',
        '.block_compass .compass-line-layer', '.block_compass .compass-line-option:hover', '.block_compass .compass-line-mark',
        '.block_compass .compass-line-chip',
    ];

    /**
     * @var string[] The open-courses line's filled rules (ADR-017 decision 7), each declaring its paired text: the
     *     icon's tile and the count chip (a tint of the primary), a group, "+N", the × hovered, the popover, its
     *     rows at rest and hovered, and a tile of tier 1's empty state.
     */
    private const NEWS_FILLS = [
        '.block_compass .compass-news-icon', '.block_compass .compass-news-count', '.block_compass .compass-news-group',
        '.block_compass .compass-news-more', '.block_compass .compass-news-hide:hover', '.block_compass .compass-news-pop',
        '.block_compass .compass-news-poprow', '.block_compass .compass-news-poprow:hover', '.block_compass .compass-news-tile',
    ];

    /** @var string The scope of a dimmed column of the open row. */
    private const COL_DIM = '.block_compass .compass-cal-col.compass-cal-col-dim';

    /** @var string The scope of a dimmed period of the closed line. */
    private const PERIOD_DIM = '.block_compass .compass-cal-period.compass-cal-period-dim';

    /** @var string An empty day's disc under the pointer. */
    private const HOVER_EMPTY = '.block_compass .compass-cal-day:hover .compass-cal-disc.compass-cal-heat-0'
        . ':not(.compass-cal-off):not(.compass-cal-today)';

    /** @var string A past empty day's pale disc. */
    private const PAST_EMPTY = '.block_compass .compass-cal-disc.compass-cal-past.compass-cal-heat-0'
        . ':not(.compass-cal-off):not(.compass-cal-today)';

    /** @var string A period's count at zero. */
    private const ZERO_CHIP = '.block_compass .compass-cal-period-zero:not(.compass-cal-period-today)'
        . ' .compass-cal-pchip.compass-cal-heat-0';

    /** @var string Late work's count. */
    private const LATE_CHIP = '.block_compass .compass-cal-period-past:not(.compass-cal-period-today)'
        . ' .compass-cal-pchip.compass-cal-heat-0';

    /** @var string An empty day off under the pointer. */
    private const OFF_HOVER = '.block_compass .compass-cal .compass-cal-day:hover .compass-cal-disc.compass-cal-off'
        . ':not(.compass-cal-today)';

    /** @var string A past day's number in the pulse style. */
    private const PULSE_PAST = '.block_compass .compass-cal-style-pulse .compass-cal-disc.compass-cal-past:not(.compass-cal-today)';

    /**
     * Boost's own values of the theme tokens the stylesheet reads, as Moodle 5.2's Boost serves them.
     *
     * Measured with getComputedStyle on the block in each mode (m502b, 2026-10-15); the contrast
     * audit used the same. The secondary background, which the filter line's scope track reads
     * (ADR-015), is Boost's gray-200 and its dark gray-800 (theme/boost/scss/bootstrap/_variables.scss
     * :442, _variables-dark.scss:46, the design system's primitives). Two brands: Boost's blue and an institution's navy (#070093).
     * A --bs-* token not listed here takes the literal fallback the stylesheet writes beside it.
     *
     * @return array Mode name => token name => CSS value.
     */
    private static function themes(): array {
        $light = [
            '--bs-body-bg' => '#ffffff',
            '--bs-body-color' => '#1d2125',
            '--bs-emphasis-color' => '#000000',
            '--bs-secondary-color' => 'rgba(29, 33, 37, 0.75)',
            '--bs-tertiary-bg' => '#f8f9fa',
            '--bs-secondary-bg' => '#e9ecef',
            '--bs-border-color' => '#dee2e6',
            '--bs-warning' => '#f0ad4e',
            '--bs-danger' => '#ca3120',
            '--bs-danger-text-emphasis' => '#51140d',
            '--bs-dark' => '#1d2125',
            '--bs-gray-600' => '#6a737b',
            '--bs-white' => '#ffffff',
        ];
        $dark = [
            '--bs-body-bg' => '#1d2125',
            '--bs-body-color' => '#dee2e6',
            '--bs-emphasis-color' => '#ffffff',
            '--bs-secondary-color' => 'rgba(222, 226, 230, 0.75)',
            '--bs-tertiary-bg' => '#292e33',
            '--bs-secondary-bg' => '#343a40',
            '--bs-border-color' => '#495057',
            '--bs-warning' => '#f0ad4e',
            '--bs-danger' => '#ca3120',
            '--bs-danger-text-emphasis' => '#df8379',
            '--bs-dark' => '#1d2125',
            '--bs-gray-600' => '#6a737b',
            '--bs-white' => '#ffffff',
        ];

        return [
            'light, Boost blue' => ['dark' => false, 'tokens' => $light + ['--bs-primary' => '#0f6cbf']],
            'light, navy' => ['dark' => false, 'tokens' => $light + ['--bs-primary' => '#070093']],
            'dark, Boost blue' => ['dark' => true, 'tokens' => $dark + ['--bs-primary' => '#0f6cbf']],
            'dark, navy' => ['dark' => true, 'tokens' => $dark + ['--bs-primary' => '#070093']],
        ];
    }

    /**
     * The stylesheet's rule blocks, comments removed, in source order.
     *
     * An @media block is not parsed as such: the rules inside it are returned on their own, in place.
     *
     * @return array A list of [selector list, declaration body].
     */
    private function rules(): array {
        global $CFG;
        $css = preg_replace('#/\*.*?\*/#s', '', file_get_contents($CFG->dirroot . '/blocks/compass/styles.css'));
        preg_match_all('/([^{}]+)\{([^{}]*)\}/s', $css, $matches, PREG_SET_ORDER);
        $rules = [];
        foreach ($matches as $match) {
            $rules[] = [trim($match[1]), $match[2]];
        }

        return $rules;
    }

    /**
     * Splits a string on a separator at parenthesis depth zero.
     *
     * @param string $text The text.
     * @param string $separator One character.
     * @return array The trimmed parts.
     */
    private static function split_top(string $text, string $separator): array {
        $parts = [];
        $depth = 0;
        $current = '';
        foreach (str_split($text) as $char) {
            if ($char === '(') {
                $depth++;
            } else if ($char === ')') {
                $depth--;
            }
            if ($char === $separator && $depth === 0) {
                $parts[] = trim($current);
                $current = '';
                continue;
            }
            $current .= $char;
        }
        $parts[] = trim($current);

        return array_values(array_filter($parts, static fn(string $part): bool => $part !== ''));
    }

    /**
     * Every selector of the stylesheet with its rule's position and declarations.
     *
     * A selector written in more than one rule keeps every occurrence, in order.
     *
     * @return array Normalised selector => list of [rule index, declarations (property => value)].
     */
    private function selectors(): array {
        $out = [];
        foreach ($this->rules() as $index => [$list, $body]) {
            $declarations = [];
            foreach (self::split_top($body, ';') as $declaration) {
                $colon = strpos($declaration, ':');
                if ($colon === false) {
                    continue;
                }
                $value = preg_replace('/\s+/', ' ', trim(substr($declaration, $colon + 1)));
                $declarations[trim(substr($declaration, 0, $colon))] = $value;
            }
            foreach (self::split_top($list, ',') as $selector) {
                $out[preg_replace('/\s+/', ' ', $selector)][] = [$index, $declarations];
            }
        }

        return $out;
    }

    /**
     * One selector's rule: its position and its declarations, merged over its occurrences.
     *
     * @param array $selectors From selectors().
     * @param string $selector The selector, as written.
     * @param string|null $property When given, the last occurrence declaring it decides the position.
     * @return array [rule index, declarations].
     */
    private function rule(array $selectors, string $selector, ?string $property = null): array {
        $this->assertArrayHasKey($selector, $selectors, "the stylesheet no longer has the rule {$selector}");
        $index = -1;
        $declarations = [];
        foreach ($selectors[$selector] as [$at, $body]) {
            $declarations = $body + $declarations;
            if ($property === null || array_key_exists($property, $body)) {
                $index = $at;
            }
        }

        return [$index, $declarations];
    }

    /**
     * A selector's specificity as (ids, classes, types), :not() counting its argument.
     *
     * @param string $selector One complex selector.
     * @return array Three integers.
     */
    private static function specificity(string $selector): array {
        $total = [0, 0, 0];
        while (($start = strpos($selector, ':not(')) !== false) {
            $depth = 0;
            $end = $start + 4;
            for ($i = $start + 4; $i < strlen($selector); $i++) {
                if ($selector[$i] === '(') {
                    $depth++;
                } else if ($selector[$i] === ')') {
                    $depth--;
                    if ($depth === 0) {
                        $end = $i;
                        break;
                    }
                }
            }
            $best = [0, 0, 0];
            foreach (self::split_top(substr($selector, $start + 5, $end - $start - 5), ',') as $argument) {
                $best = max($best, self::specificity($argument));
            }
            $total = [$total[0] + $best[0], $total[1] + $best[1], $total[2] + $best[2]];
            $selector = substr($selector, 0, $start) . ' ' . substr($selector, $end + 1);
        }
        $attributes = preg_match_all('/\[[^\]]*\]/', $selector);
        $selector = preg_replace('/\[[^\]]*\]/', ' ', $selector);
        $elements = preg_match_all('/::[\w-]+/', $selector);
        $selector = preg_replace('/::[\w-]+/', ' ', $selector);
        $total[0] += preg_match_all('/#[\w-]+/', $selector);
        $total[1] += $attributes + preg_match_all('/\.[\w-]+/', $selector) + preg_match_all('/:[\w-]+/', $selector);
        $total[2] += $elements + preg_match_all('/(?:^|[\s>+~])[a-z][\w-]*/i', $selector);

        return $total;
    }

    /**
     * Whether a rule beats another for one property: higher specificity, or equal and later.
     *
     * @param array $selectors From selectors().
     * @param string $winner The selector that must win.
     * @param string $loser The selector that must lose.
     * @param string $property The property both declare.
     * @return bool True when the winner's declaration applies.
     */
    private function outweighs(array $selectors, string $winner, string $loser, string $property): bool {
        [$windex] = $this->rule($selectors, $winner, $property);
        [$lindex] = $this->rule($selectors, $loser, $property);
        $wspec = self::specificity($winner);
        $lspec = self::specificity($loser);

        return $wspec > $lspec || ($wspec === $lspec && $windex > $lindex);
    }

    /**
     * Every colour-only rule that can reach a filled element is guarded against its fill, or loses.
     *
     * The concrete pairs: [the filled rule, a rule that can match the same element and sets its colour
     * or its fill, the guard it must carry, or null when the filled rule must outweigh it]. The first
     * group is the defect class: zero's muted, late's danger, the hover's soft fill, a past day's or a
     * day off's colours over today's ink. The second keeps the filled rules winning where no guard is
     * written: a heat step under today's ink, the pulse style's plain disc before today's, the hover
     * over a past day's soft disc, a selected or inked variant over its base.
     *
     * Changes that must make it fail: a guard dropped from the zero, late, hover, past or day-off rules;
     * the pulse rule moved after today's; the pchip's base rule given a colour again; a filled rule's
     * colour deleted.
     *
     * @return void
     */
    public function test_a_colour_only_rule_never_reaches_a_filled_pair(): void {
        $selectors = $this->selectors();
        // The colour-only rule is named without its :not() parts, so a dropped guard is found and failed
        // on, not lost as a missing rule.
        $guarded = [
            [self::TODAY_CHIP, '.block_compass .compass-cal-period-zero .compass-cal-pchip.compass-cal-heat-0',
                ':not(.compass-cal-period-today)'],
            [self::TODAY_CHIP, '.block_compass .compass-cal-period-past .compass-cal-pchip.compass-cal-heat-0',
                ':not(.compass-cal-period-today)'],
            [self::TODAY_DISC, '.block_compass .compass-cal-day:hover .compass-cal-disc.compass-cal-heat-0',
                ':not(.compass-cal-today)'],
            [self::TODAY_DISC, '.block_compass .compass-cal-disc.compass-cal-past.compass-cal-heat-0', ':not(.compass-cal-today)'],
            [self::TODAY_DISC, '.block_compass .compass-cal-disc.compass-cal-past.compass-cal-heat-1', ':not(.compass-cal-today)'],
            [self::TODAY_DISC, '.block_compass .compass-cal-disc.compass-cal-past.compass-cal-heat-2', ':not(.compass-cal-today)'],
            [self::TODAY_DISC, '.block_compass .compass-cal-style-pulse .compass-cal-disc.compass-cal-past',
                ':not(.compass-cal-today)'],
            [self::TODAY_DISC, '.block_compass .compass-cal .compass-cal-disc.compass-cal-off', ':not(.compass-cal-today)'],
            [self::TODAY_DISC, '.block_compass .compass-cal .compass-cal-day:hover .compass-cal-disc.compass-cal-off',
                ':not(.compass-cal-today)'],
            [self::TODAY_DISC, '.block_compass .compass-cal .compass-cal-disc.compass-cal-off.compass-cal-holiday',
                ':not(.compass-cal-today)'],
            [self::TODAY_DISC,
                '.block_compass .compass-cal .compass-cal-day:hover .compass-cal-disc.compass-cal-off.compass-cal-holiday',
                ':not(.compass-cal-today)'],
        ];
        $outweighed = [
            [self::TODAY_DISC, '.block_compass .compass-cal-style-pulse .compass-cal-disc'],
            [self::TODAY_DISC, '.block_compass .compass-cal-disc'],
            ['.block_compass .compass-cal-style-pulse .compass-cal-disc', '.block_compass .compass-cal-heat-4'],
            [self::PULSE_PAST,
                '.block_compass .compass-cal-disc.compass-cal-past.compass-cal-heat-2:not(.compass-cal-today)'],
            [self::HOVER_EMPTY,
                self::PAST_EMPTY],
            ['.block_compass .compass-cal-rel-today', '.block_compass .compass-cal-rel'],
            ['.block_compass .compass-cal-segbtn[aria-pressed="true"]', '.block_compass .compass-cal-segbtn'],
            ['.block_compass .compass-cal-pill-accent', '.block_compass .compass-cal-pill'],
            ['.block_compass .compass-cal-pill-soft', '.block_compass .compass-cal-pill'],
            ['.block_compass .compass-cal-pill-late', '.block_compass .compass-cal-pill'],
            ['.block_compass .compass-cal-todaybtn[aria-disabled="true"]', '.block_compass .compass-cal-todaybtn:hover'],
            ['.block_compass .compass-cal-edge[aria-disabled="true"]', '.block_compass .compass-cal-edge:hover'],
            // The amber pill is a countdown too: its pair wins over the plain countdown's muted text.
            ['.block_compass .compass-soon-pill', '.block_compass .compass-soon-rel'],
        ];
        foreach ([1, 2, 3, 4] as $step) {
            $outweighed[] = [self::TODAY_DISC, ".block_compass .compass-cal-heat-{$step}"];
            $outweighed[] = [self::TODAY_CHIP, ".block_compass .compass-cal-heat-{$step}"];
        }

        foreach ($guarded as [$filled, $core, $guard]) {
            [, $fill] = $this->rule($selectors, $filled);
            $this->assertArrayHasKey('color', $fill, "{$filled} fills a background without its paired foreground");
            $found = 0;
            foreach ($selectors as $other => $occurrences) {
                if (preg_replace('/:not\([^()]*\)/', '', $other) !== $core) {
                    continue;
                }
                [, $body] = $this->rule($selectors, $other);
                if (!isset($body['color']) && !isset($body['background'])) {
                    continue;
                }
                $found++;
                $this->assertStringContainsString($guard, $other, "{$other} can reach {$filled} without the guard {$guard}");
            }
            $this->assertGreaterThanOrEqual(1, $found, "no rule {$core} sets a colour or a fill: is the pair still the one meant?");
        }
        foreach ($outweighed as [$filled, $other]) {
            [, $fill] = $this->rule($selectors, $filled);
            [, $body] = $this->rule($selectors, $other);
            $this->assertArrayHasKey('color', $fill, "{$filled} fills a background without its paired foreground");
            foreach (['color', 'background'] as $property) {
                if (isset($body[$property]) && isset($fill[$property])) {
                    $this->assertTrue(
                        $this->outweighs($selectors, $filled, $other, $property),
                        "{$other} outweighs {$filled} for {$property}"
                    );
                }
            }
        }

        // A chip's base rule sets no colour: written after the heat steps at their specificity, it would
        // replace every step's paired numeral (the dark one on the two strongest).
        [, $chip] = $this->rule($selectors, '.block_compass .compass-cal-pchip');
        $this->assertArrayNotHasKey('color', $chip, 'the chip\'s base rule outweighs the heat steps\' numerals');
        $this->assertGreaterThanOrEqual(28, count($guarded) + count($outweighed), 'fewer pairs than written: has the list shrunk?');
    }

    /**
     * Every filled rule of the calendar declares its paired foreground.
     *
     * Changes that must make it fail: a fill's colour declaration deleted (a heat step, today's ink
     * disc or chip, a hover, the pulse disc).
     *
     * @return void
     */
    public function test_every_filled_rule_declares_its_foreground(): void {
        $selectors = $this->selectors();
        $filled = [
            self::TODAY_DISC, self::TODAY_CHIP,
            '.block_compass .compass-cal-heat-1', '.block_compass .compass-cal-heat-2',
            '.block_compass .compass-cal-heat-3', '.block_compass .compass-cal-heat-4',
            '.block_compass .compass-cal-style-pulse .compass-cal-disc',
            self::HOVER_EMPTY,
            self::PAST_EMPTY,
            '.block_compass .compass-cal .compass-cal-disc.compass-cal-off:not(.compass-cal-today)',
            '.block_compass .compass-cal-rel', '.block_compass .compass-cal-rel-today', '.block_compass .compass-cal-tip',
            '.block_compass .compass-cal-segbtn[aria-pressed="true"]', '.block_compass .compass-cal-chip',
            '.block_compass .compass-cal-pill', '.block_compass .compass-cal-pill-accent', '.block_compass .compass-cal-pill-soft',
            '.block_compass .compass-cal-pill-late', '.block_compass .compass-cal-todaybtn',
            '.block_compass .compass-cal-todaybtn:hover',
            '.block_compass .compass-cal-edge', '.block_compass .compass-cal-edge:hover', '.block_compass .compass-cal-link',
            '.block_compass .compass-cal-link:hover', '.block_compass .compass-cal-toggle:hover',
            '.block_compass .compass-cal-period:hover',
            '.block_compass .compass-cal-item:hover', '.block_compass .compass-cal-close:hover', '.block_compass .compass-cal-card',
            // Up next (ADR-016): the region, the imminent countdown's amber pill and the hide button hovered.
            '.block_compass .compass-soon', '.block_compass .compass-soon-pill', '.block_compass .compass-soon-hide:hover',
        ];
        // The filter line's fills (ADR-015): the scope's track, cells and counts, the search, the icon
        // buttons, Filters and its badge, the floating layers, a hovered option, the mark and a chip.
        $filled = array_merge($filled, self::LINE_FILLS, self::NEWS_FILLS);
        foreach ($filled as $selector) {
            [, $body] = $this->rule($selectors, $selector);
            $this->assertArrayHasKey('background', $body, "{$selector} no longer fills: is it still a pair?");
            $this->assertArrayHasKey('color', $body, "{$selector} fills a background without its paired foreground");
        }
    }

    /**
     * The lighting's dim lowers the fills and keeps the text: no opacity, a remap of the pairs instead.
     *
     * Opacity on a dimmed column (0.26) or period (0.3) faded the number with its fill, to 1.5:1. The
     * dim scopes swap the fill tokens and the text tokens for their quieter pairs, which the matrix
     * computes; no rule on the strip's text-bearing elements fades them. A disabled arrow or Today
     * recedes by its colours too.
     *
     * Changes that must make it fail: opacity back on a dimmed column or period, or on a day, a disc, a
     * number, a weekday, a chip or a period label; a dim scope that no longer swaps a fill or the text;
     * a disabled control faded with opacity again.
     *
     * @return void
     */
    public function test_the_dim_lowers_the_fills_and_never_fades_the_text(): void {
        $selectors = $this->selectors();
        $textbearing = [
            'compass-cal-col', 'compass-cal-col-dim', 'compass-cal-period', 'compass-cal-period-dim', 'compass-cal-day',
            'compass-cal-disc', 'compass-cal-num', 'compass-cal-wd', 'compass-cal-pchip', 'compass-cal-plabel',
            'compass-cal-todaybtn', 'compass-cal-edge', 'compass-row', 'compass-rowcard', 'compass-preview-lit',
            'compass-preview-dim',
        ];
        $read = 0;
        foreach ($selectors as $selector => $occurrences) {
            $compounds = preg_split('/[\s>+~]+/', trim($selector));
            $last = end($compounds);
            $last = preg_replace('/:not\([^)]*\)/', '', $last);
            preg_match_all('/\.([\w-]+)/', $last, $classes);
            if (!array_intersect($classes[1], $textbearing)) {
                continue;
            }
            $read++;
            foreach ($occurrences as [, $body]) {
                if (isset($body['opacity'])) {
                    $this->assertGreaterThanOrEqual(1.0, (float) $body['opacity'], "{$selector} fades its text with opacity");
                }
            }
        }
        $this->assertGreaterThanOrEqual(20, $read, 'fewer than 20 text-bearing rules read: has the stylesheet moved?');

        foreach ([self::COL_DIM, self::PERIOD_DIM] as $scope) {
            [, $body] = $this->rule($selectors, $scope);
            foreach (['heat-1', 'heat-2', 'heat-3', 'heat-4', 'ink'] as $fill) {
                $this->assertSame(
                    "var(--block_compass-cal-{$fill}-dim)",
                    $body["--block_compass-cal-{$fill}"] ?? null,
                    "{$scope} does not lower the {$fill} fill"
                );
            }
            $this->assertSame(
                'var(--block_compass-cal-fg-dim)',
                $body['--block_compass-cal-text'] ?? null,
                "{$scope} keeps the text"
            );
            $this->assertSame(
                'var(--block_compass-cal-fg-on-ink-dim)',
                $body['--block_compass-cal-fg-on-ink'] ?? null,
                "{$scope} leaves today's number on the ink's colour over a pale disc"
            );
        }

        [, $disabled] = $this->rule($selectors, '.block_compass .compass-cal-todaybtn[aria-disabled="true"]');
        $this->assertArrayNotHasKey('opacity', $disabled, 'a disabled control fades its text with opacity');
        $this->assertSame(
            'var(--block_compass-cal-muted-on-surface)',
            $disabled['color'] ?? null,
            'a disabled control keeps its text'
        );
    }

    /**
     * Every declared pair reads: 4.5:1 for text and 3:1 for marks, light and dark, both brands.
     *
     * The method. The stylesheet's token declarations are read as written: the block's root rules, the
     * dark override over them, and a dim scope's declarations over those. A token is evaluated where it is
     * declared, as the browser does for an inherited custom property: var() looks the name up in that
     * scope and outwards, a theme token (--bs-*) takes Boost 5.2's measured value (themes()), else the
     * literal fallback written beside it; color-mix() mixes premultiplied in OKLab (or sRGB, as written),
     * percentages as given. A colour with alpha is composited in sRGB over its background, a background
     * with alpha over the surface (or the fill named under it). The ratio is WCAG 2's relative luminance.
     * The pairs are each filled rule's own background and colour, read from the rule, or a colour-only
     * rule over the fill it names; every pair is computed in each scope it can be painted in.
     *
     * Changes that must make it fail: a past day's numeral back on the theme's muted over the second heat
     * step in dark mode (4.14:1); a dim fill or the dim text that no longer reads; a mark drained below
     * 3:1.
     *
     * @return void
     */
    public function test_every_declared_pair_reads_in_light_and_dark(): void {
        $selectors = $this->selectors();
        $root = [];
        $darkoverride = [];
        foreach ($this->rules() as [$selector, $body]) {
            if ($selector === '.block_compass') {
                $root = self::custom_properties($body) + $root;
            } else if (str_contains($selector, self::DARK_ATTRIBUTE) && str_contains($body, '--block_compass-brand-text:')) {
                $darkoverride = self::custom_properties($body) + $darkoverride;
            }
        }
        $this->assertArrayHasKey('--block_compass-cal-heat-4-dim', $root, 'the calendar\'s tokens were not read');
        $this->assertArrayHasKey('--block_compass-cal-heat-3', $darkoverride, 'the dark override was not read');
        [, $coldim] = $this->rule($selectors, self::COL_DIM);
        [, $perioddim] = $this->rule($selectors, self::PERIOD_DIM);
        $scopes = [
            'root' => [],
            'dimmed column' => self::custom_properties_of($coldim),
            'dimmed period' => self::custom_properties_of($perioddim),
        ];

        $surface = 'var(--block_compass-surface)';
        $soft = 'var(--block_compass-cal-soft)';
        $col = ['root', 'dimmed column'];
        $line = ['root', 'dimmed period'];
        $all = ['root', 'dimmed column', 'dimmed period'];
        // Each pair: [what it is, foreground rule or token, background rule or token, scopes]; a rule's
        // colour and background are read from the stylesheet, a token is evaluated as written.
        $pairs = [];
        foreach ([1, 2, 3, 4] as $step) {
            $heat = ".block_compass .compass-cal-heat-{$step}";
            $pairs[] = ["heat {$step} numeral", $heat, $heat, $all];
        }
        $pulse = '.block_compass .compass-cal-style-pulse .compass-cal-disc';
        $pairs = array_merge($pairs, [
            ['today\'s disc', self::TODAY_DISC, self::TODAY_DISC, $col],
            ['today\'s chip', self::TODAY_CHIP, self::TODAY_CHIP, $line],
            ['a day\'s number', '.block_compass .compass-cal-day', $surface, $col],
            ['a past empty day', self::PAST_EMPTY, self::PAST_EMPTY, $col],
            ['past on heat 1', '.block_compass .compass-cal-disc.compass-cal-past.compass-cal-heat-1:not(.compass-cal-today)',
                '.block_compass .compass-cal-heat-1', $col],
            ['past on heat 2', '.block_compass .compass-cal-disc.compass-cal-past.compass-cal-heat-2:not(.compass-cal-today)',
                '.block_compass .compass-cal-heat-2', $col],
            ['an empty day hovered', self::HOVER_EMPTY, self::HOVER_EMPTY, $col],
            ['a day off', '.block_compass .compass-cal .compass-cal-disc.compass-cal-off:not(.compass-cal-today)', $surface, $col],
            ['a day off hovered', self::OFF_HOVER,
                $soft, $col],
            ['a pulse disc', $pulse, $surface, $col],
            ['a past pulse disc', self::PULSE_PAST,
                $surface, $col],
            ['a weekday', '.block_compass .compass-cal-wd', $surface, $col],
            ['today\'s weekday', '.block_compass .compass-cal-col-today .compass-cal-wd', $surface, $col],
            ['a period', '.block_compass .compass-cal-period', $surface, $line],
            ['a period hovered', '.block_compass .compass-cal-period:hover', '.block_compass .compass-cal-period:hover', $line],
            ['a period label', '.block_compass .compass-cal-plabel', $surface, $line],
            ['today\'s period label', '.block_compass .compass-cal-period-today .compass-cal-plabel', $surface, $line],
            ['zero', self::ZERO_CHIP,
                $surface, $line],
            ['zero hovered', self::ZERO_CHIP,
                $soft, $line],
            ['late', self::LATE_CHIP,
                $surface, $line],
            ['late hovered', self::LATE_CHIP,
                $soft, $line],
            ['the tooltip', '.block_compass .compass-cal-tip', '.block_compass .compass-cal-tip', ['root']],
            ['a switch view', '.block_compass .compass-cal-segbtn', '.block_compass .compass-cal-seg', ['root']],
            ['the selected view', '.block_compass .compass-cal-segbtn[aria-pressed="true"]',
                '.block_compass .compass-cal-segbtn[aria-pressed="true"]', ['root']],
            ['a day chip', '.block_compass .compass-cal-rel', '.block_compass .compass-cal-rel', ['root']],
            ['today\'s day chip', '.block_compass .compass-cal-rel-today', '.block_compass .compass-cal-rel-today', ['root']],
            ['a course chip', '.block_compass .compass-cal-chip', '.block_compass .compass-cal-chip', ['root']],
            ['a pill', '.block_compass .compass-cal-pill', '.block_compass .compass-cal-pill', ['root']],
            ['an accent pill', '.block_compass .compass-cal-pill-accent', '.block_compass .compass-cal-pill-accent', ['root']],
            ['a soft pill', '.block_compass .compass-cal-pill-soft', '.block_compass .compass-cal-pill-soft', ['root']],
            ['a late pill', '.block_compass .compass-cal-pill-late', '.block_compass .compass-cal-pill-late', ['root']],
            ['Today', '.block_compass .compass-cal-todaybtn', '.block_compass .compass-cal-todaybtn', ['root']],
            ['Today hovered', '.block_compass .compass-cal-todaybtn:hover', '.block_compass .compass-cal-todaybtn:hover', ['root']],
            ['Today disabled', '.block_compass .compass-cal-todaybtn[aria-disabled="true"]', '.block_compass .compass-cal-todaybtn',
                ['root']],
            ['an arrow disabled', '.block_compass .compass-cal-edge[aria-disabled="true"]',
                '.block_compass .compass-cal-edge[aria-disabled="true"]', ['root']],
            ['the calendar link hovered', '.block_compass .compass-cal-link:hover', '.block_compass .compass-cal-link:hover',
                ['root']],
            ['the toggle hovered', '.block_compass .compass-cal-toggle:hover', '.block_compass .compass-cal-toggle:hover',
                ['root']],
            ['an item hovered', '.block_compass .compass-cal-item:hover', '.block_compass .compass-cal-item:hover', ['root']],
            ['the day card', '.block_compass .compass-cal-card', '.block_compass .compass-cal-card', ['root']],
            // Up next (ADR-016 decision 6): its texts over the region's surface, the amber pill's own pair.
            ['Up next', '.block_compass .compass-soon', '.block_compass .compass-soon', ['root']],
            ['Up next\'s horizon', '.block_compass .compass-soon-sub', '.block_compass .compass-soon', ['root']],
            ['a row\'s time', '.block_compass .compass-soon-time', '.block_compass .compass-soon', ['root']],
            ['a countdown', '.block_compass .compass-soon-rel', '.block_compass .compass-soon', ['root']],
            ['the imminent countdown', '.block_compass .compass-soon-pill', '.block_compass .compass-soon-pill', ['root']],
            ['the countdown on now', '.block_compass .compass-soon-rel-now', '.block_compass .compass-soon', ['root']],
            ['a row\'s name', '.block_compass .compass-soon-name', '.block_compass .compass-soon', ['root']],
            ['a row\'s course', '.block_compass .compass-soon-meta', '.block_compass .compass-soon', ['root']],
            ['the further items', '.block_compass .compass-soon-more', '.block_compass .compass-soon', ['root']],
            ['the quiet line', '.block_compass .compass-soon-quiet', $surface, ['root']],
            ['the hide button hovered', '.block_compass .compass-soon-hide:hover', '.block_compass .compass-soon-hide:hover',
                ['root']],
        ]);
        // The filter line (ADR-015): each text over the fill it sits on, the preview's dim included.
        $scopefill = '.block_compass .compass-scope';
        $checked = '.block_compass .compass-scope-cell[aria-checked="true"]';
        $input = '.block_compass .compass-search .compass-search-input';
        $hover = '.block_compass .compass-line-option:hover';
        $pairs = array_merge($pairs, [
            ['a scope cell', '.block_compass .compass-scope-cell', $scopefill, ['root']],
            ['the checked scope cell', $checked, $checked, ['root']],
            ['a scope count', '.block_compass .compass-scope-count', '.block_compass .compass-scope-count', ['root']],
            ['the checked cell\'s count', "{$checked} .compass-scope-count", "{$checked} .compass-scope-count", ['root']],
            ['the search', $input, $input, ['root']],
            ['the search\'s placeholder', "{$input}::placeholder", $input, ['root']],
            ['the eraser hovered', '.block_compass .compass-search-eraser:hover', '.block_compass .compass-search-eraser:hover',
                ['root']],
            ['an icon button', '.block_compass .compass-line-iconbtn', '.block_compass .compass-line-iconbtn', ['root']],
            ['an icon button hovered', '.block_compass .compass-line-iconbtn:hover', '.block_compass .compass-line-iconbtn:hover',
                ['root']],
            ['an open icon button', '.block_compass .compass-line-iconbtn[aria-expanded="true"]',
                '.block_compass .compass-line-iconbtn[aria-expanded="true"]', ['root']],
            ['the pressed star', '.block_compass .compass-line-star[aria-pressed="true"]',
                '.block_compass .compass-line-star[aria-pressed="true"]', ['root']],
            ['Filters', '.block_compass .compass-filterbtn', '.block_compass .compass-filterbtn', ['root']],
            ['Filters hovered', '.block_compass .compass-filterbtn:hover', '.block_compass .compass-filterbtn:hover', ['root']],
            ['Filters open', '.block_compass .compass-filterbtn[aria-expanded="true"]',
                '.block_compass .compass-filterbtn[aria-expanded="true"]', ['root']],
            ['the Filters badge', '.block_compass .compass-filtercount', '.block_compass .compass-filtercount', ['root']],
            ['a floating layer', '.block_compass .compass-line-layer', '.block_compass .compass-line-layer', ['root']],
            ['a menu label', '.block_compass .compass-line-menulabel', '.block_compass .compass-line-layer', ['root']],
            ['a suggestion heading', '.block_compass .compass-line-suggesthead', '.block_compass .compass-line-layer', ['root']],
            ['a suggestion hovered', $hover, $hover, ['root']],
            ['a suggestion\'s group', '.block_compass .compass-line-optiongroup', $hover, ['root']],
            ['a suggestion\'s count', '.block_compass .compass-line-optioncount', $hover, ['root']],
            ['the typed text marked', '.block_compass .compass-line-mark', '.block_compass .compass-line-mark', ['root']],
            ['a chip', '.block_compass .compass-line-chip', '.block_compass .compass-line-chip', ['root']],
            ['Clear all', '.block_compass .compass-line-clearall', $surface, ['root']],
            ['a dimmed row', '.block_compass .compass-row.compass-preview-dim', $surface, ['root']],
            ['a dimmed card', '.block_compass .compass-rowcard.compass-preview-dim', $surface, ['root']],
        ]);
        // The open-courses line (ADR-017): its texts over the surface, the primary's tint and its ink one
        // pair (the count chip and the icon's tile), the popover's rows at rest and hovered, a tile.
        $pop = '.block_compass .compass-news-pop';
        $row = '.block_compass .compass-news-poprow';
        $tile = '.block_compass .compass-news-tile';
        $pairs = array_merge($pairs, [
            ['the line\'s title', '.block_compass .compass-news-title', $surface, ['root']],
            ['the line\'s summary', '.block_compass .compass-news-sum', $surface, ['root']],
            ['the line\'s icon', '.block_compass .compass-news-icon', '.block_compass .compass-news-icon', ['root']],
            ['a group', '.block_compass .compass-news-group', '.block_compass .compass-news-group', ['root']],
            ['a count', '.block_compass .compass-news-count', '.block_compass .compass-news-count', ['root']],
            ['+N', '.block_compass .compass-news-more', '.block_compass .compass-news-more', ['root']],
            ['the ×', '.block_compass .compass-news-hide', $surface, ['root']],
            ['the × hovered', '.block_compass .compass-news-hide:hover', '.block_compass .compass-news-hide:hover', ['root']],
            ['the compact sentence', '.block_compass .compass-news-sentence', $surface, ['root']],
            ['the popover', $pop, $pop, ['root']],
            ['the popover\'s summary', '.block_compass .compass-news-pophead', $pop, ['root']],
            ['a popover row', $row, $row, ['root']],
            ['a popover row hovered', "{$row}:hover", "{$row}:hover", ['root']],
            ['a popover row\'s course', '.block_compass .compass-news-popsub', $row, ['root']],
            ['a popover row\'s course hovered', '.block_compass .compass-news-popsub', "{$row}:hover", ['root']],
            ['every course open', '.block_compass .compass-news-all', $pop, ['root']],
            ['the empty state\'s lead', '.block_compass .compass-news-emptylead', $surface, ['root']],
            ['a tile', $tile, $tile, ['root']],
            ['a tile\'s course', '.block_compass .compass-news-tilesub', $tile, ['root']],
        ]);
        // Marks, 3:1 against the surface they sit on: the dots, the late diamond, the ring.
        $marks = [
            ['a to-do dot', '.block_compass .compass-cal-dot-todo', $col],
            ['a graded mark', '.block_compass .compass-cal-dot-graded', $col],
            ['a late diamond', 'var(--block_compass-cal-danger)', $col],
            ['the accent', 'var(--block_compass-cal-accent)', $col],
            // Up next's rings on Today: amber at imminent, on the open disc and on the closed chip, dimmed
            // or not; the ink at now is the accent above.
            ['the imminent ring', 'var(--block_compass-cal-soon-ring)', $all],
            ['the dot on now', '.block_compass .compass-soon-dot', ['root']],
        ];

        $computed = 0;
        $failures = [];
        foreach (self::themes() as $mode => $theme) {
            $tokens = $theme['dark'] ? $darkoverride + $root : $root;
            foreach ($pairs as [$what, $fgsource, $bgsource, $where]) {
                foreach ($where as $scope) {
                    $chain = [$scopes[$scope], $tokens, $theme['tokens']];
                    $fg = $this->colour_of($selectors, $fgsource, 'color', $chain);
                    $fill = $this->colour_of($selectors, $bgsource, 'background', $chain);
                    $bg = self::over($fill, self::evaluate($surface, $chain));
                    $ratio = self::ratio(self::over($fg, $bg), $bg);
                    $computed++;
                    if ($ratio < 4.5) {
                        $failures[] = sprintf('%s, %s, %s: %.2f:1', $mode, $scope, $what, $ratio);
                    }
                }
            }
            foreach ($marks as [$what, $source, $where]) {
                foreach ($where as $scope) {
                    $chain = [$scopes[$scope], $tokens, $theme['tokens']];
                    $bg = self::evaluate($surface, $chain);
                    $ratio = self::ratio(self::over($this->colour_of($selectors, $source, 'background', $chain), $bg), $bg);
                    $computed++;
                    if ($ratio < 3.0) {
                        $failures[] = sprintf('%s, %s, %s (a mark): %.2f:1', $mode, $scope, $what, $ratio);
                    }
                }
            }

            // The dim stays visible: each dimmed fill sits nearer the surface than its own step, and the
            // dimmed text is quieter than the body text.
            $rootchain = [[], $tokens, $theme['tokens']];
            $dimchain = [$scopes['dimmed column'], $tokens, $theme['tokens']];
            $base = self::evaluate($surface, $rootchain);
            foreach (['heat-3', 'heat-4', 'ink'] as $fill) {
                $full = self::ratio(self::evaluate("var(--block_compass-cal-{$fill})", $rootchain), $base);
                $dim = self::ratio(self::evaluate("var(--block_compass-cal-{$fill})", $dimchain), $base);
                $this->assertLessThan(1 + ($full - 1) / 2, $dim, "{$mode}: the dimmed {$fill} is hardly lower than its own fill");
            }
            $text = self::ratio(self::evaluate('var(--block_compass-cal-text)', $rootchain), $base);
            $dimtext = self::ratio(self::evaluate('var(--block_compass-cal-text)', $dimchain), $base);
            $this->assertGreaterThan(1.15, $text / $dimtext, "{$mode}: the dimmed text is not quieter than the body text");
            // The preview's dim (ADR-015 decision 6) recedes as visibly as the calendar's.
            $rowtext = self::ratio(self::evaluate('var(--block_compass-x3-text)', $rootchain), $base);
            $rowdim = self::ratio(self::evaluate('var(--block_compass-x3-fg-dim)', $rootchain), $base);
            $this->assertGreaterThan(1.15, $rowtext / $rowdim, "{$mode}: a dimmed row is not quieter than a lit one");
        }
        $this->assertSame([], $failures, "pairs under their floor:\n" . implode("\n", $failures));
        $this->assertGreaterThanOrEqual(300, $computed, 'fewer than 300 pairs computed: has the list shrunk?');
    }

    /**
     * The custom properties of a declaration body.
     *
     * @param string $body A rule's body.
     * @return array Name => value.
     */
    private static function custom_properties(string $body): array {
        $out = [];
        foreach (self::split_top($body, ';') as $declaration) {
            if (preg_match('/^(--[\w-]+)\s*:\s*(.*)$/s', $declaration, $match)) {
                $out[$match[1]] = preg_replace('/\s+/', ' ', trim($match[2]));
            }
        }

        return $out;
    }

    /**
     * The custom properties among a rule's parsed declarations.
     *
     * @param array $declarations Property => value.
     * @return array Name => value.
     */
    private static function custom_properties_of(array $declarations): array {
        return array_filter($declarations, static fn(string $name): bool => str_starts_with($name, '--'), ARRAY_FILTER_USE_KEY);
    }

    /**
     * A colour from a rule's declaration, or from a CSS value written directly.
     *
     * A background with several layers is its last, the colour under the images; a value that is not
     * a colour (a hatch's gradient) is transparent.
     *
     * @param array $selectors From selectors().
     * @param string $source A selector, or a CSS value starting var( or #.
     * @param string $property The property to read from a rule.
     * @param array $chain The token scopes, innermost first.
     * @return array RGBA, each 0 to 1.
     */
    private function colour_of(array $selectors, string $source, string $property, array $chain): array {
        if (str_starts_with($source, 'var(') || str_starts_with($source, '#')) {
            return self::evaluate($source, $chain);
        }
        [, $body] = $this->rule($selectors, $source, $property);
        $this->assertArrayHasKey($property, $body, "{$source} declares no {$property}");
        $layers = self::split_top($body[$property], ',');

        return self::evaluate(end($layers), $chain);
    }

    /**
     * Evaluates a CSS colour value through the token scopes.
     *
     * @param string $value hex, rgb()/rgba(), transparent, var() or color-mix().
     * @param array $chain The token scopes, innermost first; a var() is evaluated in the scope that
     *     declares it and the scopes outside it.
     * @param int $hops How many var() lookups led here; a cycle, invalid in CSS, is not a colour.
     * @return array RGBA, each 0 to 1; [0, 0, 0, 0] for anything that is not a colour.
     */
    private static function evaluate(string $value, array $chain, int $hops = 0): array {
        $value = trim($value);
        if ($hops > 32) {
            return [0, 0, 0, 0];
        }
        if (preg_match('/^var\((--[\w-]+)\s*(?:,(.*))?\)$/s', $value, $match)) {
            foreach ($chain as $depth => $scope) {
                if (array_key_exists($match[1], $scope)) {
                    return self::evaluate($scope[$match[1]], array_slice($chain, $depth), $hops + 1);
                }
            }

            return isset($match[2]) ? self::evaluate($match[2], $chain, $hops + 1) : [0, 0, 0, 0];
        }
        if (preg_match('/^#([0-9a-f]{3}|[0-9a-f]{6})$/i', $value, $match)) {
            $hex = strlen($match[1]) === 3 ? preg_replace('/(.)/', '$1$1', $match[1]) : $match[1];

            return [hexdec(substr($hex, 0, 2)) / 255, hexdec(substr($hex, 2, 2)) / 255, hexdec(substr($hex, 4, 2)) / 255, 1.0];
        }
        if (preg_match('/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/', $value, $match)) {
            return [$match[1] / 255, $match[2] / 255, $match[3] / 255, isset($match[4]) ? (float) $match[4] : 1.0];
        }
        if (preg_match('/^color-mix\((.*)\)$/s', $value, $match)) {
            $arguments = self::split_top($match[1], ',');
            $space = trim(preg_replace('/^in\s+/', '', array_shift($arguments)));
            $parts = [];
            foreach ($arguments as $argument) {
                preg_match('/^(.*?)(?:\s+([\d.]+)%)?$/s', trim($argument), $piece);
                $share = isset($piece[2]) && $piece[2] !== '' ? (float) $piece[2] : null;
                $parts[] = [self::evaluate($piece[1], $chain, $hops + 1), $share];
            }
            [[$a, $pa], [$b, $pb]] = $parts;
            $pa ??= $pb === null ? 50.0 : 100 - $pb;

            return self::mix($a, $b, $pa / 100, $space === 'oklab');
        }

        return [0, 0, 0, 0];
    }

    /**
     * color-mix(): premultiplied interpolation in OKLab or sRGB.
     *
     * @param array $a The first colour, RGBA.
     * @param array $b The second colour, RGBA.
     * @param float $t The first colour's share, 0 to 1.
     * @param bool $oklab True for OKLab, false for sRGB.
     * @return array RGBA.
     */
    private static function mix(array $a, array $b, float $t, bool $oklab): array {
        $alpha = $a[3] * $t + $b[3] * (1 - $t);
        if ($alpha <= 0) {
            return [0, 0, 0, 0];
        }
        $ca = $oklab ? self::to_oklab($a) : $a;
        $cb = $oklab ? self::to_oklab($b) : $b;
        $mixed = [];
        for ($i = 0; $i < 3; $i++) {
            $mixed[$i] = ($ca[$i] * $a[3] * $t + $cb[$i] * $b[3] * (1 - $t)) / $alpha;
        }
        $rgb = $oklab ? self::from_oklab($mixed) : $mixed;

        return [max(0, min(1, $rgb[0])), max(0, min(1, $rgb[1])), max(0, min(1, $rgb[2])), $alpha];
    }

    /**
     * sRGB to OKLab (Björn Ottosson's matrices).
     *
     * @param array $c RGBA.
     * @return array L, a, b.
     */
    private static function to_oklab(array $c): array {
        [$r, $g, $b] = array_map([self::class, 'linear'], array_slice($c, 0, 3));
        $l = (0.4122214708 * $r + 0.5363325363 * $g + 0.0514459929 * $b) ** (1 / 3);
        $m = (0.2119034982 * $r + 0.6806995451 * $g + 0.1073969566 * $b) ** (1 / 3);
        $s = (0.0883024619 * $r + 0.2817188376 * $g + 0.6299787005 * $b) ** (1 / 3);

        return [
            0.2104542553 * $l + 0.7936177850 * $m - 0.0040720468 * $s,
            1.9779984951 * $l - 2.4285922050 * $m + 0.4505937099 * $s,
            0.0259040371 * $l + 0.7827717662 * $m - 0.8086757660 * $s,
        ];
    }

    /**
     * OKLab to sRGB.
     *
     * @param array $o L, a, b.
     * @return array R, G, B, each 0 to 1 before clamping.
     */
    private static function from_oklab(array $o): array {
        [$lightness, $a, $b] = $o;
        $l = ($lightness + 0.3963377774 * $a + 0.2158037573 * $b) ** 3;
        $m = ($lightness - 0.1055613458 * $a - 0.0638541728 * $b) ** 3;
        $s = ($lightness - 0.0894841775 * $a - 1.2914855480 * $b) ** 3;
        $rgb = [
            4.0767416621 * $l - 3.3077115913 * $m + 0.2309699292 * $s,
            -1.2684380046 * $l + 2.6097574011 * $m - 0.3413193965 * $s,
            -0.0041960863 * $l - 0.7034186147 * $m + 1.7076147010 * $s,
        ];

        return array_map(static fn(float $v): float => $v <= 0.0031308 ? 12.92 * $v : 1.055 * ($v ** (1 / 2.4)) - 0.055, $rgb);
    }

    /**
     * An sRGB channel to linear light.
     *
     * @param float $v The channel, 0 to 1.
     * @return float Linear.
     */
    private static function linear(float $v): float {
        return $v <= 0.04045 ? $v / 12.92 : (($v + 0.055) / 1.055) ** 2.4;
    }

    /**
     * Composites a colour over an opaque background, in sRGB as the browser paints.
     *
     * @param array $top RGBA.
     * @param array $under RGBA, opaque.
     * @return array RGBA, opaque.
     */
    private static function over(array $top, array $under): array {
        $a = $top[3];

        return [$top[0] * $a + $under[0] * (1 - $a), $top[1] * $a + $under[1] * (1 - $a), $top[2] * $a + $under[2] * (1 - $a), 1.0];
    }

    /**
     * WCAG 2's contrast ratio of two opaque colours.
     *
     * @param array $a RGBA.
     * @param array $b RGBA.
     * @return float The ratio, 1 to 21.
     */
    private static function ratio(array $a, array $b): float {
        $luminance = static function (array $c): float {
            $channel = static fn(float $v): float => $v <= 0.03928 ? $v / 12.92 : (($v + 0.055) / 1.055) ** 2.4;

            return 0.2126 * $channel($c[0]) + 0.7152 * $channel($c[1]) + 0.0722 * $channel($c[2]);
        };
        $la = $luminance($a);
        $lb = $luminance($b);

        return (max($la, $lb) + 0.05) / (min($la, $lb) + 0.05);
    }
}
