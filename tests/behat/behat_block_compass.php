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
 * Behat steps of the Compass block.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * The steps core does not have: a page in the dark colour mode, and the calendar strip's requests
 * failing at the transport.
 *
 * @package    block_compass
 * @category   test
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class behat_block_compass extends behat_base {
    /**
     * Put the page in Bootstrap's dark colour mode, as a theme does.
     *
     * Moodle 5.x has one dark mechanism, Bootstrap 5.3's data-bs-theme attribute. On 5.3 core's
     * theme_boost writes it on the html element only when theme_boost/enablecolourmodes is on and
     * the user chose dark (theme/boost/classes/hook_listener.php), so the scenario sets it on the
     * html element itself, as Boost would, where both Boost's dark palette and the stylesheet's dark
     * override read it ([data-bs-theme="dark"] body .block_compass). The page is not reloaded: the attribute lasts
     * until the next page load, long enough for the axe step that follows it.
     *
     * The step returns once the colours have settled: the block's colour transitions would
     * otherwise hand axe a frame between the two modes (a mid-way colour on a mid-way fill, which
     * failed one leg in three). Reading a layout property forces the style recalculation that
     * starts the transitions, so the wait sees them instead of an empty list; only transitions are
     * awaited, so an endless animation elsewhere on the page cannot hold the step.
     *
     * @Given the page is shown in the dark colour mode
     * @return void
     * @throws \Behat\Mink\Exception\ExpectationException When the colours never settle.
     */
    public function the_page_is_shown_in_the_dark_colour_mode(): void {
        $this->require_javascript('The colour mode is an attribute the browser applies.');
        $this->execute_script("document.documentElement.setAttribute('data-bs-theme', 'dark'); void document.body.offsetHeight;");
        $settled = $this->getSession()->wait(
            self::get_extended_timeout() * 1000,
            "document.getAnimations().every((animation) => "
                . "!(animation instanceof CSSTransition) || animation.playState !== 'running')"
        );
        if (!$settled) {
            throw new \Behat\Mink\Exception\ExpectationException(
                'The page\'s colour transitions did not finish after switching to the dark mode.',
                $this->getSession()
            );
        }
    }

    /**
     * Make the calendar strip's row request fail at the transport, as a dropped link does.
     *
     * The page's fetch is wrapped once: while the flag is up, a call whose info is
     * block_compass_get_strip goes to a script that does not exist, so the answer is a 404 and the
     * client's bounded retry gives up after its two retries. On 5.3 core/ajax is the AMD wrapper of
     * the ES module @moodle/lms/core/ajax, which names the method in the URL and sends it through
     * the global fetch (lib/js/esm/src/ajax.ts), not XMLHttpRequest as 5.2's lib/amd/src/ajax.js
     * did. The counts' request, block_compass_get_strip_counts, and every other call pass. Nothing
     * in the plugin knows about this: the failure is the browser's, as a real one is.
     *
     * @Given the calendar strip requests fail
     * @return void
     */
    public function the_calendar_strip_requests_fail(): void {
        $this->require_javascript('The requests are the browser\'s.');
        $this->execute_script(<<<'JS'
            (function() {
                window.blockCompassBehatFail = true;
                if (window.blockCompassBehatWrapped) {
                    return;
                }
                window.blockCompassBehatWrapped = true;
                var original = window.fetch;
                window.fetch = function(input, init) {
                    if (window.blockCompassBehatFail && typeof input === 'string'
                            && /[?&]info=block_compass_get_strip(&|$)/.test(input)) {
                        input = input.replace('/lib/ajax/service.php', '/lib/ajax/block_compass_behat_missing.php');
                    }
                    return original.call(window, input, init);
                };
            })();
            JS);
    }

    /**
     * Let the calendar strip's requests through again, after the calendar strip requests fail.
     *
     * @Given the calendar strip requests answer again
     * @return void
     */
    public function the_calendar_strip_requests_answer_again(): void {
        $this->require_javascript('The requests are the browser\'s.');
        $this->execute_script('window.blockCompassBehatFail = false;');
    }
}
