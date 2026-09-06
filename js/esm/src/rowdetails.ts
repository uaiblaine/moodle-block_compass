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
 * Details for the tier 3 rows somebody is actually looking at (ADR-005).
 *
 * One IntersectionObserver for the whole region, a pending set drained on a fixed interval,
 * and one request in flight at a time. A row registers itself as it appears and unregisters
 * as it goes, so no call site can be forgotten - which matters most in paged mode, where
 * every group arrives empty and every row is appended later.
 *
 * Three properties are the point of the design and each cost something to get right:
 *
 * - The interval is fixed, not a debounce reset by each new id. A continuous scroll never
 *   settles, so a debounce would send nothing at all until the finger stopped.
 * - A row that leaves before its id goes out is dropped from the set rather than deferred:
 *   scrolling past 300 rows must not queue 300 requests behind the reader.
 * - A row is filled once. Its element is unobserved the moment its answer lands, so
 *   scrolling back over it costs nothing, and ids the server declined (an enrolment that
 *   ended, say) are marked filled too or they would be asked for on every scroll.
 *
 * @module     block_compass/rowdetails
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {getCardDetails} from './repository';
import type {RowDetail} from './types';

/** The service refuses more ids than this in one call (cards::DETAILS_BATCH). */
const BATCH = 24;

/** How far outside the viewport a row already counts as visible. */
const BUFFER_PX = 200;

/** The pending set is drained this often while it is not empty. */
const FLUSH_MS = 100;

/** What the hook hands back: what is known, what is being waited for, and how to register. */
export type RowDetails = {
    records: Record<number, RowDetail>,
    waiting: Record<number, boolean>,
    observe: (id: number, element: Element) => () => void,
};

/**
 * Fetch the details of the rows that come into view.
 *
 * @param {Function} onerror Called once, the first time a batch fails.
 * @returns {object} The records, the rows still waiting, and the registration function.
 */
export const useRowDetails = (onerror: () => void): RowDetails => {
    const [records, setRecords] = useState<Record<number, RowDetail>>({});
    // Why this is state and the sets below are refs: a skeleton is something the reader
    // sees, so it has to re-render; the bookkeeping the observer and the timer do must not.
    const [waiting, setWaiting] = useState<Record<number, boolean>>({});

    const pending = useRef<Set<number>>(new Set());
    const inflight = useRef<number[]>([]);
    const filled = useRef<Set<number>>(new Set());
    const idofelement = useRef<Map<Element, number>>(new Map());
    const elementofid = useRef<Map<number, Element>>(new Map());
    const observer = useRef<IntersectionObserver | null>(null);
    const timer = useRef<number | null>(null);
    const reported = useRef(false);
    const latesterror = useRef(onerror);

    useEffect(() => {
        latesterror.current = onerror;
    }, [onerror]);

    /**
     * Stop the interval; it is started again by the next row that needs something.
     *
     * @returns {void}
     */
    const stop = useCallback((): void => {
        if (timer.current !== null) {
            window.clearInterval(timer.current);
            timer.current = null;
        }
    }, []);

    /**
     * Mark an id answered and stop watching the element that asked.
     *
     * @param {number} id The course.
     * @returns {void}
     */
    const release = useCallback((id: number): void => {
        filled.current.add(id);
        const element = elementofid.current.get(id);
        if (element && observer.current) {
            observer.current.unobserve(element);
        }
    }, []);

    /**
     * Send the next batch, if there is one and nothing is already out.
     *
     * @returns {Promise} Resolves when the answer is in state, or the failure reported.
     */
    const flush = useCallback(async(): Promise<void> => {
        if (inflight.current.length) {
            return;
        }
        if (!pending.current.size) {
            stop();

            return;
        }
        // Insertion order, so the rows seen first are asked for first; whatever is over the
        // cap stays in the set and goes out on the next tick.
        const batch = Array.from(pending.current).slice(0, BATCH);
        batch.forEach((id) => pending.current.delete(id));
        inflight.current = batch;
        try {
            const answer = await getCardDetails(batch);
            const arrived: Record<number, RowDetail> = {};
            answer.details.forEach((detail) => {
                arrived[detail.id] = {
                    hascompletion: detail.hascompletion,
                    progress: detail.progress,
                    imageurl: detail.imageurl,
                    hasimage: detail.hasimage,
                };
            });
            setRecords((current) => ({...current, ...arrived}));
        } catch (e) {
            /*
             * Say so once, and stop waiting. Every id in the batch is marked answered below
             * whether or not this succeeded, which is deliberate: a row that keeps its
             * skeleton for ever is a lie, and re-asking on every scroll would hammer a server
             * that has already failed. The row simply shows no progress, which is what it
             * showed before this phase.
             */
            if (!reported.current) {
                reported.current = true;
                latesterror.current();
            }
        } finally {
            batch.forEach(release);
            inflight.current = [];
            setWaiting((current) => {
                const next = {...current};
                batch.forEach((id) => delete next[id]);

                return next;
            });
        }
    }, [release, stop]);

    /**
     * Start the interval unless it is already running.
     *
     * @returns {void}
     */
    const start = useCallback((): void => {
        if (timer.current === null) {
            timer.current = window.setInterval(() => {
                flush();
            }, FLUSH_MS);
        }
    }, [flush]);

    /**
     * A row is in view: ask for it, unless it has been asked for or answered already.
     *
     * @param {number} id The course.
     * @returns {void}
     */
    const want = useCallback((id: number): void => {
        if (filled.current.has(id) || pending.current.has(id) || inflight.current.includes(id)) {
            return;
        }
        pending.current.add(id);
        setWaiting((current) => ({...current, [id]: true}));
        start();
    }, [start]);

    /**
     * A row has left: drop it, unless its request is already out.
     *
     * @param {number} id The course.
     * @returns {void}
     */
    const drop = useCallback((id: number): void => {
        if (pending.current.delete(id)) {
            setWaiting((current) => {
                const next = {...current};
                delete next[id];

                return next;
            });
        }
    }, []);

    /**
     * Register a row's element with the region's observer, and stop when it goes.
     *
     * The observer is created here rather than in an effect, and that is not a detail:
     * effects run children first, so a row would register against an observer its parent
     * had not created yet and nothing would ever be watched.
     *
     * @param {number} id The course.
     * @param {object} element The element to watch.
     * @returns {Function} The cleanup, to be returned from the row's own effect.
     */
    const observe = useCallback((id: number, element: Element): (() => void) => {
        if (filled.current.has(id)) {
            return () => {
                idofelement.current.delete(element);
            };
        }
        idofelement.current.set(element, id);
        elementofid.current.set(id, element);
        if (typeof IntersectionObserver === 'undefined') {
            // No observer to gate on: ask for the row now rather than never showing it.
            want(id);
        } else {
            if (!observer.current) {
                observer.current = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        const seen = idofelement.current.get(entry.target);
                        if (seen === undefined) {
                            return;
                        }
                        if (entry.isIntersecting) {
                            want(seen);
                        } else {
                            drop(seen);
                        }
                    });
                }, {rootMargin: `${BUFFER_PX}px`});
            }
            observer.current.observe(element);
        }

        return () => {
            observer.current?.unobserve(element);
            idofelement.current.delete(element);
            if (elementofid.current.get(id) === element) {
                elementofid.current.delete(id);
            }
            drop(id);
        };
    }, [drop, want]);

    // The region is going: no observer, no interval, no request left waiting for a component
    // that will not be there to receive it.
    useEffect(() => () => {
        observer.current?.disconnect();
        observer.current = null;
        if (timer.current !== null) {
            window.clearInterval(timer.current);
            timer.current = null;
        }
    }, []);

    return {records, waiting, observe};
};
