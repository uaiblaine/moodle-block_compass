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
 * The fleet Design System's components outside the filter bar, pinned by reading the sources.
 *
 * The status label, the action button, the calendar's segmented control, the quiet counter and the focus ring
 * (moodle-dev/docs/design-system/components/status-label.md, action-button.md, segmented-control.md, counter.md
 * and tokens.md). The filter bar's own measures are filter_line_rules_test's, the colour pairs
 * contrast_rules_test's and the token chain design_tokens_test's. Each method names the change that must redden
 * it, and mutations/gates.conf makes that change under "The Design System's status labels and buttons".
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversNothing]
final class design_system_rules_test extends basic_testcase {
    /** @var string The class every enrolment state label carries. */
    private const STATE = '.block_compass .compass-state';

    /**
     * @var array Each state label's rule => the edge token it reads, the family of its fill and ink. The hidden
     *     label draws the card's own outline instead (ADR-021 decision 1.8), with its shorthand.
     */
    private const EDGES = [
        '.block_compass .compass-state-scheduled' => 'scheduled-edge',
        '.block_compass .compass-state-pending' => 'awaiting-edge',
        '.block_compass .compass-state-waitlisted' => 'awaiting-edge',
        '.block_compass .compass-state-done' => 'success-edge',
    ];

    /** @var array The edge tokens, suffix => the exact declaration on the block's root. */
    private const EDGE_TOKENS = [
        'scheduled-edge' => 'var(--dimensions-state-scheduled-edge, var(--bs-primary-border-subtle, #9fc4e5))',
        'awaiting-edge' => 'var(--dimensions-state-pending-edge, var(--bs-warning-border-subtle, #f9deb8))',
        'success-edge' => 'var(--dimensions-success-edge, var(--bs-success-border-subtle, #aecaad))',
    ];

    /** @var array The classes of the buttons that are core's now: their look is the theme's. */
    private const CORE_BUTTONS = ['compass-cal-todaybtn', 'compass-news-hide', 'compass-news-see', 'compass-clear', 'compass-show'];

    /**
     * One client source, whole.
     *
     * @param string $name File name under js/esm/src.
     * @return string Its contents.
     */
    private function source(string $name): string {
        $contents = file_get_contents(dirname(__DIR__, 2) . '/js/esm/src/' . $name);
        $this->assertNotFalse($contents, $name);

        return $contents;
    }

    /**
     * The stylesheet's rules, comments removed, in source order; an @media block's rules on their own.
     *
     * @return array A list of [selector list, declaration body], whitespace collapsed in both.
     */
    private function rules(): array {
        $css = preg_replace('#/\*.*?\*/#s', '', (string) file_get_contents(dirname(__DIR__, 2) . '/styles.css'));
        preg_match_all('/([^{}]+)\{([^{}]*)\}/s', $css, $matches, PREG_SET_ORDER);
        $rules = [];
        foreach ($matches as $match) {
            $rules[] = [trim(preg_replace('/\s+/', ' ', $match[1])), trim(preg_replace('/\s+/', ' ', $match[2]))];
        }
        $this->assertGreaterThanOrEqual(300, count($rules), 'fewer than 300 rules read: has the stylesheet moved?');

        return $rules;
    }

    /**
     * The body of the first rule whose selector list is exactly the one given.
     *
     * @param string $selector The selector list, its whitespace collapsed.
     * @return string The declarations.
     */
    private function rule(string $selector): string {
        foreach ($this->rules() as [$list, $body]) {
            if ($list === $selector) {
                return $body;
            }
        }
        $this->fail("the stylesheet has no rule {$selector}");
    }

    /**
     * Every rule a selector of the list belongs to, merged: the bodies of every list that names it.
     *
     * @param string $selector One selector.
     * @return string The declarations of every rule naming it, in source order.
     */
    private function named(string $selector): string {
        $bodies = [];
        foreach ($this->rules() as [$list, $body]) {
            if (in_array($selector, array_map('trim', explode(',', $list)), true)) {
                $bodies[] = $body;
            }
        }
        $this->assertNotEmpty($bodies, "no rule names {$selector}");

        return implode(' ', $bodies);
    }

    /**
     * A state label is the Design System's status label: radius sm, never a pill, a 1 px edge in its own tone.
     *
     * status-label.md: padding 2px 8px, radius sm (6), 0.75rem / 600, line-height 1.4, always a 1 px edge in the
     * tone's edge, and the edge, the ground and the ink from one triple (D6). The edges are tokens of the chain
     * (tokens.md), each reading the same family as the label's fill.
     *
     * Changes that must make it fail: the label's radius back to 999px; its padding back to 3px 10px; a family's
     * edge dropped, or read from another family; an edge token off the chain.
     *
     * @return void
     */
    public function test_a_state_label_is_a_status_label_with_its_own_edge(): void {
        $base = $this->rule(self::STATE);
        $this->assertStringContainsString('padding: 0.125rem 0.5rem;', $base);
        $this->assertStringContainsString('border: 1px solid transparent;', $base);
        $this->assertStringContainsString('border-radius: var(--block_compass-radius-sm);', $base);
        $this->assertStringContainsString('font-size: 0.75rem;', $base);
        $this->assertStringContainsString('font-weight: 600;', $base);
        $this->assertStringContainsString('line-height: 1.4;', $base);

        foreach (self::EDGES as $selector => $edge) {
            $body = $this->named($selector);
            $this->assertMatchesRegularExpression(
                '/(?<![-\w])border-color: var\(--block_compass-' . preg_quote($edge, '/') . '\);/',
                $body,
                "{$selector} draws no edge of its own tone"
            );
            $this->assertMatchesRegularExpression('/(?<![-\w])background: /', $body, "{$selector} fills nothing");
        }
        $this->assertMatchesRegularExpression(
            '/border: var\(--block_compass-card-border-width\) solid var\(--block_compass-card-border\);/',
            $this->named('.block_compass .compass-state-invisible'),
            'the hidden label keeps the card\'s outline as its edge'
        );

        $root = '';
        foreach ($this->rules() as [$list, $body]) {
            if ($list === '.block_compass') {
                $root .= ' ' . $body;
            }
        }
        foreach (self::EDGE_TOKENS as $name => $value) {
            $this->assertStringContainsString("--block_compass-{$name}: {$value};", $root, $name);
        }

        $read = 0;
        foreach ($this->rules() as [$list, $body]) {
            if (!str_contains($list, 'compass-state') || !preg_match('/border-radius:\s*([^;]+);/', $body, $radius)) {
                continue;
            }
            $read++;
            $this->assertDoesNotMatchRegularExpression('/999px|50%|50rem/', $radius[1], "{$list} is a pill");
        }
        $this->assertGreaterThanOrEqual(1, $read, 'vacuity: no radius of a state label was read');
    }

    /**
     * The block's action buttons are core's, with no pill, and no rule of the block restyles them.
     *
     * action-button.md: core's .btn classes as they are, a secondary action btn-outline-secondary, the main one
     * btn-primary, btn-sm in a panel's foot; no rounded-pill; a plugin sets none of their colour, radius,
     * padding or type. Today is outside a card or a panel, so it keeps the default size (the file leaves that
     * size open, and today's button was as tall). The block's own rules for them place them only, with two
     * stated exceptions: Today's disabled state (Bootstrap has no aria-disabled look), and the cross alone of
     * the open-courses panel, an icon button standing alone that keeps its 32 px square.
     *
     * Changes that must make it fail: rounded-pill back on Clear filters or Show; Today, the close or See back
     * on a class of the block's own; a radius, a colour or a background set on one of them again; the dark rule
     * that lights the outline buttons' text reaching a disabled one.
     *
     * @return void
     */
    public function test_the_action_buttons_are_cores_without_a_pill(): void {
        $panel = $this->source('FilterPanel.tsx');
        $this->assertStringContainsString("? 'btn btn-sm btn-outline-secondary compass-clear disabled'", $panel);
        $this->assertStringContainsString(": 'btn btn-sm btn-outline-secondary compass-clear'}", $panel);
        $this->assertStringContainsString('className="btn btn-sm btn-primary compass-show"', $panel);
        $this->assertStringContainsString(
            'className="btn btn-outline-secondary compass-cal-todaybtn"',
            $this->source('CalendarStrip.tsx')
        );
        $news = $this->source('OpenCourses.tsx');
        $this->assertStringContainsString("? 'btn btn-sm btn-outline-secondary compass-news-hide'", $news);
        $this->assertStringContainsString(": 'btn btn-sm btn-outline-secondary compass-news-hide compass-news-hide-icon'}", $news);
        $this->assertStringContainsString('className="btn btn-sm btn-outline-secondary compass-news-see"', $news);

        $sources = glob(dirname(__DIR__, 2) . '/js/esm/src/*.{ts,tsx}', GLOB_BRACE);
        $this->assertGreaterThanOrEqual(30, count($sources), 'the client\'s sources were not found');
        foreach ($sources as $file) {
            $this->assertStringNotContainsString('rounded-pill', (string) file_get_contents($file), basename($file));
        }

        $read = 0;
        $quoted = array_map(static fn(string $class): string => preg_quote($class, '/'), self::CORE_BUTTONS);
        $pattern = '/\.(?:' . implode('|', $quoted) . ')(?![\w-])/';
        foreach ($this->rules() as [$list, $body]) {
            foreach (array_map('trim', explode(',', $list)) as $selector) {
                $compounds = preg_split('/\s+/', $selector);
                if (!preg_match($pattern, (string) end($compounds))) {
                    continue;
                }
                $read++;
                $this->assertDoesNotMatchRegularExpression('/(?<![-\w])border-radius\s*:/', $body, "{$selector} sets a radius");
                $this->assertDoesNotMatchRegularExpression(
                    '/(?<![-\w])font-(?:size|weight)\s*:/',
                    $body,
                    "{$selector} sets the type"
                );
                if (str_contains($selector, '[aria-disabled="true"]')) {
                    continue;
                }
                $this->assertDoesNotMatchRegularExpression(
                    '/(?<![-\w])(?:color|background(?:-color)?|border(?:-color)?)\s*:/',
                    $body,
                    "{$selector} restyles core's button"
                );
                if (!str_contains($selector, 'compass-news-hide-icon') && !str_contains($selector, 'compass-news-narrow')) {
                    $this->assertDoesNotMatchRegularExpression('/(?<![-\w])(?:padding|height)\s*:/', $body, "{$selector} sizes it");
                }
            }
        }
        $this->assertGreaterThanOrEqual(5, $read, 'vacuity: fewer than five rules of the buttons were read');

        // The dark rule that gives the outline buttons the body colour stops at a disabled one, or Today would not
        // recede in dark mode: both arms of the colour-mode scope carry the guard.
        $arms = 0;
        $dark = '/^(?:body\[data-bs-theme="dark"\] |\[data-bs-theme="dark"\] body )\.block_compass \.btn-outline-secondary/';
        foreach ($this->rules() as [$list]) {
            foreach (array_map('trim', explode(',', $list)) as $selector) {
                if (preg_match($dark, $selector)) {
                    $arms++;
                    $this->assertStringContainsString(
                        ':not([aria-disabled="true"])',
                        $selector,
                        "{$selector} reaches a disabled button"
                    );
                }
            }
        }
        $this->assertSame(2, $arms, 'vacuity: the dark outline rule\'s two arms');
    }

    /**
     * The calendar's views and filter switch take the filter bar scope's measures (segmented-control.md).
     *
     * The platter: 3 px of padding, a 2 px gap, a 1 px transparent border, radius lg, the inset ground; the cells
     * at the bar's height step (32 px, 36 px under a coarse pointer), radius md, 0 12px, 0.875rem / 500 in the
     * muted ink; the chosen cell on the surface in the body text, 600, the small elevation. No cell is a pill.
     *
     * Changes that must make it fail: the platter's radius or padding moved, the cell's height off the step, the
     * chosen cell back on the brand's text or on a literal shadow, the coarse step dropped.
     *
     * @return void
     */
    public function test_the_calendar_segment_takes_the_scopes_measures(): void {
        $platter = $this->rule('.block_compass .compass-cal-seg');
        $measures = [
            '--block_compass-bar-inner: 2rem;', 'gap: 0.125rem;', 'padding: 0.1875rem;', 'border: 1px solid transparent;',
            'border-radius: var(--block_compass-radius-lg);', 'background: var(--block_compass-surface-inset);',
        ];
        foreach ($measures as $declaration) {
            $this->assertStringContainsString($declaration, $platter);
        }
        $css = preg_replace('/\s+/', ' ', (string) file_get_contents(dirname(__DIR__, 2) . '/styles.css'));
        $this->assertStringContainsString(
            '@media (pointer: coarse) { .block_compass .compass-cal-seg { --block_compass-bar-inner: 2.25rem; } }',
            $css
        );
        $cell = $this->rule('.block_compass .compass-cal-segbtn');
        $measures = [
            'height: var(--block_compass-bar-inner);', 'padding: 0 0.75rem;', 'border-radius: var(--block_compass-radius-md);',
            'background: transparent;', 'color: var(--block_compass-muted);', 'font-size: 0.875rem;', 'font-weight: 500;',
        ];
        foreach ($measures as $declaration) {
            $this->assertStringContainsString($declaration, $cell);
        }
        $chosen = $this->rule('.block_compass .compass-cal-segbtn[aria-pressed="true"]');
        $measures = [
            'background: var(--block_compass-surface);', 'color: var(--block_compass-ink);', 'font-weight: 600;',
            'box-shadow: var(--block_compass-elevation-sm);',
        ];
        foreach ($measures as $declaration) {
            $this->assertStringContainsString($declaration, $chosen);
        }
        $this->assertStringContainsString(
            'width: var(--block_compass-bar-inner);',
            $this->rule('.block_compass .compass-cal-seg-icons .compass-cal-segbtn'),
            'an icon cell is a square at the step'
        );
        foreach ($this->rules() as [$list, $body]) {
            if (str_contains($list, 'compass-cal-seg') && preg_match('/border-radius:\s*([^;]+);/', $body, $radius)) {
                $this->assertDoesNotMatchRegularExpression('/999px|50%|50rem/', $radius[1], "{$list} is a pill");
            }
        }
    }

    /**
     * A count beside what it counts is the quiet counter: text only, never a box (counter.md).
     *
     * The open-courses panel's group count and a filter option's count: 0.75rem / 600, the muted ink, tabular
     * figures, and no fill, no box and no radius.
     *
     * Changes that must make it fail: a count drawn as a box again (a fill, a height or a radius), or off the
     * muted ink.
     *
     * @return void
     */
    public function test_a_count_beside_what_it_counts_is_quiet_text(): void {
        foreach (['.block_compass .compass-news-count', '.block_compass .compass-chip-count'] as $selector) {
            $body = $this->named($selector);
            $this->assertStringContainsString('color: var(--block_compass-muted);', $body, $selector);
            $this->assertStringContainsString('font-size: 0.75rem;', $body, $selector);
            $this->assertStringContainsString('font-weight: 600;', $body, $selector);
            $this->assertStringContainsString('font-variant-numeric: tabular-nums;', $body, $selector);
            $this->assertDoesNotMatchRegularExpression(
                '/(?<![-\w])(?:background(?:-color)?|border-radius|height|min-width|border)\s*:/',
                $body,
                "{$selector} draws a box"
            );
        }
    }

    /**
     * Every focus ring of the block is the Design System's token ring, or the course card's own on a card surface.
     *
     * tokens.md: outline: var(--{prefix}-focus-width) solid var(--{prefix}-focus-ring), offset 2px, -2px only
     * inside a container that clips (a filter option's chip scrolls inside its platter's mask). The course card
     * contract (section 7) gives a card surface its own pair, card-focus-width and card-focus-ring: a card, its
     * star and a list row. A transparent outline is kept where forced colours must still draw one. No ring is the
     * brand's accent: the calendar's accent outlines are its lighting, never a focus.
     *
     * Changes that must make it fail: a ring back on 2px solid var(--block_compass-accent); a ring on a literal
     * width; an inset offset outside a clipping container.
     *
     * @return void
     */
    public function test_every_focus_ring_reads_the_token_ring(): void {
        $token = 'var(--block_compass-focus-width) solid var(--block_compass-focus-ring)';
        $card = 'var(--block_compass-card-focus-width) solid var(--block_compass-card-focus-ring)';
        $rings = 0;
        $cards = 0;
        foreach ($this->rules() as [$list, $body]) {
            if (!preg_match('/:focus/', $list) || !preg_match('/(?<![-\w])outline\s*:\s*([^;]+);/', $body, $outline)) {
                continue;
            }
            if (str_ends_with($outline[1], ' solid transparent')) {
                continue;
            }
            $this->assertContains($outline[1], [$token, $card], "{$list}: not the token ring");
            $this->assertStringNotContainsString('accent', $outline[1], $list);
            if ($outline[1] === $card) {
                $cards++;
                $this->assertMatchesRegularExpression('/compass-(?:card|star|row)/', $list, "{$list}: the card's ring off a card");
            } else {
                $rings++;
            }
            if (preg_match('/(?<![-\w])outline-offset\s*:\s*([^;]+);/', $body, $offset) && $offset[1] !== '2px') {
                $this->assertSame('-2px', $offset[1], $list);
                $this->assertSame(
                    '.block_compass .compass-chip:focus-visible',
                    $list,
                    'an inset ring outside a clipping container'
                );
            }
        }
        $this->assertGreaterThanOrEqual(10, $rings, 'vacuity: fewer than ten token rings were read');
        $this->assertGreaterThanOrEqual(3, $cards, 'vacuity: the card surface\'s rings were not read');
    }
}
