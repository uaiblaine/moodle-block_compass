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

use basic_testcase;
use PHPUnit\Framework\Attributes\CoversNothing;

/**
 * The client's one door to RequireJS, pinned by reading the source.
 *
 * Nothing runs the React sources in a test. With the JS cache on, a module asked for by its own
 * name before core/first has loaded is served as a second copy of the whole AMD bundle
 * (lib/requirejs.php), so amd.ts asks for core/first first and no other client file reaches
 * RequireJS. Each method names the change that must redden it.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversNothing]
final class amd_bridge_rules_test extends basic_testcase {
    /**
     * Every TypeScript client source, keyed by its path from the plugin root, comments removed.
     *
     * @return array Path => contents.
     */
    private function sources(): array {
        $root = dirname(__DIR__, 2);
        $sources = [];
        $files = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($root . '/js/esm/src'));
        foreach ($files as $file) {
            if ($file->isFile() && preg_match('/\.tsx?$/', $file->getFilename())) {
                $contents = (string) file_get_contents($file->getPathname());
                // Comments are prose and may name what the rules forbid.
                $contents = preg_replace('#/\*.*?\*/#s', '', $contents);
                $contents = preg_replace('#^\s*//.*$#m', '', $contents);
                $sources[substr($file->getPathname(), strlen($root) + 1)] = $contents;
            }
        }
        ksort($sources);

        return $sources;
    }

    /**
     * The bridge asks for a module only from inside core/first's callback.
     *
     * Changes that must make it fail: loader([name], ...) called directly, or the core/first
     * request dropped.
     *
     * @return void
     */
    public function test_bridge_waits_for_core_first(): void {
        $sources = $this->sources();
        // Vacuity guard: the bridge must be in the scan.
        $this->assertArrayHasKey('js/esm/src/amd.ts', $sources, 'amd.ts is not in the scan');
        $amd = $sources['js/esm/src/amd.ts'];

        $this->assertSame(
            2,
            preg_match_all('/\bloader\(\s*\[/', $amd),
            'amd.ts must make exactly two RequireJS calls: core/first, then the module'
        );
        $this->assertMatchesRegularExpression(
            '/\bloader\(\s*\[\s*\'core\/first\'\s*\]\s*,\s*\(\)\s*=>\s*loader\(\s*\[\s*name\s*\]/',
            $amd,
            'amd.ts asks for the module outside core/first\'s callback'
        );
    }

    /**
     * No client file other than amd.ts reaches RequireJS.
     *
     * Changes that must make it fail: window.require, require([...]) or requirejs([...]) in any
     * other file under js/esm/src.
     *
     * @return void
     */
    public function test_only_the_bridge_reaches_requirejs(): void {
        $sources = $this->sources();
        // Vacuity guard: the repository, which loads core_user/repository, is one of the files read.
        $this->assertArrayHasKey('js/esm/src/repository.ts', $sources, 'repository.ts is not in the scan');
        foreach ($sources as $file => $contents) {
            if ($file === 'js/esm/src/amd.ts') {
                continue;
            }
            $this->assertDoesNotMatchRegularExpression(
                '/\bwindow\.require(js)?\b|\brequire(js)?\s*\(\s*\[/',
                $contents,
                "{$file}: reaches RequireJS itself; load AMD modules through amd() from amd.ts"
            );
        }
    }

    /**
     * The client's web service calls go straight to core's ES module, never through the bridge.
     *
     * Moodle 5.3's AMD core/ajax is a wrapper of @moodle/lms/core/ajax; asking for it through amd()
     * made the first read of every page wait for core/first, RequireJS's bundle of every AMD module,
     * to load and run (docs/performance-audit/PLAN.md, item 3). Changes that must make it fail:
     * core/ajax asked for through amd(), or the import of fetchOne (or of fetchMany, the batch of ADR-017
     * amendment 1) dropped.
     *
     * @return void
     */
    public function test_web_service_calls_skip_the_bridge(): void {
        $sources = $this->sources();
        $repository = $sources['js/esm/src/repository.ts'];
        $this->assertStringContainsString("import {fetchMany, fetchOne} from '@moodle/lms/core/ajax';", $repository);
        $this->assertMatchesRegularExpression('/\bfetchOne<T>\(\{methodname, args\}\)/', $repository);
        foreach ($sources as $file => $contents) {
            $this->assertDoesNotMatchRegularExpression(
                "/\\bamd(<[^>]*>)?\\(\\s*'core\\/ajax'/",
                $contents,
                "{$file}: asks for core/ajax through the bridge; import fetchOne from @moodle/lms/core/ajax"
            );
        }
    }
}
