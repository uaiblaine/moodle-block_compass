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
 * reason it may run per render. No JavaScript runner holds this, so the sources are read.
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
}
