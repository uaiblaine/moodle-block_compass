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
 * The client reads layout when what it measures changed, never on every render, pinned by reading the sources.
 *
 * A layout read (a size, an offset, a scroll extent, a computed style) right after a React commit that changed
 * the page forces the browser to lay out the whole page before it can answer. An effect with no dependency
 * array runs after every render, and the block renders many times on a load (each answer, each batch of
 * details) and on every keystroke in tier 3, so such an effect paid one full layout per render: the
 * performance audit's first finding (item 1 of docs/performance-audit/PLAN.md on main). The rule here: an effect whose
 * body reads layout names its dependencies, unless it is one of the effects listed in ALLOWED, each with the
 * reason it may run per render. And the block renders only what a change touches: its measured width is kept as
 * the brackets its consumers branch on, a card pointed at renders the calendar strip that lights its days and no
 * card, and server markup reaches React through markup(), so no render writes an icon's innerHTML again. No
 * JavaScript runner holds this, so the sources are read.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversNothing]
final class layout_measure_rules_test extends advanced_testcase {
    /** @var string A layout read: the properties and calls whose answer needs a laid-out page. */
    private const LAYOUT_READ = '/\b(getBoundingClientRect|getClientRects|getComputedStyle)\s*\(|'
        . '\.(client|offset|scroll)(Width|Height|Top|Left)\b/';

    /**
     * Effects allowed to read layout with no dependency array: file => the text their body starts with.
     *
     * CalendarStrip's row placement reads only once the strip is open and holds a payload, and its reads place
     * the row and the open day's card under a pointer that moves between renders; the period effect returns
     * before any read unless a press opened the strip on a period. Both are measured again when the strip is
     * open (the plan's item 1 names them), so they stay listed rather than rewritten blind.
     */
    private const ALLOWED = [
        'CalendarStrip.tsx' => [
            "const el = scroller.current;\n        if (listened.current !== el) {",
            "const key = periodtarget.current;\n        const el = scroller.current;",
        ],
    ];

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
        $this->assertNotEmpty($sources, 'no client source found');

        return $sources;
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
     * Every effect in a source, with its body and whether a dependency array follows it.
     *
     * The body is the arrow's block, matched brace by brace from its opening one; what follows its closing
     * brace is either the call's closing parenthesis (no dependency array) or a comma and an array.
     *
     * @param string $source One file.
     * @return array A list of [hook name, body, whether it has dependencies, line number].
     */
    private function effects(string $source): array {
        $found = [];
        preg_match_all('/\b(useLayoutEffect|useEffect)\(\(\) => \{/', $source, $matches, PREG_OFFSET_CAPTURE);
        foreach ($matches[0] as $at => [$text, $offset]) {
            $open = $offset + strlen($text) - 1;
            $depth = 0;
            $length = strlen($source);
            for ($index = $open; $index < $length; $index++) {
                if ($source[$index] === '{') {
                    $depth++;
                } else if ($source[$index] === '}') {
                    $depth--;
                    if ($depth === 0) {
                        break;
                    }
                }
            }
            $this->assertSame(0, $depth, "an effect's body never closes after offset {$offset}");
            $body = substr($source, $open + 1, $index - $open - 1);
            $tail = ltrim(substr($source, $index + 1, 8));
            $found[] = [$matches[1][$at][0], $body, $tail[0] === ',', substr_count($source, "\n", 0, $offset) + 1];
        }

        return $found;
    }

    /**
     * An effect whose body reads layout carries a dependency array, outside the listed exceptions, and every
     * exception is still found where it is listed.
     *
     * Vacuity guards: the scan finds effects that read layout with dependencies (the measured ones it must
     * accept), and each allowed body is matched once.
     *
     * @return void
     */
    public function test_an_effect_that_reads_layout_names_its_dependencies(): void {
        $withdeps = 0;
        $allowedseen = [];
        foreach ($this->sources() as $name => $source) {
            foreach ($this->effects($source) as [$hook, $body, $hasdeps, $line]) {
                if (!preg_match(self::LAYOUT_READ, $body)) {
                    continue;
                }
                if ($hasdeps) {
                    $withdeps++;
                    continue;
                }
                $allowed = array_filter(self::ALLOWED[$name] ?? [], fn(string $start): bool =>
                    str_starts_with(ltrim($body), $start));
                $this->assertNotEmpty($allowed, "{$name}:{$line}: {$hook} reads layout on every render");
                foreach ($allowed as $start) {
                    $allowedseen["{$name}|{$start}"] = ($allowedseen["{$name}|{$start}"] ?? 0) + 1;
                }
            }
        }
        $this->assertGreaterThanOrEqual(5, $withdeps, 'the scan found too few measured effects to be reading the sources');
        foreach (self::ALLOWED as $name => $starts) {
            foreach ($starts as $start) {
                $seen = $allowedseen["{$name}|{$start}"] ?? 0;
                $this->assertSame(1, $seen, "{$name}: the allowed effect is not where it is listed");
            }
        }
    }

    /**
     * The closed line is measured when its key, its state, its width class, its fit or its size changed.
     *
     * @return void
     */
    public function test_the_closed_line_is_measured_on_change(): void {
        $strip = $this->sources()['CalendarStrip.tsx'];
        $this->assertStringContainsString('}, [linekey, open, narrow, fits, resized]);', $strip);
        $this->assertStringContainsString('const [resized, setResized] = useState(0);', $strip);
    }

    /**
     * The chips' and the scope's fades are measured on a change of what they show, on their scroll and on a new
     * width of the line, never on every render.
     *
     * @return void
     */
    public function test_the_line_fades_are_measured_on_change(): void {
        $line = $this->sources()['FilterLine.tsx'];
        $this->assertStringContainsString("        fadeRows(fold.step);\n    }, [fold.step, fadeskey, fadeRows]);", $line);
        $this->assertStringContainsString('fadeRows(drawnfold.current.step);', $line, 'a new width must redraw the fades');
        $this->assertStringContainsString('onScroll={() => fades(chiprow.current)}', $line);
    }

    /**
     * The strip renders for its own state and its props, not for each of the block's renders: it is memoised,
     * and the empty course list it hands the block is one array, so handing it again changes no state.
     *
     * @return void
     */
    public function test_the_strip_is_memoised_and_hands_the_block_a_stable_empty_list(): void {
        $sources = $this->sources();
        $strip = $sources['CalendarStrip.tsx'];
        $this->assertStringContainsString('export default memo(CalendarStrip);', $strip);
        $this->assertStringNotContainsString('onOpenCourses([])', $strip);
        $this->assertStringNotContainsString('?? [])', $strip);
        $this->assertSame(3, substr_count($strip, 'NO_COURSES)'), 'the three empty hand-overs use the one array');
        $block = $sources['Block.tsx'];
        $this->assertStringContainsString('onWeight = useCallback(', $block, 'a prop rebuilt per render undoes the memo');
    }

    /**
     * The block keeps in state what its measured width decides, never the width: a resize renders the block,
     * and through it every strip and card, only when a column count or a narrow form moves.
     *
     * Changes that must make it fail: the width kept in state again; the brackets replaced on every reading; a
     * bracket left out of the comparison, so its change would never render; the strip handed the width again.
     *
     * @return void
     */
    public function test_the_block_keeps_the_width_brackets_not_the_width(): void {
        $sources = $this->sources();
        $block = $sources['Block.tsx'];
        $this->assertStringContainsString('new ResizeObserver', $block, 'vacuity: the block measures itself');
        $this->assertStringNotContainsString('setWidth(', $block, 'the raw width is in state again');
        $this->assertStringContainsString('const [brackets, setBrackets] = useState<Brackets>(() => bracketsOf(0));', $block);
        $this->assertStringContainsString(
            'setBrackets((current) => (sameBrackets(current, next) ? current : next));',
            $block,
            'every reading of the observer replaces the state'
        );
        $brackets = ['columns: cardColumns(width),', 'newsnarrow: newsNarrow(width),', 'calnarrow: calendarNarrow(width),'];
        foreach ($brackets as $bracket) {
            $this->assertStringContainsString($bracket, $block);
        }
        $this->assertStringContainsString(
            'a.columns === b.columns && a.newsnarrow === b.newsnarrow && a.calnarrow === b.calnarrow;',
            $block,
            'a bracket the comparison leaves out never renders its change'
        );
        $calendar = $this->tags($block, 'CalendarStrip');
        $this->assertCount(1, $calendar);
        $this->assertStringContainsString('narrow={brackets.calnarrow}', $calendar[0]);
        $this->assertStringContainsString('blockwidth={blockwidth}', $calendar[0]);
        $this->assertStringNotContainsString('width={width}', $calendar[0]);
        $strip = $sources['CalendarStrip.tsx'];
        $this->assertStringContainsString(
            'export const calendarNarrow = (width: number): boolean => width > 0 && width < NARROW_PX;',
            $strip
        );
        $this->assertStringContainsString(
            'const rowwidth = rowview.rowwidth > 0 ? rowview.rowwidth : blockwidth.current;',
            $strip,
            'the row falls back on the block\'s width until it is measured'
        );
        // The strip renders on a resize through its own observer on the head, which the brackets do not carry.
        $this->assertStringContainsString('sizer.current = new ResizeObserver(() => setResized((count) => count + 1));', $strip);
    }

    /**
     * Pointing at a tier 1 card renders the calendar strip, which lights the card's days, and nothing of tier 1,
     * the line or tier 3: those components are memoised and every prop the block hands them is kept between its
     * renders (no arrow and no literal object or array in the tag, the overflow links and the ghost memoised,
     * the line's state one object until it changes).
     *
     * Changes that must make it fail: one of the five exported unmemoised; the ghost or the overflow links built
     * anew per render; a tag of Strip, Card or OpenCourses with an arrow or a literal; the line's state, its
     * retry or its hide rebuilt per render.
     *
     * @return void
     */
    public function test_a_card_pointed_at_renders_no_card(): void {
        $sources = $this->sources();
        foreach (['Strip', 'Card', 'OpenCourses', 'Explore'] as $name) {
            $this->assertStringContainsString("export default memo({$name});", $sources[$name . '.tsx'], $name);
        }
        $block = $sources['Block.tsx'];
        $this->assertStringContainsString('const [pointed, setPointed] = useState<number | null>(null);', $block);
        $this->assertStringContainsString('pointedCourse={pointed}', $block, 'vacuity: the strip is what pointing lights');
        $this->assertStringContainsString('const overflows = useMemo(', $block);
        $this->assertStringContainsString('const ghost = useMemo(', $block);
        $this->assertStringContainsString('}, [data, exploring, labels]);', $block);
        $taglists = [
            'Strip' => $this->tags($block, 'Strip'),
            'OpenCourses' => $this->tags($block, 'OpenCourses'),
            'Explore' => $this->tags($block, 'Explore'),
            'Card' => $this->tags($sources['Strip.tsx'], 'Card'),
        ];
        foreach ($taglists as $name => $tags) {
            $this->assertCount(1, $tags, "{$name} is drawn in one place");
            $this->assertStringNotContainsString('=>', $tags[0], "{$name} is handed a new function per render");
            $this->assertDoesNotMatchRegularExpression('/=\{\s*[\[{]/', $tags[0], "{$name} is handed a new literal per render");
        }
        $this->assertStringContainsString('onPoint={setPointed}', $taglists['Strip'][0]);
        $this->assertStringContainsString('onToggleFavourite={toggleFavourite}', $taglists['Strip'][0]);
        $this->assertStringContainsString('onPoint={onPoint}', $taglists['Card'][0]);
        $line = $sources['OpenCourses.tsx'];
        $this->assertStringContainsString("const retry = useCallback((): void => {\n        setRetrying(true);", $line);
        $this->assertStringContainsString('const hide = useCallback((): void => {', $line);
        $this->assertStringContainsString('    }, [news]);', $line);
        $this->assertStringContainsString(
            "(): NewsState => ({answer, failed, retrying, hidden, retry, hide}),\n"
                . '        [answer, failed, retrying, hidden, retry, hide]',
            $line,
            'the line\'s state is a new object on every render of the block'
        );
    }

    /**
     * Server markup reaches React through markup() only: one object per string, so React 19 never writes an
     * icon's innerHTML again on a render that changed nothing about it (a write between the pointer going down
     * and coming up loses the click, and a hover rewrote every star of tier 1).
     *
     * Vacuity guard: the scan reads every site of dangerouslySetInnerHTML in the client, at least thirty.
     * Changes that must make it fail: any site written with an inline object again, in any component.
     *
     * @return void
     */
    public function test_every_server_markup_site_goes_through_markup(): void {
        $sites = 0;
        foreach ($this->sources() as $name => $source) {
            if ($name === 'markup.ts') {
                continue;
            }
            $this->assertStringNotContainsString('__html', $source, "{$name} builds a markup object of its own");
            preg_match_all('/dangerouslySetInnerHTML=\{(\S{0,7})/', $source, $found);
            foreach ($found[1] as $start) {
                $this->assertSame('markup(', $start, "{$name}: a markup site bypasses markup()");
                $sites++;
            }
        }
        $this->assertGreaterThanOrEqual(30, $sites, 'the scan found too few markup sites to be reading the sources');
        $helper = $this->sources()['markup.ts'];
        $this->assertStringContainsString('cache.get(html)', $helper);
        $this->assertStringContainsString('cache.set(html, value);', $helper);
    }
}
