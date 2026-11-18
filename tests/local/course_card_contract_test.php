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
 * Tests for the course card contract shared by the Dimensions family of plugins.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

use PHPUnit\Framework\Attributes\CoversNothing;

/**
 * Pins the shared course card contract in this plugin's files.
 *
 * theme_dimensions, block_compass and local_dimensions each draw course cards with their own markup and
 * stylesheet, and none depends on another to draw one. The contract keeps the cards alike: each plugin
 * declares the card tokens under its own prefix and reads the family token (--dimensions-card-*) first, so
 * the theme can restyle every card at once; only the theme declares the family tokens; a card rule paints
 * through tokens, sets no label in capitals and moves nothing on hover; the kind pill carries its icon and the
 * cover its watermark, each painted by its token; and the plugin reads Boost Union's course overview settings and
 * its README names them.
 *
 * The class is copied between plugins: only the namespace, the package and copyright tags and the
 * constants above the first method change. It reads files only, so it runs wherever the PHPUnit suite
 * runs. A card rule is an innermost CSS block whose selector names CARD_ROOT; in a nested SCSS source,
 * name the root in each card rule's own selector, or the rule is not seen.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversNothing]
final class course_card_contract_test extends \basic_testcase {
    /** @var string The plugin's own prefix for the card tokens, for example '--block_compass-card-'. */
    private const TOKEN_PREFIX = '--block_compass-card-';

    /** @var string The card root class as it appears in a selector, for example '.compass-card'. */
    private const CARD_ROOT = '.compass-card';

    /** @var array The stylesheets holding the card rules, relative to the plugin root. */
    private const STYLESHEETS = ['styles.css'];

    /** @var array The files that read Boost Union's settings, relative to the plugin root. */
    private const SOURCES = ['classes/local/card_settings.php'];

    /** @var bool True in theme_dimensions only: the one plugin that declares --dimensions-card-* names. */
    private const PROVIDER = false;

    /**
     * @var string The class of the kind pill (slot 2) as written in the markup, for example 'compass-card-kind';
     *     '' while the plugin draws no kind, and then KIND_SOURCES is empty too.
     */
    private const KIND_CLASS = 'compass-card-kind';

    /** @var array The markup sources that draw the card's cover and kind pill, relative to the plugin root. */
    private const KIND_SOURCES = ['js/esm/src/RowCard.tsx', 'js/esm/src/Row.tsx'];

    /**
     * @var string The class of the cover's watermark (slot 1), for example 'compass-card-watermark'; '' while the
     *     plugin draws none, a gap the contract records and this constant keeps in sight.
     */
    private const WATERMARK_CLASS = 'compass-card-watermark';

    /** @var array Every token suffix of the card contract. */
    private const SUFFIXES = [
        'radius', 'border-width', 'border', 'surface', 'ink', 'ink-muted', 'title-hover', 'cover-height',
        'cover-fallback', 'cover-overlay', 'chip-bg', 'chip-ink', 'extra-bg', 'extra-icon', 'track', 'fill',
        'track-height', 'done', 'done-bg', 'done-ink', 'done-edge', 'shadow', 'shadow-hover', 'focus-ring',
        'focus-width', 'locked-opacity', 'close-bg', 'close-bg-hover', 'close-edge', 'transition', 'watermark',
    ];

    /** @var array Boost Union's settings the card contract reads. */
    private const BOOST_UNION_SETTINGS = [
        'courseoverviewshowcourseprogress',
        'courseoverviewimagesource',
        'courseoverviewshowcourseimages',
    ];

    /**
     * A file of the plugin, read whole.
     *
     * @param string $path Relative to the plugin root.
     * @return string The contents.
     */
    private function read(string $path): string {
        $file = dirname(__DIR__, 2) . '/' . $path;
        $this->assertFileIsReadable($file);
        return (string) file_get_contents($file);
    }

    /**
     * The stylesheets, block comments and SCSS line comments removed.
     *
     * A line comment starts a line or follows a space, so a URL's "//" is kept.
     *
     * @return string The CSS.
     */
    private function css(): string {
        $css = '';
        foreach (self::STYLESHEETS as $path) {
            $css .= $this->read($path) . "\n";
        }
        $css = (string) preg_replace('~/\*.*?\*/~s', '', $css);
        return (string) preg_replace('~(^|\s)//[^\n]*~m', '$1', $css);
    }

    /**
     * The card rules: innermost blocks whose selector names the card root.
     *
     * @return array List of [selector, body] pairs; never empty, or the other arms prove nothing.
     */
    private function card_rules(): array {
        preg_match_all('~([^{}]+)\{([^{}]*)\}~', $this->css(), $matches, PREG_SET_ORDER);
        $rules = [];
        foreach ($matches as $match) {
            if (str_contains($match[1], self::CARD_ROOT)) {
                $rules[] = [trim($match[1]), $match[2]];
            }
        }
        $this->assertNotEmpty($rules, 'No card rule names ' . self::CARD_ROOT . ': check the constants.');
        return $rules;
    }

    /**
     * Every token of the contract is declared under the plugin's prefix and reads the family token first.
     *
     * @return void
     */
    public function test_every_contract_token_reads_the_family_token_first(): void {
        $css = $this->css();
        foreach (self::SUFFIXES as $suffix) {
            $pattern = '~' . preg_quote(self::TOKEN_PREFIX . $suffix, '~') . '\s*:\s*([^;]+);~';
            preg_match_all($pattern, $css, $values);
            $this->assertNotEmpty($values[1], self::TOKEN_PREFIX . $suffix . ' is not declared.');
            foreach ($values[1] as $value) {
                $this->assertMatchesRegularExpression(
                    '~^var\(--dimensions-card-' . preg_quote($suffix, '~') . '\s*[,)]~',
                    trim($value),
                    self::TOKEN_PREFIX . $suffix . ' must read --dimensions-card-' . $suffix . ' first.'
                );
            }
        }
    }

    /**
     * Only the theme declares the family's card tokens.
     *
     * @return void
     */
    public function test_only_the_theme_declares_family_card_tokens(): void {
        if (self::PROVIDER) {
            $this->assertMatchesRegularExpression('~--dimensions-card-[a-z-]+\s*:~', $this->css());
            return;
        }
        $this->assertDoesNotMatchRegularExpression('~--dimensions-card-[a-z-]+\s*:~', $this->css());
    }

    /**
     * No card label is set in capital letters.
     *
     * @return void
     */
    public function test_no_card_rule_sets_uppercase(): void {
        foreach ($this->card_rules() as [$selector, $body]) {
            $this->assertDoesNotMatchRegularExpression('~text-transform\s*:\s*uppercase~i', $body, $selector);
        }
    }

    /**
     * A hover changes the shadow and the title's underline, and moves nothing.
     *
     * @return void
     */
    public function test_no_card_hover_moves_anything(): void {
        $hovers = 0;
        foreach ($this->card_rules() as [$selector, $body]) {
            if (!str_contains($selector, ':hover')) {
                continue;
            }
            $hovers++;
            $this->assertDoesNotMatchRegularExpression('~(^|[;\s])(transform|translate|scale)\s*:~', $body, $selector);
        }
        $this->assertGreaterThan(0, $hovers, 'No card :hover rule: the card has lost its hover.');
    }

    /**
     * A card rule paints through tokens: a colour literal lives only in a custom property's declaration.
     *
     * The scan covers the rules naming the card root and every rule that paints with a card token
     * outside it: the state pills (the seal, Hidden from students) and the row's chips draw with the
     * card's pairs without naming .compass-card, and a literal beside a card token there escapes the
     * theme as surely as one inside the card.
     *
     * @return void
     */
    public function test_card_rules_have_no_colour_literal(): void {
        $rules = $this->card_rules();
        $tokened = 0;
        preg_match_all('~([^{}]+)\{([^{}]*)\}~', $this->css(), $matches, PREG_SET_ORDER);
        foreach ($matches as $match) {
            if (!str_contains($match[1], self::CARD_ROOT) && str_contains($match[2], 'var(' . self::TOKEN_PREFIX)) {
                $rules[] = [trim($match[1]), $match[2]];
                $tokened++;
            }
        }
        // Vacuity guard: the pills outside the card root were found.
        $this->assertGreaterThan(0, $tokened, 'No rule outside the card root paints with a card token.');
        foreach ($rules as [$selector, $body]) {
            $plain = (string) preg_replace('~--[a-zA-Z0-9_-]+\s*:[^;]*;?~', '', $body);
            $this->assertDoesNotMatchRegularExpression('~#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?)\(~', $plain, $selector);
        }
    }

    /**
     * The kind pill (slot 2) carries an icon before its word: in every source that draws the pill, an opening tag
     * carrying the kind class is followed by an element whose class names Font Awesome (`fa`), whatever guards it.
     *
     * One such pill per source is asked, not every one: a plugin may draw another label in the pill's look (the
     * compass's *New*), which is no kind and has no icon. A plugin that draws no kind says so with an empty
     * KIND_CLASS and KIND_SOURCES.
     *
     * @return void
     */
    public function test_the_kind_pill_draws_an_icon_before_its_word(): void {
        if (self::KIND_CLASS === '') {
            $this->assertSame([], self::KIND_SOURCES, 'A plugin that draws no kind names no source for it.');
            return;
        }
        $this->assertNotEmpty(self::KIND_SOURCES, 'Name the sources that draw the kind pill.');
        $pill = '~<[a-z]+\s[^>]*class(Name)?="[^"]*\b' . preg_quote(self::KIND_CLASS, '~') . '\b[^"]*"[^>]*>\s*'
            . '(\{[^<]*)?<i\s[^>]*class(Name)?=[^>]*\bfa\b~';
        $drawn = 0;
        foreach (self::KIND_SOURCES as $path) {
            $source = $this->read($path);
            if (!str_contains($source, self::KIND_CLASS)) {
                continue;
            }
            $drawn++;
            $this->assertMatchesRegularExpression($pill, $source, $path . ' draws the kind pill without its icon.');
        }
        $this->assertGreaterThan(0, $drawn, 'No source draws ' . self::KIND_CLASS . ': check the constants.');
    }

    /**
     * The cover's watermark (slot 1): a source of the card draws it, and a card rule paints it with the watermark
     * token. A plugin that draws none says so with an empty WATERMARK_CLASS.
     *
     * @return void
     */
    public function test_the_cover_draws_its_watermark_through_its_token(): void {
        if (self::WATERMARK_CLASS === '') {
            $this->assertSame('', self::WATERMARK_CLASS, 'This plugin draws no watermark yet (contract slot 1).');
            return;
        }
        $drawn = false;
        foreach (self::KIND_SOURCES as $path) {
            $drawn = $drawn || str_contains($this->read($path), self::WATERMARK_CLASS);
        }
        $this->assertTrue($drawn, 'No source draws ' . self::WATERMARK_CLASS . '.');
        $painted = false;
        foreach ($this->card_rules() as [$selector, $body]) {
            if (str_contains($selector, '.' . self::WATERMARK_CLASS)) {
                $painted = $painted || str_contains($body, 'var(' . self::TOKEN_PREFIX . 'watermark)');
            }
        }
        $this->assertTrue($painted, 'No card rule paints .' . self::WATERMARK_CLASS . ' with the watermark token.');
    }

    /**
     * The plugin reads Boost Union's card settings on the server.
     *
     * @return void
     */
    public function test_sources_read_boost_union_settings(): void {
        $sources = '';
        foreach (self::SOURCES as $path) {
            $sources .= $this->read($path);
        }
        foreach (self::BOOST_UNION_SETTINGS as $setting) {
            $this->assertStringContainsString("'" . $setting . "'", $sources, $setting . ' is never read.');
        }
    }

    /**
     * The README tells an administrator which Boost Union settings change the cards.
     *
     * @return void
     */
    public function test_readme_names_boost_union_settings(): void {
        $readme = $this->read('README.md');
        foreach (self::BOOST_UNION_SETTINGS as $setting) {
            $this->assertStringContainsString($setting, $readme, 'README.md does not explain ' . $setting . '.');
        }
    }
}
