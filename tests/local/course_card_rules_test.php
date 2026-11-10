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
     * Changes that must make it fail: a surface drawing the progress row or its slot with the setting off; a card
     * drawing its cover, or a row its thumbnail, with the view unchecked; the coverless card losing its top row.
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
        $this->assertStringContainsString('{enrolled && row.comp && config.card.progress && (', $row);
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
                . 'border-width: var\(--block_compass-new-edge\);\s*border-color: var\(--block_compass-brand\);\s*\}/',
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
}
