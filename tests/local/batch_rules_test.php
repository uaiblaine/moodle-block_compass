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
 * The strip's first read and the news travel in one request, pinned by reading the sources.
 *
 * ADR-017 amendment 1 (the performance audit's item 6, docs/performance-audit/PLAN.md on main): once tier 1
 * has settled, with the open-courses line on and not hidden, get_strip_counts (the strip closed) or get_strip
 * (open) and get_news leave in one call([...]) of core's AMD core/ajax, reached through the bridge (5.2 has
 * no ES module ajax; amendment 1, decision 5), the strip's read first, started once by the block and handed
 * to the strip and to useNews(), each awaited under its consumer's sequence number. A read the batch did not
 * answer is asked again alone through read(), the batch counting as its first attempt. get_news joins nothing
 * else, and get_soon never joins. No JavaScript runner holds this, so the sources are read.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversNothing]
final class batch_rules_test extends advanced_testcase {
    /**
     * Every client source, keyed by file name.
     *
     * @return array File name => contents.
     */
    private function sources(): array {
        $sources = [];
        foreach (glob(dirname(__DIR__, 2) . '/js/esm/src/*.{ts,tsx}', GLOB_BRACE) as $path) {
            $sources[basename($path)] = file_get_contents($path);
        }
        $this->assertArrayHasKey('repository.ts', $sources, 'repository.ts is not in the scan');

        return $sources;
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
        $to = strpos($source, $end, $from);
        $this->assertNotFalse($to, "{$end} not found after {$start}");

        return substr($source, $from, $to - $from);
    }

    /**
     * The batch carries the strip's first read, then get_news, and the block starts it once.
     *
     * Core's service.php runs a batch's calls in order and stops at the first that fails, so the strip's read
     * goes first. The block starts the pair the first time tier 1 settles (answered or failed), with the strip's
     * open state as the strip last rendered it, only with the calendar and the line on and the line not hidden
     * for this sign-in, and in the same update as the strip's turn; the strip and the line await their shares.
     * Vacuity guards: the batch's function, the block's start and every consumer are found.
     *
     * Changes that must make it fail: the news first in the batch; the strip's method no longer chosen by the
     * open state; the pair started on every settle of tier 1, or while the line is hidden for this sign-in; the
     * strip no longer keeping the block's copy of its open state; a consumer asking alone in place of its share.
     *
     * @return void
     */
    public function test_the_strip_read_and_the_news_leave_in_one_batch_strip_first(): void {
        $sources = $this->sources();
        $repository = $sources['repository.ts'];
        $this->assertStringContainsString("loading = amd<AjaxModule>('core/ajax');", $repository, 'AMD core/ajax');
        $this->assertStringNotContainsString('@moodle/lms/core/ajax', $repository, '5.2 has no ES module ajax');
        $pair = $this->slice($repository, 'export const getStripWithNews = ', "\n};\n");
        $this->assertStringContainsString(
            "const stripmethod = open ? 'block_compass_get_strip' : 'block_compass_get_strip_counts';",
            $pair,
            'the strip\'s first read follows its shape: get_strip open, get_strip_counts closed'
        );
        $this->assertMatchesRegularExpression(
            "/ajaxModule\\(\\)\\.then\\(\\(ajax\\) => ajax\\.call\\(\\[\\s*\\{methodname: stripmethod, args: \\{\\}\\},\\s*"
                . "\\{methodname: 'block_compass_get_news', args: \\{\\}\\},\\s*\\]\\)\\)/",
            $pair,
            'one batch: the strip\'s read first, then get_news'
        );

        $block = $sources['Block.tsx'];
        $settle = $this->slice($block, 'const settleTier1 = useCallback(', '}, [config.calendar, config.news]);');
        $this->assertMatchesRegularExpression(
            '/^const settleTier1 = useCallback\(\(\): void => \{\s*if \(settled\.current\) \{\s*return;\s*\}\s*'
                . 'settled\.current = true;/',
            $settle,
            'the pair leaves once per load'
        );
        $this->assertStringContainsString(
            "if (config.calendar && line && line.enabled && line.signin <= 0) {\n"
                . "            setFirst(getStripWithNews(stripopen.current));\n        }\n        setCalendarturn(1);",
            $settle,
            'with the calendar and the line on and the line not hidden, in the update that gives the strip its turn'
        );
        $this->assertSame(2, substr_count($block, 'settleTier1();'), 'tier 1 settles answered and failed');
        $this->assertStringNotContainsString('setCalendarturn((current) => (current === 0 ? 1 : current));', $block);
        $this->assertStringContainsString('batched={first?.strip ?? null}', $block);
        $this->assertStringContainsString('stripopen={stripopen}', $block);
        $this->assertStringContainsString('useNews(config.news, newsready, calendarturn, first?.news ?? null)', $block);

        $strip = $sources['CalendarStrip.tsx'];
        $this->assertStringContainsString("    stripopen.current = open;\n", $strip, 'the block reads the shape the strip has');
        $this->assertSame(1, substr_count($strip, 'const answer = await (handed ?? getStrip());'));
        $this->assertSame(1, substr_count($strip, 'const answer = await (handed ?? getStripCounts());'));

        $line = $sources['OpenCourses.tsx'];
        $this->assertSame(1, substr_count($line, 'const got = await (handed ?? getNews());'));
        $this->assertSame(1, substr_count($line, 'ask(first);'), 'the first ask awaits the batch\'s news');
    }

    /**
     * A read the batch did not answer is asked again alone, through its own read(), once per consumer.
     *
     * On 5.2 core/ajax's call([...]) returns one promise per call: an answered strip read keeps its answer when
     * get_news fails, and a failed strip read rejects both (core's loop stopped before get_news). Each read
     * wraps its share of the batch in read() as its first attempt: the retries (two, 2 s apart, then its own
     * notice) ask that read alone through call(), never the pair. Each consumer takes its share for its first ask only; a Try
     * again, the strip's or tier 1's, asks alone. Vacuity guards: both shares and both consumers are found.
     *
     * Changes that must make it fail: a share awaited bare, outside read(); the batch awaited again on a retry;
     * the batch caught or retried as a pair; a consumer taking its share again on a Try again.
     *
     * @return void
     */
    public function test_a_failed_batch_asks_each_read_again_alone(): void {
        $sources = $this->sources();
        $repository = $sources['repository.ts'];
        $loop = $this->slice($repository, 'const read = async', 'export const getAttention');
        $this->assertStringContainsString(
            'const read = async<T>(methodname: string, args: Record<string, unknown>, first: Promise<T> | null = null)',
            $loop
        );
        $this->assertStringContainsString(
            'const answer = await (attempt === 0 && first !== null ? first : call<T>(methodname, args));',
            $loop,
            'the batch is the first attempt only; every retry asks this read alone'
        );

        $pair = $this->slice($repository, 'export const getStripWithNews = ', "\n};\n");
        $this->assertStringContainsString(
            "read<NewsAnswer>('block_compass_get_news', {}, batch.then((calls) => calls[1] as Promise<NewsAnswer>))",
            $pair,
            'the news goes through read(), the batch as its first attempt'
        );
        $this->assertStringContainsString(
            'read<StripPayload>(stripmethod, {}, batch.then((calls) => calls[0] as Promise<StripPayload>))',
            $pair,
            'the row goes through read(), the batch as its first attempt'
        );
        $this->assertStringContainsString(
            'read<StripCounts>(stripmethod, {}, batch.then((calls) => calls[0] as Promise<StripCounts>))',
            $pair,
            'the counts go through read(), the batch as its first attempt'
        );
        $this->assertSame(1, substr_count($pair, 'ajax.call('), 'the pair is asked once');
        $this->assertSame(3, substr_count($pair, 'batch.then('), 'every share comes from the one batch');
        $this->assertStringNotContainsString('.catch(', $pair, 'the batch\'s failure reaches each read');
        $this->assertStringNotContainsString('call<', $pair, 'no retry of the pair outside read()');

        $strip = $sources['CalendarStrip.tsx'];
        $this->assertStringContainsString(
            'const handed = batched !== null && batched.open && !firsttaken.current ? batched.answer : null;',
            $strip,
            'the row\'s share, for the first ask only'
        );
        $this->assertStringContainsString(
            'const handed = batched !== null && !batched.open && !firsttaken.current ? batched.answer : null;',
            $strip,
            'the counts\' share, for the first ask only'
        );
        $this->assertSame(2, substr_count($strip, "if (handed !== null) {\n            firsttaken.current = true;\n        }"));

        $line = $sources['OpenCourses.tsx'];
        $this->assertSame(2, substr_count($line, 'ask();'), 'tier 1\'s Try again and the line\'s own ask alone');
        $this->assertStringContainsString(
            'const ask = async(handed: Promise<NewsAnswer> | null = null): Promise<void> => {',
            $line
        );
    }

    /**
     * get_news is batched only beside the strip's first read, and get_soon never is.
     *
     * Up next's gate opens from the counts' own answer (calendar.ts, gateOpens()), so get_soon cannot join; a
     * later get_strip or get_day goes alone; with the calendar here the news leaves only inside the pair, and
     * without it alone. Every other call([...]) of the client carries one call: call()'s. Vacuity guards:
     * getSoon's read, call()'s single call and the one batch are found.
     *
     * Changes that must make it fail: a third call in the batch, get_soon in it, a second batch anywhere in the
     * client, the news asked alone with the calendar here.
     *
     * @return void
     */
    public function test_the_news_is_batched_only_beside_the_strips_first_read(): void {
        $sources = $this->sources();
        $batches = [];
        foreach ($sources as $file => $contents) {
            // The code without its comments, which name call([...]) to say what it does.
            $code = preg_replace(['#/\*.*?\*/#s', '#(?<![:/])//[^\n]*#'], '', $contents);
            $count = preg_match_all('/\.call\(\[/', $code);
            if ($count > 0) {
                $batches[$file] = $count;
            }
        }
        $this->assertSame(['repository.ts' => 2], $batches, 'call()\'s single call and one batch in the whole client');

        $repository = $sources['repository.ts'];
        $this->assertSame(
            1,
            substr_count($repository, 'return await ajax.call([{methodname, args}])[0] as T;'),
            'call() asks one web service per request'
        );
        $pair = $this->slice($repository, 'export const getStripWithNews = ', "\n};\n");
        $calls = $this->slice($pair, 'ajax.call([', ']));');
        $this->assertSame(2, substr_count($calls, 'methodname:'), 'two calls, no more');
        $this->assertStringNotContainsString('get_soon', $pair, 'get_soon never joins');
        $this->assertSame(1, substr_count($repository, "'block_compass_get_soon'"), 'get_soon has its read alone');
        $this->assertMatchesRegularExpression("/read<SoonAnswer>\\('block_compass_get_soon', \\{view\\}\\)/", $repository);

        $starts = [];
        foreach ($sources as $file => $contents) {
            $count = substr_count($contents, 'getStripWithNews(');
            if ($count > 0 && $file !== 'repository.ts') {
                $starts[$file] = $count;
            }
        }
        $this->assertSame(['Block.tsx' => 1], $starts, 'the block alone starts the pair');
        $this->assertStringContainsString(
            'const newsready = calendarturn > 0 && (!config.calendar || first !== null);',
            $sources['Block.tsx'],
            'with the calendar here the news leaves only inside the pair'
        );
    }
}
