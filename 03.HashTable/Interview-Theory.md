# HashTable — Theoretical / Conceptual Interview Questions

> **Audience**: All levels. Hash tables are *the* most common data structure in modern programming.
> **Goal**: Explain how they work under the hood, when to use them, and JS-specific quirks (Map vs Object vs Set).

---

## 1. Fundamentals

---

### Q1. What is a hash table?

**Short**: A data structure that maps **keys** to **values** using a **hash function** that converts keys into array indices, giving **O(1) average-case** lookup, insert, and delete.

```
Keys ──hash()──→ Indices ──→ Buckets in an array
"apple"  →   3   →   bucket[3] = ("apple", 5)
"banana" →   7   →   bucket[7] = ("banana", 2)
```

**Aliases** (interchangeable in interviews):
- Hash table
- Hash map
- Dictionary
- Associative array
- Symbol table

---

### Q2. What makes a good hash function?

A hash function takes a key (any type) and returns a non-negative integer — ideally:

1. **Deterministic** — same key always returns the same hash.
2. **Uniform distribution** — keys spread evenly across buckets to minimize collisions.
3. **Fast to compute** — O(k) where k is key length.
4. **Avalanche effect** — small input change → large output change.

**Bad hash function**: `hash(s) = s.length` — every same-length string collides.

**Better hash function (polynomial rolling)**:

```js
function hash(s, m) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % m;
  return h;
}
```

Why prime multiplier (31)? It produces good distribution and `31 * x` can be computed as `(x << 5) - x` (one shift, one subtract).

---

### Q3. What is a collision? How is it resolved?

**Collision**: two different keys hash to the same bucket index. Unavoidable by **pigeonhole** — finite buckets, infinite keys.

Two main strategies:

#### Separate Chaining

Each bucket holds a **linked list** (or array) of `(key, value)` pairs. On collision, append.

```
bucket[3] → ("apple", 5) → ("apricot", 12) → null
```

- **Pros**: simple; load factor can exceed 1; deletion is easy.
- **Cons**: extra memory per node; cache-unfriendly.
- **Used in**: Java `HashMap`, Python `dict` (historical), PHP, Ruby.

#### Open Addressing

All entries live in the bucket array itself; on collision, **probe** for the next empty slot.

| Probing strategy        | Formula                              | Pros                            | Cons                              |
| ----------------------- | ------------------------------------ | ------------------------------- | --------------------------------- |
| **Linear**              | `(h + i) % size`                     | Simple, cache-friendly          | Primary clustering                |
| **Quadratic**           | `(h + c1·i + c2·i²) % size`          | Less clustering                 | May not probe entire table        |
| **Double hashing**      | `(h1 + i·h2) % size`                 | Best distribution               | Two hashes, slower                |

- **Pros**: cache-friendly (one allocation); lower memory overhead.
- **Cons**: deletion needs **tombstones**; load factor must stay < 1 (typically < 0.7).
- **Used in**: Python `dict` (since 3.6), Go `map`, Rust `HashMap`, .NET `Dictionary`.

---

### Q4. What is the load factor? Why does it matter?

**Load factor** α = `n / m` where `n` = number of stored entries, `m` = number of buckets.

- α controls the **expected collision rate** and thus operation cost.
- Standard thresholds: **0.7–0.8** for open addressing, **1.0+** for chaining.
- When α exceeds the threshold → **resize** (double `m`, rehash all entries).

**Why resize matters**:
- Without it, operations degrade from O(1) → O(n).
- The resize itself is O(n), but **amortized O(1)** across all inserts (same analysis as dynamic array doubling).

---

### Q5. Time complexity table.

| Operation      | Average    | Worst case (bad hash) | Notes                                  |
| -------------- | ---------- | --------------------- | -------------------------------------- |
| Insert         | O(1)       | O(n)                  | Amortized O(1) including resize        |
| Lookup         | O(1)       | O(n)                  | Worst case = all collide into 1 bucket |
| Delete         | O(1)       | O(n)                  | Open addressing needs tombstones       |
| Iterate all    | O(n + m)   | O(n + m)              | Visits every bucket                    |
| Space          | O(n + m)   | —                     | Buckets + entries                      |

**Java 8+ optimization**: `HashMap` switches each bucket from linked list to red-black tree once it has > 8 entries → worst case becomes O(log n) instead of O(n). Important talking point at FAANG.

---

### Q6. HashTable vs Array vs BST — when to use which?

| Concern                | Array (sorted)  | Hash Table   | Balanced BST (TreeMap) |
| ---------------------- | --------------- | ------------ | ---------------------- |
| Lookup by key          | O(log n)        | **O(1)** avg | O(log n)               |
| Insert / delete        | O(n)            | **O(1)** avg | O(log n)               |
| Ordered iteration      | **O(n)**        | unordered    | **O(n)**               |
| Range queries          | **O(log n + k)**| **N/A**      | **O(log n + k)**       |
| Min / max              | O(1)            | O(n)         | **O(log n)**           |
| Memory overhead        | low             | medium       | high (pointers)        |
| Worst-case guarantee   | yes             | **no**       | **yes** O(log n)       |

**Heuristic**:
- Need fastest lookup, no ordering? → **Hash table**.
- Need ordered traversal, range queries? → **BST** (`std::map`, Java `TreeMap`).
- Tiny data, simple? → **Array of pairs**, linear scan beats hash overhead until ~16 entries.

---

## 2. JavaScript-Specific

---

### Q7. JS `Object` vs `Map` vs `Set` vs `WeakMap` vs `WeakSet`.

| Structure   | Keys allowed         | Iteration order        | Size built-in | GC-aware | Use case                          |
| ----------- | -------------------- | ---------------------- | ------------- | -------- | --------------------------------- |
| `Object`    | strings, symbols     | insertion (mostly*)    | no — use `Object.keys().length` | no | Records, JSON-shaped data |
| `Map`       | **anything**         | insertion              | yes — `.size` | no       | True hash map, frequent insert/delete |
| `Set`       | anything (unique)    | insertion              | yes — `.size` | no       | Membership tests, dedup           |
| `WeakMap`   | **objects only**     | non-enumerable         | no            | **yes**  | Side-channel metadata for objects |
| `WeakSet`   | objects only         | non-enumerable         | no            | yes      | "Have I seen this object?" without leaking |

*\*Object iteration order: integer-like keys ascending, then string keys insertion-order, then symbols insertion-order.*

**Performance**: V8 optimizes `Object` heavily through hidden classes, but for **frequent insert/delete** with non-string keys, `Map` is **faster and more predictable**.

---

### Q8. When should I use `Map` over `Object`?

Use `Map` when:
- Keys are not strings (objects, numbers, symbols).
- You need to know `size` without `Object.keys().length`.
- You insert/delete keys frequently — no hidden-class deopts.
- You iterate often — `Map` iteration is well-defined.
- You need to avoid prototype-chain pollution (`__proto__`, `toString`, etc.).

Use `Object` when:
- Keys are static strings (a fixed schema, JSON).
- You need JSON-serializable output.
- You're working with library code that expects plain objects.

**Sneaky `Object` bug**:

```js
const counts = {};
counts['toString'] = (counts['toString'] || 0) + 1;   // collides with Object.prototype.toString!
```

Use `Object.create(null)` or `Map` to avoid this.

---

### Q9. What is a `WeakMap`? When do you need one?

A `WeakMap` holds **weak references** to its keys — if no other reference exists, the entry is garbage-collected automatically.

```js
const cache = new WeakMap();
function lookup(obj) {
  if (cache.has(obj)) return cache.get(obj);
  const result = expensive(obj);
  cache.set(obj, result);
  return result;
}
// when `obj` is no longer reachable, the cache entry vanishes — no leak.
```

**Use cases**:
- Attaching private data to DOM nodes / external objects.
- Memoizing per-object results without leaking.
- Implementing "private" fields (pre-`#field` era).

**Restrictions**: keys must be objects (not primitives); no iteration; no `.size`.

---

### Q10. How does V8 optimize plain object property access?

V8 uses **hidden classes** (Maps, internally). When you create `{ a: 1, b: 2 }`, V8 builds a hidden class describing the object's shape. Accessing `obj.a` becomes a fast offset lookup (like a struct in C), not a hash probe.

**Conditions to stay fast**:
- Always add properties in the same order across instances.
- Don't `delete` properties (forces dictionary mode).
- Don't add too many distinct property names.

When V8 falls back to **dictionary mode** (`HASH_TABLE_ELEMENTS`), property access becomes a real hash table — slower.

**Senior takeaway**: hot objects should have stable shape; for true hash maps, use `Map`.

---

## 3. Hashing & Security

---

### Q11. What is a hash collision DoS attack?

If a hash table uses a deterministic, public hash function, an attacker can craft many keys that all hash to the **same bucket** → operations degrade to O(n) per call → server runs out of CPU.

**Famous incidents**:
- **2003**: research paper showed Perl, PHP, Python, Java vulnerable.
- **2011**: 28C3 talk demonstrated practical attacks; CVE-2011-4815.
- Solution adopted by all major languages: **randomized hash seed** at process start.

**JS engines**: V8 / SpiderMonkey use a randomized seed for string hashing; Map/Set are safe.

---

### Q12. Cryptographic vs non-cryptographic hash functions.

| Property              | Cryptographic (SHA-256, BLAKE2)        | Non-crypto (FNV, MurmurHash, xxHash) |
| --------------------- | -------------------------------------- | ------------------------------------ |
| Pre-image resistance  | yes — can't reverse                    | no                                   |
| Collision resistance  | computationally infeasible             | rare but findable                    |
| Speed                 | slow (~1 GB/s)                         | very fast (~10–30 GB/s)              |
| Output size           | typically 256+ bits                    | typically 32 / 64 bits               |
| Use case              | passwords, signatures, integrity       | hash tables, bloom filters           |

**Don't** use SHA-256 inside `HashMap` — too slow. **Don't** use Murmur for password storage — trivially crackable.

---

### Q13. What is consistent hashing? Why was it invented?

Standard `hash(key) % N` distributes keys to N nodes. But when N changes (server added/removed), **almost every key** gets a new bucket → cache invalidation storm.

**Consistent hashing**: hash both keys and nodes onto a circular range `[0, 2³²)`. Each key belongs to the next node clockwise. Adding a node only re-homes keys "between" the new node and its clockwise neighbor — **K/N keys instead of all K keys**.

**Used in**: distributed caches (Memcached, DynamoDB partitioning, Cassandra ring), CDN routing, load balancers.

---

### Q14. What is a Bloom filter?

A **probabilistic** set membership data structure:
- Bit array of size `m`, plus `k` hash functions.
- Insert: hash key with all k functions, set those k bits to 1.
- Query: hash key with all k functions, check all k bits — if any is 0, **definitely not** in set; if all are 1, **probably** in set.

| Property | Behavior                                                        |
| -------- | --------------------------------------------------------------- |
| Insert   | O(k)                                                            |
| Query    | O(k)                                                            |
| Memory   | ~10 bits per element for ~1% false-positive rate                |
| Error    | False positives possible; **false negatives never**             |
| Delete   | Not directly supported (counting Bloom filter for that)         |

**Use cases**:
- "Have I seen this URL before?" (Chrome's safe-browsing list).
- Database read-bypass: skip disk lookup if Bloom says "definitely no" (LevelDB, RocksDB, Cassandra).
- Username availability checks ("probably taken; double-check").

---

## 4. Design Internals

---

### Q15. Implement a hash table from scratch with separate chaining.

```js
class HashMap {
  constructor(size = 16) {
    this.buckets = Array.from({ length: size }, () => []);
    this.count = 0;
  }
  _hash(key) {
    let h = 0;
    const s = String(key);
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;       // |0 keeps it 32-bit signed
    }
    return Math.abs(h) % this.buckets.length;
  }
  set(key, value) {
    const idx = this._hash(key);
    const bucket = this.buckets[idx];
    for (const entry of bucket) {
      if (entry[0] === key) { entry[1] = value; return; }
    }
    bucket.push([key, value]);
    this.count++;
    if (this.count / this.buckets.length > 0.75) this._resize();
  }
  get(key) {
    const bucket = this.buckets[this._hash(key)];
    for (const [k, v] of bucket) if (k === key) return v;
    return undefined;
  }
  has(key) {
    const bucket = this.buckets[this._hash(key)];
    for (const [k] of bucket) if (k === key) return true;
    return false;
  }
  delete(key) {
    const bucket = this.buckets[this._hash(key)];
    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i][0] === key) {
        bucket.splice(i, 1);
        this.count--;
        return true;
      }
    }
    return false;
  }
  _resize() {
    const old = this.buckets;
    this.buckets = Array.from({ length: old.length * 2 }, () => []);
    this.count = 0;
    for (const bucket of old) for (const [k, v] of bucket) this.set(k, v);
  }
  *entries() {
    for (const bucket of this.buckets) for (const e of bucket) yield e;
  }
}
```

**Talking points**:
- Why `* 31`? — odd prime, good distribution, fast bit-shift.
- Why `Math.abs`? — `charCodeAt * 31` overflows to negative in JS 32-bit math.
- Why resize at 0.75? — sweet spot between memory and collision rate.
- Why `bucket.splice(i, 1)`? — O(bucket length) but bucket should stay tiny.

---

### Q16. Implement open-addressing with linear probing.

```js
const TOMBSTONE = Symbol('deleted');

class OpenAddressingMap {
  constructor(size = 16) {
    this.keys = new Array(size).fill(null);
    this.vals = new Array(size).fill(null);
    this.count = 0;
  }
  _hash(key) {
    let h = 0;
    for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) | 0;
    return Math.abs(h) % this.keys.length;
  }
  set(key, value) {
    if ((this.count + 1) / this.keys.length > 0.7) this._resize();
    let i = this._hash(key);
    while (this.keys[i] !== null && this.keys[i] !== TOMBSTONE && this.keys[i] !== key) {
      i = (i + 1) % this.keys.length;
    }
    if (this.keys[i] !== key) this.count++;
    this.keys[i] = key;
    this.vals[i] = value;
  }
  get(key) {
    let i = this._hash(key);
    while (this.keys[i] !== null) {
      if (this.keys[i] === key) return this.vals[i];
      i = (i + 1) % this.keys.length;
    }
    return undefined;
  }
  delete(key) {
    let i = this._hash(key);
    while (this.keys[i] !== null) {
      if (this.keys[i] === key) {
        this.keys[i] = TOMBSTONE;
        this.vals[i] = null;
        this.count--;
        return true;
      }
      i = (i + 1) % this.keys.length;
    }
    return false;
  }
  _resize() {
    const oldK = this.keys, oldV = this.vals;
    this.keys = new Array(oldK.length * 2).fill(null);
    this.vals = new Array(oldK.length * 2).fill(null);
    this.count = 0;
    for (let i = 0; i < oldK.length; i++) {
      if (oldK[i] !== null && oldK[i] !== TOMBSTONE) this.set(oldK[i], oldV[i]);
    }
  }
}
```

**Why tombstones?** — A simple `null` would break the probe sequence: a get for a key whose probe path crosses the deleted slot would stop too early.

---

### Q17. Birthday paradox & hash collision probability.

For `n` keys hashed into `m` buckets with a uniform hash, the probability of **at least one** collision is roughly `1 - e^(-n²/(2m))`.

**Implication**: a 32-bit hash gives ~50% collision chance after just **~77,000 entries**, not 2 billion. That's why hash tables use much smaller bucket counts and rely on chaining/probing — not big hash space.

**Consequence for distributed systems**: 64-bit hashes are safe for up to billions of items; 32-bit hashes are not.

---

### Q18. What is a perfect hash function?

**Perfect** = no collisions for a known, fixed key set.
**Minimal perfect** = no collisions AND uses exactly `n` buckets (no wasted space).

**Use cases**:
- Compiler keyword lookup tables (e.g., `gperf` in C).
- DNS / config files baked at build time.
- Game asset lookup.

Constructed offline; not viable for general dynamic key sets.

---

## 5. Algorithm Patterns

---

### Q19. The "frequency map" pattern.

The single most common pattern using hash tables:

```js
const freq = new Map();
for (const x of arr) freq.set(x, (freq.get(x) ?? 0) + 1);
```

**Solves**:
- Anagram detection (same char frequency).
- Top K Frequent.
- First Unique Character.
- Subarray with K distinct elements.
- Roman numeral parsing.

---

### Q20. The "complement / hash-of-seen" pattern.

```js
const seen = new Map();
for (let i = 0; i < arr.length; i++) {
  const need = target - arr[i];
  if (seen.has(need)) return [seen.get(need), i];
  seen.set(arr[i], i);
}
```

**Solves**: Two Sum, pair-sum, target-sum-on-stream. The "as you scan, ask if you've seen the complement" idiom.

---

### Q21. The "prefix-sum hash" pattern.

```js
const counts = new Map([[0, 1]]);
let sum = 0, ans = 0;
for (const x of arr) {
  sum += x;
  ans += counts.get(sum - k) ?? 0;
  counts.set(sum, (counts.get(sum) ?? 0) + 1);
}
```

**Solves**: subarray sum equals K, divisible by K, with average X. Beats sliding window when negatives are allowed.

---

### Q22. The "group by canonical key" pattern.

```js
const groups = new Map();
for (const item of items) {
  const key = canonicalize(item);     // sort chars, sort tuple, etc.
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(item);
}
```

**Solves**: Group Anagrams, Find Duplicate Subtrees, Group Shifted Strings. The hard part is choosing the right canonical form.

---

## 6. JavaScript Gotchas

---

### Q23. What's wrong here?

```js
const obj = {};
obj[true] = 1;
obj[1] = 2;
console.log(obj);   // ?
```

**Answer**: `{ "1": 2, "true": 1 }` — `true` becomes the string `"true"`, but `1` becomes `"1"`. They don't collide, but watch out:

```js
const obj = {};
obj[1] = 'a';
obj['1'] = 'b';
console.log(obj[1]);   // 'b' — both keys are the string "1"
```

Object keys are always strings (or symbols). Use `Map` if you need real number keys.

---

### Q24. What does this print?

```js
const m = new Map();
m.set(NaN, 'a');
console.log(m.get(NaN));   // 'a' — NaN is treated as equal to itself

const obj = {};
obj[NaN] = 'a';
console.log(obj[NaN]);     // 'a' — NaN becomes "NaN" string
```

Both Maps and Objects "work" with NaN, but for opposite reasons:
- `Map` uses **SameValueZero** equality (NaN === NaN is true here).
- `Object` keys are coerced to **strings**, and `String(NaN)` is `"NaN"`.

---

### Q25. What's the bug?

```js
const counts = {};
const arr = ['toString', 'apple', 'banana'];
for (const x of arr) counts[x] = (counts[x] || 0) + 1;
```

**Bug**: `counts['toString']` is initially **a function** (inherited from `Object.prototype`), not `undefined`. So `counts['toString'] || 0` returns the function on first iteration → `function + 1` = `NaN`.

**Fixes**:
- `Object.create(null)` — no prototype.
- `Map` — no prototype-chain pollution.
- `Object.hasOwn(counts, x)` instead of `||`.

---

## 7. Quick-Fire Drills

| Question                                                            | Answer                                                                |
| ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Average lookup time?                                                | O(1)                                                                  |
| Worst-case lookup?                                                  | O(n)                                                                  |
| Why average O(1) and not O(1)?                                      | Collisions can degrade to O(n).                                       |
| What's a load factor?                                               | `entries / buckets` ratio.                                            |
| Typical resize threshold?                                           | 0.7 (open addr) / 1.0 (chaining).                                     |
| Two main collision strategies?                                      | Separate chaining, open addressing.                                   |
| Why can't `Object` use any key type?                                | Keys coerce to string or symbol.                                      |
| Difference between `Object` and `Map` order?                        | `Object`: integer-like first; `Map`: insertion only.                  |
| Difference between `Map` and `WeakMap`?                             | WeakMap: object-only keys, GC-aware, no iteration.                    |
| Default hash multiplier?                                            | 31 (in JVM), various in V8.                                           |
| Hash collision DoS — how is it mitigated?                           | Randomized seed per process.                                          |
| Cryptographic hash inside HashMap — good idea?                      | No — too slow.                                                        |
| When does Java HashMap switch to red-black tree?                    | Bucket size > 8.                                                      |
| Bloom filter false negatives possible?                              | No — only false positives.                                            |
| Bloom filter delete supported?                                      | Not directly — use counting variant.                                  |
| Sorted iteration on hash table possible?                            | Only by sorting after `O(n + m)` collection.                          |
| Best for ordered keys + range queries?                              | Balanced BST / TreeMap, not HashMap.                                  |

---

## 8. Talking-Point Cheatsheet

1. *"Hash tables trade ordering for speed — O(1) average lookup vs O(log n) for a BST."*
2. *"Java HashMap, since 8, converts long buckets to red-black trees to guarantee O(log n) worst case."*
3. *"Open addressing is more cache-friendly than chaining and is what modern languages (Python, Go, Rust) use."*
4. *"For frequent insert/delete with non-string keys in JS, prefer `Map` over `Object` — V8's hidden class deopts on `Object` mutation."*
5. *"Use `WeakMap` to attach metadata to objects without leaking memory."*
6. *"Randomized hash seeds protect against collision DoS — every modern language does this."*
7. *"Bloom filters trade certainty for memory — perfect for 'almost certainly not present' fast paths in front of slow storage."*
8. *"Consistent hashing keeps cache invalidation O(1/N) instead of O(1) when nodes are added or removed."*
