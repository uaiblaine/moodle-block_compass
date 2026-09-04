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
 * The search matching rule paged mode shares with the browser.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use core_text;
use Normalizer;

/**
 * PHP twin of amd/src/filter.js's normalise() and matches() (ADR-004, fact 5).
 *
 * Full mode matches in the browser; paged mode matches here, over the raw course
 * names of the entry. The two must agree bit for bit, so this class reproduces
 * the JavaScript rule step by step rather than reaching for
 * core_text::specialtoascii() — ICU's "Any-Latin; Latin-ASCII" transliteration,
 * which also folds letters that have no canonical decomposition (ø, ß, æ, ł)
 * where NFD leaves them alone — or for the database collation, which cannot be
 * accent-insensitive on PostgreSQL. A PHPUnit fixture of query/name pairs pins
 * the parity from the PHP side; the same pairs pin filter.js.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class matcher {
    /**
     * Lower-case, accent-free, trimmed form of a string — filter.js normalise().
     *
     * The four steps in the JavaScript order: canonical decomposition (NFD, what
     * String.prototype.normalize('NFD') does in the client) through the intl
     * extension's Normalizer — Moodle 5.2 requires intl (admin/environment.xml:5402,
     * PHP_EXTENSION name="intl" level="required"); removal of the combining
     * diacritical marks U+0300–U+036F; lower-casing through core_text::strtolower()
     * (lib/classes/text.php:237, mb_strtolower under the hood); and a trim that, like the word
     * split below, covers Unicode's separators rather than PHP's ASCII-only trim().
     *
     * @param string $text Input.
     * @return string
     */
    public static function normalise(string $text): string {
        // Normalizer::normalize() returns false for a string that is not valid UTF-8, and
        // preg_replace() null for the same reason: such a name is matched as typed, not dropped.
        $decomposed = Normalizer::normalize($text, Normalizer::FORM_D);
        if ($decomposed === false) {
            $decomposed = $text;
        }
        $stripped = preg_replace('/[\x{0300}-\x{036f}]/u', '', $decomposed) ?? $decomposed;

        $lowered = core_text::strtolower($stripped);

        return preg_replace('/^[\s\p{Z}]+|[\s\p{Z}]+$/u', '', $lowered) ?? $lowered;
    }

    /**
     * Whether every word of the query appears in the normalised haystack — filter.js matches().
     *
     * The query is normalised and split on whitespace: PCRE's \s stays ASCII-only under a plain
     * /u (that sets PCRE2_UTF, not PCRE2_UCP), while JavaScript's \s includes U+00A0 and the
     * rest of Unicode's separators, so the class here is [\s\p{Z}] — a query pasted from a page
     * or a document, where words are joined by a no-break space, must match the same courses on
     * both sides. Empty words are dropped; every
     * remaining word must be a substring of the haystack, in any order. The haystack is
     * expected normalised already, so a name is normalised once however many words the query
     * has. A query with no words matches nothing: the client never sends one, and "everything
     * matches" is not an answer a search should give.
     *
     * @param string $haystack Normalised text to search (see normalise()).
     * @param string $query Raw query.
     * @return bool
     */
    public static function matches(string $haystack, string $query): bool {
        $words = preg_split('/[\s\p{Z}]+/u', self::normalise($query), -1, PREG_SPLIT_NO_EMPTY);
        if (empty($words)) {
            return false;
        }
        foreach ($words as $word) {
            if (!str_contains($haystack, $word)) {
                return false;
            }
        }

        return true;
    }
}
