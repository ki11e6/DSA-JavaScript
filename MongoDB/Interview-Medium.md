# MongoDB — Medium Interview Questions

> **Audience**: 2–5 yr engineers.
> **Goal**: Aggregation expertise, index strategy, transactions, change streams, schema design, performance basics, replication awareness.
> Verified against [mongodb.com/docs](https://www.mongodb.com/docs) (MongoDB 8.2, May 2026).

---

## 1. Aggregation Pipeline Mastery

---

### Q1. Top 5 customers by total spend in 2025.

```js
db.orders.aggregate([
  { $match: {
      createdAt: { $gte: ISODate('2025-01-01'), $lt: ISODate('2026-01-01') },
      status: 'completed'
  } },
  { $group: { _id: '$customerId', total: { $sum: '$amount' }, orders: { $sum: 1 } } },
  { $sort: { total: -1 } },
  { $limit: 5 },
  { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
  { $unwind: '$customer' },
  { $project: { _id: 0, name: '$customer.name', total: 1, orders: 1 } }
]);
```

Note: `$match` first (uses index), then `$group`, `$sort`, `$limit`, then `$lookup` (only on the 5 winners — cheap).

---

### Q2. Last 30 days revenue, broken down by day.

```js
db.orders.aggregate([
  { $match: { createdAt: { $gte: new Date(Date.now() - 30*24*3600*1000) } } },
  { $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      revenue: { $sum: '$amount' }
  } },
  { $sort: { _id: 1 } }
]);
```

Returns `[{ _id: '2026-04-12', revenue: 5400 }, ...]`.

---

### Q3. `$facet` — multiple aggregations in one query.

```js
db.products.aggregate([
  { $facet: {
      byCategory: [
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ],
      priceRange: [
        { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }
      ],
      top10: [
        { $sort: { sales: -1 } },
        { $limit: 10 },
        { $project: { name: 1, sales: 1 } }
      ]
  } }
]);
```

Returns a single document with `byCategory`, `priceRange`, `top10` arrays. Useful for dashboards needing many metrics per page load.

---

### Q4. Window functions (`$setWindowFields`).

```js
db.sales.aggregate([
  { $setWindowFields: {
      partitionBy: '$region',
      sortBy: { date: 1 },
      output: {
        rolling7day: {
          $sum: '$amount',
          window: { range: [-6, 0], unit: 'day' }
        },
        rank: { $rank: {} }
      }
  } }
]);
```

Equivalent of SQL window functions. Useful for moving averages, running totals, ranks.

---

### Q5. `$unwind` — explode an array.

```js
// Input
{ _id: 1, tags: ['red', 'blue', 'small'] }

db.products.aggregate([{ $unwind: '$tags' }]);

// Output
{ _id: 1, tags: 'red' }
{ _id: 1, tags: 'blue' }
{ _id: 1, tags: 'small' }
```

For each input document, emits one per array element. Useful before `$group { _id: '$tags' }`.

`{ $unwind: { path: '$tags', preserveNullAndEmptyArrays: true } }` keeps docs with empty/null arrays.

---

### Q6. `$lookup` with pipeline.

For complex joins:

```js
db.orders.aggregate([
  { $lookup: {
      from: 'customers',
      let: { cid: '$customerId' },
      pipeline: [
        { $match: { $expr: { $eq: ['$_id', '$$cid'] } } },
        { $project: { name: 1, tier: 1 } }
      ],
      as: 'customer'
  } }
]);
```

Lets you filter / project on the joined collection. `$$cid` references the `let` variable.

---

### Q7. `$merge` — write aggregation results to a collection.

```js
db.events.aggregate([
  { $group: { _id: '$type', count: { $sum: 1 } } },
  { $merge: { into: 'event_stats', on: '_id', whenMatched: 'replace', whenNotMatched: 'insert' } }
]);
```

Lets you maintain rollup tables. Strategies: `replace`, `merge`, `keepExisting`, `fail`, custom pipeline.

`$out` is similar but **drops and replaces** the entire target collection.

---

## 2. Index Strategy

---

### Q8. ESR rule for compound indexes.

Order fields as **Equality, Sort, Range**:

```js
// Query
db.events.find({ tenant: 'X', userId: 5, ts: { $gte: dt } }).sort({ ts: -1 });

// Best index (E: tenant, userId. S: ts desc. R: ts range)
db.events.createIndex({ tenant: 1, userId: 1, ts: -1 });
```

Why: equality narrows the search early; sort uses index ordering (no in-memory sort); range comes last to widen the matched window.

---

### Q9. Covered queries.

A query is **covered** if all fields needed (filter + projection) are in the index — no document fetch needed.

```js
db.users.createIndex({ status: 1, email: 1 });
db.users.find({ status: 'active' }, { _id: 0, email: 1, status: 1 }).explain();
// COLLSCAN? Or COVERED IXSCAN?
```

For coverage: exclude `_id` (unless in the index) and only project indexed fields.

Massive perf win on hot read paths.

---

### Q10. Partial indexes.

Index only documents matching a filter — smaller, faster, no impact on non-matching writes.

```js
db.users.createIndex(
  { email: 1 },
  { partialFilterExpression: { status: 'active' } }
);
```

Use when most documents don't need the index (rare-active rows in a big table).

---

### Q11. Sparse indexes.

Index only documents that **contain** the field.

```js
db.users.createIndex({ phone: 1 }, { sparse: true });
```

Smaller for optional fields. Note: a query without the indexed field won't use a sparse index.

Partial indexes are typically more flexible — prefer them.

---

### Q12. Text indexes.

```js
db.articles.createIndex({ title: 'text', body: 'text' });

db.articles.find({ $text: { $search: 'mongodb performance' } });
```

Supports basic stemming, stop words, multi-language. Limitations: one text index per collection, basic relevance scoring.

For serious search, **Atlas Search** (Lucene-based) — better tokenization, fuzzy matching, faceting.

---

### Q13. Geospatial indexes.

```js
db.places.createIndex({ location: '2dsphere' });

db.places.find({
  location: {
    $near: {
      $geometry: { type: 'Point', coordinates: [-73.96, 40.78] },
      $maxDistance: 5000  // meters
    }
  }
});
```

`2dsphere` for Earth coordinates (GeoJSON); `2d` for legacy planar geometry.

---

### Q14. Wildcard indexes.

```js
db.users.createIndex({ '$**': 1 });           // index everything (avoid in prod)
db.users.createIndex({ 'attributes.$**': 1 }); // index all subfields of attributes
```

Useful for schemas with **dynamic** field names (user-defined attributes). Significant write cost — don't use as a shortcut for "I don't know what to index."

---

## 3. Transactions

---

### Q15. Multi-document transaction in Node.

```js
const session = client.startSession();
try {
  await session.withTransaction(async () => {
    await accounts.updateOne(
      { _id: from, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { session }
    );
    await accounts.updateOne(
      { _id: to },
      { $inc: { balance: amount } },
      { session }
    );
    await ledger.insertOne(
      { from, to, amount, ts: new Date() },
      { session }
    );
  }, {
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' }
  });
} finally {
  await session.endSession();
}
```

`withTransaction` auto-retries on transient errors (e.g., write conflict).

---

### Q16. When to use a transaction vs embed.

| Scenario                              | Approach                       |
| ------------------------------------- | ------------------------------ |
| Updates within a single document      | Atomic without transaction     |
| Updates across documents in 1 collection | Often refactorable; if not, transaction |
| Cross-collection updates              | Transaction                    |
| Cross-shard updates                   | Transaction (latency overhead) |

The cheaper alternative is always to **embed** when relationships are tight and bounded.

---

### Q17. Transaction limits to know.

Verified — [Transactions Production Considerations](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/):
- Default lifetime: **60 seconds**.
- Recommended: < 1000 docs.
- Each oplog entry: 16 MB max.
- Long-running transactions block oplog truncation → can starve secondaries.

Keep transactions **fast and small**. If you need long-running multi-step coordination, use an **outbox pattern** + change streams.

---

## 4. Schema Patterns

---

### Q18. Bucket pattern.

For high-volume time series writes — group N measurements per document:

```js
{
  sensorId: 'A',
  bucket: 'minute-2026-05-12-14-30',
  count: 60,
  measurements: [
    { ts: ISODate('...:30:00'), value: 22.1 },
    { ts: ISODate('...:30:01'), value: 22.2 },
    ...
  ]
}
```

Reduces index entry count by N×. MongoDB **Time Series collections** (5.0+) implement this automatically.

---

### Q19. Outlier pattern.

When 99% of documents fit a shape but 1% are huge (e.g., a user with millions of orders), move outliers to a separate collection or representation:

```js
// Most users (embedded recent orders)
{ _id: u, name: '...', recentOrders: [...] }

// Power user
{ _id: u, name: '...', overflowCollection: 'orders_user_42' }
```

Avoids one giant doc skewing everything.

---

### Q20. Computed pattern.

Pre-compute expensive aggregations on write:

```js
// On every order placement:
db.users.updateOne(
  { _id: customerId },
  { $inc: { totalOrders: 1, totalSpend: amount } }
);
```

Trade-off: more writes for faster reads. Useful when reads vastly outnumber writes (dashboards, profile pages).

---

### Q21. Schema versioning.

Add a `_v` field; code branches on version:

```js
{ _v: 2, name: 'A', primaryEmail: 'a@x.com', altEmails: [...] }
{ _v: 1, name: 'B', email: 'b@x.com' }  // older shape
```

Migrate lazily on write or via a background job. Drop old branch when 100% migrated.

---

## 5. Change Streams

---

### Q22. Subscribe to a collection.

```js
const stream = db.orders.watch([
  { $match: { 'fullDocument.status': 'paid' } }
]);

for await (const change of stream) {
  console.log(change.operationType, change.documentKey, change.fullDocument);
}
```

`operationType` is `'insert' | 'update' | 'replace' | 'delete'`. Use for cache invalidation, downstream consumers, audit logs.

---

### Q23. Resume tokens.

```js
const stream = db.orders.watch([], { resumeAfter: lastToken });
```

If your consumer restarts, resume from the last processed token. Tokens are stored in `change.resumeToken`. Persist them in a database / Kafka / Redis for crash recovery.

---

### Q24. Pre/post images for updates.

```js
const stream = db.orders.watch([], {
  fullDocument: 'updateLookup',
  fullDocumentBeforeChange: 'whenAvailable'
});
```

Requires `changeStreamPreAndPostImages` to be enabled on the collection. Useful for audit logs that need "before/after" snapshots.

---

## 6. Performance

---

### Q25. Diagnose a slow query.

1. **Profiler**: `db.setProfilingLevel(1, { slowms: 100 })`.
2. **`.explain('executionStats')`**: check `winningPlan.stage`, `totalKeysExamined`, `totalDocsExamined`, `executionTimeMillis`.
3. **Index hint** if planner picks the wrong index: `.hint({ field: 1 })`.
4. **Look for COLLSCAN, large keys-vs-returned ratios**, in-memory sorts (`SORT` stage), or expensive `$lookup` with no index on `foreignField`.

Atlas Performance Advisor suggests indexes automatically.

---

### Q26. Why doesn't my `$lookup` use an index?

The `foreignField` must be indexed on the **`from` collection**.

```js
db.customers.createIndex({ _id: 1 }); // automatic
db.customers.createIndex({ email: 1 }); // if you lookup by email
```

`localField` doesn't need an index for `$lookup` itself, but if you `$match` before lookup, the match should be indexed.

---

### Q27. `$match` early — why?

`$match` is the only stage that can use an index. Putting it first reduces the document count downstream stages have to process.

```js
// Slow
[{ $unwind: '$tags' }, { $match: { 'tags': 'red' } }]

// Fast
[{ $match: { tags: 'red' } }, { $unwind: '$tags' }, { $match: { tags: 'red' } }]
```

The optimizer can sometimes hoist `$match` automatically — but write it yourself for clarity.

---

### Q28. Cursor batch size & iteration.

```js
const cursor = db.events.find({}).batchSize(100);
for await (const doc of cursor) { /* process */ }
```

Default batch is 101 docs (driver-dependent). Tune up for bulk processing, down for memory-constrained consumers.

---

## 7. Replica Sets

---

### Q29. Read from secondaries.

```js
const client = new MongoClient(url, { readPreference: 'secondaryPreferred' });
```

Modes:
- `primary` — default, strongest consistency.
- `primaryPreferred` — primary if available, else secondary.
- `secondary` — only secondaries (might be stale).
- `secondaryPreferred` — secondary if available, else primary.
- `nearest` — lowest network latency.

Trade-off: read scale-out vs replication lag (eventual consistency).

---

### Q30. `readConcern` and `writeConcern`.

```js
// Read your writes — read after a majority commit
const session = client.startSession({
  defaultTransactionOptions: {
    readConcern: { level: 'majority' },
    writeConcern: { w: 'majority' }
  }
});
```

| Setting       | Meaning                                                  |
| ------------- | -------------------------------------------------------- |
| `r: local`    | Read most recent on node                                 |
| `r: majority` | Read only data acked by majority                         |
| `r: linearizable` | Strongest; reflects all majority writes              |
| `r: snapshot` | Point-in-time consistency (in transactions)              |
| `w: 1`        | Primary ack only                                         |
| `w: majority` | Default; majority of replica members acknowledged        |
| `j: true`     | Wait for journal write (durable across crash)            |

---

## 8. Sharding Basics

---

### Q31. Enable sharding on a collection.

```js
sh.enableSharding('myapp');
sh.shardCollection('myapp.orders', { customerId: 1, createdAt: 1 });
```

Once sharded, all queries should ideally include the shard key — otherwise they **broadcast** to all shards (scatter-gather, slow).

---

### Q32. Why is choosing a shard key so important?

Wrong choices cause:
- **Hotspots** — one shard gets all writes (monotonic keys).
- **Unbalanced data** — one shard gets most docs.
- **Broadcast queries** — queries without the shard key hit every shard.

Once chosen, changing requires `reshardCollection` (8.0 makes this faster but it's still major work).

---

## 9. Atlas Features

---

### Q33. Atlas Search.

```js
db.movies.aggregate([{
  $search: {
    index: 'default',
    text: { query: 'matrix', path: 'title' },
    fuzzy: { maxEdits: 2 }
  }
}]);
```

Configurable analyzers (stemming, synonyms, custom). For hybrid search (text + vector), use `$scoreFusion` (8.2+) to combine.

---

### Q34. Atlas Vector Search.

```js
db.embeddings.aggregate([{
  $vectorSearch: {
    index: 'embedding_idx',
    path: 'embedding',
    queryVector: queryEmbedding,
    numCandidates: 100,
    limit: 10,
    filter: { category: 'docs' }
  }
}]);
```

HNSW algorithm. For RAG pipelines: store text + embedding, retrieve top-K by cosine similarity, feed to LLM.

---

## 10. Common Pitfalls

---

### Q35. Why is my unique index allowing duplicates?

Likely cause: a partial filter or sparse index. Or you're inserting `null` values which a sparse index ignores:

```js
db.users.createIndex({ email: 1 }, { unique: true });
await users.insertOne({});                   // email: null
await users.insertOne({});                   // 🚫 duplicate null!
```

Fix: use a partial filter to exclude nulls:
```js
db.users.createIndex(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);
```

---

### Q36. Why is my aggregation hitting the 100 MB memory limit?

Big `$group`, big `$sort`, or `$lookup` returning huge arrays. Mitigations:
- Add an index that lets `$sort` use the index order (no in-memory sort).
- `allowDiskUse: true` to spill (slower but works).
- Restructure: `$match` earlier to reduce data.

---

### Q37. Why does my write fail with "WriteConflict"?

Two transactions touching the same document. MongoDB aborts one and lets you retry. `withTransaction` handles this — outside transactions, retry manually:

```js
try { await op(); } catch (e) {
  if (e.code === 112 /* WriteConflict */) return retry();
  throw e;
}
```
