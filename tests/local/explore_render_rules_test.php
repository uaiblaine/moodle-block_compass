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
 * Tier 3 renders on a keystroke only what the keystroke changed, pinned by reading the sources.
 *
 * Typing in tier 3's search rendered every row of every group on each key and on each applied term, and filtered
 * every row for the suggestions per key: the performance audit's second finding (docs/performance-audit/PLAN.md on main,
 * item 2). The rules here: the per-row components and the group are memoised; every prop Explore and the group
 * hand them is kept between renders (no arrow, no literal array or object written in the tag), and so is the
 * details store's object; full mode filters from deferred copies of the applied term and of the box, so the
 * keystroke commits first; the facet count builds its per-query and per-selection values once, not per row. No
 * JavaScript runner holds this, so the sources are read.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversNothing]
final class explore_render_rules_test extends advanced_testcase {
    /**
     * One client source.
     *
     * @param string $name The file name under js/esm/src.
     * @return string Its contents.
     */
    private function source(string $name): string {
        $path = dirname(__DIR__, 2) . '/js/esm/src/' . $name;
        $this->assertFileExists($path);

        return file_get_contents($path);
    }

    /**
     * Every opening tag of one component in a source, read to its own end past the braces of its props.
     *
     * @param string $source One file.
     * @param string $name The component.
     * @return array The tags, as written.
     */
    private function tags(string $source, string $name): array {
        $tags = [];
        preg_match_all('/<' . preg_quote($name, '/') . '(?![\w-])/', $source, $starts, PREG_OFFSET_CAPTURE);
        foreach ($starts[0] as [, $offset]) {
            $depth = 0;
            $length = strlen($source);
            for ($index = $offset + 1; $index < $length; $index++) {
                $char = $source[$index];
                if ($char === '{') {
                    $depth++;
                } else if ($char === '}') {
                    $depth--;
                } else if ($depth === 0 && $char === '>') {
                    $tags[] = substr($source, $offset, $index - $offset + 1);
                    break;
                }
            }
        }

        return $tags;
    }

    /**
     * The braced props of one tag: name => the expression between its braces.
     *
     * @param string $tag One tag, from tags().
     * @return array Prop name => expression.
     */
    private function props(string $tag): array {
        $props = [];
        preg_match_all('/\s([a-zA-Z]\w*)=\{/', $tag, $matches, PREG_OFFSET_CAPTURE);
        foreach ($matches[1] as [$name, $offset]) {
            $open = $offset + strlen($name) + 1;
            if (isset($props[$name]) || $this->depth($tag, $offset) !== 0) {
                continue;
            }
            $depth = 0;
            $length = strlen($tag);
            for ($index = $open; $index < $length; $index++) {
                if ($tag[$index] === '{') {
                    $depth++;
                } else if ($tag[$index] === '}') {
                    $depth--;
                    if ($depth === 0) {
                        break;
                    }
                }
            }
            $props[$name] = trim(substr($tag, $open + 1, $index - $open - 1));
        }

        return $props;
    }

    /**
     * How many braces are open at an offset of a tag: a prop is one at depth 0.
     *
     * @param string $tag One tag.
     * @param int $offset The offset.
     * @return int The depth.
     */
    private function depth(string $tag, int $offset): int {
        $before = substr($tag, 0, $offset);

        return substr_count($before, '{') - substr_count($before, '}');
    }

    /**
     * Tier 3's per-row components, the list that holds them and the group are memoised.
     *
     * Changes that must make it fail: any of the four exported bare.
     *
     * @return void
     */
    public function test_the_per_row_components_and_the_group_are_memoised(): void {
        foreach (['Row', 'RowCard', 'RowList', 'Group'] as $name) {
            $source = $this->source($name . '.tsx');
            $this->assertStringContainsString(
                "export default memo({$name});",
                $source,
                "{$name} renders on every render of tier 3"
            );
            $this->assertStringNotContainsString("export default {$name};", $source);
        }
    }

    /**
     * What Explore and the group hand the memoised components is kept between renders: no arrow, no literal
     * array or object, no element written in the tag; the empty lists are one array; the details store hands
     * back one object per change of what it holds.
     *
     * Vacuity guards: each tag is found, and its handlers are read (a prop list that came back empty would
     * pass every check).
     *
     * Changes that must make it fail: an inline handler or literal on a Group, RowList, Row or RowCard tag, the
     * Archive all bar built in the tag, a new [] for an empty list, or the store's object rebuilt per render.
     *
     * @return void
     */
    public function test_the_props_of_the_memoised_components_are_stable(): void {
        $where = [
            'Explore.tsx' => ['Group' => 1, 'RowList' => 1],
            'Group.tsx' => ['RowList' => 1],
            'RowList.tsx' => ['Row' => 1, 'RowCard' => 1],
        ];
        foreach ($where as $file => $components) {
            $source = $this->source($file);
            foreach ($components as $component => $count) {
                $tags = $this->tags($source, $component);
                $this->assertCount($count, $tags, "{$file}: <{$component}> is not rendered from one place");
                foreach ($tags as $tag) {
                    $props = $this->props($tag);
                    $this->assertArrayHasKey('onToggleFavourite', $props, "{$file}: the props of <{$component}> were not read");
                    foreach ($props as $name => $expression) {
                        $this->assertDoesNotMatchRegularExpression(
                            '/=>|^\[|^\{|<[A-Za-z]|\?\? \[\]|\|\| \[\]/',
                            $expression,
                            "{$file}: <{$component}> {$name}={{$expression}} is a new value on every render"
                        );
                    }
                }
            }
        }
        $explore = $this->source('Explore.tsx');
        $group = $this->props($this->tags($explore, 'Group')[0]);
        $this->assertSame('toggleGroup', $group['onToggle']);
        $this->assertSame('showMore', $group['onShowMore']);
        $this->assertSame('retryGroup', $group['onRetry']);
        $this->assertSame('group.id === GROUP_DORMANT ? archiveallbar : undefined', $group['toolbar']);
        $this->assertStringContainsString('const archiveallbar = useMemo(', $explore);
        $this->assertStringContainsString('const slices = useMemo(', $explore);
        $this->assertStringContainsString('const flat = paged ? (keptHits ?? NO_ROWS) : flatrows;', $explore);
        $this->assertStringContainsString('const rows = visible.get(group.id) ?? NO_ROWS;', $explore);
        $this->assertStringContainsString(
            "return useMemo(\n        (): RowDetails => ({records, waiting, failed, retry, observe}),\n"
                . "        [records, waiting, failed, retry, observe]\n    );",
            $this->source('rowdetails.ts'),
            'the details store hands every group a new object on every render of tier 3'
        );
    }

    /**
     * Full mode filters from deferred copies: the rows, the counts and the opened groups from the applied term's,
     * the suggestions from the box's. Paged mode's search still asks with applied itself, after its debounce.
     *
     * Changes that must make it fail: either copy no longer deferred, the filter or the counts reading applied,
     * the suggestions filtering on every keystroke, or the debounces changed.
     *
     * @return void
     */
    public function test_full_mode_filters_from_deferred_values(): void {
        $explore = $this->source('Explore.tsx');
        $this->assertStringContainsString('const term = useDeferredValue(applied);', $explore);
        $this->assertStringContainsString('const typed = useDeferredValue(query);', $explore);
        $this->assertStringContainsString(
            'const criteria = useMemo((): Criteria => ({scope, star, selection, query: term}), [scope, star, selection, term]);',
            $explore
        );
        $this->assertStringContainsString('const facets = useMemo(() => countFacets(term), [countFacets, term]);', $explore);
        $this->assertStringContainsString("const isopen = (!paged && term !== '' && group.id !== GROUP_ARCHIVED)", $explore);

        $start = strpos($explore, 'const linecourses = useMemo(');
        $this->assertNotFalse($start, 'the suggestions are not computed where they were');
        $end = strpos($explore, '}, [', $start);
        $body = substr($explore, $start, $end - $start);
        $this->assertStringContainsString('wordsOf(typed)', $body);
        $this->assertDoesNotMatchRegularExpression('/\bquery\b/', $body, 'the suggestions filter every row on every keystroke');
        $this->assertStringContainsString('}, [typed, paged, keptHits, visible, normalised]);', $explore);

        $this->assertStringContainsString('const answer = await searchInventory(applied, filters);', $explore);
        $this->assertStringContainsString('const DEBOUNCE_MS = 150;', $explore);
        $this->assertStringContainsString('const PAGE_DEBOUNCE_MS = 300;', $explore);
    }

    /**
     * The facet count builds the query's words and the selections' pairs once per count, not once per row.
     *
     * Changes that must make it fail: a selection copied, or the query normalised, inside the row loop.
     *
     * @return void
     */
    public function test_the_facet_count_allocates_nothing_per_query_in_its_row_loop(): void {
        $explore = $this->source('Explore.tsx');
        $start = strpos($explore, 'const countFacets = useCallback(');
        $this->assertNotFalse($start, 'countFacets() is not in Explore.tsx any more');
        $end = strpos($explore, '}, [data, paged, scope, star, selection, fieldkeys, factsof]);', $start);
        $this->assertNotFalse($end, 'countFacets() does not end where it did');
        $body = substr($explore, $start, $end - $start);
        $loop = strpos($body, 'data.groups.forEach(');
        // Vacuity guard: the loop is there to read, and the hoisted values before it.
        $this->assertNotFalse($loop, 'the row loop of countFacets() is not where it was');
        $before = substr($body, 0, $loop);
        $inside = substr($body, $loop);
        $this->assertStringContainsString('const querywords = wordsOf(query);', $before);
        $this->assertStringContainsString('const pairs = Object.entries(selection);', $before);
        $this->assertStringContainsString('const otherpairs = fieldkeys.map(', $before);
        $this->assertStringContainsString('passesPairs(facts.cf, fieldkeys, otherpairs[index])', $inside);
        $this->assertDoesNotMatchRegularExpression(
            '/\{\.\.\.selection\}|Object\.entries\(|\bmatches\(|wordsOf\(|passesSelection\(/',
            $inside,
            'the facet count builds a value per row that it could build once'
        );
    }
}
