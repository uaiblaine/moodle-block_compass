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

use basic_testcase;
use PHPUnit\Framework\Attributes\CoversNothing;

/**
 * The filter line's contract, pinned by reading the client (ADR-015).
 *
 * Nothing runs the React sources in a test, and the fleet's filter line contract
 * (moodle-dev/docs/filter-line/CONTRACT.md) is mostly about roles, keys and what a control may ask:
 * so each rule here reads the source that keeps it and fails when the source stops saying it. Each
 * method names the change that must redden it, and mutations/gates.conf makes that change.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversNothing]
final class filter_line_rules_test extends basic_testcase {
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
     * The stylesheet with its comments removed: comments are prose and may name what the rules forbid.
     *
     * @return string The stylesheet.
     */
    private function css(): string {
        return preg_replace('#/\*.*?\*/#s', '', (string) file_get_contents(dirname(__DIR__, 2) . '/styles.css'));
    }

    /**
     * The text from one marker to the next occurrence of another.
     *
     * @param string $source The file.
     * @param string $start The text the slice starts with.
     * @param string $end The text that ends it.
     * @return string The slice.
     */
    private function slice(string $source, string $start, string $end): string {
        $from = strpos($source, $start);
        $this->assertNotFalse($from, "{$start} not found");
        $to = strpos($source, $end, $from + strlen($start));
        $this->assertNotFalse($to, "{$end} not found after {$start}");

        return substr($source, $from, $to - $from);
    }

    /**
     * The scope is a radio group whose checked cell is its one tab stop, walked by the arrow keys.
     *
     * Contract section 8: role="radiogroup" with a roving tabindex and arrow keys. The keys skip a cell
     * the counts hide, and every cell checks as the focus reaches it, as the radio pattern does.
     *
     * Changes that must make it fail: the group or its cells losing their roles, aria-checked, every
     * cell in the tab order, the keys no longer skipping a hidden cell or no longer checking.
     *
     * @return void
     */
    public function test_the_scope_is_a_radio_group_with_a_roving_tab_stop(): void {
        $scope = $this->source('ScopeGroup.tsx');

        $this->assertMatchesRegularExpression('/className="compass-scope"\s+role="radiogroup"\s+aria-label=\{label\}/', $scope);
        $this->assertStringContainsString('role="radio"', $scope);
        $this->assertStringContainsString('aria-checked={cell.checked}', $scope);
        $this->assertStringContainsString('tabIndex={cell.key === stop ? 0 : -1}', $scope);
        $keys = $this->slice($scope, 'const keydown = ', 'return (');
        foreach (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'] as $key) {
            $this->assertStringContainsString("'{$key}'", $keys, "{$key} does not move along the scope");
        }
        $this->assertStringContainsString(".compass-scope-cell:not([hidden])", $keys, 'the keys land on a hidden cell');
        $this->assertStringContainsString('onCheck(key);', $keys, 'the check does not follow the focus');
    }

    /**
     * Favourites are a pressed toggle ANDed with the scope, never one of its values (ADR-015 decision 1).
     *
     * Changes that must make it fail: the toggle losing aria-pressed, the star keeping a course the
     * favourites chip would not (an application, a later start), the criteria ORing the star, or the
     * scope's vocabulary taking favourites back.
     *
     * @return void
     */
    public function test_the_star_is_a_pressed_toggle_anded_with_the_scope(): void {
        $this->assertStringContainsString('aria-pressed={pressed}', $this->source('StarToggle.tsx'));
        $filter = $this->source('filter.ts');
        $this->assertStringContainsString(
            "export const passesStar = (star: boolean, row: RowFacts): boolean => !star || passesChip('favourites', row);",
            $filter
        );
        $this->assertMatchesRegularExpression(
            '/passesChip\(criteria\.scope, row\)\s*&& passesStar\(criteria\.star, row\)\s*&& passesSelection/',
            $filter,
            'the criteria do not AND the scope, the star and the selection'
        );
        $this->assertStringContainsString("const SCOPES = ['all', 'new', 'pending', 'scheduled'];", $this->source('Explore.tsx'));
    }

    /**
     * The search is a combobox over one listbox, the active option named, the focus kept in the field.
     *
     * Contract sections 3 and 8. Changes that must make it fail: the field losing its role, its
     * aria-expanded, aria-controls or aria-activedescendant; the listbox its role; an option its role
     * or aria-selected; a press on the listbox taking the focus from the field.
     *
     * @return void
     */
    public function test_the_search_is_a_combobox_over_one_listbox(): void {
        $line = $this->source('FilterLine.tsx');
        $field = $this->slice($line, '<input', '/>');

        $this->assertStringContainsString('role="combobox"', $field);
        $this->assertStringContainsString('aria-autocomplete="list"', $field);
        $this->assertStringContainsString('aria-expanded={listshown}', $field);
        $this->assertStringContainsString('aria-controls={listid}', $field);
        $this->assertStringContainsString('aria-activedescendant={current >= 0 && listshown ?', $field);
        $listbox = $this->slice($line, 'id={listid}', '>');
        $this->assertStringContainsString('role="listbox"', $listbox);
        $this->assertStringContainsString('onMouseDown={(event) => event.preventDefault()}', $line, 'a press takes the focus away');
        $this->assertSame(2, substr_count($line, 'role="option"'), 'the filters and the courses are not both options');
        $this->assertSame(2, substr_count($line, 'aria-selected={index === current}'));
    }

    /**
     * The slash key focuses the search, never while the reader is typing in a field.
     *
     * Contract section 3. Changes that must make it fail: the guard for a focused field or an editable
     * region dropped, or a modified key (Ctrl, Cmd, Alt) taken for the slash.
     *
     * @return void
     */
    public function test_the_slash_key_goes_to_the_search_outside_any_field(): void {
        $keys = $this->slice(
            $this->source('FilterLine.tsx'),
            'const keydown = (event: globalThis.KeyboardEvent)',
            'document.addEventListener('
        );

        $this->assertStringContainsString("event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey", $keys);
        $this->assertStringContainsString("focused.isContentEditable || focused.closest('input, textarea, select')", $keys);
        $this->assertStringContainsString('event.preventDefault();', $keys);
    }

    /**
     * The line folds on its own width, with every scope cell drawn while it measures.
     *
     * Contract section 2: the line measures its container, never the viewport, takes the first step at
     * which it fits, and draws every cell for the measure so the step follows the width and the
     * language, never the counts. Moodle's stylelint forbids a container query, so a ResizeObserver on
     * the line does it.
     *
     * Changes that must make it fail: the steps tried in another order, a hidden cell left hidden for
     * the measure, the observer watching anything but the line, a container query in the stylesheet.
     *
     * @return void
     */
    public function test_the_line_folds_on_its_own_width(): void {
        $line = $this->source('FilterLine.tsx');

        $this->assertStringContainsString(
            "const TRIES: [Step, boolean][] = [['s1', false], ['s2', false], ['s3', true], ['s4', false], ['s4', true]];",
            $line
        );
        $fit = $this->slice($line, 'const fit = useCallback(', '}, [hassearch]);');
        $this->assertStringContainsString(".compass-scope-cell[hidden]", $fit);
        $this->assertMatchesRegularExpression('/cell\.hidden = false;.*?overflows\(element\).*?cell\.hidden = true;/s', $fit);
        $this->assertMatchesRegularExpression('/const element = line\.current;.*?observer\.observe\(element\);/s', $line);
        $this->assertDoesNotMatchRegularExpression('/@container\b/', $this->css());
        $this->assertDoesNotMatchRegularExpression('/\bwindow\.innerWidth\b|matchMedia\(\'\(m(in|ax)-width/', $line);
    }

    /**
     * The floating layers hang under the line's measured bottom, and the panel is a sheet at step 4.
     *
     * Contract section 4. Changes that must make it fail: a layer's top no longer read from the line's
     * drawn controls, or the panel no longer a sheet at the two-line step.
     *
     * @return void
     */
    public function test_the_layers_hang_under_the_measured_line(): void {
        $line = $this->source('FilterLine.tsx');

        $this->assertStringContainsString('const top = Math.round(lineBottom() - origin.top + GAP);', $line);
        $this->assertStringContainsString("const sheet = fold.step === 's4' && !trapped;", $line);
        $css = $this->css();
        $this->assertMatchesRegularExpression(
            '/\.compass-fpanel\.compass-fpanel-sheet:not\(\[hidden\]\)\s*\{[^}]*position:\s*fixed;[^}]*bottom:\s*0;/',
            $css
        );
    }

    /**
     * The sheet yields to a popover where an ancestor would clip a viewport-fixed child.
     *
     * Moodle 5.3's open block drawer carries clip-path: inset(0), which cuts a position: fixed
     * descendant to the drawer's box, so the sheet's chips sat outside it and could not be pressed
     * (the Dashboard's right drawer, which the Behat scenario uses). The line reads the computed style of its
     * ancestors when the panel opens at the two-line step and keeps the popover when one traps it.
     * Changes that must make it fail: the clip-path no longer read, the sheet no longer conditional on the
     * read, or the line no longer raised only when the panel really is a sheet.
     *
     * @return void
     */
    public function test_the_sheet_yields_where_an_ancestor_would_clip_it(): void {
        $line = $this->source('FilterLine.tsx');

        $trap = $this->slice($line, 'const fixedTrapped = ', 'return false;');
        $this->assertStringContainsString("style.clipPath !== 'none'", $trap);
        $this->assertStringContainsString("style.transform !== 'none'", $trap);
        $this->assertMatchesRegularExpression('/paint\|layout/', $trap);
        $this->assertMatchesRegularExpression(
            '/if \(fold\.step === \'s4\' && panelopen\) \{\s*const next = fixedTrapped\(wrapper\.current\);/',
            $line
        );
        $this->assertStringContainsString("const sheet = fold.step === 's4' && !trapped;", $line);
        $this->assertMatchesRegularExpression(
            '/if \(sheet && panelopen\) \{\s*wrapperclasses\.push\(\'compass-filterline-sheet\'\);/',
            $line
        );
    }

    /**
     * The preview answers a mouse or a pen and the keyboard, never a finger, and asks the server nothing.
     *
     * Contract section 6, ADR-015 decision 6. Changes that must make it fail: a touch counted as
     * pointing, or the preview reaching the repository.
     *
     * @return void
     */
    public function test_the_preview_answers_a_mouse_or_a_pen_and_asks_nothing(): void {
        $this->assertStringContainsString(
            "export const hovers = (event: PointerEvent<HTMLElement>): boolean => event.pointerType === 'mouse' || "
                . "event.pointerType === 'pen';",
            $this->source('ScopeGroup.tsx')
        );
        $preview = $this->slice($this->source('Explore.tsx'), 'const preview = useCallback(', '}, [scope, star, selection, held');
        $this->assertDoesNotMatchRegularExpression(
            '/\b(getInventory|getInventoryRows|searchInventory|setExplorePreference)\(/',
            $preview
        );
        $this->assertStringContainsString("node.classList.toggle('compass-preview-lit', keep);", $preview);
        $this->assertStringContainsString("node.classList.toggle('compass-preview-dim', !keep);", $preview);
    }

    /**
     * The preview's dim remaps the text token and never fades with opacity.
     *
     * Changes that must make it fail: opacity on a lit or dimmed row or card, or the dim no longer
     * remapping the text.
     *
     * @return void
     */
    public function test_the_preview_dim_remaps_the_text_and_never_fades(): void {
        preg_match_all('/([^{}]+)\{([^{}]*)\}/s', $this->css(), $rules, PREG_SET_ORDER);
        $read = 0;
        foreach ($rules as [, $selector, $body]) {
            if (!preg_match('/\.compass-preview-(lit|dim)\b/', $selector)) {
                continue;
            }
            $read++;
            $this->assertDoesNotMatchRegularExpression(
                '/(?<![-\w])opacity\s*:/',
                $body,
                trim($selector) . ' fades with opacity'
            );
            if (str_contains($selector, 'compass-preview-dim')) {
                $this->assertMatchesRegularExpression('/(?<![-\w])color:\s*var\(--block_compass-x3-fg-dim\)/', $body);
            }
        }
        $this->assertSame(2, $read, 'the lit and the dim rules were not both read');
    }

    /**
     * Paged mode asks for no page that it knows keeps nothing: the star with Awaiting or Scheduled.
     *
     * Non-negotiable 5 and ADR-015 decision 4: the favourites chip keeps only a course the learner
     * can enter, so the pair is empty by construction, and the browser says so without a request. The
     * server is told the star's chip, or else the scope's.
     *
     * Changes that must make it fail: the fetch effect asking with the pair in force, or the server told
     * the scope while the star is pressed.
     *
     * @return void
     */
    public function test_paged_mode_asks_nothing_for_a_pair_that_keeps_nothing(): void {
        $explore = $this->source('Explore.tsx');

        $this->assertStringContainsString("const keepsnothing = star && (scope === 'pending' || scope === 'scheduled');", $explore);
        $this->assertStringContainsString("const serverchip = star ? 'favourites' : scope;", $explore);
        $this->assertStringContainsString(
            'if (!open[group.id] || page.loading || page.failed || (paged && keepsnothing)) {',
            $explore
        );
        $this->assertStringContainsString('paged ? serverchip : \'all\',', $explore);
    }

    /**
     * Filters and Organise are disclosures: aria-expanded and aria-controls naming their layer.
     *
     * Contract section 8. Changes that must make it fail: either button losing either attribute.
     *
     * @return void
     */
    public function test_filters_and_organise_say_what_they_open(): void {
        $organise = $this->source('OrganiseMenu.tsx');
        $this->assertStringContainsString('aria-expanded={open}', $organise);
        $this->assertStringContainsString('aria-controls={menuid}', $organise);
        $toggle = $this->source('FilterToggle.tsx');
        $this->assertStringContainsString('aria-expanded={open}', $toggle);
        $this->assertStringContainsString('aria-controls={controls}', $toggle);
    }

    /**
     * A pending-notice link with the feature off opens All: the line does not draw that scope cell.
     *
     * Changes that must make it fail: the link pressing a pending scope the line has no cell for.
     *
     * @return void
     */
    public function test_a_pending_link_with_the_feature_off_opens_all(): void {
        $explore = $this->source('Explore.tsx');
        $this->assertStringContainsString(
            "value === 'pending' && !config.pendingenabled ? 'all' : value",
            $explore
        );
    }

    /**
     * An icon inside a line button keeps its element across renders, so a press is not lost.
     *
     * The field's blur re-renders the line between the mouse going down on the close button and coming
     * up; React 19 sets innerHTML again for a new prop object, which detaches the element the press began
     * on and the browser then fires no click (the search stayed open). The markup goes through
     * markup(), one object per string.
     *
     * Changes that must make it fail: an icon of the line written as a fresh object literal, or the
     * helper no longer returning the same object for the same string.
     *
     * @return void
     */
    public function test_the_line_icons_keep_their_element_across_renders(): void {
        foreach (['FilterLine', 'FilterToggle', 'OrganiseMenu', 'StarToggle', 'ViewToggle'] as $name) {
            $source = $this->source($name . '.tsx');
            $this->assertStringContainsString('dangerouslySetInnerHTML={markup(', $source, $name);
            $this->assertStringNotContainsString('dangerouslySetInnerHTML={{', $source, $name);
        }
        $line = $this->source('FilterLine.tsx');
        $this->assertStringContainsString('dangerouslySetInnerHTML={markup(icons.close)}', $line);
        $helper = $this->source('markup.ts');
        $this->assertStringContainsString('cache.get(html)', $helper);
        $this->assertStringContainsString('cache.set(html, value);', $helper);
    }

    /**
     * A suggestion's count is the count without the typed text, because choosing it empties the field.
     *
     * Contract section 3. Changes that must make it fail: the suggestions counted under the applied
     * query, or a chosen filter leaving the text in the field.
     *
     * @return void
     */
    public function test_a_suggestion_counts_without_the_typed_text(): void {
        $explore = $this->source('Explore.tsx');
        $this->assertStringContainsString("const untyped = useMemo(() => countFacets(''), [countFacets]);", $explore);
        $filters = $this->slice($explore, 'const linefilters = useMemo(', 'return offer;');
        $this->assertStringContainsString('untyped.status', $filters);
        $this->assertDoesNotMatchRegularExpression('/\bfacets\./', $filters, 'the suggestions are counted under the typed text');
        $choose = $this->slice($this->source('FilterLine.tsx'), 'const choose = (index: number)', 'setActive(-1);');
        $this->assertMatchesRegularExpression('/onErase\(\);\s*onApply\(option\.filter\.candidate\);/', $choose);
    }

    /**
     * The words of the line are the contract's, in both languages (contract section 7).
     *
     * Changes that must make it fail: a word changed in either pack.
     *
     * @return void
     */
    public function test_the_words_are_the_contracts(): void {
        $root = dirname(__DIR__, 2);
        $strings = [];
        foreach (self::languages() as $lang) {
            $string = [];
            include($root . '/lang/' . $lang . '/block_compass.php');
            $strings[$lang] = $string;
        }
        $words = [
            'searchplaceholder' => ['Search courses…', 'Buscar cursos…'],
            'line_cleartext' => ['Clear text', 'Limpar texto'],
            'line_closesearch' => ['Close search', 'Fechar busca'],
            'filter' => ['Filters', 'Filtros'],
            'clearfilters' => ['Clear filters', 'Limpar filtros'],
            'line_clearall' => ['Clear all', 'Limpar tudo'],
            'line_organise' => ['Organise', 'Organizar'],
            'view_list' => ['List', 'Lista'],
            'view_cards' => ['Cards', 'Cartões'],
            'chip_favourites' => ['Favourites', 'Favoritos'],
            'line_suggestfilters' => ['Filters', 'Filtros'],
            'line_suggestcourses' => ['Courses', 'Cursos'],
            'line_suggeststart' => ['Start with a filter', 'Comece por um filtro'],
        ];
        foreach ($words as $key => [$en, $ptbr]) {
            $this->assertSame($en, $strings['en'][$key] ?? null, "en {$key}");
            if (isset($strings['pt_br'])) {
                $this->assertSame($ptbr, $strings['pt_br'][$key] ?? null, "pt_br {$key}");
            }
        }
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
