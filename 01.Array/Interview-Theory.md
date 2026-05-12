# Array — Theoretical / Conceptual Interview Questions

> **Audience**: All levels. Theory is the first 10 minutes of any DSA round.
> **Goal**: Show deep understanding — *why* arrays behave the way they do, not just *what* they do.
> **Format**: Question → short crisp answer → deeper "explain like a senior" detail → follow-ups.

---

## 1. Fundamentals

---

### Q1. What is an array?

**Short**: A contiguous, fixed-size block of memory that stores elements of the same type, accessed by an integer index.

**Deeper**:
- "Contiguous" is the key word — addresses of element `i` and `i+1` differ by exactly `sizeof(element)`.
- That contiguity is what makes random access **O(1)**: `address(arr[i]) = base + i * size`.
- In strict (low-level) terms, that's a **static array**. JS, Python, Ruby give you **dynamic arrays** — same idea, but the runtime resizes the underlying buffer for you.

---

### Q2. Why is array access O(1)?

Because the address of `arr[i]` is computed by **arithmetic**, not by traversal:

```
address(arr[i]) = base_address + i * element_size
```

CPUs do this in one instruction. Compare to a linked list, where you must follow `i` pointers in sequence (O(n)).

**Follow-up — *"Is access truly O(1) considering cache misses?"***
- Mathematically yes; practically the **first** access may miss cache (RAM fetch) while subsequent accesses to nearby elements hit the prefetched cache line. That's why iterating an array is much faster than iterating a linked list of the same length even though both are O(n).

---

### Q3. Why is insertion in the middle O(n)?

Inserting at index `i` means every element from `i..n-1` must shift right by one slot to make room. That's `n - i` writes — linear in the worst case (insert at index 0).

**Same reasoning** for delete: gap must be closed by shifting.

**Why pushing/popping at the **end** is O(1) amortized**: no shift needed; just bump `length`. The "amortized" part covers occasional buffer doubling (next question).

---

### Q4. What is a dynamic array? How does it grow?

**Short**: A wrapper around a static buffer that auto-resizes when full.

**Mechanism**:
1. Allocate buffer of capacity `C` (e.g., 4).
2. On `push`, if `length < C`, write at `length++`. **O(1).**
3. If `length === C`, allocate new buffer of size `2C` (or `1.5C`), **copy all elements**, then write. **O(n)** for that push.

**Why amortized O(1)**: doubling means O(n) cost happens every n pushes — averaged across all pushes, it's O(1) per operation. (Aggregate analysis: n pushes do ≤ 4n total work.)

**Why doubling and not +1**: incrementing by a constant gives O(n²) total cost. Doubling (or 1.5×) gives O(n).

**Engines**:
- V8 uses a growth factor close to 1.5–2× for `JSArray` backing stores.
- Python `list` grows by `~1.125×` plus a small base.

---

### Q5. Static array vs Dynamic array — when do you use each?

| Aspect              | Static                       | Dynamic                       |
| ------------------- | ---------------------------- | ----------------------------- |
| Size                | Fixed at creation            | Grows/shrinks at runtime      |
| Memory              | One allocation               | May reallocate + copy         |
| `push` cost         | N/A (full = error)           | O(1) amortized                |
| Cache locality      | Perfect                      | Perfect *between* reallocs    |
| Use case            | Embedded, perf-critical, known size | General-purpose         |

In JS, you **only** get dynamic arrays. C, C++, Java offer both (`int[]` vs `ArrayList`, `std::array` vs `std::vector`).

---

### Q6. Array vs Linked List — full comparison.

| Operation            | Array (dynamic) | Linked List | Winner       |
| -------------------- | --------------- | ----------- | ------------ |
| Random access        | O(1)            | O(n)        | Array        |
| Insert at head       | O(n)            | O(1)        | Linked List  |
| Insert at tail       | O(1) amortized  | O(1)*       | Tie (LL needs tail ptr) |
| Insert at middle     | O(n) shift      | O(n) traverse + O(1) splice | Tie |
| Delete at head       | O(n)            | O(1)        | Linked List  |
| Memory overhead      | Just data       | Data + pointer per node | Array |
| Cache friendliness   | Excellent       | Poor (nodes scattered) | Array |
| Memory waste         | Unused capacity | None        | Linked List  |
| Resize cost          | O(n) on reallocate | None     | Linked List  |

**Real-world rule**: Arrays beat linked lists almost always for performance (cache locality dominates). Reach for linked lists only when (a) head insertion is hot, or (b) you splice in/out arbitrary nodes whose references you already hold (LRU cache, OS scheduler).

---

### Q7. Array vs Hash Table — when to choose which?

| Concern              | Array                       | Hash Table                  |
| -------------------- | --------------------------- | --------------------------- |
| Lookup by key        | O(n) (search)               | O(1) average                |
| Lookup by index      | O(1)                        | N/A                         |
| Ordered iteration    | Natural                     | Insertion-ordered (JS) but unsorted |
| Memory               | Compact                     | Higher overhead per entry   |
| Range queries        | Easy (sorted)               | Hard                        |
| Cache locality       | Excellent                   | Poor                        |

**Use array when**: keys are dense small integers, or you need ordering, or you do range/scan-heavy work.
**Use hash when**: keys are sparse / strings / arbitrary, and lookups dominate.

---

### Q8. What is row-major vs column-major order? Why does it matter?

For 2D arrays stored in linear memory, you must pick how rows/columns map to addresses:

- **Row-major** (C, C++, JS, Python): `M[r][c]` is at offset `r * cols + c`. Adjacent elements *in a row* are adjacent in memory.
- **Column-major** (Fortran, MATLAB, R): adjacent elements *in a column* are adjacent in memory.

**Why it matters — cache locality**:

```js
// FAST in row-major: inner loop walks contiguous memory
for (let r = 0; r < rows; r++)
  for (let c = 0; c < cols; c++) M[r][c] += 1;

// SLOW in row-major: inner loop jumps `cols` apart, cache miss every step
for (let c = 0; c < cols; c++)
  for (let r = 0; r < rows; r++) M[r][c] += 1;
```

Same algorithmic complexity, **10–50× speed difference** on large matrices.

---

## 2. JavaScript-Specific

---

### Q9. Are JavaScript arrays "real" arrays?

**No — they're objects.** Specifically, exotic objects whose integer-indexed properties get special treatment.

```js
typeof [];              // 'object'
[] instanceof Array;    // true
arr[0] === arr['0'];    // true — keys are coerced to strings
```

**But** modern engines (V8, SpiderMonkey) optimize them to *behave* like real arrays:
- If all elements are the same type and indices are dense → engine stores them as a packed C-style array (e.g., `PACKED_SMI_ELEMENTS`, `PACKED_DOUBLE_ELEMENTS`).
- If you create holes or mix types → **deoptimized** to `HOLEY_ELEMENTS` (slower) or even a dictionary (`DICTIONARY_ELEMENTS`).

**Senior takeaway**: write code that keeps the array **packed** (no holes, consistent type) for hot paths.

---

### Q10. What is a sparse array? Why are they slow?

```js
const a = [];
a[1000] = 'x';      // a.length === 1001, but only 1 actual element
```

**Sparse** = some indices have no value (holes), not even `undefined`.

**Why slow**:
- Engine downgrades from dense storage to a hash-map-like representation.
- Many array methods (`forEach`, `map`, `filter`) skip holes — but you pay the dispatch cost per index.

**How to avoid**:
- Don't `delete arr[i]` — use `arr.splice(i, 1)` or assign `undefined`.
- Don't assign past `length`.
- Prefer `Array.from({length: n}, ...)` over `new Array(n)`.

---

### Q11. Why does `arr.sort()` sort `[1, 10, 2]` as `[1, 10, 2]` instead of `[1, 2, 10]`?

Because the default comparator converts elements to **strings** and sorts lexicographically: `"1" < "10" < "2"`.

**Fix**:

```js
[1, 10, 2].sort((a, b) => a - b);   // [1, 2, 10]
```

**Follow-up — *"Is JS sort stable?"***
- Per ES2019 spec: **yes, sort must be stable**. Modern V8 uses **TimSort**; older versions used QuickSort which was unstable.

---

### Q12. What are the ES2023 "to*" methods and why do they exist?

| Mutating (old) | Non-mutating copy (new) |
| -------------- | ----------------------- |
| `reverse()`    | `toReversed()`          |
| `sort()`       | `toSorted()`            |
| `splice()`     | `toSpliced()`           |
| `arr[i] = v`   | `with(i, v)`            |

**Why**: JS has been moving toward **immutable-style** programming (React, Redux, functional libs). Mutating methods broke referential equality used by these tools. Now the language gives you copy-on-write versions.

---

### Q13. `forEach` vs `for` vs `for…of` vs `map` — what's the difference?

| Method     | Mutates? | Returns | Skips holes? | Can `break`? | Async-friendly? |
| ---------- | -------- | ------- | ------------ | ------------ | --------------- |
| `for`      | depends  | —       | no           | yes          | yes (await)     |
| `for…of`   | depends  | —       | no           | yes          | yes (await)     |
| `forEach`  | depends  | undef   | yes          | **no**       | **no** (awaits ignored) |
| `map`      | no       | new arr | yes          | no           | no              |

**Key gotchas**:
- `forEach(async ...)` doesn't wait — fires all callbacks, returns `undefined`. Use `for…of` with `await`.
- `map` allocates a new array; if you don't need the result, prefer `for…of`.
- `for…of` works on any iterable (`Map`, `Set`, generators); `forEach`/`map` are array-specific.

---

### Q14. Are arrays passed by value or reference in JavaScript?

**JS is always pass-by-value**, but for objects (including arrays) the *value* being passed **is the reference**. So:

```js
function mutate(a) { a.push(99); }    // mutates caller's array
function reassign(a) { a = [1,2,3]; } // does NOT affect caller

const x = [1, 2];
mutate(x);    // x === [1, 2, 99]
reassign(x);  // x === [1, 2, 99] still
```

**Term of art**: "**call by sharing**" — same model as Python, Ruby, Java.

---

### Q15. Shallow copy vs deep copy — every method.

| Method                                 | Type     | Notes                                      |
| -------------------------------------- | -------- | ------------------------------------------ |
| `arr.slice()`                          | shallow  | Fastest                                    |
| `[...arr]`                             | shallow  | Idiomatic                                  |
| `Array.from(arr)`                      | shallow  | Also works on iterables                    |
| `arr.concat()`                         | shallow  | Older idiom                                |
| `JSON.parse(JSON.stringify(arr))`      | deep     | Loses functions, `undefined`, `Date`, etc. |
| `structuredClone(arr)`                 | deep     | Modern, handles cycles, Maps, Sets, Date   |
| Manual recursion                       | deep     | When you need custom behavior              |

**Senior gotcha**: `structuredClone` handles cycles; `JSON` does not (throws on circular references).

---

### Q16. What are typed arrays? When do you use them?

`Int8Array`, `Uint8Array`, `Int16Array`, `Int32Array`, `Float32Array`, `Float64Array`, etc.

**Differences from regular arrays**:
- **Fixed length, fixed type** — element size is known, contiguous memory.
- Backed by an `ArrayBuffer` (raw bytes).
- No `push`/`pop`/`splice` — they don't grow.
- Massively faster for numeric work because the engine doesn't box each number.

**Use cases**:
- WebGL / Canvas / WebGPU buffers.
- Audio processing (`Float32Array`).
- Crypto / hashing (`Uint8Array`).
- WASM interop.
- Tight inner loops over millions of numbers.

---

### Q17. What are `Symbol.iterator`, `Symbol.species`, and `Symbol.isConcatSpreadable`?

- **`Symbol.iterator`** — the method called by `for…of`, spread, destructuring. `arr[Symbol.iterator]()` returns an iterator. You can override on custom classes to make them iterable.
- **`Symbol.species`** — controls which constructor methods like `map`, `filter`, `slice` use to build the returned array. Set on a subclass to make `subclass.map(...)` return a plain `Array` instead of an instance of the subclass.
- **`Symbol.isConcatSpreadable`** — when `true`, `concat` will flatten that object's elements into the result. Default is `true` on arrays, `false` on array-like objects.

These are the kinds of details Senior + L6 interviews probe for.

---

## 3. Algorithm-Theory Questions

---

### Q18. What is amortized analysis? Walk through `Array.push`.

**Amortized cost** = total cost of n operations, divided by n. It smooths over occasional expensive operations.

**For `push` on a doubling dynamic array**:
- n pushes, capacity doubles at sizes 1, 2, 4, 8, …, n.
- Copy work = 1 + 2 + 4 + … + n ≈ 2n.
- Plus n direct writes.
- Total work ≈ 3n → average **O(1) per push**.

**Three flavors of amortized analysis**:
1. **Aggregate** — total cost / n (above).
2. **Accounting** — pre-pay credits during cheap ops, spend on expensive ones.
3. **Potential** — define a potential function over data structure state.

---

### Q19. What is "in-place" vs "out-of-place"? Why does it matter?

- **In-place**: O(1) extra space; mutates input.
- **Out-of-place**: allocates new structure; preserves input.

**Why it matters**:
- Memory-constrained systems (embedded, GPU shaders, large datasets).
- Concurrency — out-of-place is naturally thread-safe; in-place often isn't.
- Functional code style — out-of-place plays better with immutability.

**Examples**:
- In-place: `sort`, `reverse`, `splice`.
- Out-of-place: `toSorted`, `toReversed`, `slice`, `map`.

---

### Q20. Stable vs unstable sort — what's the practical difference?

A sort is **stable** if equal elements keep their original relative order.

```js
[ {n: 1, t: 'a'}, {n: 2, t: 'b'}, {n: 1, t: 'c'} ].sort((x, y) => x.n - y.n);
// stable:   [{1,'a'}, {1,'c'}, {2,'b'}]
// unstable: [{1,'c'}, {1,'a'}, {2,'b'}]   ← order of 'a' and 'c' may swap
```

**Why it matters**:
- **Multi-key sorting**: sort by name, then by age — stability preserves name order within same-age groups.
- **UI lists** where row identity should not jiggle on re-sort.

**Algorithms**:
- Stable: Merge sort, Insertion sort, TimSort, Counting sort.
- Unstable: Quick sort, Heap sort, Selection sort.

---

### Q21. Why is `O(n²)` bubble sort sometimes faster than `O(n log n)` merge sort?

For **very small** n or **already-sorted** input:
- Constants in `n log n` algorithms are typically larger.
- Bubble/Insertion sort have nearly **zero overhead** and are **adaptive** (best case O(n) for sorted input).
- TimSort exploits this by switching to insertion sort for small subarrays (size ≤ 32 typically).

**Lesson**: Big-O is asymptotic. For small data, constants and cache behavior dominate.

---

### Q22. Two-pointer technique — when does it apply?

It applies when:
1. The array is **sorted** (or partially sorted), and
2. You want to find a pair/triplet/window satisfying some monotonic predicate.

**Why it's O(n)**: Each pointer advances at most n times; total work is 2n.

**Variants**:
- **Same-direction (sliding window)**: both pointers move forward, window shrinks/grows.
- **Opposite-direction**: pointers start at both ends, converge.
- **Fast/slow**: one moves 2 steps for every 1 of the other (cycle detection).

---

### Q23. When does sliding window NOT work?

Sliding window assumes that **growing** the window monotonically increases (or decreases) the metric, so that shrinking from one end can restore feasibility.

It **fails** when:
- The array contains **negatives** in a sum problem — adding more elements can decrease the running sum, breaking monotonicity. Use prefix-sum + hash instead.
- The window size depends on values that can both increase and decrease the metric in unpredictable ways.

**Example**: "Subarray Sum Equals K" with negatives → use prefix-sum hash. Without negatives → sliding window works.

---

### Q24. What is "binary search on the answer"?

Used when:
1. The answer space is bounded `[lo, hi]`.
2. There's a feasibility predicate `canAchieve(x)` that is **monotonic** — true above some threshold, false below (or vice versa).

**Pattern**:

```js
let lo = ..., hi = ...;
while (lo < hi) {
  const mid = (lo + hi) >> 1;
  canAchieve(mid) ? hi = mid : lo = mid + 1;
}
return lo;
```

**Examples**: Split Array Largest Sum, Capacity to Ship Packages, Minimum Time to Complete Trips, Koko Eating Bananas.

---

### Q25. Prefix sum — when, why, complexity?

**When**: many range-sum queries on a static array.

**Why**: precompute `P[i] = arr[0] + arr[1] + ... + arr[i-1]`. Then sum of range `[l, r]` = `P[r+1] - P[l]`.

| Operation              | Without prefix | With prefix |
| ---------------------- | -------------- | ----------- |
| Build                  | —              | O(n)        |
| Query range sum        | O(n) per query | O(1) per query |
| Update single element  | O(1)           | O(n) (rebuild suffix) |

**Use cases**:
- Range sum queries on static data.
- Subarray sum equals K (with hash map of prefix sums).
- 2D prefix sums for matrix region queries.

**If you need fast updates** → switch to **Fenwick tree** or **segment tree** (both O(log n) per query and update).

---

### Q26. What is cyclic sort / index-as-hash?

**Pattern**: When values are bounded by `[1..n]` (or `[0..n-1]`), the array index itself can act as a hash. Place value `v` at index `v - 1`. Anything left out of place reveals what's missing or duplicated.

**Used in**: First Missing Positive, Find All Duplicates, Find All Numbers Disappeared.

**Why O(n)**: each swap places at least one element correctly; total swaps ≤ n.

---

## 4. Design / System-Flavored

---

### Q27. How would you implement a dynamic array from scratch?

```js
class DynamicArray {
  constructor() {
    this.size = 0;
    this.capacity = 4;
    this.buf = new Array(this.capacity);
  }
  push(v) {
    if (this.size === this.capacity) this._grow();
    this.buf[this.size++] = v;
  }
  pop() {
    if (this.size === 0) return undefined;
    const v = this.buf[--this.size];
    this.buf[this.size] = undefined;             // help GC
    if (this.size > 0 && this.size === this.capacity >> 2) this._shrink();
    return v;
  }
  get(i)       { if (i < 0 || i >= this.size) throw new RangeError(); return this.buf[i]; }
  set(i, v)    { if (i < 0 || i >= this.size) throw new RangeError(); this.buf[i] = v; }
  _grow()  { this._resize(this.capacity * 2); }
  _shrink(){ this._resize(this.capacity >> 1); }
  _resize(cap) {
    const next = new Array(cap);
    for (let i = 0; i < this.size; i++) next[i] = this.buf[i];
    this.buf = next; this.capacity = cap;
  }
}
```

**Talking points**:
- Why double, not increment? → amortized O(1).
- Why shrink at quarter, not half? → avoids thrash on alternating push/pop.
- Why null-out on pop? → release reference for GC.
- Why throw on out-of-bounds? → fail fast.

---

### Q28. How would you implement a circular buffer (ring buffer)?

```js
class RingBuffer {
  constructor(cap) {
    this.buf = new Array(cap);
    this.cap = cap;
    this.head = 0;        // next read
    this.tail = 0;        // next write
    this.size = 0;
  }
  enqueue(v) {
    if (this.size === this.cap) throw new Error('full');
    this.buf[this.tail] = v;
    this.tail = (this.tail + 1) % this.cap;
    this.size++;
  }
  dequeue() {
    if (this.size === 0) return undefined;
    const v = this.buf[this.head];
    this.buf[this.head] = undefined;
    this.head = (this.head + 1) % this.cap;
    this.size--;
    return v;
  }
}
```

**Use cases**: streaming logs, bounded queues, FIFO IPC, OS device buffers.

**Why a ring buffer over a regular queue**: O(1) enqueue/dequeue with O(1) memory; no shifting, no allocations after construction.

---

### Q29. Explain CPU cache and why it makes arrays fast.

**CPU cache hierarchy**: L1 (~1 ns) → L2 (~3 ns) → L3 (~10 ns) → RAM (~100 ns).

When the CPU loads `arr[i]`, it actually loads a whole **cache line** (typically 64 bytes) — that's `arr[i]`, `arr[i+1]`, ..., `arr[i+15]` for 4-byte ints.

So accessing `arr[i+1]` next is a **cache hit** (free). This is **spatial locality**.

**Linked list** stores nodes scattered across the heap. Each `node.next` is likely a different cache line → **cache miss** on every step. Even though both are O(n) algorithmically, the array is often 10–100× faster in practice.

**Senior interviewers love this answer** because it shows you think beyond Big-O.

---

## 5. Quick-Fire Concept Drills

> One-liner answers — useful for warm-up rounds.

| Question                                                                 | Answer (1-line)                                                                  |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Time complexity of accessing `arr[i]`?                                   | O(1)                                                                             |
| Time complexity of `arr.indexOf(x)`?                                     | O(n)                                                                             |
| Time complexity of `arr.includes(x)`?                                    | O(n)                                                                             |
| Time complexity of `arr.unshift(x)`?                                     | O(n) — shifts all elements                                                       |
| Time complexity of `arr.push(x)`?                                        | O(1) amortized                                                                   |
| Time complexity of `arr.sort()`?                                         | O(n log n)                                                                       |
| Time complexity of `arr.slice(a, b)`?                                    | O(b − a)                                                                         |
| Does `Array(5)` create 5 `undefined` entries?                            | No — 5 empty holes (sparse).                                                     |
| Does `[].length = 5` create 5 entries?                                   | No — 5 holes; `length` only.                                                     |
| Is `typeof []` `'array'`?                                                | No, `'object'`. Use `Array.isArray()`.                                           |
| Default `sort` order?                                                    | Lexicographic (string-coerced). Pass comparator for numbers.                     |
| Are JS arrays homogeneous?                                               | No — can mix any types.                                                          |
| Max array length?                                                        | 2³² − 1 (≈ 4.29 B).                                                              |
| Does `delete arr[i]` shrink length?                                      | No — leaves a hole.                                                              |
| Difference between `for…in` and `for…of` on an array?                    | `for…in` iterates **keys** (incl. inherited); `for…of` iterates **values**.      |
| Is `Array.prototype.sort` stable?                                        | Yes (ES2019+).                                                                   |
| Mutating methods of `Array`?                                             | `push, pop, shift, unshift, splice, sort, reverse, fill, copyWithin`.            |
| Methods that skip holes?                                                 | `forEach, map, filter, reduce, every, some` — but not `for…of`.                  |
| Cleanest deep clone?                                                     | `structuredClone(arr)`.                                                          |
| Difference between `Array.from(s)` and `[...s]` for a string `s`?        | Same result for ASCII. For surrogate-pair emoji, `[...s]` and `Array.from(s)` both split correctly; `s.split('')` does **not**. |

---

## 6. Trick / Gotcha Questions

---

### Q30. What does this print?

```js
const a = [1, 2, 3];
a.length = 0;
console.log(a);       // []
```

Setting `length` to 0 truncates and **drops all references** — equivalent to `a.splice(0)` but faster. Common interview trick to test `length` semantics.

---

### Q31. What does this print?

```js
const arr = new Array(3);
console.log(arr.map(x => 1));    // [<3 empty items>]
console.log([...arr].map(x => 1)); // [1, 1, 1]
```

`new Array(3)` creates 3 holes. `map` skips holes → still holes. Spreading into a new array with `[...arr]` materializes them as `undefined` first, so `map` runs the callback.

---

### Q32. What does this print?

```js
[1, 2, 3].includes(NaN);   // false
[1, 2, NaN].includes(NaN); // true
[1, 2, NaN].indexOf(NaN);  // -1
```

`includes` uses **SameValueZero** (treats NaN as equal to NaN); `indexOf` uses **Strict Equality** (NaN ≠ NaN).

---

### Q33. What does this print?

```js
const a = [1, 2, 3];
const b = a;
b.push(4);
console.log(a);   // [1, 2, 3, 4]
```

Arrays are reference types — `b` and `a` point to the same object. Mutations show up in both.

---

### Q34. Find the bug:

```js
const arr = [1, 2, 3, 4, 5];
for (let i = 0; i < arr.length; i++) {
  if (arr[i] % 2 === 0) arr.splice(i, 1);
}
// expected: [1, 3, 5]
// actual:   [1, 3, 5]   sometimes
// actual:   [1, 3, 4, 5] when evens are adjacent
```

`splice` shifts indices left, but `i++` still moves right → you skip the element that took the deleted one's place.

**Fixes**:
- Iterate **backwards**.
- Decrement `i` after splice.
- Use `arr.filter(x => x % 2 !== 0)` (allocates new array but bug-free).

---

### Q35. What's wrong?

```js
const matrix = Array(3).fill(Array(3).fill(0));
matrix[0][0] = 1;
console.log(matrix);
// [[1,0,0], [1,0,0], [1,0,0]]   ← all rows mutated!
```

`fill` puts the **same reference** into every slot. All rows are the same array.

**Fix**:
```js
const matrix = Array.from({length: 3}, () => Array(3).fill(0));
```

This is a **classic bug** that almost every JS dev hits at least once.

---

## 7. Talking-Point Cheatsheet (Memorize)

When asked about arrays, weave these in:

1. *"Arrays trade insertion cost for access speed. The contiguous layout enables O(1) random access and excellent cache locality, at the cost of O(n) insertions in the middle."*
2. *"Dynamic arrays achieve amortized O(1) push by doubling capacity; the rare O(n) reallocation is amortized across n cheap operations."*
3. *"In V8, arrays stay packed and fast as long as you don't introduce holes or mix types."*
4. *"For numeric-heavy work, consider Typed Arrays — they avoid boxing and are massively faster."*
5. *"Stability matters when sorting by multiple keys; JS sort is stable since ES2019."*
6. *"Mutating methods bite you in immutable-state codebases; ES2023 added `toSorted`, `toReversed`, `toSpliced`, `with` for that reason."*
7. *"Two-pointer and sliding-window techniques get you from O(n²) to O(n) on sorted/contiguous data."*
8. *"Prefix sums turn range-query work from O(n) per query into O(1) per query, after O(n) preprocessing."*

---

## 8. Topics to Read Next

- **Memory layout & V8 internals**: [v8.dev](https://v8.dev/blog/elements-kinds)
- **TimSort**: how it adapts to real-world (often partially sorted) data.
- **Cache-oblivious algorithms**: faster on hierarchical memory without knowing cache size.
- **SIMD on Typed Arrays**: WebAssembly + SIMD for numeric throughput.
