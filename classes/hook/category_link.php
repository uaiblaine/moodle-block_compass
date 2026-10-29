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
 * The hook through which a theme or plugin gives the open-courses line a filtered category page.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\hook;

/**
 * Asks any listener where a group of courses open for enrolment should lead (ADR-017 decision 8).
 *
 * Dispatched once per response by {@see \block_compass\local\category_link::urls()}, for every
 * group the line shows and for the root (category id 0, "See every course open for enrolment").
 * The block names no theme and no parameter vocabulary: a listener that can show a category's
 * courses filtered to those open for enrolment and starting in the band answers with that page's
 * address; a site where nothing listens links to core's category pages.
 *
 * The contract a listener keeps:
 *
 * - It answers with set_url(), a \core\url or a string, for the ids it can serve and only those.
 *   The block keeps an address only when it is on this site (PARAM_LOCALURL, under wwwroot);
 *   anything else, and every id left unanswered, gets core's page.
 * - The band is the line's: get_from() and get_to() are its first and last day, Y-m-d in the
 *   site timezone, the days the catalogue counted ({@see \block_compass\local\catalogue::band()}).
 * - It answers in one batch, writes nothing to $SESSION (the service that dispatches this runs
 *   with a read-only session) and guards itself as any hook callback must. The block catches
 *   what a listener throws and links that response to core's pages.
 *
 * An answer for an id the block did not ask for is ignored; two listeners answering the same id
 * leave the later answer, in the order core calls them.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\core\attribute\label('Lets a theme or plugin lead the Compass block\'s open-for-enrolment groups to a filtered category page')]
#[\core\attribute\tags('block_compass', 'course')]
final class category_link {
    /** @var int[] The category ids asked, 0 for the root, each once, in the order given. */
    private array $categoryids;

    /** @var array Category id => true, for the ids asked: the allowlist set_url() checks. */
    private array $asked;

    /** @var array Category id => \core\url or string, as the listeners answered. */
    private array $urls = [];

    /**
     * Creates the question for a set of categories.
     *
     * @param int[] $categoryids The categories of the shown groups, 0 for the root; a negative id is
     *     dropped and a repeated id counts once.
     * @param string $from The band's first day, Y-m-d in the site timezone.
     * @param string $to The band's last day, Y-m-d in the site timezone.
     * @param int $userid The viewer, the current user.
     */
    public function __construct(
        array $categoryids,
        /** @var string The band's first day, Y-m-d. */
        private readonly string $from,
        /** @var string The band's last day, Y-m-d. */
        private readonly string $to,
        /** @var int The viewer. */
        private readonly int $userid
    ) {
        $asked = [];
        foreach ($categoryids as $categoryid) {
            if ((int) $categoryid >= 0) {
                $asked[(int) $categoryid] = true;
            }
        }
        $this->asked = $asked;
        $this->categoryids = array_keys($asked);
    }

    /**
     * The category ids the block asks about, 0 for the root: the only ones an answer is kept for.
     *
     * @return int[]
     */
    public function get_categoryids(): array {
        return $this->categoryids;
    }

    /**
     * The band's first day.
     *
     * @return string Y-m-d in the site timezone.
     */
    public function get_from(): string {
        return $this->from;
    }

    /**
     * The band's last day.
     *
     * @return string Y-m-d in the site timezone.
     */
    public function get_to(): string {
        return $this->to;
    }

    /**
     * The viewer the line is drawn for.
     *
     * @return int
     */
    public function get_userid(): int {
        return $this->userid;
    }

    /**
     * Gives one category its destination, replacing any earlier listener's.
     *
     * Ignored for an id the block did not ask for.
     *
     * @param int $categoryid A category id from get_categoryids(), 0 for the root.
     * @param \core\url|string $url The page's address, on this site.
     * @return void
     */
    public function set_url(int $categoryid, \core\url|string $url): void {
        if (!isset($this->asked[$categoryid])) {
            return;
        }
        $this->urls[$categoryid] = $url;
    }

    /**
     * The answers so far.
     *
     * @return array Category id => \core\url or string as the listeners gave it, for the asked ids
     *     answered; an id no listener answered is absent.
     */
    public function get_urls(): array {
        return $this->urls;
    }
}
