# MongoDB — Theoretical / Conceptual Interview Questions

> **Audience**: All levels.
> **Goal**: Show deep understanding of document model, storage, indexing, aggregation, transactions, replication, sharding, and consistency.
> Verified against [mongodb.com/docs](https://www.mongodb.com/docs) (MongoDB 8.2, May 2026).

---

## 1. Fundamentals

---

### Q1. What is MongoDB?

**Short**: An open-source, document-oriented NoSQL database. Stores BSON documents in collections; supports rich queries, indexes, aggregations, transactions, replication, and horizontal sharding.

**Deeper**:
- "Document database" — each row is a JSON-like document, schema-flexible.
- Internal format is **BSON** (Binary JSON) — adds types like `ObjectId`, `Date`, `Decimal128`, `Binary`.
- Latest stable: **MongoDB 8.2** (rapid-release); **8.0** is the most recent LTS-style major (Sept 2024). Source: [Release Notes](https://www.mongodb.com/docs/manual/release-notes/).

---

### Q2. SQL vs MongoDB — terminology mapping.

| SQL              | MongoDB                |
| ---------------- | ---------------------- |
| Database         | Database               |
| Table            | Collection             |
| Row              | Document               |
| Column           | Field                  |
| Primary key      | `_id` field            |
| JOIN             | `$lookup` (aggregation) |
| Foreign key      | Reference (DBRef or app-managed) |
| Schema           | Schema-less (or validation rules) |

---

### Q3. What is BSON? Why not just JSON?

BSON is binary-encoded, length-prefixed. Advantages over JSON:
- Faster to parse (no string scanning).
- Adds types: `ObjectId`, `Date`, `Decimal128`, `Binary`, `Timestamp`, `Regex`.
- Document size limit: **16 MB** per document (verified — [Limits](https://www.mongodb.com/docs/manual/reference/limits/)).

For larger blobs, use **GridFS** (chunked storage).

---

### Q4. What is `_id`?

The primary key. Auto-generated as **ObjectId** if you don't supply it.

**ObjectId** is 12 bytes:
- 4 bytes: timestamp (seconds since epoch).
- 5 bytes: random per-process.
- 3 bytes: incrementing counter.

Roughly time-ordered → indexes stay locality-friendly. You can extract creation time via `ObjectId.getTimestamp()`.

You can use any unique value (string, integer, UUID). Many teams use UUIDs (specifically UUIDv7 for time-sortable IDs).

---

### Q5. Embedded documents vs references — when to use which?

**Embed when**:
- 1:1 (always loaded together).
- 1:few (bounded — comments on a post, ≤ ~100).
- Data accessed together as a unit.
- Subdocuments don't independently grow / mutate.

**Reference when**:
- 1:many unbounded (users → orders).
- Many:many (users ↔ groups).
- Subdocuments are large and updated independently.
- Subdocuments are independently queryable.

Standard pattern: small, finite, "owned" data → embed. Independent entities → reference.

---

### Q6. What is the storage engine?

**Verified**: **WiredTiger** is the default and only storage engine. (MMAPv1 was removed long ago in MongoDB 4.2.)

Key features:
- Document-level locking.
- Compression (snappy by default, zstd available).
- MVCC for read consistency.
- Journaling (WAL).

---

## 2. Indexes

---

### Q7. What index types does MongoDB support?

Verified — [Index Types](https://www.mongodb.com/docs/manual/indexes/):

| Type             | Use case                                          |
| ---------------- | ------------------------------------------------- |
| **Single field** | Most common; equality + range                     |
| **Compound**     | Multi-field queries; matters for prefix support   |
| **Multikey**     | Auto-created when indexing array fields           |
| **Text**         | Full-text search on string fields                 |
| **Geospatial**   | `2d` (legacy planar), `2dsphere` (Earth-like)     |
| **Hashed**       | For hashed sharding; supports equality only       |
| **Wildcard**     | Index all fields matching a path pattern          |
| **Compound wildcard** | Combines wildcard + specific fields (since 7.0) |
| **Partial**      | Index only documents matching a filter            |
| **Sparse**       | Index only documents containing the field         |
| **TTL**          | Auto-delete documents after N seconds             |
| **Unique**       | Reject duplicate values                           |
| **Vector** (Atlas) | HNSW for similarity search                      |

---

### Q8. Compound index prefix rule.

```js
db.users.createIndex({ status: 1, age: 1, lastName: 1 });
```

This index supports queries with prefixes:
- `{status}` ✅
- `{status, age}` ✅
- `{status, age, lastName}` ✅
- `{age}` ❌ (no prefix)
- `{status, lastName}` ✅ (uses status, skips age via index scan, may not be optimal)

Senior nuance: ESR rule for compound index ordering — **E**quality first, then **S**ort, then **R**ange.

---

### Q9. Multikey indexes — what's the gotcha?

When you index a field whose value is an array, MongoDB creates an index entry per array element.

```js
db.products.createIndex({ tags: 1 });
// Document: { tags: ['red', 'small', 'sale'] }
// Index has 3 entries for this doc
```

**Limitations**:
- Cannot create a compound index where multiple keys are arrays.
- Increases index size proportionally to array length.

---

### Q10. Index intersection vs compound.

MongoDB **can** combine two single-field indexes via intersection, but a single well-designed **compound** index is almost always faster — less memory pressure, no merge cost.

Lesson: don't rely on index intersection. Design compound indexes for your top queries.

---

### Q11. What does `.explain()` tell you?

```js
db.users.find({ age: 30 }).explain('executionStats');
```

Look for:
- **`COLLSCAN`** ❌ — full collection scan, bad.
- **`IXSCAN`** ✅ — index scan.
- **`FETCH`** — going from index to document.
- **`COVERED`** — query satisfied entirely by index (no FETCH).
- `totalKeysExamined`, `totalDocsExamined`, `nReturned` — efficiency ratios.

Aim for `totalDocsExamined ≈ nReturned` and ideally COVERED queries on hot paths.

---

### Q12. TTL indexes — how do they work?

```js
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 });
```

Background process every ~60s deletes documents where `createdAt < now - 3600s`. Not real-time — expect minute-level lag.

Use for sessions, caches, ephemeral logs. Don't use for billing-critical retention.

---

## 3. Aggregation Pipeline

---

### Q13. What is the aggregation pipeline?

A sequence of stages where each takes documents in and emits documents out:

```js
db.orders.aggregate([
  { $match: { status: 'shipped' } },        // filter
  { $group: { _id: '$customerId', total: { $sum: '$amount' } } },
  { $sort: { total: -1 } },
  { $limit: 10 }
]);
```

Pipeline = SQL's SELECT + WHERE + GROUP BY + ORDER BY + LIMIT, generalized and composable.

---

### Q14. Common aggregation stages.

(Verified — [Aggregation Stages reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/).)

| Stage          | Purpose                                              |
| -------------- | ---------------------------------------------------- |
| `$match`       | Filter (WHERE)                                       |
| `$project`     | Reshape / select fields                              |
| `$addFields` / `$set` | Add computed fields (alias of each other)     |
| `$unset`       | Remove fields                                        |
| `$group`       | Aggregate by key                                     |
| `$sort`        | Sort (ORDER BY)                                      |
| `$limit` / `$skip` | Pagination                                       |
| `$unwind`      | Explode array into one doc per element               |
| `$lookup`      | LEFT OUTER JOIN with another collection              |
| `$facet`       | Multiple pipelines in one query                      |
| `$bucket` / `$bucketAuto` | Histograms                                |
| `$merge` / `$out` | Write results to a collection                     |
| `$replaceRoot` | Promote a subdocument to top level                   |
| `$count`       | Count documents                                      |
| `$densify` / `$fill` | Fill missing data points (time series)         |
| `$setWindowFields` | Window functions (running totals, ranks)         |
| `$search` / `$vectorSearch` (Atlas) | Lucene full-text / vector search |

---

### Q15. `$lookup` — how is it different from SQL JOIN?

```js
db.orders.aggregate([
  { $lookup: {
      from: 'customers',
      localField: 'customerId',
      foreignField: '_id',
      as: 'customer'
  } }
]);
```

- Always LEFT OUTER (returns parent row even if no match).
- Result is **embedded as an array** (the `as` field), not flattened.
- Use `$unwind` after if you want one-row-per-match.

Performance: ensure the `foreignField` is indexed. `$lookup` is one of the most expensive stages on large collections.

---

### Q16. Aggregation memory limit.

By default, each stage is limited to 100 MB RAM. Beyond that, MongoDB throws. Add `{ allowDiskUse: true }` to spill to disk (slower).

Common offenders: large `$group`, big `$sort` without supporting index, `$facet` with many concurrent pipelines.

---

## 4. Transactions

---

### Q17. Multi-document transactions — what & since when?

Multi-document ACID transactions:
- Replica sets: since **4.0** (2018).
- Sharded clusters: since **4.2** (2019).

```js
const session = client.startSession();
try {
  await session.withTransaction(async () => {
    await accounts.updateOne({ _id: a }, { $inc: { balance: -100 } }, { session });
    await accounts.updateOne({ _id: b }, { $inc: { balance:  100 } }, { session });
  });
} finally {
  await session.endSession();
}
```

`withTransaction` auto-retries on transient errors.

---

### Q18. Transaction limits.

Verified — [Transaction Production Considerations](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/):
- Default max runtime: **60 seconds** (`transactionLifetimeLimitSeconds`).
- Each oplog entry: max **16 MB** (size of one document × number of affected docs).
- Recommended: keep transactions under 1000 documents.
- Read concern `snapshot`, write concern `majority` recommended.

Lesson: transactions are NOT free. MongoDB's "always one document" philosophy means **embed for atomicity** when possible — a single document update is atomic without a transaction.

---

### Q19. Why do single-document updates not need a transaction?

A write to a single document is atomic — readers see the before-state or the after-state, never partial. So if you embed related fields in one document, update is naturally consistent. This is why MongoDB encourages denormalization for write hot paths.

---

## 5. Replica Sets

---

### Q20. What is a replica set?

A group of mongod instances (typically 3) maintaining the same data:
- **Primary**: accepts writes.
- **Secondaries**: replicate the primary's oplog.
- **Arbiter** (optional): votes in elections, holds no data.

Provides:
- **High availability**: if primary dies, an election picks a new one (typically < 10s).
- **Read scale-out**: optional read from secondaries (`readPreference`).
- **Disaster recovery**: data on multiple machines.

Odd member count required for quorum (avoid 50/50 split-brain).

---

### Q21. The oplog — what is it?

A **capped collection** in the `local` database. Stores every write operation on the primary. Secondaries tail the oplog and apply ops.

Sized appropriately (default 5% of disk, capped to 50 GB) — must hold writes for as long as a secondary might fall behind.

A change stream is effectively a "filtered view" of the oplog.

---

### Q22. Read & Write concerns.

**Write concern** — durability guarantee:
- `w: 1` — primary ack only (lower latency).
- `w: 'majority'` — replicated to a majority before ack (default since 5.0).
- `j: true` — written to journal (durable across crash).
- `wtimeout` — give up after N ms.

**Read concern** — what data version you read:
- `local` — most recent on the node.
- `available` — most recent, even if stale.
- `majority` — only data acknowledged by a majority.
- `linearizable` — strongest; reflects all majority-committed writes.
- `snapshot` — point-in-time consistent view (within a transaction).

Defaults since 5.0: `w: 'majority'`, read concern `local`.

---

### Q23. Elections — what triggers one?

- Primary becomes unreachable.
- Primary `stepDown()` is called.
- A higher-priority secondary becomes available.

Election uses Raft-derived algorithm. Typical failover: 5–10s in 8.x. Application drivers retry transparently if the operation was retryable.

---

## 6. Sharding

---

### Q24. What is sharding?

Horizontal scaling: split a collection across multiple replica sets (shards). Each shard holds a **range** of the data based on the **shard key**.

Components:
- **mongos** — query router. Apps connect here.
- **Config servers** — store metadata about which shard holds which range.
- **Shards** — replica sets each holding a portion of data.

---

### Q25. Choosing a shard key.

Critical decision — once chosen, it's hard to change.

Ideal shard key:
- **High cardinality** — many distinct values.
- **Low frequency** — no single value dominates.
- **Non-monotonic** — avoid `_id` / `createdAt` which always go to one shard (hotspot).

Examples:
- ✅ `{ userId: 1, createdAt: 1 }` compound key.
- ✅ `{ tenantId: 'hashed' }` — even distribution but loses range queries.
- ❌ `{ createdAt: 1 }` — all new writes hit one shard.

MongoDB 5.0+ allows shard key changes (`reshardCollection`). 8.0 makes resharding **on the same key** allowed and 50× faster for redistribution.

---

### Q26. Hashed vs ranged sharding.

- **Hashed shard key**: even distribution; loses ability to do range queries efficiently (each range needs to broadcast to all shards).
- **Ranged**: range queries are efficient on one shard, but risk hotspots if traffic concentrates.

**Compound shard keys** mix the best of both — common modern recommendation.

---

## 7. Atlas Features

---

### Q27. Atlas Search.

Lucene-backed full-text search on Atlas:
```js
db.collection.aggregate([
  { $search: { text: { query: 'mongodb', path: 'description' } } }
]);
```

Supports analyzers, fuzzy matching, faceting, highlighting, autocomplete. Replaces self-managing Elasticsearch for many use cases.

---

### Q28. Atlas Vector Search.

For embedding-based similarity (RAG, recommendation, semantic search). HNSW algorithm.

```js
db.collection.aggregate([{
  $vectorSearch: {
    index: 'embedding_index',
    path: 'embedding',
    queryVector: [...],
    numCandidates: 100,
    limit: 10
  }
}]);
```

**Verified (8.2)**: Search and Vector Search are now available in Community + Enterprise (not Atlas-only).

---

### Q29. Change streams.

Subscribe to data changes on a collection / database / cluster:

```js
const stream = db.orders.watch();
for await (const change of stream) {
  console.log(change.operationType, change.fullDocument);
}
```

- Backed by the oplog.
- Resumable via `resumeToken` — survives reconnects.
- Filter at the server side with `pipeline` arg.
- Supports `fullDocument: 'updateLookup'` to fetch the full post-update document.
- **`$changeStreamSplitLargeEvent`** (7.0+) — splits events larger than 16 MB.

Use for cache invalidation, event-driven downstream consumers, audit logs.

---

## 8. Schema Design

---

### Q30. The "embed vs reference" decision tree.

Ask:
1. **Are the data accessed together 95%+ of the time?** Embed.
2. **Is the parent-to-child cardinality bounded?** Embed (with a hard cap on growth).
3. **Does the child need to be queried independently?** Reference.
4. **Is the child updated frequently and independently?** Reference (avoid write contention on the parent).
5. **Is the document approaching 16 MB?** Reference; you've hit a limit.

The senior insight: there's no universal answer — design for your reads, accept costs on the rare writes.

---

### Q31. Schema validation.

```js
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'createdAt'],
      properties: {
        email: { bsonType: 'string', pattern: '^.+@.+$' },
        age: { bsonType: 'int', minimum: 0 }
      }
    }
  },
  validationLevel: 'strict',     // 'strict' | 'moderate' | 'off'
  validationAction: 'error'      // 'error' | 'warn'
});
```

Optional. Most teams enforce schemas at the **application layer** (Zod, TypeScript types, Mongoose) since validation rules are limited.

---

## 9. Time Series

---

### Q32. Time Series collections.

Specialized collections for measurement data (sensor readings, prices, metrics):

```js
db.createCollection('weather', {
  timeseries: {
    timeField: 'timestamp',
    metaField: 'station',
    granularity: 'minutes'
  }
});
```

Optimizations (verified — [Time Series Collections docs](https://www.mongodb.com/docs/manual/core/timeseries-collections/)):
- Columnar write path (MongoDB 8.0+).
- 50–90% storage reduction vs regular collection.
- Auto-bucketing per metaField + time range.
- Sharding supported (6.0+).
- Bucket-level inserts/deletes (7.0+).
- Block processing for aggregations (8.0+) — 60% faster aggs.

Use for IoT, observability data, financial ticks.

---

## 10. Operations

---

### Q33. Backup strategies.

- **Atlas**: automatic snapshots, continuous PITR (point-in-time recovery).
- **Self-hosted**:
  - **`mongodump`** — logical, slow on big DBs.
  - **Filesystem snapshot** + journal — fast for large data, requires consistent FS snapshot.
  - **Hot copy** with `db.fsyncLock()` then file copy.

Test restores regularly. A backup you've never restored is a wish.

---

### Q34. Profiler — find slow queries.

```js
db.setProfilingLevel(1, { slowms: 100 });
db.system.profile.find().sort({ ts: -1 }).limit(20);
```

Logs every query slower than `slowms`. Set in production only briefly — profiling adds overhead.

Atlas has built-in slow query dashboards.

---

### Q35. `mongo` shell vs `mongosh`.

- `mongo` (legacy shell): deprecated since 5.0, removed in 6.0+.
- `mongosh`: modern shell with Node.js underneath. Async/await, syntax highlighting, autocomplete, programmable.

Use `mongosh`.

---

## 11. Queryable Encryption

---

### Q36. Queryable Encryption.

End-to-end encryption where the server only sees ciphertext but can still perform certain queries.

Verified (May 2026):
- **Equality queries**: GA in production.
- **Range queries**: GA since 8.0.
- **Prefix / suffix / substring**: **public preview** in 8.2. **Not GA yet**.

Keys live with the client. The server doesn't have plaintext, so even a compromised DB admin can't read the data.

---

## 12. Versioning & Lifecycle

---

### Q37. Release model.

MongoDB moved to a **rapid release** cadence with 8.0:
- 8.0 (Sept 2024) — LTS-style major.
- 8.1, 8.2 (2025–2026) — rapid releases.
- 8.3 in development.

Atlas typically upgrades clusters automatically (with notice). Self-hosted should stay on LTS lines (8.0) unless they need bleeding-edge features.

---

### Q38. Stable API.

```js
const client = new MongoClient(url, { serverApi: { version: '1', strict: true } });
```

Promises operations behave consistently across server versions in the v1 API. `strict: true` causes the server to reject non-v1 operations — catch deprecated calls early.

---

## Final Senior Tips

1. **Document model is freedom AND constraint** — embed for atomicity, reference for cardinality.
2. **Indexes are the single biggest performance lever** — measure with `explain('executionStats')`.
3. **Choose shard key carefully** — it's almost permanent and dictates scalability.
4. **Default to `w: 'majority'`** — durability matters more than the small latency hit.
5. **Use the aggregation pipeline** — it's MongoDB's analytics engine, not just SQL syntax sugar.
