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
 * Source rules of the ghost card's way into tier 3 (ADR-022).
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
 * The ghost is drawn for a special group alone, with no "+0", and names the groups in its accessible name.
 *
 * No JavaScript runner holds the client, so the rules are pinned by reading the sources, as
 * client_policy_test does; each test names the rule and the change that must make it fail.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversNothing]
final class ghost_rules_test extends advanced_testcase {
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
     * A slice of a source from a start text to the first end text after it.
     *
     * @param string $source The file.
     * @param string $start The text the slice starts with.
     * @param string $end The text that ends it.
     * @return string The slice.
     */
    private function slice(string $source, string $start, string $end): string {
        $from = strpos($source, $start);
        $this->assertNotFalse($from, "{$start} not found");
        $to = strpos($source, $end, $from);
        $this->assertNotFalse($to, "{$end} not found after {$start}");

        return substr($source, $from, $to - $from);
    }

    /**
     * One rule decides whether the ghost is drawn, and a special group alone draws it.
     *
     * ghostDrawn() is true for "+N" or for either special count, and both the ghost and the
     * remembered shape ask it, so the skeleton keeps the place the ghost takes. The empty state
     * says "no courses" only when the ghost is not drawn either: a teacher whose every course is
     * hidden is enrolled.
     *
     * Changes that must make it fail: the ghost drawn on more alone again (a reader whose courses
     * fit the strips loses the way into tier 3), either special count left out of the rule, or
     * the shape recording more alone.
     *
     * @return void
     */
    public function test_a_special_group_alone_draws_the_ghost(): void {
        $shape = $this->source('tier1shape.ts');
        $rule = $this->slice($shape, 'export const ghostDrawn', ";\n");
        $this->assertStringContainsString('counts.more > 0', $rule);
        $this->assertStringContainsString('counts.invisible > 0', $rule);
        $this->assertStringContainsString('counts.archived > 0', $rule);
        $this->assertStringContainsString('ghost: ghostDrawn(data.counts),', $shape);

        $block = $this->source('Block.tsx');
        $ghost = $this->slice($block, 'const ghost = useMemo(', '}, [data, exploring, labels]);');
        $this->assertStringContainsString('data && ghostDrawn(data.counts) && !exploring', $ghost);
        $this->assertStringNotContainsString('data.counts.more > 0', $ghost);
        $this->assertStringContainsString('line: specialLine(labels, data.counts)', $ghost);
        $this->assertStringContainsString(
            'data.counts.total === 0 && !ghostDrawn(data.counts) ? labels.nocourses : labels.emptyattention',
            $block
        );
    }

    /**
     * The line names only the groups that hold something, Hidden first, each count in its own singular.
     *
     * Changes that must make it fail: a group named with a zero count, the plural string used for
     * one, or a dynamic string id.
     *
     * @return void
     */
    public function test_the_line_names_only_the_non_empty_groups(): void {
        $line = $this->slice($this->source('Block.tsx'), 'const specialLine', "].filter((part) => part !== '').join(' · ');");
        $this->assertStringContainsString(
            "counts.invisible > 0 ? fillCount(labels, 'ghost_invisible', counts.invisible) : ''",
            $line
        );
        $this->assertStringContainsString("counts.archived > 0 ? fillCount(labels, 'ghost_archived', counts.archived) : ''", $line);
        $this->assertLessThan(strpos($line, "'ghost_archived'"), strpos($line, "'ghost_invisible'"), 'Hidden comes first');

        foreach (['en', 'pt_br'] as $lang) {
            $string = [];
            include(dirname(__DIR__, 2) . "/lang/{$lang}/block_compass.php");
            foreach (['ghost_invisible', 'ghost_invisible_one', 'ghost_archived', 'ghost_archived_one'] as $key) {
                $this->assertStringContainsString('{$a}', $string[$key] ?? '', "{$lang} {$key}");
            }
        }
    }

    /**
     * With nothing to count the card shows no "+0": its call to action stands alone, then the line, inside the button.
     *
     * The line sits inside the button in both shapes, so it is part of the accessible name; the
     * count, its text and the "+" are drawn only while the count is positive.
     *
     * Changes that must make it fail: "+{count}" drawn whatever the count, or the line moved out
     * of the button.
     *
     * @return void
     */
    public function test_a_zero_count_draws_no_plus_zero_and_the_line_is_in_the_name(): void {
        $ghost = $this->source('Ghost.tsx');
        $button = $this->slice($ghost, '<button', '</button>');
        $this->assertStringContainsString('{count > 0 ? (', $button, 'the count decides which shape is drawn');
        $counted = $this->slice($button, '{count > 0 ? (', ') : (');
        $this->assertStringContainsString('+{count}', $counted);
        $this->assertStringContainsString('compass-ghost-line', $counted);
        $alone = $this->slice($button, ') : (', ')}');
        $this->assertStringNotContainsString('{count}', $alone);
        $this->assertStringContainsString('<span className="compass-ghost-cta compass-ghost-alone">{cta}</span>', $alone);
        $this->assertStringContainsString('compass-ghost-line', $alone);
        $this->assertSame(1, substr_count($ghost, '+{count}'), 'the count is drawn in one place');
    }

    /**
     * The empty-state sentence yields to a ghost drawn for the special groups alone, and only to that one.
     *
     * With "+N" at 0 and a non-empty line, the ghost already says what is there ("1 hidden"), so
     * "Nothing to show here right now" under it contradicts the screen. A ghost with "+N" above 0
     * keeps the sentence, and no ghost keeps the "not enrolled in any course yet" one (ADR-022).
     *
     * Changes that must make it fail: the sentence drawn under the line again, or the suppression
     * widened to every ghost (the control: "+N" above 0 still draws it).
     *
     * @return void
     */
    public function test_the_empty_sentence_is_not_drawn_under_a_ghost_for_the_special_groups_alone(): void {
        $block = $this->source('Block.tsx');
        $this->assertStringContainsString(
            'const specialonly = data !== null && data.counts.more === 0 && specialLine(labels, data.counts) !== \'\';',
            $block
        );
        $this->assertStringContainsString('{data && shown === 0 && !specialonly && (', $block);
        // Controls: the sentences themselves are still chosen as before.
        $this->assertStringContainsString(
            'data.counts.total === 0 && !ghostDrawn(data.counts) ? labels.nocourses : labels.emptyattention',
            $block
        );
        $this->assertStringNotContainsString('more >= 0 && specialLine', $block, 'a ghost with "+N" keeps the sentence');
    }

    /**
     * "No course matches." is not drawn under a special group while nothing is typed, starred, scoped or selected.
     *
     * Hidden and archived courses stay out of the total (ADR-021), so with the filter at rest the
     * listed total can be 0 while the Hidden group holds rows. With a query, the star, a scope or a
     * selection active the sentence stays.
     *
     * Changes that must make it fail: the sentence drawn under a special group again, or an active
     * query (the control) no longer counting as a filter.
     *
     * @return void
     */
    public function test_no_match_sentence_yields_to_a_special_group_only_while_unfiltered(): void {
        $explore = $this->source('Explore.tsx');
        $this->assertStringContainsString(
            "const unfiltered = term === '' && !star && scope === 'all' && Object.keys(selection).length === 0;",
            $explore
        );
        $drawn = $this->slice($explore, 'const specialdrawn', ');');
        $this->assertStringContainsString('group.id === GROUP_DORMANT || ondemand(group.id)', $drawn);
        $this->assertStringContainsString('slice.show && slice.count > 0', $drawn);
        $this->assertStringContainsString('const noresults = nomatch && !(unfiltered && specialdrawn);', $explore);
        // Control: the sentence is still drawn from noresults, and the old test is the base of nomatch.
        $this->assertStringContainsString('{noresults && <p className="compass-noresults', $explore);
        $this->assertStringContainsString('const nomatch = paged ? keepsnothing', $explore);
    }
}
