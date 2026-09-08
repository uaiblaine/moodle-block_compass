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
 * The one control that archives a course or brings it back (ADR-007, decision 4).
 *
 * Icon-only, named by its aria-label with the course in it, so a screen reader hears
 * "Archive Course 2" and not "button". The same component sits in a row and in a card,
 * which is what keeps the two views' accessible names identical - the Behat scenario
 * ADR-007 specifies asserts exactly these names.
 *
 * @module     block_compass/Archive
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {fill} from './str';
import type {BlockConfig} from './types';

type ArchiveProps = {
    courseid: number,
    name: string,
    archived: boolean,
    busy: boolean,
    config: BlockConfig,
    onArchive: (courseid: number, name: string, archived: boolean) => void,
};

/**
 * The button.
 *
 * @param {object} props The course, whether it is archived now, whether a write is out, the
 *     block config and the callback; see ArchiveProps.
 * @returns {object} The rendered button.
 */
const Archive = ({courseid, name, archived, busy, config, onArchive}: ArchiveProps) => {
    const {labels, icons} = config;
    const label = fill(archived ? labels.unarchive : labels.archive, name);

    return (
        <button
            type="button"
            className="compass-archive btn btn-link btn-sm p-0"
            aria-label={label}
            title={label}
            disabled={busy}
            onClick={(event) => {
                // The row's link is not an ancestor, but the card's stretched-link covers the
                // whole card: without this the click also follows the course link.
                event.preventDefault();
                event.stopPropagation();
                onArchive(courseid, name, !archived);
            }}
        >
            {/* A box, closed to archive and opened to bring back, from the plugin's own icon map: the
                eye core lent this control read as "open this course" (ADR-010, decision 2). */}
            <span aria-hidden="true" dangerouslySetInnerHTML={{__html: archived ? icons.unarchive : icons.archive}} />
        </button>
    );
};

export default Archive;
