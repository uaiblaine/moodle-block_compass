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

namespace block_compass;

use basic_testcase;
use PHPUnit\Framework\Attributes\CoversNothing;

/**
 * The client arrives in one file, and that file is fresh (ADR-011, decision 1).
 *
 * Core's grunt regenerates the per-file outputs and CI fails on a diff, so those cannot go
 * stale unnoticed; the bundle is written by the fleet's own step, which core's check cannot
 * see. The manifest that step writes beside the bundle - the SHA-1 of every source - is what
 * this test recomputes: a source edited without a rebundle is red on every runtime leg.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversNothing]
final class bundle_test extends basic_testcase {
    /** @var string The plugin's root. */
    private const ROOT = __DIR__ . '/..';

    /**
     * The marker names the entry and the output the fleet's step builds.
     *
     * @return void
     */
    public function test_the_marker_names_the_entry_and_the_output(): void {
        $marker = json_decode((string) file_get_contents(self::ROOT . '/js/esm/bundle.json'), true);

        $this->assertSame('src/Block.tsx', $marker['entry'] ?? null);
        $this->assertSame('build/bundle.js', $marker['outfile'] ?? null);
        $this->assertFileExists(self::ROOT . '/js/esm/build/bundle.js');
        $this->assertFileExists(self::ROOT . '/js/esm/build/bundle.js.map');
    }

    /**
     * Every source is in the manifest with the hash of the file on disk, and nothing else is.
     *
     * A source edited without a rebundle differs; a source added without one is missing; a
     * source deleted without one is listed for nothing. All three are the same finding: the
     * bundle the page loads was built from other sources than these.
     *
     * @return void
     */
    public function test_the_bundle_is_as_fresh_as_the_sources(): void {
        $manifest = json_decode((string) file_get_contents(self::ROOT . '/js/esm/build/bundle.manifest.json'), true);
        $this->assertIsArray($manifest, 'no manifest beside the bundle: run mdl grunt');
        $this->assertSame('src/Block.tsx', $manifest['entry'] ?? null);

        $ondisk = [];
        $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator(self::ROOT . '/js/esm/src'));
        foreach ($iterator as $file) {
            if (!$file->isFile() || !preg_match('/\.tsx?$/', $file->getFilename())) {
                continue;
            }
            $relative = 'src/' . str_replace('\\', '/', substr($file->getPathname(), strlen(self::ROOT . '/js/esm/src/')));
            $ondisk[$relative] = sha1_file($file->getPathname());
        }
        ksort($ondisk);
        // Vacuity guard: the sources were read at all.
        $this->assertGreaterThan(20, count($ondisk), 'js/esm/src holds fewer sources than the client has');

        $listed = $manifest['sources'] ?? [];
        ksort($listed);
        $this->assertSame(
            array_keys($ondisk),
            array_keys($listed),
            'the manifest does not list exactly the sources on disk: run mdl grunt and commit js/esm/build'
        );
        foreach ($ondisk as $relative => $hash) {
            $this->assertSame(
                $hash,
                $listed[$relative],
                "{$relative} was edited after the bundle was built: run mdl grunt and commit js/esm/build"
            );
        }
    }

    /**
     * No source is named like the bundle: core's per-file task would overwrite it by name.
     *
     * @return void
     */
    public function test_no_source_is_named_after_the_bundle(): void {
        foreach (['bundle.ts', 'bundle.tsx'] as $name) {
            $this->assertFileDoesNotExist(
                self::ROOT . '/js/esm/src/' . $name,
                "js/esm/src/{$name} would be compiled over js/esm/build/bundle.js by core's build"
            );
        }
    }

    /**
     * The block template mounts the bundle, and no template names a per-file module.
     *
     * @return void
     */
    public function test_the_templates_mount_the_bundle_and_nothing_else(): void {
        $block = (string) file_get_contents(self::ROOT . '/templates/block.mustache');
        $this->assertStringContainsString('"component": "@moodle/lms/block_compass/bundle"', $block);

        foreach (glob(self::ROOT . '/templates/*.mustache') as $template) {
            $contents = (string) file_get_contents($template);
            preg_match_all('/@moodle\/lms\/block_compass\/([A-Za-z_]+)/', $contents, $matches);
            foreach ($matches[1] as $module) {
                $this->assertSame('bundle', $module, basename($template) . " names the per-file module {$module}");
            }
        }
    }
}
