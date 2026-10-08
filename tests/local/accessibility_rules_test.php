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
            'Reload', 'RetryNotice', 'RowList', 'Row', 'Group',
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
     * Archive, Star and Reload render a glyph and nothing else, and the glyph is aria-hidden,
     * so without an aria-label a screen reader announces "button" and the user is told to
     * press something unnamed. The list/cards switch (ViewToggle) is two such buttons, and
     * the Filter button (FilterToggle) hides its own text and count from the accessibility
     * tree to say them as one sentence. Every button tag in these five files must carry the
     * attribute.
     *
     * @return void
     */
    public function test_the_icon_only_buttons_name_themselves(): void {
        $files = $this->sources();
        $iconfiles = [
            'js/esm/src/Archive.tsx', 'js/esm/src/Star.tsx', 'js/esm/src/ViewToggle.tsx', 'js/esm/src/FilterToggle.tsx',
            'js/esm/src/Reload.tsx',
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
            '/rung\(level\) === 2 \? \'h2\' : \(rung\(level\) === 3 \? \'h3\' : \'h4\'\)/',
            $helper,
            'sections: h2 on the page, h3 without the block title, h4 under it'
        );
        $this->assertMatchesRegularExpression(
            '/rung\(level\) === 2 \? \'h3\' : \(rung\(level\) === 3 \? \'h4\' : \'h5\'\)/',
            $helper,
            'card titles: one rung under the sections'
        );
        $this->assertMatchesRegularExpression(
            '/level === 2 \? 2 : \(level === 3 \? 3 : 4\)/',
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
            ['js/esm/src/Explore.tsx', 'js/esm/src/Strip.tsx'],
            $sections,
            'the section rung is the section titles: a tier 1 strip and the tier 3 panel'
        );
        $this->assertSame(
            ['js/esm/src/Card.tsx', 'js/esm/src/RowCard.tsx'],
            $titles,
            'the title rung is the card titles: the tier 1 card and the tier 3 one'
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
        foreach ($this->reactsources() as $file => $contents) {
            foreach (self::all_tags($contents) as $tag) {
                if (!preg_match('/\bcompass-clamp\b/', $tag)) {
                    continue;
                }
                $clamped++;
                $this->assertMatchesRegularExpression(
                    '/\btitle=\{/',
                    $tag,
                    "{$file}: a clamped name without the whole name in a title attribute: " . trim($tag)
                );
            }
        }
        // Vacuity guard: the three places a course name is drawn - the tier 1 card title, the tier 3
        // row name and the tier 3 card title.
        $this->assertGreaterThanOrEqual(3, $clamped, 'fewer than three clamped names: has a component stopped clamping?');
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
            // The base rule only: not the last-child variant, not -link, -meta or -progress.
            if (!preg_match('/\.compass-row(?![\w-])/', $selector) || str_contains($selector, ':')) {
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
     * label. The four icon-only controls are read; the Filter button keeps the margin on purpose,
     * because its glyph precedes a word. Vacuity guard: each file must render a glyph span.
     *
     * @return void
     */
    public function test_the_icon_only_glyphs_carry_no_margin(): void {
        $files = ['js/esm/src/Star.tsx', 'js/esm/src/Archive.tsx', 'js/esm/src/ViewToggle.tsx', 'js/esm/src/Reload.tsx'];
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
        $this->assertGreaterThanOrEqual(3, $seen, 'no .block_compass-notitle rules found in styles.css');
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
     * The disabled attribute is applied in the render the control's own click causes, and a
     * focused element that becomes disabled drops the keyboard to the body: the "Reloading…"
     * label is then announced to nobody, and the next Tab starts at the top of the page. The
     * components that render such a control are read: the reload control and Try again, the
     * star while its write is out, Clear filters once its press has released the last filter,
     * and Archive all (the one button Explore.tsx renders itself) while its run is out. Two
     * controls keep the attribute on purpose, because the keyboard is moved deliberately after
     * them: "Show more" in Group.tsx, and the archive control, whose row leaves the page and
     * whose focus Explore's keepFocus() puts back. The vacuity guard is the button tag itself,
     * in each file.
     *
     * Changes that must make it fail: the disabled attribute back on any button of these files,
     * or no button of one of them saying aria-disabled.
     *
     * @return void
     */
    public function test_the_busy_controls_stay_focusable(): void {
        $files = [
            'js/esm/src/Reload.tsx', 'js/esm/src/RetryNotice.tsx', 'js/esm/src/Star.tsx', 'js/esm/src/FilterPanel.tsx',
            'js/esm/src/Explore.tsx',
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
     * A tier 1 card has the theme card's anatomy, and the ghost stretches to its row.
     *
     * ADR-013 decision 7: a 150 px cover, the body padded 12px 16px 14px, the title at 1rem and 600,
     * the meta line at .8125rem - the theme card's numbers (theme_boost_union_fundaseg) - and a
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
}
