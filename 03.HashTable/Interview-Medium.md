# HashTable — Medium Interview Questions

> **Audience**: Mid-level / on-site rounds.
> **Goal**: Combine hashing with sliding windows, prefix sums, and grouping. The "key choice" matters — half the difficulty is picking what to hash.

---

## Q1. Group Anagrams

> Group strings that are anagrams of each other.

**Example**: `["eat","tea","tan","ate","nat","bat"]` → `[["eat","tea","ate"],["tan","nat"],["bat"]]`

#### Approach 1 — Sorted-String Key

```js
function groupAnagrams(strs) {
  const groups = new Map();
  for (const s of strs) {
    const key = [...s].sort().join('');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  return [...groups.values()];
}
```

- **Time**: O(n · k log k) where k = max length · **Space**: O(n · k)

#### Approach 2 — Char-Count Key (Faster for Long Words)

```js
function groupAnagrams(strs) {
  const groups = new Map();
  for (const s of strs) {
    const count = new Array(26).fill(0);
    for (const c of s) count[c.charCodeAt(0) - 97]++;
    const key = count.join(',');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  return [...groups.values()];
}
```

- **Time**: O(n · k) · **Space**: O(n · k)
- **Tradeoff**: faster sort-bound, but assumes lowercase ASCII.

---

## Q2. Top K Frequent Elements

> Return the k most frequent elements.

#### Approach 1 — Sort by Frequency

- O(n log n).

#### Approach 2 — Min-Heap of Size k

- O(n log k). Best when k « n.

#### Approach 3 — Bucket Sort (O(n))

```js
function topKFrequent(nums, k) {
  const freq = new Map();
  for (const n of nums) freq.set(n, (freq.get(n) ?? 0) + 1);
  const buckets = Array.from({ length: nums.length + 1 }, () => []);
  for (const [n, c] of freq) buckets[c].push(n);
  const out = [];
  for (let i = buckets.length - 1; i >= 0 && out.length < k; i--) out.push(...buckets[i]);
  return out.slice(0, k);
}
```

- **Time**: O(n) · **Space**: O(n)
- **Insight**: frequency is bounded by `n` → use it as bucket index. No comparison sort needed.

---

## Q3. Longest Substring Without Repeating Characters

> Length of the longest substring with all distinct characters.

**Example**: `"abcabcbb"` → `3` (`"abc"`).

#### Approach 1 — Sliding Window + Set

```js
function lengthOfLongestSubstring(s) {
  const set = new Set();
  let l = 0, best = 0;
  for (let r = 0; r < s.length; r++) {
    while (set.has(s[r])) set.delete(s[l++]);
    set.add(s[r]);
    best = Math.max(best, r - l + 1);
  }
  return best;
}
```

#### Approach 2 — Sliding Window + Map (Skip Ahead)

```js
function lengthOfLongestSubstring(s) {
  const last = new Map();
  let l = 0, best = 0;
  for (let r = 0; r < s.length; r++) {
    if (last.has(s[r]) && last.get(s[r]) >= l) l = last.get(s[r]) + 1;
    last.set(s[r], r);
    best = Math.max(best, r - l + 1);
  }
  return best;
}
```

- Both **O(n)** time, **O(σ)** space.
- Map version saves the inner `while` loop — `l` jumps directly past the last duplicate.

---

## Q4. Longest Consecutive Sequence

> Longest run of consecutive integers (any order).

```js
function longestConsecutive(nums) {
  const set = new Set(nums);
  let best = 0;
  for (const n of set) {
    if (set.has(n - 1)) continue;            // only start from a sequence's first element
    let cur = n, len = 1;
    while (set.has(cur + 1)) cur++, len++;
    best = Math.max(best, len);
  }
  return best;
}
```

- **Time**: O(n) — `set.has(n-1)` ensures each chain is walked once total.
- **Pitfall**: without the guard, this becomes O(n²) on inputs like `[1, 2, …, n]`.

---

## Q5. Subarray Sum Equals K

> Count contiguous subarrays whose sum equals `k`. Negatives allowed.

```js
function subarraySum(nums, k) {
  const counts = new Map([[0, 1]]);
  let sum = 0, total = 0;
  for (const n of nums) {
    sum += n;
    total += counts.get(sum - k) ?? 0;
    counts.set(sum, (counts.get(sum) ?? 0) + 1);
  }
  return total;
}
```

- **Time**: O(n) · **Space**: O(n)
- **Why not sliding window**: negatives break monotonicity — `[1, -1, 0]` has multiple subarrays summing to 0.
- **Pitfall**: missing the `(0, 1)` seed → undercounts subarrays starting at index 0.

---

## Q6. Continuous Subarray Sum

> Subarray of length ≥ 2 whose sum is a multiple of `k`?

```js
function checkSubarraySum(nums, k) {
  const seen = new Map([[0, -1]]);            // remainder → earliest index
  let sum = 0;
  for (let i = 0; i < nums.length; i++) {
    sum += nums[i];
    const r = ((sum % k) + k) % k;
    if (seen.has(r)) {
      if (i - seen.get(r) >= 2) return true;
    } else {
      seen.set(r, i);
    }
  }
  return false;
}
```

- **Time**: O(n) · **Space**: O(min(n, k))
- **Insight**: two prefixes with the same `sum % k` ⇒ subarray between them is divisible by `k`.
- **Pitfall**: Don't overwrite the index — keep the **earliest** so the gap can grow ≥ 2.

---

## Q7. Subarray Sums Divisible by K

> Count contiguous subarrays whose sum is divisible by `k`.

```js
function subarraysDivByK(nums, k) {
  const counts = new Map([[0, 1]]);
  let sum = 0, ans = 0;
  for (const x of nums) {
    sum += x;
    const r = ((sum % k) + k) % k;
    ans += counts.get(r) ?? 0;
    counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  return ans;
}
```

- **Time**: O(n) · **Space**: O(min(n, k))
- **Trick**: `((x % k) + k) % k` handles negative remainders (JS `%` keeps sign of dividend).

---

## Q8. 4Sum II

> Count tuples `(i, j, k, l)` with `A[i] + B[j] + C[k] + D[l] === 0`. Each array length is n.

```js
function fourSumCount(A, B, C, D) {
  const sumAB = new Map();
  for (const a of A) for (const b of B) sumAB.set(a + b, (sumAB.get(a + b) ?? 0) + 1);
  let count = 0;
  for (const c of C) for (const d of D) count += sumAB.get(-(c + d)) ?? 0;
  return count;
}
```

- **Time**: O(n²) · **Space**: O(n²)
- **Pattern**: split 4 → 2+2. Naive is O(n⁴); naive-with-hash is O(n³); split is O(n²).

---

## Q9. Find All Anagrams in a String

> Return start indices of all anagrams of `p` in `s`.

```js
function findAnagrams(s, p) {
  if (s.length < p.length) return [];
  const need = new Array(26).fill(0), have = new Array(26).fill(0);
  for (const c of p) need[c.charCodeAt(0) - 97]++;
  const out = [];
  for (let i = 0; i < s.length; i++) {
    have[s.charCodeAt(i) - 97]++;
    if (i >= p.length) have[s.charCodeAt(i - p.length) - 97]--;
    if (i >= p.length - 1 && need.every((v, j) => v === have[j])) out.push(i - p.length + 1);
  }
  return out;
}
```

- **Time**: O(26 · n) · **Space**: O(1)
- **Optimization**: maintain a `matches` counter (incremented when a count equals its target) to drop the per-step `every` to O(1) per shift.

---

## Q10. Insert Delete GetRandom O(1)

> Class with `insert(val)`, `remove(val)`, `getRandom()`, all average O(1).

```js
class RandomizedSet {
  constructor() {
    this.arr = [];
    this.idx = new Map();           // val → index in arr
  }
  insert(val) {
    if (this.idx.has(val)) return false;
    this.idx.set(val, this.arr.length);
    this.arr.push(val);
    return true;
  }
  remove(val) {
    if (!this.idx.has(val)) return false;
    const i = this.idx.get(val);
    const last = this.arr[this.arr.length - 1];
    this.arr[i] = last;
    this.idx.set(last, i);
    this.arr.pop();
    this.idx.delete(val);
    return true;
  }
  getRandom() {
    return this.arr[Math.floor(Math.random() * this.arr.length)];
  }
}
```

- **Time**: O(1) per op · **Space**: O(n)
- **Trick**: to delete in O(1), swap with the last element, then pop. Map gives O(1) "where is X".

---

## Q11. Encode and Decode TinyURL

> Design `encode(longUrl)` and `decode(shortUrl)`.

```js
class Codec {
  constructor() { this.map = new Map(); this.counter = 0; }
  encode(longUrl) {
    const id = (this.counter++).toString(36);
    this.map.set(id, longUrl);
    return 'http://tinyurl.com/' + id;
  }
  decode(shortUrl) {
    return this.map.get(shortUrl.split('/').pop());
  }
}
```

- **Time**: O(1) per op · **Space**: O(n)

**Follow-ups**:
- *"What if process restarts?"* → persist to a DB.
- *"Distributed?"* → coordinate ID generation (Snowflake, hash-of-URL, ZooKeeper sequence).
- *"How long should the short ID be?"* → 7 chars in base62 = ~3.5 trillion URLs.

---

## Q12. Custom Sort String

> Permute `s` so that characters appear in the order specified by `order`. Characters not in `order` can appear anywhere.

**Example**: `order="cba"`, `s="abcd"` → `"cbad"` (or `"cbda"`).

```js
function customSortString(order, s) {
  const freq = new Map();
  for (const c of s) freq.set(c, (freq.get(c) ?? 0) + 1);
  let out = '';
  for (const c of order) {
    if (freq.has(c)) {
      out += c.repeat(freq.get(c));
      freq.delete(c);
    }
  }
  for (const [c, count] of freq) out += c.repeat(count);
  return out;
}
```

- **Time**: O(s + order) · **Space**: O(σ)

---

## Q13. Bulls and Cows

> Bulls = correct digit + position. Cows = correct digit, wrong position. Return `"xAyB"`.

```js
function getHint(secret, guess) {
  let bulls = 0, cows = 0;
  const sCnt = new Array(10).fill(0), gCnt = new Array(10).fill(0);
  for (let i = 0; i < secret.length; i++) {
    if (secret[i] === guess[i]) bulls++;
    else { sCnt[+secret[i]]++; gCnt[+guess[i]]++; }
  }
  for (let i = 0; i < 10; i++) cows += Math.min(sCnt[i], gCnt[i]);
  return `${bulls}A${cows}B`;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Pattern**: count what's left after exact matches; min of the two arrays gives unordered overlap.

---

## Q14. Sort Characters By Frequency

```js
function frequencySort(s) {
  const freq = new Map();
  for (const c of s) freq.set(c, (freq.get(c) ?? 0) + 1);
  const buckets = Array.from({ length: s.length + 1 }, () => []);
  for (const [c, n] of freq) buckets[n].push(c);
  let out = '';
  for (let n = buckets.length - 1; n >= 0; n--)
    for (const c of buckets[n]) out += c.repeat(n);
  return out;
}
```

- **Time**: O(n) (bucket sort by frequency) · **Space**: O(n)

---

## Q15. Find Duplicate Subtrees

> In a binary tree, find the root nodes of all duplicate subtrees.

```js
function findDuplicateSubtrees(root) {
  const seen = new Map();
  const out = [];
  function serialize(node) {
    if (!node) return '#';
    const key = `${node.val},${serialize(node.left)},${serialize(node.right)}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
    if (seen.get(key) === 2) out.push(node);
    return key;
  }
  serialize(root);
  return out;
}
```

- **Time**: O(n²) worst (string ops) · **Space**: O(n²)
- **Optimization (interview gold)**: assign each unique serialization an integer ID via a second `Map`; serialize returns the ID instead of the string. Drops to O(n) time/space.

---

## Q16. LRU Cache (Hash + Doubly Linked List)

> See `02.LinkedList/Interview-Medium.md` Q13 for full implementation.
> The key idea is **hash map for O(1) lookup + DLL for O(1) reorder**. Combination shows up everywhere: page caches, browser back-forward stacks, redis evictions.

---

## Patterns Cheatsheet (Medium)

| Pattern                              | Trigger                                           | Examples here   |
| ------------------------------------ | ------------------------------------------------- | --------------- |
| **Group by canonical key**           | Anagram-style equivalence classes                 | Q1, Q15         |
| **Bucket sort by frequency**         | k-th frequency / score with bounded counts        | Q2, Q14         |
| **Sliding window + last-seen index** | Longest unique window                             | Q3              |
| **Set-of-starts trick**              | Sequence-length problems in O(n)                  | Q4              |
| **Prefix sum + hash counts**         | Subarray sums under negatives or modulo           | Q5, Q6, Q7      |
| **Split into halves**                | k-Sum problems where 4-way reduces to 2 × 2-way   | Q8              |
| **Frequency-array sliding window**   | Anagram in window                                 | Q9              |
| **Hash + array backing**             | O(1) random access set                            | Q10             |
| **Counter mapping for IDs**          | URL shortener / interner                          | Q11, Q15-opt    |
| **Diff of frequency arrays**         | "What's left over"                                | Q13             |

---

## Common Interviewer Follow-Ups

1. *"Reduce the space."* — bucket sort vs heap; counter array vs Map; XOR vs hash.
2. *"What if values can be negative?"* — kills sliding window for sum problems → use prefix-sum hash.
3. *"Streaming input?"* — `Map` with eviction, reservoir sampling, hyperloglog.
4. *"What if memory is constrained?"* — Bloom filter + DB; LRU cache; partitioning.
5. *"Distributed version?"* — consistent hashing, range partitioning, replication.
6. *"What if the hash function is bad?"* — switch chaining → tree, or rehash with a different seed.
