# ADR-017, stage 14a: the measurements (2026-10-29)

The prototype on branch `phase-14-open-courses`, measured through
`tests/local/open_courses_measure_test.php`. Every test there is skipped unless `BLOCK_COMPASS_MEASURE`
is set, and `mdl phpunit` passes no environment, so the runs below call PHPUnit inside the container.

**Prototype files:** `classes/local/catalogue.php`, `catalogue_cache.php`, `news.php`, `news_cache.php`;
`db/caches.php` (`catalogue`, `news`); `config.php` (`news_*`).

**Protocol:** that of `get_strip_counts_budget_test`.
- Warm core.
- Reset the per-request state: `simulate_new_request()`, `access::reset_caches()`,
  `\core\context_helper::reset_caches()`.
- Purge the viewer's layer. Keep the shared ones warm, except where "cold" says the catalogue was
  dropped too.
- Measure the second call, through `budget.php`.

The numbers are **domain** reads. The service `get_news` (stage 14c) adds its floor of 2.

## M1: reads

PostgreSQL 18.6 on m503b (`docker exec -e BLOCK_COMPASS_MEASURE=1 -w /var/www/html m503b-webserver-1
vendor/bin/phpunit public/blocks/compass/tests/local/open_courses_measure_test.php`). MariaDB 12.3 through
a kept CI image (`mdl ci moodle-block_compass-503 --branch MOODLE_503_STABLE --php 8.4 --db mariadb --only
phpunit --keep`, whole suite `Tests: 653, Assertions: 16425, Skipped: 24`, then the committed image run
with the flag, then container, image and database removed). **The two families read the same in every
row.**

| Viewer | Catalogue build | News build, catalogue warm | News build, catalogue cold | News hit |
|---|---|---|---|---|
| Learner: a student in one band course, and in one course outside the band | 3 | 6 | 8 | 0 |
| Teacher: editing teacher in one band course, manager at a category above another | 3 | 6 | 8 | 0 |
| New account: no enrolment, no role | 3 | 6 | 8 | 0 |
| Worst case for the provider: every self instance capped, half restricted to a cohort the viewer is in | 3 | 8 | 10 | 0 |
| 2 candidates (warm build) | | 6 | | |
| 200 candidates (warm build) | | 6 | | |

**What the reads are.**
- Catalogue: candidates 1, `until` 1, `unlisted_ids()` 1.
- News, warm: the history-and-role statement 1, `get_next_actions()` 2 (4 in the worst case, with
  the viewer's cohorts and the grouped seat count), `filter_courses()` 1, the names' filters preload 1,
  `course_meta` for a group of one 1.

**The build is flat:** 6 reads for 2 candidates and for 200. In time, 3.2 ms against 8.8 ms on
PostgreSQL and 0.9 ms against 4.1 ms on MariaDB.

**Through the service** (+2):
- a fresh entry: 2;
- a warm build: 8 (10 in the worst case);
- a cold build: 10 (12 in the worst case).

The ADR estimated about 11 and 14.

## M2: the catalogue's statements at scale

Synthetic data, generator `docs/perf/bench-open-courses-m2.sh` (`pg` or `maria`, N courses):
- 500 categories;
- 10 % of the courses hidden, 20 % without a start date;
- start dates spread over two years;
- three instances a course, with a third of the self ones enabled and some windows in the future;
- 3 % of the courses unlisted.

PostgreSQL ran on TEMP tables in m503's database. MariaDB ran in a throwaway `mariadb:12.3`
container, since removed. Three runs each; times are the execution times.

| Courses | Rows (both) | PostgreSQL candidates | PostgreSQL `until` | MariaDB candidates | MariaDB `until` |
|---|---|---|---|---|---|
| 2,000 | 22 | 0.24-0.30 ms | 0.25-0.32 ms | 1.05 ms | 0.70 ms |
| 20,000 | 220 | 4.7-6.8 ms | 6.0-7.1 ms | 10.4-12.3 ms | 6.6-7.2 ms |
| 100,000 | 501 (the cap) | 25.1-25.5 ms | 28.4-29.6 ms | 64-68 ms | 37-40 ms |

**Plans.** On PostgreSQL the candidates are a Seq Scan on `course` (no `startdate` index) with a Hash
Left Join to the state, then a Nested Loop Semi Join on `enrol (courseid)` and a top-N sort. `until` is a
Bitmap Index Scan on `enrol (enrol)` with a Hash Join. MariaDB drives both from `enrol`: a range on
`enrol` and `eq_ref` on the course and state primary keys for the candidates, a full scan of `enrol` for
`until`. The PostgreSQL plans are kept in `docs/perf/2026-10-29-m2-open-courses/`.

**Reading.** At 100,000 courses a rebuild costs about 55 ms on PostgreSQL and about 105 ms on MariaDB.
That is paid once per catalogue-deleting event, shared by every viewer. An index on `course.startdate`
is not worth proposing: the block cannot add one, and these times do not ask for it. M4 says how often
a rebuild happens.

## M3: parity with the showcase

The test runs on m503b, where `theme_dimensions` is installed; it is skipped elsewhere. A category with
a child, and one viewer. The line's counted courses are compared with the rows of
`population::resolve()` for `criteria` with state `open` and the band's two days, flat by name, as
`?categoryid=N&chip=open&from=&to=` asks.

| Course | Line | Showcase |
|---|---|---|
| Self, open, in the band | yes | yes |
| Fee, open, in the child category | yes | yes |
| Self restricted to a cohort the viewer is in | yes | yes |
| **Unlisted, self open** | **no** | **yes** |
| Self outside the band; rolling (no start date) | no | no |
| Guest access only | no | no |
| The viewer is enrolled as a student | no | no |
| The viewer teaches it (editing teacher) | no | no |
| Self full (cap 1, taken) | no | no |
| Self window opening tomorrow | no | no |
| Self restricted to another cohort | no | no |
| Self with new enrolments off | no | no |
| enrol_apply instance as created by the fixture | no | no |

The line's group count is 3. Its courses are a subset of the showcase's.

**The one difference is decided, not a defect.** The provider names an unlisted course to a viewer who
could join it, and the showcase follows it. The line fails closed on unlisted courses (ADR-017 decision 2,
condition 1). The link therefore shows a superset of what the line counted, never less.

**The enrol_apply case.** The instance as created by the fixture's defaults is refused by the plugin
(`get_next_actions()` answers `blocked: off`), and both sides agree. Stage 14b's tests need an instance
configured the way enrol_apply accepts applications, so that the apply route is proved to count.

## M5: payload

The groups as the entry holds them, JSON: 1 group 85 B raw / 101 B gzip; 3 groups 357 / 176 B; 20 groups
2,305 / 310 B. Every third group in the test is a group of one, so the course's name travels too. The
ADR's "about 0.6 KB" holds for a few groups; at the 20-group cap it is 2.3 KB raw and 0.3 KB on the wire.

## M4

The kit is `docs/perf/m4-open-courses-events-kit.sql`, read-only, for the maintainer's production
replica. It was validated on m503, whose development data says nothing. It is not run yet.
