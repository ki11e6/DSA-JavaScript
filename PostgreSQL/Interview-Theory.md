# PostgreSQL — Theoretical / Conceptual Interview Questions

> **Audience**: All levels.
> **Goal**: Show deep understanding of relational fundamentals, MVCC, indexes, isolation levels, WAL, replication, JSON, and PG-specific features.
> Verified against [postgresql.org/docs](https://www.postgresql.org/docs) (PostgreSQL 18.3, May 2026).

---

## 1. Fundamentals

---

### Q1. What is PostgreSQL?

**Short**: Open-source object-relational database with strong SQL standard compliance, extensibility (custom types, functions, languages, indexes), MVCC concurrency, and a vibrant extension ecosystem.

**Deeper**:
- ACID-compliant; serializable isolation via SSI.
- Multi-version concurrency control (MVCC).
- Annual major release; current as of May 2026: **PostgreSQL 18.3** (released Feb 26, 2026). Source: [PG 18.3 release](https://www.postgresql.org/about/news/postgresql-183-179-1613-1517-and-1422-released-3246/).

---

### Q2. PostgreSQL vs MySQL — quick comparison.

| Aspect             | PostgreSQL                      | MySQL (InnoDB)            |
| ------------------ | ------------------------------- | ------------------------- |
| MVCC               | Row versioning (tuples)         | Undo-log-based            |
| Isolation default  | Read Committed                  | Repeatable Read           |
| JSON               | First-class `jsonb` + SQL/JSON  | `JSON` type, weaker tooling |
| Index types        | 6 native (B-tree, Hash, GiST, GIN, BRIN, SP-GiST) | Mostly B-tree + spatial   |
| Extensibility      | Custom types, languages, indexes | Limited                  |
| Schema flexibility | Strong (transactional DDL)      | Weak (DDL implicit commit) |
| Default storage    | Row-based                       | Row-based, B+-tree clustered on PK |

For analytics + complex types: PostgreSQL usually wins. For "standard CRUD at any cost," MySQL is comparable.

---

### Q3. What is a tablespace / schema / database?

| Level     | Purpose                                                |
| --------- | ------------------------------------------------------ |
| Cluster   | The PostgreSQL server instance (multiple databases).   |
| Database  | A self-contained DB (own catalog, schemas, users).     |
| Schema    | Namespace inside a DB (`public`, `auth`, `app`, etc.). |
| Tablespace | Physical storage location (a directory).              |

A connection picks a database; objects are referenced as `schema.table` (defaults to `public` if unqualified).

---

## 2. ACID & MVCC

---

### Q4. What is MVCC?

**Multi-Version Concurrency Control**: each tuple (row version) has hidden columns:
- `xmin` — transaction ID that **inserted** this version.
- `xmax` — transaction ID that **deleted** or updated this version (0 if still alive).

Readers don't block writers, writers don't block readers. Each transaction sees a **snapshot** consistent with its start (or statement, depending on isolation).

Trade-off: dead tuples accumulate → **vacuum** is required.

---

### Q5. Why does an UPDATE create a new tuple?

PostgreSQL never updates in place. An UPDATE:
1. Marks the old tuple with `xmax = current_xid`.
2. Inserts a new tuple with `xmin = current_xid`.
3. Updates indexes (unless HOT — Heap-Only Tuple — optimization applies).

This is why "row bloat" happens — repeated updates leave dead versions behind until vacuum.

---

### Q6. What does `VACUUM` do?

Two flavors:
- **VACUUM** (regular): marks dead tuples reusable (frees space within the table file).
- **VACUUM FULL**: rewrites the entire table, reclaims space to OS. **Locks the table**.

Run by **autovacuum** automatically based on dead-tuple thresholds. Tune `autovacuum_vacuum_scale_factor` per table for high-churn workloads.

Also: vacuum freezes old `xmin` values to prevent **transaction ID wraparound** (XIDs are 32-bit; ~4B txn cycle requires freezing).

---

### Q7. Transaction ID wraparound — why does it matter?

XIDs are 32-bit and wrap. Tuples with `xmin` older than the wraparound become invisible (or visible to the wrong transactions).

Vacuum periodically **freezes** old tuples — sets a special marker that means "always visible". `autovacuum_freeze_max_age` forces a vacuum-freeze even when autovacuum is disabled.

This is why a long-running idle transaction is dangerous: it can prevent freezing, eventually triggering single-user-mode forced vacuums or DB shutdown.

---

## 3. Isolation Levels

---

### Q8. What isolation levels does Postgres support?

Verified — [Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html):

| Level             | PostgreSQL behavior                                            |
| ----------------- | -------------------------------------------------------------- |
| Read Uncommitted  | Treated as Read Committed (no dirty reads in PG ever)          |
| **Read Committed** (default) | Each statement sees a fresh snapshot                |
| Repeatable Read   | **Snapshot isolation** — phantoms also prevented in PG         |
| Serializable      | SSI on top of RR; detects + aborts true serialization anomalies |

PG's RR is stronger than the SQL standard requires. PG's Serializable is "true" serializability via the Serializable Snapshot Isolation algorithm (no locks; runtime conflict detection).

---

### Q9. What are dirty reads, non-repeatable reads, phantoms?

- **Dirty read**: see another txn's uncommitted change. PG never allows.
- **Non-repeatable read**: same row, different value in second read.
- **Phantom read**: same query, new rows appear.
- **Serialization anomaly**: a non-serializable execution that no concurrent ordering could produce.

| Level             | Dirty | Non-rep | Phantom | Anomaly |
| ----------------- | ----- | ------- | ------- | ------- |
| Read Committed    | ❌    | ✅      | ✅      | ✅      |
| Repeatable Read   | ❌    | ❌      | **❌** (in PG) | ✅ |
| Serializable      | ❌    | ❌      | ❌      | ❌      |

---

### Q10. When would you use Serializable?

When your business logic depends on invariants that span multiple rows (transfer between accounts, inventory count). Repeatable Read might let two concurrent transactions each read 1 unit of inventory and each sell — Serializable catches and aborts one.

Cost: more aborts under contention → retry logic in app code.

---

## 4. Indexes

---

### Q11. What index types does PostgreSQL support?

Verified six built-in types — [Index Types](https://www.postgresql.org/docs/current/indexes-types.html):

| Type     | Best for                                            |
| -------- | --------------------------------------------------- |
| **B-tree** | Default. Equality + range + sortable types        |
| **Hash**   | Equality only (faster than B-tree for `=`)        |
| **GiST**   | Geometric, full-text search, hierarchical types   |
| **SP-GiST** | Non-balanced data (IP routing, phone numbers)    |
| **GIN**    | Multi-value: arrays, jsonb, hstore, full-text search |
| **BRIN**   | Block-range summaries — huge tables physically sorted |

Choosing the right type is a senior-level skill — most apps use B-tree exclusively, missing big wins on JSON / arrays / range queries.

---

### Q12. When does an index NOT help?

- **Low cardinality**: WHERE on a boolean usually slower with index than scan.
- **Selectivity > ~10%**: planner may prefer a seq scan because random I/O cost beats sequential read.
- **Function applied to column**: `WHERE LOWER(name) = 'x'` won't use a `name` index — use an **expression index** on `LOWER(name)`.
- **Leading column missing in compound index**: `(a, b, c)` doesn't help WHERE `b = ?`.
- **Wrong operator class**: `LIKE 'x%'` uses index; `LIKE '%x'` doesn't (no left-anchor).

---

### Q13. Partial indexes.

```sql
CREATE INDEX users_active_email ON users(email) WHERE active = true;
```

Smaller index, faster builds, only useful for queries that filter on the same predicate. Great for "small subset of hot rows in a huge table."

---

### Q14. Expression indexes.

```sql
CREATE INDEX users_lower_email ON users(LOWER(email));

-- Query that benefits:
SELECT * FROM users WHERE LOWER(email) = LOWER($1);
```

Lets you index computed values. Combine with partial index for `WHERE LOWER(email) = ... AND active = true`.

---

### Q15. Multi-column index ordering.

```sql
CREATE INDEX o ON orders(customer_id, status, created_at DESC);
```

ESR rule (Equality, Sort, Range), similar to MongoDB:
- Leading columns are equality-matched (`WHERE customer_id = ?`).
- Sort matches index sort direction (`ORDER BY created_at DESC`).
- Range comes last (`AND created_at > now() - interval '7 days'`).

PG 18 introduced **B-tree skip scan** — improves usability of leading columns even when one isn't filtered.

---

### Q16. GIN index for JSONB.

```sql
CREATE INDEX products_attr ON products USING GIN(attributes);

-- Query that benefits:
SELECT * FROM products WHERE attributes @> '{"color": "red"}';
```

`@>` is the containment operator — "does the JSON contain this key/value?" GIN is optimized for these.

For path-specific queries, **jsonb_path_ops** is a smaller, faster GIN variant:
```sql
CREATE INDEX ON products USING GIN(attributes jsonb_path_ops);
```

---

## 5. Query Planner

---

### Q17. What does `EXPLAIN` show?

```sql
EXPLAIN SELECT * FROM users WHERE email = 'a@x.com';
```

Shows the **planned** strategy: which indexes, scan types, joins, costs.

For real timing + buffer info:
```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;
```

PG 18 turned `BUFFERS` on by default with `ANALYZE`.

---

### Q18. Common scan types.

- **Seq Scan**: full table scan. OK for small tables or low selectivity.
- **Index Scan**: walks the index, fetches matching tuples.
- **Index Only Scan**: index has all data needed (covering); no heap visit. Fast.
- **Bitmap Index Scan + Bitmap Heap Scan**: planner picks this for medium selectivity — collects TIDs in a bitmap, then reads heap in sorted order.
- **Parallel Seq Scan / Index Scan**: workers split work (parallel queries since PG 9.6, much improved in recent versions).

---

### Q19. How does the planner decide?

Cost-based: each node has an estimated cost. Plan with lowest total cost wins.

Costs depend on:
- `pg_statistic` (table stats, histograms) — refreshed by `ANALYZE`.
- Cost constants (`random_page_cost`, `seq_page_cost`, `cpu_tuple_cost`, ...).
- `effective_cache_size` — hint about OS + PG buffer cache size.

If you see weird plans: usually outdated stats. Run `ANALYZE` (or `VACUUM ANALYZE`).

---

### Q20. Join algorithms.

- **Nested Loop**: for each outer row, scan inner. Cheap when one side is small or indexed.
- **Hash Join**: build hash on smaller side, probe with larger. Best for equality joins on big tables.
- **Merge Join**: both sides sorted; merge. Best when sorted output is already available (index order).

Tune with `enable_*` flags to debug; never disable in production.

---

## 6. WAL & Durability

---

### Q21. What is the WAL?

**Write-Ahead Log**. Every change is written to the WAL **before** the data files. On crash, replay WAL forward to recover.

Key files:
- `pg_wal/` — sequence of WAL segments (16 MB each by default).
- `pg_xlog/` (old name pre-10).

Used by:
- Crash recovery.
- Streaming replication (replicas read primary's WAL).
- Logical replication (decoded WAL records).
- Point-in-time recovery (PITR).

---

### Q22. Checkpoints.

A **checkpoint** flushes all dirty buffers to disk and writes a checkpoint record to WAL. On crash, recovery starts from the latest checkpoint instead of replaying all WAL since startup.

Configured by:
- `checkpoint_timeout` (default 5 min).
- `max_wal_size` (default 1 GB).

Checkpoints can cause I/O spikes. `checkpoint_completion_target` spreads them out (now 0.9 by default).

---

### Q23. `fsync`, `synchronous_commit` — durability trade-offs.

- `fsync = on` (default): writes go through fsync to durable storage. Don't disable.
- `synchronous_commit = on` (default): wait for WAL flush before ack. Lose < 1 txn on crash.
- `synchronous_commit = off`: don't wait. Up to 3× faster commit, but you can lose recent transactions on crash. Use for low-stakes data (logs, analytics ingest).

`fsync = off` is dangerous — you can corrupt the DB irrecoverably on power loss. Never in production.

---

## 7. JSON & SQL/JSON

---

### Q24. `json` vs `jsonb` — which to use?

| `json`          | `jsonb`                       |
| --------------- | ----------------------------- |
| Text-form       | Binary form (decoded once)    |
| Preserves whitespace, key order, duplicate keys | Normalizes |
| Slower to query | Fast for `->`, `@>`, indexable |
| Smaller for write-heavy archival use | Slightly larger but better at runtime |

**Default to `jsonb`**. Only use `json` if you need to preserve the exact original text.

---

### Q25. SQL/JSON in PostgreSQL 17+.

Verified — [PG 17 release notes](https://www.postgresql.org/docs/17/release-17.html). New functions:

```sql
-- JSON_TABLE: expand JSON into rows
SELECT t.* FROM json_data,
  JSON_TABLE(json_data, '$.items[*]' COLUMNS (
    id INT PATH '$.id',
    name TEXT PATH '$.name'
  )) AS t;

-- JSON_EXISTS
SELECT * FROM products WHERE JSON_EXISTS(attributes, '$.color');

-- JSON_QUERY (returns subtree)
SELECT JSON_QUERY(attributes, '$.address') FROM customers;

-- JSON_VALUE (returns scalar)
SELECT JSON_VALUE(attributes, '$.color' RETURNING TEXT) FROM products;
```

Brings PG in line with the SQL/JSON standard.

---

### Q26. Indexing JSONB.

```sql
-- General GIN
CREATE INDEX ON products USING GIN(attributes);
-- Smaller/faster, only supports @> and ?
CREATE INDEX ON products USING GIN(attributes jsonb_path_ops);
-- Specific path
CREATE INDEX ON products USING BTREE((attributes->>'color'));
```

For frequently-queried known keys, a B-tree expression index is often faster than GIN.

---

## 8. Replication

---

### Q27. Physical (streaming) vs logical replication.

| Aspect          | Physical                          | Logical                          |
| --------------- | --------------------------------- | -------------------------------- |
| Granularity     | Whole cluster (byte-level WAL)    | Per-table (decoded SQL)          |
| Replica writable | No (read-only)                   | Yes (only the published tables)  |
| Cross-version   | No (binary compat needed)         | Yes (e.g., 16 → 17 migration)    |
| Replication slot | Optional                         | Required                         |
| Use case        | HA / DR / read replicas           | Selective replication, ETL, upgrades |

Both since PG 10. Logical replication has matured significantly through 16, 17, 18.

---

### Q28. PG 16+ logical replication on standby.

Verified — [PG 16 features](https://www.postgresql.org/about/press/presskit16/): logical decoding can now read from a **standby**, offloading replication CPU from the primary. Big win for read-heavy clusters.

PG 16 also added **parallel apply** of large transactions on subscribers — major perf improvement for bulk loads.

---

### Q29. Synchronous replication.

```
synchronous_commit = on
synchronous_standby_names = 'replica1, replica2'
```

The primary waits for at least one named standby to confirm the write before ack. Stronger durability, higher latency. Trade-off similar to MongoDB's `w: 'majority'`.

Modes: `local` (no wait), `remote_write` (wait for standby to receive), `on` (wait for WAL fsynced on standby), `remote_apply` (wait for standby to apply).

---

## 9. PostgreSQL 18 Highlights

---

### Q30. Major features in PostgreSQL 18.

Verified — [PG 18 release notes](https://www.postgresql.org/docs/current/release-18.html):

- **Asynchronous I/O subsystem**: up to ~3× faster reads for some workloads.
- **B-tree skip scan**: better use of multicolumn indexes when intermediate keys are skipped.
- **`pg_upgrade` preserves planner stats**: smaller post-upgrade performance dip.
- **`uuidv7()`**: time-sortable UUIDs (great for index locality).
- **Virtual generated columns**: now the default for `GENERATED ... AS (...) VIRTUAL`.
- **OAuth authentication**: native support.
- **OLD/NEW in RETURNING**: see both pre/post images of modified rows.
- **Temporal constraints**: range-based PK/UNIQUE/FK (history table patterns).

---

### Q31. Asynchronous I/O — what does it actually do?

Before PG 18, PG read pages synchronously: request → wait → process. PG 18 introduces **prefetching** + a pluggable I/O backend (currently `io_uring` on Linux, `posix_aio` fallback).

The planner can issue concurrent read requests to the OS, overlapping I/O with computation. Most beneficial for analytical / scan-heavy workloads.

Tunable: `io_method = io_uring | posix_aio | sync`.

---

### Q32. B-tree skip scan — what is it?

For a compound index `(a, b)`:
```sql
-- Old: full scan because no a filter
SELECT * FROM t WHERE b = 5;

-- PG 18: skip scan jumps through distinct a values
```

Especially helps with low-cardinality leading columns. Doesn't replace index design, but reduces "I should have added another index" pain.

---

## 10. Other PG-Specific Features

---

### Q33. Common Table Expressions (CTE).

```sql
WITH active_users AS (
  SELECT id, email FROM users WHERE last_seen > NOW() - INTERVAL '7 days'
)
SELECT au.email, COUNT(*) AS orders
FROM active_users au
JOIN orders o ON o.user_id = au.id
GROUP BY au.email;
```

Since PG 12, non-recursive CTEs are **inlined by default** — the optimizer sees through them. Force materialization:

```sql
WITH active_users AS MATERIALIZED (...)
```

Recursive CTEs (`WITH RECURSIVE`) for trees / graphs.

---

### Q34. Window functions.

```sql
SELECT
  customer_id,
  amount,
  SUM(amount) OVER (PARTITION BY customer_id ORDER BY created_at) AS running_total,
  ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY amount DESC) AS rank
FROM orders;
```

Don't collapse rows — annotate each row with computed aggregates. `OVER ()` over the full result, or `OVER (PARTITION BY ...)` per group.

---

### Q35. Generated columns.

```sql
ALTER TABLE products
ADD COLUMN search_text TEXT GENERATED ALWAYS AS (
  name || ' ' || description
) STORED;
```

`STORED`: computed on write, stored.
`VIRTUAL` (default in PG 18): computed on read.

Useful for indexed expressions without managing triggers.

---

### Q36. Partitioning.

```sql
CREATE TABLE logs (
  id BIGSERIAL,
  ts TIMESTAMPTZ NOT NULL,
  body JSONB
) PARTITION BY RANGE (ts);

CREATE TABLE logs_2026_05 PARTITION OF logs FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
```

Strategies: `RANGE`, `LIST`, `HASH`. Plus default partition, sub-partitioning, partition pruning, partition-wise joins.

Use for huge tables (10M+ rows). Drop entire partitions instead of `DELETE` for retention.

---

### Q37. Extensions worth knowing.

| Extension          | Use case                                       |
| ------------------ | ---------------------------------------------- |
| `pg_stat_statements` | Per-query performance metrics                |
| `pg_trgm`          | Trigram fuzzy matching (similarity search)     |
| `pgvector`         | Vector similarity search (AI / embeddings)     |
| `PostGIS`          | Geospatial — first-class support               |
| `Citus`            | Distributed Postgres (sharding)                |
| `pg_partman`       | Partition management automation                |
| `pgcrypto`         | Cryptographic functions                        |
| `hstore`           | Key-value pairs (mostly superseded by jsonb)   |
| `pg_cron`          | In-database cron scheduling                    |
| `pg_repack`        | Online VACUUM FULL alternative                 |

---

## 11. Common Misconceptions

---

### Q38. "VACUUM frees disk space" — actually?

Regular `VACUUM`: marks space reusable inside the table, doesn't shrink the file.

`VACUUM FULL`: rewrites the table, shrinks files. Locks the table.

`pg_repack` extension: online rewrite, similar to VACUUM FULL without the lock.

---

### Q39. "SELECT COUNT(*) is cheap" — actually?

It's a sequential scan (or index-only scan on a small index). For tables with millions of rows, slow.

Alternatives:
- `pg_class.reltuples` — fast estimate (refreshed by VACUUM ANALYZE).
- Materialized views.
- Trigger-maintained counters (with care).

```sql
SELECT reltuples::bigint FROM pg_class WHERE relname = 'mytable';
```

---

### Q40. "DROP TABLE rolls back" — actually?

In PostgreSQL, **DDL is transactional**. `BEGIN; DROP TABLE x; ROLLBACK;` cancels the drop. Unique among major databases.

Useful for safe migrations: wrap schema changes + data backfills in a single transaction.

---

## Final Senior Tips

1. **MVCC means readers don't block writers** — design around bloat (vacuum, partitioning).
2. **`EXPLAIN (ANALYZE, BUFFERS)`** is your friend — never tune blind.
3. **Pick the right index type** (B-tree, GIN, BRIN, GiST) — most teams use only B-tree and leave performance on the table.
4. **Default to `jsonb`** for JSON; PG 17's SQL/JSON makes it more powerful.
5. **DDL is transactional** — use it for atomic migrations.
