var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * Details for the tier 3 rows somebody is actually looking at.
 *
 * One IntersectionObserver for the whole region, a pending set drained on a fixed interval,
 * and one request in flight at a time. A row registers itself as it appears and unregisters
 * as it goes, so no call site can be forgotten - which matters most in paged mode, where
 * every group arrives empty and every row is appended later.
 *
 * Three properties the design depends on:
 *
 * - The interval is fixed, not a debounce reset by each new id. A continuous scroll never
 *   settles, so a debounce would send nothing at all until the finger stopped.
 * - A row that leaves before its id goes out is dropped from the set rather than deferred:
 *   scrolling past hundreds of rows must not queue their batches behind the rows in view.
 * - A row is filled once. Its element is unobserved the moment its answer lands, so
 *   scrolling back over it costs nothing, and ids the server declined (an enrolment that
 *   ended, say) are marked filled too or they would be asked for on every scroll.
 *
 * A failed batch is not asked again on a scroll: the hook says it failed, and the region offers
 * Try again (RetryNotice), which re-watches the failed rows still on the page so the ones in view
 * are asked once more. There is no other way back: the block has no permanent reload control
 * (ADR-014 amendment 11).
 *
 * @module     block_compass/rowdetails
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { getCardDetails } from "./repository";
const BATCH = 24;
const BUFFER_PX = 200;
const FLUSH_MS = 100;
const useRowDetails = /* @__PURE__ */ __name(() => {
  const [records, setRecords] = useState({});
  const [waiting, setWaiting] = useState({});
  const [failed, setFailed] = useState(false);
  const pending = useRef(/* @__PURE__ */ new Set());
  const inflight = useRef([]);
  const filled = useRef(/* @__PURE__ */ new Set());
  const idofelement = useRef(/* @__PURE__ */ new Map());
  const elementofid = useRef(/* @__PURE__ */ new Map());
  const observer = useRef(null);
  const timer = useRef(null);
  const failedids = useRef(/* @__PURE__ */ new Set());
  const stop = useCallback(() => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  }, []);
  const release = useCallback((id) => {
    filled.current.add(id);
    const element = elementofid.current.get(id);
    if (element && observer.current) {
      observer.current.unobserve(element);
    }
  }, []);
  const flush = useCallback(async () => {
    if (inflight.current.length) {
      return;
    }
    if (!pending.current.size) {
      stop();
      return;
    }
    const batch = Array.from(pending.current).slice(0, BATCH);
    batch.forEach((id) => pending.current.delete(id));
    inflight.current = batch;
    try {
      const answer = await getCardDetails(batch);
      const arrived = {};
      answer.details.forEach((detail) => {
        arrived[detail.id] = {
          hascompletion: detail.hascompletion,
          progress: detail.progress,
          teacher: detail.teacher,
          imageurl: detail.imageurl,
          hasimage: detail.hasimage,
          badges: detail.badges
        };
      });
      setRecords((current) => ({ ...current, ...arrived }));
    } catch (e) {
      batch.forEach((id) => failedids.current.add(id));
      setFailed(true);
    } finally {
      batch.forEach(release);
      inflight.current = [];
      setWaiting((current) => {
        const next = { ...current };
        batch.forEach((id) => delete next[id]);
        return next;
      });
    }
  }, [release, stop]);
  const start = useCallback(() => {
    if (timer.current === null) {
      timer.current = window.setInterval(() => {
        flush();
      }, FLUSH_MS);
    }
  }, [flush]);
  const want = useCallback((id) => {
    if (filled.current.has(id) || pending.current.has(id) || inflight.current.includes(id)) {
      return;
    }
    pending.current.add(id);
    setWaiting((current) => ({ ...current, [id]: true }));
    start();
  }, [start]);
  const drop = useCallback((id) => {
    if (pending.current.delete(id)) {
      setWaiting((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  }, []);
  const observe = useCallback((id, element) => {
    if (filled.current.has(id)) {
      return () => {
        idofelement.current.delete(element);
      };
    }
    idofelement.current.set(element, id);
    elementofid.current.set(id, element);
    if (typeof IntersectionObserver === "undefined") {
      want(id);
    } else {
      if (!observer.current) {
        observer.current = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            const seen = idofelement.current.get(entry.target);
            if (seen === void 0) {
              return;
            }
            if (entry.isIntersecting) {
              want(seen);
            } else {
              drop(seen);
            }
          });
        }, { rootMargin: `${BUFFER_PX}px` });
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
  const retry = useCallback(() => {
    const ids = Array.from(failedids.current);
    failedids.current.clear();
    setFailed(false);
    ids.forEach((id) => {
      filled.current.delete(id);
      const element = elementofid.current.get(id);
      if (!element) {
        return;
      }
      if (observer.current) {
        observer.current.unobserve(element);
        observer.current.observe(element);
      } else {
        want(id);
      }
    });
  }, [want]);
  useEffect(() => () => {
    observer.current?.disconnect();
    observer.current = null;
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  }, []);
  return { records, waiting, failed, retry, observe };
}, "useRowDetails");
export {
  useRowDetails
};
//# sourceMappingURL=rowdetails.dev.js.map
