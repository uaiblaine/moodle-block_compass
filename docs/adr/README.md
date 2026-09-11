# Architecture decision records

One decision per file, `NNN-kebab-title.md`, never edited after acceptance:
a change of mind supersedes with a new record. Each record has **Title, Status,
Date, Context, Decision, Consequences, Evidence**. Evidence is what separates a
record from prose: the SQL, the `EXPLAIN ANALYZE` output, the measured payload
sizes, the alternatives rejected and why.

Statuses: `Planned` (not yet drafted; listed for the phase that will need it),
`Proposed` (written, awaiting the maintainer), `Accepted`, `Rejected`,
`Deferred` (with a revisit trigger), `Superseded by NNN`.

The agent writes a record as `Proposed` **before** the phase that implements
it and stops for review; implementation starts against an accepted record, and
the status flips to `Accepted` in the commit that lands it.

| ADR | Title | Status | Phase |
|---|---|---|---|
| [000](000-scope-and-baseline.md) | Scope and baseline | Accepted | 0 |
| [001](001-two-layer-cache.md) | Two-layer cache: `coursemeta`, `categorymeta`, `inventory`, `details` (amended 2026-09-04: the category layer) | Accepted | 1 |
| [002](002-inventory-stamp.md) | The inventory: per-enrolment rows, validated by a stamp | Accepted | 2 |
| [003](003-prewarming.md) | Pre-warming: optional, selective, budgeted | Accepted | before 3 |
| [004](004-paged-mode.md) | Degraded `paged` mode above `inventory_max` (supersedes ADR-000 decision 18) | Accepted | before 3 |
| [005](005-lazy-details-and-views.md) | Lazy details for tier 3, the list/cards view, and virtualisation deferred (supersedes PLAN.md §7 on virtualisation while its bounds hold; revised before acceptance under ADR-006 decision 8) | Accepted | R4 |
| [006](006-react-client.md) | The client is React, and what that costs (supersedes nothing; ADR-005 revised in place instead) | Accepted | R1-R4 |
| [007](007-dormancy-and-archiving.md) | Dormancy, archiving, and the two groups that are not categories (supersedes ADR-000 decision 16 on which write route the client uses; everything else in it stands) | Accepted | 5 |
| [008](008-accessibility-docs-and-release.md) | The accessibility audit is executable, the documentation is English, and v5.2-r1 ships (supersedes nothing; completes PLAN.md §9 Phase 7 except the moodle.org submission itself) | Accepted | 7 |
| [009](009-favourites-filters-and-pending-applications.md) | Complete favourites, one ghost, a filter panel, and applications awaiting approval (supersedes PLAN.md §2's exclusivity rule for the favourites strip and §10's custom-field non-objective; repurposes `enable_pending`) | Accepted | 8 |
| [010](010-ux-polish-preferences-and-resilience.md) | Fourteen changes to what the learner sees, touches and survives: a scroll into tier 3, the archive box, zero chips hidden, a column-counted grid, the star and badge corners, a star in tier 3, core's chevron, no uppercase, a remembered toolbar, a teacher-only completion notice, `show_category`, and a reload control with a bounded retry (narrows ADR-005's "tier 3 prints nothing"; supersedes ADR-007's "reopen is the retry") | Accepted | 9 |
| [011](011-client-delivery-bundle-preload-and-batched-reads.md) | The client arrives in one file and is announced in the head: a bundle beside core's per-file build, seven `modulepreload` hints from a head hook, and two batched reads in the service (amends ADR-006's delivery; supersedes nothing) | Accepted | 10 |
| [012](012-a-page-of-its-own.md) | A page of the block's own at `/blocks/compass/index.php` on the `base` layout, behind an `enable_page` setting, offered as the site's home page through core's `extend_default_homepage` hook, a third rung of the heading ladder, and the head hook of ADR-011 listening on the Dashboard only when the block is present and on the page always (amends ADR-011 decision 2 and ADR-008 decision 3; supersedes nothing) | Accepted | 10 |
