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
 * Accessibility rules over the client sources and the stylesheet.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use basic_testcase;
use PHPUnit\Framework\Attributes\CoversNothing;

/**
 * The half of the accessibility audit that axe cannot see.
 *
 * Core's axe step runs inside the Behat scenarios, and this file reads what that step
 * cannot. Three reasons something lands here rather than there. A rule may need a state
 * no scenario reaches - the dark theme is a token swap nothing in the feature toggles. It
 * may need a relationship axe measures only when both halves are on screen, while the
 * static form survives a component nobody put in a scenario - the heading ladder. Or the
 * axe run may not check the criterion: axe-core 4.10.3, which core ships, has its target
 * size rule (WCAG 2.2 2.5.8) disabled by default.
 *
 * As in bootstrap_compat_test, every rule carries a vacuity guard asserting it had
 * something to check: a negative rule that matches nothing passes while blind to the
 * defect it was written for.
 *
 * Nothing runs the React sources in a test, so the rules that keep the reader's keyboard and
 * announcements right read them as text - where focus goes, which state a star says, how a
 * language string is filled, how a failure is reported - and so does the rule that every
 * class the stylesheet styles is actually rendered.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversNothing]
final class accessibility_rules_test extends basic_testcase {
    /** @var string Bootstrap 5.3's colour-mode attribute, the one signal 5.2 has. */
    private const DARK_ATTRIBUTE = '[data-bs-theme="dark"]';

    /** @var string The same attribute without its brackets, for building selector prefixes. */
    private const DARK_ATTRIBUTE_VALUE = 'data-bs-theme="dark"';

    /**
     * Every file the scan covers, with its contents.
     *
     * The same source list as bootstrap_compat_test::sources(), and deliberately its own
     * copy: the two files answer different questions and neither should be able to narrow
     * the other's reading by editing a shared helper.
     *
     * @return array Relative path => contents.
     */
    private function sources(): array {
        $root = dirname(__DIR__, 2);
        $files = [];
        $paths = array_merge(
            glob($root . '/templates/*.mustache'),
            glob($root . '/js/esm/src/*.ts'),
            glob($root . '/js/esm/src/*.tsx'),
            [$root . '/styles.css']
        );
        foreach ($paths as $path) {
            $files[substr($path, strlen($root) + 1)] = file_get_contents($path);
        }

        return $files;
    }

    /**
     * The React sources alone, which is where every element rule below applies.
     *
     * @return array Relative path => contents.
     */
    private function reactsources(): array {
        $react = [];
        foreach ($this->sources() as $file => $contents) {
            if (str_ends_with($file, '.tsx') || str_ends_with($file, '.ts')) {
                $react[$file] = $contents;
            }
        }

        return $react;
    }

    /**
     * Every tag in a template or a React source, as written.
     *
     * The reader of bootstrap_compat_test::tags(), kept as a copy of its own for the reason
     * sources() gives. A tag ends at the first closing angle bracket outside quotes and braces, so
     * an arrow function or a comparison inside a JSX expression does not end it early, and the
     * attributes written after a handler are read. Every opening angle bracket followed by a
     * letter is a candidate, so an element written inside another element's attribute is returned
     * on its own as well. A candidate that opens no tag, such as a comparison, is dropped at the
     * first semicolon or parenthesis outside braces, or at a closing brace it did not open; a type
     * argument such as useRef<HTMLElement> comes back as a tag of its own, which no rule's element
     * name or attribute matches.
     *
     * @param string $contents The source.
     * @return string[] The tags, each from its opening angle bracket to its closing one.
     */
    private static function all_tags(string $contents): array {
        preg_match_all('/<[a-zA-Z]/', $contents, $starts, PREG_OFFSET_CAPTURE);
        $length = strlen($contents);
        $tags = [];
        foreach ($starts[0] as $start) {
            $offset = $start[1];
            $depth = 0;
            $quote = '';
            for ($i = $offset + 1; $i < $length; $i++) {
                $char = $contents[$i];
                if ($quote !== '') {
                    // A quoted attribute value ends only at its own quote.
                    if ($char === $quote) {
                        $quote = '';
                    }
                } else if ($char === '{') {
                    $depth++;
                } else if ($char === '}') {
                    $depth--;
                    if ($depth < 0) {
                        break;
                    }
                } else if ($depth > 0) {
                    // Inside a JSX expression or a Mustache tag nothing ends the tag.
                    continue;
                } else if ($char === '"' || $char === "'") {
                    $quote = $char;
                } else if ($char === '>') {
                    $tags[] = substr($contents, $offset, $i - $offset + 1);
                    break;
                } else if (str_contains(';()', $char)) {
                    break;
                }
            }
        }

        return $tags;
    }

    /**
     * Every opening tag of one element name, read whole by {@see self::all_tags()}.
     *
     * The name must end where the tag's name does, so a type argument such as ExploreState is
     * not an Explore tag.
     *
     * @param string $contents The source.
     * @param string $name The element name.
     * @return string[] The matched tags.
     */
    private function tags(string $contents, string $name): array {
        $pattern = '/^<' . preg_quote($name, '/') . '(?![\w-])/';

        return array_values(array_filter(
            self::all_tags($contents),
            static fn(string $tag): bool => preg_match($pattern, $tag) === 1
        ));
    }

    /**
     * The stylesheet with its comments removed.
     *
     * Comments are prose and may name what the rules forbid; declarations may not.
     *
     * @return string The stylesheet.
     */
    private function css(): string {
        return preg_replace('#/\*.*?\*/#s', '', $this->sources()['styles.css']);
    }

    /**
     * The stylesheet's rule blocks.
     *
     * Nested at-rules are not parsed as such: an @media block is skipped and the rules
     * inside it are returned on their own, which is all any rule here needs.
     *
     * @return array A list of two-element arrays, selector first and declaration body second.
     */
    private function rules(): array {
        preg_match_all('/([^{}]+)\{([^{}]*)\}/s', $this->css(), $matches, PREG_SET_ORDER);
        $rules = [];
        foreach ($matches as $match) {
            $rules[] = [trim($match[1]), $match[2]];
        }

        return $rules;
    }

    /**
     * The scan sees the files the rules below are about.
     *
     * Named rather than counted: a glob that silently stops matching turns every rule in
     * this file into a pass over nothing, which is the failure mode the whole file exists
     * to prevent. Each named component is one a rule below reads, and the stylesheet is
     * where the token pairing and the target size are declared.
     *
     * @return void
     */
    public function test_the_scan_covers_the_client_sources_and_the_stylesheet(): void {
        $files = $this->sources();

        $components = [
            'Archive', 'Star', 'Card', 'RowCard', 'Strip', 'Explore', 'Platter', 'ViewToggle', 'FilterToggle', 'FilterPanel',
            'FilterLine', 'ScopeGroup', 'StarToggle', 'OrganiseMenu', 'RetryNotice', 'RowList', 'Row', 'Group', 'CalendarStrip',
            'CalendarLine', 'UpNext', 'OpenCourses', 'Block',
        ];
        foreach ($components as $component) {
            $this->assertArrayHasKey("js/esm/src/{$component}.tsx", $files);
        }
        $this->assertArrayHasKey('styles.css', $files);
        $this->assertGreaterThanOrEqual(8, count($files));
    }

    /**
     * Every element rule reads a tag to its own end, past the handlers written inside it.
     *
     * The client writes its handlers as arrow functions, onClick={() => ...}, and the arrow's
     * closing angle bracket is not the tag's. A reader that stopped there would show the element
     * rules only the attributes written before the first handler, so a disabled attribute written
     * after one would pass the busy-controls rule unseen. These controls go through tags(), the
     * reader every element rule uses.
     *
     * Changes that must make it fail: ending a tag at an angle bracket inside braces or inside a
     * quoted value, or matching an element name as the prefix of a longer one.
     *
     * @return void
     */
    public function test_a_tag_is_read_to_its_own_end(): void {
        $afterhandler = $this->tags('<button onClick={() => go()} disabled={busy}>', 'button');
        $this->assertSame(['<button onClick={() => go()} disabled={busy}>'], $afterhandler, 'a handler ends the tag early');
        // The same tag through the busy-controls rule's own pattern, which must see the attribute.
        $this->assertMatchesRegularExpression('/\sdisabled=/', $afterhandler[0], 'the busy-controls rule would miss it');

        $this->assertSame(
            ['<img src={wide > 0 ? url : ""} alt="">'],
            $this->tags('<img src={wide > 0 ? url : ""} alt="">', 'img'),
            'a comparison inside braces ends the tag early'
        );
        $this->assertSame(
            ['<button title="a > b" aria-label="x">'],
            $this->tags('<button title="a > b" aria-label="x">', 'button'),
            'an angle bracket inside a quoted value ends the tag early'
        );
        $this->assertSame(
            ['<Explore starred={starred} />'],
            $this->tags('useState<ExploreState>(seed); <Explore starred={starred} />', 'Explore'),
            'a longer name, or a type argument, is read as the element'
        );
        $this->assertSame([], $this->tags('while (i <length) { i++; }', 'length'), 'a comparison is read as a tag');
    }

    /**
     * Every image states an alt attribute, the empty one included.
     *
     * A course image carries no information the name beside it does not, so its alt is
     * empty on purpose - which is a decision, and the only way to tell it from an
     * oversight is that it is written down. A missing attribute makes a screen reader
     * read the file name instead.
     *
     * @return void
     */
    public function test_every_image_states_an_alt_attribute(): void {
        $images = 0;
        foreach ($this->reactsources() as $file => $contents) {
            foreach ($this->tags($contents, 'img') as $tag) {
                $images++;
                $this->assertMatchesRegularExpression(
                    '/\balt=/',
                    $tag,
                    "{$file}: an image with no alt attribute; write alt=\"\" when it is decorative: " . trim($tag)
                );
            }
        }
        // Vacuity guard: the rule must have read an image, or a renamed tag disables it.
        $this->assertGreaterThanOrEqual(1, $images, 'no image found: have the course images left the client?');
    }

    /**
     * No positive tabindex anywhere.
     *
     * A positive value takes an element out of the document's order and puts it in front
     * of everything the browser knows about, including core's own controls, so the tab
     * order stops being the reading order for the whole page rather than for this block.
     * Only -1 (reachable by script, not by tab) and 0 are allowed.
     *
     * @return void
     */
    public function test_no_positive_tabindex_anywhere(): void {
        $negatives = 0;
        foreach ($this->sources() as $file => $contents) {
            if (str_ends_with($file, '.css')) {
                continue;
            }
            $this->assertDoesNotMatchRegularExpression(
                '/\btabindex\s*=\s*[{"\']\s*\+?[1-9]/i',
                $contents,
                "{$file}: a positive tabindex reorders the whole page, not just this block"
            );
            $negatives += preg_match_all('/\btabindex\s*=\s*\{\s*-\s*1\s*\}/i', $contents);
        }
        /*
         * Vacuity guard, and the sharpest one in the file: the rule is a negative, so it
         * passes when the regex has stopped reading the attribute at all. Counting the
         * deliberate -1 values - such as the decorative duplicate link on a card and the
         * tier 3 focus targets - proves the pattern still finds a tabindex where one is.
         */
        $this->assertGreaterThanOrEqual(
            1,
            $negatives,
            'no tabIndex={-1} found: the attribute regex may have stopped reading the attribute'
        );
    }

    /**
     * The stylesheet never removes a focus outline.
     *
     * Every control this plugin owns states its own :focus-visible ring, but the browser
     * default is the fallback for anything that does not - a summary, a link, a control
     * added later. Zeroing an outline without replacing it makes a keyboard user's
     * position invisible, and nothing else in the pipeline reads a focus style.
     *
     * @return void
     */
    public function test_the_stylesheet_never_removes_an_outline(): void {
        $css = $this->css();

        // The shorthand and both longhands, and a zero with or without a unit.
        $this->assertDoesNotMatchRegularExpression(
            '/(?<![-\w])outline(?:-style|-width)?\s*:\s*(?:none|0(?:px|em|rem)?)(?![\d.%\w])/i',
            $css,
            'styles.css removes a focus outline; the browser default is the fallback for '
                . 'every control without a ring of its own'
        );
        // Vacuity guard: the property must be written in this file, or the rule reads nothing.
        $this->assertGreaterThanOrEqual(
            1,
            preg_match_all('/(?<![-\w])outline\s*:/i', $css),
            'no outline declaration found: has the stylesheet moved, or the rings been deleted?'
        );
    }

    /**
     * The icon-only buttons name themselves.
     *
     * Archive and Star render a glyph and nothing else, and the glyph is aria-hidden, so
     * without an aria-label a screen reader announces "button" and the user is told to press
     * something unnamed. The list/cards switch (ViewToggle) is two such buttons, and the Filters
     * button (FilterToggle) hides its own text and count from the accessibility tree to say them
     * as one sentence. The filter line's (ADR-015) are the favourites star (StarToggle), Organise
     * (OrganiseMenu) and, in FilterLine, the search's eraser, its icon and its close button, each
     * chip's cross and Clear all, which name themselves the same way. Every button tag in these
     * files must carry the attribute.
     *
     * @return void
     */
    public function test_the_icon_only_buttons_name_themselves(): void {
        $files = $this->sources();
        $iconfiles = [
            'js/esm/src/Archive.tsx', 'js/esm/src/Star.tsx', 'js/esm/src/ViewToggle.tsx', 'js/esm/src/FilterToggle.tsx',
            'js/esm/src/StarToggle.tsx', 'js/esm/src/OrganiseMenu.tsx', 'js/esm/src/FilterLine.tsx',
        ];
        foreach ($iconfiles as $file) {
            $this->assertArrayHasKey($file, $files, "{$file} is not in the scan any more");
            $tags = $this->tags($files[$file], 'button');
            // Vacuity guard: each file exists to render such a button, so finding none is the bug.
            $this->assertNotEmpty($tags, "{$file}: no button tag found, so the rule checked nothing");
            foreach ($tags as $tag) {
                $this->assertMatchesRegularExpression(
                    '/\baria-label=/',
                    $tag,
                    "{$file}: an icon-only button with no aria-label announces itself as \"button\": " . trim($tag)
                );
            }
        }
    }

    /**
     * Every toolbar grouping carries a name.
     *
     * role="group" tells a screen reader that the buttons inside belong together and then
     * says nothing about what they do; unnamed, the tier 3 toolbar's platters and view
     * switch are read as anonymous groups of buttons in a row.
     *
     * @return void
     */
    public function test_every_role_group_carries_a_name(): void {
        $groups = 0;
        foreach ($this->reactsources() as $file => $contents) {
            foreach (self::all_tags($contents) as $tag) {
                // Either quote: a single-quoted attribute is valid JSX and must not slip past.
                if (!preg_match('/\brole\s*=\s*["\']group["\']/', $tag)) {
                    continue;
                }
                $groups++;
                $this->assertMatchesRegularExpression(
                    '/\baria-label(?:ledby)?=/',
                    $tag,
                    "{$file}: a role=\"group\" with no accessible name: " . trim($tag)
                );
            }
        }
        // Vacuity guard: Platter and ViewToggle each write one.
        $this->assertGreaterThanOrEqual(1, $groups, 'no role="group" found: has the tier 3 toolbar changed?');
    }

    /**
     * The heading ladder follows the block title, whichever title there is.
     *
     * Core renders the block title as an h3 (lib/templates/block.mustache) - unless the
     * hide_block_title setting empties it, and then the block has no heading of core's at
     * all. A heading of this plugin's at the block title's own level reads as a sibling of
     * the block rather than as a section inside it, and one rung too low under a hidden
     * title skips a level. So every level this plugin writes is a function of that one fact,
     * chosen in heading.ts and nowhere else: sections h4 under the title, h3 without it and
     * h2 on the block's own page, card titles one rung below. A literal heading tag in a
     * component is a rung chosen without asking, which is why none is allowed. axe's
     * heading-order cannot see the first case: sibling h3s skip no level.
     *
     * The exact file lists are the point - a new component with a heading has to choose
     * its rung deliberately and land in one of them.
     *
     * @return void
     */
    public function test_the_heading_ladder_follows_the_block_title(): void {
        $sources = $this->reactsources();
        $sections = [];
        $titles = [];
        $scanned = 0;
        foreach ($sources as $file => $contents) {
            if ($file === 'js/esm/src/heading.ts') {
                continue;
            }
            $scanned++;
            $this->assertDoesNotMatchRegularExpression(
                '/<h[1-6][\s>]/',
                $contents,
                "{$file}: a literal heading tag chooses its rung without asking whether the block "
                    . 'title rendered; take the tag from heading.ts'
            );
            if (preg_match('/\bsectionTag\b/', $contents)) {
                $sections[] = $file;
            }
            if (preg_match('/\btitleTag\b/', $contents)) {
                $titles[] = $file;
            }
        }
        // Vacuity guard: the React sources must have been read at all.
        $this->assertGreaterThanOrEqual(1, $scanned, 'no React source scanned: has js/esm/src moved?');

        // The helper pins the three ladders: 4 under core's block title, 3 without it, 2 on the
        // block's own page under the theme's h1 - and a level it does not know reads as 4, the
        // Dashboard's.
        $this->assertArrayHasKey('js/esm/src/heading.ts', $sources, 'heading.ts is where the rungs are chosen');
        $helper = $sources['js/esm/src/heading.ts'];
        $this->assertMatchesRegularExpression(
            '/SectionTag => \(\[\'h2\', \'h3\', \'h4\'\] as const\)\[rung\(level\) - 2\]/',
            $helper,
            'sections: h2 on the page, h3 without the block title, h4 under it'
        );
        $this->assertMatchesRegularExpression(
            '/TitleTag => \(\[\'h3\', \'h4\', \'h5\'\] as const\)\[rung\(level\) - 2\]/',
            $helper,
            'card titles: one rung under the sections'
        );
        $this->assertMatchesRegularExpression(
            '/level === 2 \|\| level === 3 \? level : 4/',
            $helper,
            'an unknown level is the Dashboard\'s'
        );
        foreach (array_merge($sections, $titles) as $file) {
            $this->assertStringContainsString(
                'config.headinglevel',
                $sources[$file],
                "{$file} chooses its rung from something other than the shell's headinglevel"
            );
        }
        sort($sections);
        sort($titles);
        $this->assertSame(
            ['js/esm/src/CalendarStrip.tsx', 'js/esm/src/Explore.tsx', 'js/esm/src/OpenCourses.tsx', 'js/esm/src/Strip.tsx'],
            $sections,
            'the section rung is the section titles: the calendar strip, a tier 1 strip, the tier 3 panel and the '
                . 'open-courses line, which is the block\'s first heading when the strip is not here'
        );
        $this->assertSame(
            ['js/esm/src/Card.tsx', 'js/esm/src/RowCard.tsx', 'js/esm/src/UpNext.tsx'],
            $titles,
            'the title rung is the card titles, the tier 1 card and the tier 3 one, and Up next, a region of the calendar'
        );
    }

    /**
     * Brand-coloured text goes through the paired token, which both dark mechanisms move.
     *
     * The brand is #0f6cbf, which is 3.02:1 on Boost's dark body #1d2125 - under the
     * 4.5:1 floor for text, while clearing the 3:1 one for an outline or a border. So the
     * text token is a second name that dark mode overrides and the plain one is left to
     * the rings and the borders.
     *
     * The rule pins the pairing, not the ratio: no source can compute a contrast, so the ratio
     * is measured in a browser. The dark selector is the one dark mechanism 5.2 has, the
     * attribute Bootstrap 5.3 moves its tokens under; nothing in Moodle 5.2 or in Boost Union
     * emits a .theme-dark class, so a rule for it would be dead.
     *
     * @return void
     */
    public function test_brand_text_goes_through_the_paired_token(): void {
        $css = $this->css();

        // The token with or without a fallback: var(--x) and var(--x, #fff) are the same paint.
        $this->assertDoesNotMatchRegularExpression(
            '/(?<![-\w])color\s*:\s*[^;{}]*var\(\s*--block_compass-brand\s*[,)]/',
            $css,
            'a text colour painted with --block_compass-brand is 3.02:1 on the dark body; '
                . 'paint text with --block_compass-brand-text and leave the plain token to '
                . 'outlines, borders and backgrounds'
        );
        // Vacuity guard: something must actually paint text with the paired token.
        $this->assertGreaterThanOrEqual(
            1,
            preg_match_all('/(?<![-\w])color\s*:\s*[^;{}]*var\(\s*--block_compass-brand-text\s*[,)]/', $css),
            'nothing paints text with --block_compass-brand-text: the rule above checked nothing'
        );

        $light = 0;
        $dark = 0;
        foreach ($this->rules() as $rule) {
            [$selector, $body] = $rule;
            if (!str_contains($body, '--block_compass-brand-text:')) {
                continue;
            }
            if (str_contains($selector, self::DARK_ATTRIBUTE)) {
                $dark++;
            } else {
                $light++;
            }
        }
        $this->assertGreaterThanOrEqual(1, $light, '--block_compass-brand-text has no light value');
        $this->assertGreaterThanOrEqual(
            1,
            $dark,
            '--block_compass-brand-text is not overridden under [data-bs-theme="dark"]'
        );
    }

    /**
     * Every colour-mode override is scoped to the html element or to body, and to nothing deeper.
     *
     * The host writes data-bs-theme in one of two places and the block has to follow both: Moodle
     * 5.3's theme_boost puts it on the html element (5.2's core writes it nowhere), theme_moove
     * puts it on document.body (amd/src/darkmode.js) and redefines the whole --bs-* set there. An
     * override anchored at :root sees only the first, and would leave the brand text at its 3.02:1
     * light value on moove's dark body.
     *
     * Going the other way, a bare [data-bs-theme="dark"] .block_compass would match through any
     * ancestor at any depth - CSS descendant combinators have no nearest-ancestor-wins rule - and
     * theme_boost_union sets this same attribute on its navbar alone. So the scope must be html or
     * body: wide enough for both hosts, narrow enough that no deeper scope reaches the block.
     *
     * Changes that must make it fail: re-anchoring one arm at :root; dropping the "body" from an
     * arm, leaving a bare attribute selector.
     *
     * @return void
     */
    public function test_dark_override_scope_is_html_or_body(): void {
        $offenders = [];
        $checked = 0;
        foreach ($this->rules() as $rule) {
            [$selector] = $rule;
            if (!str_contains($selector, self::DARK_ATTRIBUTE)) {
                continue;
            }
            foreach (explode(',', $selector) as $part) {
                $part = trim(preg_replace('/\s+/', ' ', $part));
                if ($part === '') {
                    continue;
                }
                $checked++;
                $onbody = str_starts_with($part, 'body[' . self::DARK_ATTRIBUTE_VALUE . ']');
                $underhtml = str_starts_with($part, '[' . self::DARK_ATTRIBUTE_VALUE . '] body ');
                if (!$onbody && !$underhtml) {
                    $offenders[] = $part;
                }
            }
        }
        $this->assertGreaterThanOrEqual(
            1,
            $checked,
            'no colour-mode selector was examined: this test checked nothing'
        );
        $this->assertSame(
            [],
            $offenders,
            'a colour-mode selector must carry the attribute on body, or on an html above body; '
                . 'anchoring at :root misses a host that scopes to body, and a bare attribute '
                . 'selector matches a navbar scope: ' . implode('; ', $offenders)
        );
    }

    /**
     * The archive control declares a target box of at least 24 CSS px.
     *
     * WCAG 2.2 2.5.8 sets the minimum at 24 by 24, and btn-link btn-sm p-0 computes to
     * about 23: the Bootstrap padding utility is !important, so nothing but an explicit
     * box brings it back. axe-core 4.10.3 ships its target size rule disabled by default,
     * which is why the rule is here and not in the Behat step.
     *
     * @return void
     */
    public function test_the_archive_control_declares_a_minimum_target_box(): void {
        $body = null;
        foreach ($this->rules() as $rule) {
            [$selector, $rulebody] = $rule;
            // The base rule only: not :hover, and not .compass-archiveall, which starts the same.
            if (!preg_match('/\.compass-archive(?![\w-])/', $selector) || str_contains($selector, ':')) {
                continue;
            }
            $body = $rulebody;
        }
        // Vacuity guard: without the rule block there is nothing to read a size out of.
        $this->assertNotNull($body, 'no .compass-archive rule found in styles.css');

        foreach (['min-width', 'min-height'] as $property) {
            $found = preg_match('/\b' . $property . '\s*:\s*([\d.]+)(rem|px)/', $body, $matches);
            $this->assertSame(
                1,
                $found,
                ".compass-archive declares no {$property}: the control computes to about 23 px, "
                    . 'one under the 24 px minimum of WCAG 2.2 2.5.8'
            );
            $pixels = $matches[2] === 'rem' ? (float) $matches[1] * 16 : (float) $matches[1];
            $this->assertGreaterThanOrEqual(
                24,
                $pixels,
                ".compass-archive declares a {$property} of {$matches[1]}{$matches[2]}, under the 24 px minimum"
            );
        }
    }

    /**
     * A course name is at most two lines, and the whole name rides in a title attribute.
     *
     * So is every other text that can run long in a narrow column: a day's item name in the
     * calendar card and a tier 3 row's date ("Aberto semana passada" stood in three lines).
     * A name of several lines breaks the layout. The clamp is Boost's own .clamp-2 pattern under
     * this plugin's .compass-clamp, and every element carrying that class also carries a title,
     * so hovering a clamped name shows it in full. axe reads neither: nothing in a scenario
     * renders a name long enough to clamp.
     *
     * @return void
     */
    public function test_course_names_are_clamped_to_two_lines_with_the_whole_name_in_a_title(): void {
        $body = null;
        foreach ($this->rules() as $rule) {
            [$selector, $rulebody] = $rule;
            if (preg_match('/\.compass-clamp(?![\w-])/', $selector) && !str_contains($selector, ':')) {
                $body = $rulebody;
            }
        }
        // Vacuity guard: without the rule block there is nothing to read the clamp out of.
        $this->assertNotNull($body, 'no .compass-clamp rule found in styles.css');
        $this->assertMatchesRegularExpression('/(?<![\w-])-webkit-line-clamp\s*:\s*2\b/', $body, 'two lines, prefixed');
        $this->assertMatchesRegularExpression('/(?<![\w-])line-clamp\s*:\s*2\b/', $body, 'two lines, standard');
        $this->assertMatchesRegularExpression('/\boverflow\s*:\s*hidden\b/', $body, 'the third line is cut, not shown');

        $clamped = 0;
        $where = [];
        foreach ($this->reactsources() as $file => $contents) {
            foreach (self::all_tags($contents) as $tag) {
                if (!preg_match('/\bcompass-clamp\b/', $tag)) {
                    continue;
                }
                $clamped++;
                $where[] = basename($file);
                $this->assertMatchesRegularExpression(
                    '/\btitle=\{/',
                    $tag,
                    "{$file}: a clamped name without the whole name in a title attribute: " . trim($tag)
                );
            }
        }
        // Vacuity guard: the three places a course name is drawn - the tier 1 card title, the tier 3
        // row name and the tier 3 card title - and the day card's item name and the row's date.
        $this->assertGreaterThanOrEqual(5, $clamped, 'fewer than five clamped texts: has a component stopped clamping?');
        $this->assertContains('CalendarCard.tsx', $where, 'the day card\'s item name is not clamped');
        $this->assertSame(2, count(array_keys($where, 'Row.tsx')), 'the row\'s name and its date are clamped');
    }

    /**
     * A list row wraps rather than overflowing the block.
     *
     * The row is a flex line of a name, a date, a progress bar and two controls. Unwrapped, it
     * overflows the block by about 19 px at a 375 CSS px viewport already, and WCAG 1.4.10
     * forbids horizontal scrolling at 320 px. axe does not measure reflow, and no scenario runs
     * at that width, so the source is the only reader.
     *
     * @return void
     */
    public function test_a_list_row_wraps_instead_of_overflowing(): void {
        $body = null;
        foreach ($this->rules() as $rule) {
            [$selector, $rulebody] = $rule;
            // The base rule only: the selector ends at .compass-row (not a descendant such as
            // .compass-row .compass-row-meta, not -link, -meta or -progress, not a :last-child variant).
            if (!preg_match('/\.compass-row$/', trim($selector))) {
                continue;
            }
            $body = $rulebody;
        }
        // Vacuity guard: without the rule block there is nothing to read the wrapping out of.
        $this->assertNotNull($body, 'no .compass-row rule found in styles.css');
        $this->assertMatchesRegularExpression(
            '/\bflex-wrap\s*:\s*wrap\b/',
            $body,
            '.compass-row does not wrap: at 320 px its parts overflow the block sideways'
        );
    }

    /**
     * An icon-only control wraps its glyph in core's icon-no-margin, so the glyph sits centred.
     *
     * Core's .icon carries a right margin for a glyph before a label (theme/boost/scss/moodle/
     * icons.scss), and icon-no-margin is core's own way to drop it inside a control that has no
     * label. The icon-only controls are read, the filter line's included (ADR-015); Filters drops it
     * too, because its word is gone from the second step and the gap spaces it before. Vacuity
     * guard: each file must render a glyph span.
     *
     * @return void
     */
    public function test_the_icon_only_glyphs_carry_no_margin(): void {
        $files = [
            'js/esm/src/Star.tsx', 'js/esm/src/Archive.tsx', 'js/esm/src/ViewToggle.tsx', 'js/esm/src/FilterToggle.tsx',
            'js/esm/src/StarToggle.tsx', 'js/esm/src/OrganiseMenu.tsx', 'js/esm/src/FilterLine.tsx',
        ];
        foreach ($files as $file) {
            $spans = array_filter(
                $this->tags($this->sources()[$file], 'span'),
                static fn(string $tag): bool => str_contains($tag, 'dangerouslySetInnerHTML')
            );
            $this->assertNotEmpty($spans, "{$file} renders no glyph span, so the rule is about nothing");
            foreach ($spans as $span) {
                $this->assertStringContainsString(
                    'icon-no-margin',
                    $span,
                    "{$file}: a glyph span without icon-no-margin inherits core's .icon right margin"
                );
            }
        }
    }

    /**
     * The page's hidden title is hidden from sight only: core's visually-hidden class, nothing else.
     *
     * The page template's h1 must carry visually-hidden - the recipe that keeps an element in
     * the accessibility tree - and none of the spellings that remove it: d-none, hidden, or an
     * aria-hidden attribute. And the stylesheet's no-title rules, keyed on the body class, may
     * collapse the theme's empty header but never display: none or visibility: hidden anything.
     * The vacuity guards are the h1 and the rules themselves.
     *
     * @return void
     */
    public function test_the_hidden_page_title_is_hidden_from_sight_only(): void {
        $template = $this->sources()['templates/page.mustache'];
        $this->assertMatchesRegularExpression(
            '/<h1 class="visually-hidden">/',
            $template,
            'the page renders no visually hidden h1'
        );
        foreach ($this->tags($template, 'h1') as $heading) {
            $this->assertDoesNotMatchRegularExpression(
                '/d-none|\bhidden\b(?!")|aria-hidden/',
                $heading,
                'the h1 is removed from the accessibility tree: ' . $heading
            );
        }

        $seen = 0;
        foreach ($this->rules() as $rule) {
            [$selector, $body] = $rule;
            if (!str_contains($selector, '.block_compass-notitle')) {
                continue;
            }
            $seen++;
            $this->assertDoesNotMatchRegularExpression(
                '/\bdisplay\s*:\s*none\b|\bvisibility\s*:\s*hidden\b/',
                $body,
                "{$selector}: a no-title rule removes something from the accessibility tree"
            );
        }
        $this->assertGreaterThanOrEqual(1, $seen, 'no .block_compass-notitle rules found in styles.css');
    }

    /**
     * The accordion's chevron flows inline with the group name.
     *
     * Core's icons-collapse-expand rule makes its element a block-level flex box
     * (theme/boost/scss/moodle/icons.scss), which breaks the line inside the summary and drops
     * the name under the glyph. The block's own rule, scoped to its class, says inline-flex; the
     * vacuity guard is the rule itself.
     *
     * @return void
     */
    public function test_the_chevron_flows_inline(): void {
        $body = null;
        foreach ($this->rules() as $rule) {
            [$selector, $candidate] = $rule;
            if (preg_match('/\.compass-group-chevron(?![\w-])/', $selector) && !str_contains($selector, ':')) {
                $body = $candidate;
            }
        }
        $this->assertNotNull($body, 'no .compass-group-chevron rule found in styles.css');
        $this->assertMatchesRegularExpression(
            '/\bdisplay\s*:\s*inline-flex\b/',
            $body,
            'the chevron is not inline-flex, so core\'s display: flex breaks the summary line'
        );
    }

    /**
     * A control that disables itself by being pressed is aria-disabled, never disabled.
     *
     * The disabled attribute is applied in the render the control's own click causes, and a focused
     * element that becomes disabled drops the keyboard to the body: the "Reloading…" label is then
     * announced to nobody, and the next Tab starts at the top of the page. The components that render
     * such a control are read: Try again, the star while its write is out, Clear filters once its press
     * has released the last filter, and Archive all (the one button Explore.tsx renders itself) while
     * its run is out. Two controls keep the attribute on purpose, because the keyboard is moved
     * deliberately after them: "Show more" in Group.tsx, and the archive control, whose row leaves the
     * page and whose focus Explore's keepFocus() puts back. The vacuity guard is the button tag itself,
     * in each file.
     *
     * Changes that must make it fail: the disabled attribute back on any button of these files,
     * or no button of one of them saying aria-disabled.
     *
     * @return void
     */
    public function test_the_busy_controls_stay_focusable(): void {
        $files = [
            'js/esm/src/RetryNotice.tsx', 'js/esm/src/Star.tsx', 'js/esm/src/FilterPanel.tsx', 'js/esm/src/Explore.tsx',
        ];
        foreach ($files as $file) {
            $tags = $this->tags($this->sources()[$file], 'button');
            $this->assertNotEmpty($tags, "{$file} renders no button, so the rule is about nothing");
            $ariadisabled = 0;
            foreach ($tags as $tag) {
                $this->assertDoesNotMatchRegularExpression(
                    '/\sdisabled=/',
                    $tag,
                    "{$file}: a disabled attribute on a control that disables itself drops focus to the body"
                );
                if (preg_match('/\saria-disabled=/', $tag)) {
                    $ariadisabled++;
                }
            }
            $this->assertGreaterThan(0, $ariadisabled, "{$file}: no button says aria-disabled while busy");
        }
    }

    /**
     * After an archive the keyboard is put back, even when the group it was in has left the page.
     *
     * The row an archive control sits on leaves the page with it, and so does the dormant group
     * once Archive all has emptied it. keepFocus() in Explore.tsx decides the target before the
     * write, while the control is still there - the group's summary - and a summary that is no
     * longer in the document takes no focus. So the target is checked when it is used, and the
     * section title stands in for a summary that has gone.
     *
     * Changes that must make it fail: focusing the saved summary without checking that it is
     * still in the document, or dropping the section title as the fallback.
     *
     * @return void
     */
    public function test_an_archive_puts_the_keyboard_back_when_the_group_has_left(): void {
        $explore = $this->sources()['js/esm/src/Explore.tsx'];
        $start = strpos($explore, 'const keepFocus = useCallback(');
        // Vacuity guard: the helper must be there to read.
        $this->assertNotFalse($start, 'keepFocus() is not in Explore.tsx any more');
        $end = strpos($explore, '}, []);', $start);
        $this->assertNotFalse($end, 'keepFocus() does not end where a useCallback with no dependencies does');
        $body = substr($explore, $start, $end - $start);

        $this->assertMatchesRegularExpression(
            '/(\w+) !== null && document\.contains\(\1\)\s*\?\s*\1\s*:\s*'
                . 'section\.current\?\.querySelector<HTMLElement>\(\'\.compass-explore-title\'\)/',
            $body,
            'keepFocus() focuses the summary it saved without checking that it is still in the document, '
                . 'or has no section title to fall back on: after Archive all empties the dormant group, the '
                . 'keyboard would stay on the body'
        );
    }

    /**
     * Tier 3 takes the keyboard once per press, not once per render that follows the press.
     *
     * A press on the ghost or on a heading link scrolls tier 3 to the top of the viewport and
     * focuses the section, so that a screen reader announces its name. The effect that does it
     * also runs when anything else it reads changes - chooseChip does when a paged payload lands
     * after the press - and without a record of the press it has handled, it would scroll and
     * take the keyboard a second time, from wherever the reader had moved to since.
     *
     * Changes that must make it fail: dropping the comparison with the last press handled, or
     * the assignment that records it.
     *
     * @return void
     */
    public function test_tier_3_takes_the_keyboard_once_per_press(): void {
        $explore = $this->sources()['js/esm/src/Explore.tsx'];
        // Vacuity guard: one place scrolls the section, and it is an effect.
        $this->assertSame(1, substr_count($explore, '.scrollIntoView('), 'tier 3 is scrolled from no single place');
        $at = strpos($explore, '.scrollIntoView(');
        $start = strrpos(substr($explore, 0, $at), 'useEffect(');
        $this->assertNotFalse($start, 'the scroll into tier 3 is not made by an effect');
        $effect = substr($explore, $start, $at - $start);

        $this->assertMatchesRegularExpression(
            '/if \(reveal === 0 \|\| reveal === (\w+)\.current\) \{\s*return;\s*\}\s*\1\.current = reveal;/',
            $effect,
            'the reveal effect acts again on a press it has handled: it must return when the counter equals '
                . 'the last press it recorded, and record every press it acts on'
        );
    }

    /**
     * A star toggled in tier 1 is toggled in the rows tier 3 holds for the same course.
     *
     * Both tiers draw the core star of a course, and its aria-pressed is what a screen reader
     * says of it. Tier 3's own toggle patches its rows and refetches tier 1; a toggle in tier 1
     * has to reach tier 3 as well, or an open tier 3 keeps announcing the old state, and
     * counting the course under Favourites, until a reload. Block hands the change to Explore as
     * a prop, and Explore applies it through withRow, the one patcher of the rows it holds.
     *
     * Changes that must make it fail: Block no longer recording the toggle after the write, or
     * no longer handing it to Explore; Explore no longer applying it through withRow.
     *
     * @return void
     */
    public function test_a_star_toggled_in_tier_1_reaches_tier_3(): void {
        $sources = $this->sources();
        $block = $sources['js/esm/src/Block.tsx'];
        $explore = $sources['js/esm/src/Explore.tsx'];

        $this->assertMatchesRegularExpression(
            '/await setFavourite\(courseid, favourite\);.*?setStarred\(\{courseid, favourite\}\);/s',
            $block,
            'Block does not record a successful tier 1 toggle for tier 3'
        );
        $tags = $this->tags($block, 'Explore');
        // Vacuity guard: the one place Block renders tier 3.
        $this->assertCount(1, $tags, 'Block renders tier 3 from no single place');
        $this->assertStringContainsString('starred={starred}', $tags[0], 'Block does not hand the toggle to tier 3');
        $this->assertMatchesRegularExpression(
            '/useEffect\(\(\) => \{\s*if \(starred === null\) \{\s*return;\s*\}\s*'
                . 'const \{courseid, favourite\} = starred;\s*'
                . 'withRow\(courseid, \(row\) => \(\{\.\.\.row, fav: favourite\}\)\);\s*'
                . '\}, \[starred, withRow\]\);/',
            $explore,
            'Explore does not apply a tier 1 toggle to the rows it holds through withRow'
        );
    }

    /**
     * Core's notifications are reached through one module, whose loads never reject.
     *
     * A failed write is reported through core/notification, an AMD module the client loads
     * through RequireJS, and that load can fail. Awaited unguarded from a click handler, it ends
     * in an unhandled rejection and says nothing. notify.ts holds both uses - the error
     * notification and the confirmation dialogue - each inside a try, so that each settles
     * whatever happens, and no other client file loads the module itself.
     *
     * Changes that must make it fail: a load of core/notification in any other client file, or
     * one in notify.ts outside a try block.
     *
     * @return void
     */
    public function test_notifications_go_through_the_guarded_module(): void {
        $sources = $this->reactsources();
        $load = '\bamd\s*(?:<[^>]*>)?\s*\(\s*[\'"]core\/notification[\'"]';
        // Vacuity guard: the module must be there to hold the loads.
        $this->assertArrayHasKey('js/esm/src/notify.ts', $sources, 'notify.ts is not in the scan');
        foreach ($sources as $file => $contents) {
            if ($file === 'js/esm/src/notify.ts') {
                continue;
            }
            $this->assertDoesNotMatchRegularExpression(
                '/' . $load . '/',
                $contents,
                "{$file}: loads core/notification itself; use notify() or confirmAction() from notify.ts, which never reject"
            );
        }

        $notify = $sources['js/esm/src/notify.ts'];
        $loads = preg_match_all('/' . $load . '/', $notify);
        $guarded = preg_match_all('/\btry \{\s*const \w+ = await ' . $load . '/', $notify);
        // Vacuity guard: the notification and the dialogue.
        $this->assertSame(2, $loads, 'notify.ts does not hold both uses of core/notification');
        $this->assertSame($loads, $guarded, 'notify.ts loads core/notification outside a try block');
    }

    /**
     * A language string is filled at every placeholder, as core fills it.
     *
     * Accessible names and live-region announcements are built with fill(): the archive
     * control's label, the strip overflow links, "N courses shown". Core's get_string()
     * replaces every {$a} in a string; a fill() that stopped at the first would leave the
     * placeholder itself in what a screen reader reads out, as soon as a translation used the
     * value twice.
     *
     * Changes that must make it fail: going back to String.replace() with a string pattern,
     * which replaces the first occurrence only.
     *
     * @return void
     */
    public function test_fill_replaces_every_placeholder(): void {
        $str = $this->sources()['js/esm/src/str.ts'];
        $start = strpos($str, 'export const fill = ');
        // Vacuity guard: the helper must be there to read.
        $this->assertNotFalse($start, 'fill() is not in str.ts any more');
        $fill = substr($str, $start, strpos($str, ';', $start) - $start);

        $this->assertStringContainsString(
            '.split(\'{$a}\').join(value)',
            $fill,
            'fill() does not replace every {$a}; split and join, as fillObject() does'
        );
        $this->assertStringNotContainsString('.replace(', $fill, 'fill() replaces with a string pattern, which stops at one');
    }

    /**
     * Every class the stylesheet styles is one a template or the client writes.
     *
     * A rule for a class nothing renders reads like a guarantee - a token block on a dialogue
     * root, a brand text colour on a star - while the element that needed it gets nothing. The
     * client writes one family of names from a template literal, the cards grid's column
     * classes, so a class starting with the literal part before a placeholder counts as
     * written. Comments are removed on both sides: a class named in prose is not rendered.
     *
     * Changes that must make it fail: a selector for a class no template or client source
     * writes, such as a dialogue root added to the token rule with no dialogue carrying it.
     *
     * @return void
     */
    public function test_every_styled_class_is_rendered(): void {
        preg_match_all('/(?<![\w-])\.(compass-[\w-]+)/', $this->css(), $matches);
        $styled = array_unique($matches[1]);

        $code = '';
        foreach ($this->sources() as $file => $contents) {
            if (str_ends_with($file, '.css')) {
                continue;
            }
            // Block and line comments in the client, comment tags in the templates.
            $code .= preg_replace(['#/\*.*?\*/#s', '#(?<![:/])//[^\n]*#', '/\{\{!.*?\}\}/s'], '', $contents) . "\n";
        }
        preg_match_all('/(?<![\w-])(compass-[\w-]*-)\$\{/', $code, $prefixes);

        $unrendered = [];
        foreach ($styled as $class) {
            if (preg_match('/(?<![\w-])' . preg_quote($class, '/') . '(?![\w-])/', $code)) {
                continue;
            }
            foreach ($prefixes[1] as $prefix) {
                if (str_starts_with($class, $prefix)) {
                    continue 2;
                }
            }
            $unrendered[] = $class;
        }
        sort($unrendered);

        // Vacuity guards: the stylesheet's classes were read, and the template-literal family was recognised.
        $this->assertGreaterThanOrEqual(30, count($styled), 'fewer than 30 compass-* classes read out of styles.css');
        $this->assertContains('compass-rowcards-', $prefixes[1], 'the cards grid\'s column classes were not recognised');
        $this->assertSame(
            [],
            $unrendered,
            'styles.css styles classes that no template or client source writes: ' . implode(', ', $unrendered)
        );
    }

    /**
     * Nothing is written in capitals: a heading is emphasised with weight, never with case.
     *
     * The rule covers every source, not only headings. Bootstrap's text-uppercase and a
     * text-transform declaration are the two ways to shout, and the strip heading is the
     * vacuity guard: it must exist and carry a weight class.
     *
     * @return void
     */
    public function test_nothing_is_uppercase(): void {
        foreach ($this->reactsources() as $file => $contents) {
            $this->assertDoesNotMatchRegularExpression(
                '/\btext-uppercase\b/',
                $contents,
                "{$file}: text-uppercase shouts; emphasise with fw-bold instead"
            );
        }
        $this->assertDoesNotMatchRegularExpression(
            '/text-transform\s*:\s*uppercase/',
            $this->css(),
            'styles.css: text-transform: uppercase shouts; emphasise with weight instead'
        );

        $strip = $this->sources()['js/esm/src/Strip.tsx'];
        $headings = array_filter(
            $this->tags($strip, 'Heading'),
            static fn(string $tag): bool => str_contains($tag, 'compass-strip-title')
        );
        // Vacuity guard: the strip heading is the tag this rule was written over.
        $this->assertCount(1, $headings, 'the strip heading tag was not found in Strip.tsx');
        $this->assertMatchesRegularExpression(
            '/\bfw-(bold|semibold|medium)\b/',
            reset($headings),
            'the strip heading carries no weight class'
        );
    }

    /**
     * Both card grids count their columns in the client, so a lone card keeps its track.
     *
     * Tier 3's cards and, since ADR-013 decision 7, tier 1's strips: three classes name three counts
     * for each, the stylesheet draws every one as a fixed repeat over minmax(0, 1fr), and the
     * component picks the class from the count it is handed. Tier 1's count is columns.ts's, from
     * the theme card's arithmetic: a 264 px narrowest track and the 16 px gap the stylesheet states,
     * so three tracks from 824 px of block and two from 544. Neither axe nor a scenario measures a
     * column, so the source is the only reader. Changes that must make it fail: tier 1 back on
     * auto-fill, a gap that no longer matches the constant, a strip that stops taking the count.
     *
     * @return void
     */
    public function test_the_cards_grids_count_their_columns(): void {
        $grids = ['compass-rowcards' => 'js/esm/src/RowList.tsx', 'compass-cards' => 'js/esm/src/Strip.tsx'];
        foreach ($grids as $grid => $file) {
            $bodies = [];
            foreach ($this->rules() as $rule) {
                [$selector, $body] = $rule;
                $named = preg_match('/\.' . $grid . '(-[123])?(?![\w-])/', $selector, $matches);
                if ($named && !str_contains($selector, ':')) {
                    $bodies[$matches[1] ?? ''] = $body;
                }
            }
            foreach ([1, 2, 3] as $count) {
                $this->assertArrayHasKey("-{$count}", $bodies, "no .{$grid}-{$count} rule found in styles.css");
                $this->assertMatchesRegularExpression(
                    '/grid-template-columns\s*:\s*repeat\(' . $count . ',\s*minmax\(0,\s*1fr\)\)/',
                    $bodies["-{$count}"],
                    ".{$grid}-{$count} does not draw {$count} equal columns"
                );
            }
            $this->assertStringContainsString(
                $grid . '-${columns}',
                $this->sources()[$file],
                "{$file} does not pick the column class"
            );
        }
        // Tier 3's base rule.
        $base = null;
        $list = null;
        foreach ($this->rules() as $rule) {
            [$selector, $body] = $rule;
            if (preg_match('/\.compass-rowcards(?![\w-])/', $selector) && !str_contains($selector, ':')) {
                $base = $body;
            }
            if (preg_match('/\.compass-cards-list(?![\w-])/', $selector) && !str_contains($selector, ':')) {
                $list = $body;
            }
        }
        $this->assertNotNull($base, 'no .compass-rowcards rule found in styles.css');
        $this->assertMatchesRegularExpression('/\bdisplay\s*:\s*grid\b/', $base, 'the tier 3 cards are not a grid');
        $this->assertDoesNotMatchRegularExpression(
            '/\bflex-wrap\b/',
            $this->sources()['js/esm/src/RowList.tsx'],
            'the cards are a flex line again'
        );

        // Tier 1: a grid with no auto-fill, whose gap is the constant columns.ts computes with.
        $this->assertNotNull($list, 'no .compass-cards-list rule found in styles.css');
        $this->assertMatchesRegularExpression('/\bdisplay\s*:\s*grid\b/', $list, 'the strips are not a grid');
        $this->assertDoesNotMatchRegularExpression('/auto-fill|auto-fit/', $list, 'the strips are back on auto-fill');
        $columns = $this->sources()['js/esm/src/columns.ts'];
        $this->assertMatchesRegularExpression('/export const CARD_TRACK_PX = (\d+);/', $columns);
        preg_match('/export const CARD_TRACK_PX = (\d+);/', $columns, $track);
        preg_match('/export const CARD_GAP_PX = (\d+);/', $columns, $gap);
        $this->assertSame('264', $track[1], 'the narrowest track is no longer the theme card\'s');
        $this->assertMatchesRegularExpression(
            '/\bgap\s*:\s*' . $gap[1] . 'px\b/',
            $list,
            'the gap the grid draws is not the one columns.ts counts with'
        );
        $this->assertSame(824, 3 * (int) $track[1] + 2 * (int) $gap[1], 'three tracks no longer start at 824 px');
        $block = $this->sources()['js/esm/src/Block.tsx'];
        $this->assertStringContainsString('cardColumns(width)', $block, 'Block does not count the columns');
        $this->assertStringContainsString('new ResizeObserver', $block, 'Block does not measure itself');
    }

    /**
     * A tier 1 card stops at 373 px, and the block's page at 1080 px.
     *
     * Each count's grid is capped at that many 373 px tracks and their 16 px gaps, so a card in a
     * wide block keeps the gap rather than sitting at the start of a wider track; the page caps the
     * theme's content box, keyed on its own body class. Changes that must make it fail: a cap that no
     * longer matches its count, a cap moved onto the item, the page rule lost or keyed on a bare
     * theme selector.
     *
     * @return void
     */
    public function test_cards_and_page_have_a_width_cap(): void {
        $caps = [];
        $page = null;
        foreach ($this->rules() as $rule) {
            [$selector, $body] = $rule;
            if (preg_match('/\.compass-cards-([123])(?![\w-])/', $selector, $matches) && !str_contains($selector, ':')) {
                $caps[(int) $matches[1]] = $body;
            }
            if (str_contains($selector, '.block_compass-page') && str_contains($selector, '.main-inner')) {
                $page = $body;
            }
        }
        foreach ([1, 2, 3] as $count) {
            $this->assertArrayHasKey($count, $caps, "no .compass-cards-{$count} rule found in styles.css");
            $width = $count * 373 + ($count - 1) * 16;
            $this->assertMatchesRegularExpression(
                '/\bmax-width\s*:\s*' . $width . 'px\b/',
                $caps[$count],
                ".compass-cards-{$count} is not capped at {$count} tracks of 373 px"
            );
        }
        $this->assertNotNull($page, 'no .block_compass-page .main-inner rule found in styles.css');
        $this->assertMatchesRegularExpression('/\bmax-width\s*:\s*1080px\b/', $page, 'the page is not capped at 1080 px');
    }

    /**
     * A tier 1 card has the theme card's anatomy, and the ghost stretches to its row.
     *
     * ADR-013 decision 7: a 150 px cover, the body padded 12px 16px 14px, the title at 1rem and 600,
     * the meta line at .8125rem - the theme card's numbers (a Boost Union child theme) - and a
     * grid item that lets the ghost take its row's height. Each is read out of its own rule,
     * because nothing else measures a size.
     *
     * @return void
     */
    public function test_a_tier_1_card_has_the_theme_cards_anatomy(): void {
        $wanted = [
            '.compass-card .compass-card-img' => '/\bheight\s*:\s*150px\b/',
            '.compass-card .card-body' => '/\bpadding\s*:\s*12px 16px 14px\b/',
            '.compass-card .compass-card-meta' => '/\bfont-size\s*:\s*0?\.8125rem\b/',
            '.compass-cards-item > .compass-ghost' => '/\bflex\s*:\s*1 1 auto\b/',
        ];
        $found = [];
        $title = null;
        foreach ($this->rules() as $rule) {
            [$selector, $body] = $rule;
            foreach ($wanted as $needle => $pattern) {
                if (str_contains($selector, $needle)) {
                    $found[$needle] = $body;
                }
            }
            if (preg_match('/\.compass-card-title(?![\w-])/', $selector) && !str_contains($selector, ':')) {
                $title = $body;
            }
        }
        foreach ($wanted as $needle => $pattern) {
            $this->assertArrayHasKey($needle, $found, "no {$needle} rule found in styles.css");
            $this->assertMatchesRegularExpression($pattern, $found[$needle], "{$needle} has lost the theme card's measure");
        }
        $this->assertNotNull($title, 'no .compass-card-title rule found in styles.css');
        $this->assertMatchesRegularExpression('/\bfont-size\s*:\s*1rem\b/', $title, 'the card title is not 1rem');
        $this->assertMatchesRegularExpression('/\bfont-weight\s*:\s*600\b/', $title, 'the card title is not 600');
        // Compass has no viewport breakpoints: the counts are the block's, never a media query's.
        $this->assertDoesNotMatchRegularExpression('/@media[^{]*width/', $this->css(), 'a viewport breakpoint crept in');
    }

    /**
     * On a card the star takes the top-right corner, on a disc, the badge the top-left, and the
     * theme's crests the bottom-right of the cover.
     *
     * The star's disc is what keeps the control at 3:1 over a photograph
     * (WCAG 1.4.11): a surface background and a line border, both theme tokens. The crests sit
     * where the theme card puts them (ADR-013 decision 9), measured from the 150 px cover, and let
     * a click through to the stretched link. The two card components must render the star and the
     * crests for the rule to be about anything, and the list row the inline crests.
     *
     * @return void
     */
    public function test_the_card_corners_are_the_stars_the_badges_and_the_crests(): void {
        $badge = null;
        $star = null;
        $crests = null;
        foreach ($this->rules() as $rule) {
            [$selector, $body] = $rule;
            if (preg_match('/\.compass-card-badge(?![\w-])/', $selector) && !str_contains($selector, ':')) {
                $badge = $body;
            }
            if (preg_match('/\.compass-crests-cover$/', trim($selector))) {
                $crests = $body;
            }
            $cardstar = str_contains($selector, '.compass-card .compass-star');
            if ($cardstar && str_contains($selector, '.compass-rowcard .compass-star')) {
                $star = $body;
            }
        }
        // Vacuity guards: both rules must exist to read a corner out of.
        $this->assertNotNull($badge, 'no .compass-card-badge rule found in styles.css');
        $this->assertNotNull($star, 'no card star rule (.compass-card .compass-star, .compass-rowcard .compass-star) found');

        $this->assertMatchesRegularExpression('/\bleft\s*:/', $badge, 'the badge is not anchored left');
        $this->assertDoesNotMatchRegularExpression('/\bright\s*:/', $badge, 'the badge is still anchored right');
        $this->assertMatchesRegularExpression('/\bposition\s*:\s*absolute\b/', $star, 'the card star is not over the image');
        $this->assertMatchesRegularExpression('/\bright\s*:/', $star, 'the card star is not anchored right');
        $this->assertMatchesRegularExpression('/\btop\s*:/', $star, 'the card star is not anchored top');
        $this->assertMatchesRegularExpression('/border-radius\s*:\s*50%/', $star, 'the star has no disc');
        $this->assertMatchesRegularExpression(
            '/\bbackground\s*:\s*var\(--block_compass-surface/',
            $star,
            'the disc is not painted with the surface token'
        );
        $this->assertMatchesRegularExpression('/\bborder\s*:.*var\(--block_compass-line/', $star, 'the disc has no line border');

        foreach (['js/esm/src/Card.tsx', 'js/esm/src/RowCard.tsx'] as $file) {
            $this->assertNotEmpty(
                $this->tags($this->sources()[$file], 'Star'),
                "{$file} renders no Star, so the corner rule is about nothing"
            );
            $this->assertNotEmpty($this->tags($this->sources()[$file], 'Crests'), "{$file} renders no crests");
        }

        $this->assertNotNull($crests, 'no .compass-crests-cover rule found in styles.css');
        $this->assertMatchesRegularExpression('/\bposition\s*:\s*absolute\b/', $crests, 'the crests are not over the cover');
        $this->assertMatchesRegularExpression('/\bright\s*:/', $crests, 'the crests are not anchored right');
        $this->assertMatchesRegularExpression('/\btop\s*:\s*calc\(150px\b/', $crests, 'the crests are not measured from the cover');
        $this->assertMatchesRegularExpression('/\bpointer-events\s*:\s*none\b/', $crests, 'the crests swallow the card\'s click');
        $this->assertDoesNotMatchRegularExpression('/\bleft\s*:/', $crests, 'the crests reach the New badge\'s corner');
        $inline = array_filter(
            $this->tags($this->sources()['js/esm/src/Row.tsx'], 'Crests'),
            static fn(string $tag): bool => (bool) preg_match('/\binline\b/', $tag)
        );
        $this->assertCount(1, $inline, 'the list row does not render its crests inline');
    }

    /**
     * The brand's marks go through the ink token, which dark mode lightens until it reads.
     *
     * The a11y sweep of 2026-10-14 measured, in dark mode on the theme's navy brand, a card's outline
     * button, the calendar's dots, its needle and its checked switch at 1.1:1 against the dark body:
     * each was painted with the theme's primary, which Bootstrap does not move in dark mode. The
     * cure is one token, --block_compass-brand-ink: the primary in light mode, a mix of the primary
     * into the body colour in dark mode (the ratios are in styles.css). The rule pins the pairing,
     * not the ratio, as the brand text rule does: nothing paints with the theme's primary directly
     * outside a token declaration, the calendar's accent and the plain brand token resolve to the
     * ink, the dark rule redefines the ink with a colour-mix() of theme tokens and points the plain
     * brand at it, the checked switch and the dark outline button take the ink, and an accent pill's
     * text follows its fill.
     *
     * Changes that must make it fail: a dot or a ring back on var(--bs-primary); the dark ink
     * dropped or written as a literal; the switch or the outline button rule deleted.
     *
     * @return void
     */
    public function test_marks_go_through_the_dark_aware_ink(): void {
        $direct = [];
        $declarations = 0;
        foreach ($this->rules() as [$selector, $body]) {
            foreach (explode(';', $body) as $declaration) {
                $declaration = trim($declaration);
                if ($declaration === '' || str_starts_with($declaration, '--')) {
                    continue;
                }
                $declarations++;
                if (str_contains($declaration, 'var(--bs-primary')) {
                    $direct[] = "{$selector} { {$declaration} }";
                }
            }
        }
        $this->assertGreaterThanOrEqual(100, $declarations, 'fewer than 100 declarations read: has the stylesheet moved?');
        $this->assertSame([], $direct, 'painted with the theme\'s primary, 1.1:1 on the dark body: ' . implode('; ', $direct));

        $light = '';
        $dark = '';
        foreach ($this->rules() as [$selector, $body]) {
            if (trim($selector) === '.block_compass') {
                $light .= $body;
            } else if (str_contains($selector, self::DARK_ATTRIBUTE) && str_contains($body, '--block_compass-brand-text:')) {
                $dark .= $body;
            }
        }
        $this->assertMatchesRegularExpression(
            '/--block_compass-brand-ink:\s*var\(--bs-primary\b/',
            $light,
            'the ink\'s light value is the theme\'s primary'
        );
        $this->assertMatchesRegularExpression(
            '/--block_compass-cal-accent:\s*var\(--block_compass-brand-ink\)/',
            $light,
            'the calendar\'s dots, rings and needle are painted with --block_compass-cal-accent, which must be the ink'
        );
        $this->assertMatchesRegularExpression(
            '/--block_compass-brand-ink:\s*color-mix\(in oklab,\s*var\(--bs-primary\b[^;]*var\(--bs-body-color\b/',
            $dark,
            'the dark rule must mix the primary into the body colour for the ink'
        );
        $this->assertMatchesRegularExpression(
            '/--block_compass-brand:\s*var\(--block_compass-brand-ink\)/',
            $dark,
            'the dark rule must point the plain brand (rings, outlines, borders) at the ink'
        );
        $this->assertMatchesRegularExpression('/--block_compass-brand-onink:/', $dark, 'the text on the ink in dark mode');

        $switch = 0;
        $outline = 0;
        foreach ($this->rules() as [$selector, $body]) {
            if (str_contains($selector, '.form-check-input:checked') && str_contains($selector, '.block_compass')) {
                $switch += preg_match('/background-color:\s*var\(--block_compass-brand-ink\)/', $body);
            }
            if (str_contains($selector, self::DARK_ATTRIBUTE) && str_contains($selector, '.btn-outline-primary:not(:hover)')) {
                $outline += preg_match('/(?<![-\w])color:\s*var\(--block_compass-brand-ink\)/', $body);
            }
        }
        $this->assertSame(1, $switch, 'the checked relevance switch is not painted with the ink');
        $this->assertSame(1, $outline, 'the dark outline button is not painted with the ink');
    }

    /**
     * There is no permanent reload control: a way back exists only in the notice a failed load shows.
     *
     * The maintainer's rule (ADR-014 amendment 11): a reload or retry control appears only when a
     * load fails, as block_feedback_tracker's RetryNotice does. So no component of its own, no class
     * or label of one, and the page reload is RetryNotice's alone. The notice's focus fallback, which
     * hands the keyboard on when the notice leaves (WCAG 2.4.3), names only classes a component
     * renders: the reload control it once named is gone, and a fallback to nothing drops the
     * keyboard to the body. Vacuity guards: the notice's reload and its fallback chain were found.
     *
     * Changes that must make it fail: a reload control back in any component; the fallback aimed at a
     * class nothing renders.
     *
     * @return void
     */
    public function test_a_way_back_appears_only_with_a_failure(): void {
        $sources = $this->reactsources();
        $this->assertArrayNotHasKey('js/esm/src/Reload.tsx', $sources, 'a component of its own for a reload control');
        foreach ($sources as $file => $contents) {
            $this->assertDoesNotMatchRegularExpression(
                '/compass-reload\b|labels\.reload\b/',
                $contents,
                "{$file}: a reload control"
            );
            if ($file !== 'js/esm/src/RetryNotice.tsx') {
                $this->assertStringNotContainsString('location.reload', $contents, "{$file}: a page reload outside RetryNotice");
            }
        }
        $notice = $sources['js/esm/src/RetryNotice.tsx'];
        $this->assertStringContainsString('window.location.reload()', $notice, 'vacuity: the notice\'s own reload');

        preg_match_all("/querySelector<HTMLElement>\('\.([\w-]+)'\)/", $notice, $matches);
        $this->assertNotEmpty($matches[1], 'vacuity: the focus fallback chain was not found');
        $code = '';
        foreach ($sources as $file => $contents) {
            if ($file !== 'js/esm/src/RetryNotice.tsx') {
                $code .= $contents;
            }
        }
        foreach ($matches[1] as $class) {
            $this->assertMatchesRegularExpression(
                '/className=["\'][^"\']*(?<![\w-])' . preg_quote($class, '/') . '(?![\w-])/',
                $code,
                "the focus fallback names .{$class}, which no component renders"
            );
        }
    }

    /**
     * The strip's toggle is a disclosure inside the strip's heading, and the region it controls is always there.
     *
     * The WAI disclosure pattern (ADR-014 amendment 11, the mockup's anatomy): a button inside the
     * heading, its state in aria-expanded and never in its text, aria-controls naming the row's
     * region. The region is rendered closed too, empty and hidden, so the id the button names always
     * exists. Vacuity guards: the toggle, the heading and the region were found.
     *
     * The chevron carries core's btn-icon icons-collapse-expand, the box a course section's toggle
     * is drawn in, so the strip reads as expandable the way a section does.
     *
     * Changes that must make it fail: aria-expanded or aria-controls dropped; the toggle out of the
     * heading; the region rendered only when open; the chevron out of core's toggle box.
     *
     * @return void
     */
    public function test_the_strip_toggle_is_a_disclosure_in_its_heading(): void {
        $source = $this->sources()['js/esm/src/CalendarStrip.tsx'];
        $toggles = array_values(array_filter(
            $this->tags($source, 'button'),
            static fn(string $tag): bool => str_contains($tag, 'compass-cal-toggle')
        ));
        $this->assertCount(1, $toggles, 'the strip\'s toggle was not found');
        $this->assertMatchesRegularExpression('/\saria-expanded=\{open\}/', $toggles[0], 'the toggle states its state');
        $this->assertMatchesRegularExpression('/\saria-controls=\{bodyid\}/', $toggles[0], 'the toggle names its region');
        $this->assertSame(
            2,
            substr_count($source, "'compass-cal-togglechev btn btn-icon icons-collapse-expand"),
            'the chevron is drawn in core\'s section toggle box, open and closed'
        );

        $this->assertMatchesRegularExpression(
            '/<Heading className="compass-cal-title[^"]*">\s*<button\s[^>]*compass-cal-toggle/s',
            $source,
            'the toggle is the heading\'s button'
        );
        $regions = array_values(array_filter(
            $this->tags($source, 'div'),
            static fn(string $tag): bool => str_contains($tag, 'id={bodyid}')
        ));
        $this->assertCount(1, $regions, 'the region the toggle controls was not found');
        $this->assertMatchesRegularExpression(
            '/\shidden=\{!open\}/',
            $regions[0],
            'the region stays rendered, hidden while closed'
        );
    }

    /**
     * A closed strip asks for its counts alone; an open one for its row alone.
     *
     * The maintainer's rule (ADR-014 amendment 11): closed fires no get_strip and no get_day; the
     * counts are asked only while closed, and never once a payload is in hand (closing sums it).
     * No JavaScript runner exists, so the two request effects' guards are read where they are
     * written. Vacuity guards: both requests were found, each in one effect.
     *
     * Changes that must make it fail: the row asked while closed; the counts asked while open or with
     * a payload in hand.
     *
     * @return void
     */
    public function test_a_closed_strip_asks_only_for_its_counts(): void {
        $source = $this->sources()['js/esm/src/CalendarStrip.tsx'];
        preg_match_all('/useEffect\(\(\) => \{\n(.*?)\n    \}, \[[^\]]*\]\);/s', $source, $effects);
        $strip = array_values(array_filter($effects[1], static fn(string $body): bool => str_contains($body, 'getStrip()')));
        $counts = array_values(array_filter($effects[1], static fn(string $body): bool => str_contains($body, 'getStripCounts()')));
        $this->assertCount(1, $strip, 'the row\'s request effect was not found');
        $this->assertCount(1, $counts, 'the counts\' request effect was not found');
        $this->assertMatchesRegularExpression(
            '/^\s*if \(turn === 0 \|\| !open\) \{/',
            $strip[0],
            'the row is asked only while open'
        );
        $this->assertMatchesRegularExpression(
            '/^\s*if \(turn === 0 \|\| open \|\| payload !== null\) \{/',
            $counts[0],
            'the counts are asked only while closed, and never with a payload to sum'
        );
    }

    /**
     * The closed line draws plain counts: no kind marks, no "up to", no needle, no day off.
     *
     * The maintainer's decisions 5 and 7 of the slim strip (ADR-014 amendment 11): the line keeps the
     * toggle, the views switch, the calendar link, the periods with plain counts and, with
     * block_feedback_tracker's ledger, the waiting lead. Vacuity guard: the period buttons were found,
     * each named by its sentence.
     *
     * Changes that must make it fail: a dot, a ring, the bound wording, the needle or a day off drawn
     * on the closed line.
     *
     * @return void
     */
    public function test_the_closed_line_draws_plain_counts(): void {
        $source = $this->sources()['js/esm/src/CalendarLine.tsx'];
        $periods = array_values(array_filter(
            $this->tags($source, 'button'),
            static fn(string $tag): bool => str_contains($tag, 'className={classes}')
        ));
        $this->assertCount(1, $periods, 'the period button was not found');
        $this->assertMatchesRegularExpression('/\saria-label=\{label\}/', $periods[0], 'a period is named by its sentence');
        $code = preg_replace(['#/\*.*?\*/#s', '#(?<![:/])//[^\n]*#'], '', $source);
        $drawn = [
            'compass-cal-dot', 'compass-cal-ring', 'compass-cal-needle', 'cal_upto', 'needle', 'dayOff', 'specialdays', 'legend',
        ];
        foreach ($drawn as $word) {
            $this->assertStringNotContainsString($word, $code, "the closed line draws {$word}");
        }
    }

    /**
     * A period's short label, drawn on a narrow block, is part of the name its button speaks.
     *
     * WCAG 2.5.3: a voice-control user says what they see, and the button's name is the long
     * label's sentence; a short label that is not in the long one ("Tmrw." beside "Tomorrow")
     * cannot be spoken to the button. Compared case-insensitively, in every shipped language.
     *
     * @return void
     */
    public function test_a_short_period_label_is_inside_its_long_one(): void {
        global $CFG;

        $checked = 0;
        foreach (self::languages() as $lang) {
            $string = [];
            include($CFG->dirroot . "/blocks/compass/lang/{$lang}/block_compass.php");
            foreach ($string as $key => $short) {
                if (!str_starts_with($key, 'cal_period_') || !str_ends_with($key, '_short')) {
                    continue;
                }
                $long = $string[substr($key, 0, -strlen('_short'))];
                $this->assertStringContainsStringIgnoringCase(
                    rtrim($short, '.'),
                    $long,
                    "{$lang}: {$key} is not inside its long label"
                );
                $checked++;
            }
        }
        // Vacuity guard: six periods in every language checked.
        $this->assertGreaterThanOrEqual(6 * count(self::languages()), $checked);
    }

    /**
     * The body of one arrow function of a client source, from its declaration to its closing line.
     *
     * @param string $source The file.
     * @param string $start The text the declaration starts with.
     * @param string $end The closing line: a component's inner function by default, "\n};\n" for a module's.
     * @return string The body; the test fails when the declaration is missing.
     */
    private function body(string $source, string $start, string $end = "\n    };\n"): string {
        $from = strpos($source, $start);
        $this->assertNotFalse($from, "{$start} not found");
        $to = strpos($source, $end, $from);
        $this->assertNotFalse($to, "the end of {$start} not found");

        return substr($source, $from, $to - $from);
    }

    /**
     * The strip's arrows are named pointer conveniences, out of the tab order, disabled by attribute
     * state at each end, and refused there by their handler.
     *
     * ADR-014 amendment 12 (the scroll notes' D2): the arrows float over the row's ends; the row's keys do
     * everything they do, so they are not tab stops, but voice control needs their names, so they are
     * neither aria-hidden nor unnamed. At each end of the window an arrow says aria-disabled (never the
     * disabled attribute, which would drop a focused control's keyboard to the body), and its handler
     * refuses, since aria-disabled stops nothing by itself. They show only on a wide block whose window
     * is longer than its row. Vacuity guard: both arrows were found, each by its own class.
     *
     * Changes that must make it fail: an arrow back in the tab order, unnamed, hidden from assistive
     * technology or without its end state; the handler moving past an end; the arrows on a narrow block.
     *
     * @return void
     */
    public function test_the_strip_arrows_are_named_pointer_conveniences(): void {
        $source = $this->sources()['js/esm/src/CalendarStrip.tsx'];
        $edges = array_values(array_filter(
            $this->tags($source, 'button'),
            static fn(string $tag): bool => str_contains($tag, 'compass-cal-edge ')
        ));
        $this->assertCount(2, $edges, 'the two arrows were not found');
        $expected = [
            'compass-cal-edge-prev' => ['cal_prev', 'atstart', '-1'],
            'compass-cal-edge-next' => ['cal_next', 'atend', '1'],
        ];
        foreach ($expected as $class => [$name, $end, $direction]) {
            $tags = array_values(array_filter($edges, static fn(string $tag): bool => str_contains($tag, $class)));
            $this->assertCount(1, $tags, "{$class} was not found");
            $tag = $tags[0];
            $this->assertMatchesRegularExpression('/\stabIndex=\{-1\}/', $tag, "{$class}: out of the tab order");
            $this->assertMatchesRegularExpression("/\\saria-label=\\{strings\\.{$name}\\}/", $tag, "{$class}: named");
            $this->assertMatchesRegularExpression(
                "/\\saria-disabled=\\{rowview\\.{$end} \\|\\| undefined\\}/",
                $tag,
                "{$class}: disabled at its end"
            );
            $this->assertDoesNotMatchRegularExpression('/\s(disabled|aria-hidden)=/', $tag, "{$class}: disabled or hidden");
            $this->assertStringContainsString("onClick={() => page({$direction})}", $tag, "{$class}: steps through page()");
        }
        $page = $this->body($source, 'const page = (direction: number): void => {');
        $this->assertStringContainsString(
            'if (direction < 0 ? scroll <= EDGE_TOLERANCE_PX : scroll >= el.scrollWidth - el.clientWidth - EDGE_TOLERANCE_PX) {',
            $page,
            'the handler refuses at each end'
        );
        $this->assertStringContainsString(
            'scrollRow((Math.round(scroll / row.pitch) + direction * stepdays) * row.pitch, true);',
            $page,
            'an arrow steps whole weeks'
        );
        $this->assertStringContainsString('const arrows = !narrow && scrolls;', $source, 'arrows only where the row scrolls, wide');
    }

    /**
     * The window's map is a pointer scrubber hidden from assistive technology, and the native scrollbar is
     * hidden wherever it shows.
     *
     * The maintainer's round 3 (the scroll notes' D8 and D10): the map is aria-hidden and out of the tab
     * order, because the row already does by keyboard all the map does and a slider would be a second tab
     * stop with a second model of the same position; it leaves the page's vertical pan to touch, turns the
     * snap off while it drags, and shows only on a wide block whose window is longer than its row, where
     * it replaces the browser's scrollbar. A narrow block keeps the platform's thin one. Vacuity guard:
     * the map element was found by its pointer handler.
     *
     * Changes that must make it fail: the map exposed or focusable; the native scrollbar shown beside it;
     * the snap left on during a drag.
     *
     * @return void
     */
    public function test_the_window_map_is_a_hidden_pointer_scrubber(): void {
        $source = $this->sources()['js/esm/src/CalendarStrip.tsx'];
        $maps = array_values(array_filter(
            $this->tags($source, 'div'),
            static fn(string $tag): bool => str_contains($tag, 'onPointerDown={mapDown}')
        ));
        $this->assertCount(1, $maps, 'the map was not found');
        $this->assertMatchesRegularExpression('/\saria-hidden="true"/', $maps[0], 'the map is hidden from assistive technology');
        $this->assertDoesNotMatchRegularExpression('/\s(tabIndex|role)=/', $maps[0], 'the map is no control of the tab order');
        $this->assertStringContainsString('const map = !narrow && scrolls;', $source, 'the map only where the row scrolls, wide');
        $this->assertStringContainsString("el.classList.add('compass-cal-nosnap');", $this->body($source, 'const mapDown = '));
        $this->assertStringContainsString("el.classList.remove('compass-cal-nosnap');", $this->body($source, 'const mapUp = '));

        $found = [];
        foreach ($this->rules() as [$selector, $body]) {
            if ($selector === '.block_compass .compass-cal-days') {
                $found['scroller'] = preg_match('/(?<![-\w])scrollbar-width:\s*none;/', $body);
                $found['snap'] = preg_match('/scroll-snap-type:\s*x mandatory;/', $body);
            } else if ($selector === '.block_compass .compass-cal-narrow .compass-cal-days') {
                $found['narrow'] = preg_match('/(?<![-\w])scrollbar-width:\s*thin;/', $body);
            } else if ($selector === '.block_compass .compass-cal-days.compass-cal-nosnap') {
                $found['nosnap'] = preg_match('/scroll-snap-type:\s*none;/', $body);
            } else if ($selector === '.block_compass .compass-cal-map') {
                $found['pan'] = preg_match('/touch-action:\s*pan-y;/', $body);
            }
        }
        $this->assertSame(
            ['narrow' => 1, 'nosnap' => 1, 'pan' => 1, 'scroller' => 1, 'snap' => 1],
            array_merge(['narrow' => 0, 'nosnap' => 0, 'pan' => 0, 'scroller' => 0, 'snap' => 0], $found),
            'the scroller hides its scrollbar and snaps, the narrow one keeps a thin one, the drag unsnaps, the map pans'
        );
    }

    /**
     * The strip scrolls itself, never the page, jumps under reduced motion, and holds Moodle's pending
     * counter while its own smooth scroll runs.
     *
     * The scroll notes' D7 and risks 1 and 5: a day's focus moves with preventScroll and the row then
     * scrolls by the least that shows it, because scrollIntoView's block axis would move the page; every
     * programmatic scroll is instant when reduced motion is asked for; and a Behat step must not click
     * mid-animation, so the strip's own scroll holds the pending counter until it settles and that is
     * rendered. Vacuity guards: the scroll call, the focus calls and the hold were found.
     *
     * Changes that must make it fail: a scrollIntoView anywhere in the strip's sources, a day focused without
     * preventScroll, a smooth scroll that ignores reduced motion, the hold dropped.
     *
     * @return void
     */
    public function test_the_strip_scrolls_itself_and_never_the_page(): void {
        $strip = ['CalendarStrip.tsx', 'CalendarCard.tsx', 'CalendarLine.tsx', 'calendar.ts'];
        foreach ($strip as $name) {
            // Code only: the comments say why it is not called. Tier 3's index moves the page on purpose.
            $code = preg_replace(['#/\*.*?\*/#s', '#(?<![:/])//[^\n]*#'], '', $this->sources()["js/esm/src/{$name}"]);
            $this->assertStringNotContainsString('scrollIntoView', $code, "{$name}: scrollIntoView moves the page too");
        }
        $source = $this->sources()['js/esm/src/CalendarStrip.tsx'];
        $scroll = $this->body($source, 'const scrollRow = (target: number, smooth: boolean): void => {');
        $this->assertStringContainsString(
            "el.scrollTo({left: isRtl(el) ? -left : left, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto'});",
            $scroll,
            'the row scrolls itself, and jumps under reduced motion'
        );
        $this->assertStringContainsString("window.matchMedia('(prefers-reduced-motion: reduce)')", $source);
        $tick = chr(96);
        $this->assertStringContainsString(
            "scrollhold.current = hold({$tick}block_compass/calendar-scroll-\${cardid}{$tick});",
            $scroll,
            'the strip\'s own scroll holds the pending counter'
        );
        $this->assertStringContainsString('selfscroll.current = true;', $scroll);
        $this->assertStringContainsString('setSettled((current) => current + 1);', $this->body($source, 'const endSelfScroll = '));
        $this->assertMatchesRegularExpression(
            '/useEffect\(\(\) => \{\s*if \(!selfscroll\.current && scrollhold\.current !== null\) \{\s*'
                . 'scrollhold\.current\(\);\s*scrollhold\.current = null;\s*\}\s*\}, \[settled\]\);/',
            $source,
            'the hold is let go only after the settled scroll is rendered'
        );

        preg_match_all('/([\w.?]+)\.focus\(([^)]*)\)/', $source, $calls, PREG_SET_ORDER);
        $days = 0;
        foreach ($calls as [$call, $target, $argument]) {
            if ($target === 'togglebutton.current?') {
                continue;
            }
            $days++;
            $this->assertSame('{preventScroll: true}', $argument, "a day focused with the browser's own scroll: {$call}");
        }
        $this->assertGreaterThanOrEqual(2, $days, 'vacuity: the day focus calls were not found');
    }

    /**
     * A day opens on hover only while it is wholly in view, a press reveals a peeking day first, and only
     * the viewer's scroll closes an open day.
     *
     * The maintainer's round 2, request 5 (the scroll notes' D3 and D4): wholly in view is the day's
     * column inside the scroller less the arrows' inset at each end. A partly hidden day neither opens
     * nor prefetches on hover, and the hover timer asks again when it fires; a press or a keyboard focus
     * on it scrolls it into view first. A user's scroll closes a hovered day, and a pinned one once its day
     * leaves the view by the same test; the strip's own scrolls are flagged and close nothing (else a
     * reveal closes the card it opens for). Vacuity guard: each handler was found.
     *
     * Changes that must make it fail: the hover open without the test; the press pinning a peeking day
     * where it is; the test ignoring the inset; the strip's own scrolls treated as the viewer's; a pinned
     * card kept, or closed, whatever its day's place.
     *
     * @return void
     */
    public function test_hover_opens_only_a_day_wholly_in_view(): void {
        $source = $this->sources()['js/esm/src/CalendarStrip.tsx'];
        $enter = $this->body($source, 'const enterDay = (');
        $guard = strpos($enter, "if (!isWhole(index)) {\n            if (hover !== null) {\n                setHover(null);");
        $timer = strpos($enter, 'opentimer.current = window.setTimeout(() => {');
        $this->assertNotFalse($guard, 'a partly hidden day opens on hover');
        $this->assertNotFalse($timer, 'vacuity: the hover timer');
        $this->assertLessThan($timer, $guard, 'the test runs before the timer is set');
        $this->assertStringContainsString("            if (isWhole(index)) {\n                openDay(date, true);", $enter);

        $press = $this->body($source, 'const pressDay = (');
        $this->assertMatchesRegularExpression(
            '/\n        reveal\(index\);\n        setPinned\(date\);/',
            $press,
            'a press reveals first'
        );
        $focus = $this->body($source, 'const focusDay = (');
        $this->assertStringContainsString("\n        reveal(index);\n", $focus, 'a focus reveals');

        $scrolled = $this->body($source, 'const scrolled = (): void => {');
        $this->assertMatchesRegularExpression(
            '/^const scrolled = \(\): void => \{\s*if \(selfscroll\.current\) \{\s*window\.clearTimeout\(selftimer\.current\);'
                . '\s*selftimer\.current = window\.setTimeout\(endSelfScroll, SCROLL_QUIET_MS\);\s*\} else \{\s*userScrolled\(\);/',
            $scrolled,
            'only the viewer\'s scroll closes anything'
        );
        $user = $this->body($source, 'const userScrolled = (): void => {');
        $this->assertStringContainsString(
            'if (!el || index < 0 || whollyInView(index, geo.current.row, scrollOf(el), el.clientWidth)) {',
            $user,
            'a pinned day closes once it leaves the view, by the hover\'s test'
        );
        $this->assertStringContainsString("closeAll();\n        if (incard) {\n            focusQuietly(day);", $user);

        $calendar = $this->sources()['js/esm/src/calendar.ts'];
        $this->assertStringContainsString(
            'return start >= row.inset - 0.5 && start + row.column <= width - row.inset + 0.5;',
            $this->body($calendar, 'export const whollyInView = (', "\n};\n"),
            'wholly in view leaves the arrows\' inset out at both ends'
        );
    }

    /**
     * A day's marks say which kinds are present, never how many: one mark per kind, never repeated, by
     * priority, in four slots, the last a "+N" of the further kinds; and the day's sentence names the kinds
     * in the same order.
     *
     * The maintainer's round 3 (the scroll notes, "Marks"): Studying Graded › Late, still open › To do ›
     * Event › Done, graded due soon being the Graded kind, ringed; Teaching grading › class deadlines ›
     * events. With more than four kinds, the first three and "+N", N counting kinds, not items. The ring
     * style's arcs stay one per item. No JavaScript runner exists, so the rule is read where it is written,
     * and the stylesheet keeps the slot on one line. Vacuity guards: the function, the render and the
     * sentence were found.
     *
     * Changes that must make it fail: a fifth slot; another priority; a mark per item; "+N" counting items;
     * the sentence in another order.
     *
     * @return void
     */
    public function test_a_day_marks_each_kind_once_in_four_slots(): void {
        $calendar = $this->sources()['js/esm/src/calendar.ts'];
        $this->assertStringContainsString('export const MARK_SLOTS = 4;', $calendar);
        $this->assertStringContainsString(
            "    learning: [['gradedsoon', 'graded'], ['late'], ['todo'], ['event'], ['done']],",
            $calendar,
            'the studying priority'
        );
        $this->assertStringContainsString("    teaching: [['gradesoon', 'grade'], ['class'], ['event']],", $calendar);
        $marks = $this->body($calendar, 'export const marks = (', "\n};\n");
        $this->assertStringContainsString(
            'const shown = group.find((kind) => kinds.includes(kind) && (day.counts[kind] ?? 0) > 0);',
            $marks,
            'one mark per kind, the first of its group present'
        );
        $this->assertStringContainsString("if (present.length <= MARK_SLOTS) {\n        return {kinds: present, more: 0};", $marks);
        $this->assertStringContainsString(
            'return {kinds: present.slice(0, MARK_SLOTS - 1), more: present.length - (MARK_SLOTS - 1)};',
            $marks,
            'three marks and a "+N" counting the further kinds'
        );

        $strip = $this->sources()['js/esm/src/CalendarStrip.tsx'];
        $this->assertStringContainsString('const mark = marks(day, kinds, drawn);', $strip);
        $this->assertMatchesRegularExpression(
            '/<span className="compass-cal-dots" aria-hidden="true">\s*\{mark\.kinds\.map\(\(kind\) => \(\s*'
                . '<span key=\{kind\} className=\{\x60compass-cal-dot compass-cal-dot-\$\{kind\}\x60\} \/>\s*\)\)\}\s*'
                . '\{mark\.more > 0 && <span className="compass-cal-more">\{\x60\+\$\{mark\.more\}\x60\}<\/span>\}\s*<\/span>/',
            $strip,
            'the marks row draws the marks and the "+N", nothing per item'
        );
        $this->assertStringContainsString('{segments(items)}', $strip, 'the ring keeps one arc per item');

        $label = $this->body($strip, 'const dayLabel = ');
        $order = [
            "'cal_count_gradedsoon_today'", "'cal_count_graded'", "'cal_count_late'", "'cal_count_todo'",
            'cal_count_gradesoon_today', "cal_count_grade,", "'cal_count_class'", "'cal_count_event'", "'cal_count_done'",
        ];
        $at = -1;
        foreach ($order as $key) {
            $found = strpos($label, $key);
            $this->assertNotFalse($found, "the sentence does not name {$key}");
            $this->assertGreaterThan($at, $found, "the sentence names {$key} out of the marks' order");
            $at = $found;
        }

        $nowrap = 0;
        foreach ($this->rules() as [$selector, $body]) {
            if ($selector === '.block_compass .compass-cal-dots') {
                $nowrap += preg_match('/white-space:\s*nowrap;/', $body);
            }
        }
        $this->assertSame(1, $nowrap, 'the marks\' slot wraps');
    }

    /**
     * The language file of one language, read as the plugin ships it.
     *
     * @param string $lang A language of {@see self::languages()}.
     * @return array Key => string.
     */
    private function langstrings(string $lang): array {
        $string = [];
        include(dirname(__DIR__, 2) . '/lang/' . $lang . '/block_compass.php');

        return $string;
    }

    /**
     * Every text the stylesheet cuts with an ellipsis carries its whole text in a title.
     *
     * An ellipsis hides the end of a text, and the title is how a sighted reader gets it back: the day
     * card's course short name, its pills, its chips and its action, read from the stylesheet, so a new
     * ellipsis rule brings its class into this check by itself. The class is a rule's last class; each
     * element of the React sources carrying it must write a title attribute. Vacuity guard: the four
     * classes the visual pass of 2026-10-15 cut, and at least one element each.
     *
     * @return void
     */
    public function test_every_ellipsis_carries_its_whole_text_in_a_title(): void {
        $classes = [];
        foreach ($this->rules() as [$selector, $body]) {
            if (!preg_match('/(?<![\w-])text-overflow\s*:\s*ellipsis\b/', $body)) {
                continue;
            }
            foreach (explode(',', $selector) as $one) {
                if (preg_match_all('/\.(compass-[\w-]+)/', $one, $found)) {
                    $classes[] = end($found[1]);
                }
            }
        }
        $classes = array_values(array_unique($classes));
        foreach (['compass-cal-course', 'compass-cal-pill', 'compass-cal-chiptext', 'compass-cal-action'] as $expected) {
            $this->assertContains($expected, $classes, "vacuity: no ellipsis rule for .{$expected}");
        }
        foreach ($classes as $class) {
            $seen = 0;
            foreach ($this->reactsources() as $file => $contents) {
                foreach (self::all_tags($contents) as $tag) {
                    if (!preg_match('/className=[^>]*(?<![\w-])' . preg_quote($class, '/') . '(?![\w-])/', $tag)) {
                        continue;
                    }
                    $seen++;
                    $this->assertMatchesRegularExpression(
                        '/\stitle=\{/',
                        $tag,
                        "{$file}: .{$class} is cut with an ellipsis but carries no title: " . trim($tag)
                    );
                }
            }
            $this->assertGreaterThan(0, $seen, "vacuity: no element renders .{$class}");
        }
    }

    /**
     * A day's action shows a short verb of this plugin's, and its accessible name starts with it.
     *
     * Core's action names run to "Tentar responder o questionário agora", which squeezed the item's
     * title to three letters; CalendarCard.tsx's actionLabel() shows a verb from ACTION_VERBS (by
     * module) or the teaching kinds' Grade and View, keeps core's whole name as the title, and names
     * the link cal_act_label, "{$a->action}: {$a->name}": the visible verb first, so the visible
     * label is inside the accessible name (WCAG 2.5.3). Read here: the verbs exist, fit the twelve-
     * character budget in both languages, the label template leads with the verb in both, and every
     * action element is drawn from the label. Vacuity guard: the map holds quiz and assign, the two
     * modules whose names broke the card, and four action elements are drawn.
     *
     * @return void
     */
    public function test_a_day_action_shows_a_short_verb_inside_its_accessible_name(): void {
        $card = $this->reactsources()['js/esm/src/CalendarCard.tsx'];
        $this->assertSame(1, preg_match('/const ACTION_VERBS: Record<string, string> = \{(.*?)\};/s', $card, $map));
        preg_match_all("/^\s*(\w+): '(cal_act_\w+)',$/m", $map[1], $entries, PREG_SET_ORDER);
        $verbs = [];
        foreach ($entries as $entry) {
            $verbs[$entry[1]] = $entry[2];
        }
        $this->assertSame('cal_act_attempt', $verbs['quiz'] ?? null, 'a quiz says Attempt, not "Attempt quiz now"');
        $this->assertSame('cal_act_submit', $verbs['assign'] ?? null, 'an assignment says Submit, not "Add submission"');
        foreach (['choice', 'questionnaire', 'survey'] as $module) {
            $this->assertSame('cal_act_answer', $verbs[$module] ?? null, "a {$module} says Answer");
        }
        $this->assertSame('cal_act_open', $verbs['workshop'] ?? null, 'a workshop says Open');
        // Core's own word for a quiz in English; Portuguese keeps Responder, the word for answering.
        $this->assertSame('Attempt', $this->langstrings('en')['cal_act_attempt']);
        if (in_array('pt_br', self::languages(), true)) {
            $this->assertSame($this->langstrings('pt_br')['cal_act_answer'], $this->langstrings('pt_br')['cal_act_attempt']);
        }

        $keys = array_values(array_unique(array_merge(array_values($verbs), ['cal_act_grade', 'cal_act_open', 'cal_view'])));
        foreach (self::languages() as $lang) {
            $strings = $this->langstrings($lang);
            foreach ($keys as $key) {
                $this->assertArrayHasKey($key, $strings, "{$lang}: {$key}");
                $this->assertLessThanOrEqual(12, \core_text::strlen($strings[$key]), "{$lang}: {$key} is over the verb budget");
            }
            $this->assertStringStartsWith('{$a->action}', $strings['cal_act_label'], "{$lang}: the label leads with the verb");
            $this->assertStringContainsString('{$a->name}', $strings['cal_act_label'], "{$lang}: the label carries core's name");
        }

        // The label: the verb, and core's name after it whenever the two differ.
        $this->assertStringContainsString(
            'return {text, name: fillObject(strings.cal_act_label, {action: text, name: full}), title: full};',
            $card
        );
        $this->assertStringContainsString(
            "if (item.kind === 'grade' || item.kind === 'gradesoon') {\n"
                . "        return {text: strings.cal_act_grade, name: strings.cal_act_grade, title: strings.cal_act_grade};",
            $card
        );
        $this->assertStringContainsString(
            "} else if (full.length > ACTION_BUDGET) {\n        text = strings.cal_act_open;",
            $card
        );

        $drawn = 0;
        foreach (self::all_tags($card) as $tag) {
            if (!preg_match('/className="[^"]*(?<![\w-])compass-cal-action(?![\w-])/', $tag)) {
                continue;
            }
            $drawn++;
            $this->assertStringContainsString('title={label.title}', $tag, 'an action without core\'s name as its title');
            if (str_starts_with($tag, '<a')) {
                $this->assertStringContainsString('aria-label={label.name}', $tag, 'a link not named by its label');
                $this->assertStringContainsString($tag . '{label.text}</a>', $card, 'a link not showing its verb');
            }
        }
        // The View link twice: primary for an Up next event on now (ADR-016 decision 2), else outlined.
        $this->assertSame(5, $drawn, 'the two View links, the inactive name and the two actionable links');
        $this->assertStringContainsString('<span className="visually-hidden">{label.name}</span>', $card);
    }

    /**
     * The closed line shows a period's short name only when the line does not fit, and the short name
     * is inside the whole one.
     *
     * "Atrasadas, ainda abertas" pushed the calendar link onto a second line at 784 px. The periods show
     * their short twins when the block is narrow or when CalendarStrip's measure says the line does not
     * fit its head at their whole names (compact), never by a count of characters. The whole name stays
     * the button's title and leads its accessible name (cal_period_label), and the twin is a part of the
     * whole name in both languages, case aside (WCAG 2.5.3). Vacuity guard: six pairs.
     *
     * @return void
     */
    public function test_a_period_shows_its_short_twin_only_when_the_line_does_not_fit(): void {
        $line = $this->reactsources()['js/esm/src/CalendarLine.tsx'];
        $strip = $this->reactsources()['js/esm/src/CalendarStrip.tsx'];
        $this->assertStringContainsString('const shown = compact ? short : name;', $line);
        $this->assertStringNotContainsString('PERIOD_BUDGET', $line, 'a character budget instead of the measure');
        $this->assertStringContainsString('compact={narrow || !fits}', $strip);
        $this->assertStringContainsString('title={shown === name ? undefined : name}', $line);
        $this->assertStringContainsString('<span className="compass-cal-plabel" aria-hidden="true">{shown}</span>', $line);

        foreach (self::languages() as $lang) {
            $strings = $this->langstrings($lang);
            $pairs = 0;
            foreach ($strings as $key => $short) {
                if (!preg_match('/^(cal_period_\w+)_short$/', $key, $match)) {
                    continue;
                }
                $pairs++;
                $whole = $strings[$match[1]];
                $this->assertNotFalse(
                    \core_text::strpos(\core_text::strtolower($whole), \core_text::strtolower($short)),
                    "{$lang}: {$key} is not inside its whole name"
                );
            }
            $this->assertSame(6, $pairs, "{$lang}: the six periods' short names");
            $this->assertStringStartsWith('{$a->period}', $strings['cal_period_label'], "{$lang}: the name leads the label");
            $this->assertStringStartsWith('{$a->period}', $strings['cal_period_label_past'], "{$lang}: the name leads the label");
        }
    }

    /**
     * Whether the closed line fits is measured, with no container query, and a line that does not fit
     * moves its cells to a row of their own.
     *
     * The fleet's stylelint forbids @container, so CalendarStrip measures before paint: on one row the
     * head neither wraps nor shrinks (styles.css), the sum of its children is the line's natural width,
     * and over the head's width the strip sets the two-row class, under which the cells take the second
     * row whole and the switch and the link stay on the first. A ResizeObserver re-measures a size
     * change the block's width does not carry. Read here: no @container, the observer, the two guards of
     * the measure, the class only on a wide closed line, and the rules each state needs; the period's
     * floor of 4 rem that lets six cells share one row at 784 px. Vacuity guard: every rule is found.
     *
     * @return void
     */
    public function test_the_closed_line_measures_whether_it_fits_without_a_container_query(): void {
        $this->assertStringNotContainsString('@container', $this->css());
        $strip = $this->reactsources()['js/esm/src/CalendarStrip.tsx'];
        $this->assertStringContainsString('sizer.current = new ResizeObserver(() => setResized((count) => count + 1));', $strip);
        $this->assertStringContainsString(
            "            if (measured.current.need > room) {\n                setFits(false);",
            $strip,
            'a line over its head must move to two rows'
        );
        $this->assertStringContainsString(
            "        } else if (measured.current.need > 0 && measured.current.need <= room) {\n            setFits(true);",
            $strip,
            'a head grown wide enough must bring the line back to one row'
        );
        $this->assertStringContainsString("!open && !narrow && !fits ? 'compass-cal-tworow' : '',", $strip);

        // Selector => declarations, the selector's whitespace normalised, a repeated selector's bodies joined.
        $rules = [];
        foreach ($this->rules() as [$selector, $body]) {
            $selector = preg_replace('/\s+/', ' ', $selector);
            $rules[$selector] = ($rules[$selector] ?? '') . $body;
        }
        $expected = [
            '.block_compass .compass-cal-closed:not(.compass-cal-narrow):not(.compass-cal-tworow) .compass-cal-head'
                => '/\bflex-wrap\s*:\s*nowrap\b/',
            '.block_compass .compass-cal-closed .compass-cal-title, .block_compass .compass-cal-closed .compass-cal-seg, '
                . '.block_compass .compass-cal-closed .compass-cal-line' => '/\bflex\s*:\s*none\b/',
            '.block_compass .compass-cal-tworow .compass-cal-line' => '/\bflex-basis\s*:\s*100%.*\border\s*:\s*3\b/s',
            '.block_compass .compass-cal-period, .block_compass .compass-cal-psk' => '/\bmin-width\s*:\s*4rem\b/',
        ];
        foreach ($expected as $selector => $declaration) {
            $this->assertArrayHasKey($selector, $rules, "no rule for {$selector}");
            $this->assertMatchesRegularExpression($declaration, $rules[$selector], $selector);
        }
    }

    /**
     * The closed line's view switch is two named icons with a tooltip of their own; the narrow block and
     * the open strip keep the words.
     *
     * Beside the title the switch shows core's two glyphs. Each button is named by its view
     * (aria-label, the word the text switch shows), keeps aria-pressed, and carries the word in a child
     * tooltip that is aria-hidden and has no title (a title would draw a second, native tooltip), shown
     * on :hover and :focus-visible and put off by Escape (WCAG 1.4.13). Not core's Bootstrap tooltip:
     * its loader binds only the nodes present at load. On a narrow block, where touch has no hover, and
     * in the open strip, the switch keeps its text. Vacuity guard: both branches and the rule are found.
     *
     * @return void
     */
    public function test_the_closed_line_switch_is_named_icons_with_their_own_tooltip(): void {
        $strip = $this->reactsources()['js/esm/src/CalendarStrip.tsx'];
        $this->assertStringContainsString('{!open && viewSwitch(!narrow)}', $strip, 'closed: icons, text when narrow');
        $this->assertStringContainsString('{open && viewSwitch(false)}', $strip, 'open: the text switch');
        $this->assertStringNotContainsString('data-bs-toggle', $strip);

        $this->assertSame(1, preg_match('/const viewSwitch = .*?\n    };\n/s', $strip, $body));
        $buttons = $this->tags($body[0], 'button');
        $this->assertCount(2, $buttons, 'the text switch\'s button and the icon switch\'s');
        [$text, $icon] = $buttons;
        $this->assertStringNotContainsString('aria-label', $text, 'the text button is named by its word');
        $this->assertStringContainsString('aria-label={name}', $icon, 'an icon button without a name');
        $this->assertStringContainsString('aria-pressed={drawn === which}', $icon);
        $this->assertDoesNotMatchRegularExpression('/\stitle=/', $icon, 'a title draws a second, native tooltip');
        $this->assertStringContainsString('<span className="compass-cal-tip" aria-hidden="true">{name}</span>', $body[0]);
        $this->assertStringContainsString(
            "            if (event.key === 'Escape') {\n                setTipsoff(true);",
            $strip,
            'Escape must put the tooltips off'
        );

        $shown = null;
        $base = null;
        foreach ($this->rules() as [$selector, $rule]) {
            if (str_contains($selector, ':hover .compass-cal-tip')) {
                $shown = $selector;
                $this->assertMatchesRegularExpression('/\bopacity\s*:\s*1\b/', $rule);
            }
            if ($selector === '.block_compass .compass-cal-tip') {
                $base = $rule;
            }
        }
        $this->assertNotNull($shown, 'no rule shows the tooltip');
        $this->assertNotNull($base, 'no base tooltip rule');
        $this->assertMatchesRegularExpression('/\bopacity\s*:\s*0\b/', $base, 'the tooltip shows without a hover');
        $this->assertStringContainsString(
            '.compass-cal-seg-icons:not(.compass-cal-tipsoff) .compass-cal-segbtn:hover .compass-cal-tip',
            $shown
        );
        $this->assertStringContainsString(
            '.compass-cal-seg-icons:not(.compass-cal-tipsoff) .compass-cal-segbtn:focus-visible .compass-cal-tip',
            $shown,
            'a keyboard user never sees the name'
        );
    }

    /**
     * The teaching line leads with a grading cell, only where the ledger counts grading, named by a
     * sentence that starts with its label, and lighting the courses of its own waiting work.
     *
     * The waiting count is a cell of the periods' grammar ("To grade" over its number) before the
     * periods' list and a divider, not an item of the list; it exists only in the teaching view with
     * block_feedback_tracker's ledger as the source (counts.grading). Pressing it opens the strip on the
     * days whose waiting is above zero; pointing at it outlines the cards of waitingcourseids, the
     * courses of the grading work (strip::periods() and its twin calendar.ts periodsOf()), never every
     * course of those days. Vacuity guard: the cell, the sentence strings and the plan are found.
     *
     * @return void
     */
    public function test_the_grading_cell_leads_the_teaching_line_with_the_ledger_only(): void {
        $line = $this->reactsources()['js/esm/src/CalendarLine.tsx'];
        $this->assertStringContainsString("const grading = view === 'teaching' && counts.grading;", $line);
        $at = strpos($line, "{grading && (\n                <GradingCell");
        $this->assertNotFalse($at, 'the grading cell is not drawn behind its guard');
        $list = strpos($line, '<ul className="compass-cal-periods" aria-label={strings.cal_periods}>');
        $this->assertNotFalse($list);
        $this->assertLessThan($list, $at, 'the grading cell comes first, outside the periods\' list');
        $this->assertStringContainsString('courseids={data.waitingcourseids}', $line);

        $this->assertSame(1, preg_match('/const GradingCell = .*?\n};\n/s', $line, $cell));
        $buttons = $this->tags($cell[0], 'button');
        $this->assertCount(1, $buttons);
        $attributes = [
            'aria-label={label}',
            "title={fillCount(strings, 'cal_waitinglead', waiting)}",
            "onClick={() => onPeriod('grading')}",
            'onPointerEnter={() => onPoint(courseids)}',
            'onFocus={() => onPoint(courseids)}',
        ];
        foreach ($attributes as $attribute) {
            $this->assertStringContainsString($attribute, $buttons[0]);
        }
        $this->assertStringContainsString('fillObject(strings.cal_tograde_label, {', $cell[0]);
        $this->assertStringContainsString('fill(strings.cal_tograde_none, strings.cal_tograde)', $cell[0]);
        $this->assertStringContainsString(
            '<span className="compass-cal-plabel" aria-hidden="true">{strings.cal_tograde}</span>',
            $cell[0]
        );
        $this->assertStringContainsString('<span className="compass-cal-qdiv" aria-hidden="true" />', $cell[0]);
        foreach (self::languages() as $lang) {
            $strings = $this->langstrings($lang);
            $this->assertStringStartsWith('{$a->period}', $strings['cal_tograde_label'], "{$lang}: the label leads the sentence");
            $this->assertStringStartsWith('{$a}', $strings['cal_tograde_none'], "{$lang}: the label leads the sentence");
        }

        $this->assertStringContainsString(
            '(day.waitingcourseids ?? []).forEach((id) => {',
            $this->reactsources()['js/esm/src/calendar.ts'],
            'the browser\'s twin sums the grading work\'s own courses'
        );
        $this->assertStringContainsString(
            'const only = payload.views[which].days.filter((day) => (day.waiting ?? 0) > 0).map((day) => day.date);',
            $this->reactsources()['js/esm/src/CalendarStrip.tsx'],
            'the press opens on the days with grading work'
        );
    }

    /**
     * The strip's header packs the toggle and the month on the left and pushes its controls to the end.
     *
     * With the header spread by space-between, a teacher's two switches wrapped and left the month
     * floating mid-line with Today at the far end. The header now packs from the start, and the
     * controls take the remaining room with an automatic start margin, on the first line or on their
     * own. Vacuity guard: both rules found.
     *
     * @return void
     */
    public function test_the_strip_header_pushes_its_controls_to_the_end(): void {
        $head = null;
        $controls = null;
        foreach ($this->rules() as [$selector, $body]) {
            if ($selector === '.block_compass .compass-cal-head') {
                $head = $body;
            }
            if ($selector === '.block_compass .compass-cal-controls') {
                $controls = $body;
            }
        }
        $this->assertNotNull($head, 'no base .compass-cal-head rule');
        $this->assertNotNull($controls, 'no .compass-cal-controls rule of its own');
        $this->assertMatchesRegularExpression('/\bjustify-content\s*:\s*flex-start\b/', $head);
        $this->assertMatchesRegularExpression('/\bmargin-inline-start\s*:\s*auto\b/', $controls);
    }

    /**
     * A day's action is bounded both ways and never wraps.
     *
     * Every row's button lines up and none takes the title's room: a minimum and a maximum width, one
     * line, an ellipsis past the maximum (with core's name in the title, the ellipsis rule above).
     * Vacuity guard: the rule is found.
     *
     * @return void
     */
    public function test_a_day_action_is_bounded_and_one_line(): void {
        $body = null;
        foreach ($this->rules() as [$selector, $rulebody]) {
            if ($selector === '.block_compass .compass-cal-action') {
                $body = $rulebody;
            }
        }
        $this->assertNotNull($body, 'no .compass-cal-action rule');
        $declarations = [
            'min-width\s*:\s*4\.5rem',
            'max-width\s*:\s*8\.5rem',
            'white-space\s*:\s*nowrap',
            'overflow\s*:\s*hidden',
            'text-overflow\s*:\s*ellipsis',
        ];
        foreach ($declarations as $declaration) {
            $this->assertMatchesRegularExpression('/(?<![\w-])' . $declaration . '\b/', $body, $declaration);
        }
    }

    /**
     * Up next grows in from no height, appears at once under reduced motion, and names its one icon button.
     *
     * ADR-016 decisions 1 and 6: the region is a one-track grid whose row goes from 0fr to 1fr over at
     * least 100 ms (the fleet's stylelint floor), its content clipped inside, so tier 1 slides; the
     * collapsed region is hidden from every reader; under prefers-reduced-motion the transition and the
     * dot's pulse are off. The hide button is an icon named by its aria-label, with the strip's own
     * aria-hidden tooltip and no title, put off by Escape as the switch's are. The heading comes from
     * heading.ts, the rows are a list, and the rise is said through the strip's polite region, which
     * the region is handed rather than one of its own. Vacuity guards: each rule and element was found.
     *
     * Changes that must make it fail: the grow dropped or made instant; the reduced-motion block or the
     * pulse's stop deleted; the hide button's name, its tooltip or its Escape guard removed; a title
     * added to it; a live region of its own.
     *
     * @return void
     */
    public function test_up_next_grows_in_and_names_its_icon_button(): void {
        $bodies = [];
        foreach ($this->rules() as [$selector, $body]) {
            $bodies[$selector] = ($bodies[$selector] ?? '') . $body;
        }
        $wrap = $bodies['.block_compass .compass-soon-wrap'] ?? '';
        $this->assertMatchesRegularExpression('/grid-template-rows:\s*0fr/', $wrap, 'the region starts at no height');
        $this->assertMatchesRegularExpression('/visibility:\s*hidden/', $wrap, 'collapsed, it is hidden from every reader');
        $this->assertSame(1, preg_match('/transition:\s*grid-template-rows\s+(\d+)ms\s+ease-out/', $wrap, $ms), 'the grow');
        $this->assertGreaterThanOrEqual(100, (int) $ms[1]);
        $open = $bodies['.block_compass .compass-soon-wrap.compass-soon-wrap-open'] ?? '';
        $this->assertMatchesRegularExpression('/grid-template-rows:\s*1fr/', $open, 'open, the region has its own height');
        $this->assertMatchesRegularExpression('/overflow:\s*hidden/', $bodies['.block_compass .compass-soon-inner'] ?? '');
        $dot = $bodies['.block_compass .compass-soon-dot'] ?? '';
        $this->assertMatchesRegularExpression('/animation:\s*block_compass-soon-pulse\b/', $dot, 'the dot on now pulses');

        $pattern = '/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{((?:[^{}]*\{[^{}]*\})*)[^{}]*\}/';
        preg_match_all($pattern, $this->css(), $media);
        $reduced = implode("\n", $media[1]);
        $this->assertMatchesRegularExpression(
            '/\.block_compass \.compass-soon-wrap\s*\{\s*transition:\s*none;/',
            $reduced,
            'under reduced motion the region appears at once'
        );
        $this->assertMatchesRegularExpression(
            '/\.block_compass \.compass-soon-dot\s*\{\s*animation:\s*none;/',
            $reduced,
            'under reduced motion the dot on now holds still'
        );

        $source = $this->reactsources()['js/esm/src/UpNext.tsx'];
        $hide = array_values(array_filter(
            $this->tags($source, 'button'),
            static fn(string $tag): bool => str_contains($tag, 'compass-soon-hide')
        ));
        $this->assertCount(1, $hide, 'vacuity: the hide button');
        $this->assertStringContainsString('aria-label={strings.cal_soon_hide}', $hide[0]);
        $this->assertStringNotContainsString('title=', $hide[0], 'a title draws a second tooltip');
        $this->assertStringContainsString("'compass-soon-hide compass-cal-tipsoff'", $hide[0], 'Escape puts its tooltip off');
        $this->assertStringContainsString(
            '<span className="compass-cal-tip" aria-hidden="true">{strings.cal_soon_hide}</span>',
            $source
        );
        $this->assertMatchesRegularExpression(
            '/\.compass-soon-hide:not\(\.compass-cal-tipsoff\):focus-visible \.compass-cal-tip/',
            $this->css(),
            'the tooltip shows on keyboard focus'
        );
        $this->assertStringContainsString('titleTag(config.headinglevel)', $source);
        $this->assertStringContainsString('<ul className="compass-soon-list">', $source);
        $this->assertStringNotContainsString('aria-live', $source, 'the rise goes through the strip\'s polite region');
        $this->assertStringContainsString('onAnnounce={setSummary}', $this->reactsources()['js/esm/src/CalendarStrip.tsx']);
    }

    /**
     * The open-courses line is placed and weighed from what the block holds (ADR-017 decision 7).
     *
     * Regras.dc.html §5: with no active course, tier 1's empty state carries the tiles; without the
     * calendar here, the full line at the top of the content; while Up next shows, the compact sentence
     * below tier 1's first strip; otherwise under the calendar, the full line when the counts in hand show
     * nothing late, today or tomorrow, the compact one when they do. The weight is the strip's report,
     * read from its counts or its payload and Up next's rows, never a request. No JavaScript runner
     * exists, so the decision is read where it is written. Vacuity guards: every branch is found.
     *
     * Changes that must make it fail: the line kept under the calendar while Up next shows, full while
     * busy, tiles with active courses, a busy period dropped or a calm one added, the strip's report
     * reading anything but what it holds.
     *
     * @return void
     */
    public function test_the_open_courses_line_is_placed_and_weighed_from_what_the_block_holds(): void {
        $block = $this->reactsources()['js/esm/src/Block.tsx'];
        $strip = $this->reactsources()['js/esm/src/CalendarStrip.tsx'];
        $calendar = $this->reactsources()['js/esm/src/calendar.ts'];

        $this->assertStringContainsString(
            "if (data && shown === 0 && data.counts.total === 0) {\n        newsplace = 'empty';\n        newsmode = 'tiles';",
            $block,
            'no active course: the tiles in tier 1\'s empty state'
        );
        $this->assertStringContainsString("} else if (!config.calendar) {\n        newsplace = 'top';", $block);
        $this->assertStringContainsString("} else if (weight !== null && weight.weighed) {", $block);
        $this->assertStringContainsString("newsplace = weight.upnext && data ? 'below' : 'under';", $block);
        $this->assertStringContainsString("newsmode = weight.upnext || weight.busy ? 'compact' : 'full';", $block);
        $this->assertStringContainsString("{strip.name === firststrip && newsAt('below')}", $block);
        $this->assertStringContainsString("{newsAt('empty')}", $block);
        // Under the calendar means right after it, before tier 1; the top of the content is the same spot.
        $this->assertMatchesRegularExpression(
            "/onWeight=\\{onWeight\\}\\s*\\/>\\s*\\)\\}\\s*\\{newsAt\\('top'\\)\\}\\s*\\{newsAt\\('under'\\)\\}/",
            $block
        );

        $this->assertStringContainsString("export const BUSY_PERIODS: PeriodKey[] = ['late', 'today', 'tomorrow'];", $calendar);
        $this->assertStringContainsString(
            'counts.views[view].periods.some((period) => BUSY_PERIODS.includes(period.key) && period.count > 0);',
            $calendar
        );
        $this->assertStringContainsString('const busy = linecounts === null || busyOf(linecounts, drawn);', $strip);
        $this->assertStringContainsString(
            'const upnextshown = soon.rows.length > 0 && !(hiddenrank !== null && soon.level <= hiddenrank);',
            $strip
        );
        $this->assertStringContainsString(
            'const soonread = horizon <= 0 || linecounts === null || !linecounts.enabled || soon.settled || soon.failed;',
            $strip
        );
    }

    /**
     * The open-courses line is a named region that grows in, and its popover is a dialog.
     *
     * Decision 7's accessibility: the line is a section named by its heading; a group of several is named
     * by a sentence that starts with its visible name (news_group_label); the close is a button named "Hide
     * until the next sign-in"; "See" and "+N" open a dialog that takes the keyboard, gives it back to its
     * opener, and closes on Escape and on a press outside; below 640 px of the block's measured width it is
     * a bottom sheet over a scrim. The insertion is Up next's: grid rows from 0fr to 1fr in about 200 ms,
     * none under reduced motion, and the popover hangs outside the clip. Every class the stylesheet gives
     * the line is one the component renders. Vacuity guards: the rules and the tags are found.
     *
     * @return void
     */
    public function test_the_open_courses_line_is_a_named_region_with_a_dialog(): void {
        $bodies = [];
        foreach ($this->rules() as [$selector, $body]) {
            $bodies[$selector] = ($bodies[$selector] ?? '') . $body;
        }
        $wrap = $bodies['.block_compass .compass-news-wrap'] ?? '';
        $this->assertMatchesRegularExpression('/grid-template-rows:\s*0fr/', $wrap, 'the line starts at no height');
        $this->assertMatchesRegularExpression('/visibility:\s*hidden/', $wrap);
        $this->assertSame(1, preg_match('/transition:\s*grid-template-rows\s+(\d+)ms\s+ease-out/', $wrap, $ms), 'the grow');
        $this->assertGreaterThanOrEqual(100, (int) $ms[1]);
        $this->assertLessThanOrEqual(250, (int) $ms[1]);
        $open = $bodies['.block_compass .compass-news-wrap.compass-news-wrap-open'] ?? '';
        $this->assertMatchesRegularExpression('/grid-template-rows:\s*1fr/', $open);
        $this->assertMatchesRegularExpression('/overflow:\s*hidden/', $bodies['.block_compass .compass-news-inner'] ?? '');
        $pattern = '/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{((?:[^{}]*\{[^{}]*\})*)[^{}]*\}/';
        preg_match_all($pattern, $this->css(), $media);
        $this->assertMatchesRegularExpression(
            '/\.block_compass \.compass-news-wrap\s*\{\s*transition:\s*none;/',
            implode("\n", $media[1]),
            'under reduced motion the line appears at once'
        );
        $sheet = $bodies['.block_compass .compass-news-pop.compass-news-sheet'] ?? '';
        $this->assertMatchesRegularExpression('/position:\s*fixed/', $sheet, 'the bottom sheet');
        $this->assertMatchesRegularExpression('/position:\s*relative/', $bodies['.block_compass .compass-news-anchor'] ?? '');

        $source = $this->reactsources()['js/esm/src/OpenCourses.tsx'];
        $this->assertStringContainsString('export const NEWS_NARROW_PX = 640;', $source);
        $this->assertStringContainsString('const narrow = width > 0 && width < NEWS_NARROW_PX;', $source);
        $block = $this->reactsources()['js/esm/src/Block.tsx'];
        $this->assertStringContainsString('width={width}', $block, 'the block\'s measured width');
        $this->assertStringContainsString('sectionTag(config.headinglevel)', $source);
        $sections = $this->tags($source, 'section');
        $this->assertCount(3, $sections, 'vacuity: the full line, the compact sentence and the tiles');
        foreach ($sections as $tag) {
            $this->assertStringContainsString('aria-labelledby={titleid}', $tag, 'a section named by its heading');
        }
        $this->assertStringContainsString('<Title id={titleid}', $source);
        $hide = array_values(array_filter(
            $this->tags($source, 'button'),
            static fn(string $tag): bool => str_contains($tag, 'compass-news-hide')
        ));
        $this->assertCount(1, $hide, 'vacuity: the close, written once for the full line and the slim panel');
        $this->assertStringContainsString('aria-label={strings.news_hide}', $hide[0]);
        $dialogs = array_values(array_filter(
            $this->tags($source, 'div'),
            static fn(string $tag): bool => str_contains($tag, 'role="dialog"')
        ));
        $this->assertCount(1, $dialogs, 'vacuity: the popover');
        $this->assertStringContainsString('aria-label={strings.news_title}', $dialogs[0]);
        $this->assertStringContainsString('onKeyDown={onKey}', $dialogs[0]);
        $this->assertStringContainsString("if (event.key === 'Escape') {", $source);
        $this->assertStringContainsString("dialog.current?.querySelector<HTMLElement>('a, button')?.focus();", $source);
        $this->assertStringContainsString('opener.current?.focus();', $source, 'the keyboard goes back to the opener');
        $this->assertStringContainsString("document.addEventListener('pointerdown', outside);", $source);
        $openers = array_values(array_filter(
            $this->tags($source, 'button'),
            static fn(string $tag): bool => str_contains($tag, 'aria-haspopup="dialog"')
        ));
        $this->assertCount(2, $openers, 'See and +N');
        foreach ($openers as $tag) {
            $this->assertStringContainsString('aria-expanded={popover}', $tag);
        }
        $this->assertStringContainsString(
            'fillObject(strings.news_group_label, {name: group.name, count: String(group.count)})',
            $source
        );
        $links = array_values(array_filter(
            $this->tags($source, 'a'),
            static fn(string $tag): bool => preg_match('/compass-news-(group|poprow|tile)\b/', $tag) === 1
        ));
        $this->assertCount(3, $links, 'vacuity: the group links of the line, the popover and the tiles');
        foreach ($links as $tag) {
            $this->assertStringContainsString('aria-label={groupLabel(strings, group)}', $tag);
        }

        // Every class the stylesheet gives the line is one the component writes.
        preg_match_all('/(?<![\w-])\.(compass-news[\w-]*)/', $this->css(), $styled);
        $styled = array_values(array_unique($styled[1]));
        $this->assertGreaterThanOrEqual(30, count($styled), 'vacuity: the line\'s classes were read');
        foreach ($styled as $class) {
            $this->assertMatchesRegularExpression('/(?<![\w-])' . preg_quote($class, '/') . '(?![\w-])/', $source, $class);
        }
    }

    /**
     * The open-courses panel keeps its groups on a row of their own, names its close in full, folds the
     * close to its cross on a narrow block, and never writes a label in capitals.
     *
     * Round 2 (docs/mockup-new-courses/Rodada2.dc.html). The groups are a sibling of the head, never in it,
     * and indent to the text (tile plus gap) except on a narrow block. The close shows a short label
     * (news_hide_short) and is named by the whole sentence (news_hide) in aria-label and title; the visible
     * word is inside the name in every language (WCAG 2.5.3). Below 640 px of the block the label is
     * hidden and the button is its cross alone, 2rem square; the slim panel draws no label. No rule of the
     * line transforms case, spaces its letters or uses small capitals, and the only opacity among its
     * rules is the sparkles', which carry no text and are hidden from assistive technology. Vacuity
     * guards: the rules and the tags are found.
     *
     * Changes that must make it fail: the groups moved into the head, the indent dropped, the label shown
     * on a narrow block, the close unnamed, a text-transform on a line rule, a sparkle announced.
     *
     * @return void
     */
    public function test_the_open_courses_panel_keeps_its_groups_close_and_case(): void {
        $bodies = [];
        $news = 0;
        foreach ($this->rules() as [$selector, $body]) {
            foreach (explode(',', $selector) as $one) {
                if (!str_contains($one, 'compass-news')) {
                    continue;
                }
                $news++;
                $this->assertDoesNotMatchRegularExpression(
                    '/(?<![\w-])(?:text-transform|letter-spacing|font-variant-caps)\s*:/',
                    $body,
                    trim($one) . ' changes case or spaces its letters; the line is emphasised by weight alone'
                );
                $this->assertDoesNotMatchRegularExpression('/small-caps/', $body, trim($one) . ' uses small capitals');
                if (preg_match('/(?<![\w-])opacity\s*:/', $body)) {
                    $this->assertMatchesRegularExpression(
                        '/\.compass-news-spark\b/',
                        $one,
                        trim($one) . ' fades with opacity; only the sparkles, which carry no text, may'
                    );
                }
                $bodies[trim($one)] = ($bodies[trim($one)] ?? '') . $body;
            }
        }
        $this->assertGreaterThanOrEqual(40, $news, 'vacuity: the line\'s rules were read');

        $panel = $bodies['.block_compass .compass-news'] ?? '';
        $this->assertMatchesRegularExpression('/flex-direction:\s*column/', $panel, 'the head and the groups are rows of a column');
        $this->assertMatchesRegularExpression('/position:\s*relative/', $panel);
        $this->assertMatchesRegularExpression('/overflow:\s*hidden/', $panel);
        $this->assertMatchesRegularExpression(
            '/flex:\s*none/',
            $bodies['.block_compass .compass-news-hide'] ?? '',
            'the close never shrinks: on a phone the slim row squeezed it to a sliver'
        );
        $this->assertMatchesRegularExpression(
            '/margin:\s*0\.25rem 0 1rem/',
            $bodies['.block_compass .compass-news-inner > .compass-news'] ?? '',
            'room around the panel: the heading after it never sits on its edge'
        );
        $groups = $bodies['.block_compass .compass-news-groups'] ?? '';
        $this->assertMatchesRegularExpression('/padding:\s*0 0 0 3\.375rem/', $groups, 'indented to the text: tile plus gap');
        $this->assertMatchesRegularExpression(
            '/padding-left:\s*0\b/',
            $bodies['.block_compass .compass-news-narrow .compass-news-groups'] ?? '',
            'on a narrow block the groups take the whole width'
        );
        $narrowhide = $bodies['.block_compass .compass-news-narrow .compass-news-hide'] ?? '';
        $this->assertMatchesRegularExpression('/width:\s*2rem/', $narrowhide, 'the cross alone is a 32 px square');
        $this->assertMatchesRegularExpression('/padding:\s*0;/', $narrowhide);
        $this->assertMatchesRegularExpression(
            '/display:\s*none/',
            $bodies['.block_compass .compass-news-narrow .compass-news-hidelabel'] ?? '',
            'on a narrow block the close shows its cross alone'
        );
        $this->assertArrayHasKey('.block_compass .compass-news-hide', $bodies, 'vacuity: the close\'s rule');
        $this->assertMatchesRegularExpression(
            '/width:\s*2rem/',
            $bodies['.block_compass .compass-news-hide.compass-news-hide-icon'] ?? '',
            'the slim panel\'s close is its cross alone too'
        );

        $source = $this->reactsources()['js/esm/src/OpenCourses.tsx'];
        $this->assertMatchesRegularExpression(
            '/<\/div>\s*\{closer\(true\)\}\s*<ul className="compass-news-groups">/',
            $source,
            'the groups follow the head as a row of their own, never inside it'
        );
        $this->assertStringContainsString('{closer(false)}', $source, 'the slim panel draws the cross alone');
        $this->assertStringContainsString(
            '{labelled && <span className="compass-news-hidelabel">{strings.news_hide_short}</span>}',
            $source,
            'the visible label is the short string'
        );
        $hide = array_values(array_filter(
            $this->tags($source, 'button'),
            static fn(string $tag): bool => str_contains($tag, 'compass-news-hide')
        ));
        $this->assertCount(1, $hide, 'vacuity: the close');
        $this->assertStringContainsString('aria-label={strings.news_hide}', $hide[0], 'named by the whole sentence');
        $this->assertStringContainsString('title={strings.news_hide}', $hide[0]);
        $this->assertStringNotContainsString('news_hide_short', $hide[0], 'the short label is the text, never the name');
        $this->assertStringContainsString("'compass-news-hide compass-news-hide-icon'", $hide[0]);

        $sparks = array_values(array_filter(
            $this->tags($source, 'span'),
            static fn(string $tag): bool => str_contains($tag, 'compass-news-spark')
        ));
        $this->assertCount(1, $sparks, 'vacuity: the sparkle, written once and placed by its class');
        $this->assertStringContainsString('aria-hidden="true"', $sparks[0]);
        $this->assertSame(
            6,
            preg_match_all('/<Spark place="compass-news-spark-[abc]" \/>/', $source),
            'three sparkles on the full line, two on the empty state, one on the slim panel'
        );

        // The visible word is inside the accessible name, in every language the pack carries.
        foreach (self::languages() as $lang) {
            $string = [];
            include(dirname(__DIR__, 2) . "/lang/{$lang}/block_compass.php");
            $this->assertNotSame('', $string['news_hide_short'], $lang);
            $this->assertStringContainsStringIgnoringCase(
                $string['news_hide_short'],
                $string['news_hide'],
                "{$lang}: the close's visible label is not inside its accessible name"
            );
            $this->assertNotSame($string['news_hide'], $string['news_hide_short'], "{$lang}: the label is the short twin");
        }
    }

    /**
     * The open-courses popover and its sheet are the panel's family: the gradient, the cards and the pill.
     *
     * Round 2 (docs/mockup-new-courses/Rodada2.dc.html, section 4). The popover paints the panel's
     * gradient with a soft border, radius 14 (the sheet keeps its top-only 18), one decorative sparkle
     * and a head of the 34 px tile, the eyebrow and the summary. A group is a card on the surface (border,
     * radius 12, 10px 12px, 6 px between cards, the accent at 55 % on hover). "Hide until the next
     * sign-in" is the close's pill with the short visible label and keeps the whole sentence as its name
     * (aria-label and title, WCAG 2.5.3). No rule of the popover changes case. Vacuity guards: the rules
     * and the tags are found.
     *
     * Changes that must make it fail: the old plain card back, a flat row, the pill unnamed or named by
     * its short label, a text-transform on a popover rule, the sparkle announced.
     *
     * @return void
     */
    public function test_the_open_courses_popover_is_in_the_panels_family(): void {
        $bodies = [];
        $seen = 0;
        $panel = '';
        foreach ($this->rules() as [$selector, $body]) {
            if (trim($selector) === '.block_compass .compass-news') {
                $panel .= $body;
            }
            foreach (explode(',', $selector) as $one) {
                if (!str_contains($one, 'compass-news-pop')) {
                    continue;
                }
                $seen++;
                $this->assertDoesNotMatchRegularExpression(
                    '/(?<![\w-])(?:text-transform|letter-spacing|font-variant-caps)\s*:|small-caps/',
                    $body,
                    trim($one) . ' shouts: no uppercase or small capitals in the popover'
                );
                $bodies[trim($one)] = ($bodies[trim($one)] ?? '') . $body;
            }
        }
        $this->assertGreaterThanOrEqual(15, $seen, 'vacuity: the popover\'s rules were read');

        $pop = $bodies['.block_compass .compass-news-pop'] ?? '';
        $gradient = '/linear-gradient\(\s*135deg,\s*var\(--block_compass-news-warm\) 0%,\s*var\(--block_compass-surface\) 60%,'
            . '\s*var\(--block_compass-news-subtle\) 100%\s*\)/';
        $this->assertMatchesRegularExpression($gradient, $panel, 'vacuity: the panel\'s gradient');
        $this->assertMatchesRegularExpression($gradient, $pop, 'the popover uses the panel gradient');
        $this->assertMatchesRegularExpression('/border-radius:\s*0\.875rem/', $pop);
        $this->assertMatchesRegularExpression('/padding:\s*0\.875rem 1rem 0\.75rem/', $pop);
        $this->assertMatchesRegularExpression(
            '/border-radius:\s*1\.125rem 1\.125rem 0 0/',
            $bodies['.block_compass .compass-news-pop.compass-news-sheet'] ?? '',
            'the sheet keeps its top-only radius'
        );
        $row = $bodies['.block_compass .compass-news-poprow'] ?? '';
        $this->assertMatchesRegularExpression('/border:\s*1px solid var\(--block_compass-line\)/', $row, 'the rows are cards');
        $this->assertMatchesRegularExpression('/border-radius:\s*0\.75rem/', $row);
        $this->assertMatchesRegularExpression('/padding:\s*0\.625rem 0\.75rem/', $row);
        $this->assertMatchesRegularExpression('/background:\s*var\(--block_compass-surface\)/', $row);
        $this->assertMatchesRegularExpression(
            '/gap:\s*0\.375rem/',
            $bodies['.block_compass .compass-news-poplist'] ?? '',
            '6 px between the cards'
        );
        $this->assertMatchesRegularExpression(
            '/border-color:\s*color-mix\(in oklab, var\(--block_compass-news-accent\) 55%, transparent\)/',
            $bodies['.block_compass .compass-news-poprow:hover'] ?? '',
            'the hover border is the accent at 55 %'
        );
        $this->assertMatchesRegularExpression(
            '/width:\s*2\.125rem/',
            $bodies['.block_compass .compass-news-pop .compass-news-icon'] ?? '',
            'the 34 px tile'
        );
        $this->assertMatchesRegularExpression(
            '/font-weight:\s*700/',
            $bodies['.block_compass .compass-news-popfoot .compass-news-all'] ?? '',
            'the foot link is bold'
        );
        $this->assertMatchesRegularExpression('/flex-wrap:\s*wrap/', $bodies['.block_compass .compass-news-popfoot'] ?? '');
        $this->assertMatchesRegularExpression(
            '/justify-content:\s*space-between/',
            $bodies['.block_compass .compass-news-popfoot'] ?? ''
        );

        $source = $this->reactsources()['js/esm/src/OpenCourses.tsx'];
        $this->assertStringContainsString('<Spark place="compass-news-spark-d" />', $source, 'the popover\'s one sparkle');
        $pill = array_values(array_filter(
            $this->tags($source, 'button'),
            static fn(string $tag): bool => str_contains($tag, 'compass-news-pophide')
        ));
        $this->assertCount(1, $pill, 'vacuity: the popover\'s hide');
        $this->assertStringContainsString('aria-label={strings.news_hide}', $pill[0], 'the pill keeps news_hide as its name');
        $this->assertStringContainsString('title={strings.news_hide}', $pill[0]);
        $this->assertStringNotContainsString('news_hide_short', $pill[0]);
        $this->assertStringContainsString(
            '<span className="compass-news-pophidelabel">{strings.news_hide_short}</span>',
            $source,
            'the pill\'s visible word is the short string, inside the name'
        );
    }

    /**
     * A failure notice wraps, and its two controls never break inside.
     *
     * In the day card on a phone, "Try again" and "Reload page" each stood in two lines beside the
     * message. The notice wraps, the message keeps a basis of its own, and the controls stay whole on
     * one line, moving under the message when the column is too narrow. Vacuity guard: the three
     * rules are found, and RetryNotice.tsx renders the message's class.
     *
     * @return void
     */
    public function test_a_failure_notice_wraps_its_controls_whole(): void {
        $notice = '.block_compass .compass-error:not([hidden])';
        $message = '.block_compass .compass-retry-message';
        $actions = '.block_compass .compass-retry-actions';
        $found = [];
        foreach ($this->rules() as [$selector, $body]) {
            if (in_array($selector, [$notice, $message, $actions], true)) {
                $found[$selector] = $body;
            }
        }
        $this->assertCount(3, $found, 'the notice, its message and its controls');
        $this->assertMatchesRegularExpression('/\bflex-wrap\s*:\s*wrap\b/', $found[$notice]);
        $this->assertMatchesRegularExpression('/\bflex\s*:\s*1 1 \d/', $found[$message]);
        $this->assertMatchesRegularExpression('/\bwhite-space\s*:\s*nowrap\b/', $found[$actions]);
        $this->assertStringContainsString(
            '<span className="compass-retry-message">{message}</span>',
            $this->reactsources()['js/esm/src/RetryNotice.tsx']
        );
    }

    /**
     * The languages whose pack the plugin directory carries: English always, Portuguese in a git checkout.
     *
     * The release package ships English only (lang/pt_br is export-ignored, and translations reach
     * sites through AMOS), so a run from the package checks the English pack alone.
     *
     * @return string[]
     */
    private static function languages(): array {
        return is_file(dirname(__DIR__, 2) . '/lang/pt_br/block_compass.php') ? ['en', 'pt_br'] : ['en'];
    }
}
