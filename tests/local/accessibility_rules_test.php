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
 * The half of the accessibility audit that axe cannot see (ADR-008, decision 3).
 *
 * Phase 7 makes the audit a gate rather than a document: core's axe step rides inside
 * the four Behat scenarios, and this file reads what that step cannot. Three reasons
 * something lands here rather than there. A rule may need a state no scenario reaches -
 * the dark theme is a token swap nothing in the feature toggles. It may need a
 * relationship axe measures only when both halves are on screen, while the static form
 * survives a component nobody put in a scenario - the heading ladder. Or axe-core 4.10.3
 * may simply not implement the criterion, as with target size (WCAG 2.2 2.5.8).
 *
 * The discipline is the sibling file's, and for the sibling file's reason: two drafts of
 * bootstrap_compat_test once passed while blind to the very defect they were written for.
 * So every rule here carries a vacuity guard asserting it had something to check, and a
 * rule that matches nothing is the finding, not a pass.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversNothing]
final class accessibility_rules_test extends basic_testcase {
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
     * Every opening tag of one element name, as written in the source.
     *
     * The tag ends at the first closing angle bracket, which an arrow function in a later
     * attribute would bring forward - so a rule reading these tags asserts about the
     * attributes written BEFORE any handler, which is where a name belongs anyway.
     *
     * @param string $contents The source.
     * @param string $name The element name.
     * @return array The matched tags.
     */
    private function tags(string $contents, string $name): array {
        preg_match_all('/<' . $name . '[^>]*>/s', $contents, $matches);

        return $matches[0];
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
     * to prevent. Archive and Star are the two icon-only controls, Card and RowCard the
     * two card titles, Strip and Explore the two section titles, and the stylesheet is
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
         * deliberate -1 values - the decorative duplicate link on a card, the focus target
         * of the tier 3 title - proves the pattern still finds a tabindex where one is.
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
     * without an aria-label a screen reader announces "button" and the user is told to
     * press something unnamed. Since ADR-009 the list/cards switch (ViewToggle) is two such
     * buttons and the Filter button (FilterToggle) hides its own text and count from the
     * accessibility tree to say them as one sentence. Every button tag in these four files
     * must carry the attribute.
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
            // Vacuity guard: this file's whole purpose is one button, so finding none is the bug.
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
     * says nothing about what they do; unnamed, the three tier 3 toolbars are read as
     * three anonymous groups of buttons in a row.
     *
     * @return void
     */
    public function test_every_role_group_carries_a_name(): void {
        $groups = 0;
        foreach ($this->reactsources() as $file => $contents) {
            preg_match_all('/<[a-zA-Z][^>]*>/s', $contents, $matches);
            foreach ($matches[0] as $tag) {
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
        // Vacuity guard: the tier 3 toolbars are the groups, and there are three of them.
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
     * chosen in heading.ts and nowhere else: sections h4 under the title and h3 without it,
     * card titles one rung below. A literal heading tag in a component is a rung chosen
     * without asking, which is why none is allowed. axe's heading-order cannot see the first
     * case: sibling h3s skip no level.
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

        // The helper pins the three ladders (ADR-012, decision 2): 4 under core's block title, 3
        // without it, 2 on the block's own page under the theme's h1 - and a level it does not
        // know reads as 4, the Dashboard's.
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
     * The rule pins the PAIRING, not the ratio: no source can compute a contrast, and the
     * measurement is the driven pass's. The dark selector is the one dark mechanism 5.2 has,
     * the attribute Bootstrap 5.3 moves its tokens under; a .theme-dark class is emitted by
     * nothing in the 5.2 checkout or in the fleet's themes, so a rule for it would be dead.
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
            if (str_contains($selector, '[data-bs-theme="dark"]')) {
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
     * The archive control declares a target box of at least 24 CSS px.
     *
     * WCAG 2.2 2.5.8 sets the minimum at 24 by 24, and btn-link btn-sm p-0 computes to
     * about 23: the Bootstrap padding utility is !important, so nothing but an explicit
     * box brings it back. axe-core 4.10.3 does not check target size at all, which is why
     * the rule is here and not in the Behat step.
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
     * ADR-009, decision 10, the maintainer's own note: a name of several lines breaks the layout,
     * and the concern is the layout and not the payload. The clamp is Boost's own .clamp-2 pattern
     * under this plugin's .compass-clamp, and every element carrying that class also carries a
     * title, so hovering a clamped name shows it in full. axe reads neither: nothing in a
     * scenario renders a name long enough to clamp.
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
            preg_match_all('/<[a-zA-Z][^>]*>/s', $contents, $matches);
            foreach ($matches[0] as $tag) {
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
     * The row is a flex line of a name, a date, a progress bar and two controls. Measured at
     * 375 CSS px in the driven pass of ADR-008, the unwrapped line overflowed the block by
     * 19 px, which at 320 px is the horizontal scroll WCAG 1.4.10 forbids. axe does not
     * measure reflow, and no scenario runs at that width, so the source is the only reader.
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
     * A control that triggers its own busy state is aria-disabled while busy, never disabled.
     *
     * The disabled attribute is applied in the render the control's own click causes, and a
     * focused element that becomes disabled drops the keyboard to the body: the "Reloading…"
     * label is then announced to nobody, and the next Tab starts at the top of the page
     * (ADR-010, amendment 9). The two components that render such a control are read; "Show
     * more" in Group.tsx keeps its disabled attribute on purpose, because Explore moves focus
     * after a page deliberately (R3). The vacuity guard is the button tag itself, in each file.
     *
     * @return void
     */
    public function test_the_busy_controls_stay_focusable(): void {
        foreach (['js/esm/src/Reload.tsx', 'js/esm/src/RetryNotice.tsx'] as $file) {
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
     * Nothing is written in capitals: a heading is emphasised with weight, never with case.
     *
     * The maintainer's rule (ADR-010, decision 8), general on purpose. Bootstrap's text-uppercase
     * and a text-transform declaration are the two ways to shout, and the strip heading - the
     * one place that used to - is the vacuity guard: it must exist and carry a weight class.
     *
     * @return void
     */
    public function test_nothing_is_uppercase(): void {
        foreach ($this->reactsources() as $file => $contents) {
            $this->assertDoesNotMatchRegularExpression(
                '/\btext-uppercase\b/',
                $contents,
                "{$file}: text-uppercase shouts; emphasise with fw-bold instead (ADR-010, decision 8)"
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
     * The tier 3 cards are a grid whose column count the client sets, so a lone card keeps its column.
     *
     * ADR-010, decision 4: three classes name three counts, the stylesheet draws each as a fixed
     * repeat over minmax(0, 1fr), and RowList picks the class from the count it is handed. Neither
     * axe nor a scenario measures a column, so the source is the only reader.
     *
     * @return void
     */
    public function test_the_cards_grid_counts_its_columns(): void {
        $bodies = [];
        foreach ($this->rules() as $rule) {
            [$selector, $body] = $rule;
            if (preg_match('/\.compass-rowcards(-[123])?(?![\w-])/', $selector, $matches) && !str_contains($selector, ':')) {
                $bodies[$matches[1] ?? ''] = $body;
            }
        }
        // Vacuity guard: the base rule and the three counts must all be there to read.
        $this->assertArrayHasKey('', $bodies, 'no .compass-rowcards rule found in styles.css');
        $this->assertMatchesRegularExpression('/\bdisplay\s*:\s*grid\b/', $bodies[''], 'the cards are not a grid');
        foreach ([1, 2, 3] as $count) {
            $this->assertArrayHasKey("-{$count}", $bodies, "no .compass-rowcards-{$count} rule found in styles.css");
            $this->assertMatchesRegularExpression(
                '/grid-template-columns\s*:\s*repeat\(' . $count . ',\s*minmax\(0,\s*1fr\)\)/',
                $bodies["-{$count}"],
                ".compass-rowcards-{$count} does not draw {$count} equal columns"
            );
        }

        $rowlist = $this->sources()['js/esm/src/RowList.tsx'];
        $this->assertStringContainsString(
            'compass-rowcards-${columns}',
            $rowlist,
            'RowList does not pick the column class from its count'
        );
        $this->assertDoesNotMatchRegularExpression('/\bflex-wrap\b/', $rowlist, 'the cards are a flex line again');
    }

    /**
     * On a card the star takes the top-right corner, on a disc, and the badge the top-left.
     *
     * ADR-010, decision 5. The star's disc is what keeps the control at 3:1 over a photograph
     * (WCAG 1.4.11): a surface background and a line border, both theme tokens. The two card
     * components must render the star for the rule to be about anything.
     *
     * @return void
     */
    public function test_the_card_corners_are_the_stars_and_the_badges(): void {
        $badge = null;
        $star = null;
        foreach ($this->rules() as $rule) {
            [$selector, $body] = $rule;
            if (preg_match('/\.compass-card-badge(?![\w-])/', $selector) && !str_contains($selector, ':')) {
                $badge = $body;
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
        }
    }
}
