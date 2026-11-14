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
 * The client arrives in one file, and that file is fresh.
 *
 * Core's grunt regenerates the per-file outputs and CI fails on a diff, so those cannot go
 * stale unnoticed; the bundle is written by a build step outside core's grunt, which core's
 * check cannot see. The manifest that step writes beside the bundle - the SHA-1 of every
 * source - is what this test recomputes, so a source edited without a rebundle fails here.
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

    /** @var string What to do when the build is stale. */
    private const REBUILD = 'rebuild js/esm/build (the per-file outputs, and the bundle that js/esm/bundle.json names '
        . 'with its manifest) and commit it';

    /**
     * The marker names the entry and the output the bundle step builds.
     *
     * The bundle's source map is not asserted: it is a development file the release package leaves out
     * (test_the_package_leaves_the_development_build_out), so a site installed from the package has none.
     *
     * @return void
     */
    public function test_the_marker_names_the_entry_and_the_output(): void {
        $marker = json_decode((string) file_get_contents(self::ROOT . '/js/esm/bundle.json'), true);

        $this->assertSame('src/Block.tsx', $marker['entry'] ?? null);
        $this->assertSame('build/bundle.js', $marker['outfile'] ?? null);
        $this->assertFileExists(self::ROOT . '/js/esm/build/bundle.js');
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
        $this->assertIsArray($manifest, 'no manifest beside the bundle: ' . self::REBUILD);
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
            'the manifest does not list exactly the sources on disk: ' . self::REBUILD
        );
        foreach ($ondisk as $relative => $hash) {
            $this->assertSame(
                $hash,
                $listed[$relative],
                "{$relative} was edited after the bundle was built: " . self::REBUILD
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

    /**
     * The release package leaves the source maps out and keeps every file the import map can address.
     *
     * Moodle 5.2's build writes X.js with X.js.map beside it for every source, and the bundle step
     * bundle.js with bundle.js.map. The ESM route serves a .js.map only when one is asked for
     * (import_map::add_import()'s allowed suffixes); nothing on a page asks: the import map, the
     * modulepreload hints and the bundle's imports name .js files, and only developer tools follow a
     * sourceMappingURL comment. So the package (`git archive` of a commit, which honours
     * export-ignore) runs the same without them, and they stay tracked because `mdl ci` compares
     * js/esm with a fresh build. 5.2 writes no X.dev.js (5.3's development twin): the build is
     * asserted to hold none, so the .dev.js rule .gitattributes keeps for parity with the 5.3 branch
     * covers nothing here and is not what this test proves. git's own matching is not available to a
     * test, so the rules are read as written: the line that leaves the maps out, and no rule that
     * takes out a production file, the manifest or the marker.
     *
     * Changes that must make it fail: the maps' line dropped; a wider rule over js/esm/build (or
     * js/esm) added; a .dev.js file in the build (5.3's build committed on this branch).
     *
     * @return void
     */
    public function test_the_package_leaves_the_development_build_out(): void {
        $rules = [];
        foreach (file(self::ROOT . '/.gitattributes', FILE_IGNORE_NEW_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            [$pattern, $attributes] = preg_split('/\s+/', $line, 2) + [1 => ''];
            if (str_contains($attributes, 'export-ignore')) {
                $rules[] = $pattern;
            }
        }
        // Vacuity guard: the file's export-ignore rules were read.
        $this->assertContains('/docs', $rules);
        $this->assertContains('/js/esm/build/*.js.map', $rules, 'the source maps ship');

        $build = glob(self::ROOT . '/js/esm/build/*');
        // Vacuity guard: the build was listed, and the maps the rule leaves out exist.
        $this->assertGreaterThan(40, count($build));
        $this->assertGreaterThan(40, count(glob(self::ROOT . '/js/esm/build/*.js.map')));
        $this->assertSame([], glob(self::ROOT . '/js/esm/build/*.dev.js'), "5.2's build writes no .dev.js");
        $kept = 0;
        foreach ($build as $path) {
            $relative = '/js/esm/build/' . basename($path);
            $development = str_ends_with($relative, '.dev.js') || str_ends_with($relative, '.js.map');
            $ignored = false;
            foreach ($rules as $pattern) {
                // A pattern with no slash matches a name at any depth; one with a slash, the path from the root,
                // a directory taking everything under it (gitattributes(5), gitignore(5)).
                $matches = str_contains($pattern, '/')
                    ? fnmatch('/' . ltrim($pattern, '/'), $relative, FNM_PATHNAME)
                        || str_starts_with($relative, '/' . trim($pattern, '/') . '/')
                    : fnmatch($pattern, basename($relative));
                $ignored = $ignored || $matches;
            }
            $this->assertSame($development, $ignored, $relative . ($development ? ' ships' : ' is left out of the package'));
            $kept += $ignored ? 0 : 1;
        }
        // The production outputs, the bundle and its manifest stay: what the import map and this test address.
        foreach (['bundle.js', 'bundle.manifest.json', 'Block.js'] as $name) {
            $this->assertFileExists(self::ROOT . '/js/esm/build/' . $name);
        }
        $this->assertGreaterThan(40, $kept);
        foreach (['/js/esm', '/js/esm/build', '/js', '/js/esm/bundle.json'] as $wide) {
            $this->assertNotContains($wide, $rules, "{$wide} would leave the client out of the package");
        }
    }
}
