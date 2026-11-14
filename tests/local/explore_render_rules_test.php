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
 * every row for the suggestions per key: the performance audit's second finding (docs/performance-audit/PLAN.md,
 * item 2). The rules here: the per-row components and the group are memoised; every prop Explore and the group
 * hand them is kept between renders (no arrow, no literal array or object written in the tag), and so is the
 * details store's object; full mode filters from deferred copies of the applied term and of the box, so the
 * keystroke commits first; the facet count builds its per-query and per-selection values once, not per row. The
 * Hidden group (ADR-021 decision 1) takes the archive's path in every place the archive has one, and its rows draw no
 * pill of their own. No JavaScript runner holds this, so the sources are read.
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
        // The kinds (ADR-021 decision 2.3): one array for the mount, kept from the first payload; NO_KINDS before it.
        $this->assertSame('rowkinds', $group['kinds']);
        $this->assertSame('rowkinds', $this->props($this->tags($explore, 'RowList')[0])['kinds']);
        $this->assertStringContainsString('const NO_KINDS: RowKind[] = [];', $explore);
        $this->assertStringContainsString('const rowkinds = kinds ?? NO_KINDS;', $explore);
        $this->assertStringContainsString('setKinds((current) => current ?? payload.kinds ?? NO_KINDS);', $explore);
        $this->assertSame(1, substr_count($explore, 'setKinds('), 'the kinds are set from more than the first payload');
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
        $this->assertStringContainsString("const isopen = (!paged && term !== '' && !ondemand(group.id))", $explore);

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

    /**
     * The client's reserved group ids are the server's: dormancy's three constants, which get_inventory_rows accepts.
     *
     * Vacuity guard: the three constants are read out of types.ts.
     *
     * Changes that must make it fail: GROUP_INVISIBLE (or either sibling) given another number on one side.
     *
     * @return void
     */
    public function test_the_reserved_group_ids_match_the_server(): void {
        preg_match_all('/^export const GROUP_(\w+) = (-?\d+);$/m', $this->source('types.ts'), $matches, PREG_SET_ORDER);
        $client = [];
        foreach ($matches as [, $name, $value]) {
            $client[$name] = (int) $value;
        }
        $this->assertSame(
            [
                'DORMANT' => dormancy::GROUP_DORMANT,
                'ARCHIVED' => dormancy::GROUP_ARCHIVED,
                'INVISIBLE' => dormancy::GROUP_INVISIBLE,
            ],
            $client,
            'types.ts and dormancy.php disagree about the groups that are not categories'
        );
        $this->assertSame(array_values($client), \block_compass\external\get_inventory_rows::RESERVED_GROUPS);
    }

    /**
     * The Hidden group is fetched, filtered, counted and kept closed as the archive is (ADR-021 decision 1.4): one
     * predicate names both, and every place that read the archived id alone reads it.
     *
     * Changes that must make it fail: the invisible id left out of ondemand(); the group paged only in paged mode;
     * its pages not fetched to the end in full mode; its rows missing from the name map, from "N courses shown" or
     * from its own slice; a search opening it.
     *
     * @return void
     */
    public function test_the_hidden_group_takes_the_archives_path(): void {
        $explore = $this->source('Explore.tsx');
        $this->assertStringContainsString(
            'const ondemand = (id: number): boolean => id === GROUP_ARCHIVED || id === GROUP_INVISIBLE;',
            $explore
        );
        $this->assertStringContainsString(
            'const pagedgroup = useCallback((id: number): boolean => paged || ondemand(id), [paged]);',
            $explore
        );
        $this->assertStringContainsString('if (!page.loaded || (!paged && ondemand(group.id) && page.hasmore)) {', $explore);
        $this->assertStringContainsString('const invisiblerows = pages[GROUP_INVISIBLE]?.rows;', $explore);
        $this->assertStringContainsString('invisiblerows?.forEach((row) => map.set(row.id, normalise(row.name)));', $explore);
        $this->assertStringContainsString('}, [data, archivedrows, invisiblerows]);', $explore);
        $this->assertStringContainsString(
            'const invisiblevisible = useMemo(() => passedOf(invisiblepage), [passedOf, invisiblepage]);',
            $explore
        );
        $this->assertStringContainsString(
            'const archivedvisible = useMemo(() => passedOf(archivedpage), [passedOf, archivedpage]);',
            $explore
        );
        $this->assertMatchesRegularExpression(
            '/\+ archivedvisible\.length\s+\+ invisiblevisible\.length,\s+\[visible, archivedvisible, invisiblevisible\]/',
            $explore,
            'the Hidden group\'s matching rows are not in "N courses shown"'
        );
        $this->assertStringContainsString(
            'const fetched = group.id === GROUP_INVISIBLE ? invisiblevisible : archivedvisible;',
            $explore
        );
        $this->assertStringContainsString("const isopen = (!paged && term !== '' && !ondemand(group.id))", $explore);
        // No other place may read the archived id alone where the archive is meant: what is left is the archive's own
        // control (unarchive) and its slice's choice.
        $this->assertSame(1, substr_count($explore, 'group.id === GROUP_ARCHIVED'), 'a place reads the archived id alone');
        $this->assertStringContainsString('archived={group.id === GROUP_ARCHIVED}', $explore);
    }

    /**
     * A hidden row draws "Hidden from students" where it sits among visible ones and never inside the Hidden group
     * (ADR-021 answer 4): Explore tells each group, the props reach both views, and both views draw the pill only
     * when told and when the row is hidden.
     *
     * Vacuity guard: the pill is the plugin's own state pill, in core's words.
     *
     * Changes that must make it fail: the group's prop always true; the prop dropped on the way; a view drawing the
     * pill on invis alone; the pill drawn with another class or label.
     *
     * @return void
     */
    public function test_the_hidden_pill_is_not_drawn_inside_the_hidden_group(): void {
        $explore = $this->source('Explore.tsx');
        $this->assertSame('group.id !== GROUP_INVISIBLE', $this->props($this->tags($explore, 'Group')[0])['markhidden']);
        $this->assertSame('markhidden', $this->props($this->tags($this->source('Group.tsx'), 'RowList')[0])['markhidden']);
        $list = $this->source('RowList.tsx');
        foreach (['Row', 'RowCard'] as $component) {
            $this->assertSame('markhidden', $this->props($this->tags($list, $component)[0])['markhidden'], $component);
            $this->assertStringContainsString(
                '{markhidden && row.invis && <InvisiblePill label={labels.hiddenfromstudents} />}',
                $this->source($component . '.tsx'),
                "{$component} draws the pill without asking where it is"
            );
            $this->assertSame(1, substr_count($this->source($component . '.tsx'), '<InvisiblePill'), $component);
        }
        $this->assertStringContainsString(
            "<span className=\"compass-state compass-state-invisible\">\n"
                . '        <i className="fa fa-eye-slash" aria-hidden="true"></i>',
            $this->source('StatePill.tsx')
        );
    }
}
