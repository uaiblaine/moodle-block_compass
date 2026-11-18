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
 * Every class that uses a core class core does not autoload loads that class's library itself.
 *
 * A PHPUnit run has these libraries loaded already, so a test of the behaviour cannot see the miss; a
 * web service request can: `learner_progress::percentage()` once created `\completion_info` with
 * nothing having loaded lib/completionlib.php, and every progress miss of get_card_details failed
 * with "Class completion_info not found" on the dashboard. So this test reads the sources: a file of
 * classes/ that names one of these classes with `new` or `::` requires its library.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversNothing]
final class core_libraries_rules_test extends \basic_testcase {
    /** @var array Core classes outside the autoloader, by the library (under $CFG->libdir) that declares them. */
    private const LIBRARIES = [
        'completionlib.php' => ['completion_info', 'completion_completion'],
    ];

    /**
     * Each file creating or calling such a class requires its library.
     *
     * @return void
     */
    public function test_a_class_core_does_not_autoload_is_loaded_where_it_is_used(): void {
        $root = dirname(__DIR__, 2) . '/classes';
        $files = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS));
        $users = 0;
        foreach ($files as $file) {
            if ($file->getExtension() !== 'php') {
                continue;
            }
            $source = file_get_contents($file->getPathname());
            foreach (self::LIBRARIES as $library => $classes) {
                $pattern = '/(new\s+\\\\?|\\\\)(' . implode('|', $classes) . ')\s*(\(|::)/';
                if (!preg_match($pattern, $source)) {
                    continue;
                }
                $users++;
                $this->assertStringContainsString(
                    "require_once(\$CFG->libdir . '/{$library}')",
                    $source,
                    substr($file->getPathname(), strlen($root) + 1) . " uses a class of {$library} without loading it."
                );
            }
        }
        // Vacuity guard: the progress mirror creates completion_info, so at least one file is checked.
        $this->assertGreaterThanOrEqual(1, $users);
    }
}
