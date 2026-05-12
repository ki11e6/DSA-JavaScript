# MongoDB — Latest Interview Questions (2025–2026)

> **Audience**: Interview prep for 2025–2026 backend / data rounds.
> **Focus**: MongoDB 8.0 / 8.2 features, Vector Search + RAG, advanced aggregation, production forensics.
> **Verified** against [mongodb.com/docs](https://www.mongodb.com/docs), MongoDB Engineering blog, DataCamp, Glassdoor 2025–2026 candidate posts.

---

## 1. MongoDB 8.0 / 8.2 Features

---

### Q1. What performance gains does MongoDB 8.0 deliver, and how?

- **~36% better read throughput** vs 7.0.
- **Block processing for time series** → >200% improvement on `$group` / analytical queries.
- Improvements come from a rewritten WiredTiger cache eviction algorithm and **block-at-a-time** execution (instead of per-document) for time series.

Source: [MongoDB 8.0 Block Processing](https://www.mongodb.com/company/blog/technical/key-enhancements-mongodb-8-0-block-processing).

---

### Q2. What is same-key resharding (8.0) and when would you use it?

Before 8.0, you could only reshard to a **different** key. 8.0 introduces `reshardCollection` with `forceRedistribution: true` to redistribute on the **same key** — used to add/remove shards or rebalance zones with **no workload impact**.

Resharding is up to **~50× faster** in 8.0.

```js
sh.reshardCollection('myapp.orders', { customerId: 1 }, { forceRedistribution: true });
```

Source: [Reshard to Same Key](https://www.mongodb.com/docs/manual/core/reshard-to-same-key/).

---

### Q3. How do you block a runaway query in production without dropping an index?

Use **operation rejection filters** via `setQuerySettings` with `reject: true` keyed by query shape:

```js
db.adminCommand({
  setQuerySettings: { find: 'users', filter: { status: 'inactive' } },
  settings: { reject: true }
});
```

Rejected ops can be logged via `systemLog.component.query.rejected.verbosity`. Lets you mitigate a bad query while you fix the root cause.

Source: [Operation Rejection Filters](https://www.mongodb.com/docs/manual/tutorial/operation-rejection-filters/).

---

### Q4. What is the current GA status of Queryable Encryption features?

| Operation               | Status                                       |
| ----------------------- | -------------------------------------------- |
| Equality                | GA since 7.0                                 |
| Range                   | **GA in 8.0**                                |
| Prefix / suffix / substring | **Public preview in 8.2 — NOT production-safe** |

Range sparsity max changed from 4 → 8 in 8.2.

⚠️ **Interview gotcha**: don't claim prefix/suffix/substring are GA. Collections in preview must be **dropped** before GA — no in-place migration.

Source: [Queryable Encryption Supported Operations](https://www.mongodb.com/docs/manual/core/queryable-encryption/reference/supported-operations/).

---

## 2. Vector Search & RAG

---

### Q5. How do you tune `numCandidates` for `$vectorSearch`?

Start at `numCandidates = limit × 10` (10–20× rule) and tune by recall vs latency.

HNSW build params:
- `m = 32` (graph connectivity).
- `efConstruction = 200`.

This typically achieves ~99% recall with `numCandidates = 100`. Higher = better recall but more latency / memory.

```js
db.docs.aggregate([{
  $vectorSearch: {
    index: 'vec_idx',
    path: 'embedding',
    queryVector: qv,
    numCandidates: 100,
    limit: 10
  }
}]);
```

Source: [HNSW Tuning Guide](https://oneuptime.com/blog/post/2026-03-31-mongodb-tune-hnsw-vector-search/view).

---

### Q6. Difference between `$rankFusion` and `$scoreFusion`?

- **`$rankFusion`** (8.1+, supports `$vectorSearch` in input pipelines):
  - Reciprocal Rank Fusion — combines by **rank position**.
  - Easier defaults.
- **`$scoreFusion`** (8.2+, **public preview**):
  - Normalizes raw scores (0–1).
  - Weighted average.
  - More flexible for blending custom relevance signals.

Both require all sub-pipelines to target the same collection.

Source: [Hybrid Search with $rankFusion](https://www.mongodb.com/docs/atlas/atlas-vector-search/hybrid-search/vector-search-with-rankfusion/).

---

### Q7. Write a hybrid search pipeline combining text + vector.

```js
db.movies.aggregate([{
  $rankFusion: {
    input: {
      pipelines: {
        vectorPipeline: [
          { $vectorSearch: {
              index: 'vec_idx', path: 'embedding',
              queryVector: qv, numCandidates: 100, limit: 20
          } }
        ],
        textPipeline: [
          { $search: { index: 'txt_idx', text: { query: q, path: 'title' } } },
          { $limit: 20 }
        ]
      }
    },
    combination: { weights: { vectorPipeline: 0.7, textPipeline: 0.3 } }
  }
}]);
```

Vector for semantic, text for keyword exactness — combined gives best RAG recall.

---

## 3. Aggregation Mastery

---

### Q8. Use `$setWindowFields` to compute a 7-day moving average per sensor.

```js
{ $setWindowFields: {
    partitionBy: '$sensorId',
    sortBy: { ts: 1 },
    output: {
      ma7: {
        $avg: '$value',
        window: { range: [-7, 0], unit: 'day' }
      }
    }
}}
```

Introduced in 5.0. Supports rank operators (`$rank`, `$denseRank`) and accumulators.

Source: [$setWindowFields](https://www.mongodb.com/docs/manual/reference/operator/aggregation/setwindowfields/).

---

### Q9. When use `$facet` vs multiple aggregations?

`$facet` runs parallel sub-pipelines on the **same input set in one pass** — ideal for dashboards needing count + facets + top-N without rescanning.

```js
db.products.aggregate([{
  $facet: {
    byCategory: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
    topRated:   [{ $sort: { rating: -1 } }, { $limit: 10 }],
    priceStats: [{ $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }]
  }
}]);
```

**Limitation**: cannot be used inside sharded sub-pipelines on the same collection that would split.

---

### Q10. How does `$merge` differ from `$out` for rollups?

- **`$out`**: replaces the **entire collection**.
- **`$merge`**: upserts/updates with `whenMatched` / `whenNotMatched` clauses — used for **incremental rollups** into pre-aggregated materialized views.

```js
db.events.aggregate([
  { $group: { _id: '$type', count: { $sum: 1 } } },
  { $merge: {
      into: 'event_stats',
      on: '_id',
      whenMatched: [{ $set: { count: { $add: ['$count', '$$new.count'] } } }],
      whenNotMatched: 'insert'
  } }
]);
```

---

## 4. Schema Design

---

### Q11. When apply the Outlier Pattern?

When a tiny fraction of documents has a disproportionately large array (e.g., celebrity user with millions of followers) that dominates working set / index size.

Move overflow values to a separate collection and mark the doc with a flag:

```js
// Normal user
{ _id: u, name: 'A', followers: [/* 200 */] }

// Outlier
{ _id: u, name: 'celeb', has_extras: true, followers_collection: 'followers_celeb' }
```

Source: [Outlier Pattern](https://www.mongodb.com/docs/manual/data-modeling/design-patterns/group-data/outlier-pattern/).

---

### Q12. Bucket vs native time-series collection — which to use?

**Native time-series** (5.0+) auto-buckets internally and in 8.0 leverages **block processing** for analytics. Default choice.

Manual bucket pattern: only when you need custom granularity, embedded metadata structure, or hybrid use cases.

---

### Q13. Embed vs reference rule of thumb?

**Embed when**:
- Child is accessed *with* the parent.
- Growth is bounded (< 16 MB doc cap, ideally far less).

**Reference when**:
- Many-to-many.
- Child is queried independently.
- Array would grow unbounded.

---

## 5. Sharding

---

### Q14. Why is `_id: ObjectId` a bad shard key?

`ObjectId` is **monotonically increasing** — all new writes land on a single chunk/shard creating a **hotspot**. Resharding traffic is constant.

**Fix**: hashed shard key (`{ _id: 'hashed' }`) or compound key with high-cardinality non-monotonic prefix (`{ tenantId: 1, createdAt: 1 }`).

---

### Q15. What changed about adding shards during DDL in 8.0?

`addShard` / `removeShard` now **defer** until concurrent DDL (`reshardCollection`, etc.) completes — preventing inconsistencies. Pre-8.0 could leave the cluster in a partially-rebalanced state.

Source: [8.0 Release Notes](https://www.mongodb.com/docs/manual/release-notes/8.0/).

---

## 6. Transactions

---

### Q16. What are the practical limits of a multi-doc transaction?

- **≤ 1000 docs modified** per transaction (recommended).
- Default lock-acquire timeout: **5 ms**.
- `transactionLifetimeLimitSeconds = 60s` — forcibly aborted after.
- Cross-shard transactions need `readConcern: 'snapshot'` for consistent reads.

```js
const session = client.startSession();
await session.withTransaction(async () => {
  await accounts.updateOne({ _id: from }, { $inc: { balance: -100 } }, { session });
  await accounts.updateOne({ _id: to },   { $inc: { balance:  100 } }, { session });
}, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
```

Source: [Transactions Production Considerations](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/).

---

### Q17. Are writes inside a transaction retryable?

**No** — individual writes are not retryable regardless of `retryWrites`. Only **commit / abort** are auto-retried once.

The application must catch `TransientTransactionError` / `UnknownTransactionCommitResult` labels and retry the **whole transaction**. `withTransaction` does this automatically.

---

### Q18. Do reads inside a transaction see other committed writes?

**No** — transactions can return "stale" reads; they don't observe writes by other committed transactions during their lifetime (snapshot isolation).

This is a feature, not a bug. It's what makes the transaction's view internally consistent.

---

## 7. Change Streams

---

### Q19. Why might you get "Resume Token Not Found" using `fullDocument: updateLookup`?

`updateLookup` does a **post-event** document lookup. If the document was **deleted** between the change event and the lookup, `fullDocument` is `null` and resume can fail.

**Fix**: enable pre/post-images on the collection and use:
```js
db.coll.watch([], {
  fullDocumentBeforeChange: 'whenAvailable',
  fullDocument: 'whenAvailable'
});
```

Pre/post-images shipped in 6.0+.

---

### Q20. What is `postBatchResumeToken` and why does it matter?

Since 4.0.7, `aggregate` / `getMore` responses include `postBatchResumeToken` **even on empty batches**.

Persist this token (not just the last event's token). Otherwise, after a long quiet period, you'd resume from far back in the oplog and re-scan everything.

---

## 8. Performance Forensics

---

### Q21. Walk through `explain('executionStats')` for a slow query.

Inspect:
- **`winningPlan.stage`** — want `IXSCAN`, avoid `COLLSCAN`.
- **`totalKeysExamined` vs `totalDocsExamined` vs `nReturned`** — ratios should be close (1:1:1 ideal).
- **`executionTimeMillis`** — total query time.
- **`indexName`** — confirm the right index is used.

A **`COVERED`** query shows `IXSCAN` **not under a `FETCH`** — all projected fields are in the index. Big win for hot read paths.

```js
db.users.find({ email: 'x@y.com' }, { _id: 0, email: 1 }).explain('executionStats');
```

---

### Q22. How does `$indexStats` help in production?

Returns per-index `accesses.ops` counter — find **unused indexes** safe to drop, reducing write amplification.

```js
db.users.aggregate([{ $indexStats: {} }]);
```

Indexes with `0 ops` in production for weeks → candidates for removal.

---

## 9. Atlas / Realm

---

### Q23. Status of Atlas Device Sync?

**End-of-life September 30, 2025.** Realm SDK is open source but unsupported.

Migration paths:
- **Parse Platform**.
- **Couchbase Mobile** (for offline-first sync).
- Custom sync over MongoDB **change streams** + WebSocket.

Source: [Device Sync Deprecation](https://www.mongodb.com/docs/atlas/app-services/sync/device-sync-deprecation/).

---

### Q24. Why is Atlas Stream Processing different from Kafka?

ASP (GA in 2025) consumes Kafka/Atlas change streams natively and supports the **MongoDB aggregation framework over streaming windows**:
- `$tumblingWindow`
- `$hoppingWindow`
- `$validate`

Outputs to Atlas collections or back to Kafka without intermediate storage. Lets you write stream processors in the same query language as your batch aggregations.

---

### Q25. Implication of Vector Search now in Community / Enterprise (not just Atlas)?

Self-hosted deployments can run `$vectorSearch` with HNSW indexes **locally** in 8.x. Removes the previous requirement to use Atlas Search nodes — significant for on-prem RAG, air-gapped environments, regulated workloads.

---

## Final Senior Tips

1. **Block processing for time series in 8.0 is the headline perf change** — name it.
2. **Same-key resharding (8.0)** unlocks operational flexibility — distinguish from key-change resharding.
3. **`updateTag`-equivalent for change streams** = pre/post-images + `postBatchResumeToken`.
4. **Vector search recall tuning**: `numCandidates ~ 10× limit`, `ef` parameters.
5. **Queryable Encryption equality + range are GA; substring is preview** — don't confuse.

---

## Sources

- [MongoDB 8.0 Release Notes](https://www.mongodb.com/docs/manual/release-notes/8.0/)
- [Block Processing — MongoDB Engineering](https://www.mongodb.com/company/blog/technical/key-enhancements-mongodb-8-0-block-processing)
- [Reshard to Same Shard Key](https://www.mongodb.com/docs/manual/core/reshard-to-same-key/)
- [Operation Rejection Filters](https://www.mongodb.com/docs/manual/tutorial/operation-rejection-filters/)
- [Queryable Encryption Supported Operations](https://www.mongodb.com/docs/manual/core/queryable-encryption/reference/supported-operations/)
- [HNSW Tuning Guide](https://oneuptime.com/blog/post/2026-03-31-mongodb-tune-hnsw-vector-search/view)
- [Hybrid Search with $rankFusion](https://www.mongodb.com/docs/atlas/atlas-vector-search/hybrid-search/vector-search-with-rankfusion/)
- [$rankFusion / $scoreFusion announcement](https://www.mongodb.com/company/blog/technical/harness-power-atlas-search-vector-search-with-rankfusion)
- [$setWindowFields](https://www.mongodb.com/docs/manual/reference/operator/aggregation/setwindowfields/)
- [Outlier Pattern](https://www.mongodb.com/docs/manual/data-modeling/design-patterns/group-data/outlier-pattern/)
- [Transactions Production Considerations](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/)
- [Retryable Writes](https://www.mongodb.com/docs/manual/core/retryable-writes/)
- [Change Streams Manual](https://www.mongodb.com/docs/manual/changestreams/)
- [Explain Results](https://www.mongodb.com/docs/manual/reference/explain-results/)
- [Atlas Device Sync Deprecation](https://www.mongodb.com/docs/atlas/app-services/sync/device-sync-deprecation/)
- [DataCamp — Top 25 MongoDB Interview Q 2026](https://www.datacamp.com/blog/mongodb-interview-questions)
- [InfoQ — MongoDB 8.0 Performance](https://www.infoq.com/news/2024/10/mongodb-80-performances/)
