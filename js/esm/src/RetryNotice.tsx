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
 * The way back from every failure.
 *
 * Amber rather than error red, because the failure is recoverable; role="alert", so it is
 * announced; "Try again", which replays the loader that failed; and "Reload page" as the last
 * resort. It is the block's only reload control, and it exists only once a load has failed: no
 * reload control is on the page before (ADR-014 amendment 11), as block_feedback_tracker does it.
 * The parent owns the retry callback and the in-flight flag; while a retry runs, Try again is
 * aria-disabled and refuses a second press, never disabled: the attribute would be applied in the
 * render the button's own click causes, and a focused element that becomes disabled drops the
 * keyboard to the body, so "Reloading…" would be said to nobody. The pointer-events: none of
 * Bootstrap's disabled class passes a click only to the alert beneath.
 *
 * @module     block_compass/RetryNotice
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useLayoutEffect, useRef} from 'react';
import type {BlockConfig} from './types';

type RetryNoticeProps = {
    message: string,
    retrying: boolean,
    config: BlockConfig,
    onRetry: () => void,
};

/**
 * The notice.
 *
 * @param {object} props The message, whether a retry is out, the block config and the retry
 *     callback; see RetryNoticeProps.
 * @returns {object} The rendered notice.
 */
const RetryNotice = ({message, retrying, config, onRetry}: RetryNoticeProps) => {
    const {labels} = config;
    const classes = retrying ? 'btn btn-sm btn-outline-secondary disabled' : 'btn btn-sm btn-outline-secondary';

    const button = useRef<HTMLButtonElement>(null);

    // The notice leaves the page when what it reports is over - in the same commit as the press
    // for the callers that clear their state in the callback, or when the answer lands for the
    // ones that keep it up meanwhile - and a focused button that leaves the page drops the
    // keyboard to the body (WCAG 2.4.3). A layout effect's cleanup runs while the node is still in
    // the document, so it can see that the button held focus and hand the keyboard on: to the
    // group's own summary when the notice is inside a group, else to the calendar strip's toggle
    // (the strip's own notices, and tier 1's, which sits right under the strip), else to the block's
    // root, which takes focus without entering the tab order (Block.tsx).
    useLayoutEffect(() => () => {
        const node = button.current;
        if (!node || document.activeElement !== node) {
            return;
        }
        const block = node.closest('.block_compass');
        const target = node.closest('.compass-group')?.querySelector<HTMLElement>('summary')
            ?? block?.querySelector<HTMLElement>('.compass-cal-toggle')
            ?? block?.querySelector<HTMLElement>('.compass-body')
            ?? null;
        target?.focus();
    }, []);

    return (
        <div className="alert alert-warning compass-error compass-retry" role="alert">
            <span className="compass-retry-message">{message}</span>
            <span className="compass-retry-actions">
                <button
                    type="button"
                    ref={button}
                    className={classes}
                    aria-disabled={retrying || undefined}
                    onClick={() => {
                        if (!retrying) {
                            onRetry();
                        }
                    }}
                >
                    {retrying ? labels.reloading : labels.retry}
                </button>
                <button
                    type="button"
                    className="btn btn-link btn-sm compass-linkbtn"
                    onClick={() => window.location.reload()}
                >
                    {labels.reloadpage}
                </button>
            </span>
        </div>
    );
};

export default RetryNotice;
