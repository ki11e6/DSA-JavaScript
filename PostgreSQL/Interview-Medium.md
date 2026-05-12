# PostgreSQL — Medium Interview Questions

> **Audience**: 2–5 yr engineers.
> **Goal**: Advanced SQL, indexes, JSON, transactions, performance basics, locking, common patterns.
> Verified against [postgresql.org/docs](https://www.postgresql.org/docs) (PostgreSQL 18.3, May 2026).

---

## 1. Advanced SQL

---

### Q1. Window functions — running totals.

```sql
SELECT
  user_id,
  amount,
  SUM(amount) OVER (PARTITION BY user_id ORDER BY created_at) AS running_total,
  AVG(amount) OVER (PARTITION BY user_id ORDER BY created_at
                    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS rolling_avg_7
FROM orders;
```

Doesn't collapse rows — annotates each row with computed aggregates.

---

### Q2. Ranking with `ROW_NUMBER`, `RANK`, `DENSE_RANK`.

```sql
SELECT
  name,
  score,
  ROW_NUMBER() OVER (ORDER BY score DESC) AS rn,    -- 1,2,3,4,5
  RANK()       OVER (ORDER BY score DESC) AS rk,    -- 1,2,2,4,5 (gaps after ties)
  DENSE_RANK() OVER (ORDER BY score DESC) AS drk    -- 1,2,2,3,4 (no gaps)
FROM players;
```

Use `ROW_NUMBER` for "top 1 per group" patterns:

```sql
SELECT * FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY country ORDER BY score DESC) AS rn
  FROM users
) t WHERE rn = 1;
```

---

### Q3. Common Table Expressions (CTE).

```sql
WITH recent AS (
  SELECT id, user_id FROM orders WHERE created_at > NOW() - INTERVAL '7 days'
),
counts AS (
  SELECT user_id, COUNT(*) AS n FROM recent GROUP BY user_id
)
SELECT u.email, c.n
FROM counts c
JOIN users u ON u.id = c.user_id
WHERE c.n > 5;
```

Since PG 12, CTEs are **inlined by default** (the optimizer can push predicates through). Force materialization with `WITH ... AS MATERIALIZED ()`.

---

### Q4. Recursive CTE — tree traversal.

```sql
WITH RECURSIVE tree AS (
  SELECT id, parent_id, name, 1 AS depth FROM categories WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.parent_id, c.name, t.depth + 1
  FROM categories c JOIN tree t ON c.parent_id = t.id
)
SELECT * FROM tree ORDER BY depth, name;
```

Two parts:
- Base case (anchor query).
- Recursive case (references the CTE itself).

Add a `WHERE depth < 10` guard to prevent infinite recursion if data has cycles.

---

### Q5. `LATERAL` joins.

```sql
SELECT u.id, recent.title
FROM users u
LEFT JOIN LATERAL (
  SELECT title FROM posts WHERE user_id = u.id ORDER BY created_at DESC LIMIT 3
) recent ON true;
```

The subquery can reference `u` — runs once per outer row. Powerful for "top-N per group" without window functions.

---

### Q6. Subquery vs JOIN — when to use which?

```sql
-- JOIN
SELECT u.* FROM users u JOIN orders o ON o.user_id = u.id WHERE o.amount > 100;

-- Subquery with IN
SELECT * FROM users WHERE id IN (SELECT user_id FROM orders WHERE amount > 100);

-- Subquery with EXISTS
SELECT * FROM users u WHERE EXISTS (SELECT 1 FROM orders WHERE user_id = u.id AND amount > 100);
```

Modern planner often produces similar plans for IN/EXISTS/JOIN. `EXISTS` is conceptually clearer for "matches any" and short-circuits on first match.

---

### Q7. UNION vs UNION ALL.

```sql
SELECT id FROM users_old
UNION                  -- deduplicates (sort or hash)
SELECT id FROM users_new;

SELECT id FROM users_old
UNION ALL              -- preserves duplicates, faster
SELECT id FROM users_new;
```

Use `UNION ALL` unless you genuinely need de-dup. Dedup costs CPU + memory.

---

## 2. JSONB

---

### Q8. Querying JSONB.

```sql
-- Field access
SELECT attributes->>'color' AS color FROM products;   -- text
SELECT attributes->'address' AS addr FROM customers;  -- jsonb subtree
SELECT (attributes->>'age')::int FROM users;          -- cast to int

-- Containment
SELECT * FROM products WHERE attributes @> '{"color": "red"}';

-- Key existence
SELECT * FROM products WHERE attributes ? 'color';
SELECT * FROM products WHERE attributes ?& ARRAY['color', 'size'];  -- all
SELECT * FROM products WHERE attributes ?| ARRAY['color', 'size'];  -- any

-- Path
SELECT attributes #>> '{address,city}' FROM customers;  -- text
```

---

### Q9. JSONB updates.

```sql
-- Set a key
UPDATE products SET attributes = attributes || '{"color": "blue"}'::jsonb;

-- Remove a key
UPDATE products SET attributes = attributes - 'color';

-- Set nested path
UPDATE customers
SET attributes = jsonb_set(attributes, '{address,city}', '"NYC"');

-- Conditional set if path doesn't exist
UPDATE customers
SET attributes = jsonb_set(attributes, '{verified}', 'true', true);
```

---

### Q10. Index JSONB efficiently.

```sql
-- General GIN — covers @>, ?, ?&, ?|
CREATE INDEX products_attr_gin ON products USING GIN(attributes);

-- jsonb_path_ops — smaller, faster, only covers @>
CREATE INDEX products_attr_path ON products USING GIN(attributes jsonb_path_ops);

-- Specific field
CREATE INDEX products_color ON products((attributes->>'color'));
```

For "I always filter by color": B-tree expression index. For "I query many JSONB fields": GIN.

---

### Q11. SQL/JSON (PG 17+).

```sql
-- JSON_TABLE: expand into relational form
SELECT items.*
FROM customers,
  JSON_TABLE(
    orders, '$.items[*]'
    COLUMNS (
      sku TEXT PATH '$.sku',
      qty INT PATH '$.quantity'
    )
  ) AS items;

-- JSON_EXISTS / JSON_VALUE / JSON_QUERY
SELECT * FROM orders WHERE JSON_EXISTS(items, '$ ? (@.qty > 10)');
SELECT JSON_VALUE(attrs, '$.color' RETURNING TEXT) FROM products;
SELECT JSON_QUERY(attrs, '$.tags') FROM products;
```

PG 17 added the SQL/JSON standard. More portable than the PG-specific operators.

---

## 3. Indexes — Beyond B-tree

---

### Q12. GIN for arrays.

```sql
CREATE TABLE posts (
  id BIGSERIAL PRIMARY KEY,
  title TEXT,
  tags TEXT[]
);
CREATE INDEX posts_tags ON posts USING GIN(tags);

-- Now fast:
SELECT * FROM posts WHERE tags @> ARRAY['mongodb'];
SELECT * FROM posts WHERE tags && ARRAY['mongodb', 'postgres'];  -- overlaps
```

---

### Q13. BRIN — for big sorted tables.

```sql
CREATE INDEX logs_ts_brin ON logs USING BRIN(ts);
```

Summarizes blocks (default 128 pages per block). 1000× smaller than B-tree. Works when data is **physically sorted** by the column (e.g., insert-ordered time series).

For 10 GB+ tables, BRIN can outperform B-tree on range scans while costing almost nothing in writes/space.

---

### Q14. `pg_trgm` for fuzzy search.

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX users_name_trgm ON users USING GIN(name gin_trgm_ops);

-- ILIKE with leading wildcard now uses index:
SELECT * FROM users WHERE name ILIKE '%shar%';
SELECT *, similarity(name, 'sharath') AS sim FROM users
ORDER BY sim DESC LIMIT 10;
```

Used for autocomplete, "did you mean", typo tolerance. Cheaper than running Elasticsearch for small / medium datasets.

---

### Q15. Full-text search basics.

```sql
ALTER TABLE articles ADD COLUMN search tsvector
  GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || body)) STORED;
CREATE INDEX articles_search ON articles USING GIN(search);

SELECT * FROM articles
WHERE search @@ plainto_tsquery('english', 'database performance')
ORDER BY ts_rank(search, plainto_tsquery('english', 'database performance')) DESC;
```

For more advanced search: Atlas Search-equivalent in PG world is **pg_search / ParadeDB** or external (Meilisearch, Typesense).

---

## 4. Transactions & Concurrency

---

### Q16. Isolation level in code.

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
-- ...
COMMIT;
```

In Node `pg`:
```js
await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY');
```

Default is Read Committed. Bump to Repeatable Read for "all my reads see the same snapshot". Bump to Serializable for "true serializable; aborts conflicts".

---

### Q17. Serializable retry pattern.

```js
async function transferWithRetry(from, to, amount) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      // ... do work ...
      await client.query('COMMIT');
      return;
    } catch (e) {
      await client.query('ROLLBACK');
      if (e.code === '40001' /* serialization_failure */) continue;
      throw e;
    }
  }
  throw new Error('too many retries');
}
```

Serializable aborts conflicting transactions with code `40001`. Always retry on that — it's normal under contention.

---

### Q18. Row-level locking — `FOR UPDATE`.

```sql
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

`FOR UPDATE` locks the matched rows. Other transactions trying to update or `FOR UPDATE` the same rows wait. Use for read-then-write patterns where a transaction's logic depends on the read value.

`FOR NO KEY UPDATE`, `FOR SHARE`, `FOR KEY SHARE` — finer-grained locks for FK validation.

---

### Q19. Advisory locks.

```sql
-- Acquire (session-scoped)
SELECT pg_advisory_lock(42);
-- ... do work ...
SELECT pg_advisory_unlock(42);

-- Try without blocking
SELECT pg_try_advisory_lock(42);
```

App-managed mutex via the database. Useful for "only one job processor running at a time" without an external lock service.

Scopes: session (manual unlock) or transaction (auto-released on commit/rollback).

---

### Q20. Deadlocks — what causes them?

Two transactions hold locks on different rows and each tries to acquire the other's lock. Postgres detects the cycle (after `deadlock_timeout`, default 1s) and aborts one transaction.

Prevention:
- Lock rows in a **consistent order** (e.g., always `MIN(a, b), MAX(a, b)`).
- Keep transactions **short**.
- Avoid holding locks across user interaction.

Diagnose: `pg_locks` view, `pg_stat_activity`.

---

## 5. Performance

---

### Q21. EXPLAIN ANALYZE — reading the output.

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users WHERE email = 'a@x.com';
```

```
Index Scan using users_email_uniq on users  (cost=0.42..8.44 rows=1 width=...)
  Index Cond: (email = 'a@x.com'::text)
  Buffers: shared hit=4
Planning Time: 0.123 ms
Execution Time: 0.045 ms
```

Look for:
- `Seq Scan` on big tables (probably missing index).
- Rows estimated vs actual — huge differences mean stale stats.
- `Sort` requiring large memory (`external merge`).
- `Hash Join` building on the larger side.

---

### Q22. Why is my query slow despite an index?

Common causes:
- **Function on column**: `WHERE LOWER(email) = ...` — needs expression index.
- **Type mismatch**: `WHERE id = '42'` (string vs int).
- **Low selectivity**: planner correctly chose seq scan; index won't help.
- **Stale stats**: run `ANALYZE`.
- **Bloated table**: lots of dead tuples; `VACUUM` (or `VACUUM FULL`).
- **Cached plan with wrong shape** (prepared statements + parameter sniffing).

---

### Q23. `pg_stat_statements`.

```sql
CREATE EXTENSION pg_stat_statements;

SELECT query, calls, mean_exec_time, total_exec_time, rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC LIMIT 20;
```

Shows per-query stats — your "top time consumers" list. The single most useful extension for performance tuning.

---

### Q24. Connection pooling — why?

Postgres uses one process per connection. Each connection consumes ~10 MB of memory plus shared resources. 1000 connections → 10 GB+ of process memory.

Solution: **pool** at the application or use **PgBouncer**:
```ini
[databases]
mydb = host=db port=5432 dbname=mydb

[pgbouncer]
pool_mode = transaction
max_client_conn = 10000
default_pool_size = 50
```

App connects to PgBouncer; PgBouncer holds 50 connections to PG and multiplexes 10,000 clients. Critical for serverless / Lambda use.

---

### Q25. `LIMIT 1` for fast existence check.

```sql
-- Slow on big tables:
SELECT COUNT(*) > 0 FROM events WHERE user_id = 1;

-- Fast:
SELECT EXISTS(SELECT 1 FROM events WHERE user_id = 1 LIMIT 1);
```

`EXISTS` short-circuits on first match. Always use for "is there any …?" patterns.

---

### Q26. Avoid SELECT *.

- Loads unused columns into memory.
- Defeats covering indexes.
- Breaks application code on schema changes.

```sql
SELECT id, email FROM users;  -- explicit
```

Especially important for hot read paths.

---

## 6. Partitioning

---

### Q27. When to partition.

- Table is 10M+ rows and growing fast.
- Queries reliably filter by a column (time range, tenant, region).
- Retention policies require dropping old data efficiently.

```sql
CREATE TABLE events (
  id BIGSERIAL,
  ts TIMESTAMPTZ NOT NULL,
  body JSONB
) PARTITION BY RANGE (ts);

CREATE TABLE events_2026_05 PARTITION OF events
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
```

Drop old data instantly:
```sql
DROP TABLE events_2025_05;
```

Vs. DELETE on a 10B-row table — minutes to hours of vacuum churn.

---

### Q28. Partition pruning.

```sql
SELECT * FROM events WHERE ts > '2026-05-01';
-- Planner only scans matching partitions
```

Critical: query must include the partition key in WHERE. Otherwise PG scans every partition.

`enable_partition_pruning = on` (default) — checks at plan time. `enable_partitionwise_join = on` allows joins to scope per-partition (faster on huge partitioned tables).

---

## 7. Common Patterns

---

### Q29. Soft delete.

```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;

-- Filter in every query:
SELECT * FROM users WHERE deleted_at IS NULL;

-- Or wrap in a view:
CREATE VIEW active_users AS SELECT * FROM users WHERE deleted_at IS NULL;
```

Adds complexity to every query. Prefer hard delete + audit log for most cases. Soft delete makes sense when "recoverability for X days" is a hard requirement.

---

### Q30. Audit columns + trigger.

```sql
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

Now `updated_at` auto-updates on every UPDATE.

For full audit history (who, what, when), consider a separate `audit_log` table or extensions like `pgaudit`.

---

### Q31. Outbox pattern (transactional outbox).

```sql
-- In the same transaction:
INSERT INTO orders (...) VALUES (...);
INSERT INTO outbox (event_type, payload) VALUES ('order_created', ...);
COMMIT;

-- A separate worker reads outbox, publishes to Kafka, marks delivered.
```

Guarantees that the event is **never lost** if the order commit succeeds. Combine with logical replication or Debezium for at-least-once delivery.

---

### Q32. Materialized views.

```sql
CREATE MATERIALIZED VIEW daily_sales AS
SELECT date_trunc('day', created_at) AS day, SUM(amount) AS total
FROM orders GROUP BY 1;

REFRESH MATERIALIZED VIEW daily_sales;
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales;  -- non-blocking, requires unique idx
```

Snapshot the heavy aggregation. Refresh periodically (cron, after big imports). Used heavily for analytics.

---

## 8. JSON + Patterns

---

### Q33. EAV (Entity-Attribute-Value) — when to use?

When schema is genuinely dynamic / user-defined. For most cases, **JSONB** is a better modern choice:

```sql
-- EAV (legacy)
CREATE TABLE attributes (entity_id BIGINT, key TEXT, value TEXT);

-- JSONB (modern)
ALTER TABLE products ADD COLUMN attributes JSONB;
CREATE INDEX ON products USING GIN(attributes);
```

JSONB is denser, indexable, easier to query. EAV requires expensive joins.

---

### Q34. Storing arrays vs separate rows.

```sql
-- Array
ALTER TABLE posts ADD COLUMN tags TEXT[];
CREATE INDEX ON posts USING GIN(tags);

-- Junction table
CREATE TABLE post_tags (post_id BIGINT, tag TEXT, PRIMARY KEY (post_id, tag));
```

Arrays: simpler, faster reads, but updating one tag mid-list is awkward and you can't FK on individual elements.

Junction table: cleaner relational, supports FKs, slower per-post-with-tags query.

Pick by access pattern: if you always show all tags together → array. If tag is a first-class entity with its own metadata → junction.

---

## 9. Misc

---

### Q35. Generate UUIDv7 (PG 18).

```sql
SELECT uuidv7();
```

Native function in PG 18+. Time-sortable UUIDs — like `ObjectId` for index locality. Use as primary key for natural time ordering without exposing sequence numbers.

---

### Q36. Connection pool sizing.

Rule of thumb: `pool_size ≈ cores × 2` per app instance (Tomcat/Hikari pool sizing wisdom).

For Node:
```js
const pool = new Pool({ max: 20 });
```

For serverless: use PgBouncer in transaction mode + smaller per-instance pool (often 1–5).

---

### Q37. Why isn't my session pool returning connections?

Usually: code path forgets to `client.release()`. Check for:
- `try/finally` with release in finally.
- Exceptions that escape before release.

Symptoms: connection count climbs over time, requests start timing out.

---

### Q38. Read replicas for scaling.

```js
const writes = new Pool({ connectionString: WRITER_URL });
const reads = new Pool({ connectionString: REPLICA_URL });

// Use reads for analytics, writes for transactions
await reads.query('SELECT ...');
await writes.query('INSERT ...');
```

Watch out for **read-your-writes**: a write to the primary might not be visible on the replica yet. Either:
- Route reads-after-writes back to primary.
- Use synchronous replication.
- Accept eventual consistency on non-critical reads.
