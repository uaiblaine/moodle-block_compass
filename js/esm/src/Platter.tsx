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
 * A platter of pills: one row of toggle buttons on an inset track, one of them raised.
 *
 * The shape local_dimensions gives its filter tabs (ADR-009, decision 4), rewritten as a
 * component rather than reached as an AMD module, which a React component cannot import
 * (ADR-006). Its amd/src/filter_tabs_nav.js was read as the specification: a masked scroller
 * that hides its scrollbar, a sliding indicator under the first pressed pill, two scroll
 * paddles that appear only when the row overflows and disable at each edge, the arrow keys
 * moving focus between pills with wrap-around, and a ResizeObserver that recomputes when the
 * layout changes - which is also what makes the platter right once a hidden panel is shown,
 * since a hidden element lays out nothing.
 *
 * The paddles are decorative and mouse-only: aria-hidden with tabindex -1, the markup axe's own
 * aria-hidden-focus rule names as the fix, because the arrow keys already move between pills
 * and two more tab stops per platter would double every group's cost to a keyboard user.
 *
 * Selection is the caller's: this draws what it is given and reports a press.
 *
 * @module     block_compass/Platter
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import type {KeyboardEvent} from 'react';

/** One pill: its key, its label, an optional count, and whether it is pressed. */
export type PlatterItem = {
    key: string,
    label: string,
    count?: number | null,
    pressed: boolean,
};

type PlatterProps = {
    items: PlatterItem[],
    onPress: (key: string) => void,
    label?: string,
    labelledby?: string,
};

/** Where the indicator sits, in the items' own coordinates; hidden when nothing is pressed. */
type Indicator = {left: number, width: number, visible: boolean};

const HIDDEN_INDICATOR: Indicator = {left: 0, width: 0, visible: false};

/**
 * The platter.
 *
 * @param {object} props The pills, the press callback and the group's name; see PlatterProps.
 * @returns {object} The rendered group.
 */
const Platter = ({items, onPress, label, labelledby}: PlatterProps) => {
    const mask = useRef<HTMLDivElement>(null);
    const track = useRef<HTMLDivElement>(null);
    const [indicator, setIndicator] = useState<Indicator>(HIDDEN_INDICATOR);
    const [scrollable, setScrollable] = useState(false);
    const [atstart, setAtstart] = useState(true);
    const [atend, setAtend] = useState(true);
    const pressedkey = items.find((item) => item.pressed)?.key ?? null;

    /**
     * Whether the reader asked for less motion; read when needed rather than kept in state.
     *
     * @returns {boolean} Whether to skip the eased scroll.
     */
    const reducedmotion = (): boolean =>
        typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /**
     * Read the edges from the mask's scroll position.
     *
     * @returns {void}
     */
    const measureEdges = useCallback((): void => {
        const box = mask.current;
        if (!box) {
            return;
        }
        setAtstart(box.scrollLeft <= 1);
        setAtend(box.scrollLeft + box.clientWidth >= box.scrollWidth - 1);
    }, []);

    /**
     * Scroll the mask so that one pill is centred, eased unless motion is reduced.
     *
     * @param {object} pill The pill's element.
     * @returns {void}
     */
    const centre = useCallback((pill: HTMLElement): void => {
        const box = mask.current;
        if (!box) {
            return;
        }
        const target = pill.offsetLeft - (box.clientWidth - pill.offsetWidth) / 2;
        const left = Math.max(0, Math.min(target, box.scrollWidth - box.clientWidth));
        if (typeof box.scrollTo === 'function') {
            box.scrollTo({left, behavior: reducedmotion() ? 'auto' : 'smooth'});
        } else {
            box.scrollLeft = left;
        }
    }, []);

    /**
     * Put the indicator under the pressed pill and decide whether the row overflows.
     *
     * @returns {void}
     */
    const measure = useCallback((): void => {
        const box = mask.current;
        const row = track.current;
        if (!box || !row) {
            return;
        }
        setScrollable(row.scrollWidth > box.clientWidth + 1);
        const pressed = row.querySelector<HTMLElement>('.compass-chip[aria-pressed="true"]');
        if (!pressed) {
            setIndicator(HIDDEN_INDICATOR);
        } else {
            setIndicator({left: pressed.offsetLeft, width: pressed.offsetWidth, visible: true});
        }
        measureEdges();
    }, [measureEdges]);

    // The indicator follows the pressed pill, and the pressed pill is brought into view.
    useLayoutEffect(() => {
        measure();
        const row = track.current;
        const pressed = row?.querySelector<HTMLElement>('.compass-chip[aria-pressed="true"]');
        if (pressed) {
            centre(pressed);
        }
    }, [pressedkey, items.length, measure, centre]);

    // Layout can change under the platter - a panel shown, a drawer opened, a resize - and
    // a hidden element measures zero, so the observer is what makes the first paint right.
    useEffect(() => {
        const row = track.current;
        const box = mask.current;
        if (!row || !box || typeof ResizeObserver === 'undefined') {
            return undefined;
        }
        const observer = new ResizeObserver(() => measure());
        observer.observe(row);
        observer.observe(box);
        box.addEventListener('scroll', measureEdges, {passive: true});

        return () => {
            observer.disconnect();
            box.removeEventListener('scroll', measureEdges);
        };
    }, [measure, measureEdges]);

    /**
     * Arrow keys move between pills, wrapping at both ends, without the browser scrolling on its own.
     *
     * @param {object} event The keyboard event.
     * @returns {void}
     */
    const keydown = (event: KeyboardEvent<HTMLDivElement>): void => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
            return;
        }
        const pills = Array.from(track.current?.querySelectorAll<HTMLButtonElement>('.compass-chip') ?? []);
        const at = pills.indexOf(document.activeElement as HTMLButtonElement);
        if (at === -1) {
            return;
        }
        event.preventDefault();
        const next = event.key === 'ArrowRight' ? (at + 1) % pills.length : (at - 1 + pills.length) % pills.length;
        pills[next].focus({preventScroll: true});
        centre(pills[next]);
    };

    /**
     * A paddle press: bring the first pill hidden past that edge into the middle.
     *
     * @param {number} direction 1 for right, -1 for left.
     * @returns {void}
     */
    const page = (direction: number): void => {
        const box = mask.current;
        if (!box) {
            return;
        }
        const pills = Array.from(track.current?.querySelectorAll<HTMLElement>('.compass-chip') ?? []);
        const edge = box.getBoundingClientRect();
        const hidden = direction > 0
            ? pills.find((pill) => pill.getBoundingClientRect().right > edge.right + 2)
            : [...pills].reverse().find((pill) => pill.getBoundingClientRect().left < edge.left - 2);
        if (hidden) {
            centre(hidden);
        }
    };

    return (
        <div className="compass-platter" role="group" aria-label={label} aria-labelledby={labelledby}>
            <div className="compass-platter-mask" ref={mask}>
                <div className="compass-platter-items" ref={track} onKeyDown={keydown}>
                    <span
                        className={`compass-platter-indicator${indicator.visible ? '' : ' compass-platter-indicator-hidden'}`}
                        style={{left: `${indicator.left}px`, width: `${indicator.width}px`}}
                        aria-hidden="true"
                    ></span>
                    {items.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            className="compass-chip"
                            aria-pressed={item.pressed}
                            onClick={() => onPress(item.key)}
                        >
                            {item.label}
                            {item.count !== undefined && item.count !== null && (
                                <span className="compass-chip-count">{item.count}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
            {/* Decorative and mouse-only: the arrow keys already move between pills, and a paddle
                in the tab order would add two stops to every group (ADR-009, decision 4). */}
            <button
                type="button"
                className={`compass-paddle compass-paddle-left${scrollable ? '' : ' compass-paddle-hidden'}`}
                aria-hidden="true"
                tabIndex={-1}
                disabled={atstart}
                onClick={() => page(-1)}
            >
                &lsaquo;
            </button>
            <button
                type="button"
                className={`compass-paddle compass-paddle-right${scrollable ? '' : ' compass-paddle-hidden'}`}
                aria-hidden="true"
                tabIndex={-1}
                disabled={atend}
                onClick={() => page(1)}
            >
                &rsaquo;
            </button>
        </div>
    );
};

export default Platter;
