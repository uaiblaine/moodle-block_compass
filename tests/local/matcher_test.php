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
 * Tests for the search matching rule paged mode shares with the browser.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use basic_testcase;
use block_compass_generator;
use core\test\testing_util;
use core_text;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * The PHP twin of amd/src/filter.js, pinned step by step (ADR-004, fact 5).
 *
 * Full mode matches in the browser and paged mode matches here, so the two rules
 * must agree bit for bit. The cases that matter most are the ones where the
 * obvious PHP shortcut disagrees with the browser: NFD leaves ø and ß alone
 * because neither has a canonical decomposition, while core_text::specialtoascii()
 * folds them — a server using it would find "Strøm" for "strom" when the browser
 * does not. The query/name pairs come from the plugin generator so explore_test
 * can ask explore::search() the same questions over real courses.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(matcher::class)]
final class matcher_test extends basic_testcase {
    /**
     * Inputs to normalise() and the string it must produce.
     *
     * @return array Case name => [input, normalised form].
     */
    public static function normalise_provider(): array {
        return [
            'lower-cases' => ['ÉCOLE', 'ecole'],
            'strips diacritics' => ['Ação', 'acao'],
            'strips diacritics inside a phrase' => ['Curso Sensível', 'curso sensivel'],
            'trims both ends' => ["  padded \t", 'padded'],
            'keeps inner whitespace runs (matches() splits them)' => ['a  b', 'a  b'],
            'keeps o-slash: no canonical decomposition' => ['Strøm', 'strøm'],
            'keeps sharp s: no canonical decomposition' => ['straße', 'straße'],
            'a mark already decomposed is removed' => ["e\u{0301}", 'e'],
            'precomposed and decomposed agree' => ["\u{00E9}", 'e'],
            'empty stays empty' => ['', ''],
            'digits and punctuation untouched' => ['Math 101 - Part 2', 'math 101 - part 2'],
        ];
    }

    /**
     * The four steps of filter.js normalise(), in order: NFD, strip U+0300-U+036F, lower-case, trim.
     *
     * @param string $input The text.
     * @param string $expected Its normalised form.
     * @return void
     */
    #[DataProvider('normalise_provider')]
    public function test_normalise_reproduces_the_client_rule(string $input, string $expected): void {
        $this->assertSame($expected, matcher::normalise($input));
        // Idempotent: normalising a normalised string changes nothing, as in the browser.
        $this->assertSame($expected, matcher::normalise($expected));
    }

    /**
     * The rule is canonical decomposition, not transliteration.
     *
     * The control is the shortcut ADR-004 rejects: core_text::specialtoascii() folds ø, so a
     * matcher built on it would pass every plain fixture and still disagree with the browser on
     * every Nordic name. The two outputs must differ here or the fixture proves nothing.
     *
     * @return void
     */
    public function test_the_rule_is_nfd_and_not_the_transliterator(): void {
        $normalised = matcher::normalise('Strøm');

        $this->assertSame('strøm', $normalised);
        $this->assertStringContainsString('ø', $normalised);
        // Control: the transliterator does fold it, which is why it is not the rule.
        $this->assertStringNotContainsString('ø', core_text::specialtoascii('Strøm'));
    }

    /**
     * The shared query/name fixture, from the generator that owns it.
     *
     * @return array Case name => [query, course name, whether it matches].
     */
    public static function pairs_provider(): array {
        // Loading the plugin generator is what defines the class; no database is touched.
        testing_util::get_data_generator()->get_plugin_generator('block_compass');

        return block_compass_generator::search_pairs();
    }

    /**
     * matches() answers every pair of the shared fixture the way filter.js does.
     *
     * The name is normalised once, as the caller is expected to do; the query is raw, as the
     * browser's is.
     *
     * @param string $query The raw query.
     * @param string $name The course name, as stored.
     * @param bool $expected Whether the course matches.
     * @return void
     */
    #[DataProvider('pairs_provider')]
    public function test_matches_agrees_with_the_shared_fixture(string $query, string $name, bool $expected): void {
        $this->assertSame($expected, matcher::matches(matcher::normalise($name), $query));
    }

    /**
     * Every word must be present, in any order, and a query with no words matches nothing.
     *
     * The empty-query rule is where this deliberately departs from the JavaScript: there,
     * [].every() is true, so an empty query keeps every row visible; the client never sends
     * one to the server (it clears the search instead), and "everything matches" is not an
     * answer a search should give.
     *
     * @return void
     */
    public function test_every_word_must_be_present_and_no_words_match_nothing(): void {
        $haystack = matcher::normalise('Approach tactics for Ação');

        $this->assertTrue(matcher::matches($haystack, 'tactics approach'));
        $this->assertTrue(matcher::matches($haystack, 'acao TACTICS'));
        $this->assertTrue(matcher::matches($haystack, "  tactics \n approach  "));
        $this->assertFalse(matcher::matches($haystack, 'approach retreat'));
        $this->assertFalse(matcher::matches($haystack, ''));
        $this->assertFalse(matcher::matches($haystack, " \t\n "));
    }

    /**
     * The haystack is expected normalised already: matches() normalises the query only.
     *
     * A caller handing in a raw name would get a case-sensitive, accent-sensitive search
     * without an error, so the contract is pinned in both directions.
     *
     * @return void
     */
    public function test_the_haystack_is_expected_normalised(): void {
        $this->assertFalse(matcher::matches('Approach Tactics', 'approach'));
        $this->assertTrue(matcher::matches(matcher::normalise('Approach Tactics'), 'approach'));
        $this->assertFalse(matcher::matches('Sensível', 'sensivel'));
        $this->assertTrue(matcher::matches(matcher::normalise('Sensível'), 'sensivel'));
    }
}
