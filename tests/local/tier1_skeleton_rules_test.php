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
 * Tier 1 holds its place from the first paint, pinned by reading the sources.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use advanced_testcase;
use PHPUnit\Framework\Attributes\CoversNothing;

/**
 * ADR-018: the shell draws tier 1's skeleton in the shape it last settled to, React's first render draws the
 * same markup, and the client writes the shape only when it changed, once tier 1 has settled.
 *
 * The two copies of the skeleton's markup (templates/tier1_skeleton.mustache, js/esm/src/Tier1Skeleton.tsx)
 * are held in step here by their class sequence, and by the probe's shift at the mount (M2); the grid's CSS
 * is read against columns.ts; the write's guards are read in tier1shape.ts and Block.tsx. No JavaScript
 * runner holds any of this, so the sources are read.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversNothing]
final class tier1_skeleton_rules_test extends advanced_testcase {
    /**
     * A source of the plugin.
     *
     * @param string $path The path from the plugin root.
     * @return string The contents.
     */
    private function source(string $path): string {
        $contents = file_get_contents(dirname(__DIR__, 2) . '/' . $path);
        $this->assertNotFalse($contents, "{$path} is not readable");

        return $contents;
    }

    /**
     * A template without its comment tags.
     *
     * @param string $name The template's file name.
     * @return string The markup.
     */
    private function template(string $name): string {
        return preg_replace('/\{\{!.*?\}\}/s', '', $this->source("templates/{$name}"));
    }

    /**
     * The stylesheet without its comments.
     *
     * @return string The stylesheet.
     */
    private function css(): string {
        return preg_replace('#/\*.*?\*/#s', '', $this->source('styles.css'));
    }

    /**
     * The declarations of the one rule whose whole selector is the one given.
     *
     * @param string $selector The selector, as written.
     * @return string The rule's body.
     */
    private function rule(string $selector): string {
        preg_match_all('/([^{}]+)\{([^{}]*)\}/s', $this->css(), $matches, PREG_SET_ORDER);
        $bodies = [];
        foreach ($matches as $match) {
            if (trim($match[1]) === $selector) {
                $bodies[] = $match[2];
            }
        }
        $this->assertCount(1, $bodies, "one rule for {$selector} expected in styles.css");

        return $bodies[0];
    }

    /**
     * The class attributes of a template, in source order, an optional class written "name?".
     *
     * An optional class is written {{#flag}} name{{/flag}} inside the attribute.
     *
     * @param string $markup The template.
     * @return string[] One normalised class list per attribute.
     */
    private static function template_classes(string $markup): array {
        preg_match_all('/\bclass="([^"]*)"/', $markup, $matches);

        return array_map(
            fn(string $value): string => trim(preg_replace('/\{\{#\w+\}\}\s*([\w-]+)\{\{\/\w+\}\}/', ' $1?', $value)),
            $matches[1]
        );
    }

    /**
     * The className attributes of a TSX source, in source order, constants resolved, an optional class "name?".
     *
     * A className is a literal, a constant declared in the file (const NAME = '...';), or a template literal
     * whose optional class is written ${flag ? ' name' : ''}.
     *
     * @param string $source The TSX.
     * @return string[] One normalised class list per attribute.
     */
    private function tsx_classes(string $source): array {
        preg_match_all("/^const ([A-Z_]+) = '([^']*)';$/m", $source, $constants);
        $values = array_combine($constants[1], $constants[2]);
        // A template literal's backtick is written \x60: phpcs forbids the character itself in a string.
        preg_match_all('/className=(?:"([^"]*)"|\{([A-Z_]+)\}|\{\x60([^\x60]*)\x60\})/', $source, $matches, PREG_SET_ORDER);
        $classes = [];
        foreach ($matches as $match) {
            if (($match[1] ?? '') !== '') {
                $classes[] = $match[1];
            } else if (($match[2] ?? '') !== '') {
                $this->assertArrayHasKey($match[2], $values, "className={{$match[2]}} names no constant of the file");
                $classes[] = $values[$match[2]];
            } else {
                $classes[] = trim(preg_replace('/\$\{\w+(?:\.\w+)* \? \' ([\w-]+)\' : \'\'\}/', ' $1?', $match[3]));
            }
        }

        return $classes;
    }

    /**
     * The template and Tier1Skeleton.tsx name the same classes in the same order: one markup written twice.
     *
     * React's first commit replaces the shell's skeleton with its own; the mount shifts nothing only while the
     * two are the same elements with the same classes. The sequence is read in source order on both sides,
     * which is why the TSX is written in the template's order with every class a literal or a constant.
     * Changes that must make it fail: a class added, dropped or moved on one side only; the client grid
     * taking the measured column class.
     *
     * @return void
     */
    public function test_the_template_and_the_client_name_the_same_class_sequence(): void {
        $template = self::template_classes($this->template('tier1_skeleton.mustache'));
        $client = $this->tsx_classes($this->source('js/esm/src/Tier1Skeleton.tsx'));

        // Vacuity guards: both sides were read, the optional class recognised and the constants resolved.
        $this->assertGreaterThanOrEqual(30, count($template), 'fewer than 30 class attributes in the template');
        $this->assertContains('compass-cards-list compass-sk-cards compass-sk-onerow?', $template);
        $this->assertContains('compass-skeleton compass-skeleton-line compass-skeleton-narrow', $client);
        $this->assertSame($template, $client, 'the skeleton\'s two copies differ');

        // Neither grid is the measured one: before the first measure the count is a guess, and the shell has none.
        $this->assertStringNotContainsString('compass-cards-${', $this->source('js/esm/src/Tier1Skeleton.tsx'));
        $this->assertDoesNotMatchRegularExpression('/compass-cards-[123]\b/', $this->template('tier1_skeleton.mustache'));
    }

    /**
     * The skeleton, the shell's and React's, is aria-hidden and writes no heading and no control; the loading
     * announcement is a visually hidden status region.
     *
     * Changes that must make it fail: aria-hidden dropped from a root; a heading tag or Heading component in
     * the skeleton; the loading line visible again (a height that leaves when the cards land).
     *
     * @return void
     */
    public function test_the_skeleton_is_hidden_and_writes_no_heading(): void {
        $roots = [
            'templates/tier1_skeleton.mustache' => $this->template('tier1_skeleton.mustache'),
            'js/esm/src/Tier1Skeleton.tsx' => $this->source('js/esm/src/Tier1Skeleton.tsx'),
        ];
        foreach ($roots as $file => $markup) {
            $this->assertMatchesRegularExpression(
                '/<div class(?:Name)?="compass-tier1-skeleton" data-region="tier1-skeleton" aria-hidden="true">/',
                $markup,
                "{$file}: the skeleton's root is read by assistive technology"
            );
            $this->assertDoesNotMatchRegularExpression(
                '/<(h[1-6]|Heading|Title|button|a)\b/',
                $markup,
                "{$file}: a heading or a control"
            );
        }
        $this->assertStringNotContainsString('sectionTag', $roots['js/esm/src/Tier1Skeleton.tsx']);
        $this->assertMatchesRegularExpression(
            '/<div class="compass-cal [^"]*" aria-hidden="true">/',
            $this->template('calendar_skeleton.mustache'),
            'the calendar\'s head skeleton is read by assistive technology'
        );
        $this->assertDoesNotMatchRegularExpression(
            '/<(h[1-6]|button|a)\b/',
            $this->template('calendar_skeleton.mustache'),
            'the calendar\'s head skeleton holds a heading or a control'
        );
        $this->assertStringContainsString('<div class="compass-preload" aria-hidden="true">', $this->template('block.mustache'));

        $block = $this->source('js/esm/src/Block.tsx');
        $this->assertMatchesRegularExpression(
            '/<div className="compass-status visually-hidden" role="status" aria-live="polite">\s*\{labels\.loading\}\s*<\/div>/',
            $block,
            'the loading announcement is not a visually hidden status region'
        );
    }

    /**
     * Block draws the skeleton from the props while tier 1 has no answer and no failure.
     *
     * Changes that must make it fail: the skeleton not drawn while the request travels; drawn from anything
     * but the shell's model.
     *
     * @return void
     */
    public function test_the_block_draws_the_shells_skeleton_while_tier_1_travels(): void {
        $block = $this->source('js/esm/src/Block.tsx');

        $this->assertSame(1, substr_count($block, '<Tier1Skeleton '), 'the skeleton is drawn in one place');
        $this->assertStringContainsString(
            '{!data && error === null && <Tier1Skeleton skeleton={config.tier1.skeleton} />}',
            $block,
            'tier 1\'s place is not held by the shell\'s skeleton while its request travels'
        );
        // The cards keep the measured count (ADR-018 decision 7).
        $this->assertStringContainsString('const columns = cardColumns(width);', $block);
    }

    /**
     * The shape is written once tier 1 has settled, only when it differs from the one held, never after a
     * failure, carrying the other surface's member, through core's preference route.
     *
     * Changes that must make it fail: a write on every settle; a shape taken while progress travels; a write
     * after a failed load or progress; the effect run on every render; the other surface dropped; a second
     * write path.
     *
     * @return void
     */
    public function test_the_shape_is_written_only_on_a_change_and_after_settle(): void {
        $module = $this->source('js/esm/src/tier1shape.ts');
        $this->assertMatchesRegularExpression(
            '/if \(cards\.some\(\(card\) => card\.pending\)\) \{\s*return null;/',
            $module,
            'a shape is taken before the cards\' progress settled'
        );
        $this->assertMatchesRegularExpression(
            '/if \(sameShape\(shapes\[tier1\.surface\] \?\? null, shape\)\) \{\s*return false;\s*\}\s*'
                . 'held = \{\.\.\.shapes, \[tier1\.surface\]: shape\};/',
            $module,
            'the shape is written without comparing it with the one held, or the other surface is dropped'
        );
        $this->assertSame(1, substr_count($module, 'setTier1Preference('), 'a second write path');
        $this->assertLessThan(
            strpos($module, 'setTier1Preference(value)'),
            strpos($module, 'if (sameShape('),
            'the comparison comes after the write'
        );
        // The comparison reads every member.
        $same = substr($module, strpos($module, 'const sameShape'), 600);
        $members = [
            'stored.ghost === shape.ghost',
            'stored.pending === shape.pending',
            'stored.strips.length === shape.strips.length',
        ];
        foreach ($members as $member) {
            $this->assertStringContainsString($member, $same);
        }

        $block = $this->source('js/esm/src/Block.tsx');
        $this->assertSame(1, substr_count($block, 'rememberShape('), 'the shape is remembered from more than one place');
        $this->assertMatchesRegularExpression(
            '/useEffect\(\(\) => \{\s*const shape = data && error === null\s*'
                . '\? settledShape\(data, config\.strips, config\.favouritesenabled, config\.pendingenabled\)\s*: null;'
                . '\s*if \(shape\) \{\s*rememberShape\(config\.tier1, shape\);\s*\}\s*'
                . '\}, \[data, error, config\.strips, config\.favouritesenabled, config\.pendingenabled, config\.tier1\]\);/',
            $block,
            'the shape is not remembered from an effect on a settled, unfailed answer'
        );

        $repository = $this->source('js/esm/src/repository.ts');
        $this->assertStringContainsString(
            "{name: 'block_compass_tier1', value: JSON.stringify(value), userid: 0}",
            $repository,
            'the shape is not written through core\'s preference route'
        );
    }

    /**
     * The skeleton's grid reproduces cardColumns() in CSS, its max() and clamp() inside custom properties.
     *
     * ADR-018 decision 6: the track is max(min(264px, 100%), (100% - 32px) / 3) and auto-fill counts
     * floor((W + 16) / (T + 16)), so the numbers must be columns.ts's (track, gap, cap); the cap per count
     * steps 373 / 762 / 1151 at 544 and 824 px, as .compass-cards-1 to -3 do. The fleet's stylelint forbids
     * min(), max() and clamp() in a length property, so they are read only inside --block_compass-sk-*.
     * Changes that must make it fail: a constant that no longer matches columns.ts, a math function written
     * in a length property, the grid off auto-fill or not reading the custom property.
     *
     * @return void
     */
    public function test_the_grid_reproduces_card_columns_through_custom_properties(): void {
        $columns = $this->source('js/esm/src/columns.ts');
        preg_match('/export const CARD_TRACK_PX = (\d+);/', $columns, $track);
        preg_match('/export const CARD_GAP_PX = (\d+);/', $columns, $gap);
        preg_match('/export const CARD_COLUMNS_MAX = (\d+);/', $columns, $max);
        $this->assertCount(2, $track, 'CARD_TRACK_PX not found');
        $this->assertCount(2, $gap, 'CARD_GAP_PX not found');
        $this->assertCount(2, $max, 'CARD_COLUMNS_MAX not found');
        [$t, $g, $m] = [(int) $track[1], (int) $gap[1], (int) $max[1]];

        $body = $this->rule('.block_compass .compass-sk-cards');
        $this->assertStringContainsString(
            '--block_compass-sk-track: max(min(' . $t . 'px, 100%), calc((100% - ' . (($m - 1) * $g) . 'px) / ' . $m . '));',
            $body,
            'the track is not columns.ts\'s'
        );
        $this->assertMatchesRegularExpression(
            '/grid-template-columns: repeat\(auto-fill, minmax\(var\(--block_compass-sk-track\), 1fr\)\);/',
            $body
        );
        $this->assertMatchesRegularExpression('/(?<![\w-])gap: ' . $g . 'px;/', $body, 'the gap is not columns.ts\'s');
        // The cap: 373 px a track, plus a track and its gap at each threshold where cardColumns() adds one.
        $cap = 373;
        $this->assertStringContainsString('max-width: var(--block_compass-sk-cap);', $body);
        $this->assertStringContainsString("{$cap}px", $body);
        foreach ([2, 3] as $count) {
            $threshold = $count * $t + ($count - 1) * $g;
            $this->assertStringContainsString(
                ($cap + $g) . ' * clamp(0px, (100% - ' . ($threshold - 1) . '.99px) * 1000, 1px)',
                $body,
                "no step to {$count} tracks at {$threshold} px"
            );
            $this->assertMatchesRegularExpression(
                '/max-width\s*:\s*' . ($count * $cap + ($count - 1) * $g) . 'px\b/',
                $this->rule('.block_compass .compass-cards-' . $count),
                "the cards grid's cap for {$count} is not the step's"
            );
        }
        // Every min(), max() or clamp() of the rule sits in a custom property's declaration.
        foreach (preg_split('/;\s*/', trim($body)) as $declaration) {
            if (preg_match('/\b(min|max|clamp)\(/', $declaration)) {
                $this->assertMatchesRegularExpression(
                    '/^--block_compass-sk-/',
                    trim($declaration),
                    "{$declaration}: a math function in a length property"
                );
            }
        }

        $onerow = $this->rule('.block_compass .compass-sk-onerow');
        $this->assertMatchesRegularExpression('/grid-auto-rows: 0;/', $onerow, 'the fallback grows a second row');
        $this->assertMatchesRegularExpression('/overflow: hidden;/', $onerow, 'the fallback\'s other rows show');
    }

    /**
     * The shell's skeleton shows only with JavaScript, and about 10 s on a step swaps it for the "could not be
     * loaded" sentence, under reduced motion too.
     *
     * ADR-018, the owner's answer to Q1. Changes that must make it fail: the skeleton shown without
     * JavaScript, the step lost or not delayed, the sentence shown from the start, reduced motion cancelling
     * the step (it is not motion), the sentence no longer right after the skeleton.
     *
     * @return void
     */
    public function test_the_skeleton_needs_javascript_and_gives_way_after_ten_seconds(): void {
        $this->assertMatchesRegularExpression('/display: none;/', $this->rule('.block_compass .compass-preload'));
        $shown = $this->rule('body.jsenabled .block_compass .compass-preload');
        $this->assertMatchesRegularExpression('/display: block;/', $shown);
        $this->assertMatchesRegularExpression('/animation: block_compass-preload-out \d+ms step-start 10s forwards;/', $shown);
        $sentence = $this->rule('body.jsenabled .block_compass .compass-preload + .compass-noscript');
        $this->assertMatchesRegularExpression('/visibility: hidden;/', $sentence);
        $this->assertMatchesRegularExpression('/position: absolute;/', $sentence);
        $this->assertMatchesRegularExpression('/animation: block_compass-preload-in \d+ms step-start 10s forwards;/', $sentence);

        $css = $this->css();
        $this->assertMatchesRegularExpression(
            '/@keyframes block_compass-preload-out \{\s*from,\s*to \{\s*position: absolute;\s*visibility: hidden;\s*\}\s*\}/',
            $css
        );
        $this->assertMatchesRegularExpression(
            '/@keyframes block_compass-preload-in \{\s*from,\s*to \{\s*position: static;\s*visibility: visible;\s*\}\s*\}/',
            $css
        );
        // Reduced motion stops the shimmer and keeps the step.
        $blocks = 0;
        $offset = 0;
        while (($at = strpos($css, '@media (prefers-reduced-motion: reduce)', $offset)) !== false) {
            $depth = 0;
            $end = $at;
            for ($i = strpos($css, '{', $at); $i < strlen($css); $i++) {
                $depth += $css[$i] === '{' ? 1 : ($css[$i] === '}' ? -1 : 0);
                if ($depth === 0) {
                    $end = $i;
                    break;
                }
            }
            $media = substr($css, $at, $end - $at);
            $this->assertStringNotContainsString('compass-preload', $media, 'reduced motion cancels the step');
            $blocks += str_contains($media, '.compass-skeleton') ? 1 : 0;
            $offset = $end;
        }
        $this->assertGreaterThanOrEqual(1, $blocks, 'reduced motion no longer stops the skeleton\'s shimmer');

        $this->assertMatchesRegularExpression(
            '/<div class="compass-preload" aria-hidden="true">.*?<\/div>\s*<p class="compass-noscript">/s',
            $this->template('block.mustache'),
            'the sentence does not follow the skeleton, so the CSS step cannot find it'
        );
    }

    /**
     * The calendar head's skeleton draws the strip's first render: its classes are the strip's, and the
     * preload's style geometry is calendar.ts's.
     *
     * Changes that must make it fail: a class the strip no longer writes; the pulse disc or the ring's
     * column out of step with calendar.ts.
     *
     * @return void
     */
    public function test_the_calendar_head_skeleton_is_the_strips_first_render(): void {
        $markup = $this->template('calendar_skeleton.mustache');
        $client = $this->source('js/esm/src/CalendarStrip.tsx') . $this->source('js/esm/src/CalendarLine.tsx');
        preg_match_all('/\bclass="([^"]*)"/', $markup, $matches);
        $tokens = [];
        foreach ($matches[1] as $value) {
            foreach (preg_split('/\s+/', preg_replace('/\{\{[^}]*\}\}/', ' ', $value)) as $token) {
                if (str_starts_with($token, 'compass-cal') && !str_ends_with($token, '-')) {
                    $tokens[] = $token;
                }
            }
        }
        $tokens = array_values(array_unique($tokens));
        $this->assertGreaterThanOrEqual(20, count($tokens), 'fewer than 20 compass-cal classes read in the head');
        foreach ($tokens as $token) {
            $pattern = '/(?<![\w-])' . preg_quote($token, '/') . '(?![\w-])/';
            $this->assertMatchesRegularExpression($pattern, $client, "{$token} is not the strip's");
        }

        $calendar = $this->source('js/esm/src/calendar.ts');
        preg_match('/const PULSE_DISC_PX = (\d+);/', $calendar, $pulse);
        preg_match('/export const RING_PITCH_PX = (\d+);/', $calendar, $pitch);
        preg_match('/const RING_GAP_PX = (\d+);/', $calendar, $ringgap);
        $this->assertMatchesRegularExpression(
            '/--block_compass-cal-disc: ' . $pulse[1] . 'px;/',
            $this->rule('.block_compass .compass-preload .compass-cal-style-pulse')
        );
        $ring = $this->rule('.block_compass .compass-preload .compass-cal-style-ring');
        $this->assertMatchesRegularExpression('/--block_compass-cal-col: ' . ((int) $pitch[1] - (int) $ringgap[1]) . 'px;/', $ring);
        $this->assertMatchesRegularExpression('/--block_compass-cal-gap: ' . $ringgap[1] . 'px;/', $ring);
    }
}
