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

/**
 * Client policies that no JavaScript runner holds, pinned by reading the sources.
 *
 * The 2026-10-09 QA fixes live in the React client: Clear filters empties the search, a count of
 * one reads in the singular, and a failed read is asked again before the notice appears. Each test
 * names the rule and fails when the source stops saying it.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @coversNothing
 */
final class client_policy_test extends advanced_testcase {
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
     * The body of one named function or constant in a source, up to its closing brace line.
     *
     * @param string $source The file.
     * @param string $start The text the declaration starts with.
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
     * Clear filters empties the search box and applies the empty text at once.
     *
     * @return void
     */
    public function test_clear_filters_clears_the_search(): void {
        $body = $this->slice($this->source('Explore.tsx'), 'const clearFilters = useCallback', '}, [chip, selection');

        $this->assertStringContainsString("setQuery('')", $body);
        $this->assertStringContainsString("setApplied('')", $body, 'the debounce must not keep the name filter alive');
        $this->assertStringContainsString("setChip('all')", $body);
        $this->assertStringContainsString('setSelection({})', $body);
    }

    /**
     * The Clear control is live while only a search is active, and the panel is told so.
     *
     * @return void
     */
    public function test_clear_control_counts_the_search(): void {
        $this->assertStringContainsString("searching={query !== ''}", $this->source('Explore.tsx'));
        $this->assertStringContainsString('(searching ? 1 : 0)', $this->source('FilterPanel.tsx'));
    }

    /**
     * The remembered toolbar never carries the query, so clearing it keeps the preference true.
     *
     * @return void
     */
    public function test_remembered_toolbar_holds_no_query(): void {
        $source = $this->source('Explore.tsx');

        $this->assertStringContainsString('const state: ExploreState = {sort, chip, cf: selection, panel: panelopen};', $source);
        $this->assertStringNotContainsString('query', $this->slice($this->source('types.ts'), 'ExploreState', '};'));
    }

    /**
     * Every singular string exists in both languages, with the same placeholder, and is exported.
     *
     * @return void
     */
    public function test_singular_strings_exist_in_both_languages_and_are_exported(): void {
        $root = dirname(__DIR__, 2);
        $strings = [];
        foreach (['en', 'pt_br'] as $lang) {
            $string = [];
            include($root . '/lang/' . $lang . '/block_compass.php');
            $strings[$lang] = $string;
        }
        $exporter = file_get_contents($root . '/classes/output/block.php');
        $ones = array_filter(array_keys($strings['en']), static fn($key) => str_ends_with($key, '_one'));

        $this->assertCount(10, $ones);
        foreach ($ones as $key) {
            $this->assertArrayHasKey($key, $strings['pt_br'], $key);
            $this->assertArrayHasKey(substr($key, 0, -4), $strings['en'], $key);
            $this->assertSame(
                str_contains($strings['en'][substr($key, 0, -4)], '{$a}'),
                str_contains($strings['en'][$key], '{$a}'),
                "{$key} placeholder parity with its plural"
            );
            $this->assertSame(str_contains($strings['en'][$key], '{$a}'), str_contains($strings['pt_br'][$key], '{$a}'), $key);
            $this->assertStringContainsString("'{$key}'", $exporter, "{$key} is not exported to the client");
        }
        $this->assertSame('{$a} course', $strings['en']['coursesingroup_one']);
        $this->assertSame('{$a} curso', $strings['pt_br']['coursesingroup_one']);
    }

    /**
     * The client picks the singular for exactly one, in every place that states a count.
     *
     * @return void
     */
    public function test_the_client_chooses_the_singular_for_one(): void {
        $tick = chr(96);
        $this->assertStringContainsString('count === 1 && labels[' . $tick . '${key}_one' . $tick . ']', $this->source('str.ts'));
        $this->assertStringContainsString("fillCount(labels, 'coursesingroup', count)", $this->source('Group.tsx'));
        $this->assertStringContainsString("fillCount(labels, 'filteractive', count)", $this->source('FilterToggle.tsx'));
        $explore = $this->source('Explore.tsx');
        $this->assertStringContainsString("fillCount(labels, 'resultsshown', shown)", $explore);
        $this->assertStringContainsString("fillCount(labels, 'resultsshown', answer.rows.length)", $explore);
        $this->assertStringContainsString("fillCount(labels, 'archiveallconfirm', rows.length)", $explore);
        $block = $this->source('Block.tsx');
        $this->assertStringContainsString("fillCount(labels, 'pendingnotice', pendingcount)", $block);
        $this->assertStringContainsString('fillCount(labels, text, count)', $block);
        $this->assertStringContainsString('data.counts.more === 1 && labels.ghost_more_one ? labels.ghost_more_one', $block);
    }

    /**
     * Reads retry twice, 2000 ms apart, after any failure; writes go through the bare call.
     *
     * @return void
     */
    public function test_reads_retry_twice_two_seconds_apart_and_writes_never(): void {
        $source = $this->source('repository.ts');

        $this->assertStringContainsString('const RETRY_ATTEMPTS = 2;', $source);
        $this->assertStringContainsString('const RETRY_DELAY_MS = 2000;', $source);
        $this->assertStringContainsString('await sleep(RETRY_DELAY_MS);', $source);
        $loop = $this->slice($source, 'const read = async', 'export const getAttention');
        $this->assertStringContainsString('if (attempt >= RETRY_ATTEMPTS) {', $loop);
        $this->assertStringNotContainsString('isTransportFailure', $loop, 'a server exception is retried too');
        foreach (
            [
                'getAttention' => 'block_compass_get_attention',
                'getCardDetails' => 'block_compass_get_card_details',
                'getInventory' => 'block_compass_get_inventory',
                'getInventoryRows' => 'block_compass_get_inventory_rows',
                'searchInventory' => 'block_compass_search_inventory',
            ] as $name => $service
        ) {
            $this->assertMatchesRegularExpression("/read<[^>]*>\\('{$service}'/", $source, "{$name} must go through read()");
        }
        $this->assertStringContainsString("call<unknown>('core_course_set_favourite_courses'", $source);
        $this->assertDoesNotMatchRegularExpression('/read<[^>]*>\(\'core_/', $source);
    }
}
