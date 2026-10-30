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
 * The shape tier 1 last settled to, per surface.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

/**
 * Reader of the block_compass_tier1 preference (ADR-018).
 *
 * One JSON object, versioned, with one member per surface (the Dashboard and the block's own page):
 * {"v": 1, "dashboard": {"strips": [["continue", 3, true]], "ghost": true, "pending": false}, "page": ...}.
 * Each strip is its name, its card count and whether any of its cards drew a completion area; then
 * whether the tier 2 ghost showed and whether the pending notice under New enrolments showed. It is
 * the layout the viewer's own browser last drew, written by the client only when it changed
 * (js/esm/src/tier1shape.ts), and the shell renders it as tier 1's skeleton before any JavaScript
 * runs. It names no course, id, title or date: the owner's ruling of 2026-10-30 (ADR-018 decision 3)
 * is that it is not course data under non-negotiable 2.
 *
 * Core's route cleans a PARAM_RAW value not at all, so the reading is where the validation is, as
 * for {@see explore_preference} and {@see calendar_preference}: the version must be this one's, or
 * neither surface is read; a surface whose strips are not a list of [name, count, completion]
 * triples of declared names, each once and in the shell's order, whose counts are not integers from
 * 1 to MAX_CARDS, or whose flags are not JSON booleans, reads as no shape, and the other surface is
 * kept. Two members follow the configuration rather than fail: the favourites strip is dropped
 * while enable_favourites is off, and the pending flag reads false while enable_pending is off, as
 * the client's settled shape has them (tier1shape.ts settledShape()), so the two agree and the
 * client does not rewrite an unchanged shape.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class tier1_preference {
    /** @var string The preference name, declared in lib.php. */
    public const NAME = 'block_compass_tier1';

    /** @var int The stored value's version; tier1shape.ts VERSION writes the same. */
    public const VERSION = 1;

    /** @var string[] The surfaces, \block_compass\output\block::SURFACE_*'s vocabulary. */
    public const SURFACES = ['dashboard', 'page'];

    /** @var string[] The strips the shell declares, in its order (\block_compass\output\block's strips). */
    public const STRIPS = ['continue', 'new', 'scheduled', 'favourites'];

    /** @var int The most cards one strip remembers: the card details batch (cards::DETAILS_BATCH, MAX_CARDS in tier1shape.ts). */
    public const MAX_CARDS = 24;

    /**
     * The current viewer's shape for one surface, validated, or null when there is none to trust.
     *
     * A preference read is allowed in the shell ({@see \block_compass\output\block::view()}): it
     * comes from the bundle get_user_preferences() loads once per request.
     *
     * @param string $surface dashboard or page.
     * @param bool|null $favouritesenabled Whether the favourites strip may be kept; null for the setting.
     * @param bool|null $pendingenabled Whether the pending flag may be kept; null for the setting.
     * @return array|null strips (a list of [name, count, completion]), ghost and pending; or null.
     */
    public static function read(string $surface, ?bool $favouritesenabled = null, ?bool $pendingenabled = null): ?array {
        return self::all($favouritesenabled, $pendingenabled)[$surface] ?? null;
    }

    /**
     * The current viewer's shapes for every surface, validated, keyed by surface.
     *
     * @param bool|null $favouritesenabled Whether the favourites strip may be kept; null for the setting.
     * @param bool|null $pendingenabled Whether the pending flag may be kept; null for the setting.
     * @return array surface => shape or null, one key per SURFACES.
     */
    public static function all(?bool $favouritesenabled = null, ?bool $pendingenabled = null): array {
        $stored = get_user_preferences(self::NAME, null);

        return self::validate(
            is_string($stored) ? $stored : null,
            $favouritesenabled ?? config::favourites_enabled(),
            $pendingenabled ?? config::pending_enabled()
        );
    }

    /**
     * Keep of a stored value what the vocabulary admits, surface by surface.
     *
     * @param string|null $json The stored JSON, or null when nothing is stored.
     * @param bool $favouritesenabled Whether the favourites strip may be kept.
     * @param bool $pendingenabled Whether the pending flag may be kept.
     * @return array surface => shape (strips, ghost, pending) or null, one key per SURFACES.
     */
    public static function validate(?string $json, bool $favouritesenabled, bool $pendingenabled): array {
        $shapes = array_fill_keys(self::SURFACES, null);
        if ($json === null || $json === '') {
            return $shapes;
        }
        $decoded = json_decode($json, true);
        // Another version is another format: neither surface is read, so the client writes this one's.
        if (!is_array($decoded) || ($decoded['v'] ?? null) !== self::VERSION) {
            return $shapes;
        }
        foreach (self::SURFACES as $surface) {
            $shapes[$surface] = self::surface($decoded[$surface] ?? null, $favouritesenabled, $pendingenabled);
        }

        return $shapes;
    }

    /**
     * One surface's member, validated whole: a member that fails anywhere is no shape.
     *
     * @param mixed $member The decoded member.
     * @param bool $favouritesenabled Whether the favourites strip may be kept.
     * @param bool $pendingenabled Whether the pending flag may be kept.
     * @return array|null strips, ghost and pending; or null.
     */
    private static function surface(mixed $member, bool $favouritesenabled, bool $pendingenabled): ?array {
        $strips = is_array($member) ? ($member['strips'] ?? null) : null;
        if (!is_array($strips) || !array_is_list($strips)) {
            return null;
        }
        if (!is_bool($member['ghost'] ?? null) || !is_bool($member['pending'] ?? null)) {
            return null;
        }
        $kept = [];
        // The position after the last strip read: a name must come after it, so each is once and in order.
        $next = 0;
        foreach ($strips as $strip) {
            if (!is_array($strip) || !array_is_list($strip) || count($strip) !== 3) {
                return null;
            }
            [$name, $cards, $completion] = $strip;
            $at = array_search($name, self::STRIPS, true);
            if ($at === false || $at < $next) {
                return null;
            }
            if (!is_int($cards) || $cards < 1 || $cards > self::MAX_CARDS || !is_bool($completion)) {
                return null;
            }
            $next = $at + 1;
            // Favourites switched off since the write: the strip no longer draws, so it is not reserved.
            if ($name === 'favourites' && !$favouritesenabled) {
                continue;
            }
            $kept[] = [$name, $cards, $completion];
        }

        return [
            'strips' => $kept,
            'ghost' => $member['ghost'],
            // The notice shows only while the feature is on.
            'pending' => $member['pending'] && $pendingenabled,
        ];
    }
}
