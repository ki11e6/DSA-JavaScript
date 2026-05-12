# PostgreSQL — Latest Interview Questions (2025–2026)

> **Audience**: Interview prep for 2025–2026 backend / data rounds.
> **Focus**: PostgreSQL 17 & 18 features, MVCC internals, pgvector for RAG, replication, performance forensics.
> **Verified** against [postgresql.org](https://www.postgresql.org), Crunchy Data, EDB, pganalyze, Aiven, Xata, pgEdge 2025–2026 blogs.

---

## 1. PostgreSQL 17 (Sept 2024)

---

### Q1. How does PG 17 incremental backup work, and what are the prerequisites?

1. Set `summarize_wal = on` to start the **WAL summarizer** background worker → writes summaries to `pg_wal/summaries`.
2. Take a full base backup: `pg_basebackup -D full/`.
3. Later runs use **incremental** mode:
   ```bash
   pg_basebackup -D incr1/ --incremental=full/backup_manifest
   ```
   Only copies **changed blocks** (block-level delta).
4. To restore: `pg_combinebackup full/ incr1/ incr2/ -o restored/` — validates chain, reconstructs a consistent data directory.

Pre-17: had to use external tools (pgBackRest, Barman, WAL-G).

Source: [Mydbops on PG 17 Incremental Backup](https://www.mydbops.com/blog/postgresql-17-incremental-backup-pg-basebackup-pg-combinebackup).

---

### Q2. Write a query using `JSON_TABLE` to flatten an array of orders.

```sql
SELECT jt.*
FROM customers c,
  JSON_TABLE(c.data, '$.orders[*]'
    COLUMNS (
      order_id   int     PATH '$.id',
      total      numeric PATH '$.total',
      NESTED PATH '$.items[*]' COLUMNS (
        sku  text PATH '$.sku',
        qty  int  PATH '$.qty'
      )
    )
  ) AS jt;
```

Before 17, this required nested `jsonb_array_elements` + LATERAL joins. PG 17 ships `JSON_EXISTS`, `JSON_QUERY`, `JSON_VALUE`, and `JSON_TABLE` from the SQL/JSON standard.

---

### Q3. What changed about `MERGE` in PG 17?

- **`RETURNING` clause** support.
- **`merge_action()`** function tells you which branch fired (`'INSERT'` / `'UPDATE'` / `'DELETE'`).
- New **`WHEN NOT MATCHED BY SOURCE`** for symmetric upserts.

```sql
MERGE INTO target t USING source s ON t.id = s.id
WHEN MATCHED THEN UPDATE SET ...
WHEN NOT MATCHED THEN INSERT ...
WHEN NOT MATCHED BY SOURCE THEN DELETE
RETURNING merge_action(), *;
```

---

### Q4. How do PG 17 failover slots improve logical replication HA?

Set `failover = true` on a slot (or `CREATE SUBSCRIPTION ... WITH (failover)`).

On standbys with:
- `sync_replication_slots = on`
- `hot_standby_feedback = on`

the slot sync worker periodically copies slot positions from the primary, so subscribers can resume after a physical failover **without re-bootstrapping**.

Before 17, a primary failover meant logical subscribers were stuck or had to restart from scratch.

---

## 2. PostgreSQL 18 (Sept 25, 2025)

---

### Q5. What does the new Async I/O subsystem do and how do you enable `io_uring`?

PG 18 introduces an **asynchronous I/O layer** accelerating:
- Seq scans.
- Bitmap heap scans.
- VACUUM.

Reports cite **up to 3× faster reads** in I/O-bound workloads.

Configure via `io_method`:
- `worker` (default) — pool of background workers issuing async reads.
- `sync` — old synchronous behavior (fallback).
- `io_uring` — best performance, requires **Linux 5.1+**.

```sql
SET io_method = io_uring;
```

---

### Q6. When would you use `uuidv7()` over `gen_random_uuid()` (v4)?

- **v7** is **time-ordered** — inserts land at the right edge of a B-tree (no random page writes), reducing fragmentation and WAL volume while still being globally unique.
- **v4**'s randomness causes write amplification on large indexes.

```sql
CREATE TABLE events (id UUID PRIMARY KEY DEFAULT uuidv7(), ts TIMESTAMPTZ);
```

Native function in PG 18. Pre-18, you needed an extension (`pgcrypto` v7 helpers or third-party).

---

### Q7. What is B-tree skip scan and when does it help?

Given an index on `(a, b)` and a query with **only `WHERE b = ?`**, PG 18 internally enumerates distinct values of `a` and probes each for `b`.

**Wins when** leading column `a` has **low cardinality** (a few distinct values). Pre-18, the query would fall back to a sequential scan.

Reduces "I should have added another index" pressure on read-heavy systems.

---

### Q8. Show `OLD` / `NEW` in `RETURNING`.

```sql
UPDATE accounts SET balance = balance - 100
WHERE id = 1
RETURNING old.balance AS before, new.balance AS after, id;
```

Works for INSERT / UPDATE / DELETE / MERGE. Useful for audit logs and optimistic concurrency in a single round-trip.

---

### Q9. How do temporal constraints prevent overlapping reservations?

```sql
CREATE TABLE bookings(
  room INT,
  during TSRANGE,
  PRIMARY KEY (room, during WITHOUT OVERLAPS)
);
```

Plus `FOREIGN KEY ... PERIOD during` for referential integrity over time ranges. **No more EXCLUDE + btree_gist** hacks for history tables.

---

### Q10. Why is `pg_upgrade` preserving planner stats in 18 a big deal?

Pre-18 left `pg_statistic` **empty** in the new cluster → emergency `ANALYZE` during a maintenance window, with terrible query plans in the meantime.

PG 18 carries stats forward, so the cluster is queryable at **full performance immediately** after upgrade.

---

## 3. MVCC & Vacuum

---

### Q11. Walk through what happens to `xmin` / `xmax` on UPDATE.

1. Old tuple's `xmax` is set to the **updating txid**.
2. A **new tuple** is inserted with `xmin = txid` and `xmax = 0`.
3. Snapshots compare `xmin` / `xmax` against `xmin_horizon` for visibility.
4. The old tuple becomes **dead** once no snapshot needs it.
5. VACUUM reclaims the line pointer.

The old version is **not** updated in place — that's the source of "row bloat".

---

### Q12. What is a HOT update and what breaks it?

**HOT (Heap-Only Tuple)**: if no **indexed column** changes and the new tuple **fits on the same page**, PG creates a HOT chain via `t_ctid` instead of inserting index entries.

**Breaks HOT**:
- Indexing a frequently-updated column.
- `fillfactor = 100` (no free space on pages).

**Detect**:
```sql
SELECT relname, n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables;
```

Aim for `n_tup_hot_upd / n_tup_upd > 0.8` on hot tables.

---

### Q13. How do you mitigate XID wraparound on a hot table?

- Tune `autovacuum_freeze_max_age` **down**.
- Raise `autovacuum_vacuum_cost_limit`.
- Set per-table `autovacuum_freeze_min_age`.
- Monitor `pg_database.datfrozenxid` / `age(relfrozenxid)`.

**Anti-wraparound VACUUMs are non-cancellable** and will run regardless of autovacuum being disabled. If you see them in `pg_stat_activity`, don't kill — fix the underlying long-running transaction or replication slot.

---

## 4. Indexes & Performance

---

### Q14. GIN vs GiST vs BRIN vs B-tree — one-liner each.

- **B-tree**: equality + range on sortable types (default).
- **GIN**: "values within a composite" — JSONB, arrays, full-text search.
- **GiST**: overlap / containment / KNN — geometry, ranges.
- **BRIN**: huge tables physically ordered on the key (time series) — tiny index size, range-friendly.

Pick wrong → easy 100× perf delta on large tables.

---

### Q15. When is `jsonb_path_ops` preferred over `jsonb_ops`?

When you only need `@>`, `@?`, `@@`. The index is **smaller and faster**, but **loses** `?` / `?&` / `?|` key-existence operators.

```sql
CREATE INDEX ON products USING GIN(attributes jsonb_path_ops);
```

For mixed query patterns, stick with the default `jsonb_ops`.

---

### Q16. What does `INCLUDE` buy you on an index?

```sql
CREATE INDEX idx ON orders(customer_id) INCLUDE (total, status);
```

Included columns are stored in the leaf but **not part of the key**, enabling **index-only scans** without affecting uniqueness or sort order.

Massive win for hot read paths where you want covering without inflating the unique key.

---

### Q17. How do you find queries causing buffer pressure?

Combine **`pg_stat_statements`** + **`EXPLAIN (ANALYZE, BUFFERS)`**:

```sql
SELECT query, calls, mean_exec_time, shared_blks_read, temp_blks_written
FROM pg_stat_statements
ORDER BY shared_blks_read DESC LIMIT 20;
```

- High `shared_blks_read` → cache miss (data doesn't fit in shared_buffers + OS cache).
- High `temp_blks_written` → sort/hash **spilled to disk**; needs more `work_mem`.

---

## 5. Concurrency

---

### Q18. Implement a PostgreSQL job queue safely.

```sql
WITH job AS (
  SELECT id FROM jobs
  WHERE state = 'pending'
  ORDER BY id
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE jobs SET state = 'running', started_at = now()
FROM job WHERE jobs.id = job.id
RETURNING jobs.*;
```

**`SKIP LOCKED`**: lets multiple workers grab disjoint rows without blocking each other. Locks die with the txn — a crashed worker auto-releases its job.

This is the canonical Postgres-native queue. Used by Sidekiq Pro Postgres, Solid Queue (Rails), Hatchet, et al.

---

### Q19. Advisory locks vs row locks — when?

- **Advisory locks** (`pg_try_advisory_xact_lock(key)`): app-defined, decoupled from any row. Good for "only one worker should run job X cluster-wide". Cost nothing on the heap.
- **Row locks** (`FOR UPDATE`): tied to specific rows. Use when correctness depends on the row's data.

```sql
SELECT pg_try_advisory_xact_lock(42); -- non-blocking
SELECT pg_advisory_lock(42); -- blocking
```

Transaction-scoped variants release on commit/rollback — preferred over session-scoped (which can leak on crash).

---

## 6. Replication & Upgrades

---

### Q20. `pg_upgrade` vs logical replication for a 5 TB cluster?

| Aspect              | `pg_upgrade --link`            | Logical replication            |
| ------------------- | ------------------------------ | ------------------------------ |
| Downtime            | Minutes                        | Seconds (cutover only)         |
| Rollback            | Hard (in-place)                | Easy (keep old running)        |
| Risk                | All-or-nothing                 | Per-table; can test partially  |
| Setup complexity    | Low                            | High                           |
| Disk usage during   | Same                           | 2× (both clusters)             |
| Replicates schema?  | Yes (it's an in-place upgrade) | No — must apply manually       |

For 5 TB: **logical replication** is usually worth the complexity for the safety + rollback. Use blue/green: stand up new version, subscribe, catch up, cut over.

---

### Q21. Logical replication from a standby — what changed in PG 16?

You can now create logical slots on a **hot standby** (`CREATE_REPLICATION_SLOT ... LOGICAL`), offloading **CDC / Debezium** from the primary.

Requires `hot_standby_feedback = on` so the standby's xmin holds back vacuum on the primary (otherwise replication breaks when needed rows get vacuumed away).

Source: [Crunchy Data on PG 16 Logical Replication on Standbys](https://www.crunchydata.com/blog/logical-replication-on-standbys-in-postgres-16).

---

## 7. Partitioning, JSON, pgvector

---

### Q22. Pitfall: unique constraint on a partitioned table?

The constraint **must include the partition key columns**:

```sql
CREATE TABLE events (
  id BIGSERIAL,
  tenant_id BIGINT,
  ts TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, id)  -- must include tenant_id (partition key)
) PARTITION BY HASH (tenant_id);
```

Workaround for true global uniqueness: an unpartitioned table or application-side uniqueness check.

---

### Q23. HNSW vs IVFFlat in pgvector for RAG?

- **HNSW**:
  - Better recall.
  - **No training step**.
  - Slower build, larger memory.
  - Default choice for < 50M vectors.
  - Tune recall: `SET hnsw.ef_search = 100;`.
- **IVFFlat**:
  - Faster build, smaller memory.
  - **Requires training** on sample data.
  - Tune `lists` (clusters) and `probes` (clusters to scan).

For RAG (< 10M docs typical), **HNSW is the default**. Use IVFFlat only for very large indexes where memory matters.

---

### Q24. How do you do hybrid search?

Combine **pgvector cosine** (`<=>`) with **tsvector full-text** and weight via **RRF (Reciprocal Rank Fusion)** in a CTE:

```sql
WITH vec AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> $1) AS rank
  FROM docs ORDER BY embedding <=> $1 LIMIT 50
),
fts AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank(search, query) DESC) AS rank
  FROM docs, plainto_tsquery('english', $2) query
  WHERE search @@ query LIMIT 50
)
SELECT d.*, 1.0/(60 + COALESCE(v.rank, 1000)) + 1.0/(60 + COALESCE(f.rank, 1000)) AS score
FROM docs d
LEFT JOIN vec v USING(id)
LEFT JOIN fts f USING(id)
ORDER BY score DESC LIMIT 10;
```

Index FTS with GIN and embeddings with HNSW.

---

### Q25. Why do many JSONB rows defeat your GIN index?

GIN doesn't help selective predicates on **rare keys** when the planner estimates the bitmap will return most of the table — it picks a seq scan instead.

**Check**: `pg_stat_user_indexes` for `idx_scan = 0` on a GIN index that should be helping.

**Fix**: partial expression index on the specific value:

```sql
CREATE INDEX ON t ((data->>'tenant_id'))
WHERE data ? 'tenant_id';
```

Smaller, more selective, used when filters match.

---

## Final Senior Tips

1. **PG 18 async I/O is the headline 2025–2026 feature** — name `io_uring` and the 3× number.
2. **`uuidv7()` for new primary keys** — index locality matters at scale.
3. **`SKIP LOCKED` is the canonical Postgres job queue primitive** — don't reinvent.
4. **MVCC bloat is real** — design for vacuum, watch `n_tup_hot_upd`.
5. **`pg_stat_statements` + `EXPLAIN (ANALYZE, BUFFERS)`** is the production triage combo.
6. **DDL is transactional in Postgres** — leverage it for safe migrations.

---

## Sources

- [PostgreSQL 18 Released](https://www.postgresql.org/about/news/postgresql-18-released-3142/)
- [PG 18 Release Notes](https://www.postgresql.org/docs/current/release-18.html)
- [Crunchy Data — Get Excited About Postgres 18](https://www.crunchydata.com/blog/get-excited-about-postgres-18)
- [Xata — Postgres 18 Features Deep Dive](https://xata.io/blog/going-down-the-rabbit-hole-of-postgres-18-features)
- [Aiven — Async I/O in PG 18](https://aiven.io/blog/exploring-why-postgresql-18-put-asynchronous-io-in-your-database)
- [Aiven — Temporal Constraints in PG 18](https://aiven.io/blog/exploring-how-postgresql-18-conquered-time-with-temporal-constraints)
- [Hashrocket — PG 18 Virtual Generated Columns](https://hashrocket.com/blog/posts/postgresql-18-virtual-generated-columns)
- [Mydbops — PG 17 Incremental Backup](https://www.mydbops.com/blog/postgresql-17-incremental-backup-pg-basebackup-pg-combinebackup)
- [JSON_TABLE in PG 17 (Medium)](https://medium.com/@sjksingh/a-big-step-for-json-in-postgres-json-table-in-postgresql-17-eb4ba4dd3da1)
- [pgEdge — Logical Replication Features in PG 17](https://www.pgedge.com/blog/logical-replication-features-in-pg-17)
- [Crunchy Data — Logical Replication on Standbys (PG 16)](https://www.crunchydata.com/blog/logical-replication-on-standbys-in-postgres-16)
- [pganalyze — Zero-downtime Upgrades](https://pganalyze.com/blog/5mins-postgres-zero-downtime-upgrades-logical-replication)
- [MVCC Internals — xmin/xmax (dev.to)](https://dev.to/headf1rst/postgresql-mvcc-internals-from-xminxmax-to-isolation-levels-2g6h)
- [Inferable — SKIP LOCKED Effectiveness](https://www.inferable.ai/blog/posts/postgres-skip-locked)
- [Index Types — PG Docs](https://www.postgresql.org/docs/current/indexes-types.html)
- [pganalyze — GIN Index Deep Dive](https://pganalyze.com/blog/gin-index)
- [Karen Jex — Partitioning Best Practices](https://karenjex.blogspot.com/2025/09/postgres-partitioning-best-practices.html)
- [AWS Blog — IVFFlat vs HNSW pgvector](https://aws.amazon.com/blogs/database/optimize-generative-ai-applications-with-pgvector-indexing-a-deep-dive-into-ivfflat-and-hnsw-techniques/)
- [Production RAG with pgvector HNSW](https://markaicode.com/pgvector-rag-production/)
