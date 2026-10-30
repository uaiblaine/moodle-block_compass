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

use advanced_testcase;
use PHPUnit\Framework\Attributes\CoversNothing;

/**
 * Up next does no idle work the compositor or a hidden tab could spare, pinned by reading the sources.
 *
 * The performance audit's item 8 (docs/performance-audit/PLAN.md): the minute tick lives in the region
 * (UpNext.tsx), not in the strip that hosts the hook, so a minute re-renders the region alone; the tick
 * stops while the page is hidden and evaluates at once when it is shown; and the dot on "now" pulses with
 * a pseudo-element that animates transform and opacity only, never a box-shadow that restyles the page
 * every frame. No JavaScript runner or browser holds this, so the sources are read.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversNothing]
final class upnext_idle_rules_test extends advanced_testcase {
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
     * The text of a source from a start up to an end, both found.
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
     * The stylesheet without its comments.
     *
     * @return string The CSS.
     */
    private function css(): string {
        return preg_replace('#/\*.*?\*/#s', '', $this->source('styles.css'));
    }

    /**
     * The minute is the region's: the strip holds no interval, the region ticks and tells the strip only what moved.
     *
     * Vacuity guards: the region's interval and the hook's advance() are found, and the hook still sets the
     * gate's single timer, so the strip's file is scanned for a real reason.
     */
    public function test_the_minute_tick_lives_outside_the_strip(): void {
        $strip = $this->source('js/esm/src/CalendarStrip.tsx');
        $this->assertStringNotContainsString('setInterval', $strip, 'the strip holds no interval');
        $this->assertStringNotContainsString('60000', $strip, 'the strip holds no minute');

        $upnext = $this->source('js/esm/src/UpNext.tsx');
        $hook = $this->slice($upnext, 'export const useUpNext', 'const afterToday');
        $this->assertStringNotContainsString('setInterval', $hook, 'the hook, hosted by the strip, holds no interval');
        $this->assertStringContainsString('const advance = ', $hook, 'vacuity: the hook hands the region its advance()');
        $this->assertStringContainsString('window.setTimeout', $hook, 'vacuity: the gate timer is still the hook\'s');

        $region = substr($upnext, strpos($upnext, 'const UpNext = ('));
        $this->assertStringContainsString('window.setInterval(tick, 60000)', $region, 'the region ticks each minute');
        $this->assertStringContainsString('live.current.advance()', $region, 'the tick tells the hook');
    }

    /**
     * The tick stops while the page is hidden and evaluates at once when it is shown.
     */
    public function test_the_tick_pauses_while_hidden_and_resumes_on_visibilitychange(): void {
        $upnext = $this->source('js/esm/src/UpNext.tsx');
        $region = substr($upnext, strpos($upnext, 'const UpNext = ('));
        $effect = $this->slice($region, '// The minute: one timer', '}, [active]);');

        $this->assertStringContainsString('document.hidden', $effect, 'the tick looks at whether the page is hidden');
        $this->assertStringContainsString("addEventListener('visibilitychange'", $effect, 'and listens to its return');
        $this->assertStringContainsString("removeEventListener('visibilitychange'", $effect, 'and lets go');
        $start = $this->slice($effect, 'const start = ', 'const onchange');
        $this->assertMatchesRegularExpression('/if \(document\.hidden\) \{\s*return;\s*\}/', $start, 'no timer starts hidden');
        $shown = $this->slice($effect, 'const onchange = ', 'document.addEventListener');
        $this->assertMatchesRegularExpression('/tick\(\);\s*start\(\);/', $shown, 'shown, it evaluates at once and resumes');

        // The 15 minutes away rule is the hook's, unchanged.
        $this->assertStringContainsString('away >= AWAY_MS', $upnext, 'the new ask after 15 minutes hidden stays');
    }

    /**
     * The dot's pulse animates transform and opacity only, on a pseudo-element.
     */
    public function test_the_dot_pulse_animates_no_box_shadow(): void {
        $css = $this->css();
        $pattern = '/@keyframes block_compass-soon-pulse\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/';
        $this->assertSame(1, preg_match($pattern, $css, $keyframes));
        $body = $keyframes[1];
        $this->assertStringNotContainsString('box-shadow', $body, 'a box-shadow restyles the page every frame');
        $this->assertStringContainsString('transform: scale(', $body, 'the ring spreads by scale');
        $this->assertStringContainsString('opacity:', $body, 'and fades');
        $properties = [];
        preg_match_all('/([a-z-]+)\s*:/', $body, $found);
        foreach ($found[1] as $property) {
            $properties[$property] = true;
        }
        $this->assertEqualsCanonicalizing(['transform', 'opacity'], array_keys($properties), 'only the compositor\'s properties');

        $this->assertSame(1, preg_match('/\.block_compass \.compass-soon-dot::after\s*\{([^{}]*)\}/', $css, $ring), 'the ring');
        $this->assertStringContainsString('animation: block_compass-soon-pulse', $ring[1], 'the pseudo-element pulses');
        $this->assertSame(1, preg_match('/\.block_compass \.compass-soon-dot\s*\{([^{}]*)\}/', $css, $dot), 'the dot');
        $this->assertStringNotContainsString('animation', $dot[1], 'the dot itself holds still');
        $this->assertStringContainsString('background: var(--block_compass-cal-accent)', $dot[1], 'and keeps its fill');
    }

    /**
     * Reduced motion removes the animation from the ring.
     */
    public function test_reduced_motion_removes_the_pulse(): void {
        $css = $this->css();
        $pattern = '/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{((?:[^{}]*\{[^{}]*\})*)[^{}]*\}/';
        $this->assertGreaterThan(0, preg_match_all($pattern, $css, $media), 'vacuity: the query');
        $reduced = implode("\n", $media[1]);
        $this->assertMatchesRegularExpression(
            '/\.block_compass \.compass-soon-dot::after\s*\{\s*animation:\s*none;/',
            $reduced,
            'under reduced motion the ring holds still'
        );
    }
}
