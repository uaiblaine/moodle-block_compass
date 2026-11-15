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
 * The block's icon tooltip: the name of an icon-only control, drawn by CSS (the Design System's tooltip.md, D51).
 *
 * The control is the host (tipHost(): compass-tiphost) and keeps its own aria-label; the tooltip is its
 * aria-hidden child repeating the name, never a title, whose delay is the browser's and which would draw a second
 * tooltip, and never core's Bootstrap tooltip, whose loader binds only the nodes present at load. The stylesheet
 * shows it after a 100 ms rest on hover, where the pointer can hover, and on keyboard focus; never while the host's
 * own menu or panel is open (aria-expanded); and never while Escape has put a group's tooltips off (useTipsOff()),
 * as a tooltip shown by hover must be dismissible without moving the pointer (WCAG 1.4.13). Once shown it takes the
 * pointer, so the pointer can move onto it. The closed calendar's view switch, Up next's hide button and the filter
 * bar's icon buttons draw it.
 *
 * @module     block_compass/Tip
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useEffect, useState} from 'react';

type TipProps = {
    text: string,
    // Which edge of the host the tooltip lines up with, for a host near a clipping edge; centred without one.
    align?: 'start' | 'end',
};

/**
 * The tooltip, the host's last child.
 *
 * @param {object} props Its text and its alignment; see TipProps.
 * @returns {object} The rendered tooltip.
 */
const Tip = ({text, align}: TipProps) => (
    <span className={align === undefined ? 'compass-tip' : `compass-tip compass-tip-${align}`} aria-hidden="true">
        {text}
    </span>
);

/**
 * A host's classes: its own, the host's, and the switch that puts its tooltip off.
 *
 * @param {string} classes The control's own classes.
 * @param {boolean} off Whether Escape has put the tooltips off.
 * @returns {string} The class attribute.
 */
export const tipHost = (classes: string, off: boolean): string => (off
    ? `${classes} compass-tiphost compass-tipsoff`
    : `${classes} compass-tiphost`);

/**
 * Whether Escape has put a group's tooltips off, and the call that puts them back.
 *
 * Escape anywhere puts them off, whatever else the key does: the listener is passive, so the key still closes a
 * menu, the search or the panel. The caller puts them back when the reader comes to the group again.
 *
 * @returns {Array} Whether they are off, and the call that puts them back on.
 */
export const useTipsOff = (): [boolean, () => void] => {
    const [off, setOff] = useState(false);

    useEffect(() => {
        /**
         * Put the tooltips off on Escape.
         *
         * @param {object} event The key event.
         * @returns {void}
         */
        const onkey = (event: {key: string}): void => {
            if (event.key === 'Escape') {
                setOff(true);
            }
        };
        document.addEventListener('keydown', onkey);

        return () => document.removeEventListener('keydown', onkey);
    }, []);

    return [off, () => setOff(false)];
};

export default Tip;
