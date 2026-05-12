# MongoDB — Easy Interview Questions

> **Audience**: Junior / fresher / phone-screen rounds.
> **Goal**: CRUD, basic queries, simple aggregation, indexes, drivers, connection.
> Verified against [mongodb.com/docs](https://www.mongodb.com/docs) (MongoDB 8.2, May 2026).

---

## 1. Setup & Connection

---

### Q1. Connect to MongoDB from Node.js.

```js
import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb://localhost:27017');
await client.connect();

const db = client.db('myapp');
const users = db.collection('users');
```

Driver: `mongodb` (official, low-level) or `mongoose` (ODM with schemas).

---

### Q2. What is a connection string?

```
mongodb+srv://user:pass@cluster.mongodb.net/mydb?retryWrites=true&w=majority
```

- `mongodb+srv://` — DNS-based discovery (Atlas).
- `mongodb://host1:27017,host2:27017/` — explicit replica set members.
- Auth, options, default DB all encoded.

---

### Q3. List databases / collections.

```js
const dbs = await client.db().admin().listDatabases();
const cols = await db.listCollections().toArray();
```

In `mongosh`:
```
show dbs
show collections
use myapp
```

---

## 2. Insert

---

### Q4. Insert one document.

```js
const result = await users.insertOne({
  name: 'Sharath',
  email: 's@example.com',
  createdAt: new Date()
});
console.log(result.insertedId); // ObjectId
```

`_id` is auto-generated if you don't supply one.

---

### Q5. Insert many.

```js
await users.insertMany([
  { name: 'A' }, { name: 'B' }, { name: 'C' }
]);
```

By default, fails fast on first error. Use `{ ordered: false }` to continue on errors.

---

## 3. Find / Query

---

### Q6. Find documents.

```js
// All
await users.find().toArray();

// Filter
await users.find({ status: 'active' }).toArray();

// Find one
await users.findOne({ email: 's@example.com' });
```

`.find()` returns a **cursor** — call `.toArray()`, iterate with `for await`, or use `.next()`.

---

### Q7. Common query operators.

```js
// Comparison
await users.find({ age: { $gt: 18 } });        // > 18
await users.find({ age: { $gte: 18, $lt: 65 } }); // 18 ≤ age < 65
await users.find({ status: { $in: ['active', 'pending'] } });
await users.find({ status: { $ne: 'banned' } });
await users.find({ deletedAt: { $exists: false } });

// Logical
await users.find({ $or: [{ age: { $lt: 18 } }, { age: { $gt: 65 } }] });
await users.find({ $and: [{ active: true }, { verified: true }] });

// Regex
await users.find({ name: /^Shar/i });
```

---

### Q8. Projection — fetch only certain fields.

```js
await users.find({}, { projection: { name: 1, email: 1 } }).toArray();
// Returns [{ _id, name, email }, ...] — _id always included unless excluded

await users.find({}, { projection: { _id: 0, name: 1 } }).toArray();
// Just { name }
```

Faster + smaller responses. Especially impactful when documents are large.

---

### Q9. Sort, skip, limit.

```js
await users
  .find({ status: 'active' })
  .sort({ createdAt: -1 })   // -1 desc, 1 asc
  .skip(20)
  .limit(10)
  .toArray();
```

For large skips, use **range pagination** (`{ createdAt: { $lt: lastSeen } }`) — `skip` gets slow on big collections.

---

## 4. Update

---

### Q10. Update one document.

```js
await users.updateOne(
  { _id: id },
  { $set: { name: 'New Name', updatedAt: new Date() } }
);
```

Without `$set`, the entire document is replaced. Always use update operators (`$set`, `$inc`, `$push`, etc.) for partial updates.

---

### Q11. Update operators — common ones.

```js
{ $set:    { name: 'A' } }            // set field
{ $unset:  { temp: '' } }             // remove field
{ $inc:    { views: 1, score: -5 } }  // increment
{ $mul:    { price: 1.1 } }           // multiply
{ $rename: { old: 'new' } }           // rename field
{ $push:   { tags: 'new-tag' } }      // append to array
{ $pull:   { tags: 'old-tag' } }      // remove matching from array
{ $addToSet: { tags: 'unique' } }     // add only if not present
{ $pop:    { tags: 1 } }              // remove last (1) or first (-1)
{ $min:    { lowest: 5 } }            // update if new value is smaller
{ $max:    { highest: 100 } }         // update if new value is larger
{ $currentDate: { updatedAt: true } } // server-side timestamp
```

---

### Q12. Update many.

```js
await users.updateMany(
  { status: 'pending' },
  { $set: { status: 'active' } }
);
```

Returns `{ matchedCount, modifiedCount, upsertedCount }`.

---

### Q13. Upsert.

```js
await users.updateOne(
  { email: 's@example.com' },
  { $set: { name: 'Sharath' }, $setOnInsert: { createdAt: new Date() } },
  { upsert: true }
);
```

If the filter matches → update. If not → insert. `$setOnInsert` applies only on insertion path.

---

### Q14. Replace a whole document.

```js
await users.replaceOne(
  { _id: id },
  { name: 'A', email: 'a@x.com' } // entire new doc; _id preserved
);
```

Different from `updateOne` — replaces all fields except `_id`. Rare; usually `$set` is what you want.

---

## 5. Delete

---

### Q15. Delete documents.

```js
await users.deleteOne({ _id: id });
await users.deleteMany({ status: 'banned' });
```

`deleteMany({})` clears the whole collection (use with care!). To drop the collection: `await users.drop()`.

---

## 6. Indexes

---

### Q16. Create an index.

```js
await users.createIndex({ email: 1 }, { unique: true });
await users.createIndex({ status: 1, createdAt: -1 }); // compound
```

`1` = ascending, `-1` = descending. Direction matters for sort optimization.

---

### Q17. List indexes.

```js
await users.listIndexes().toArray();
```

The default `_id_` index always exists.

---

### Q18. Drop an index.

```js
await users.dropIndex('email_1');                // by name
await users.dropIndex({ email: 1 });              // by spec
```

---

### Q19. Why are queries slow without indexes?

Without an index, MongoDB does a **collection scan** (COLLSCAN) — reads every document. O(n). With an index, it does an **index scan** (IXSCAN) — O(log n) lookup.

Run `.explain('executionStats')` to see the plan. If `totalDocsExamined` is much larger than `nReturned`, you're missing an index.

---

### Q20. TTL index — auto-delete after N seconds.

```js
await sessions.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 3600 } // 1 hour
);
```

Background process every ~60s removes expired docs. Great for sessions, temp data.

---

## 7. Aggregation Basics

---

### Q21. Count documents.

```js
await users.countDocuments({ status: 'active' });
await users.estimatedDocumentCount(); // fast, no filter, uses metadata
```

Don't use `users.find().toArray().length` — loads everything to memory.

---

### Q22. Group by.

```js
await orders.aggregate([
  { $group: { _id: '$customerId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  { $sort: { total: -1 } },
  { $limit: 10 }
]).toArray();
```

Equivalent to `SELECT customerId, SUM(amount), COUNT(*) FROM orders GROUP BY customerId ORDER BY total DESC LIMIT 10`.

---

### Q23. Join with `$lookup`.

```js
await orders.aggregate([
  { $lookup: {
      from: 'customers',
      localField: 'customerId',
      foreignField: '_id',
      as: 'customer'
  } },
  { $unwind: '$customer' } // collapse the array
]).toArray();
```

`as` becomes an array; unwind to flatten.

---

## 8. Common Mistakes

---

### Q24. Why does `update` replace my whole document?

```js
await users.updateOne({ _id: id }, { name: 'A' }); // 🚫 replaces
await users.updateOne({ _id: id }, { $set: { name: 'A' } }); // ✅ updates
```

Without `$`-operators, the second arg is treated as a full replacement.

---

### Q25. Why is `_id` an ObjectId and not a string?

ObjectId is MongoDB's default 12-byte unique identifier. Serializes to JSON as a string but is a distinct BSON type.

In your app, convert when comparing:
```js
import { ObjectId } from 'mongodb';
await users.findOne({ _id: new ObjectId(userIdString) });
```

---

### Q26. Why does my filter not find a document with an integer `id`?

```js
await users.findOne({ age: '25' });   // string ≠ int 25
await users.findOne({ age: 25 });     // ✅
```

MongoDB queries are type-strict. `'25'` (string) is not the same as `25` (int). Use proper types or `$type` / `$expr` for coercion.

---

### Q27. Why doesn't my index speed up `name LIKE 'shar%'` queries?

Substring / prefix queries:
- `/^shar/` — index-friendly (left-anchored).
- `/shar/` or `/shar$/` — full collection scan, can't use a B-tree index.

For substring search, use **text indexes** or **Atlas Search**.

---

### Q28. How do I migrate a schema?

MongoDB is schema-less, so "migration" means:
1. Code reads old + new shapes (`if doc.oldField`).
2. Background job rewrites documents (`updateMany` with `$rename` / `$set`).
3. Once all docs migrated, code drops the old-shape branch.

For zero-downtime, always write **new** shape first, support reads of both for a transition window.

---

## 9. Drivers / ODMs

---

### Q29. Mongoose — what is it?

A popular ODM (Object Data Modeling) library:

```js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const user = await User.create({ name: 'A', email: 'a@x.com' });
const all = await User.find({});
```

Pros: schemas, validation, middleware (pre/post hooks), populate.
Cons: extra abstraction; bigger; sometimes adds overhead; opinionated.

For lightweight apps, the official driver + Zod (for validation) is often cleaner.

---

### Q30. What's `populate`?

Mongoose's client-side `$lookup`:

```js
const order = await Order.findById(id).populate('customer'); // resolves the customer ref
```

Internally runs a second query. For high-traffic paths, prefer `$lookup` (server-side).

---

## 10. Misc

---

### Q31. Common BSON types beyond JSON.

- `ObjectId`
- `Date`
- `Decimal128` (high-precision decimal — money)
- `Binary` (Buffer)
- `Long` (64-bit integer — JS Number can't hold them all)

For money, use `Decimal128` — `Number` introduces float errors.

---

### Q32. Atlas vs self-hosted.

| Aspect           | Atlas (managed)              | Self-hosted               |
| ---------------- | ---------------------------- | ------------------------- |
| Setup            | Click-to-deploy              | Install + tune yourself   |
| Backups          | Automatic                    | DIY                       |
| Patching         | Done for you                 | Your responsibility       |
| Scaling          | UI-driven                    | Manual reshard / addNode  |
| Cost             | Higher upfront               | Cheaper at scale          |
| Compliance       | SOC2, HIPAA, etc.            | You handle it             |

For most teams, Atlas is the right starting point.

---

### Q33. Where do drivers get their connection info?

The `MongoClient` parses the connection string at construction. Use env vars in production:

```js
const client = new MongoClient(process.env.MONGO_URL);
```

Don't commit credentials. Atlas connection strings include username/password — rotate them on leaks.

---

### Q34. Why does `.find()` return a cursor?

Because the result set could be huge. A cursor lets you stream / paginate:

```js
const cursor = users.find({});
for await (const doc of cursor) {
  process(doc);
}
```

`.toArray()` materializes everything in memory — dangerous on large collections.

---

### Q35. Read-write defaults — what does `w: majority` mean?

Default since MongoDB 5.0. A write isn't acknowledged until a majority of replica set members confirm.

Trade-off:
- More durable.
- Slightly higher write latency (waits for replication).

Generally the right default. Lower to `w: 1` only if you have a very specific need (and willing to lose writes on primary failure).
