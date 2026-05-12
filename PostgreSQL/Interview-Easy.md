# PostgreSQL — Easy Interview Questions

> **Audience**: Junior / fresher / phone-screen rounds.
> **Goal**: SQL basics, CRUD, joins, simple constraints, basic indexes, connecting from Node.
> Verified against [postgresql.org/docs](https://www.postgresql.org/docs) (PostgreSQL 18.3, May 2026).

---

## 1. Setup & Connection

---

### Q1. Connect to Postgres from Node.js.

```js
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [42]);
console.log(rows);
```

Always use **parameterized queries** (`$1`, `$2`) — never string-concatenate user input. SQL injection risk.

---

### Q2. Connection string format.

```
postgres://user:pass@host:5432/dbname?sslmode=require
```

`sslmode`:
- `disable` — no TLS.
- `require` — TLS, no cert verification.
- `verify-full` — TLS + verify cert + hostname (recommended for production).

---

### Q3. List databases / schemas / tables.

```sql
\l                  -- list databases (psql)
\dn                 -- list schemas
\dt                 -- list tables in current schema
\d users            -- describe a table
```

Or via SQL:
```sql
SELECT datname FROM pg_database;
SELECT schema_name FROM information_schema.schemata;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

---

## 2. Schema Basics

---

### Q4. Create a table.

```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- `BIGSERIAL` = auto-incrementing 64-bit integer.
- `TIMESTAMPTZ` = timestamp with timezone (preferred over `TIMESTAMP`).
- `DEFAULT now()` for created_at.
- `UNIQUE` creates a unique index automatically.

---

### Q5. Common data types.

| Type             | Use case                                       |
| ---------------- | ---------------------------------------------- |
| `INTEGER` / `BIGINT` | Whole numbers                              |
| `NUMERIC(p, s)`  | Exact decimal (money, financial)               |
| `REAL` / `DOUBLE PRECISION` | Floating point                      |
| `TEXT`           | Unbounded string (preferred over `VARCHAR`)    |
| `BOOLEAN`        | true / false                                   |
| `DATE`           | Date only                                      |
| `TIMESTAMP` / `TIMESTAMPTZ` | Datetime (with tz preferred)        |
| `INTERVAL`       | Time duration                                  |
| `UUID`           | UUID                                           |
| `JSON` / `JSONB` | JSON (prefer jsonb)                            |
| `BYTEA`          | Binary blob                                    |
| `ARRAY` (e.g., `TEXT[]`) | Array of any type                      |

For money: **`NUMERIC(12, 2)`** — not `REAL` (float errors).

---

### Q6. Add / drop columns.

```sql
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users DROP COLUMN phone;
ALTER TABLE users ALTER COLUMN name SET NOT NULL;
ALTER TABLE users RENAME COLUMN name TO full_name;
```

DDL is **transactional** in Postgres — wrap in a transaction to atomically migrate:
```sql
BEGIN;
ALTER TABLE users ADD COLUMN phone TEXT;
UPDATE users SET phone = ... FROM ...;
COMMIT;
```

---

### Q7. Primary key and foreign key.

```sql
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`ON DELETE` options:
- `CASCADE`: delete dependent rows.
- `SET NULL`: set the column to NULL.
- `RESTRICT` (default): error if dependents exist.
- `NO ACTION`: like RESTRICT but checked at commit time.

---

## 3. CRUD

---

### Q8. INSERT.

```sql
INSERT INTO users (email, name) VALUES ('a@x.com', 'A');

-- Multiple rows
INSERT INTO users (email, name) VALUES
  ('b@x.com', 'B'),
  ('c@x.com', 'C');

-- Return the inserted row
INSERT INTO users (email, name) VALUES ('d@x.com', 'D') RETURNING id, created_at;
```

`RETURNING` is a Postgres extension — saves you a separate SELECT after insert.

---

### Q9. UPDATE.

```sql
UPDATE users SET name = 'New Name' WHERE id = 1;

-- Multiple columns
UPDATE users SET name = 'X', email = 'x@x.com' WHERE id = 1;

-- With JOIN-like logic
UPDATE orders o
SET status = 'paid'
FROM users u
WHERE o.user_id = u.id AND u.tier = 'premium';
```

Always include a WHERE — naked UPDATE updates the entire table.

---

### Q10. DELETE.

```sql
DELETE FROM users WHERE id = 1;
DELETE FROM users WHERE created_at < NOW() - INTERVAL '1 year';
TRUNCATE TABLE users;  -- fast, no WHERE possible
```

`TRUNCATE` is faster than DELETE for emptying a whole table. It bypasses MVCC overhead but takes an `ACCESS EXCLUSIVE` lock.

---

### Q11. UPSERT — INSERT ON CONFLICT.

```sql
INSERT INTO users (email, name)
VALUES ('a@x.com', 'A')
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    updated_at = now();
```

`EXCLUDED.name` refers to the proposed insert row. `ON CONFLICT DO NOTHING` if you just want idempotent inserts.

---

## 4. SELECT

---

### Q12. Basic SELECT.

```sql
SELECT id, name, email FROM users;
SELECT * FROM users WHERE id = 1;
SELECT DISTINCT country FROM users;
```

---

### Q13. WHERE clauses.

```sql
SELECT * FROM users WHERE age > 18 AND active = true;
SELECT * FROM users WHERE country IN ('US', 'CA');
SELECT * FROM users WHERE email LIKE '%@example.com';
SELECT * FROM users WHERE created_at BETWEEN '2025-01-01' AND '2025-12-31';
SELECT * FROM users WHERE phone IS NULL;
SELECT * FROM users WHERE phone IS NOT NULL;
```

`NULL` is special — `= NULL` doesn't work. Use `IS NULL` / `IS NOT NULL`.

---

### Q14. ORDER BY, LIMIT, OFFSET.

```sql
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;
SELECT * FROM users ORDER BY name ASC LIMIT 10 OFFSET 20;
```

For pagination, **cursor pagination** (range-based) is much faster than OFFSET on large tables:
```sql
SELECT * FROM users WHERE id > $1 ORDER BY id LIMIT 20;
```

---

### Q15. GROUP BY.

```sql
SELECT country, COUNT(*) AS user_count
FROM users
GROUP BY country
ORDER BY user_count DESC;

-- Filter aggregates with HAVING:
SELECT country, COUNT(*) AS c
FROM users
GROUP BY country
HAVING COUNT(*) > 100;
```

Rule: every non-aggregate column in SELECT must be in GROUP BY.

---

## 5. JOINs

---

### Q16. INNER JOIN.

```sql
SELECT u.name, o.amount
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE o.created_at > NOW() - INTERVAL '7 days';
```

Only returns rows where the join condition matches.

---

### Q17. LEFT JOIN.

```sql
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.name;
```

Returns all users, even those with zero orders. Right side becomes NULL for unmatched.

---

### Q18. JOIN types overview.

```
INNER JOIN          intersection
LEFT [OUTER] JOIN   all left rows, matched right or NULL
RIGHT [OUTER] JOIN  all right rows, matched left or NULL
FULL [OUTER] JOIN   all rows from both sides
CROSS JOIN          cartesian product
```

Use `EXISTS` / `NOT EXISTS` for "find users with/without any matching order" — often faster than LEFT JOIN + WHERE IS NULL.

---

## 6. Indexes

---

### Q19. Create an index.

```sql
CREATE INDEX users_email_idx ON users(email);
CREATE UNIQUE INDEX users_email_uniq ON users(email);
CREATE INDEX users_created_idx ON users(created_at DESC);
```

For multi-column:
```sql
CREATE INDEX orders_user_status ON orders(user_id, status);
```

Build a long index without blocking writes:
```sql
CREATE INDEX CONCURRENTLY orders_user_status ON orders(user_id, status);
```

---

### Q20. Drop an index.

```sql
DROP INDEX users_email_idx;
DROP INDEX CONCURRENTLY users_email_idx;
```

Use `CONCURRENTLY` in production to avoid table locks.

---

### Q21. Why is my query not using my index?

Common reasons:
- Function applied to column: `WHERE LOWER(email) = ...` doesn't use a `email` index.
- Implicit type mismatch.
- Low selectivity — planner prefers sequential scan.
- Stats are stale: run `ANALYZE`.
- Index doesn't match leading columns.

Use `EXPLAIN ANALYZE` to see what's actually happening.

---

## 7. Constraints

---

### Q22. NOT NULL, UNIQUE, CHECK.

```sql
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0)
);
```

`CHECK` constraints run on every insert/update. Use sparingly — application-layer validation is usually clearer.

---

### Q23. DEFAULT values.

```sql
CREATE TABLE logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  level TEXT DEFAULT 'info',
  body JSONB DEFAULT '{}'::jsonb
);
```

If you don't supply the column on INSERT, the default applies.

---

### Q24. Generated columns.

```sql
CREATE TABLE rectangles (
  width REAL NOT NULL,
  height REAL NOT NULL,
  area REAL GENERATED ALWAYS AS (width * height) STORED
);
```

Computed automatically. `STORED` = computed on write. `VIRTUAL` (default in PG 18) = on read.

---

## 8. Transactions

---

### Q25. Begin / commit / rollback.

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;

-- Or on error:
ROLLBACK;
```

In Node with `pg`:
```js
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [100, fromId]);
  await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [100, toId]);
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

---

### Q26. What does ACID stand for?

- **Atomicity**: all or nothing.
- **Consistency**: invariants hold after commit.
- **Isolation**: concurrent txns don't interfere visibly.
- **Durability**: committed data survives crashes.

Postgres provides all four out of the box.

---

## 9. Common Built-ins

---

### Q27. Date/time functions.

```sql
SELECT NOW();
SELECT CURRENT_DATE;
SELECT NOW() - INTERVAL '7 days';
SELECT date_trunc('day', created_at), COUNT(*) FROM orders GROUP BY 1;
SELECT EXTRACT(YEAR FROM created_at) FROM orders;
SELECT AGE(birthdate);
```

Prefer `NOW()` over `CURRENT_TIMESTAMP` (they're equivalent — `NOW()` is shorter and idiomatic in PG).

---

### Q28. String functions.

```sql
SELECT UPPER('hello'), LOWER('HELLO');
SELECT LENGTH('hello');
SELECT SUBSTRING('hello' FROM 2 FOR 3);   -- 'ell'
SELECT POSITION('lo' IN 'hello');         -- 4
SELECT REPLACE('foo', 'o', '0');          -- 'f00'
SELECT CONCAT(first_name, ' ', last_name);
SELECT first_name || ' ' || last_name;    -- same with ||
SELECT TRIM('  x  ');                      -- 'x'
```

---

### Q29. Aggregates.

```sql
SELECT
  COUNT(*),
  COUNT(DISTINCT user_id),
  SUM(amount),
  AVG(amount),
  MIN(amount),
  MAX(amount),
  STRING_AGG(name, ', '),
  ARRAY_AGG(id ORDER BY created_at)
FROM orders;
```

---

## 10. Common Mistakes

---

### Q30. NULL comparison with `=`.

```sql
SELECT * FROM users WHERE phone = NULL;       -- 🚫 always empty
SELECT * FROM users WHERE phone IS NULL;      -- ✅
```

`NULL = NULL` is `NULL`, not `TRUE`. Same for other comparisons. Use `IS NULL` / `IS NOT NULL`.

---

### Q31. Forgetting `WHERE` on UPDATE/DELETE.

```sql
UPDATE users SET active = false;    -- 🚫 every row
DELETE FROM users;                   -- 🚫 every row
```

Always include a WHERE. Test in a transaction first:
```sql
BEGIN;
UPDATE users SET ... WHERE ...;
-- count affected rows
ROLLBACK;  -- or COMMIT after verification
```

---

### Q32. `VARCHAR` vs `TEXT`.

`TEXT` is preferred in modern Postgres. `VARCHAR(n)` adds a length check but no storage benefit. Use `TEXT` everywhere, add a `CHECK (length(x) <= 200)` if you need to limit.

---

### Q33. Storing money as `REAL` / `DOUBLE PRECISION`.

```sql
0.1 + 0.2  -- 0.30000000000000004 with float
```

Use `NUMERIC(precision, scale)` for money:
```sql
amount NUMERIC(12, 2)   -- max 9,999,999,999.99
```

Exact decimal arithmetic, no float surprises.

---

### Q34. Forgetting to `ANALYZE` after big data changes.

```sql
ANALYZE users;
VACUUM ANALYZE users;   -- vacuum + analyze
```

Autovacuum usually handles it, but after bulk inserts/updates the planner may have stale stats → bad query plans.

---

### Q35. `psql` shortcuts worth knowing.

```
\q               quit
\l               list databases
\c dbname        connect to db
\dt              list tables
\d tablename     describe table
\dn              list schemas
\du              list users
\df              list functions
\timing          toggle query timing
\e               edit query in $EDITOR
\x               toggle expanded output (great for wide rows)
\?               help
```
