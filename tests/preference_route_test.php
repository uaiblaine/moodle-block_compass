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
 * Tests for the JSON preferences through core's preference route.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_compass;

use block_compass\local\calendar_preference;
use block_compass\local\explore_preference;
use block_compass\local\tier1_preference;
use core\tests\router\route_testcase;
use core_user\route\api\preferences;
use GuzzleHttp\Psr7\Utils;
use PHPUnit\Framework\Attributes\CoversFunction;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * The three JSON preferences through the endpoint the client posts to, core_user/repository's batch.
 *
 * lib_test pins what cleaning returns; this pins what the route does with it: a value the reader
 * reads is stored as posted, and one over the cap is refused with nothing stored over the earlier
 * value.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversFunction('block_compass_user_preferences')]
final class preference_route_test extends route_testcase {
    /**
     * The largest value each preference's client writes, as lib_test::largest_values() builds it.
     *
     * The derivation is in each reader's MAX_BYTES docblock; a data provider cannot reach another
     * test file's class, so the three values are built again here.
     *
     * @return array name => [preference name, the largest value, the reader's class].
     */
    public static function largest_values(): array {
        $cf = [];
        foreach (['a', 'b', 'c'] as $prefix) {
            $cf[str_pad($prefix, 100, 'x')] = 2147483647;
        }
        $explore = ['sort' => 'category', 'scope' => 'scheduled', 'star' => false, 'cf' => $cf, 'panel' => false];
        $calendar = [
            'view' => 'learning',
            'filter' => 'events',
            'relevance' => false,
            'open' => false,
            'soon' => ['rank' => 3, 'signin' => 9999999999],
            'news' => ['signin' => 9999999999],
        ];
        $strips = [];
        foreach (tier1_preference::STRIPS as $strip) {
            $strips[] = [$strip, tier1_preference::MAX_CARDS, false];
        }
        $surface = ['strips' => $strips, 'ghost' => false, 'pending' => false];
        $tier1 = ['v' => tier1_preference::VERSION, 'dashboard' => $surface, 'page' => $surface];

        return [
            'explore' => [explore_preference::NAME, json_encode($explore), explore_preference::class],
            'calendar' => [calendar_preference::NAME, json_encode($calendar), calendar_preference::class],
            'tier1' => [tier1_preference::NAME, json_encode($tier1), tier1_preference::class],
        ];
    }

    /**
     * Post one preference the way core_user/repository's setUserPreferences() does.
     *
     * @param string $name The preference.
     * @param string $value Its value.
     * @return \Psr\Http\Message\ResponseInterface
     */
    private function post(string $name, string $value): \Psr\Http\Message\ResponseInterface {
        return $this->process_api_request(
            'POST',
            '/current/preferences',
            body: Utils::streamFor(json_encode(['preferences' => [$name => $value]])),
        );
    }

    /**
     * The largest legitimate value is stored as posted; one byte over the cap is refused.
     *
     * Control: the first write lands, so the refusal is the cap's and not the route's or the
     * permission callback's, and the stored value after it is still the first.
     *
     * @param string $name The preference.
     * @param string $largest The largest value its client writes.
     * @param string $reader The reader's class.
     * @return void
     */
    #[DataProvider('largest_values')]
    public function test_the_route_stores_the_largest_value_and_refuses_a_longer_one(
        string $name,
        string $largest,
        string $reader
    ): void {
        $this->resetAfterTest();
        $this->add_class_routes_to_route_loader(preferences::class);
        $this->setUser($this->getDataGenerator()->create_user());

        $this->assert_valid_response($this->post($name, $largest));
        $this->assertSame($largest, get_user_preferences($name));

        $rest = substr($largest, 1);
        $over = '{"pad":"' . str_repeat('x', $reader::MAX_BYTES + 1 - strlen($rest) - 10) . '",' . $rest;
        $this->assertSame($reader::MAX_BYTES + 1, strlen($over));

        $this->assert_invalid_parameter_response($this->post($name, $over));
        $this->assertSame($largest, get_user_preferences($name));
    }
}
