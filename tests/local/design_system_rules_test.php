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
 * and tokens.md); and since ADR-024 the containers and feedback: the menu, the filter panel, the panels,
 * popovers and sheets, the tooltip, the empty state, the eyebrow and the last pills (menu.md, filter-panel.md,
 * panel-popover-sheet.md, tooltip.md, empty-state.md, eyebrow-label.md; the skeleton's pulse is
 * tier1_skeleton_rules_test's). The filter bar's own measures are filter_line_rules_test's, the colour pairs
 * contrast_rules_test's and the token chain design_tokens_test's. Each method names the change that must redden
 * it, and mutations/gates.conf makes that change under "The Design System's status labels and buttons" and
 * "The Design System's containers and feedback".
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
     * The text from one marker to the next occurrence of another.
     *
     * @param string $source The file.
     * @param string $start The text the slice starts with.
     * @param string $end The text that ends it.
     * @return string The slice.
     */
    private function slice(string $source, string $start, string $end): string {
        $from = strpos($source, $start);
        $this->assertNotFalse($from, "{$start} not found");
        $to = strpos($source, $end, $from + strlen($start));
        $this->assertNotFalse($to, "{$end} not found after {$start}");

        return substr($source, $from, $to - $from);
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
        foreach (['.block_compass .compass-news-count', '.block_compass .compass-fpanel-count'] as $selector) {
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
     * inside a container that clips, which no focusable control of the block sits in since the Platter's scrolling
     * mask went (ADR-024). The course card
     * contract (section 7) gives a card surface its own pair, card-focus-width and card-focus-ring: a card, its
     * star and a list row. A transparent outline is kept where forced colours must still draw one. No ring is the
     * brand's accent: the calendar's accent outlines are its lighting, never a focus.
     *
     * Changes that must make it fail: a ring back on 2px solid var(--block_compass-accent); a ring on a literal
     * width; an inset offset on a ring.
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
            if (preg_match('/(?<![-\w])outline-offset\s*:\s*([^;]+);/', $body, $offset)) {
                $this->assertSame('2px', $offset[1], "{$list}: an inset ring outside a clipping container");
            }
        }
        $this->assertGreaterThanOrEqual(10, $rings, 'vacuity: fewer than ten token rings were read');
        $this->assertGreaterThanOrEqual(3, $cards, 'vacuity: the card surface\'s rings were not read');
    }

    /**
     * Each declaration of a list must be in the body, written exactly.
     *
     * @param string $body The declarations of a rule.
     * @param array $declarations The declarations it must hold.
     * @param string $what The rule's name, for the message.
     * @return void
     */
    private function holds(string $body, array $declarations, string $what): void {
        foreach ($declarations as $declaration) {
            $this->assertStringContainsString($declaration, $body, "{$what}: {$declaration}");
        }
    }

    /**
     * The Organise and View menus are one element, the Design System's menu, on the floating layers' scales.
     *
     * menu.md: min-width 220 px, padding 4 px, radius md, the medium elevation, z 20; a heading 0.75rem / 600 in the
     * muted ink; an item a 32 px row at radius xs, 0.875rem, its icon before its word and the chosen one's tick after
     * it. The floating layers share the line, the surface and the elevation; the filter panel's radius is lg, the
     * menus' and the suggestions' md (panel-popover-sheet.md). Both buttons draw LineMenu, so the two menus cannot
     * drift apart, and the Organise menu holds items, never a platter of pills.
     *
     * Changes that must make it fail: a menu back on radius 0.75rem or its old 0.75rem padding, a layer's shadow back
     * on a literal, the item's measures moved, Organise drawing its own menu again.
     *
     * @return void
     */
    public function test_the_two_menus_are_the_design_systems_menu(): void {
        $this->holds($this->rule('.block_compass .compass-line-layer'), [
            'z-index: 20;', 'border: 1px solid var(--block_compass-line);', 'border-radius: var(--block_compass-radius-lg);',
            'background: var(--block_compass-surface);', 'color: var(--block_compass-ink);',
            'box-shadow: var(--block_compass-elevation-md);',
        ], 'the floating layer');
        $this->holds($this->rule('.block_compass .compass-line-menu:not([hidden])'), [
            'min-width: 13.75rem;', 'padding: 0.25rem;', 'border-radius: var(--block_compass-radius-md);',
        ], 'the menu');
        $this->holds($this->rule('.block_compass .compass-line-menulabel'), [
            'padding: 0.375rem 0.5rem 0.125rem;', 'color: var(--block_compass-muted);', 'font-size: 0.75rem;',
            'font-weight: 600;',
        ], 'the menu\'s heading');
        $this->holds($this->rule('.block_compass .compass-line-menuitem'), [
            'gap: 0.5rem;', 'min-height: 2rem;', 'padding: 0.25rem 0.5rem;', 'border-radius: var(--block_compass-radius-xs);',
            'font-size: 0.875rem;',
        ], 'a menu item');
        $this->holds($this->rule('.block_compass .compass-line-tick'), [
            'margin-inline-start: auto;', 'color: var(--block_compass-brand-ink);',
        ], 'the tick');

        foreach (['OrganiseMenu.tsx', 'ViewToggle.tsx'] as $name) {
            $source = $this->source($name);
            $this->assertStringContainsString("import LineMenu from './LineMenu';", $source, $name);
            $this->assertDoesNotMatchRegularExpression('/\srole="menu"\n/', $source, "{$name} draws a menu of its own");
            $this->assertStringNotContainsString('Platter', $source, $name);
        }
        $this->assertFileDoesNotExist(dirname(__DIR__, 2) . '/js/esm/src/Platter.tsx', 'the Platter is back');
    }

    /**
     * The filter panel's groups are labelled radio groups of options, at the Design System's measures.
     *
     * filter-panel.md and the contract's section 4: every group of Compass holds one value, so it is a radiogroup
     * named by its label, its options role="radio" with aria-checked and one tab stop (the chosen option, or the
     * first), the arrow keys moving the focus and the choice; a press on the chosen option releases the group, which
     * has no neutral option. An option is a 28 px rounded rectangle on the control line, 0.8125rem / 500, the chosen
     * one in the brand tone; the panel at least 300 px wide, 12 px of padding; the sheet radius xl on its top corners,
     * at most 80 % of the screen, the large elevation; the foot under a hairline. No pill and no platter is left.
     *
     * Changes that must make it fail: a group back to a role="group" of aria-pressed toggles, the roving tab stop or
     * the arrow keys' choice dropped, a press on the chosen option no longer releasing it, the keyboard left on the
     * body when the released option counts nothing and goes, an option back on a pill
     * or off its height, the chosen option off the brand tone, the sheet back on a 1rem corner or off its elevation,
     * the foot's hairline dropped.
     *
     * @return void
     */
    public function test_the_filter_panel_is_labelled_radio_groups(): void {
        $panel = $this->source('FilterPanel.tsx');
        $this->assertStringContainsString(
            '<div className="compass-fpanel-opts" role="radiogroup" aria-labelledby={labelid} onKeyDown={keydown}>',
            $panel
        );
        $this->assertStringContainsString('<span className="compass-fpanel-head" id={labelid}>{field.label}</span>', $panel);
        $option = $this->slice($panel, 'className="compass-fpanel-opt"', 'onClick=');
        $this->assertStringContainsString('aria-checked={option.checked}', $option);
        $this->assertStringContainsString('tabIndex={option.value === stop ? 0 : -1}', $option);
        $this->assertMatchesRegularExpression('/role="radio"\s+className="compass-fpanel-opt"/', $panel);
        $this->assertStringNotContainsString('aria-pressed', $panel, 'an option is a pressed toggle again');
        $this->assertMatchesRegularExpression(
            '/released\.current = value === null;.*?useLayoutEffect\(\(\) => \{\s*if \(!released\.current\) \{.*?'
                . 'panel\.contains\(document\.activeElement\).*?\[role="radio"\]\[tabindex="0"\].*?\.compass-clear.*?'
                . 'next\?\.focus\(/s',
            $panel,
            'a released option that is no longer drawn leaves the keyboard on the body'
        );
        $this->assertStringContainsString('onSelect={select}', $panel, 'the groups do not report their releases');
        $this->assertStringContainsString(
            'const stop = (options.find((option) => option.checked) ?? options[0]).value;',
            $panel
        );
        $keys = $this->slice($panel, 'const keydown = ', "\n    };\n");
        foreach (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'] as $key) {
            $this->assertStringContainsString("'{$key}'", $keys);
        }
        $this->assertStringContainsString('onSelect(field.key, Number(radios[next].dataset.value));', $keys);
        $this->assertStringContainsString('onSelect(field.key, option.checked ? null : option.value);', $panel);

        $this->holds($this->rule('.block_compass .compass-fpanel:not([hidden])'), [
            '--block_compass-fpanel-min: min(18.75rem, 100%);', 'min-width: var(--block_compass-fpanel-min);',
            'gap: 0.75rem;', 'padding: 0.75rem;',
        ], 'the panel');
        $this->holds($this->rule('.block_compass .compass-fpanel.compass-fpanel-sheet:not([hidden])'), [
            'position: fixed;', 'z-index: 1050;', 'max-height: 80vh;',
            'border-radius: var(--block_compass-radius-xl) var(--block_compass-radius-xl) 0 0;',
            'box-shadow: var(--block_compass-elevation-lg);',
        ], 'the sheet');
        $this->holds($this->rule('.block_compass .compass-fpanel-opt'), [
            'gap: 0.375rem;', 'height: 1.75rem;', 'padding: 0 0.5rem;', 'border: 1px solid var(--block_compass-control-line);',
            'border-radius: var(--block_compass-radius-sm);', 'background: var(--block_compass-surface);',
            'color: var(--block_compass-ink);', 'font-size: 0.8125rem;', 'font-weight: 500;',
        ], 'an option');
        $this->holds($this->rule('.block_compass .compass-fpanel-opt[aria-checked="true"]'), [
            'border-color: var(--block_compass-brand-edge);', 'background: var(--block_compass-brand-tint);',
            'color: var(--block_compass-brand-ink);',
        ], 'the chosen option');
        $this->holds($this->rule('.block_compass .compass-fpanel-opts'), ['flex-wrap: wrap;', 'gap: 0.375rem;'], 'the options');
        $this->holds($this->rule('.block_compass .compass-fpanel-foot'), [
            'justify-content: space-between;', 'gap: 0.5rem;', 'padding-top: 0.75rem;',
            'border-top: 1px solid var(--block_compass-line);',
        ], 'the foot');

        $css = (string) file_get_contents(dirname(__DIR__, 2) . '/styles.css');
        $this->assertDoesNotMatchRegularExpression(
            '/\.compass-(?:platter|paddle|chip)(?![\w-])/',
            $css,
            'the Platter\'s rules are back'
        );
    }

    /**
     * The panels, popovers and sheets take the Design System's radius, elevation and z ladder.
     *
     * panel-popover-sheet.md: a panel radius lg; a popover radius lg at the medium elevation; a sheet radius xl on its
     * top corners at the large one; what nests in them radius md; one ladder, 20, 21, 1040, 1050. The day's card and
     * the open-courses popover scroll with the page under core's fixed navbar (1030) and its drawers (1015 and 1021),
     * so they take the anchored rung, 20, as the menus do; the sheets 1050, the open-courses scrim the rung under its
     * sheet. A group of the open-courses line rests at the small elevation. The day card's frosted glass stays: the
     * file leaves a popover's blur open.
     *
     * Changes that must make it fail: a container back on a literal radius (1.1rem, 0.875rem, 1rem, 1.25rem or
     * 1.125rem corners), a shadow back on a literal or on the old card shadow, a layer off the ladder (40, 1000, 1055),
     * a group of the line back on a pill.
     *
     * @return void
     */
    public function test_the_containers_take_the_radius_elevation_and_ladder(): void {
        $expected = [
            '.block_compass .compass-cal-card' => [
                'z-index: 20;', 'border-radius: var(--block_compass-radius-lg);', 'box-shadow: var(--block_compass-elevation-md);',
                'backdrop-filter: blur(22px) saturate(170%);',
            ],
            '.block_compass .compass-cal-narrow .compass-cal-card' => [
                'z-index: 1050;', 'border-radius: var(--block_compass-radius-xl) var(--block_compass-radius-xl) 0 0;',
                'box-shadow: var(--block_compass-elevation-lg);',
            ],
            '.block_compass .compass-news-pop' => [
                'z-index: 20;', 'border-radius: var(--block_compass-radius-lg);', 'box-shadow: var(--block_compass-elevation-md);',
            ],
            '.block_compass .compass-news-pop.compass-news-sheet' => [
                'z-index: 1050;', 'border-radius: var(--block_compass-radius-xl) var(--block_compass-radius-xl) 0 0;',
                'box-shadow: var(--block_compass-elevation-lg);',
            ],
            '.block_compass .compass-news-scrim' => ['z-index: 1040;'],
            '.block_compass .compass-news' => ['border-radius: var(--block_compass-radius-lg);'],
            '.block_compass .compass-news-group' => [
                'border-radius: var(--block_compass-radius-md);', 'box-shadow: var(--block_compass-elevation-sm);',
            ],
            '.block_compass .compass-news-more' => ['border-radius: var(--block_compass-radius-md);'],
            '.block_compass .compass-news-poprow' => ['border-radius: var(--block_compass-radius-md);'],
            '.block_compass .compass-news-tile' => ['border-radius: var(--block_compass-radius-md);'],
        ];
        foreach ($expected as $selector => $declarations) {
            $this->holds($this->rule($selector), $declarations, $selector);
        }

        $ladder = 0;
        foreach ($this->rules() as [$list, $body]) {
            if (!preg_match('/compass-(?:cal-card|news-pop|news-scrim|fpanel|line-layer|line-suggest)/', $list)) {
                continue;
            }
            if (preg_match('/(?<![-\w])z-index:\s*(\d+);/', $body, $z)) {
                $ladder++;
                $this->assertContains((int) $z[1], [20, 21, 1040, 1050], "{$list}: off the ladder");
            }
            $this->assertStringNotContainsString('cal-shadow', $body, "{$list}: the old card shadow");
            if (preg_match('/(?<![-\w])box-shadow:\s*([^;]+);/', $body, $shadow)) {
                $this->assertMatchesRegularExpression('/^var\(--block_compass-elevation-(?:sm|md|lg)\)$/', $shadow[1], $list);
            }
        }
        $this->assertGreaterThanOrEqual(7, $ladder, 'vacuity: the containers\' layers were not read');
    }

    /**
     * The block's two tooltips have one look, the Design System's (tooltip.md).
     *
     * The calendar's (its view switch and Up next's hide) and the open-courses group's: the body text as the ground
     * and the surface as the text, radius sm, 0.75rem with a 1.35 line, at most 260 px wide, a 5 px arrow in the
     * ground, opacity over the fast motion. The CSS-only tooltip waits 250 ms before it shows; the group's waits in its
     * client (ADR-019 decision 3). Padding, shadow and layer stay each one's own: the file leaves the three open.
     *
     * Changes that must make it fail: either tooltip back on its own ground or radius, the group's back on 0.875rem
     * text, its old 120 ms or its rise, the calendar's delay dropped, an arrow off the ground.
     *
     * @return void
     */
    public function test_the_two_tooltips_have_one_look(): void {
        $look = [
            'max-width: 16.25rem;', 'border-radius: var(--block_compass-radius-sm);', 'background: var(--block_compass-ink);',
            'color: var(--block_compass-surface);', 'font-size: 0.75rem;', 'font-weight: 400;', 'line-height: 1.35;',
            'transition: opacity var(--block_compass-motion-fast) ease;',
        ];
        foreach (['.block_compass .compass-cal-tip', '.block_compass .compass-news-tip'] as $selector) {
            $this->holds($this->rule($selector), $look, $selector);
            $this->assertStringNotContainsString('transform 120ms', $this->rule($selector), $selector);
        }
        $this->assertStringNotContainsString('font-size', $this->rule('.block_compass .compass-news-tipname'));
        $this->assertStringContainsString(
            'transition-delay: 250ms;',
            $this->named(
                '.block_compass .compass-cal-seg-icons:not(.compass-cal-tipsoff) .compass-cal-segbtn:hover .compass-cal-tip'
            )
        );
        $this->assertStringContainsString(
            'border-top-color: var(--block_compass-ink);',
            $this->rule('.block_compass .compass-cal-tip::after')
        );
        $this->holds($this->rule('.block_compass .compass-news-tiparrow'), [
            'border: 5px solid transparent;', 'border-top-color: var(--block_compass-ink);',
        ], 'the group tooltip\'s arrow');
        $this->assertStringContainsString(
            'color: var(--block_compass-surface);',
            $this->rule('.block_compass .compass-news-tipmeta'),
            'the group tooltip\'s line is muted on its ground'
        );
    }

    /**
     * An empty list takes the full empty state, a small region the compact line (empty-state.md).
     *
     * Tier 3 with no course for its filters is the full form: a 56 px disc in the neutral tone with the magnifier, the
     * sentence as its title at 1rem / 600, and its one action, Clear filters, core's outline button, only while a
     * filter is in force; the keyboard goes to the list's title as the button goes. Tier 1's line and an empty day
     * are the compact form: one line in the muted ink.
     *
     * Changes that must make it fail: the empty result back to a muted paragraph, its disc off the neutral tone, its
     * action shown with nothing to clear or dropping the keyboard, a compact line off the muted ink.
     *
     * @return void
     */
    public function test_an_empty_list_is_the_full_form_and_a_small_region_the_compact_line(): void {
        $explore = $this->source('Explore.tsx');
        $empty = $this->slice($explore, '<div className="compass-noresults">', "\n            )}\n");
        $this->assertStringContainsString('dangerouslySetInnerHTML={markup(config.icons.search)}', $empty);
        $this->assertStringContainsString('<p className="compass-noresults-title">{labels.noresults}</p>', $empty);
        $this->assertMatchesRegularExpression(
            '/\{!unfiltered && \(\s*<button\s+type="button"\s+className="btn btn-outline-secondary/',
            $empty
        );
        $this->assertMatchesRegularExpression(
            '/clearFilters\(\);\s*section\.current\?\.querySelector<HTMLElement>\(\'\.compass-explore-title\'\)\?\.focus\(/',
            $empty,
            'the action drops the keyboard as it goes'
        );

        $this->holds($this->rule('.block_compass .compass-noresults-icon'), [
            'width: 3.5rem;', 'height: 3.5rem;', 'border-radius: 50%;', 'background: var(--block_compass-neutral-tint);',
            'color: var(--block_compass-neutral-ink);',
        ], 'the disc');
        $this->holds($this->rule('.block_compass .compass-noresults-title'), [
            'color: var(--block_compass-ink);', 'font-size: 1rem;', 'font-weight: 600;',
        ], 'the title');
        $this->holds($this->rule('.block_compass .compass-noresults'), ['align-items: center;', 'text-align: center;'], 'the form');
        $root = '';
        foreach ($this->rules() as [$list, $body]) {
            if ($list === '.block_compass') {
                $root .= ' ' . $body;
            }
        }
        $this->assertStringContainsString(
            '--block_compass-neutral-tint: var(--dimensions-neutral-tint, var(--bs-secondary-bg-subtle, #e2e3e5));',
            $root
        );
        $this->assertStringContainsString(
            '--block_compass-neutral-ink: var(--dimensions-neutral-ink, var(--bs-secondary-text-emphasis, #2b2f32));',
            $root
        );
        foreach (['.block_compass .compass-empty', '.block_compass .compass-cal-empty'] as $selector) {
            $this->assertStringContainsString('color: var(--block_compass-muted);', $this->named($selector), $selector);
        }
    }

    /**
     * Every label above a group or a title is the Design System's eyebrow: 0.75rem / 600, muted, sentence case.
     *
     * eyebrow-label.md: the menus' heading, the filter panel's group labels and the open-courses popover's eyebrow;
     * no text-transform and no letter-spacing.
     *
     * Changes that must make it fail: an eyebrow back on 0.8125rem or 700, off the muted ink, or uppercase.
     *
     * @return void
     */
    public function test_the_eyebrows_are_small_muted_and_sentence_case(): void {
        foreach (['compass-line-menulabel', 'compass-fpanel-head', 'compass-news-popeyebrow'] as $class) {
            $body = $this->rule(".block_compass .{$class}");
            $this->holds($body, ['color: var(--block_compass-muted);', 'font-size: 0.75rem;', 'font-weight: 600;'], $class);
            $this->assertDoesNotMatchRegularExpression('/text-transform|letter-spacing/', $body, $class);
        }
    }

    /**
     * No control of the block is a pill: what is left round is a counter or the course card contract's.
     *
     * INDEX.md's second rule. Every 999px or 50rem radius left is the loud counter on Filters (counter.md), the card's
     * kind chip (the course card contract draws it as a pill) or Up next's countdown, a static label that is no
     * control; core's rounded-pill is in no client source (the action buttons' rule).
     *
     * Changes that must make it fail: a pill radius on any other rule, the open-courses groups or "+N" among them.
     *
     * @return void
     */
    public function test_no_control_of_the_block_is_a_pill(): void {
        $allowed = [
            '.block_compass .compass-filtercount', '.block_compass .compass-card-kind', '.block_compass .compass-soon-pill',
        ];
        $pills = [];
        foreach ($this->rules() as [$list, $body]) {
            if (preg_match('/border-radius:\s*[^;]*(?:999px|50rem)/', $body)) {
                $pills[] = $list;
            }
        }
        sort($pills);
        $this->assertSame($allowed, array_values(array_intersect($allowed, $pills)), 'vacuity: the kept pills were not read');
        $this->assertSame([], array_values(array_diff($pills, $allowed)), 'a control is a pill');
    }
}
