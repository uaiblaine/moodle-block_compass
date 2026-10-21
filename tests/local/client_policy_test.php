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
 */
#[CoversNothing]
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
     * Clear filters empties the search box and applies the empty text at once, and releases the scope,
     * the star and every field (ADR-015 decision 3).
     *
     * @return void
     */
    public function test_clear_filters_clears_the_search(): void {
        $body = $this->slice($this->source('Explore.tsx'), 'const clearFilters = useCallback', '}, [scope, star, selection');

        $this->assertStringContainsString("setQuery('')", $body);
        $this->assertStringContainsString("setApplied('')", $body, 'the debounce must not keep the name filter alive');
        $this->assertStringContainsString("setScope('all')", $body);
        $this->assertStringContainsString('setStar(false)', $body);
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

        $this->assertStringContainsString(
            'const state: ExploreState = {sort, scope, star, cf: selection, panel: panelopen};',
            $source
        );
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

        // Ten for the block's labels, twelve for the calendar's strings (the strip's and Up next's),
        // which the shell ships under the calendar key (block::CALENDAR_STRINGS).
        $this->assertCount(22, $ones);
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
        $this->assertStringContainsString("fillCount(labels, 'resultsshown', kept.length)", $explore);
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
                'getStrip' => 'block_compass_get_strip',
                'getStripCounts' => 'block_compass_get_strip_counts',
                'getDay' => 'block_compass_get_day',
            ] as $name => $service
        ) {
            $this->assertMatchesRegularExpression("/read<[^>]*>\\('{$service}'/", $source, "{$name} must go through read()");
        }
        $this->assertStringContainsString("call<unknown>('core_course_set_favourite_courses'", $source);
        // The strip's preference is a write, through core's route like the other two, never read().
        $this->assertStringContainsString("{name: 'block_compass_calendar', value: JSON.stringify(state), userid: 0}", $source);
        $this->assertDoesNotMatchRegularExpression('/read<[^>]*>\(\'core_/', $source);
    }

    /**
     * The calendar writes every date and time in the site language, from the strings; Intl only counts.
     *
     * The month, weekday and time words come from the lang strings the shell ships (the maintainer,
     * 2026-10-13: "site language, from lang strings"). Intl stays as the one way to read an
     * instant's numbers in the user's timezone: a Latin-digit, 24-hour formatter whose parts are
     * read as numbers, never formatted. Vacuity: the formatting helpers are called where dates show.
     *
     * @return void
     */
    public function test_calendar_dates_are_written_from_the_site_languages_strings(): void {
        $calendar = $this->source('calendar.ts');
        $strip = $this->source('CalendarStrip.tsx');
        $card = $this->source('CalendarCard.tsx');

        foreach (['CalendarStrip.tsx' => $strip, 'CalendarCard.tsx' => $card] as $name => $source) {
            $this->assertStringNotContainsString('Intl.', $source, $name);
            $this->assertStringNotContainsString('toLocale', $source, $name);
        }
        $this->assertStringNotContainsString('toLocale', $calendar);
        $this->assertSame(2, substr_count($calendar, 'new Intl.DateTimeFormat('), 'the extractor and its fallback');
        $latin = substr_count($calendar, "new Intl.DateTimeFormat('en-US-u-nu-latn'");
        $this->assertSame(2, $latin, 'Latin digits, never the page language');
        $this->assertStringContainsString(".formatToParts(", $calendar);
        $this->assertStringNotContainsString('.format(', $calendar, 'Intl formats nothing a viewer reads');
        $this->assertDoesNotMatchRegularExpression("/(weekday|month): '(long|short|narrow)'/", $calendar, 'no Intl names');

        $months = [];
        for ($month = 1; $month <= 12; $month++) {
            $months[] = sprintf("'cal_month_%02d'", $month);
        }
        $this->assertMatchesRegularExpression('/' . implode(',\s*', $months) . '/', $calendar, 'months listed in order');
        $weekdays = [];
        $short = [];
        for ($day = 0; $day <= 6; $day++) {
            $weekdays[] = "'cal_weekday_{$day}'";
            $short[] = "'cal_weekdayshort_{$day}'";
        }
        $this->assertMatchesRegularExpression('/' . implode(',\s*', $weekdays) . '/', $calendar, 'weekdays, Sunday first');
        $this->assertMatchesRegularExpression('/' . implode(',\s*', $short) . '/', $calendar, 'short weekdays, Sunday first');

        $this->assertStringContainsString('monthYear(strings, ', $strip);
        $this->assertStringContainsString('longDay(strings, dateParts(date))', $strip);
        $this->assertStringContainsString('shortWeekday(strings, ', $strip);
        $this->assertStringContainsString('clockTime(strings, timeParts(item.timestart, timezone))', $card);
        $this->assertStringContainsString('dayMonth(strings, timeParts(item.lateuntil, timezone))', $card);
    }

    /**
     * A day's screen-reader sentence says "up to N" for an upper-bound count until the day is settled.
     *
     * The future's open items (graded due soon, graded, to do) are counted before any module
     * callback runs, so the strip's number is at most the truth (ADR-014 decision 5); once the day's
     * items have arrived the client settles the counts, and the sentence states them plainly.
     *
     * @return void
     */
    public function test_an_upper_bound_count_reads_up_to_until_the_day_is_settled(): void {
        $this->assertStringContainsString(
            "export const BOUND_KINDS: CalendarKind[] = ['gradedsoon', 'graded', 'todo'];",
            $this->source('calendar.ts')
        );
        $label = $this->slice($this->source('CalendarStrip.tsx'), 'const dayLabel = ', "\n    };\n");
        $this->assertStringContainsString('const bound = !day.settled && BOUND_KINDS.includes(kind);', $label);
        $this->assertStringContainsString('bound ? fill(strings.cal_upto, String(count)) : String(count)', $label);
        foreach (['gradedsoon_today', 'gradedsoon_tomorrow', 'graded', 'todo'] as $key) {
            $this->assertMatchesRegularExpression("/phrase\('cal_count_{$key}', '[a-z]+'\)/", $label, $key);
        }
        $tick = chr(96);
        $this->assertStringContainsString(
            "fill(count === 1 && labels[{$tick}\${key}_one{$tick}] ? labels[{$tick}\${key}_one{$tick}] : labels[key], shown)",
            $this->source('str.ts')
        );
    }

    /**
     * The row opens on its home position, five past days before today (three on a narrow block), and
     * steps whole weeks; the server's window keeps its ten past days.
     *
     * ADR-014 amendment 12 (the scroll notes' D6 and D7): home is the first day wholly in view, today
     * minus five; Today scrolls back to it; an arrow, Page Up and Page Down move 7 × floor(days in view /
     * 7), 14 on the Dashboard; Home and End reach the window's ends. A day every 50 px (60 in the ring
     * style), the arrows' inset 32 px, a 44 px target round a 36 px disc. The window stays strip::PAST_DAYS,
     * the Late period's reach, and nothing on the server changes.
     *
     * Changes that must make it fail: another home, a step that splits a week, the keys bound to the row
     * in view rather than the window, the server's window shortened.
     *
     * @return void
     */
    public function test_the_row_opens_home_and_steps_whole_weeks(): void {
        $calendar = $this->source('calendar.ts');
        $this->assertStringContainsString('const HOME_PAST = 5;', $calendar);
        $this->assertStringContainsString('const NARROW_HOME_PAST = 3;', $calendar);
        $this->assertStringContainsString('Math.max(0, todayindex - (narrow ? NARROW_HOME_PAST : HOME_PAST));', $calendar);
        $this->assertStringContainsString(
            'export const stepOf = (whole: number): number => 7 * Math.max(1, Math.floor(whole / 7));',
            $calendar
        );
        $geometry = [
            'export const DAY_PITCH_PX = 50;', 'export const RING_PITCH_PX = 60;', 'export const EDGE_INSET_PX = 32;',
            'const TARGET_PX = 44;', 'const DISC_PX = 36;',
        ];
        foreach ($geometry as $constant) {
            $this->assertStringContainsString($constant, $calendar);
        }

        $strip = $this->source('CalendarStrip.tsx');
        $this->assertStringContainsString('const home = homeIndex(todayindex, narrow);', $strip);
        $this->assertStringContainsString('const stepdays = stepOf(row.whole);', $strip);
        $home = $this->slice($strip, 'const goHome = ', "\n    };\n");
        $this->assertStringContainsString('scrollRow(home * row.pitch, true);', $home, 'Today returns home');
        $keys = $this->slice($strip, 'const keyDay = (', "\n    };\n");
        $bindings = [
            "event.key === 'PageDown') {\n            target = index + stepdays;",
            "event.key === 'PageUp') {\n            target = index - stepdays;",
            "event.key === 'Home') {\n            target = 0;",
            "event.key === 'End') {\n            target = days.length - 1;",
        ];
        foreach ($bindings as $binding) {
            $this->assertStringContainsString($binding, $keys);
        }
        $this->assertSame(10, \block_compass\local\calendar\strip::PAST_DAYS, 'the window keeps the Late period\'s reach');
    }

    /**
     * The row is placed before paint and never on a frame, read again when the tab comes back, measured
     * from either direction, and fades only on a side it can scroll to.
     *
     * The scroll notes' risks 2, 3 and 5: a hidden tab runs no frame and delivers no scroll event, so the
     * home position is set in a layout effect and the row is read again on visibilitychange; scrollLeft is
     * negative right to left in Chrome and Firefox, so every read is an absolute value and every write
     * mirrored; a resize keeps the first day in view. Amendment 12: the fades follow the scroll position.
     *
     * Changes that must make it fail: the placement on a frame or after paint, the tab's return ignored,
     * a signed scrollLeft, a fade on a side the row cannot move to.
     *
     * @return void
     */
    public function test_the_row_is_placed_before_paint_and_read_in_either_direction(): void {
        $strip = $this->source('CalendarStrip.tsx');
        $placement = $this->slice($strip, "    useLayoutEffect(() => {\n", "\n    });\n");
        $this->assertStringContainsString('scrollRow(start * row.pitch, false);', $placement, 'home, without animation');
        $this->assertStringContainsString(
            'scrollRow(anchor.current * row.pitch, false);',
            $placement,
            'a resize keeps the first day'
        );
        $this->assertStringNotContainsString('requestAnimationFrame', $placement, 'never placed on a frame');
        $this->assertStringContainsString("document.addEventListener('visibilitychange', onvisible);", $strip);
        $this->assertStringContainsString(
            'const scrollOf = (element: HTMLElement): number => Math.abs(element.scrollLeft);',
            $strip
        );
        $this->assertSame(2, substr_count($strip, 'isRtl(el) ? -left : left'), 'both writes mirrored right to left');
        // Every read of the position goes through scrollOf(): one read of scrollLeft, the absolute one.
        $this->assertSame(1, preg_match_all('/\.scrollLeft\b(?!\s*=[^=])/', $strip), 'a signed scrollLeft is read');
        $this->assertStringContainsString(
            '{scrolls && !rowview.atstart && <span className="compass-cal-fade compass-cal-fade-start" aria-hidden="true" />}',
            $strip
        );
        $this->assertStringContainsString(
            '{scrolls && !rowview.atend && <span className="compass-cal-fade compass-cal-fade-end" aria-hidden="true" />}',
            $strip
        );
    }
}
