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
 * The filter line's contract, pinned by reading the client (ADR-015, ADR-023).
 *
 * Nothing runs the React sources in a test, and the fleet's filter line contract
 * (moodle-dev/docs/filter-line/CONTRACT.md) is mostly about roles, keys and what a control may ask, and
 * the Design System's compact bar (moodle-dev/docs/design-system/components/filter-bar.md) about its
 * measures: so each rule here reads the source that keeps it and fails when the source stops saying it.
 * Each method names the change that must redden it, and mutations/gates.conf makes that change.
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
     * The stylesheet's rules, comments removed, in source order; an @media block's rules on their own.
     *
     * @return array A list of [selector list, declaration body].
     */
    private function rules(): array {
        preg_match_all('/([^{}]+)\{([^{}]*)\}/s', $this->css(), $matches, PREG_SET_ORDER);
        $rules = [];
        foreach ($matches as $match) {
            $rules[] = [trim(preg_replace('/\s+/', ' ', $match[1])), $match[2]];
        }

        return $rules;
    }

    /**
     * The body of the first rule whose selector list is exactly the one given (an @media rule of the same
     * selector comes later).
     *
     * @param string $selector The selector list, its whitespace collapsed.
     * @return string The declarations.
     */
    private function rule(string $selector): string {
        $found = array_values(array_filter($this->rules(), static fn(array $rule): bool => $rule[0] === $selector));
        $this->assertNotEmpty($found, "the stylesheet has no rule {$selector}");

        return $found[0][1];
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
     * The line folds on its own width, with every scope cell drawn and the search open while it measures.
     *
     * Contract section 2: the line measures its container, never the viewport, takes the first step at
     * which it fits, and draws every cell for the measure so the step follows the width and the
     * language, never the counts. The search is measured open, so opening it never pushes the full line
     * past its edge. Moodle's stylelint forbids a container query, so a ResizeObserver on the line does it.
     *
     * Changes that must make it fail: the steps tried in another order, a hidden cell left hidden for
     * the measure, the field folded for the measure, the observer watching anything but the line, a
     * container query in the stylesheet.
     *
     * @return void
     */
    public function test_the_line_folds_on_its_own_width(): void {
        $line = $this->source('FilterLine.tsx');

        $this->assertStringContainsString("const TRIES: Step[] = ['full', 'narrow'];", $line);
        $fit = $this->slice($line, 'const fit = useCallback(', 'setStep(chosen);');
        $this->assertStringContainsString(".compass-scope-cell[hidden]", $fit);
        $this->assertMatchesRegularExpression('/cell\.hidden = false;.*?overflows\(element\).*?cell\.hidden = true;/s', $fit);
        $this->assertStringContainsString('element.className = lineClass(TRIES[index], false, true);', $fit);
        $this->assertMatchesRegularExpression(
            '/compass-line-searching \.compass-search,\s*\.block_compass \.compass-line\.compass-line-measuring '
                . '\.compass-search\s*\{\s*display:\s*inline-flex;/',
            $this->css(),
            'the field is not drawn open while the line is measured'
        );
        $this->assertMatchesRegularExpression('/const element = line\.current;.*?observer\.observe\(element\);/s', $line);
        $this->assertDoesNotMatchRegularExpression('/@container\b/', $this->css());
        $this->assertDoesNotMatchRegularExpression('/\bwindow\.innerWidth\b|matchMedia\(\'\(m(in|ax)-width/', $line);
    }

    /**
     * The narrow step puts the scope on a line of its own after the controls, and the open search takes the line.
     *
     * Contract section 2, second step: the scope moves after the controls - in the document as on the screen,
     * so the reading order is the visual one - its cells sharing the width; while the search is open the
     * cluster hides and the field takes the line. The chips row stays under the bar, after the scope.
     *
     * Changes that must make it fail: the scope left before the controls at the narrow step, the scope not
     * given its own line or its cells not sharing it, the cluster left on the line beside the open field.
     *
     * @return void
     */
    public function test_the_narrow_step_gives_the_scope_and_the_open_search_a_line_each(): void {
        $line = $this->source('FilterLine.tsx');
        $this->assertStringContainsString(
            "const children = step === 'narrow' ? [cluster, search, spacer, scope] : [scope, spacer, cluster, search];",
            $line
        );
        $scope = $this->rule('.block_compass .compass-line.compass-line-narrow > .compass-scope');
        $this->assertMatchesRegularExpression('/flex:\s*1 0 100%;/', $scope);
        $cells = $this->rule('.block_compass .compass-line-narrow .compass-scope-cell');
        $this->assertMatchesRegularExpression('/flex:\s*1 1 0;/', $cells);
        $this->assertMatchesRegularExpression('/min-width:\s*0;/', $cells);
        $this->assertMatchesRegularExpression(
            '/display:\s*none;/',
            $this->rule('.block_compass .compass-line.compass-line-narrow.compass-line-searching > .compass-line-cluster'),
            'the cluster stays beside the open field at the narrow step'
        );
        $this->assertMatchesRegularExpression(
            '/flex:\s*1 1 0;/',
            $this->rule('.block_compass .compass-line.compass-line-narrow.compass-line-searching > .compass-line-searchcap')
        );
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
        $this->assertStringContainsString("const sheet = step === 'narrow' && !trapped;", $line);
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
            '/if \(step === \'narrow\' && panelopen\) \{\s*const next = fixedTrapped\(wrapper\.current\);/',
            $line
        );
        $this->assertStringContainsString("const sheet = step === 'narrow' && !trapped;", $line);
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
                $this->assertMatchesRegularExpression('/(?<![-\w])color:\s*var\(--block_compass-ink-dim\)/', $body);
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
     * Filters, Organise and View say what they open: aria-expanded and aria-controls naming their layer.
     *
     * Contract section 8. Changes that must make it fail: any of the three buttons losing either attribute.
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
        $view = $this->slice($this->source('ViewToggle.tsx'), '<button', '>');
        $this->assertStringContainsString('aria-expanded={open}', $view);
        $this->assertStringContainsString('aria-controls={menuid}', $view);
    }

    /**
     * View is one button with a chevron, opening a menu of two radio items, Cards and List (ADR-023); the menu is the
     * bar's LineMenu, Organise's too (ADR-024).
     *
     * Contract sections 1 and 8: a menu is role="menu", a choice is menuitemradio with aria-checked, every item an
     * icon before its word and a tick after the chosen one's; opening it moves the keyboard to the chosen item and
     * the arrow keys walk the items; Escape, Tab and a choice give the keyboard back to the button. View is never a
     * pair of switches on the bar again, and Organise's sorts are the same kind of item under their heading.
     *
     * Changes that must make it fail: the menu losing its role, an item its role or aria-checked, the keyboard left
     * on the button when the menu opens, a choice or Escape no longer returning it, Tab no longer closing a menu,
     * the chevron dropped, either button no longer drawing the shared menu.
     *
     * @return void
     */
    public function test_view_is_one_button_opening_a_menu_of_two_radio_items(): void {
        $menu = $this->source('LineMenu.tsx');
        $this->assertMatchesRegularExpression('/className="compass-line-menu compass-line-layer"\s+role="menu"/', $menu);
        $item = $this->slice($menu, 'className="compass-line-menuitem"', 'onClick=');
        $this->assertStringContainsString('role="menuitemradio"', $item);
        $this->assertStringContainsString('aria-checked={chosen === choice.value}', $item);
        $this->assertStringContainsString('dangerouslySetInnerHTML={markup(choice.icon)}', $menu, 'an item has no icon');
        $this->assertStringContainsString('dangerouslySetInnerHTML={markup(tick)}', $menu, 'the chosen item has no tick');
        $this->assertMatchesRegularExpression(
            '/<div className="compass-line-menulabel" id=\{headid\}>\{heading\}<\/div>\s*'
                . '<div role="group" aria-labelledby=\{headid\}>\{items\}<\/div>/',
            $menu,
            'a heading no longer names its group of choices'
        );
        $this->assertMatchesRegularExpression(
            '/if \(open\) \{\s*menu\.current\?\.querySelector<HTMLElement>\(\'\[aria-checked="true"\]\'\)\?\.focus\(/',
            $menu,
            'opening the menu leaves the keyboard on the button'
        );
        foreach (['ArrowDown', 'ArrowUp', 'Home', 'End'] as $key) {
            $this->assertStringContainsString("'{$key}'", $this->slice($menu, 'const walk = ', "\n};\n"));
        }

        $view = $this->source('ViewToggle.tsx');
        $this->assertSame(1, substr_count($view, '<button'), 'View is one button; its items are the menu\'s');
        $this->assertStringContainsString('<LineMenu', $view);
        $this->assertMatchesRegularExpression(
            "/\\{value: 'cards', label: labels\\.view_cards, icon: icons\\.grid\\},\\s*"
                . "\\{value: 'list', label: labels\\.view_list, icon: icons\\.list\\},/",
            $view
        );
        $this->assertStringContainsString('dangerouslySetInnerHTML={markup(icons.expanded)}', $view, 'View has no chevron');
        $organise = $this->source('OrganiseMenu.tsx');
        $this->assertSame(1, substr_count($organise, '<button'), 'Organise is one button; its items are the menu\'s');
        $this->assertStringContainsString('<LineMenu', $organise);

        $line = $this->source('FilterLine.tsx');
        $this->assertMatchesRegularExpression(
            '/onChoose=\{\(value\) => \{\s*setViewopen\(false\);\s*focusLater\(\(\) => viewbtn\.current\);/',
            $line,
            'a choice does not give the keyboard back to View'
        );
        $this->assertMatchesRegularExpression(
            '/onSort=\{\(value\) => \{\s*setMenuopen\(false\);\s*focusLater\(\(\) => organise\.current\);/',
            $line,
            'a choice does not give the keyboard back to Organise'
        );
        $this->assertMatchesRegularExpression(
            '/onGroup=\{\(value\) => \{\s*setMenuopen\(false\);\s*focusLater\(\(\) => organise\.current\);/',
            $line,
            'a grouping does not give the keyboard back to Organise'
        );
        $this->assertMatchesRegularExpression(
            '/\} else if \(viewopen\) \{\s*event\.preventDefault\(\);\s*setViewopen\(false\);\s*'
                . 'focusLater\(\(\) => viewbtn\.current\);/',
            $line,
            'Escape does not close the View menu back to its button'
        );
        $this->assertMatchesRegularExpression(
            "/if \\(event\\.key === 'Tab' && \\(menuopen \\|\\| viewopen\\)\\) \\{\\s*setMenuopen\\(false\\);\\s*"
                . 'setViewopen\\(false\\);/',
            $line,
            'Tab out of a menu leaves it open'
        );
        $this->assertStringNotContainsString('compass-viewbtn', $view . $this->css(), 'the two-button switch is back');
        $this->assertStringNotContainsString('compass-line-viewmenu', $view . $this->css(), 'View draws a menu of its own again');
    }

    /**
     * The search is an icon that opens the field in place; Escape closes it back to its button, and so does
     * leaving it empty.
     *
     * Contract section 3: at every width the search button opens the field in place, in its capsule, and
     * moves the keyboard into it; Escape closes it, whatever it holds, and the keyboard returns to the search
     * button; leaving it empty closes it too. A text left in force once the field has closed shows as a chip.
     *
     * Changes that must make it fail: the field drawn at rest, the button no longer opening it, Escape
     * closing only the suggestions, the keyboard not given back to the search button, an empty field left
     * open when the focus moves on, a field with text closed when the focus goes to nothing, the chip of a
     * text in force dropped.
     *
     * @return void
     */
    public function test_the_search_opens_in_place_and_escape_closes_it_to_its_button(): void {
        $line = $this->source('FilterLine.tsx');
        $this->assertMatchesRegularExpression('/display:\s*none;/', $this->rule('.block_compass .compass-line .compass-search'));
        $open = $this->slice($line, 'const openSearch = (): void => {', 'const closeSearch');
        $this->assertStringContainsString('setSearching(true);', $open);
        $this->assertStringContainsString('focusLater(() => field.current);', $open);
        $this->assertStringContainsString('onClick={() => openSearch()}', $line);
        $close = $this->slice($line, 'const closeSearch = (back: boolean): void => {', 'const choose');
        $this->assertMatchesRegularExpression('/if \(back\) \{\s*focusLater\(\(\) => opener\.current\);/', $close);
        $keys = $this->slice($line, 'const fieldKey = ', 'const lineKey');
        $this->assertMatchesRegularExpression(
            '/\} else if \(event\.key === \'Escape\'\) \{.*?event\.preventDefault\(\);\s*closeSearch\(true\);/s',
            $keys
        );
        $this->assertStringContainsString(
            "if (searching && event.target === field.current && query === '') {\n                setSearching(false);",
            $line,
            'an empty field stays open when the focus leaves it'
        );
        $this->assertMatchesRegularExpression(
            "/if \\(next \\|\\| query === ''\\) \\{\\s*setSearching\\(false\\);/",
            $line,
            'a field with text closes when the focus goes to nothing (another window, a press on what takes no focus)'
        );
        $this->assertStringContainsString("if (hassearch && !open && term !== '') {", $line, 'a text in force has no chip');
    }

    /**
     * The eraser clears the text and keeps the field open, the keyboard in it (contract section 3, D30).
     *
     * A press on the eraser must not blur the field (a browser that focuses no button on a press would read
     * the blur as the focus leaving the bar and close it), and a focus that lands on it keeps the field open.
     *
     * Changes that must make it fail: the eraser's press taking the focus, a focus on the eraser closing the
     * field, the eraser no longer giving the keyboard back to the field.
     *
     * @return void
     */
    public function test_the_eraser_clears_the_text_and_keeps_the_field_open(): void {
        $line = $this->source('FilterLine.tsx');
        $eraser = $this->slice($line, "className={tipHost('compass-search-eraser'", '</button>');
        $this->assertStringContainsString('aria-label={labels.line_cleartext}', $eraser);
        $this->assertStringContainsString('onMouseDown={(press) => press.preventDefault()}', $eraser);
        $this->assertMatchesRegularExpression(
            '/onErase\(\);\s*setListopen\(true\);\s*setActive\(-1\);\s*focusLater\(\(\) => field\.current\);/',
            $eraser
        );
        $this->assertStringContainsString(
            'if (next && (field.current?.parentElement?.contains(next) || listbox.current?.contains(next))) {',
            $line,
            'a focus on the eraser closes the field'
        );
    }

    /**
     * The bar shows the number of courses the list shows, at the start of the cluster, and none in paged mode.
     *
     * Contract section 1: the count is always on the bar, before the capsule. Paged mode counts nothing it has
     * not fetched (ADR-004, ADR-015 decision 4), so the count is left out there rather than asked for:
     * non-negotiable 5.
     *
     * Changes that must make it fail: the count after the capsule or off the bar, a count in paged mode, the
     * count without its words for a screen reader.
     *
     * @return void
     */
    public function test_the_count_leads_the_cluster_and_paged_mode_shows_none(): void {
        $this->assertStringContainsString('total={paged ? null : shown}', $this->source('Explore.tsx'));
        $line = $this->source('FilterLine.tsx');
        $cluster = $this->slice($line, '<div className="compass-line-cluster" key="cluster">', '{starbtn}');
        $this->assertMatchesRegularExpression(
            '/\{total !== null && \(\s*<span className="compass-line-count" data-region="compass-total">.*?'
                . 'fillCount\(labels, \'resultsshown\', total\).*?<div className="compass-line-capsule">/s',
            $cluster
        );
    }

    /**
     * The bar takes the Design System's measures: 40 px, 44 px under a coarse pointer, capsules and platter at
     * radius lg with 3 px of padding, cells and buttons at radius md, 28 px chips at radius sm with the brand's
     * edge, the token focus ring, transitions on the motion tokens only where motion is welcome.
     *
     * Changes that must make it fail: a step of the bar's height changed, the capsule's or the platter's
     * padding or radius moved, a chip off its height or edge, a bar ring back on the accent, a transition
     * outside the reduced-motion guard.
     *
     * @return void
     */
    public function test_the_bar_takes_the_design_systems_measures(): void {
        $css = $this->css();
        $this->assertMatchesRegularExpression('/--block_compass-bar-inner:\s*2rem;/', $this->rule('.block_compass .compass-line'));
        $this->assertMatchesRegularExpression(
            '/@media \(pointer: coarse\) \{\s*\.block_compass \.compass-line \{\s*--block_compass-bar-inner:\s*2\.25rem;/',
            $css
        );
        foreach (['.block_compass .compass-line-capsule', '.block_compass .compass-scope'] as $selector) {
            $body = $this->rule($selector);
            $this->assertMatchesRegularExpression('/padding:\s*0\.1875rem;/', $body, $selector);
            $this->assertMatchesRegularExpression('/border-radius:\s*var\(--block_compass-radius-lg\);/', $body, $selector);
            $this->assertMatchesRegularExpression('/border:\s*1px solid /', $body, $selector);
        }
        foreach (['.block_compass .compass-scope-cell', '.block_compass .compass-line-iconbtn'] as $selector) {
            $body = $this->rule($selector);
            $this->assertMatchesRegularExpression('/height:\s*var\(--block_compass-bar-inner\);/', $body, $selector);
            $this->assertMatchesRegularExpression('/border-radius:\s*var\(--block_compass-radius-md\);/', $body, $selector);
        }
        $chip = $this->rule('.block_compass .compass-line-chip');
        $this->assertMatchesRegularExpression('/height:\s*1\.75rem;/', $chip);
        $this->assertMatchesRegularExpression('/border:\s*1px solid var\(--block_compass-brand-edge\);/', $chip);
        $this->assertMatchesRegularExpression('/border-radius:\s*var\(--block_compass-radius-sm\);/', $chip);
        $eraser = $this->rule('.block_compass .compass-search-eraser');
        $this->assertMatchesRegularExpression('/width:\s*1\.5rem;/', $eraser);
        $this->assertMatchesRegularExpression('/border-radius:\s*var\(--block_compass-radius-xs\);/', $eraser);
        $rings = 0;
        foreach ($this->rules() as [$selector, $body]) {
            if (!preg_match('/\.compass-(line|scope|search)[\w-]*[^,]*:focus-(visible|within)/', $selector)) {
                continue;
            }
            $rings++;
            $this->assertMatchesRegularExpression(
                '/outline:\s*var\(--block_compass-focus-width\) solid var\(--block_compass-focus-ring\);/',
                $body,
                "{$selector}: not the Design System's ring"
            );
        }
        $this->assertGreaterThanOrEqual(5, $rings, 'vacuity: the bar\'s rings were not read');
        $motion = $this->slice(
            $css,
            "@media (prefers-reduced-motion: no-preference) {\n    .block_compass .compass-line-iconbtn,",
            '}'
        );
        $this->assertStringContainsString('var(--block_compass-motion-fast) var(--block_compass-motion-ease)', $motion);
        foreach ($this->rules() as [$selector, $body]) {
            if (preg_match('/\.compass-(line|scope|search)/', $selector) && preg_match('/(?<![-\w])transition\s*:/', $body)) {
                $this->assertStringContainsString('--block_compass-motion-', $body, "{$selector}: a transition off the tokens");
            }
        }
    }

    /**
     * No control of the bar is a pill: the loud counter is the bar's only round shape (filter-bar.md, counter.md).
     *
     * Changes that must make it fail: a 999px, 50% or 50rem radius on any rule of the bar, its chips or its
     * search; the loud counter no longer round.
     *
     * @return void
     */
    public function test_no_control_of_the_bar_is_a_pill(): void {
        $read = 0;
        foreach ($this->rules() as [$selector, $body]) {
            if (!preg_match('/\.compass-(line|scope|search|filtercount|filterline)/', $selector)) {
                continue;
            }
            if (!preg_match('/border-radius:\s*([^;]+);/', $body, $radius)) {
                continue;
            }
            $read++;
            $round = (bool) preg_match('/999px|50%|50rem/', $radius[1]);
            if ($selector === '.block_compass .compass-filtercount') {
                $this->assertTrue($round, 'the loud counter is not round');
                continue;
            }
            $this->assertFalse($round, "{$selector} is a pill: {$radius[1]}");
        }
        $this->assertGreaterThanOrEqual(10, $read, 'vacuity: fewer than ten radii of the bar were read');
    }

    /**
     * The chips row wraps to further lines: no sideways scroll and no fades, so nothing measures it (D27).
     *
     * Changes that must make it fail: the row back on one scrolling line, a fade drawn on it, the client
     * measuring its scroll again.
     *
     * @return void
     */
    public function test_the_chips_row_wraps_and_never_scrolls(): void {
        $row = $this->rule('.block_compass .compass-line-chips:not([hidden])');
        $this->assertMatchesRegularExpression('/flex-wrap:\s*wrap;/', $row);
        $this->assertDoesNotMatchRegularExpression('/overflow(-x)?\s*:/', $row);
        $this->assertStringNotContainsString('compass-scroll-fade', $this->css() . $this->source('FilterLine.tsx'));
        $this->assertStringNotContainsString('onScroll', $this->source('FilterLine.tsx'));
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
        foreach (['FilterLine', 'FilterToggle', 'OrganiseMenu', 'StarToggle', 'ViewToggle', 'LineMenu'] as $name) {
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
     * Organise is two independent choices, Group by and Sort by, each a radio group under its heading (ADR-025, D49).
     *
     * The menu is LineMenu with two sections and a separator between them: Group by (Category, No grouping) and Sort
     * by (Name, Most recent), each choice its own callback, so choosing in one never changes the other. Paged mode is
     * always grouped: No grouping is drawn disabled with its reason (aria-disabled, aria-describedby, a press that
     * chooses nothing), Category is the checked item, and the stored grouping is kept, never written while paged.
     *
     * Changes that must make it fail: the two sections merged or their separator dropped, a section's heading or a
     * choice changed, No grouping enabled while paged or its press honoured, the stored grouping written or drawn
     * while paged.
     *
     * @return void
     */
    public function test_organise_groups_and_sorts_in_two_sections(): void {
        $organise = $this->source('OrganiseMenu.tsx');
        $group = $this->slice($organise, "key: 'group',", 'onChoose: onGroup,');
        $this->assertStringContainsString('heading: labels.organise_groupby,', $group);
        $this->assertStringContainsString(
            "{value: 'category', label: labels.organise_group_category, icon: icons.groupcategory},",
            $group
        );
        $this->assertStringContainsString('nogrouping,', $group);
        $this->assertStringContainsString('chosen: group,', $group);
        $sort = $this->slice($organise, "key: 'sort',", 'onChoose: onSort,');
        $this->assertStringContainsString('heading: labels.organise_sortby,', $sort);
        $this->assertStringContainsString("{value: 'name', label: labels.organise_sort_name, icon: icons.sortname},", $sort);
        $this->assertStringContainsString(
            "{value: 'recent', label: labels.organise_sort_recent, icon: icons.sortrecent},",
            $sort
        );
        $this->assertStringContainsString('chosen: sort,', $sort);
        $this->assertMatchesRegularExpression(
            '/const nogrouping = paged\s*\? \{value: \'none\', label: labels\.organise_group_none, icon: icons\.groupnone, '
                . 'note: labels\.organise_group_none_paged\}\s*: \{value: \'none\', label: labels\.organise_group_none, '
                . 'icon: icons\.groupnone\};/',
            $organise,
            'No grouping is offered while paged'
        );

        $menu = $this->source('LineMenu.tsx');
        $this->assertStringContainsString('{at > 0 && <div className="compass-line-menusep" role="separator" />}', $menu);
        $item = $this->slice($menu, 'className="compass-line-menuitem"', '>');
        $this->assertStringContainsString('aria-disabled={noteid === undefined ? undefined : true}', $item);
        $this->assertStringContainsString('aria-describedby={noteid}', $item);
        $this->assertMatchesRegularExpression(
            '/if \(noteid === undefined\) \{\s*section\.onChoose\(choice\.value\);/',
            $menu,
            'a disabled item chooses'
        );
        $this->assertStringContainsString(
            '{noteid !== undefined && <div className="compass-line-menunote" id={noteid}>{choice.note}</div>}',
            $menu
        );

        $line = $this->source('FilterLine.tsx');
        $this->assertStringContainsString("group={paged ? 'category' : group}", $line, 'paged mode draws the stored grouping');
        $explore = $this->source('Explore.tsx');
        $this->assertMatchesRegularExpression(
            '/const chooseGroup = \(value: string\): void => \{\s*if \(paged\) \{\s*return;\s*\}\s*setGroup\(value\);/',
            $explore,
            'paged mode writes the grouping'
        );
        $this->assertStringContainsString("const grouped = paged ? hits === null : group === 'category';", $explore);
        $this->assertStringContainsString(
            'const state: ExploreState = {group, sort, scope, star, cf: selection, panel: panelopen};',
            $explore,
            'the grouping is not remembered'
        );
        $this->assertStringContainsString('explore: {group, sort, scope, star, cf: selection, panel: panelopen},', $explore);
        $this->assertStringContainsString('group: config.explore.group,', $explore, 'the remembered copy has no grouping');
    }

    /**
     * Sort by orders every list the browser holds, inside each group as over the flat list (ADR-025).
     *
     * One comparator (rowOrder()) for the flat list and for each group's rows in full mode: by name, or by the last
     * access, newest first, a course never opened last and a tie by name. The archive and the Hidden group, held once
     * fetched, follow it too. By name a group keeps the server's order, which is the same. Paged mode sends the sort
     * with every page, and a change asks for the open groups again.
     *
     * Changes that must make it fail: a group's rows left in the server's order by recency, the tie by name dropped,
     * the flat list sorted by another comparator, the sort no longer sent with a page or a change not refetching.
     *
     * @return void
     */
    public function test_the_sort_orders_inside_each_group_as_over_the_flat_list(): void {
        $explore = $this->source('Explore.tsx');
        $order = $this->slice($explore, 'const rowOrder = ', "\n};\n");
        $this->assertMatchesRegularExpression(
            "/return sort === 'recent'\\s*\\? \\(a, b\\) => \\(\\(b\\.opened \\|\\| 0\\) - \\(a\\.opened \\|\\| 0\\)\\) "
                . '\\|\\| byname\\(a, b\\)\\s*: byname;/',
            $order,
            'recency: newest first, never opened last, a tie by name'
        );
        $this->assertStringContainsString('const order = useMemo(() => rowOrder(sort, normalised), [sort, normalised]);', $explore);
        $this->assertStringContainsString('Array.from(visible.values()).flat().sort(order)', $explore, 'the flat list\'s order');
        $this->assertStringContainsString(
            "const ordered = sort === 'recent' ? [...rows].sort(order) : rows;",
            $explore,
            'a group\'s rows by recency'
        );
        $this->assertStringContainsString(
            "rows: sort === 'recent' ? [...fetched].sort(order) : fetched,",
            $explore,
            'the archive\'s and the Hidden group\'s rows by recency'
        );
        $this->assertStringContainsString("paged ? sort : 'name',", $explore, 'a page in the server\'s order for the sort');
        $this->assertMatchesRegularExpression(
            '/if \(paged && value !== sort\) \{\s*resetGroups\(\);/',
            $explore,
            'a sort change leaves the open groups in the old order'
        );
    }

    /**
     * Escape puts the bar's tooltips off, and only the reader coming back to a button puts them on again (D51, WCAG
     * 1.4.13).
     *
     * The bar draws Tip.tsx's tooltip on every icon button, all four of the capsule's told whether Escape has put
     * them off; the pointer coming onto a button from outside it, or a Tab onto one, puts them back, never the focus
     * a closing menu hands back to its button, so the Escape that closed a menu does not raise its tooltip. The key
     * itself is not taken: useTipsOff() only listens, and the bar's own Escape still closes what is open.
     *
     * Changes that must make it fail: a button not told, any focus putting the tooltips back, the pointer's move
     * inside a button putting them back, Escape no longer putting them off, the host no longer marked off.
     *
     * @return void
     */
    public function test_escape_puts_the_bar_tooltips_off_until_the_reader_comes_back(): void {
        $line = $this->source('FilterLine.tsx');
        $this->assertStringContainsString('const [tipsoff, tipsOn] = useTipsOff();', $line);
        $this->assertSame(4, substr_count($line, 'tipsoff={tipsoff}'), 'the star, Filters, Organise and View are told');
        $this->assertMatchesRegularExpression(
            '/onFocus=\{\(\) => \{\s*\/\/[^\n]*\n\s*if \(Date\.now\(\) - tabat\.current < TAB_INTENT\) \{\s*tipsOn\(\);/',
            $line,
            'a focus that is no Tab puts the tooltips back'
        );
        $back = $this->slice($line, 'const tipsBack = ', "\n    };\n");
        $this->assertStringContainsString('if (host && hovers(event) && !(from && host.contains(from))) {', $back);
        $this->assertStringContainsString('onPointerOver={tipsBack}', $line);

        $tip = $this->source('Tip.tsx');
        $this->assertMatchesRegularExpression("/if \\(event\\.key === 'Escape'\\) \\{\\s*setOff\\(true\\);/", $tip);
        $this->assertStringNotContainsString('preventDefault', $tip, 'the tooltips take the key');
        $this->assertStringNotContainsString('stopPropagation', $tip, 'the tooltips take the key');
        $this->assertMatchesRegularExpression(
            '/\? \x60\$\{classes\} compass-tiphost compass-tipsoff\x60/',
            $tip,
            'the host is never marked off'
        );
        $this->assertStringContainsString('aria-hidden="true"', $tip);
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
            'line_view' => ['View', 'Visualização'],
            'view_list' => ['List', 'Lista'],
            'view_cards' => ['Cards', 'Cartões'],
            'chip_favourites' => ['Favourites', 'Favoritos'],
            'line_suggestfilters' => ['Filters', 'Filtros'],
            'line_suggestcourses' => ['Courses', 'Cursos'],
            'line_suggeststart' => ['Start with a filter', 'Comece por um filtro'],
            'organise_groupby' => ['Group by', 'Agrupar por'],
            'organise_sortby' => ['Sort by', 'Ordenar por'],
            'organise_group_none' => ['No grouping', 'Sem agrupamento'],
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
