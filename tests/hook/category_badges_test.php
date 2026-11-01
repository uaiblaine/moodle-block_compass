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
 * Tests for the category_badges hook (ADR-019 decision 1).
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass\hook;

use PHPUnit\Framework\Attributes\CoversClass;

/**
 * The hook's half of the contract: the asked ids, and answers kept for those ids only.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(category_badges::class)]
final class category_badges_test extends \advanced_testcase {
    /**
     * The asked ids are the positive ones, each once, in the order given.
     *
     * @return void
     */
    public function test_the_asked_ids_are_positive_and_each_once(): void {
        $hook = new category_badges([7, '3', 0, -2, 7, 5]);

        $this->assertSame([7, 3, 5], $hook->get_categoryids());
        $this->assertSame([], $hook->get_badges(), 'nothing answered yet');
    }

    /**
     * An answer for an asked id is kept and adds up across listeners; one for any other id is dropped.
     *
     * @return void
     */
    public function test_answers_are_kept_for_the_asked_ids_only(): void {
        $a = ['url' => 'https://example.com/a.png', 'alt' => 'A'];
        $b = ['url' => 'https://example.com/b.png', 'alt' => 'B'];
        $hook = new category_badges([1, 2]);

        $hook->add_badges(1, ['first' => $a]);
        $hook->add_badges(9, [$b]);
        $hook->add_badges(1, [$b]);

        $this->assertSame([1 => [$a, $b]], $hook->get_badges(), 'two listeners add up, as lists; id 9 was never asked');
    }
}
