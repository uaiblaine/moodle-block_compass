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

use PHPUnit\Framework\Attributes\CoversNothing;

/**
 * The client's side of the course card (ADR-020): what the components draw from Boost Union's flags, the completed
 * state, the one link, and when the generated image is asked for.
 *
 * No JavaScript runner holds any of this, so the sources are read, as the other rule tests do; the contract's own
 * checks over the stylesheet are course_card_contract_test's.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversNothing]
final class course_card_rules_test extends \basic_testcase {
    /**
     * A client source, its comments removed.
     *
     * @param string $name The file under js/esm/src.
     * @return string The code.
     */
    private function source(string $name): string {
        $contents = file_get_contents(dirname(__DIR__, 2) . '/js/esm/src/' . $name);
        $this->assertNotFalse($contents, "{$name} is not readable");

        return preg_replace(['#/\*.*?\*/#s', '#(?<![:/])//[^\n]*#'], '', $contents);
    }

    /**
     * A completed card draws the seal, the base and Review; its action is the outline button, every other the filled one.
     *
     * Changes that must make it fail: the action label left to the server's word for a card completed after the first
     * paint; the two button variants swapped or merged; the progress row drawn for a completed course; the seal not
     * asked for; the done class not written.
     *
     * @return void
     */
    public function test_a_completed_card_draws_the_seal_and_review(): void {
        $card = $this->source('Card.tsx');

        $this->assertStringContainsString(
            'export const isComplete = (progress: number | null): boolean => progress !== null && progress >= 100;',
            $card
        );
        $this->assertStringContainsString('const action = complete ? labels.action_review : card.actiontext;', $card);
        // A template literal's backtick is written \x60: phpcs warns on the character itself in a string.
        $this->assertStringContainsString("\x60btn btn-sm \${complete ? 'btn-outline-primary' : 'btn-primary'}\x60", $card);
        $this->assertStringContainsString('if (!showprogress || isComplete(card.progress)) {', $card);
        $this->assertStringContainsString('<StatePill row={card} labels={labels} complete={complete} />', $card);
        $this->assertStringContainsString("\${complete ? ' compass-card-done' : ''}", $card);
        foreach (['RowCard.tsx' => 'compass-card-done', 'Row.tsx' => 'compass-row-done'] as $file => $class) {
            $source = $this->source($file);
            $this->assertStringContainsString('const complete = answered && isComplete(detail.progress);', $source, $file);
            $this->assertStringContainsString("\${complete ? ' {$class}' : ''}", $source, $file);
            $this->assertStringContainsString('<StatePill row={row} labels={labels} complete={complete} />', $source, $file);
        }
        $statepill = $this->source('StatePill.tsx');
        $this->assertMatchesRegularExpression(
            '/if \(complete\) \{\s*return \(\s*<span className="compass-state compass-state-done">/',
            $statepill
        );
    }

    /**
     * A card exposes one link, its stretched title, named by the course; the drawn action is out of the tab order.
     *
     * Changes that must make it fail: the action made a second tab stop or read by assistive technology; the title's
     * link no longer stretched; a tier 3 card given an action link (D5).
     *
     * @return void
     */
    public function test_a_card_exposes_one_link_named_by_the_course(): void {
        $card = $this->source('Card.tsx');
        $this->assertSame(2, preg_match_all('/<a\b/', $card), 'Card.tsx draws the title\'s link and the decorative action');
        $this->assertStringContainsString('<a href={card.url} className="compass-card-link stretched-link">', $card);
        $this->assertMatchesRegularExpression(
            '/<a\s+href=\{card\.url\}\s+className=\{\x60btn btn-sm[^>]*tabIndex=\{-1\}\s+aria-hidden="true"\s*>/s',
            $card,
            'the action is a second link a keyboard or a screen reader meets'
        );
        $rowcard = $this->source('RowCard.tsx');
        $this->assertSame(1, preg_match_all('/<a\b/', $rowcard), 'a tier 3 card has no action link (D5)');
        $this->assertStringContainsString('className="compass-row-link compass-card-link stretched-link"', $rowcard);
    }

    /**
     * Boost Union's flags reach every surface: the progress row, the cover and the list's thumbnail.
     *
     * Changes that must make it fail: a surface drawing the progress row, its skeleton or its place with the setting
     * off; a card drawing its cover, or a row its thumbnail, with the view unchecked; the coverless card losing its top
     * row.
     *
     * @return void
     */
    public function test_the_flags_reach_every_surface(): void {
        $card = $this->source('Card.tsx');
        $this->assertStringContainsString('const nocover = !config.card.cover;', $card);
        $this->assertStringContainsString('{completion(card, labels, config.card.progress)}', $card);
        $this->assertStringContainsString('{!nocover && (card.hasimage', $card);
        $this->assertStringContainsString('{nocover && <div className="compass-card-top">{kind}</div>}', $card);

        $rowcard = $this->source('RowCard.tsx');
        $this->assertStringContainsString('const nocover = !config.card.cover;', $rowcard);
        $this->assertStringContainsString('{!nocover && image}', $rowcard);
        $this->assertStringContainsString('answered && config.card.progress && !complete', $rowcard);
        $this->assertStringContainsString('enrolled && row.comp && waiting && config.card.progress', $rowcard);

        $row = $this->source('Row.tsx');
        $this->assertStringContainsString('const nothumb = !config.card.thumb;', $row);
        $this->assertStringContainsString('{!nothumb && <span className="compass-row-thumb" aria-hidden="true">', $row);
        $this->assertStringContainsString('{enrolled && row.comp && config.card.progress && waiting && (', $row);
        $this->assertStringContainsString('{enrolled && row.comp && config.card.progress && answered && !complete', $row);
    }

    /**
     * The generated image is asked for with the batches already sent, and only while the flag says so.
     *
     * Tier 1 folds its cards without an image into the details batches of its pending cards, only while covers are
     * drawn; tier 3 sends the flag with every batch of rows in view. Changes that must make it fail: tier 1 asking
     * whatever the flag, or for a coverless card; a batch sent without the flag; a failed image-only batch reported
     * as a progress failure.
     *
     * @return void
     */
    public function test_the_generated_image_rides_on_the_details_batches(): void {
        $block = $this->source('Block.tsx');
        $this->assertStringContainsString('const generated = config.card.generated && config.card.cover;', $block);
        $this->assertStringContainsString(
            'const imageless = generated ? cards.filter((card) => !card.hasimage).map((card) => card.id) : [];',
            $block
        );
        $this->assertStringContainsString('ids: Array.from(new Set([...pending, ...imageless]))', $block);
        $this->assertStringContainsString('answer = await getCardDetails(batch, generated);', $block);
        $this->assertStringContainsString('if (seq.current === mine && left.length) {', $block);
        $this->assertStringContainsString(
            '...(!card.hasimage && detail.hasimage ? {imageurl: detail.imageurl, hasimage: true} : {}),',
            $block
        );

        $rows = $this->source('rowdetails.ts');
        $this->assertStringContainsString('const answer = await getCardDetails(batch, generated);', $rows);
        $this->assertStringContainsString('const details = useRowDetails(config.card.generated);', $this->source('Explore.tsx'));
        $this->assertStringContainsString(
            "read<{details: CardDetail[]}>('block_compass_get_card_details', {courseids, generated});",
            $this->source('repository.ts')
        );
    }

    /**
     * The keyboard's ring is the stretched link's, around the whole card, and the hover's transitions stop under
     * reduced motion.
     *
     * Changes that must make it fail: the ring taken off the link's pseudo-element or painted with another token;
     * the link's own outline removed rather than kept transparent; the reduced-motion rule dropped.
     *
     * @return void
     */
    public function test_the_ring_is_the_stretched_links_and_reduced_motion_stops_the_hover(): void {
        $css = preg_replace('#/\*.*?\*/#s', '', (string) file_get_contents(dirname(__DIR__, 2) . '/styles.css'));

        $this->assertMatchesRegularExpression(
            '/\.block_compass \.compass-card \.compass-card-link:focus-visible::after \{\s*'
                . 'outline: var\(--block_compass-card-focus-width\) solid var\(--block_compass-card-focus-ring\);/',
            $css,
            'the card\'s ring is not its stretched link\'s'
        );
        $this->assertMatchesRegularExpression(
            '/\.block_compass \.compass-card \.compass-card-link:focus-visible \{\s*'
                . 'outline: var\(--block_compass-card-focus-width\) solid transparent;\s*\}/',
            $css,
            'the link\'s own outline is not kept, transparent, for forced colours'
        );
        $this->assertMatchesRegularExpression(
            '/@media \(prefers-reduced-motion: reduce\) \{\s*\.block_compass \.compass-card,\s*'
                . '\.block_compass \.compass-card \.compass-card-link \{\s*transition: none;/',
            $css,
            'the card\'s transitions run under reduced motion'
        );
    }

    /**
     * A cover with no image, and an image still loading, show the cover fallback under the overlay: no hatch, so
     * Boost Union's generated image, drawn on the same primary, replaces it without a flash.
     *
     * Changes that must make it fail: the hatch brought back; the loading image or the row's thumbnail left on the
     * card's surface; the fallback or the overlay dropped from the ground.
     *
     * @return void
     */
    public function test_a_cover_without_an_image_is_the_fallback_colour(): void {
        $css = preg_replace('#/\*.*?\*/#s', '', (string) file_get_contents(dirname(__DIR__, 2) . '/styles.css'));

        $this->assertMatchesRegularExpression(
            '/\.block_compass \.compass-card-img-empty,\s*\.block_compass img\.compass-card-img,\s*'
                . '\.block_compass img\.compass-row-thumb-fill \{\s*'
                . 'background: var\(--block_compass-card-cover-overlay\), var\(--block_compass-card-cover-fallback\);\s*\}/',
            $css,
            'an empty or loading cover is not the fallback under the overlay'
        );
        $this->assertDoesNotMatchRegularExpression(
            '/\.compass-card-img-empty[^{]*\{[^}]*repeating-linear-gradient/',
            $css,
            'the grey hatch is back on an imageless cover'
        );
    }

    /**
     * The action button takes the pointer above the stretched link, so its own hover shows; a state pill keeps the
     * progress row's gap from it; a new enrolment that is not complete carries the 2 px brand edge.
     *
     * Changes that must make it fail: the button left under the link (no position, or no z-index above the link's
     * one); the pill's gap dropped; the new edge taken off or thinned, its corners left to the plain card's, or
     * written for a completed card.
     *
     * @return void
     */
    public function test_the_button_hovers_the_pill_breathes_and_new_keeps_its_edge(): void {
        $css = preg_replace('#/\*.*?\*/#s', '', (string) file_get_contents(dirname(__DIR__, 2) . '/styles.css'));

        $this->assertMatchesRegularExpression(
            '/\.block_compass \.compass-card \.compass-card-actions \.btn \{\s*position: relative;\s*z-index: 2;\s*\}/',
            $css,
            'the action button sits under the stretched link'
        );
        $this->assertMatchesRegularExpression(
            '/\.block_compass \.compass-card \.compass-state \{\s*margin-bottom: 0\.5rem;\s*\}/',
            $css,
            'the state pill touches the button below it'
        );
        $this->assertMatchesRegularExpression(
            '/\.block_compass \.compass-card\.compass-card-new \{\s*--block_compass-new-edge: 2px;\s*'
                . 'border-width: var\(--block_compass-new-edge\);\s*border-color: var\(--block_compass-accent\);\s*\}/',
            $css,
            'a new enrolment lost its brand edge'
        );
        $this->assertMatchesRegularExpression(
            '/\.block_compass \.compass-card\.compass-card-new \.compass-card-img \{\s*border-radius:\s*'
                . 'calc\(var\(--block_compass-card-radius\) - var\(--block_compass-new-edge\)\)/',
            $css,
            'the new card\'s cover keeps the plain card\'s corners'
        );
        $this->assertStringContainsString(
            "(card.isnew && !complete ? ' compass-card-new' : '')",
            $this->source('Card.tsx'),
            'tier 1 draws the new edge on a completed card'
        );
        $rowcard = $this->source('RowCard.tsx');
        $this->assertStringContainsString('const isnew = row.new && !complete;', $rowcard, 'tier 3 calls a completed card new');
        $this->assertStringContainsString("(isnew ? ' compass-card-new' : '')", $rowcard, 'tier 3 draws no new edge');
    }

    /**
     * A card's title keeps no underline at rest in dark mode, and the hover and the keyboard's focus underline it.
     *
     * Core's dark mode underlines every link of #region-main at (1,6,1), read here from core's own stylesheet, and a
     * plugin's sheet is compiled before the theme's, so the card's two rules must outweigh it outright.
     *
     * Changes that must make it fail: the dark rest rule dropped or made lighter; the hover or focus twin dropped.
     *
     * @return void
     */
    public function test_the_card_title_outranks_cores_dark_underline(): void {
        global $CFG;

        $core = (string) file_get_contents($CFG->dirroot . '/theme/boost/scss/moodle/dark.scss');
        $link = 'a:not(.btn):not(.nav-link):not(.dropdown-item):not(.list-group-item):not(.page-link)';
        $this->assertStringContainsString(
            $link . " {\n            text-decoration: underline;",
            $core,
            "Precondition: core's rule, as read on 5.3."
        );
        $cores = self::specificity('[data-bs-theme="dark"] #region-main ' . $link);
        $this->assertSame([1, 6, 1], $cores, 'The helper reads core\'s weight as a browser does.');

        $css = preg_replace('#/\*.*?\*/#s', '', (string) file_get_contents(dirname(__DIR__, 2) . '/styles.css'));
        $card = '#region-main .block_compass .compass-card.card';
        $link = ' a.compass-card-link[href]:not(.btn)';
        $scopes = ['body[data-bs-theme="dark"] ', '[data-bs-theme="dark"] body '];
        [$onbody, $underhtml] = $scopes;
        $rest = $underhtml . $card . $link;
        $hover = $underhtml . $card . ':hover' . $link;
        $focus = $underhtml . $card . $link . ':focus-visible';
        $q = static fn(string $s): string => preg_quote($s, '~');
        $this->assertMatchesRegularExpression(
            '~^' . $q($onbody . $card . $link) . ',\s*' . $q($rest) . ' \{\s*text-decoration: none;\s*\}\s*'
                . $q($onbody . $card . ':hover' . $link) . ',\s*' . $q($hover) . ',\s*'
                . $q($onbody . $card . $link . ':focus-visible') . ',\s*' . $q($focus)
                . ' \{\s*text-decoration: underline;\s*\}~m',
            $css
        );
        foreach ([$onbody . $card . $link, $rest] as $scoped) {
            $weight = self::specificity($scoped);
            $this->assertGreaterThan(0, $weight <=> $cores, 'The title at rest must outweigh core: ' . implode(',', $weight));
        }
        $atrest = self::specificity($rest);
        $this->assertGreaterThan(0, $atrest <=> $cores, 'The title at rest must outweigh core: ' . implode(',', $atrest));
        foreach ([$hover, $focus] as $state) {
            $weight = self::specificity($state);
            $this->assertGreaterThan(0, $weight <=> $atrest, 'Hover and focus must outweigh the rest: ' . implode(',', $weight));
        }
    }

    /**
     * A selector's specificity, as a browser counts it: ids, classes with attributes and pseudo-classes, types.
     *
     * Enough for the selectors this test reads: a :not() counts its argument, a pseudo-element is not written.
     *
     * @param string $selector One selector, no comma.
     * @return array The three counts, ids first.
     */
    private static function specificity(string $selector): array {
        $total = [0, 0, 0];
        while (preg_match('~:not\(([^()]*)\)~', $selector, $not)) {
            $inner = self::specificity($not[1]);
            foreach ($inner as $i => $count) {
                $total[$i] += $count;
            }
            $selector = str_replace($not[0], ' ', $selector);
        }
        $selector = (string) preg_replace('~\[[^\]]*\]~', ' .attr ', $selector);
        $total[0] += preg_match_all('~#[\w-]+~', $selector);
        $total[1] += preg_match_all('~\.[\w-]+|:(?!:)[\w-]+~', $selector);
        $total[2] += preg_match_all('/(?:^|[\s>+~])([a-z][\w-]*)/i', $selector);

        return $total;
    }

    /**
     * Slot 2 holds the course's kind before New on both views of tier 3 (ADR-021 decision 2.4, answer 8), each the
     * light chip of the contract; the list view's New is that chip too, no longer a Bootstrap badge. On the list the
     * chips lead the row's second line (ADR-026), each with its word in a title, since a narrow line cuts it.
     *
     * Changes that must make it fail: New drawn before the kind on the cards or on the list; the list view's chips
     * drawn as a badge again; the cards' two chips outside their row.
     *
     * @return void
     */
    public function test_slot_two_draws_the_kind_before_new(): void {
        $card = $this->source('RowCard.tsx');
        $this->assertMatchesRegularExpression(
            '#<span className="compass-card-kinds">\s*<span className="compass-card-kind">\s*'
                . '\{named\.icon !== undefined && <i className=\{\x60fa \$\{named\.icon\}\x60\} aria-hidden="true"></i>\}\s*'
                . '\{named\.name\}\s*</span>\s*'
                . '\{isnew && <span className="compass-card-kind">\{labels\.badge_new\}</span>\}\s*</span>#',
            $card,
            'the cards do not draw the kind, its icon before its word, then New, in one row'
        );
        $row = $this->source('Row.tsx');
        $kind = strpos($row, '<span className="compass-card-kind compass-row-chip" title={kind.name}>');
        $new = strpos(
            $row,
            '{row.new && <span className="compass-card-kind compass-row-chip" title={labels.badge_new}>{labels.badge_new}</span>}'
        );
        $this->assertNotFalse($kind, 'the list view draws no kind chip');
        $this->assertNotFalse($new, 'the list view does not draw New as the chip');
        $this->assertLessThan($new, $kind, 'the list view draws New before the kind');
        $this->assertStringNotContainsString('badge bg-primary', $row);
    }

    /**
     * The kind's icon (ADR-029) comes from the listener alone and is drawn before the kind's word on both views,
     * decorative, as the Design System's status label draws one (D59); New draws none, being no kind.
     *
     * Changes that must make it fail: an icon drawn without a listener's, or after the word; the icon read by the
     * screen reader; the list's chip losing its icon; New given an icon.
     *
     * @return void
     */
    public function test_the_kind_draws_its_listeners_icon_before_its_word(): void {
        $icon = '#\{(named|kind)\.icon !== undefined && <i className=\{\x60fa \$\{\1\.icon\}\x60\} aria-hidden="true"></i>\}'
            . '\s*\{\1\.name\}#';
        $this->assertMatchesRegularExpression($icon, $this->source('RowCard.tsx'), 'the cards');
        $row = $this->source('Row.tsx');
        $this->assertMatchesRegularExpression(
            '#title=\{kind\.name\}>\s*' . substr($icon, 1),
            $row,
            'the list row'
        );
        foreach (['RowCard.tsx', 'Row.tsx'] as $file) {
            $this->assertDoesNotMatchRegularExpression('#<i[^>]*>[^<]*</i>\s*\{labels\.badge_new\}#', $this->source($file), $file);
        }
        $css = file_get_contents(dirname(__DIR__, 2) . '/styles.css');
        $this->assertMatchesRegularExpression(
            '/\.block_compass \.compass-card-kind \.fa \{\s*margin-inline-end: 4px;\s*font-size: 1em;/',
            $css,
            'the icon is the word\'s size, 4 px before it'
        );
    }

    /**
     * Slot 1's watermark (ADR-029): drawn only on a cover the batch answered with no image, the kind's icon, the
     * block's own for an ordinary course, none for a kind its listener gave none; positioned on the cover, coloured
     * by its token, never a target.
     *
     * Changes that must make it fail: the watermark drawn while the batch is out, on an image or without a cover;
     * an ordinary course given no icon, or a kind with none given the default's; the watermark taking clicks; its
     * colour a literal.
     *
     * @return void
     */
    public function test_the_watermark_marks_only_a_cover_without_an_image(): void {
        $card = $this->source('RowCard.tsx');
        $this->assertMatchesRegularExpression(
            '/if \(!nocover && !waiting && detail !== undefined && !detail\.hasimage\) \{\s*'
                . 'watermark = row\.kd === undefined \? DEFAULT_KIND_ICON : named\?\.icon;\s*\}/',
            $card
        );
        $this->assertStringContainsString(
            "{watermark !== undefined && <i className={\x60fa \${watermark} compass-card-watermark\x60} aria-hidden=\"true\"></i>}",
            $card
        );
        $this->assertSame(1, substr_count($card, 'watermark = '), 'the watermark is decided in one place');
        $this->assertStringContainsString(
            "export const DEFAULT_KIND_ICON = 'fa-graduation-cap';",
            $this->source('types.ts')
        );
        $this->assertStringNotContainsString('watermark', $this->source('Card.tsx'), 'tier 1 waits (answer 4)');
        $this->assertStringNotContainsString('watermark', $this->source('Row.tsx'), 'no watermark on a thumbnail (answer 5)');
        $css = file_get_contents(dirname(__DIR__, 2) . '/styles.css');
        $this->assertMatchesRegularExpression(
            '/\.block_compass \.compass-card \.compass-card-watermark \{[^}]*'
                . 'color: var\(--block_compass-card-watermark\);[^}]*pointer-events: none;[^}]*\}/',
            $css
        );
        $this->assertStringContainsString(
            '--block_compass-card-watermark: var(--dimensions-card-watermark, rgba(255, 255, 255, 0.16));',
            $css
        );
    }

    /**
     * A dated kind's dates (ADR-029) are slot 7 on a card, after the title and before slot 8, and come after the chips
     * on a list row; one line each, cut with an ellipsis and whole in the title; the row's give way after the date of
     * the last access and before the bar.
     *
     * Changes that must make it fail: the line drawn before the title or after slot 8; the title attribute dropped;
     * the row's dates drawn before the chips; their shrink weight put at or above the last access's, or at or below
     * the bar's.
     *
     * @return void
     */
    public function test_a_dated_kind_states_its_dates_as_slot_seven(): void {
        $card = $this->source('RowCard.tsx');
        $line = '<p className="compass-card-meta compass-card-oneline mb-2" title={row.ev}>{row.ev}</p>';
        $this->assertStringContainsString('{row.ev !== undefined && (', $card);
        $title = strpos($card, '</Title>');
        $meta = strpos($card, $line);
        $extra = strpos($card, 'compass-card-extra mb-2');
        $this->assertNotFalse($meta, 'the cards state no dates');
        $this->assertLessThan($meta, $title, 'the dates come after the title');
        $this->assertLessThan($extra, $meta, 'the dates come before slot 8');

        $row = $this->source('Row.tsx');
        $date = strpos($row, '<span className="compass-row-ev small text-muted" title={row.ev}>{row.ev}</span>');
        $chip = strpos($row, 'compass-card-kind compass-row-chip" title={kind.name}');
        $this->assertNotFalse($date, 'the list row states no dates');
        $this->assertLessThan($date, $chip, 'the dates come after the kind\'s chip');

        $css = file_get_contents(dirname(__DIR__, 2) . '/styles.css');
        $weight = static function (string $selector) use ($css): int {
            preg_match('/' . preg_quote($selector, '/') . '[^{]*\{[^}]*flex: 0 (\d+) /', $css, $m);

            return (int) ($m[1] ?? 0);
        };
        $ev = $weight('.block_compass .compass-row-line .compass-row-ev');
        $this->assertGreaterThan(0, $ev, 'the row\'s dates do not give way');
        $this->assertLessThan($weight('.block_compass .compass-row-line .compass-row-nocompletion'), $ev);
        $this->assertGreaterThan($weight('.block_compass .compass-row-line .compass-row-progress'), $ev);
    }

    /**
     * With no kind to draw - no listener, so no kinds; the default kind, so no kd; an index the held list lacks - every
     * card and row is as it was before kinds: New alone, the same element. Tier 1's card does not read kinds (answer 11).
     *
     * Changes that must make it fail: the cards' row of chips drawn for New alone; a row's kind read with a fallback
     * that names a kind; tier 1's card given the kind.
     *
     * @return void
     */
    public function test_nothing_is_drawn_without_a_kind(): void {
        $card = $this->source('RowCard.tsx');
        $this->assertStringContainsString(
            'let kind = isnew ? <span className="compass-card-kind">{labels.badge_new}</span> : null;',
            $card
        );
        $this->assertStringContainsString(
            'const named: RowKind | undefined = row.kd === undefined ? undefined : kinds[row.kd];',
            $card
        );
        $this->assertMatchesRegularExpression(
            '/if \(named !== undefined\) \{\s*kind = \(\s*<span className="compass-card-kinds">/',
            $card
        );
        $this->assertSame(1, substr_count($card, 'compass-card-kinds'), 'the chips\' row is drawn in more than one place');
        $this->assertStringContainsString(
            'const kind: RowKind | undefined = row.kd === undefined ? undefined : kinds[row.kd];',
            $this->source('Row.tsx')
        );
        $tier1 = $this->source('Card.tsx');
        $this->assertStringContainsString('compass-card-kind', $tier1, 'vacuity: tier 1\'s card draws its New chip');
        $this->assertStringNotContainsString('kinds', $tier1);
        $this->assertStringNotContainsString('.kd', $tier1);
    }

    /**
     * A list row's markup in the order the reader meets it (ADR-026): the name's link holding the name alone, then the
     * second line, then the controls; nothing on the second line can take the focus, so the focus goes name, star,
     * archive, as the eye does along the first line, where the grid puts them.
     *
     * Changes that must make it fail: the chips or anything else put back inside the name's link; the controls drawn
     * before the second line, or a control or a link drawn on it; the star or the archive control drawn outside the
     * controls' cell.
     *
     * @return void
     */
    public function test_a_list_row_reads_name_then_line_then_controls(): void {
        $row = $this->source('Row.tsx');
        $this->assertMatchesRegularExpression(
            '#<a href=\{url\} className="compass-row-link text-reset text-decoration-none">\s*'
                . '<span className="compass-row-name" title=\{row\.name\}>\{row\.name\}</span>\s*</a>#',
            $row,
            'the name\'s link holds more than the name'
        );
        $link = strpos($row, 'className="compass-row-link');
        $line = strpos($row, '<div className="compass-row-line">');
        $controls = strpos($row, '<span className="compass-row-controls">');
        $this->assertNotFalse($line, 'the row draws no second line');
        $this->assertNotFalse($controls, 'the row draws no controls\' cell');
        $this->assertLessThan($line, $link, 'the second line comes before the name');
        $this->assertLessThan($controls, $line, 'the controls come before the second line');
        $second = substr($row, $line, $controls - $line);
        foreach (['<a ', '<button', '<Star', '<Archive', 'tabIndex', 'href='] as $focusable) {
            $this->assertStringNotContainsString($focusable, $second, "the second line draws a focusable {$focusable}");
        }
        $after = substr($row, $controls);
        $this->assertStringContainsString('<Star', $after, 'the star is not in the controls\' cell');
        $this->assertStringContainsString('<Archive', $after, 'the archive control is not in the controls\' cell');
        $this->assertSame(1, substr_count($row, '<Star'), 'the row draws a second star');
        $this->assertSame(1, substr_count($row, '<Archive'), 'the row draws a second archive control');
        $this->assertStringNotContainsString('compass-clamp', $row, 'a row\'s text clamps to two lines again');
    }

    /**
     * The bar's place on a list row holds something or is not drawn (ADR-026): the skeleton while the batch is out,
     * then the bar for a known percentage below 100; a completed row draws its label and keeps no room for a bar.
     *
     * Changes that must make it fail: the bar's place drawn whatever the batch says (the slot the row reserved before),
     * or drawn for a completed course.
     *
     * @return void
     */
    public function test_a_list_row_reserves_no_place_for_a_bar_it_will_not_draw(): void {
        $row = $this->source('Row.tsx');
        $this->assertSame(
            2,
            substr_count($row, '<div className="compass-row-progress">'),
            'the bar\'s place is drawn other than for the skeleton and the bar'
        );
        $this->assertMatchesRegularExpression(
            '#\{enrolled && row\.comp && config\.card\.progress && waiting && \(\s*<div className="compass-row-progress">\s*'
                . '<span className="compass-skeleton compass-skeleton-progress" aria-hidden="true"></span>\s*</div>\s*\)\}#',
            $row,
            'the skeleton\'s place is not drawn only while the batch is out'
        );
        $this->assertMatchesRegularExpression(
            '#\{enrolled && row\.comp && config\.card\.progress && answered && !complete && detail\.hascompletion\s*'
                . '&& detail\.progress !== null && \(\s*<div className="compass-row-progress">\s*<Progress #',
            $row,
            'the bar\'s place is drawn without a bar, or for a completed course'
        );
    }

    /**
     * A list row draws one crest, the first the theme answered, with no "+N", named by its own alternative text and
     * not by the list's name; the cards keep the whole list (ADR-026).
     *
     * Changes that must make it fail: the row's crests drawn as the whole list again, or as a list of one named
     * "Crests"; a "+N" for the others; the row no longer asking for the inline crest.
     *
     * @return void
     */
    public function test_a_list_row_draws_one_crest(): void {
        $crests = $this->source('Crests.tsx');
        $this->assertMatchesRegularExpression(
            '#if \(inline\) \{\s*const \[first\] = badges;\s*return \(\s*<span className="compass-crests compass-crests-inline">\s*'
                . '<img src=\{first\.url\} alt=\{first\.alt\} loading="lazy" />\s*</span>\s*\);\s*\}#',
            $crests,
            'the inline crest is not the first crest alone'
        );
        $this->assertSame(1, substr_count($crests, 'badges.map('), 'the crests are listed in more than one place');
        $this->assertStringNotContainsString('compass-crests-inline" role=', $crests, 'the row\'s crest is a list again');
        $this->assertSame(2, substr_count($crests, '<img '), 'the crests are drawn in a third place, a "+N" or another');
        $this->assertStringContainsString(
            '<Crests badges={detail?.badges} label={labels.crests} inline />',
            $this->source('Row.tsx')
        );
        foreach (['Card.tsx', 'RowCard.tsx'] as $file) {
            $this->assertMatchesRegularExpression(
                '#<Crests badges=\{[^}]+\} label=\{labels\.crests\} />#',
                $this->source($file),
                "{$file} no longer draws the whole list"
            );
        }
    }
}
