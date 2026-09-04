# Bench: PostgreSQL 17 query plans for the tier 1 and inventory statements

Date: 2026-09-04. Stack: m502b's PostgreSQL 17.10 container (Docker on Apple
silicon), a separate schema `compass_bench` holding copies of the core tables
made with `CREATE TABLE ... (LIKE public.m_<table> INCLUDING ALL)` — same
columns, same indexes, own sequences — so nothing in the site's tables was
touched. Seeded with `generate_series`; the whole seed takes about a minute.

| Table | Rows | Notes |
|---|---|---|
| `user_enrolments` | 1 075 000 | 20 000 users × 50, 200 users × 300, 5 users × 3 000; ~5 % suspended; `timecreated` spread over two years |
| `enrol` | 110 000 | one `manual` instance per course, one enabled `self` instance on every tenth course |
| `course` | 100 000 | six categories, 2 % hidden, one context each |
| `user_lastaccess` | 645 000 | ~60 % of enrolments |
| `favourite` | 43 000 | ~4 % of enrolments, component `core_course`, itemtype `courses` |
| `course_completions` | 107 500 | 10 % of enrolments completed |

`user_enrolments` with its indexes is 189 MB. The statements are the Phase 1
queries of `classes/local/attention.php` and the two statements ADR-002
specifies, with literal values bound (`now` = 1725100000, window 30 days).
Full `EXPLAIN (ANALYZE, BUFFERS)` output is in the appendix; the seed and the
statements are reproducible from `docs/perf/bench.sql`.

## Execution time

| Statement | User with 50 enrolments | User with 3 000 enrolments | Sequential scans (3 000-user plan) |
|---|---|---|---|
| inventory stamp (one statement, seven aggregates) | 9.4 ms | 15.2 ms | mdl_enrol |
| inventory fill (per-enrolment rows + scalar aggregates) | 3.6 ms | 28.1 ms | mdl_enrol |
| tier 1 Continue | 3.4 ms | 19.2 ms | none |
| tier 1 New | 1.3 ms | 41.6 ms | mdl_course, mdl_enrol |
| tier 1 Favourites | 0.0 ms | 53.1 ms | none |
| tier 1 counts | 0.3 ms | 23.2 ms | mdl_enrol |

The fill row was re-measured later the same day, after `ue.timemodified AS uemodified`
was added to the benched statement so that its column set matches the shipped
`inventory::fill()` exactly (the column comes from a row already scanned; the plan
did not change, the timings moved within run-to-run noise). The appendix holds the
re-run plans.

Reading the table:

- Every statement is index-driven for the ordinary user: no sequential scan,
  single-digit milliseconds, and the whole first paint (Continue + New +
  Favourites + counts) is under 6 ms of database time.
- For the 3 000-enrolment user the planner joins the 3 000 enrolment rows to
  `enrol` (110 000 rows) and `course` (100 000 rows) with hash joins fed by
  sequential scans, because at this table size hashing the whole small table
  is cheaper than 3 000 index probes. Those scans are an artefact of the bench's
  dimension tables being small; with `enrol` and `course` in the millions the
  cost model flips to index nested loops and the per-row cost falls. Even so,
  the heaviest user's first paint totals about 140 ms of database time here,
  inside PLAN.md §6.6's 150 ms p95 for `get_attention` on a laptop container.
- The inventory fill for 3 000 rows costs 28 ms and the stamp 15 ms; the stamp
  for an ordinary user is under 10 ms. Both are one statement each.

## Inventory entry size (PHP 8.4, `serialize()` vs igbinary)

Measured inside the m502 webserver container. First with eight integers per
row (the draft's shape), then with the ten-integer rows ADR-002 settled on,
keyed by an eight-digit `ue.id` and holding 10-digit timestamps:

| Rows | 8 ints, `serialize()` | 8 ints, igbinary | 10 ints keyed by ue.id, `serialize()` | 10 ints, igbinary |
|---|---|---|---|---|
| 300 | 28.8 KB | 13.3 KB | 40.9 KB | 18.4 KB |
| 2 000 | 193 KB | 90 KB | 272 KB | 122 KB |
| 3 000 | 290 KB | 135 KB | 408 KB | 183 KB |

The MUC Redis store serialises with PHP's `serialize()` by default
(`cache/stores/redis/lib.php`, `Redis::SERIALIZER_PHP`); igbinary is a
per-store-instance option an administrator chooses when phpredis was built
with it. So the 2 000-enrolment entry PLAN.md §6.2 estimated at 60 KB is
272 KB on a default store and 122 KB with igbinary selected — worth a line in
the README's cache-store section (Phase 7).

## Phase 3 candidates (measured 2026-09-04, same schema)

Two records were drafted from these numbers: ADR-004 (paged mode) and ADR-003
(pre-warming). The paged-mode statements below are the **SQL alternatives**
the record rejects in favour of deriving headers, pages and search from the
inventory entry ADR-002 already validates; they are measured so that the
rejection rests on numbers. The pre-warming statement is the one ADR-003 keeps.

| Statement | User with 50 enrolments | User with 3 000 enrolments | Sequential scans (3 000-user plan) |
|---|---|---|---|
| paged headers: `GROUP BY c.category` over the user's active visible enrolments | 1.5 ms | 101.4 ms | mdl_enrol (parallel) |
| paged page: one group, keyset `(fullname, id)`, `LIMIT 100` | 0.2 ms | 241.6 ms | mdl_enrol (parallel) |
| paged search: `ILIKE` on fullname/shortname, `LIMIT 50` | 0.2 ms | 34.0 ms | mdl_course (parallel) |

Pre-warming selection over a `{user}` copy of **1 000 000** rows (18 % active
inside 7 days, 12 % inside 30, 30 % older, 40 % never; 1 % deleted, 2 %
suspended — **175 219** users qualify for a 7-day window):

| Statement | Execution time | Plan |
|---|---|---|
| batch of 200 by keyset on `id`, cursor 0 | 0.27 ms | Index Scan on the primary key, window as filter |
| batch of 200, cursor 500 000 | 0.53 ms | same |
| remaining count (progress line) | 82.7 ms | Parallel Index Only Scan on the primary key |

The `lastaccess` index (`m_user_las2_ix`) exists but the ordered keyset makes
the primary key the cheaper access path for the resumable scan.

## Appendix: plans

<details><summary>User with 3 000 enrolments</summary>

```
SET
=== STAMP (user 20203) ===
                                                                           QUERY PLAN                                                                           
----------------------------------------------------------------------------------------------------------------------------------------------------------------
 Aggregate  (cost=15692.73..15692.74 rows=1 width=56) (actual time=15.153..15.157 rows=1 loops=1)
   Buffers: shared hit=2070 read=5 written=5
   InitPlan 1
     ->  Aggregate  (cost=3522.79..3522.80 rows=1 width=8) (actual time=0.400..0.401 rows=1 loops=1)
           Buffers: shared hit=19
           ->  Bitmap Heap Scan on mdl_user_lastaccess la  (cost=22.26..3518.33 rows=1785 width=8) (actual time=0.056..0.296 rows=1800 loops=1)
                 Recheck Cond: (userid = 20203)
                 Heap Blocks: exact=15
                 Buffers: shared hit=19
                 ->  Bitmap Index Scan on mdl_user_lastaccess_userid_idx  (cost=0.00..21.81 rows=1785 width=0) (actual time=0.042..0.042 rows=1800 loops=1)
                       Index Cond: (userid = 20203)
                       Buffers: shared hit=4
   InitPlan 2
     ->  Aggregate  (cost=294.85..294.86 rows=1 width=8) (actual time=0.042..0.043 rows=1 loops=1)
           Buffers: shared hit=5
           ->  Bitmap Heap Scan on mdl_favourite f  (cost=5.19..294.56 rows=116 width=0) (actual time=0.025..0.038 rows=120 loops=1)
                 Recheck Cond: (userid = 20203)
                 Filter: (((component)::text = 'core_course'::text) AND ((itemtype)::text = 'courses'::text))
                 Heap Blocks: exact=3
                 Buffers: shared hit=5
                 ->  Bitmap Index Scan on mdl_favourite_userid_idx  (cost=0.00..5.16 rows=116 width=0) (actual time=0.017..0.017 rows=120 loops=1)
                       Index Cond: (userid = 20203)
                       Buffers: shared hit=2
   InitPlan 3
     ->  Aggregate  (cost=294.85..294.86 rows=1 width=8) (actual time=0.023..0.023 rows=1 loops=1)
           Buffers: shared hit=5
           ->  Bitmap Heap Scan on mdl_favourite f2  (cost=5.19..294.56 rows=116 width=8) (actual time=0.009..0.017 rows=120 loops=1)
                 Recheck Cond: (userid = 20203)
                 Filter: (((component)::text = 'core_course'::text) AND ((itemtype)::text = 'courses'::text))
                 Heap Blocks: exact=3
                 Buffers: shared hit=5
                 ->  Bitmap Index Scan on mdl_favourite_userid_idx  (cost=0.00..5.16 rows=116 width=0) (actual time=0.007..0.007 rows=120 loops=1)
                       Index Cond: (userid = 20203)
                       Buffers: shared hit=2
   ->  Hash Join  (cost=7882.41..11546.16 rows=3404 width=24) (actual time=0.828..14.496 rows=3000 loops=1)
         Hash Cond: (e.id = ue.enrolid)
         Buffers: shared hit=2041 read=5 written=5
         ->  Seq Scan on mdl_enrol e  (cost=0.00..3374.99 rows=109998 width=16) (actual time=0.007..8.128 rows=109999 loops=1)
               Filter: (courseid <> 1)
               Buffers: shared hit=2000
         ->  Hash  (cost=7839.86..7839.86 rows=3404 width=24) (actual time=0.797..0.798 rows=3000 loops=1)
               Buckets: 4096  Batches: 1  Memory Usage: 197kB
               Buffers: shared hit=41 read=5 written=5
               ->  Bitmap Heap Scan on mdl_user_enrolments ue  (cost=42.81..7839.86 rows=3404 width=24) (actual time=0.356..0.576 rows=3000 loops=1)
                     Recheck Cond: (userid = 20203)
                     Heap Blocks: exact=38
                     Buffers: shared hit=41 read=5 written=5
                     ->  Bitmap Index Scan on mdl_user_enrolments_userid_idx  (cost=0.00..41.96 rows=3404 width=0) (actual time=0.344..0.344 rows=3000 loops=1)
                           Index Cond: (userid = 20203)
                           Buffers: shared hit=3 read=5 written=5
 Planning:
   Buffers: shared hit=461 read=18 written=18
 Planning Time: 1.764 ms
 Execution Time: 15.237 ms
(54 rows)

=== FILL (user 20203) ===
                                                                                      QUERY PLAN                                                                                      
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Gather  (cost=13256.34..18071.69 rows=3404 width=108) (actual time=1.619..27.899 rows=3000 loops=1)
   Workers Planned: 1
   Workers Launched: 1
   Buffers: shared hit=12925
   InitPlan 1
     ->  Aggregate  (cost=3522.79..3522.80 rows=1 width=8) (actual time=0.295..0.296 rows=1 loops=1)
           Buffers: shared hit=22
           ->  Bitmap Heap Scan on mdl_user_lastaccess la2  (cost=22.26..3518.33 rows=1785 width=8) (actual time=0.085..0.234 rows=1800 loops=1)
                 Recheck Cond: (userid = 20203)
                 Heap Blocks: exact=15
                 Buffers: shared hit=22
                 ->  Bitmap Index Scan on mdl_user_lastaccess_userid_idx  (cost=0.00..21.81 rows=1785 width=0) (actual time=0.075..0.076 rows=1800 loops=1)
                       Index Cond: (userid = 20203)
                       Buffers: shared hit=7
   InitPlan 2
     ->  Aggregate  (cost=294.85..294.86 rows=1 width=8) (actual time=0.064..0.065 rows=1 loops=1)
           Buffers: shared hit=5
           ->  Bitmap Heap Scan on mdl_favourite f3  (cost=5.19..294.56 rows=116 width=0) (actual time=0.037..0.061 rows=120 loops=1)
                 Recheck Cond: (userid = 20203)
                 Filter: (((component)::text = 'core_course'::text) AND ((itemtype)::text = 'courses'::text))
                 Heap Blocks: exact=3
                 Buffers: shared hit=5
                 ->  Bitmap Index Scan on mdl_favourite_userid_idx  (cost=0.00..5.16 rows=116 width=0) (actual time=0.030..0.030 rows=120 loops=1)
                       Index Cond: (userid = 20203)
                       Buffers: shared hit=2
   InitPlan 3
     ->  Aggregate  (cost=294.85..294.86 rows=1 width=8) (actual time=0.018..0.018 rows=1 loops=1)
           Buffers: shared hit=5
           ->  Bitmap Heap Scan on mdl_favourite f4  (cost=5.19..294.56 rows=116 width=8) (actual time=0.005..0.013 rows=120 loops=1)
                 Recheck Cond: (userid = 20203)
                 Filter: (((component)::text = 'core_course'::text) AND ((itemtype)::text = 'courses'::text))
                 Heap Blocks: exact=3
                 Buffers: shared hit=5
                 ->  Bitmap Index Scan on mdl_favourite_userid_idx  (cost=0.00..5.16 rows=116 width=0) (actual time=0.004..0.004 rows=120 loops=1)
                       Index Cond: (userid = 20203)
                       Buffers: shared hit=2
   ->  Hash Left Join  (cost=8143.81..12618.76 rows=2002 width=108) (actual time=0.476..23.391 rows=1500 loops=2)
         Hash Cond: (e.courseid = f.itemid)
         Buffers: shared hit=12893
         ->  Nested Loop Left Join  (cost=7847.79..12315.22 rows=2002 width=88) (actual time=0.438..23.116 rows=1500 loops=2)
               Buffers: shared hit=12882
               ->  Parallel Hash Join  (cost=7847.37..10826.05 rows=2002 width=80) (actual time=0.403..20.819 rows=1500 loops=2)
                     Hash Cond: (e.id = ue.enrolid)
                     Buffers: shared hit=2078
                     ->  Parallel Seq Scan on mdl_enrol e  (cost=0.00..2808.82 rows=64705 width=32) (actual time=0.012..16.317 rows=55000 loops=2)
                           Filter: (courseid <> 1)
                           Buffers: shared hit=2000
                     ->  Parallel Hash  (cost=7822.34..7822.34 rows=2002 width=64) (actual time=0.363..0.363 rows=1500 loops=2)
                           Buckets: 4096  Batches: 1  Memory Usage: 320kB
                           Buffers: shared hit=43
                           ->  Parallel Bitmap Heap Scan on mdl_user_enrolments ue  (cost=42.81..7822.34 rows=2002 width=64) (actual time=0.094..0.453 rows=3000 loops=1)
                                 Recheck Cond: (userid = 20203)
                                 Heap Blocks: exact=38
                                 Buffers: shared hit=43
                                 ->  Bitmap Index Scan on mdl_user_enrolments_userid_idx  (cost=0.00..41.96 rows=3404 width=0) (actual time=0.075..0.075 rows=3000 loops=1)
                                       Index Cond: (userid = 20203)
                                       Buffers: shared hit=5
               ->  Index Scan using mdl_user_lastaccess_userid_courseid_idx on mdl_user_lastaccess la  (cost=0.42..0.73 rows=1 width=24) (actual time=0.001..0.001 rows=1 loops=3000)
                     Index Cond: ((userid = 20203) AND (courseid = e.courseid))
                     Buffers: shared hit=10804
         ->  Hash  (cost=294.56..294.56 rows=116 width=24) (actual time=0.031..0.032 rows=120 loops=2)
               Buckets: 1024  Batches: 1  Memory Usage: 15kB
               Buffers: shared hit=11
               ->  Bitmap Heap Scan on mdl_favourite f  (cost=5.19..294.56 rows=116 width=24) (actual time=0.013..0.023 rows=120 loops=2)
                     Recheck Cond: (userid = 20203)
                     Filter: (((component)::text = 'core_course'::text) AND ((itemtype)::text = 'courses'::text))
                     Heap Blocks: exact=3
                     Buffers: shared hit=11
                     ->  Bitmap Index Scan on mdl_favourite_userid_idx  (cost=0.00..5.16 rows=116 width=0) (actual time=0.008..0.008 rows=120 loops=2)
                           Index Cond: (userid = 20203)
                           Buffers: shared hit=5
 Planning:
   Buffers: shared hit=587 read=6
 Planning Time: 6.086 ms
 Execution Time: 28.132 ms
(75 rows)

=== CONTINUE (user 20203) ===
                                                                                                QUERY PLAN                                                                                                
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Limit  (cost=4714.10..5157.45 rows=3 width=91) (actual time=18.499..18.652 rows=3 loops=1)
   Buffers: shared hit=232 read=100 written=39
   ->  Incremental Sort  (cost=4714.10..13580.99 rows=60 width=91) (actual time=18.497..18.649 rows=3 loops=1)
         Sort Key: la.timeaccess DESC, c.fullname, c.id
         Presorted Key: la.timeaccess
         Full-sort Groups: 1  Sort Method: top-N heapsort  Average Memory: 25kB  Peak Memory: 25kB
         Buffers: shared hit=232 read=100 written=39
         ->  Nested Loop Anti Join  (cost=4563.85..13578.29 rows=60 width=91) (actual time=13.512..18.549 rows=8 loops=1)
               Buffers: shared hit=229 read=100 written=39
               ->  Nested Loop Left Join  (cost=4563.56..13556.02 rows=60 width=95) (actual time=5.416..18.119 rows=15 loops=1)
                     Buffers: shared hit=173 read=100 written=39
                     ->  Nested Loop Semi Join  (cost=4563.15..13526.25 rows=60 width=87) (actual time=5.113..17.537 rows=15 loops=1)
                           Buffers: shared hit=121 read=100 written=39
                           ->  Nested Loop  (cost=4562.43..10855.32 rows=1749 width=95) (actual time=4.580..12.150 rows=15 loops=1)
                                 Join Filter: (la.courseid = c.id)
                                 Buffers: shared hit=61 read=55 written=22
                                 ->  Nested Loop  (cost=4562.13..10063.09 rows=1785 width=56) (actual time=4.136..8.526 rows=15 loops=1)
                                       Buffers: shared hit=45 read=26 written=10
                                       ->  Gather Merge  (cost=4561.84..4765.28 rows=1785 width=16) (actual time=3.759..3.930 rows=15 loops=1)
                                             Workers Planned: 1
                                             Workers Launched: 1
                                             Buffers: shared hit=26
                                             ->  Sort  (cost=3561.83..3564.46 rows=1050 width=16) (actual time=0.771..0.779 rows=8 loops=2)
                                                   Sort Key: la.timeaccess DESC
                                                   Sort Method: quicksort  Memory: 105kB
                                                   Buffers: shared hit=26
                                                   Worker 0:  Sort Method: quicksort  Memory: 25kB
                                                   ->  Parallel Bitmap Heap Scan on mdl_user_lastaccess la  (cost=22.26..3509.14 rows=1050 width=16) (actual time=0.191..0.323 rows=900 loops=2)
                                                         Recheck Cond: (userid = 20203)
                                                         Heap Blocks: exact=15
                                                         Buffers: shared hit=19
                                                         ->  Bitmap Index Scan on mdl_user_lastaccess_userid_idx  (cost=0.00..21.81 rows=1785 width=0) (actual time=0.334..0.334 rows=1800 loops=1)
                                                               Index Cond: (userid = 20203)
                                                               Buffers: shared hit=4
                                       ->  Index Scan using mdl_context_instanceid_idx on mdl_context ctx  (cost=0.29..2.97 rows=1 width=40) (actual time=0.303..0.303 rows=1 loops=15)
                                             Index Cond: (instanceid = la.courseid)
                                             Filter: (contextlevel = 50)
                                             Buffers: shared hit=19 read=26 written=10
                                 ->  Index Scan using mdl_course_pkey on mdl_course c  (cost=0.29..0.43 rows=1 width=39) (actual time=0.239..0.239 rows=1 loops=15)
                                       Index Cond: (id = ctx.instanceid)
                                       Filter: ((id <> 1) AND (visible = 1))
                                       Buffers: shared hit=16 read=29 written=12
                           ->  Nested Loop  (cost=0.72..1.52 rows=1 width=8) (actual time=0.357..0.357 rows=1 loops=15)
                                 Buffers: shared hit=60 read=45 written=17
                                 ->  Index Scan using mdl_enrol_courseid_idx on mdl_enrol ea  (cost=0.29..0.41 rows=1 width=16) (actual time=0.311..0.311 rows=1 loops=15)
                                       Index Cond: (courseid = c.id)
                                       Filter: (status = 0)
                                       Buffers: shared hit=30 read=15 written=6
                                 ->  Index Scan using mdl_user_enrolments_enrolid_userid_idx on mdl_user_enrolments uea  (cost=0.43..1.11 rows=1 width=8) (actual time=0.043..0.043 rows=1 loops=15)
                                       Index Cond: ((enrolid = ea.id) AND (userid = 20203))
                                       Filter: ((timestart <= 1725100000) AND (status = 0) AND ((timeend = 0) OR (timeend > 1725100000)))
                                       Buffers: shared hit=30 read=30 written=11
                     ->  Index Scan using mdl_favourite_component_itemtype_itemid_contextid_userid_idx on mdl_favourite ffa  (cost=0.41..0.49 rows=1 width=16) (actual time=0.021..0.021 rows=0 loops=15)
                           Index Cond: (((component)::text = 'core_course'::text) AND ((itemtype)::text = 'courses'::text) AND (itemid = c.id) AND (userid = 20203))
                           Buffers: shared hit=52
               ->  Index Scan using mdl_course_completions_course_idx on mdl_course_completions cc  (cost=0.29..0.37 rows=1 width=8) (actual time=0.027..0.027 rows=0 loops=15)
                     Index Cond: (course = c.id)
                     Filter: ((timecompleted IS NOT NULL) AND (userid = 20203))
                     Rows Removed by Filter: 1
                     Buffers: shared hit=56
 Planning:
   Buffers: shared hit=380 read=19 written=19
 Planning Time: 13.161 ms
 Execution Time: 19.250 ms
(64 rows)

=== NEW (user 20203) ===
                                                                                                            QUERY PLAN                                                                                                            
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Limit  (cost=16375.35..16464.53 rows=3 width=121) (actual time=39.566..41.244 rows=3 loops=1)
   Buffers: shared hit=4176 read=2638 written=2363
   ->  Nested Loop Left Join  (cost=16375.35..47231.63 rows=1038 width=121) (actual time=39.565..41.242 rows=3 loops=1)
         Buffers: shared hit=4176 read=2638 written=2363
         ->  Nested Loop  (cost=16374.94..46716.69 rows=1038 width=117) (actual time=39.546..41.197 rows=3 loops=1)
               Buffers: shared hit=4167 read=2638 written=2363
               ->  Nested Loop  (cost=16374.65..46341.38 rows=1038 width=85) (actual time=39.513..40.873 rows=3 loops=1)
                     Buffers: shared hit=4164 read=2632 written=2357
                     ->  Nested Loop  (cost=16374.35..46010.71 rows=1038 width=79) (actual time=39.471..40.440 rows=3 loops=1)
                           Buffers: shared hit=4158 read=2629 written=2354
                           ->  Nested Loop Anti Join  (cost=16353.93..17287.26 rows=1038 width=55) (actual time=39.096..39.486 rows=3 loops=1)
                                 Buffers: shared hit=4138 read=2616 written=2341
                                 ->  Gather Merge  (cost=16353.50..16473.97 rows=1057 width=55) (actual time=39.072..39.449 rows=3 loops=1)
                                       Workers Planned: 1
                                       Workers Launched: 1
                                       Buffers: shared hit=4129 read=2616 written=2341
                                       ->  Sort  (cost=15353.49..15355.05 rows=622 width=55) (actual time=37.439..37.443 rows=25 loops=2)
                                             Sort Key: x.timecreated DESC, c.fullname, x.courseid
                                             Sort Method: quicksort  Memory: 30kB
                                             Buffers: shared hit=4129 read=2616 written=2341
                                             Worker 0:  Sort Method: quicksort  Memory: 28kB
                                             ->  Hash Join  (cost=11658.96..15324.63 rows=622 width=55) (actual time=15.220..37.369 rows=57 loops=2)
                                                   Hash Cond: (c.id = x.courseid)
                                                   Buffers: shared hit=4109 read=2616 written=2341
                                                   ->  Parallel Seq Scan on mdl_course c  (cost=0.00..3514.35 rows=57639 width=39) (actual time=0.010..19.898 rows=49000 loops=2)
                                                         Filter: ((id <> 1) AND (visible = 1))
                                                         Rows Removed by Filter: 1000
                                                         Buffers: shared hit=16 read=2616 written=2341
                                                   ->  Hash  (cost=11645.48..11645.48 rows=1079 width=16) (actual time=15.022..15.025 rows=114 loops=2)
                                                         Buckets: 2048  Batches: 1  Memory Usage: 22kB
                                                         Buffers: shared hit=4090
                                                         ->  Subquery Scan on x  (cost=11594.24..11645.48 rows=1079 width=16) (actual time=14.859..14.998 rows=114 loops=2)
                                                               Buffers: shared hit=4090
                                                               ->  HashAggregate  (cost=11594.24..11634.69 rows=1079 width=16) (actual time=14.858..14.990 rows=114 loops=2)
                                                                     Group Key: ex.courseid
                                                                     Filter: (min(uex.timecreated) > 1722508000)
                                                                     Batches: 1  Memory Usage: 369kB
                                                                     Rows Removed by Filter: 2736
                                                                     Buffers: shared hit=4090
                                                                     Worker 0:  Batches: 1  Memory Usage: 369kB
                                                                     ->  Hash Join  (cost=7914.31..11578.06 rows=3236 width=16) (actual time=0.581..14.125 rows=2850 loops=2)
                                                                           Hash Cond: (ex.id = uex.enrolid)
                                                                           Buffers: shared hit=4090
                                                                           ->  Seq Scan on mdl_enrol ex  (cost=0.00..3374.99 rows=109999 width=16) (actual time=0.005..7.563 rows=109999 loops=2)
                                                                                 Filter: (status = 0)
                                                                                 Buffers: shared hit=4000
                                                                           ->  Hash  (cost=7873.86..7873.86 rows=3236 width=16) (actual time=0.551..0.552 rows=2850 loops=2)
                                                                                 Buckets: 4096  Batches: 1  Memory Usage: 166kB
                                                                                 Buffers: shared hit=90
                                                                                 ->  Bitmap Heap Scan on mdl_user_enrolments uex  (cost=42.77..7873.86 rows=3236 width=16) (actual time=0.054..0.319 rows=2850 loops=2)
                                                                                       Recheck Cond: (userid = 20203)
                                                                                       Filter: ((timestart <= 1725100000) AND (status = 0) AND ((timeend = 0) OR (timeend > 1725100000)))
                                                                                       Rows Removed by Filter: 150
                                                                                       Heap Blocks: exact=38
                                                                                       Buffers: shared hit=90
                                                                                       ->  Bitmap Index Scan on mdl_user_enrolments_userid_idx  (cost=0.00..41.96 rows=3404 width=0) (actual time=0.045..0.045 rows=3000 loops=2)
                                                                                             Index Cond: (userid = 20203)
                                                                                             Buffers: shared hit=14
                                 ->  Index Only Scan using mdl_user_lastaccess_userid_courseid_idx on mdl_user_lastaccess la  (cost=0.42..0.77 rows=1 width=8) (actual time=0.010..0.010 rows=0 loops=3)
                                       Index Cond: ((userid = 20203) AND (courseid = c.id))
                                       Heap Fetches: 0
                                       Buffers: shared hit=9
                           ->  Index Scan using mdl_user_enrolments_pkey on mdl_user_enrolments ue  (cost=20.43..27.67 rows=1 width=32) (actual time=0.150..0.150 rows=1 loops=3)
                                 Index Cond: (id = (SubPlan 1))
                                 Buffers: shared hit=7 read=5 written=5
                                 SubPlan 1
                                   ->  Aggregate  (cost=19.99..20.00 rows=1 width=8) (actual time=0.164..0.164 rows=1 loops=3)
                                         Buffers: shared hit=13 read=8 written=8
                                         ->  Nested Loop  (cost=0.72..19.99 rows=1 width=8) (actual time=0.162..0.162 rows=1 loops=3)
                                               Buffers: shared hit=13 read=8 written=8
                                               ->  Index Scan using mdl_enrol_courseid_idx on mdl_enrol ez  (cost=0.29..8.31 rows=1 width=8) (actual time=0.127..0.128 rows=1 loops=3)
                                                     Index Cond: (courseid = x.courseid)
                                                     Filter: (status = 0)
                                                     Buffers: shared hit=6 read=3 written=3
                                               ->  Index Scan using mdl_user_enrolments_enrolid_userid_idx on mdl_user_enrolments uez  (cost=0.43..8.46 rows=1 width=16) (actual time=0.033..0.033 rows=1 loops=3)
                                                     Index Cond: ((enrolid = ez.id) AND (userid = 20203))
                                                     Filter: ((timestart <= 1725100000) AND (timecreated = x.timecreated) AND (status = 0) AND ((timeend = 0) OR (timeend > 1725100000)))
                                                     Buffers: shared hit=7 read=5 written=5
                     ->  Index Scan using mdl_enrol_pkey on mdl_enrol e  (cost=0.29..0.32 rows=1 width=22) (actual time=0.142..0.142 rows=1 loops=3)
                           Index Cond: (id = ue.enrolid)
                           Buffers: shared hit=6 read=3 written=3
               ->  Index Scan using mdl_context_instanceid_idx on mdl_context ctx  (cost=0.29..0.36 rows=1 width=40) (actual time=0.107..0.107 rows=1 loops=3)
                     Index Cond: (instanceid = c.id)
                     Filter: (contextlevel = 50)
                     Buffers: shared hit=3 read=6 written=6
         ->  Index Scan using mdl_favourite_component_itemtype_itemid_contextid_userid_idx on mdl_favourite ffa  (cost=0.41..0.49 rows=1 width=16) (actual time=0.013..0.013 rows=0 loops=3)
               Index Cond: (((component)::text = 'core_course'::text) AND ((itemtype)::text = 'courses'::text) AND (itemid = c.id) AND (userid = 20203))
               Buffers: shared hit=9
 Planning:
   Buffers: shared hit=74
 Planning Time: 1.290 ms
 Execution Time: 41.579 ms
(92 rows)

=== FAVOURITES (user 20203) ===
                                                                                           QUERY PLAN                                                                                           
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Limit  (cost=1346.68..1346.69 rows=3 width=83) (actual time=53.095..53.098 rows=3 loops=1)
   Buffers: shared hit=999 read=546 written=437
   ->  Sort  (cost=1346.68..1346.69 rows=4 width=83) (actual time=53.094..53.096 rows=3 loops=1)
         Sort Key: c.fullname, c.id
         Sort Method: top-N heapsort  Memory: 25kB
         Buffers: shared hit=999 read=546 written=437
         ->  Nested Loop  (cost=6.49..1346.64 rows=4 width=83) (actual time=0.849..52.891 rows=118 loops=1)
               Buffers: shared hit=999 read=546 written=437
               ->  Nested Loop Semi Join  (cost=6.20..1345.20 rows=4 width=55) (actual time=0.612..33.621 rows=118 loops=1)
                     Buffers: shared hit=861 read=330 written=265
                     ->  Nested Loop  (cost=5.48..1171.10 rows=114 width=47) (actual time=0.222..11.186 rows=118 loops=1)
                           Buffers: shared hit=257 read=108 written=87
                           ->  Bitmap Heap Scan on mdl_favourite f  (cost=5.19..294.56 rows=116 width=8) (actual time=0.014..0.118 rows=120 loops=1)
                                 Recheck Cond: (userid = 20203)
                                 Filter: (((component)::text = 'core_course'::text) AND ((itemtype)::text = 'courses'::text))
                                 Heap Blocks: exact=3
                                 Buffers: shared hit=5
                                 ->  Bitmap Index Scan on mdl_favourite_userid_idx  (cost=0.00..5.16 rows=116 width=0) (actual time=0.007..0.007 rows=120 loops=1)
                                       Index Cond: (userid = 20203)
                                       Buffers: shared hit=2
                           ->  Index Scan using mdl_course_pkey on mdl_course c  (cost=0.29..7.56 rows=1 width=39) (actual time=0.091..0.091 rows=1 loops=120)
                                 Index Cond: (id = f.itemid)
                                 Filter: ((id <> 1) AND (visible = 1))
                                 Rows Removed by Filter: 0
                                 Buffers: shared hit=252 read=108 written=87
                     ->  Nested Loop  (cost=0.72..1.52 rows=1 width=8) (actual time=0.189..0.189 rows=1 loops=118)
                           Buffers: shared hit=604 read=222 written=178
                           ->  Index Scan using mdl_enrol_courseid_idx on mdl_enrol ef  (cost=0.29..0.41 rows=1 width=16) (actual time=0.164..0.164 rows=1 loops=118)
                                 Index Cond: (courseid = c.id)
                                 Filter: (status = 0)
                                 Buffers: shared hit=249 read=105 written=82
                           ->  Index Scan using mdl_user_enrolments_enrolid_userid_idx on mdl_user_enrolments uef  (cost=0.43..1.11 rows=1 width=8) (actual time=0.024..0.024 rows=1 loops=118)
                                 Index Cond: ((enrolid = ef.id) AND (userid = 20203))
                                 Filter: ((timestart <= 1725100000) AND (status = 0) AND ((timeend = 0) OR (timeend > 1725100000)))
                                 Buffers: shared hit=355 read=117 written=96
               ->  Index Scan using mdl_context_instanceid_idx on mdl_context ctx  (cost=0.29..0.36 rows=1 width=40) (actual time=0.162..0.162 rows=1 loops=118)
                     Index Cond: (instanceid = c.id)
                     Filter: (contextlevel = 50)
                     Buffers: shared hit=138 read=216 written=172
 Planning:
   Buffers: shared hit=65
 Planning Time: 0.667 ms
 Execution Time: 53.126 ms
(43 rows)

=== COUNTS (user 20203) ===
                                                                                             QUERY PLAN                                                                                             
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Aggregate  (cost=16921.22..16921.23 rows=1 width=24) (actual time=23.172..23.175 rows=1 loops=1)
   Buffers: shared hit=10468 read=149 written=45
   ->  Hash Left Join  (cost=13376.78..16889.51 rows=3171 width=24) (actual time=22.522..23.066 rows=2789 loops=1)
         Hash Cond: (x.courseid = ffa.itemid)
         Buffers: shared hit=10468 read=149 written=45
         ->  Hash Right Join  (cost=13080.76..16581.52 rows=3171 width=24) (actual time=22.466..22.815 rows=2789 loops=1)
               Hash Cond: (la.courseid = x.courseid)
               Buffers: shared hit=10463 read=149 written=45
               ->  Bitmap Heap Scan on mdl_user_lastaccess la  (cost=22.26..3518.33 rows=1785 width=16) (actual time=0.026..0.111 rows=1800 loops=1)
                     Recheck Cond: (userid = 20203)
                     Heap Blocks: exact=15
                     Buffers: shared hit=19
                     ->  Bitmap Index Scan on mdl_user_lastaccess_userid_idx  (cost=0.00..21.81 rows=1785 width=0) (actual time=0.020..0.020 rows=1800 loops=1)
                           Index Cond: (userid = 20203)
                           Buffers: shared hit=4
               ->  Hash  (cost=13018.87..13018.87 rows=3171 width=16) (actual time=22.436..22.439 rows=2789 loops=1)
                     Buckets: 4096  Batches: 1  Memory Usage: 163kB
                     Buffers: shared hit=10444 read=149 written=45
                     ->  Subquery Scan on x  (cost=12955.45..13018.87 rows=3171 width=16) (actual time=21.949..22.271 rows=2789 loops=1)
                           Buffers: shared hit=10444 read=149 written=45
                           ->  HashAggregate  (cost=12955.45..12987.16 rows=3171 width=16) (actual time=21.949..22.144 rows=2789 loops=1)
                                 Group Key: ex.courseid
                                 Batches: 1  Memory Usage: 369kB
                                 Buffers: shared hit=10444 read=149 written=45
                                 ->  Nested Loop  (cost=7914.60..12939.59 rows=3171 width=16) (actual time=0.467..21.174 rows=2789 loops=1)
                                       Buffers: shared hit=10444 read=149 written=45
                                       ->  Hash Join  (cost=7914.31..11578.06 rows=3236 width=16) (actual time=0.462..14.335 rows=2850 loops=1)
                                             Hash Cond: (ex.id = uex.enrolid)
                                             Buffers: shared hit=2043
                                             ->  Seq Scan on mdl_enrol ex  (cost=0.00..3374.99 rows=109999 width=16) (actual time=0.007..7.252 rows=109999 loops=1)
                                                   Filter: (status = 0)
                                                   Buffers: shared hit=2000
                                             ->  Hash  (cost=7873.86..7873.86 rows=3236 width=16) (actual time=0.452..0.453 rows=2850 loops=1)
                                                   Buckets: 4096  Batches: 1  Memory Usage: 166kB
                                                   Buffers: shared hit=43
                                                   ->  Bitmap Heap Scan on mdl_user_enrolments uex  (cost=42.77..7873.86 rows=3236 width=16) (actual time=0.033..0.286 rows=2850 loops=1)
                                                         Recheck Cond: (userid = 20203)
                                                         Filter: ((timestart <= 1725100000) AND (status = 0) AND ((timeend = 0) OR (timeend > 1725100000)))
                                                         Rows Removed by Filter: 150
                                                         Heap Blocks: exact=38
                                                         Buffers: shared hit=43
                                                         ->  Bitmap Index Scan on mdl_user_enrolments_userid_idx  (cost=0.00..41.96 rows=3404 width=0) (actual time=0.027..0.027 rows=3000 loops=1)
                                                               Index Cond: (userid = 20203)
                                                               Buffers: shared hit=5
                                       ->  Index Scan using mdl_course_pkey on mdl_course c  (cost=0.29..0.42 rows=1 width=8) (actual time=0.002..0.002 rows=1 loops=2850)
                                             Index Cond: (id = ex.courseid)
                                             Filter: ((id <> 1) AND (visible = 1))
                                             Rows Removed by Filter: 0
                                             Buffers: shared hit=8401 read=149 written=45
         ->  Hash  (cost=294.56..294.56 rows=116 width=16) (actual time=0.047..0.047 rows=120 loops=1)
               Buckets: 1024  Batches: 1  Memory Usage: 14kB
               Buffers: shared hit=5
               ->  Bitmap Heap Scan on mdl_favourite ffa  (cost=5.19..294.56 rows=116 width=16) (actual time=0.011..0.023 rows=120 loops=1)
                     Recheck Cond: (userid = 20203)
                     Filter: (((component)::text = 'core_course'::text) AND ((itemtype)::text = 'courses'::text))
                     Heap Blocks: exact=3
                     Buffers: shared hit=5
                     ->  Bitmap Index Scan on mdl_favourite_userid_idx  (cost=0.00..5.16 rows=116 width=0) (actual time=0.006..0.006 rows=120 loops=1)
                           Index Cond: (userid = 20203)
                           Buffers: shared hit=2
 Planning:
   Buffers: shared hit=28 read=1 written=1
 Planning Time: 0.568 ms
 Execution Time: 23.221 ms
(64 rows)
```

</details>

<details><summary>User with 50 enrolments</summary>

```
SET
=== STAMP (user 42) ===
                                                                               QUERY PLAN                                                                               
------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Aggregate  (cost=1082.54..1082.55 rows=1 width=56) (actual time=9.319..9.322 rows=1 loops=1)
   Buffers: shared hit=130 read=133 written=16
   InitPlan 1
     ->  Aggregate  (cost=193.72..193.73 rows=1 width=8) (actual time=0.357..0.358 rows=1 loops=1)
           Buffers: shared hit=22 read=31
           ->  Bitmap Heap Scan on mdl_user_lastaccess la  (cost=4.82..193.59 rows=51 width=8) (actual time=0.084..0.350 rows=50 loops=1)
                 Recheck Cond: (userid = 42)
                 Heap Blocks: exact=50
                 Buffers: shared hit=22 read=31
                 ->  Bitmap Index Scan on mdl_user_lastaccess_userid_idx  (cost=0.00..4.81 rows=51 width=0) (actual time=0.068..0.068 rows=50 loops=1)
                       Index Cond: (userid = 42)
                       Buffers: shared hit=2 read=1
   InitPlan 2
     ->  Aggregate  (cost=133.75..133.76 rows=1 width=8) (actual time=0.013..0.013 rows=1 loops=1)
           Buffers: shared hit=2
           ->  Bitmap Heap Scan on mdl_favourite f  (cost=4.61..133.65 rows=41 width=0) (actual time=0.012..0.012 rows=0 loops=1)
                 Recheck Cond: (userid = 42)
                 Filter: (((component)::text = 'core_course'::text) AND ((itemtype)::text = 'courses'::text))
                 Buffers: shared hit=2
                 ->  Bitmap Index Scan on mdl_favourite_userid_idx  (cost=0.00..4.60 rows=41 width=0) (actual time=0.008..0.008 rows=0 loops=1)
                       Index Cond: (userid = 42)
                       Buffers: shared hit=2
   InitPlan 3
     ->  Aggregate  (cost=133.75..133.76 rows=1 width=8) (actual time=0.002..0.002 rows=1 loops=1)
           Buffers: shared hit=2
           ->  Bitmap Heap Scan on mdl_favourite f2  (cost=4.61..133.65 rows=41 width=8) (actual time=0.001..0.002 rows=0 loops=1)
                 Recheck Cond: (userid = 42)
                 Filter: (((component)::text = 'core_course'::text) AND ((itemtype)::text = 'courses'::text))
                 Buffers: shared hit=2
                 ->  Bitmap Index Scan on mdl_favourite_userid_idx  (cost=0.00..4.60 rows=41 width=0) (actual time=0.001..0.001 rows=0 loops=1)
                       Index Cond: (userid = 42)
                       Buffers: shared hit=2
   ->  Nested Loop  (cost=0.72..620.77 rows=52 width=24) (actual time=0.427..8.925 rows=50 loops=1)
         Buffers: shared hit=104 read=102 written=16
         ->  Index Scan using mdl_user_enrolments_userid_idx on mdl_user_enrolments ue  (cost=0.43..204.52 rows=52 width=24) (actual time=0.063..0.432 rows=50 loops=1)
               Index Cond: (userid = 42)
               Buffers: shared hit=4 read=52 written=10
         ->  Index Scan using mdl_enrol_pkey on mdl_enrol e  (cost=0.29..8.00 rows=1 width=16) (actual time=0.169..0.169 rows=1 loops=50)
               Index Cond: (id = ue.enrolid)
               Filter: (courseid <> 1)
               Buffers: shared hit=100 read=50 written=6
 Planning:
   Buffers: shared hit=479
 Planning Time: 0.689 ms
 Execution Time: 9.382 ms
(45 rows)

=== FILL (user 42) ===
                                                                                      QUERY PLAN                                                                                      
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Nested Loop Left Join  (cost=462.81..1146.24 rows=52 width=108) (actual time=0.649..3.403 rows=50 loops=1)
   Buffers: shared hit=611 read=2
   InitPlan 1
     ->  Aggregate  (cost=193.72..193.73 rows=1 width=8) (actual time=0.425..0.425 rows=1 loops=1)
           Buffers: shared hit=53
           ->  Bitmap Heap Scan on mdl_user_lastaccess la2  (cost=4.82..193.59 rows=51 width=8) (actual time=0.032..0.408 rows=50 loops=1)
                 Recheck Cond: (userid = 42)
                 Heap Blocks: exact=50
                 Buffers: shared hit=53
                 ->  Bitmap Index Scan on mdl_user_lastaccess_userid_idx  (cost=0.00..4.81 rows=51 width=0) (actual time=0.026..0.026 rows=50 loops=1)
                       Index Cond: (userid = 42)
                       Buffers: shared hit=3
   InitPlan 2
     ->  Aggregate  (cost=133.75..133.76 rows=1 width=8) (actual time=0.015..0.016 rows=1 loops=1)
           Buffers: shared hit=2
           ->  Bitmap Heap Scan on mdl_favourite f3  (cost=4.61..133.65 rows=41 width=0) (actual time=0.015..0.015 rows=0 loops=1)
                 Recheck Cond: (userid = 42)
                 Filter: (((component)::text = 'core_course'::text) AND ((itemtype)::text = 'courses'::text))
                 Buffers: shared hit=2
                 ->  Bitmap Index Scan on mdl_favourite_userid_idx  (cost=0.00..4.60 rows=41 width=0) (actual time=0.013..0.013 rows=0 loops=1)
                       Index Cond: (userid = 42)
                       Buffers: shared hit=2
   InitPlan 3
     ->  Aggregate  (cost=133.75..133.76 rows=1 width=8) (actual time=0.004..0.005 rows=1 loops=1)
           Buffers: shared hit=2
           ->  Bitmap Heap Scan on mdl_favourite f4  (cost=4.61..133.65 rows=41 width=8) (actual time=0.004..0.004 rows=0 loops=1)
                 Recheck Cond: (userid = 42)
                 Filter: (((component)::text = 'core_course'::text) AND ((itemtype)::text = 'courses'::text))
                 Buffers: shared hit=2
                 ->  Bitmap Index Scan on mdl_favourite_userid_idx  (cost=0.00..4.60 rows=41 width=0) (actual time=0.001..0.001 rows=0 loops=1)
                       Index Cond: (userid = 42)
                       Buffers: shared hit=2
   ->  Nested Loop Left Join  (cost=1.15..659.45 rows=52 width=88) (actual time=0.151..1.145 rows=50 loops=1)
         Buffers: shared hit=406
         ->  Nested Loop  (cost=0.72..620.77 rows=52 width=80) (actual time=0.093..0.976 rows=50 loops=1)
               Buffers: shared hit=206
               ->  Index Scan using mdl_user_enrolments_userid_idx on mdl_user_enrolments ue  (cost=0.43..204.52 rows=52 width=64) (actual time=0.070..0.414 rows=50 loops=1)
                     Index Cond: (userid = 42)
                     Buffers: shared hit=56
               ->  Index Scan using mdl_enrol_pkey on mdl_enrol e  (cost=0.29..8.00 rows=1 width=32) (actual time=0.011..0.011 rows=1 loops=50)
                     Index Cond: (id = ue.enrolid)
                     Filter: (courseid <> 1)
                     Buffers: shared hit=150
         ->  Index Scan using mdl_user_lastaccess_userid_courseid_idx on mdl_user_lastaccess la  (cost=0.42..0.73 rows=1 width=24) (actual time=0.003..0.003 rows=1 loops=50)
               Index Cond: ((userid = 42) AND (courseid = e.courseid))
               Buffers: shared hit=200
   ->  Index Scan using mdl_favourite_component_itemtype_itemid_contextid_userid_idx on mdl_favourite f  (cost=0.41..0.48 rows=1 width=24) (actual time=0.036..0.036 rows=0 loops=50)
         Index Cond: (((component)::text = 'core_course'::text) AND ((itemtype)::text = 'courses'::text) AND (itemid = e.courseid) AND (userid = 42))
         Buffers: shared hit=148 read=2
 Planning:
   Buffers: shared hit=593
 Planning Time: 0.972 ms
 Execution Time: 3.554 ms
(53 rows)

=== CONTINUE (user 42) ===
                                                                                                    QUERY PLAN                                                                                                    
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Limit  (cost=641.39..641.40 rows=1 width=91) (actual time=3.314..3.318 rows=3 loops=1)
   Buffers: shared hit=925 read=67 written=46
   ->  Sort  (cost=641.39..641.40 rows=1 width=91) (actual time=3.313..3.317 rows=3 loops=1)
         Sort Key: la.timeaccess DESC, c.fullname, c.id
         Sort Method: top-N heapsort  Memory: 25kB
         Buffers: shared hit=925 read=67 written=46
         ->  Nested Loop Anti Join  (cost=602.20..641.38 rows=1 width=91) (actual time=0.175..3.246 rows=48 loops=1)
               Buffers: shared hit=919 read=67 written=46
               ->  Nested Loop Left Join  (cost=601.90..640.94 rows=1 width=95) (actual time=0.154..2.636 rows=48 loops=1)
                     Buffers: shared hit=754 read=67 written=46
                     ->  Nested Loop  (cost=601.49..640.44 rows=1 width=87) (actual time=0.149..2.494 rows=48 loops=1)
                           Buffers: shared hit=610 read=67 written=46
                           ->  Nested Loop  (cost=601.20..640.08 rows=1 width=63) (actual time=0.142..0.593 rows=48 loops=1)
                                 Join Filter: (la.courseid = c.id)
                                 Buffers: shared hit=533
                                 ->  Nested Loop  (cost=600.90..639.63 rows=1 width=24) (actual time=0.131..0.257 rows=48 loops=1)
                                       Buffers: shared hit=389
                                       ->  HashAggregate  (cost=600.48..600.97 rows=49 width=8) (actual time=0.122..0.134 rows=48 loops=1)
                                             Group Key: ea.courseid
                                             Batches: 1  Memory Usage: 24kB
                                             Buffers: shared hit=197
                                             ->  Nested Loop  (cost=0.72..600.36 rows=49 width=8) (actual time=0.012..0.118 rows=48 loops=1)
                                                   Buffers: shared hit=197
                                                   ->  Index Scan using mdl_user_enrolments_userid_idx on mdl_user_enrolments uea  (cost=0.43..205.04 rows=49 width=8) (actual time=0.008..0.033 rows=48 loops=1)
                                                         Index Cond: (userid = 42)
                                                         Filter: ((timestart <= 1725100000) AND (status = 0) AND ((timeend = 0) OR (timeend > 1725100000)))
                                                         Rows Removed by Filter: 2
                                                         Buffers: shared hit=53
                                                   ->  Index Scan using mdl_enrol_pkey on mdl_enrol ea  (cost=0.29..8.07 rows=1 width=16) (actual time=0.002..0.002 rows=1 loops=48)
                                                         Index Cond: (id = uea.enrolid)
                                                         Filter: (status = 0)
                                                         Buffers: shared hit=144
                                       ->  Index Scan using mdl_user_lastaccess_userid_courseid_idx on mdl_user_lastaccess la  (cost=0.42..0.78 rows=1 width=16) (actual time=0.002..0.002 rows=1 loops=48)
                                             Index Cond: ((userid = 42) AND (courseid = ea.courseid))
                                             Buffers: shared hit=192
                                 ->  Index Scan using mdl_course_pkey on mdl_course c  (cost=0.29..0.44 rows=1 width=39) (actual time=0.007..0.007 rows=1 loops=48)
                                       Index Cond: (id = ea.courseid)
                                       Filter: ((id <> 1) AND (visible = 1))
                                       Buffers: shared hit=144
                           ->  Index Scan using mdl_context_instanceid_idx on mdl_context ctx  (cost=0.29..0.36 rows=1 width=40) (actual time=0.039..0.039 rows=1 loops=48)
                                 Index Cond: (instanceid = c.id)
                                 Filter: (contextlevel = 50)
                                 Buffers: shared hit=77 read=67 written=46
                     ->  Index Scan using mdl_favourite_component_itemtype_itemid_contextid_userid_idx on mdl_favourite ffa  (cost=0.41..0.49 rows=1 width=16) (actual time=0.003..0.003 rows=0 loops=48)
                           Index Cond: (((component)::text = 'core_course'::text) AND ((itemtype)::text = 'courses'::text) AND (itemid = c.id) AND (userid = 42))
                           Buffers: shared hit=144
               ->  Index Scan using mdl_course_completions_course_idx on mdl_course_completions cc  (cost=0.29..0.37 rows=1 width=8) (actual time=0.012..0.012 rows=0 loops=48)
                     Index Cond: (course = c.id)
                     Filter: ((timecompleted IS NOT NULL) AND (userid = 42))
                     Rows Removed by Filter: 1
                     Buffers: shared hit=165
 Planning:
   Buffers: shared hit=399
 Planning Time: 1.535 ms
 Execution Time: 3.394 ms
(55 rows)

=== NEW (user 42) ===
                                                                                                             QUERY PLAN                                                                                                              
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Limit  (cost=1299.79..1299.80 rows=3 width=121) (actual time=1.274..1.276 rows=0 loops=1)
   Buffers: shared hit=293 read=12 written=12
   ->  Sort  (cost=1299.79..1299.83 rows=16 width=121) (actual time=1.273..1.275 rows=0 loops=1)
         Sort Key: (min(uex.timecreated)) DESC, c.fullname, c.id
         Sort Method: quicksort  Memory: 25kB
         Buffers: shared hit=293 read=12 written=12
         ->  Nested Loop Anti Join  (cost=628.69..1299.58 rows=16 width=121) (actual time=1.270..1.272 rows=0 loops=1)
               Buffers: shared hit=293 read=12 written=12
               ->  Nested Loop Left Join  (cost=628.27..1286.93 rows=16 width=125) (actual time=0.705..1.249 rows=4 loops=1)
                     Buffers: shared hit=277 read=12 written=12
                     ->  Nested Loop  (cost=627.85..1278.99 rows=16 width=117) (actual time=0.693..1.227 rows=4 loops=1)
                           Buffers: shared hit=265 read=12 written=12
                           ->  Nested Loop  (cost=627.56..1273.21 rows=16 width=85) (actual time=0.682..1.208 rows=4 loops=1)
                                 Buffers: shared hit=253 read=12 written=12
                                 ->  Nested Loop  (cost=627.27..1140.17 rows=16 width=46) (actual time=0.671..1.187 rows=4 loops=1)
                                       Buffers: shared hit=241 read=12 written=12
                                       ->  Nested Loop  (cost=626.98..1135.07 rows=16 width=40) (actual time=0.659..1.169 rows=4 loops=1)
                                             Buffers: shared hit=229 read=12 written=12
                                             ->  GroupAggregate  (cost=601.73..602.71 rows=16 width=16) (actual time=0.170..0.178 rows=4 loops=1)
                                                   Group Key: ex.courseid
                                                   Filter: (min(uex.timecreated) > 1722508000)
                                                   Rows Removed by Filter: 44
                                                   Buffers: shared hit=197
                                                   ->  Sort  (cost=601.73..601.85 rows=49 width=16) (actual time=0.165..0.167 rows=48 loops=1)
                                                         Sort Key: ex.courseid
                                                         Sort Method: quicksort  Memory: 26kB
                                                         Buffers: shared hit=197
                                                         ->  Nested Loop  (cost=0.72..600.36 rows=49 width=16) (actual time=0.014..0.159 rows=48 loops=1)
                                                               Buffers: shared hit=197
                                                               ->  Index Scan using mdl_user_enrolments_userid_idx on mdl_user_enrolments uex  (cost=0.43..205.04 rows=49 width=16) (actual time=0.007..0.042 rows=48 loops=1)
                                                                     Index Cond: (userid = 42)
                                                                     Filter: ((timestart <= 1725100000) AND (status = 0) AND ((timeend = 0) OR (timeend > 1725100000)))
                                                                     Rows Removed by Filter: 2
                                                                     Buffers: shared hit=53
                                                               ->  Index Scan using mdl_enrol_pkey on mdl_enrol ex  (cost=0.29..8.07 rows=1 width=16) (actual time=0.002..0.002 rows=1 loops=48)
                                                                     Index Cond: (id = uex.enrolid)
                                                                     Filter: (status = 0)
                                                                     Buffers: shared hit=144
                                             ->  Index Scan using mdl_user_enrolments_pkey on mdl_user_enrolments ue  (cost=25.25..33.26 rows=1 width=32) (actual time=0.191..0.191 rows=1 loops=4)
                                                   Index Cond: (id = (SubPlan 1))
                                                   Buffers: shared hit=10 read=6 written=6
                                                   SubPlan 1
                                                     ->  Aggregate  (cost=24.81..24.82 rows=1 width=8) (actual time=0.055..0.055 rows=1 loops=4)
                                                           Buffers: shared hit=22 read=6 written=6
                                                           ->  Nested Loop  (cost=0.72..24.80 rows=1 width=8) (actual time=0.054..0.054 rows=1 loops=4)
                                                                 Buffers: shared hit=22 read=6 written=6
                                                                 ->  Index Scan using mdl_enrol_courseid_idx on mdl_enrol ez  (cost=0.29..8.31 rows=1 width=8) (actual time=0.028..0.028 rows=1 loops=4)
                                                                       Index Cond: (courseid = ex.courseid)
                                                                       Filter: (status = 0)
                                                                       Buffers: shared hit=10 read=2 written=2
                                                                 ->  Index Scan using mdl_user_enrolments_enrolid_userid_idx on mdl_user_enrolments uez  (cost=0.43..8.46 rows=1 width=16) (actual time=0.025..0.025 rows=1 loops=4)
                                                                       Index Cond: ((enrolid = ez.id) AND (userid = 42))
                                                                       Filter: ((timestart <= 1725100000) AND (timecreated = (min(uex.timecreated))) AND (status = 0) AND ((timeend = 0) OR (timeend > 1725100000)))
                                                                       Buffers: shared hit=12 read=4 written=4
                                       ->  Index Scan using mdl_enrol_pkey on mdl_enrol e  (cost=0.29..0.32 rows=1 width=22) (actual time=0.004..0.004 rows=1 loops=4)
                                             Index Cond: (id = ue.enrolid)
                                             Buffers: shared hit=12
                                 ->  Index Scan using mdl_course_pkey on mdl_course c  (cost=0.29..8.32 rows=1 width=39) (actual time=0.005..0.005 rows=1 loops=4)
                                       Index Cond: (id = ex.courseid)
                                       Filter: ((id <> 1) AND (visible = 1))
                                       Buffers: shared hit=12
                           ->  Index Scan using mdl_context_instanceid_idx on mdl_context ctx  (cost=0.29..0.36 rows=1 width=40) (actual time=0.004..0.004 rows=1 loops=4)
                                 Index Cond: (instanceid = c.id)
                                 Filter: (contextlevel = 50)
                                 Buffers: shared hit=12
                     ->  Index Scan using mdl_favourite_component_itemtype_itemid_contextid_userid_idx on mdl_favourite ffa  (cost=0.41..0.49 rows=1 width=16) (actual time=0.005..0.005 rows=0 loops=4)
                           Index Cond: (((component)::text = 'core_course'::text) AND ((itemtype)::text = 'courses'::text) AND (itemid = c.id) AND (userid = 42))
                           Buffers: shared hit=12
               ->  Index Only Scan using mdl_user_lastaccess_userid_courseid_idx on mdl_user_lastaccess la  (cost=0.42..0.77 rows=1 width=8) (actual time=0.005..0.005 rows=1 loops=4)
                     Index Cond: ((userid = 42) AND (courseid = c.id))
                     Heap Fetches: 4
                     Buffers: shared hit=16
 Planning:
   Buffers: shared hit=74
 Planning Time: 0.810 ms
 Execution Time: 1.317 ms
(76 rows)

=== FAVOURITES (user 42) ===
                                                                             QUERY PLAN                                                                              
---------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Limit  (cost=529.10..529.10 rows=1 width=83) (actual time=0.011..0.012 rows=0 loops=1)
   Buffers: shared hit=2
   ->  Sort  (cost=529.10..529.10 rows=1 width=83) (actual time=0.011..0.011 rows=0 loops=1)
         Sort Key: c.fullname, c.id
         Sort Method: quicksort  Memory: 25kB
         Buffers: shared hit=2
         ->  Nested Loop  (cost=5.91..529.09 rows=1 width=83) (actual time=0.006..0.007 rows=0 loops=1)
               Buffers: shared hit=2
               ->  Nested Loop Semi Join  (cost=5.62..528.72 rows=1 width=55) (actual time=0.006..0.006 rows=0 loops=1)
                     Buffers: shared hit=2
                     ->  Nested Loop  (cost=4.90..466.56 rows=40 width=47) (actual time=0.006..0.006 rows=0 loops=1)
                           Buffers: shared hit=2
                           ->  Bitmap Heap Scan on mdl_favourite f  (cost=4.61..133.65 rows=41 width=8) (actual time=0.006..0.006 rows=0 loops=1)
                                 Recheck Cond: (userid = 42)
                                 Filter: (((component)::text = 'core_course'::text) AND ((itemtype)::text = 'courses'::text))
                                 Buffers: shared hit=2
                                 ->  Bitmap Index Scan on mdl_favourite_userid_idx  (cost=0.00..4.60 rows=41 width=0) (actual time=0.004..0.004 rows=0 loops=1)
                                       Index Cond: (userid = 42)
                                       Buffers: shared hit=2
                           ->  Index Scan using mdl_course_pkey on mdl_course c  (cost=0.29..8.12 rows=1 width=39) (never executed)
                                 Index Cond: (id = f.itemid)
                                 Filter: ((id <> 1) AND (visible = 1))
                     ->  Nested Loop  (cost=0.72..1.54 rows=1 width=8) (never executed)
                           ->  Index Scan using mdl_enrol_courseid_idx on mdl_enrol ef  (cost=0.29..0.41 rows=1 width=16) (never executed)
                                 Index Cond: (courseid = c.id)
                                 Filter: (status = 0)
                           ->  Index Scan using mdl_user_enrolments_enrolid_userid_idx on mdl_user_enrolments uef  (cost=0.43..1.11 rows=1 width=8) (never executed)
                                 Index Cond: ((enrolid = ef.id) AND (userid = 42))
                                 Filter: ((timestart <= 1725100000) AND (status = 0) AND ((timeend = 0) OR (timeend > 1725100000)))
               ->  Index Scan using mdl_context_instanceid_idx on mdl_context ctx  (cost=0.29..0.36 rows=1 width=40) (never executed)
                     Index Cond: (instanceid = c.id)
                     Filter: (contextlevel = 50)
 Planning:
   Buffers: shared hit=65
 Planning Time: 0.473 ms
 Execution Time: 0.027 ms
(36 rows)

=== COUNTS (user 42) ===
                                                                                                    QUERY PLAN                                                                                                     
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Aggregate  (cost=952.79..952.80 rows=1 width=24) (actual time=0.317..0.319 rows=1 loops=1)
   Buffers: shared hit=396
   ->  Hash Left Join  (cost=763.21..952.31 rows=48 width=24) (actual time=0.265..0.315 rows=48 loops=1)
         Hash Cond: (x.courseid = ffa.itemid)
         Buffers: shared hit=396
         ->  Hash Right Join  (cost=629.05..817.96 rows=48 width=24) (actual time=0.262..0.308 rows=48 loops=1)
               Hash Cond: (la.courseid = x.courseid)
               Buffers: shared hit=394
               ->  Bitmap Heap Scan on mdl_user_lastaccess la  (cost=4.82..193.59 rows=51 width=16) (actual time=0.009..0.049 rows=50 loops=1)
                     Recheck Cond: (userid = 42)
                     Heap Blocks: exact=50
                     Buffers: shared hit=53
                     ->  Bitmap Index Scan on mdl_user_lastaccess_userid_idx  (cost=0.00..4.81 rows=51 width=0) (actual time=0.004..0.004 rows=50 loops=1)
                           Index Cond: (userid = 42)
                           Buffers: shared hit=3
               ->  Hash  (cost=623.63..623.63 rows=48 width=16) (actual time=0.249..0.250 rows=48 loops=1)
                     Buckets: 1024  Batches: 1  Memory Usage: 11kB
                     Buffers: shared hit=341
                     ->  Subquery Scan on x  (cost=622.31..623.63 rows=48 width=16) (actual time=0.237..0.246 rows=48 loops=1)
                           Buffers: shared hit=341
                           ->  GroupAggregate  (cost=622.31..623.15 rows=48 width=16) (actual time=0.236..0.244 rows=48 loops=1)
                                 Group Key: ex.courseid
                                 Buffers: shared hit=341
                                 ->  Sort  (cost=622.31..622.43 rows=48 width=16) (actual time=0.235..0.237 rows=48 loops=1)
                                       Sort Key: ex.courseid
                                       Sort Method: quicksort  Memory: 26kB
                                       Buffers: shared hit=341
                                       ->  Nested Loop  (cost=1.01..620.97 rows=48 width=16) (actual time=0.013..0.230 rows=48 loops=1)
                                             Buffers: shared hit=341
                                             ->  Nested Loop  (cost=0.72..600.36 rows=49 width=16) (actual time=0.009..0.111 rows=48 loops=1)
                                                   Buffers: shared hit=197
                                                   ->  Index Scan using mdl_user_enrolments_userid_idx on mdl_user_enrolments uex  (cost=0.43..205.04 rows=49 width=16) (actual time=0.005..0.030 rows=48 loops=1)
                                                         Index Cond: (userid = 42)
                                                         Filter: ((timestart <= 1725100000) AND (status = 0) AND ((timeend = 0) OR (timeend > 1725100000)))
                                                         Rows Removed by Filter: 2
                                                         Buffers: shared hit=53
                                                   ->  Index Scan using mdl_enrol_pkey on mdl_enrol ex  (cost=0.29..8.07 rows=1 width=16) (actual time=0.002..0.002 rows=1 loops=48)
                                                         Index Cond: (id = uex.enrolid)
                                                         Filter: (status = 0)
                                                         Buffers: shared hit=144
                                             ->  Index Scan using mdl_course_pkey on mdl_course c  (cost=0.29..0.42 rows=1 width=8) (actual time=0.002..0.002 rows=1 loops=48)
                                                   Index Cond: (id = ex.courseid)
                                                   Filter: ((id <> 1) AND (visible = 1))
                                                   Buffers: shared hit=144
         ->  Hash  (cost=133.65..133.65 rows=41 width=16) (actual time=0.002..0.002 rows=0 loops=1)
               Buckets: 1024  Batches: 1  Memory Usage: 8kB
               Buffers: shared hit=2
               ->  Bitmap Heap Scan on mdl_favourite ffa  (cost=4.61..133.65 rows=41 width=16) (actual time=0.002..0.002 rows=0 loops=1)
                     Recheck Cond: (userid = 42)
                     Filter: (((component)::text = 'core_course'::text) AND ((itemtype)::text = 'courses'::text))
                     Buffers: shared hit=2
                     ->  Bitmap Index Scan on mdl_favourite_userid_idx  (cost=0.00..4.60 rows=41 width=0) (actual time=0.001..0.001 rows=0 loops=1)
                           Index Cond: (userid = 42)
                           Buffers: shared hit=2
 Planning:
   Buffers: shared hit=29
 Planning Time: 0.203 ms
 Execution Time: 0.337 ms
(58 rows)
```

</details>

### Phase 3 plans (2026-09-04)

```
SET
=== HEADERS: active visible enrolments grouped by category (user 20203) ===
                                                                                       QUERY PLAN                                                                                       
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Finalize GroupAggregate  (cost=12904.23..12919.05 rows=6 width=16) (actual time=96.154..101.329 rows=6 loops=1)
   Group Key: c.category
   Buffers: shared hit=10281 read=336
   ->  Gather Merge  (cost=12904.23..12918.96 rows=6 width=16) (actual time=96.099..101.317 rows=12 loops=1)
         Workers Planned: 1
         Workers Launched: 1
         Buffers: shared hit=10281 read=336
         ->  Partial GroupAggregate  (cost=11904.22..11918.27 rows=6 width=16) (actual time=93.506..93.632 rows=6 loops=2)
               Group Key: c.category
               Buffers: shared hit=10281 read=336
               ->  Sort  (cost=11904.22..11908.89 rows=1865 width=8) (actual time=93.482..93.537 rows=1394 loops=2)
                     Sort Key: c.category
                     Sort Method: quicksort  Memory: 49kB
                     Buffers: shared hit=10281 read=336
                     Worker 0:  Sort Method: quicksort  Memory: 49kB
                     ->  Nested Loop  (cost=7866.42..11802.91 rows=1865 width=8) (actual time=0.611..92.998 rows=1394 loops=2)
                           Buffers: shared hit=10273 read=336
                           ->  Parallel Hash Join  (cost=7866.12..11006.56 rows=1904 width=8) (actual time=0.571..43.867 rows=1425 loops=2)
                                 Hash Cond: (e.id = ue.enrolid)
                                 Buffers: shared hit=2058
                                 ->  Parallel Seq Scan on mdl_enrol e  (cost=0.00..2970.58 rows=64705 width=16) (actual time=0.020..34.065 rows=55000 loops=2)
                                       Filter: ((courseid <> 1) AND (status = 0))
                                       Buffers: shared hit=2000
                                 ->  Parallel Hash  (cost=7842.32..7842.32 rows=1904 width=8) (actual time=0.460..0.462 rows=1425 loops=2)
                                       Buckets: 4096  Batches: 1  Memory Usage: 160kB
                                       Buffers: shared hit=46
                                       ->  Parallel Bitmap Heap Scan on mdl_user_enrolments ue  (cost=42.77..7842.32 rows=1904 width=8) (actual time=0.177..0.673 rows=2850 loops=1)
                                             Recheck Cond: (userid = 20203)
                                             Filter: ((timestart <= 1725100000) AND (status = 0) AND ((timeend = 0) OR (timeend > 1725100000)))
                                             Rows Removed by Filter: 150
                                             Heap Blocks: exact=38
                                             Buffers: shared hit=46
                                             ->  Bitmap Index Scan on mdl_user_enrolments_userid_idx  (cost=0.00..41.96 rows=3404 width=0) (actual time=0.117..0.117 rows=3000 loops=1)
                                                   Index Cond: (userid = 20203)
                                                   Buffers: shared hit=8
                           ->  Index Scan using mdl_course_pkey on mdl_course c  (cost=0.29..0.42 rows=1 width=16) (actual time=0.033..0.033 rows=1 loops=2850)
                                 Index Cond: (id = e.courseid)
                                 Filter: (visible = 1)
                                 Rows Removed by Filter: 0
                                 Buffers: shared hit=8215 read=336
 Planning:
   Buffers: shared hit=367
 Planning Time: 1.663 ms
 Execution Time: 101.441 ms
(44 rows)

=== PAGE: one group, keyset on (fullname, id), LIMIT 100 (user 20203) ===
                                                                                     QUERY PLAN                                                                                     
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Limit  (cost=7613.70..11776.59 rows=100 width=20) (actual time=58.690..241.460 rows=100 loops=1)
   Buffers: shared hit=15520 read=1410
   ->  Unique  (cost=7613.70..19769.35 rows=292 width=20) (actual time=58.689..241.422 rows=100 loops=1)
         Buffers: shared hit=15520 read=1410
         ->  Nested Loop  (cost=7613.70..19767.89 rows=292 width=20) (actual time=58.687..241.337 rows=100 loops=1)
               Buffers: shared hit=15520 read=1410
               ->  Gather Merge  (cost=7613.27..8743.86 rows=9920 width=28) (actual time=53.079..57.427 rows=4037 loops=1)
                     Workers Planned: 1
                     Workers Launched: 1
                     Buffers: shared hit=4304 read=410
                     ->  Sort  (cost=6613.26..6627.85 rows=5835 width=28) (actual time=51.100..51.332 rows=2542 loops=2)
                           Sort Key: c.fullname, c.id
                           Sort Method: quicksort  Memory: 445kB
                           Buffers: shared hit=4304 read=410
                           Worker 0:  Sort Method: quicksort  Memory: 426kB
                           ->  Parallel Hash Join  (cost=3107.82..6248.26 rows=5835 width=28) (actual time=31.150..42.159 rows=5184 loops=2)
                                 Hash Cond: (e.courseid = c.id)
                                 Buffers: shared hit=4288 read=410
                                 ->  Parallel Seq Scan on mdl_enrol e  (cost=0.00..2970.58 rows=64705 width=16) (actual time=0.011..4.782 rows=55000 loops=2)
                                       Filter: ((courseid <> 1) AND (status = 0))
                                       Buffers: shared hit=2000
                                 ->  Parallel Hash  (cost=3041.51..3041.51 rows=5305 width=20) (actual time=30.873..30.874 rows=4444 loops=2)
                                       Buckets: 16384  Batches: 1  Memory Usage: 640kB
                                       Buffers: shared hit=2237 read=410
                                       ->  Parallel Bitmap Heap Scan on mdl_course c  (cost=188.04..3041.51 rows=5305 width=20) (actual time=4.434..29.174 rows=4444 loops=2)
                                             Recheck Cond: (category = 3)
                                             Filter: ((visible = 1) AND (((fullname)::text > 'Course 5000'::text) OR (((fullname)::text = 'Course 5000'::text) AND (id > 5000))))
                                             Rows Removed by Filter: 3889
                                             Heap Blocks: exact=1386
                                             Buffers: shared hit=2237 read=410
                                             ->  Bitmap Index Scan on mdl_course_category_idx  (cost=0.00..185.79 rows=16733 width=0) (actual time=5.662..5.663 rows=16667 loops=1)
                                                   Index Cond: (category = 3)
                                                   Buffers: shared read=15
               ->  Index Scan using mdl_user_enrolments_enrolid_userid_idx on mdl_user_enrolments ue  (cost=0.43..1.11 rows=1 width=8) (actual time=0.045..0.045 rows=0 loops=4037)
                     Index Cond: ((enrolid = e.id) AND (userid = 20203))
                     Filter: ((timestart <= 1725100000) AND (status = 0) AND ((timeend = 0) OR (timeend > 1725100000)))
                     Rows Removed by Filter: 0
                     Buffers: shared hit=11216 read=1000
 Planning:
   Buffers: shared hit=37
 Planning Time: 0.646 ms
 Execution Time: 241.616 ms
(42 rows)

=== SEARCH: substring LIKE over the
psql:/tmp/paged.sql:24: error: unterminated quoted string
                                                                                              QUERY PLAN                                                                                              
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Limit  (cost=8104.11..8106.58 rows=19 width=28) (actual time=32.190..34.030 rows=32 loops=1)
   Buffers: shared hit=9508 read=68
   ->  Unique  (cost=8104.11..8106.58 rows=19 width=28) (actual time=32.189..34.028 rows=32 loops=1)
         Buffers: shared hit=9508 read=68
         ->  Gather Merge  (cost=8104.11..8106.43 rows=19 width=28) (actual time=32.188..34.023 rows=32 loops=1)
               Workers Planned: 1
               Workers Launched: 1
               Buffers: shared hit=9508 read=68
               ->  Unique  (cost=7104.10..7104.29 rows=19 width=28) (actual time=30.116..30.120 rows=16 loops=2)
                     Buffers: shared hit=9508 read=68
                     ->  Sort  (cost=7104.10..7104.14 rows=19 width=28) (actual time=30.115..30.117 rows=16 loops=2)
                           Sort Key: c.fullname, c.id, c.category
                           Sort Method: quicksort  Memory: 25kB
                           Buffers: shared hit=9508 read=68
                           Worker 0:  Sort Method: quicksort  Memory: 25kB
                           ->  Nested Loop  (cost=0.72..7103.69 rows=19 width=28) (actual time=3.046..30.082 rows=16 loops=2)
                                 Buffers: shared hit=9492 read=68
                                 ->  Nested Loop  (cost=0.29..6385.80 rows=646 width=36) (actual time=1.364..24.251 rows=589 loops=2)
                                       Buffers: shared hit=5983 read=6
                                       ->  Parallel Seq Scan on mdl_course c  (cost=0.00..3661.41 rows=588 width=28) (actual time=1.159..22.767 rows=544 loops=2)
                                             Filter: ((visible = 1) AND (((fullname)::text ~~* '%se 12%'::text) OR ((shortname)::text ~~* '%se 12%'::text)))
                                             Rows Removed by Filter: 49456
                                             Buffers: shared hit=2632
                                       ->  Index Scan using mdl_enrol_courseid_idx on mdl_enrol e  (cost=0.29..4.62 rows=1 width=16) (actual time=0.002..0.002 rows=1 loops=1089)
                                             Index Cond: (courseid = c.id)
                                             Filter: ((courseid <> 1) AND (status = 0))
                                             Buffers: shared hit=3351 read=6
                                 ->  Index Scan using mdl_user_enrolments_enrolid_userid_idx on mdl_user_enrolments ue  (cost=0.43..1.11 rows=1 width=8) (actual time=0.010..0.010 rows=0 loops=1178)
                                       Index Cond: ((enrolid = e.id) AND (userid = 20203))
                                       Filter: ((timestart <= 1725100000) AND (status = 0) AND ((timeend = 0) OR (timeend > 1725100000)))
                                       Rows Removed by Filter: 0
                                       Buffers: shared hit=3509 read=62
 Planning:
   Buffers: shared hit=26
 Planning Time: 1.372 ms
 Execution Time: 34.056 ms
(36 rows)

=== ACTIVE USERS: batch of users by lastaccess window, keyset on id (prewarm) ===
(no mdl_user copy in the bench: shape only, run on the site copy below)

SET
=== HEADERS: active visible enrolments grouped by category (user 42) ===
                                                                                    QUERY PLAN                                                                                     
-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 GroupAggregate  (cost=622.31..622.73 rows=6 width=16) (actual time=1.446..1.450 rows=6 loops=1)
   Group Key: c.category
   Buffers: shared hit=347
   ->  Sort  (cost=622.31..622.43 rows=48 width=8) (actual time=1.442..1.444 rows=48 loops=1)
         Sort Key: c.category
         Sort Method: quicksort  Memory: 25kB
         Buffers: shared hit=347
         ->  Nested Loop  (cost=1.01..620.97 rows=48 width=8) (actual time=0.065..1.423 rows=48 loops=1)
               Buffers: shared hit=344
               ->  Nested Loop  (cost=0.72..600.48 rows=49 width=8) (actual time=0.052..1.127 rows=48 loops=1)
                     Buffers: shared hit=200
                     ->  Index Scan using mdl_user_enrolments_userid_idx on mdl_user_enrolments ue  (cost=0.43..205.04 rows=49 width=8) (actual time=0.040..0.280 rows=48 loops=1)
                           Index Cond: (userid = 42)
                           Filter: ((timestart <= 1725100000) AND (status = 0) AND ((timeend = 0) OR (timeend > 1725100000)))
                           Rows Removed by Filter: 2
                           Buffers: shared hit=56
                     ->  Index Scan using mdl_enrol_pkey on mdl_enrol e  (cost=0.29..8.07 rows=1 width=16) (actual time=0.017..0.017 rows=1 loops=48)
                           Index Cond: (id = ue.enrolid)
                           Filter: ((courseid <> 1) AND (status = 0))
                           Buffers: shared hit=144
               ->  Index Scan using mdl_course_pkey on mdl_course c  (cost=0.29..0.42 rows=1 width=16) (actual time=0.006..0.006 rows=1 loops=48)
                     Index Cond: (id = e.courseid)
                     Filter: (visible = 1)
                     Buffers: shared hit=144
 Planning:
   Buffers: shared hit=362 read=5
 Planning Time: 2.189 ms
 Execution Time: 1.518 ms
(28 rows)

=== PAGE: one group, keyset on (fullname, id), LIMIT 100 (user 42) ===
psql:/tmp/paged.sql:24: error: unterminated quoted string
                                                                                       QUERY PLAN                                                                                        
-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Limit  (cost=621.50..621.53 rows=4 width=20) (actual time=0.195..0.197 rows=3 loops=1)
   Buffers: shared hit=344
   ->  Unique  (cost=621.50..621.53 rows=4 width=20) (actual time=0.194..0.196 rows=3 loops=1)
         Buffers: shared hit=344
         ->  Sort  (cost=621.50..621.51 rows=4 width=20) (actual time=0.194..0.194 rows=3 loops=1)
               Sort Key: c.fullname, c.id
               Sort Method: quicksort  Memory: 25kB
               Buffers: shared hit=344
               ->  Nested Loop  (cost=1.01..621.46 rows=4 width=20) (actual time=0.111..0.184 rows=3 loops=1)
                     Buffers: shared hit=341
                     ->  Nested Loop  (cost=0.72..600.48 rows=49 width=8) (actual time=0.008..0.106 rows=48 loops=1)
                           Buffers: shared hit=197
                           ->  Index Scan using mdl_user_enrolments_userid_idx on mdl_user_enrolments ue  (cost=0.43..205.04 rows=49 width=8) (actual time=0.004..0.033 rows=48 loops=1)
                                 Index Cond: (userid = 42)
                                 Filter: ((timestart <= 1725100000) AND (status = 0) AND ((timeend = 0) OR (timeend > 1725100000)))
                                 Rows Removed by Filter: 2
                                 Buffers: shared hit=53
                           ->  Index Scan using mdl_enrol_pkey on mdl_enrol e  (cost=0.29..8.07 rows=1 width=16) (actual time=0.001..0.001 rows=1 loops=48)
                                 Index Cond: (id = ue.enrolid)
                                 Filter: ((courseid <> 1) AND (status = 0))
                                 Buffers: shared hit=144
                     ->  Index Scan using mdl_course_pkey on mdl_course c  (cost=0.29..0.43 rows=1 width=20) (actual time=0.002..0.002 rows=0 loops=48)
                           Index Cond: (id = e.courseid)
                           Filter: ((visible = 1) AND (category = 3) AND (((fullname)::text > 'Course 5000'::text) OR (((fullname)::text = 'Course 5000'::text) AND (id > 5000))))
                           Rows Removed by Filter: 1
                           Buffers: shared hit=144
 Planning:
   Buffers: shared hit=37
 Planning Time: 0.206 ms
 Execution Time: 0.210 ms
(30 rows)

=== SEARCH: substring LIKE over the
                                                                                       QUERY PLAN                                                                                        
-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Limit  (cost=621.23..621.24 rows=1 width=28) (actual time=0.177..0.178 rows=0 loops=1)
   Buffers: shared hit=341
   ->  Unique  (cost=621.23..621.24 rows=1 width=28) (actual time=0.177..0.177 rows=0 loops=1)
         Buffers: shared hit=341
         ->  Sort  (cost=621.23..621.23 rows=1 width=28) (actual time=0.177..0.177 rows=0 loops=1)
               Sort Key: c.fullname, c.id, c.category
               Sort Method: quicksort  Memory: 25kB
               Buffers: shared hit=341
               ->  Nested Loop  (cost=1.01..621.22 rows=1 width=28) (actual time=0.175..0.175 rows=0 loops=1)
                     Buffers: shared hit=341
                     ->  Nested Loop  (cost=0.72..600.48 rows=49 width=8) (actual time=0.007..0.088 rows=48 loops=1)
                           Buffers: shared hit=197
                           ->  Index Scan using mdl_user_enrolments_userid_idx on mdl_user_enrolments ue  (cost=0.43..205.04 rows=49 width=8) (actual time=0.003..0.020 rows=48 loops=1)
                                 Index Cond: (userid = 42)
                                 Filter: ((timestart <= 1725100000) AND (status = 0) AND ((timeend = 0) OR (timeend > 1725100000)))
                                 Rows Removed by Filter: 2
                                 Buffers: shared hit=53
                           ->  Index Scan using mdl_enrol_pkey on mdl_enrol e  (cost=0.29..8.07 rows=1 width=16) (actual time=0.001..0.001 rows=1 loops=48)
                                 Index Cond: (id = ue.enrolid)
                                 Filter: ((courseid <> 1) AND (status = 0))
                                 Buffers: shared hit=144
                     ->  Index Scan using mdl_course_pkey on mdl_course c  (cost=0.29..0.42 rows=1 width=28) (actual time=0.002..0.002 rows=0 loops=48)
                           Index Cond: (id = e.courseid)
                           Filter: ((visible = 1) AND (((fullname)::text ~~* '%se 12%'::text) OR ((shortname)::text ~~* '%se 12%'::text)))
                           Rows Removed by Filter: 1
                           Buffers: shared hit=144
 Planning:
   Buffers: shared hit=26
 Planning Time: 0.256 ms
 Execution Time: 0.193 ms
(30 rows)

=== ACTIVE USERS: batch of users by lastaccess window, keyset on id (prewarm) ===
(no mdl_user copy in the bench: shape only, run on the site copy below)

Timing is on.
SET
DROP TABLE
psql:/tmp/users.sql:3: NOTICE:  table "mdl_user" does not exist, skipping
CREATE TABLE
INSERT 0 1000000
ANALYZE
 active7 
---------
  175219
(1 row)

=== PREWARM BATCH: users active in the window, keyset on id, LIMIT 200 (cursor mid-way) ===
                                                               QUERY PLAN                                                               
----------------------------------------------------------------------------------------------------------------------------------------
 Limit  (cost=0.42..72.32 rows=200 width=8) (actual time=0.189..0.517 rows=200 loops=1)
   Buffers: shared hit=20 read=17
   ->  Index Scan using mdl_user_pkey on mdl_user  (cost=0.42..31462.98 rows=87522 width=8) (actual time=0.188..0.508 rows=200 loops=1)
         Index Cond: (id > 500000)
         Filter: ((lastaccess >= 1724495200) AND (deleted = 0) AND (suspended = 0))
         Rows Removed by Filter: 907
         Buffers: shared hit=20 read=17
 Planning:
   Buffers: shared hit=23 read=2
 Planning Time: 0.414 ms
 Execution Time: 0.531 ms
(11 rows)

=== PREWARM BATCH: first batch (cursor 0) ===
                                                               QUERY PLAN                                                                
-----------------------------------------------------------------------------------------------------------------------------------------
 Limit  (cost=0.42..72.31 rows=200 width=8) (actual time=0.006..0.260 rows=200 loops=1)
   Buffers: shared hit=4 read=32
   ->  Index Scan using mdl_user_pkey on mdl_user  (cost=0.42..63010.43 rows=175303 width=8) (actual time=0.006..0.252 rows=200 loops=1)
         Index Cond: (id > 0)
         Filter: ((lastaccess >= 1724495200) AND (deleted = 0) AND (suspended = 0))
         Rows Removed by Filter: 907
         Buffers: shared hit=4 read=32
 Planning:
   Buffers: shared hit=1 read=3
 Planning Time: 0.115 ms
 Execution Time: 0.270 ms
(11 rows)

=== PREWARM COUNT: how many remain (progress line for mtrace) ===
                                                                           QUERY PLAN                                                                           
----------------------------------------------------------------------------------------------------------------------------------------------------------------
 Finalize Aggregate  (cost=27457.73..27457.74 rows=1 width=8) (actual time=78.266..82.638 rows=1 loops=1)
   Buffers: shared hit=9540 read=6489 written=2286
   ->  Gather  (cost=27457.51..27457.72 rows=2 width=8) (actual time=78.175..82.633 rows=3 loops=1)
         Workers Planned: 2
         Workers Launched: 2
         Buffers: shared hit=9540 read=6489 written=2286
         ->  Partial Aggregate  (cost=26457.51..26457.52 rows=1 width=8) (actual time=67.866..67.866 rows=1 loops=3)
               Buffers: shared hit=9540 read=6489 written=2286
               ->  Parallel Index Scan using mdl_user_pkey on mdl_user  (cost=0.42..26366.34 rows=36468 width=0) (actual time=0.027..66.597 rows=29203 loops=3)
                     Index Cond: (id > 500000)
                     Filter: ((lastaccess >= 1724495200) AND (deleted = 0) AND (suspended = 0))
                     Rows Removed by Filter: 137463
                     Buffers: shared hit=9540 read=6489 written=2286
 Planning Time: 0.055 ms
 Execution Time: 82.659 ms
(15 rows)

```
