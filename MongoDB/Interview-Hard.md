# MongoDB — Hard Interview Questions

> **Audience**: Senior / staff / architect rounds.
> **Goal**: Deep internals (WiredTiger, replication, sharding semantics, consistency, performance forensics), scaling, large-scale schema decisions.
> Verified against [mongodb.com/docs](https://www.mongodb.com/docs) (MongoDB 8.2, May 2026).

---

## 1. Storage & WiredTiger

---

### Q1. How does WiredTiger store data?

WiredTiger uses **B+-trees** for collection data and indexes. Key features:
- **MVCC** (multi-version concurrency control) — readers don't block writers, writers don't block readers.
- **Document-level locking** — concurrent writes to different docs in the same collection are fine.
- **Compression** — snappy (default), zstd, zlib. Indexes use prefix compression.
- **Block-level cache** — 50% of (RAM - 1 GB) by default, capped at 256 GB.

Each write goes through:
1. WAL (journal) flush.
2. Buffer pool (WiredTiger cache).
3. Eventually flushed to data files at checkpoint (~every 60s).

---

### Q2. What is the WAL and what does it guarantee?

Write-Ahead Log (journal):
- Every write op is appended.
- Synced to disk at intervals (default: every 100ms, or before ack if `j: true`).
- On crash, on restart MongoDB replays the journal forward from the last checkpoint.

Without journaling, a crash mid-write could leave the data files inconsistent. With it, the journal is the source of truth between checkpoints.

`writeConcern: { j: true }` forces the journal to be flushed before ack — strongest single-node durability.

---

### Q3. Compression — when to use which codec?

| Codec   | CPU cost | Ratio    | Use case                       |
| ------- | -------- | -------- | ------------------------------ |
| snappy  | Low      | ~2×      | Default; balanced              |
| zstd    | Medium   | ~3–4×    | Storage-bound; modern default consideration |
| zlib    | High     | ~3–4×    | Older; less common now         |
| none    | Zero     | 1×       | Rarely used                    |

For storage-heavy workloads (logs, time series), **zstd** typically wins. Set at collection level:

```js
db.createCollection('events', {
  storageEngine: { wiredTiger: { configString: 'block_compressor=zstd' } }
});
```

---

### Q4. Why does my MongoDB use a lot of RAM?

WiredTiger uses up to half your RAM for its cache by default. Plus:
- Index pages cached in working set.
- Connection memory.
- Aggregation working memory.

Tune with `storage.wiredTiger.engineConfig.cacheSizeGB` if needed. **Don't starve the cache** — index access becomes disk-bound and latency explodes.

Working set should fit in RAM for hot collections. If it doesn't, you'll see page faults and rising latency.

---

## 2. Replication Deep Dive

---

### Q5. The oplog — internal structure.

Capped collection in `local.oplog.rs`:

```js
{
  ts: Timestamp(...),       // logical clock
  t: NumberLong(...),       // term (election term)
  h: NumberLong(...),       // hash (legacy)
  v: 2,                     // version
  op: 'i',                  // i, u, d, c (cmd), n (no-op)
  ns: 'myapp.users',
  ui: UUID(...),
  o: {...},                 // document or operation
  o2: {...}                 // query/filter for updates
}
```

Secondaries tail this collection in batches, apply ops in parallel where safe (within same collection, ops without conflicting writes).

---

### Q6. Initial sync — how does a new secondary join?

1. **Initial sync**: clone every collection from a source node (oplog is concurrently captured).
2. Apply oplog operations from the start point onward.
3. Build indexes.
4. Catch up to the live oplog tail.
5. Transition to SECONDARY state.

For very large datasets, **file system snapshots** + journal can be faster (avoids the logical re-read).

---

### Q7. What's the difference between PSA and PSS replica set topologies?

- **PSA** = Primary, Secondary, Arbiter. Three voting members but only two data-bearing. Cheaper but: an arbiter can vote in elections it doesn't have data for, which can cause data loss during specific failure modes.
- **PSS** = Primary, Secondary, Secondary. Three data-bearing members. Recommended.

In 2026, MongoDB strongly recommends PSS — arbiters are increasingly considered an anti-pattern for production.

---

### Q8. Election storms — what causes them?

A series of rapid elections triggered by:
- Flaky network (intermittent timeouts).
- Slow secondaries (high replication lag).
- Misconfigured `electionTimeoutMillis` / `heartbeatIntervalMillis`.
- Half-broken partitioning where one side keeps electing.

Mitigations:
- Stable network (same AZ / VPC, low jitter).
- Monitor `rs.status()` and `replSetGetStatus`.
- Use priority + tags to control failover targets.

---

### Q9. Tagged read preference for region-aware routing.

```js
rs.config().members[0].tags = { region: 'eu' };
// Driver
const client = new MongoClient(url, {
  readPreference: 'secondary',
  readPreferenceTags: [{ region: 'eu' }, {}]
});
```

Useful for routing reads to nearby replicas in multi-region deployments. Beware: secondaries can lag — never use for "read your writes" without majority concerns.

---

## 3. Sharding Internals

---

### Q10. How does mongos route a query?

1. Parses the query.
2. Checks the **shard key** in the filter.
3. If key is present → consults config DB's chunk map → routes to the owning shard(s).
4. If key is absent → broadcasts ("scatter-gather") to all shards → merges results.

Broadcast queries don't scale linearly with shard count. They're the #1 reason sharded clusters underperform expectations.

---

### Q11. Chunks and balancer.

A **chunk** is a range of shard key values. Default chunk size: 128 MB (was 64 MB historically).

The **balancer** (background process) migrates chunks between shards when:
- One shard has more chunks than others.
- The collection is initially split.

Chunk migration is online — minimal impact, but can pressure source/destination shards during big rebalances.

---

### Q12. Why is `count()` weird on sharded clusters?

`db.collection.count()` (without filter) is approximate on sharded clusters because of in-flight migrations (chunks counted twice or zero times during moves).

Use `countDocuments({})` — accurate, runs aggregation, considers active state.

---

### Q13. Cross-shard transactions — cost?

Multi-document transactions on sharded clusters require **two-phase commit** across shards. Adds:
- Network round trips between mongos and shard primaries.
- Coordinator overhead.
- Higher abort rate under contention.

Best practice: **co-locate** transaction-related data on one shard via shard key design.

---

### Q14. Resharding — when and how.

8.0 made resharding **on the same key** legal and 50× faster. Pre-8.0, you had to fully drop & recreate the collection.

```js
sh.reshardCollection('myapp.orders', { newKey: 1 });
```

Process:
1. Build a clone with the new shard key.
2. Apply ongoing oplog ops to the clone.
3. Atomically swap.

Plan for: extra disk space (~2×), CPU spike, network traffic during the operation.

---

## 4. Consistency Semantics

---

### Q15. What does "read your own writes" require?

Two conditions:
1. Write concern `majority` (so the write is durable).
2. Read concern `majority` (read sees only majority-committed data) OR the write and read happen via the **same session** (Causal Consistency since 3.6).

```js
const session = client.startSession({ causalConsistency: true });
await coll.insertOne({ x: 1 }, { session, writeConcern: { w: 'majority' } });
const doc = await coll.findOne({ x: 1 }, { session, readConcern: { level: 'majority' } });
```

The session tracks the cluster time and ensures the read sees at least the write's timestamp.

---

### Q16. Linearizable read concern — what does it guarantee?

Strongest consistency available:
- Read reflects **all** writes that completed before the read started.
- Implemented via a network round-trip to confirm the node is still primary at read time.
- Only on `primary` read preference.

Expensive — adds an RTT per read. Use only when "really strict, please" is the requirement (financial reconciliation, regulatory).

---

### Q17. Snapshot isolation — when is it active?

Inside a transaction with `readConcern: { level: 'snapshot' }`. The transaction sees a consistent point-in-time view of the entire cluster, no matter how long it runs (up to the transaction lifetime).

Implemented via WiredTiger's MVCC — readers don't take locks; they see the snapshot at transaction start.

---

### Q18. Eventual consistency on secondaries — quantify "eventual".

Replication lag depends on:
- Primary write rate.
- Network latency between primary and secondary.
- Secondary CPU / disk.

In healthy clusters: typically < 100 ms. In bursts or stress: can hit seconds.

Monitor: `rs.printSecondaryReplicationInfo()`, `oplog.cursor.lag`, or Atlas alerts.

---

## 5. Performance Forensics

---

### Q19. Currentop & killop.

```js
db.currentOp({ active: true, secs_running: { $gt: 5 } });
db.killOp(opId);
```

Find queries running too long. Pair with the profiler. Don't blindly kill — investigate the source.

---

### Q20. Working set & index residency.

Working set = data + indexes touched in normal operation.

For hot collections, indexes should fit in RAM:
```js
db.collection.stats().indexSizes; // bytes per index
```

If indexes don't fit: every lookup hits disk. Add RAM, drop unused indexes (`$indexStats`), or shard.

```js
db.collection.aggregate([{ $indexStats: {} }]);
// shows access count per index — drop those with 0 hits
```

---

### Q21. Diagnose write amplification.

Heavy index writes can slow down inserts/updates:
- N indexes → N+1 writes per update.
- Compound indexes are cheaper than many single-field indexes.
- Writes to indexed array fields create multiple entries each (multikey blow-up).

```js
db.collection.totalIndexSize();
db.collection.aggregate([{ $indexStats: {} }]);
```

Drop indexes you don't actually query.

---

### Q22. Connection pooling pitfalls.

Default `maxPoolSize`: 100 per client instance.

Common issues:
- Lambdas / short-lived processes create a fresh pool every cold start → exhausts server connections.
- Multiple `MongoClient` instances per app → multiplies pool size.
- Long-running queries holding connections → starvation.

Fix:
- One `MongoClient` per process; share globally.
- Tune `maxPoolSize` for your workload.
- For serverless: use Atlas Data API or connection-pooling proxies (Vercel's MongoDB Atlas integration).

---

## 6. Aggregation Internals

---

### Q23. Optimizer rewrites.

The optimizer reorders some stages automatically:
- `$match` after `$project` is hoisted before `$project` (if it doesn't depend on projected fields).
- `$match` after `$lookup` is sometimes split — what's not dependent on the lookup is pushed earlier.
- `$sort` + `$limit` becomes "top-K" without sorting all docs.

You can see the rewritten pipeline:
```js
db.coll.aggregate([...]).explain('executionStats');
```

---

### Q24. Pushdown into `$lookup`.

The optimizer can push `$match` filters down into the `$lookup` pipeline, reducing the join input set. Helps a lot on big joins.

Modern (5.0+): index-aware `$lookup` execution — uses indexes on `foreignField` for the inner side, similar to a hash join with index probes.

---

### Q25. `$unionWith` — UNION across collections.

```js
db.online.aggregate([
  { $match: { active: true } },
  { $unionWith: { coll: 'offline', pipeline: [{ $match: { active: true } }] } }
]);
```

SQL UNION ALL. Useful for sharded archives or hot/cold tiered data.

---

## 7. Schema at Scale

---

### Q26. Polymorphic patterns.

When a collection holds multiple "kinds" of documents:

```js
{ _id: 1, type: 'user', name: '...' }
{ _id: 2, type: 'org',  name: '...' }
```

Pros: one collection, single index for `type`.
Cons: code branches everywhere on type.

For very different types, **separate collections** are usually clearer. Polymorphism shines when types share 80%+ of fields and similar query patterns.

---

### Q27. Subset pattern.

Embed the most-accessed subset of related data:

```js
// User document with last 5 orders embedded
{ _id: u, name: 'A', recentOrders: [/* last 5 */] }
// Full order history elsewhere
db.orders.find({ customerId: u })
```

Optimizes the hot read (profile page) at the cost of duplicate data. Update both on order completion (atomically when possible).

---

### Q28. Attribute pattern.

When you have many sparse fields:

```js
// Bad: 1000 columns mostly null
{ _id: 1, color: 'red', size: 'M', material: null, ... }

// Better:
{ _id: 1, attributes: [
  { k: 'color', v: 'red' },
  { k: 'size', v: 'M' }
]}
// With index { 'attributes.k': 1, 'attributes.v': 1 }
```

One index supports queries on **any** attribute key. Trades verbose docs for index efficiency.

---

### Q29. Tree patterns.

Common ways to model hierarchies:
- **Parent reference**: `{ _id, parentId }`.
- **Child references**: `{ _id, childrenIds: [...] }`.
- **Materialized path**: `{ _id, path: 'a,b,c,' }`.
- **Nested set**: `{ _id, left: n, right: m }`.

Pick by query pattern:
- "Get children of X" → parent ref (with index on parentId).
- "Get all descendants" → materialized path (regex on `path: /^a,b,/`).
- "Get full ancestry" → materialized path (split the path string).

---

## 8. Atlas Search / Vector Deep Dive

---

### Q30. Indexing strategy for vector search.

```js
{
  fields: [{
    type: 'vector',
    path: 'embedding',
    numDimensions: 1536,
    similarity: 'cosine'
  }]
}
```

Trade-offs:
- `cosine` vs `dotProduct` vs `euclidean`.
- `numCandidates` (HNSW recall vs latency).
- `limit` (final result count).
- Combine with `filter` (pre-filter) for tenant isolation.

For hybrid search (text + vector), `$scoreFusion` or `$rankFusion` (8.2+) combines scores.

---

### Q31. Search index lifecycle.

Atlas Search indexes are **separate** from regular indexes — managed via the Atlas UI/API. Updates can take minutes to propagate. Plan deployments accordingly.

```bash
atlas search index create --cluster prod --collection products --indexFile search.json
```

---

## 9. Security & Compliance

---

### Q32. Queryable Encryption — what's the threat model?

QE protects data **even from a compromised DBA**. Documents are encrypted client-side; server stores only ciphertext but can still answer specific query types (equality, range).

Verified status:
- Equality: **GA**.
- Range: **GA** (since 8.0).
- Prefix / suffix / substring: **public preview** (8.2); GA planned 2026.

Keys live in the client / KMS (AWS, Azure, GCP, local). Server cannot decrypt.

Cost: heavier client SDK, slower writes (encryption overhead).

---

### Q33. Field-level encryption vs Queryable Encryption.

- **CSFLE** (Client-Side Field-Level Encryption): encrypts fields client-side; the server sees ciphertext but can only do equality queries on deterministically-encrypted fields. Older.
- **Queryable Encryption**: newer model with broader query support; uses Structured Encryption schemes.

QE is the current direction. CSFLE remains supported but not the recommended starting point.

---

### Q34. Role-based access control.

```js
db.createRole({
  role: 'reportReader',
  privileges: [{ resource: { db: 'myapp', collection: 'reports' }, actions: ['find'] }],
  roles: []
});
db.grantRolesToUser('analyst', ['reportReader']);
```

Granular per-database, per-collection, per-action. In Atlas, use the UI or API to manage built-in + custom roles.

---

## 10. Operations at Scale

---

### Q35. Capacity planning — what numbers matter?

- **Storage**: data size × replication factor × compression overhead.
- **RAM**: working set should fit; default 50% (RAM-1) for WT cache.
- **IOPS**: random reads dominate; SSDs essential.
- **Network**: replication traffic + client traffic.
- **CPU**: aggregations, JSON parsing, encryption overhead.

Atlas auto-scales storage; compute scaling is manual or scheduled.

---

### Q36. Disaster recovery.

- **RPO** (Recovery Point Objective): how much data can you lose? Atlas continuous PITR: < 1 minute.
- **RTO** (Recovery Time Objective): how fast can you be back? Restore from snapshot: minutes to hours depending on size.

Run DR drills: restore to a sandbox, validate data, time it. A backup you've never restored is a wish.

---

### Q37. Multi-region deployments.

Atlas supports global clusters:
- **Geo-zones** — each region has read-write or read-only members.
- **Zone sharding** — shards data by region (`zoneKeyRange`).
- **Local reads via tagged read preference** — sub-100ms locality.

Trade-offs:
- Multi-region writes have latency (consensus across regions).
- Asymmetric topologies (Primary in one region, secondaries elsewhere) are simpler but read-write performance is uneven.

---

### Q38. Monitoring stack.

- **Atlas**: built-in metrics, alerts, Performance Advisor.
- **Prometheus + Grafana**: scrape `mongodb-exporter`.
- **Datadog / New Relic**: agents collect metrics + traces.

Key alerts:
- Replication lag.
- Oplog window (running out of headroom).
- Cache hit ratio drop.
- Index size vs working set.
- Slow query rate.

---

## 11. Common Anti-Patterns

---

### Q39. Anti-patterns to call out.

- **Massive arrays in a document** (unbounded) — hits the 16 MB limit eventually.
- **Embedding in a many:many relationship** — pick a side or use a junction collection.
- **No shard key forethought** — easy to ship, hard to fix.
- **Indexing every field** — write amplification, RAM pressure.
- **Reading from secondaries for "read-your-writes"** — eventual consistency bites.
- **Using transactions where a single-doc update would do** — adds latency.
- **`$lookup` without an index on `foreignField`** — N²-ish behavior.
- **Storing money as `Number`** — float precision errors. Use `Decimal128`.

---

## Final Senior Tips

1. **Reads cost RAM; writes cost indexes** — design accordingly.
2. **Shard key is forever-ish** — model your most common queries before committing.
3. **Atomic single-doc update > transaction** — embed when possible.
4. **Working set in RAM** is the most impactful tuning lever.
5. **Profile, then change** — every `explain` and every `$indexStats` tells you what's actually expensive.
