# PostgreSQL — Hard Interview Questions

> **Audience**: Senior / staff / architect rounds.
> **Goal**: Deep internals (MVCC, WAL, planner, vacuum), large-scale schema, performance forensics, replication topologies, advanced features.
> Verified against [postgresql.org/docs](https://www.postgresql.org/docs) (PostgreSQL 18.3, May 2026).

---

## 1. MVCC Internals

---

### Q1. Explain MVCC in detail.

Every tuple carries hidden system columns:
- `xmin` — XID of the transaction that **inserted** this version.
- `xmax` — XID of the transaction that **deleted/updated** (0 if alive).
- `cmin`, `cmax` — command IDs (for within-transaction visibility).
- `ctid` — physical location `(block, offset)`.
- `xact_id` (logical) — transaction identifier.

Visibility for a transaction with snapshot S:
- `xmin` must be committed and ≤ S's snapshot xmin.
- `xmax` must be 0 OR uncommitted OR > S's snapshot xmin.

Different isolation levels use different snapshot semantics (per-statement vs per-transaction).

---

### Q2. Why is `COUNT(*)` slow on big tables?

There's no row count metadata — Postgres must scan every visible tuple due to MVCC (some readers might see different counts).

Workarounds:
- `pg_class.reltuples` — fast approximate count (refreshed by `ANALYZE`).
- Trigger-maintained counter table (write overhead).
- `EXPLAIN`-extracted estimate.
- Materialized view rebuilt periodically.

For most "is there any" questions, use `EXISTS`.

---

### Q3. Hot Standby visibility.

The standby has slightly delayed visibility due to:
- WAL shipping latency.
- Replay locks on transactions reading on standby.

`hot_standby_feedback = on` — standby tells primary which xids it still needs visible. Prevents primary's vacuum from removing rows the standby still reads. Trade-off: increases bloat on primary.

---

### Q4. TOAST.

For values larger than ~2 KB, PostgreSQL automatically:
- Compresses (LZ4 default in 14+; pglz before).
- Splits into chunks stored in a side table (`pg_toast.<oid>`).

Transparent — TOAST'd values look like a regular column on read. Performance: large columns add I/O per access. Profile JSONB queries with EXPLAIN BUFFERS to see TOAST reads.

---

### Q5. HOT updates.

Heap-Only Tuple optimization: if an update changes only non-indexed columns AND there's room on the same page, the new tuple links to the old via `ctid` and avoids updating indexes.

Big win for update-heavy tables. To enable HOT:
- Leave fill factor < 100% (`WITH (fillfactor = 70)` for hot tables).
- Avoid indexing every column.

`SELECT relname, n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables;`

---

## 2. Vacuum & Bloat

---

### Q6. Tune autovacuum for a heavy table.

```sql
ALTER TABLE events SET (
  autovacuum_vacuum_scale_factor = 0.05,   -- vacuum when 5% dead (default 20%)
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_cost_limit = 2000      -- more I/O budget
);
```

Default thresholds are conservative for huge tables — by the time 20% of 100M rows are dead, you have a 20M-tuple cleanup job. Tune per-table.

---

### Q7. Index bloat.

Indexes also bloat — frequent updates leave dead index entries. Symptoms:
- Index size growing disproportionately.
- Slower index scans.

Check:
```sql
SELECT * FROM pgstattuple('users_pkey');  -- requires extension
```

Fix:
```sql
REINDEX INDEX CONCURRENTLY users_email_uniq;
```

Or `pg_repack` extension for online bloat-free rebuild.

---

### Q8. Transaction ID wraparound — emergency.

If `autovacuum_freeze_max_age` is hit, autovacuum runs forced-freeze (even if disabled). If that fails (long-running idle txn, replication slot pinning xmin), the database approaches single-user shutdown.

Detect:
```sql
SELECT datname, age(datfrozenxid) FROM pg_database;
```

If `age > 1.5B`, you're heading toward wraparound. Mitigate:
- Kill long-running idle transactions: `pg_terminate_backend(pid)`.
- Drop unused replication slots: `pg_drop_replication_slot('slot_name')`.
- `VACUUM FREEZE` manually with parallel workers.

Modern Postgres has lots of safeguards but the failure mode is real and severe.

---

## 3. Locks

---

### Q9. Lock modes.

| Mode (strongest → weakest) | Blocks                             | Example use                    |
| -------------------------- | ---------------------------------- | ------------------------------ |
| ACCESS EXCLUSIVE           | All                                | DROP TABLE, ALTER TABLE         |
| EXCLUSIVE                  | ALL except ACCESS SHARE            | REFRESH MV CONCURRENTLY        |
| SHARE ROW EXCLUSIVE        | Other writers                      | Rarely used directly           |
| SHARE                      | Writers                            | CREATE INDEX (non-CONCURRENTLY) |
| SHARE UPDATE EXCLUSIVE     | Other DDL/vacuum                   | VACUUM, CREATE INDEX CONCURRENTLY |
| ROW EXCLUSIVE              | DDL                                | INSERT/UPDATE/DELETE           |
| ROW SHARE                  | DDL                                | SELECT FOR UPDATE              |
| ACCESS SHARE               | DDL                                | Plain SELECT                   |

For zero-downtime migrations: never take `ACCESS EXCLUSIVE` for long. Use `CONCURRENTLY` variants when possible.

---

### Q10. Why does `ALTER TABLE … ADD COLUMN` block writes?

It takes `ACCESS EXCLUSIVE`. Even adding a default value forced an entire-table rewrite pre-PG 11.

**PG 11+**: `ALTER TABLE … ADD COLUMN x INT DEFAULT 0` is nearly instant — the default is stored as metadata, only applied on read until the column is updated.

For online migrations, follow patterns:
1. Add nullable column.
2. Backfill in batches.
3. Set NOT NULL after backfill.
4. Add constraints with `NOT VALID` then `VALIDATE CONSTRAINT` separately.

---

### Q11. Deadlock detection.

`deadlock_timeout` (default 1s) — after holding a lock that long, PG checks for cycles. If found, the youngest victim is aborted.

```sql
SELECT * FROM pg_locks JOIN pg_stat_activity USING (pid) WHERE NOT granted;
```

Shows blocked queries. Cross-reference with `granted = true` rows to find holders.

---

## 4. Query Planner Forensics

---

### Q12. How does the planner estimate row counts?

From `pg_statistic`:
- `null_frac` — fraction of NULLs.
- `n_distinct` — distinct values (estimated).
- `most_common_vals` / `most_common_freqs` — histogram of top values.
- `histogram_bounds` — equi-depth histogram for ranges.
- `correlation` — physical-vs-logical ordering (affects BRIN cost).

If you see "rows=100" but actual is "rows=10000" → stats are off. Solutions:
- `ANALYZE table;` (refresh).
- Increase `default_statistics_target` (more bins; more accurate but slower).
- Per-column override: `ALTER TABLE t ALTER COLUMN c SET STATISTICS 5000;`.
- Multi-column stats: `CREATE STATISTICS s ON a, b FROM t;` then `ANALYZE`.

---

### Q13. Generic plan vs custom plan.

For prepared statements (parameterized queries), PG plans:
- First 5 executions: custom plan (uses actual parameter values).
- After: generic plan (works for any values) if it's not significantly slower.

This can cause "fast at first, slow later" bugs when stats favor specific values.

Force custom:
```sql
SET plan_cache_mode = force_custom_plan;
```

Or invalidate after schema/stats changes.

---

### Q14. JIT compilation.

Since PG 11, plans above `jit_above_cost` (default 100,000) JIT-compile expressions with LLVM. Speeds up CPU-bound queries (heavy WHERE/SELECT expressions). Adds overhead for short queries.

Tune:
```sql
SET jit = on;
SET jit_above_cost = 100000;
SET jit_inline_above_cost = 500000;
SET jit_optimize_above_cost = 500000;
```

If short queries became slower in PG 11+: try `jit = off` and benchmark.

---

### Q15. Parallel query.

Since PG 9.6, sequential scans, hash joins, and aggregations can use multiple workers:

```sql
SET max_parallel_workers_per_gather = 4;
```

Best for: big seq scans, big aggregations, big merges. Not so much for small queries (worker startup overhead).

Check: `EXPLAIN` shows `Gather` and `Workers Launched`.

---

## 5. WAL & Replication

---

### Q16. Streaming replication setup.

```
# postgresql.conf on primary
wal_level = replica           # or 'logical' for logical replication
max_wal_senders = 10
max_replication_slots = 10

# pg_hba.conf
host replication replicator 10.0.0.0/8 md5

# On standby
standby.signal             # touch this file
primary_conninfo = 'host=primary user=replicator ...'
```

The standby connects, requests WAL, replays continuously. With **replication slots**, the primary retains WAL even if the standby disconnects.

---

### Q17. Synchronous replication trade-offs.

```
synchronous_commit = remote_apply
synchronous_standby_names = 'r1, r2, ANY 1 (r3, r4)'
```

- `local`: no wait. Asynchronous.
- `remote_write`: wait for WAL receive.
- `on`: wait for WAL fsync on standby.
- `remote_apply`: wait for standby to apply.

Stronger guarantees → higher latency. `ANY 1 (...)` means "any 1 of these standbys" — limits the worst case to one node delay.

---

### Q18. Logical replication caveats.

Verified support since PG 10, improved through 16/17/18:
- Publish specific tables: `CREATE PUBLICATION pub FOR TABLE t1, t2;`
- Subscribe: `CREATE SUBSCRIPTION sub CONNECTION '...' PUBLICATION pub;`

Caveats:
- DDL is **not replicated** (you must apply schema changes on both sides).
- Sequences are not replicated (must seed manually on cutover).
- TRUNCATE replicated since PG 11.
- Large transactions: parallel apply landed in PG 16.

PG 18 improved logical decoding from standby (offload from primary).

---

### Q19. Incremental backups (PG 17).

```bash
pg_basebackup --incremental
pg_combinebackup
```

PG 17 added incremental physical backups. Combine via `pg_combinebackup` for restore. Massive reduction in backup time/space for large clusters.

Pre-17, you had to use external tools (Barman, pgBackRest, WAL-G). Built-in support narrows the gap but those tools still offer more (compression, retention, S3 upload).

---

## 6. PostgreSQL 18 Features

---

### Q20. Asynchronous I/O subsystem (PG 18).

PG 18 introduces a pluggable I/O backend:
```sql
SET io_method = io_uring;     -- Linux 5.1+
SET io_method = posix_aio;    -- fallback
SET io_method = sync;          -- old behavior
```

Issues concurrent read requests to the OS, overlapping I/O with computation. Up to **3× faster** for read-heavy workloads (analytics, big scans).

Doesn't affect writes much — those are still WAL-batched.

---

### Q21. B-tree skip scan.

PG 18 added skip scan to B-tree indexes. For compound index `(a, b)`:
```sql
-- Pre-18: full index scan or seq scan
SELECT * FROM t WHERE b = 5;

-- PG 18: skip scan jumps through distinct `a` values, dramatically faster when `a` has low cardinality
```

Helps queries that skip the leading column. Doesn't replace good index design but reduces "should I add another index?" pressure.

---

### Q22. Virtual generated columns.

PG 18 makes virtual generated columns the default for new `GENERATED ALWAYS AS (...)`:

```sql
ALTER TABLE rectangles ADD COLUMN area NUMERIC GENERATED ALWAYS AS (width * height) VIRTUAL;
```

Computed on read, not stored. Trade-off:
- VIRTUAL: zero storage, every read recomputes.
- STORED: storage, single compute on write.

---

### Q23. OLD/NEW in RETURNING.

```sql
UPDATE accounts SET balance = balance - 100 WHERE id = 1
RETURNING id, balance AS new_balance, OLD.balance AS old_balance;
```

Pre-18: only NEW values. PG 18: see before/after in one round-trip — handy for audit logs and optimistic concurrency.

---

### Q24. OAuth authentication (PG 18).

Native OAuth via `pg_hba.conf`:
```
host all all 0.0.0.0/0 oauth issuer="https://idp.example.com" scope="postgres"
```

Validates tokens from an OAuth provider. Replaces custom proxy setups for "log in with my org's IdP".

---

## 7. Schema at Scale

---

### Q25. Schema migration strategies.

Zero-downtime patterns:
1. **Add nullable column** → backfill in batches → set NOT NULL.
2. **Add NEW column, deploy code that writes both, backfill, switch reads, drop OLD.**
3. **Rename: app reads both names, write to new, eventually drop old.**
4. **Index concurrently** to avoid table locks.

Tools: `gh-ost`, `pt-online-schema-change` (MySQL world); `pg_repack`, `pg-osc` (Postgres).

---

### Q26. Big partition design.

For a 1B-row event table:
- Partition by month on `ts` — drop old months instantly.
- Sub-partition by `tenant_id` hash if tenants vary in size.
- Index per partition (PG infers from parent's index).
- Pre-create future partitions (months ahead).
- Use `pg_partman` extension to automate creation/drop.

Watch for partition pruning failures: `WHERE ts > NOW() - INTERVAL '1 hour'` doesn't always prune (depends on planner). Use literals or `prepare`/`execute` carefully.

---

### Q27. Citus — when to consider?

Citus is a Postgres extension that turns it into a distributed database. Use when:
- Single-node Postgres can't scale (multi-TB hot data).
- Workload is multi-tenant (shard by tenant_id).
- You want to keep SQL + Postgres ecosystem.

Owned by Microsoft; available on Azure Cosmos DB for PostgreSQL.

Alternative: managed services (Aurora, Yugabyte, CockroachDB) for distributed SQL with Postgres compatibility.

---

## 8. Advanced Indexes

---

### Q28. Index for "top-N per group".

```sql
-- Want: latest 3 orders per user
CREATE INDEX orders_user_created_desc ON orders(user_id, created_at DESC);

-- Query:
SELECT * FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM orders
) t WHERE rn <= 3;
```

Or `LATERAL`:
```sql
SELECT u.id, o.*
FROM users u
LEFT JOIN LATERAL (
  SELECT * FROM orders WHERE user_id = u.id ORDER BY created_at DESC LIMIT 3
) o ON true;
```

LATERAL is usually faster — uses the index per user instead of one big sort.

---

### Q29. Index on a query predicate.

```sql
-- Filter only "recent" rows
CREATE INDEX events_recent ON events(ts)
  WHERE ts > '2026-01-01';
```

Partial index — only contains rows passing the predicate. Smaller and faster.

Drawback: queries must include the same predicate exactly, or the planner won't use it.

---

### Q30. Covering indexes (`INCLUDE`).

```sql
CREATE INDEX orders_user_status ON orders(user_id, status) INCLUDE (amount, created_at);

-- This query is covered (index-only scan):
SELECT amount, created_at FROM orders WHERE user_id = 1 AND status = 'paid';
```

Included columns are stored in leaves but not indexed for filtering. Covers more queries without making the index more selective.

---

## 9. Performance Forensics

---

### Q31. Hot path analysis.

```sql
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  rows / NULLIF(calls, 0) AS rows_per_call
FROM pg_stat_statements
WHERE mean_exec_time > 10  -- > 10 ms
ORDER BY total_exec_time DESC
LIMIT 30;
```

Look for:
- High `total_exec_time` = "Where my hours go."
- High `mean_exec_time` = individually slow query.
- High `rows_per_call` with low `calls` = potentially missing index.

---

### Q32. Lock contention.

```sql
SELECT pid, locktype, mode, relation::regclass, granted, query, pg_blocking_pids(pid)
FROM pg_locks JOIN pg_stat_activity USING(pid);
```

Shows current locks. `pg_blocking_pids` reveals who's blocking each request. Useful during incidents.

---

### Q33. Cache hit ratio.

```sql
SELECT
  sum(heap_blks_read) AS reads,
  sum(heap_blks_hit) AS hits,
  sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit + heap_blks_read), 0) AS ratio
FROM pg_statio_user_tables;
```

Target > 99% on hot OLTP. If lower: data doesn't fit in `shared_buffers` + OS cache. Add RAM, partition, or archive cold data.

---

### Q34. Slow query investigation playbook.

1. Find the slow query in `pg_stat_statements` or app traces.
2. `EXPLAIN (ANALYZE, BUFFERS, VERBOSE) <query>` with realistic params.
3. Compare planned vs actual rows — stale stats?
4. Check for missing index (Seq Scan on big table).
5. Check for in-memory sort that spilled to disk.
6. Check `Buffers` — high `read` vs `hit` means I/O-bound.
7. Try `SET enable_seqscan = off` (debug only) to see what the planner thinks of alternatives.

---

## 10. Operations

---

### Q35. Connection pool architecture.

App → PgBouncer (transaction mode) → Postgres.

```
app servers × 100 → PgBouncer (1000 client conns, 50 backend) → Postgres (50 conns)
```

Without PgBouncer, 100 app servers × 20-conn pool = 2000 backend conns → 20 GB just for Postgres process memory.

Trade-offs: PgBouncer transaction mode doesn't support prepared statements (without v1.21+ session-affinity option), nor session-level features (advisory locks held across transactions).

---

### Q36. Tuning `shared_buffers`, `work_mem`, `effective_cache_size`.

Defaults are conservative:
- `shared_buffers = 25%` of RAM (cap ~8 GB for very large boxes).
- `work_mem = 4 MB` per node per query (multiply by parallel workers + concurrent queries).
- `effective_cache_size = 75%` of RAM (planner hint, no allocation).
- `maintenance_work_mem = 256 MB` for vacuum/index builds.

Use `pgtune` or AWS Aurora's auto-tuning as a starting point.

---

### Q37. Disaster recovery / PITR.

**Point-In-Time Recovery**:
1. Continuous WAL archiving (`archive_command`).
2. Periodic base backups (`pg_basebackup` or `pgBackRest`).
3. To restore: use a base backup + replay WAL up to a target time.

```bash
recovery_target_time = '2026-05-12 10:30:00'
```

Test restores quarterly. RTO targets: < 1 hour for OLTP; RPO < 1 minute if WAL streaming is real-time.

---

### Q38. Major version upgrade.

Options:
- **`pg_upgrade`**: in-place, fast (uses hard links). Schema must be compatible.
- **Logical replication**: zero-downtime; replicate to new version cluster, switchover.
- **Dump/restore**: slow on big DBs but bulletproof.

Always:
- Test the upgrade in a staging environment first.
- Check extension compatibility.
- Re-`ANALYZE` after upgrade — stats format may change. PG 18 preserves stats with `pg_upgrade --stats` which is a major QoL improvement.

---

## 11. Extensions & Ecosystem

---

### Q39. `pgvector` for AI.

```sql
CREATE EXTENSION vector;

CREATE TABLE docs (
  id BIGSERIAL,
  content TEXT,
  embedding vector(1536)
);

CREATE INDEX ON docs USING hnsw (embedding vector_cosine_ops);

-- Find similar
SELECT content FROM docs
ORDER BY embedding <=> $1 LIMIT 10;
```

HNSW algorithm; competitive with dedicated vector DBs (Pinecone, Weaviate) for many use cases. Keeps your embeddings + relational data in one place.

---

### Q40. `pg_cron` for in-DB scheduling.

```sql
CREATE EXTENSION pg_cron;

SELECT cron.schedule('cleanup', '0 3 * * *', $$DELETE FROM logs WHERE ts < now() - interval '30 days'$$);
```

Replaces a separate cron service for DB-local jobs. Available on most managed Postgres (Aurora, Supabase, Crunchy).

---

## Final Senior Tips

1. **MVCC means bloat is real** — design for vacuum, partition for retention.
2. **`pg_stat_statements` first** — never optimize blind.
3. **Default isolation is Read Committed** — if you need stronger, ask for it explicitly.
4. **Postgres has 6 index types** — most apps use only B-tree and leave wins on the table.
5. **DDL is transactional** — leverage it for safe migrations.
6. **Connection pooling matters** — PgBouncer + small per-instance pools.
