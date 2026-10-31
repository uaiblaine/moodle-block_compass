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
 * The hook through which a theme or plugin gives the categories Compass names their institutional crests.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\hook;

/**
 * Asks any listener for the institutional crests of the categories the open-courses line is about to name.
 *
 * The twin of {@see course_badges} for categories (ADR-019 decision 1). Dispatched once per response by
 * {@see \block_compass\local\theme_badges::for_categories()}, never while show_theme_badges is off and
 * never without a category id. The contract a listener keeps is course_badges' own, for categories: it
 * answers only for categories the CURRENT USER may see, in one batch for every id, writes nothing to
 * $SESSION and guards itself as installed. The block keeps the first crest a category is given.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\core\attribute\label('Lets a theme or plugin give the categories the Compass block names their institutional crests')]
#[\core\attribute\tags('block_compass', 'course')]
final class category_badges {
    /** @var int[] The category ids asked, positive and each once, in the order given. */
    private array $categoryids;

    /** @var array Category id => true, for the ids asked: the allowlist add_badges() checks. */
    private array $asked;

    /** @var array Category id => list of badges, for the asked ids a listener answered. */
    private array $badges = [];

    /**
     * Creates the question for a set of categories.
     *
     * @param int[] $categoryids The category ids the block is about to name; anything not a positive
     *     integer is dropped, and a repeated id counts once.
     */
    public function __construct(array $categoryids) {
        $asked = [];
        foreach ($categoryids as $categoryid) {
            if ((int) $categoryid > 0) {
                $asked[(int) $categoryid] = true;
            }
        }
        $this->asked = $asked;
        $this->categoryids = array_keys($asked);
    }

    /**
     * The category ids the block asks about, the only ones an answer is kept for.
     *
     * @return int[]
     */
    public function get_categoryids(): array {
        return $this->categoryids;
    }

    /**
     * Gives one category its badges, after those any earlier listener gave it.
     *
     * Ignored for an id the block did not ask for.
     *
     * @param int $categoryid A category id from get_categoryids().
     * @param array $badges A list of ['url' => string, 'alt' => string], in display order.
     * @return void
     */
    public function add_badges(int $categoryid, array $badges): void {
        if (!isset($this->asked[$categoryid])) {
            return;
        }
        $this->badges[$categoryid] = array_merge($this->badges[$categoryid] ?? [], array_values($badges));
    }

    /**
     * The answers so far.
     *
     * @return array Category id => list of badges as the listeners gave them, for the asked ids that
     *     received any call to add_badges(); an id no listener answered is absent.
     */
    public function get_badges(): array {
        return $this->badges;
    }
}
