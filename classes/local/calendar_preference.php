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
 * The calendar strip as the viewer left it.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\local;

/**
 * Reader of the block_compass_calendar preference (ADR-014 decisions 10 and 11).
 *
 * One JSON object holds the view (studying or teaching), the item filter, the relevance switch
 * and whether the strip is open (the row of days) or closed (the line of counts, ADR-014
 * amendment 11). The client writes it through core's preference route, which leaves a PARAM_RAW value
 * uncleaned, so the reading is where the validation is, as for
 * {@see explore_preference}: a member outside its vocabulary, or of the wrong type, falls back to
 * its default and the rest is kept. Whether the stored view can be drawn (a teaching view for
 * someone who no longer teaches) is the client's decision once the strip payload says which
 * views exist; the shell reads this without a database or cache read.
 *
 * The soon member (ADR-016 decision 7) is Up next hidden by the viewer: {rank, signin}, rank the
 * level hidden at (SOON_RANKS) and signin $USER->currentlogin when it was written. It is read on its
 * own ({@see soon()}), never through validate(), so it can neither break nor be broken by the other
 * members: a missing or malformed member, or one written under another sign-in, is not hidden.
 *
 * The news member (ADR-017 decision 9) is the open-courses line hidden by the viewer: {signin},
 * $USER->currentlogin when it was written. It is read on its own as well ({@see news()}), with the
 * same rule: an unknown shape, or another sign-in, is not hidden. The client writes every member
 * it holds back with each write, so a change of view keeps the line hidden and hiding the line
 * keeps the view.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class calendar_preference {
    /** @var string The preference name, declared in lib.php. */
    public const NAME = 'block_compass_calendar';

    /** @var string[] The views; calendar\strip::VIEWS's vocabulary. */
    public const VIEWS = ['learning', 'teaching'];

    /** @var string[] The item filters: everything, only what is to do, only events. */
    public const FILTERS = ['all', 'todo', 'events'];

    /** @var int[] The levels Up next can be hidden at: 1 soon, 2 imminent, 3 now (ADR-016 decision 2). */
    public const SOON_RANKS = [1, 2, 3];

    /**
     * The state the strip starts in for a viewer who never changed it.
     *
     * @param bool|null $relevance The relevance default; null for the site's calendar_relevance setting.
     * @param bool|null $open The open default; null for the site's calendar_start setting.
     * @return array view, filter, relevance and open.
     */
    public static function defaults(?bool $relevance = null, ?bool $open = null): array {
        return [
            'view' => 'learning',
            'filter' => 'all',
            'relevance' => $relevance ?? config::calendar_relevance(),
            'open' => $open ?? config::calendar_start() === 'open',
        ];
    }

    /**
     * The current viewer's stored state, validated, or the defaults.
     *
     * @return array view, filter, relevance and open, each within its vocabulary.
     */
    public static function read(): array {
        $stored = get_user_preferences(self::NAME, null);

        return self::validate(
            is_string($stored) ? $stored : null,
            config::calendar_relevance(),
            config::calendar_start() === 'open'
        );
    }

    /**
     * Keep of a stored value what the vocabulary admits, member by member.
     *
     * The relevance switch and the open flag are kept only as JSON booleans: "0", 0 or "false"
     * are not the viewer's choice, and reading them as one would turn a malformed value into a
     * choice. A stored value without the open member starts as the site's
     * calendar_start says.
     *
     * @param string|null $json The stored JSON, or null when nothing is stored.
     * @param bool $relevancedefault The relevance default, the site's setting.
     * @param bool $opendefault The open default, the site's calendar_start setting.
     * @return array view, filter, relevance and open, each within its vocabulary.
     */
    public static function validate(?string $json, bool $relevancedefault, bool $opendefault = false): array {
        $state = self::defaults($relevancedefault, $opendefault);
        if ($json === null || $json === '') {
            return $state;
        }
        $decoded = json_decode($json, true);
        if (!is_array($decoded)) {
            return $state;
        }
        if (isset($decoded['view']) && in_array($decoded['view'], self::VIEWS, true)) {
            $state['view'] = $decoded['view'];
        }
        if (isset($decoded['filter']) && in_array($decoded['filter'], self::FILTERS, true)) {
            $state['filter'] = $decoded['filter'];
        }
        if (isset($decoded['relevance']) && is_bool($decoded['relevance'])) {
            $state['relevance'] = $decoded['relevance'];
        }
        if (isset($decoded['open']) && is_bool($decoded['open'])) {
            $state['open'] = $decoded['open'];
        }

        return $state;
    }

    /**
     * The soon member of a stored value when it holds for this sign-in, in the shape the client writes.
     *
     * Kept only as JSON integers, as the switches are kept only as booleans: "2" or 2.0 is not a
     * level the client wrote. A member written under another sign-in is not hidden any more
     * (decision 7: until the next sign-in), so it reads as null, and a client writing back what this
     * returns drops it.
     *
     * @param string|null $json The stored JSON, or null when nothing is stored.
     * @param int $signin The sign-in marker now, $USER->currentlogin.
     * @return array|null rank (one of SOON_RANKS) and signin (equal to $signin), or null: not hidden.
     */
    public static function soon(?string $json, int $signin): ?array {
        if ($json === null || $json === '') {
            return null;
        }
        $decoded = json_decode($json, true);
        $member = is_array($decoded) ? ($decoded['soon'] ?? null) : null;
        if (!is_array($member) || !isset($member['rank'], $member['signin'])) {
            return null;
        }
        if (!in_array($member['rank'], self::SOON_RANKS, true)) {
            return null;
        }
        if ($member['signin'] !== $signin) {
            return null;
        }

        return ['rank' => $member['rank'], 'signin' => $member['signin']];
    }

    /**
     * The news member of a stored value when it holds for this sign-in, in the shape the client writes.
     *
     * The marker is kept only as a JSON integer equal to this sign-in's: "5", 5.0, a missing marker,
     * a member that is not an object, or a marker of another sign-in all read as null, so the line
     * shows (decision 9: until the next sign-in), and a client writing back what this returns drops
     * a stale member.
     *
     * @param string|null $json The stored JSON, or null when nothing is stored.
     * @param int $signin The sign-in marker now, $USER->currentlogin.
     * @return array|null signin (equal to $signin), or null: not hidden.
     */
    public static function news(?string $json, int $signin): ?array {
        $decoded = ($json === null || $json === '') ? null : json_decode($json, true);
        $news = is_array($decoded) ? ($decoded['news'] ?? null) : null;
        $marker = is_array($news) ? ($news['signin'] ?? null) : null;
        if ($marker !== $signin) {
            return null;
        }

        return ['signin' => $marker];
    }

    /**
     * Whether the current viewer hid the open-courses line during this sign-in.
     *
     * The service that answers the line (ADR-017 stage 14c) returns early on true; the domain never
     * reads this, so a hidden line costs the floor and nothing else.
     *
     * @return bool
     */
    public static function news_hidden(): bool {
        global $USER;

        $stored = get_user_preferences(self::NAME, null);

        return self::news(is_string($stored) ? $stored : null, (int) ($USER->currentlogin ?? 0)) !== null;
    }

    /**
     * The level the current viewer hid Up next at during this sign-in, or null when it is not hidden.
     *
     * Up next shows again when its highest level is above this rank (decision 7).
     *
     * @return int|null One of SOON_RANKS, or null.
     */
    public static function hidden_rank(): ?int {
        global $USER;

        $stored = get_user_preferences(self::NAME, null);
        $soon = self::soon(is_string($stored) ? $stored : null, (int) ($USER->currentlogin ?? 0));

        return $soon['rank'] ?? null;
    }
}
