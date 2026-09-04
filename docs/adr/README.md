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
