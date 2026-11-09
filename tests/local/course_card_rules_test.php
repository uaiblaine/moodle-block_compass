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
}
