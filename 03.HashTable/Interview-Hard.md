# HashTable — Hard Interview Questions

> **Audience**: Senior / FAANG on-site final rounds.
> **Goal**: Hash combined with sliding windows, multi-list coordination, parsing, and design problems.

---

## Q1. Substring with Concatenation of All Words

> Given `s` and `words` (all same length), find all start indices in `s` where the concatenation of every word in `words` (in any order) appears.

**Example**: `s="barfoothefoobarman", words=["foo","bar"]` → `[0, 9]`

```js
function findSubstring(s, words) {
  if (!words.length) return [];
  const wordLen = words[0].length;
  const totalWords = words.length;
  const need = new Map();
  for (const w of words) need.set(w, (need.get(w) ?? 0) + 1);

  const out = [];
  for (let offset = 0; offset < wordLen; offset++) {
    let l = offset, count = 0;
    const have = new Map();
    for (let r = offset; r + wordLen <= s.length; r += wordLen) {
      const word = s.substr(r, wordLen);
      if (!need.has(word)) {
        have.clear();
        count = 0;
        l = r + wordLen;
        continue;
      }
      have.set(word, (have.get(word) ?? 0) + 1);
      count++;
      while (have.get(word) > need.get(word)) {
        const lw = s.substr(l, wordLen);
        have.set(lw, have.get(lw) - 1);
        count--;
        l += wordLen;
      }
      if (count === totalWords) out.push(l);
    }
  }
  return out;
}
```

- **Time**: O(n · wordLen) · **Space**: O(words · wordLen)
- **Trick**: only `wordLen` distinct sliding windows exist (modulo `wordLen`); run sliding-window inside each.

---

## Q2. Longest Substring with At Most K Distinct Characters

> Length of the longest substring containing at most `k` distinct characters.

**Example**: `s="eceba", k=2` → `3` (`"ece"`).

```js
function lengthOfLongestSubstringKDistinct(s, k) {
  if (k === 0) return 0;
  const freq = new Map();
  let l = 0, best = 0;
  for (let r = 0; r < s.length; r++) {
    freq.set(s[r], (freq.get(s[r]) ?? 0) + 1);
    while (freq.size > k) {
      const c = s[l++];
      freq.set(c, freq.get(c) - 1);
      if (freq.get(c) === 0) freq.delete(c);
    }
    best = Math.max(best, r - l + 1);
  }
  return best;
}
```

- **Time**: O(n) · **Space**: O(k)
- **Pattern**: shrinking sliding window keyed by `freq.size`. Generalizes to "at most K of anything".

**Variants**:
- At most **2** distinct → set `k = 2`. (LeetCode 159 — "Fruits in Baskets")
- **Exactly** k distinct → `atMost(k) - atMost(k - 1)` (classic decomposition).

---

## Q3. Insert Delete GetRandom O(1) — Duplicates Allowed

> RandomizedCollection that handles duplicates (`getRandom` proportional to frequency).

```js
class RandomizedCollection {
  constructor() {
    this.arr = [];
    this.idx = new Map();              // val → Set<position in arr>
  }
  insert(val) {
    if (!this.idx.has(val)) this.idx.set(val, new Set());
    this.idx.get(val).add(this.arr.length);
    this.arr.push(val);
    return this.idx.get(val).size === 1;
  }
  remove(val) {
    if (!this.idx.has(val) || this.idx.get(val).size === 0) return false;
    const i = this.idx.get(val).values().next().value;
    this.idx.get(val).delete(i);
    const last = this.arr.length - 1;
    if (i !== last) {
      const lastVal = this.arr[last];
      this.arr[i] = lastVal;
      this.idx.get(lastVal).delete(last);
      this.idx.get(lastVal).add(i);
    }
    this.arr.pop();
    if (this.idx.get(val).size === 0) this.idx.delete(val);
    return true;
  }
  getRandom() {
    return this.arr[Math.floor(Math.random() * this.arr.length)];
  }
}
```

- **Time**: O(1) per op · **Space**: O(n)
- **Why a Set per value**: a value can be at multiple positions; we need O(1) "any one of them" and O(1) "delete this position".
- **Pitfall**: when removing, if `i === last`, **don't** swap-and-update — you'd put the wrong index back into `idx`.

---

## Q4. Smallest Range Covering Elements from K Sorted Lists

> Find the smallest `[a, b]` containing at least one number from each of the `k` sorted lists.

**Example**: `[[4,10,15,24,26],[0,9,12,20],[5,18,22,30]]` → `[20, 24]`

#### Approach — Merge + Sliding Window with "All K Covered" Counter

```js
function smallestRange(nums) {
  const all = [];
  for (let i = 0; i < nums.length; i++) for (const v of nums[i]) all.push([v, i]);
  all.sort((a, b) => a[0] - b[0]);

  const k = nums.length;
  const counts = new Array(k).fill(0);
  let covered = 0, l = 0;
  let bestL = all[0][0], bestR = all[all.length - 1][0];
  for (let r = 0; r < all.length; r++) {
    if (counts[all[r][1]]++ === 0) covered++;
    while (covered === k) {
      if (all[r][0] - all[l][0] < bestR - bestL) {
        bestL = all[l][0]; bestR = all[r][0];
      }
      if (--counts[all[l][1]] === 0) covered--;
      l++;
    }
  }
  return [bestL, bestR];
}
```

- **Time**: O(N log N) (sort dominates) · **Space**: O(N) (N = total elements)
- **Pattern**: same "shrinking window when all groups covered" template as Minimum Window Substring.

**Heap alternative**: Min-heap of one element per list, track current window max; pop the min, advance the source list. Same O(N log K) bound.

---

## Q5. Design Twitter

> `postTweet`, `getNewsFeed` (10 most recent from self + follows), `follow`, `unfollow`.

```js
class Twitter {
  constructor() {
    this.tick = 0;
    this.tweets = new Map();        // userId → [[time, tweetId], …]
    this.follows = new Map();       // userId → Set of followee ids
  }
  postTweet(userId, tweetId) {
    if (!this.tweets.has(userId)) this.tweets.set(userId, []);
    this.tweets.get(userId).push([this.tick++, tweetId]);
  }
  follow(a, b) {
    if (!this.follows.has(a)) this.follows.set(a, new Set());
    this.follows.get(a).add(b);
  }
  unfollow(a, b) { this.follows.get(a)?.delete(b); }
  getNewsFeed(userId) {
    const ids = new Set([userId]);
    if (this.follows.has(userId)) for (const f of this.follows.get(userId)) ids.add(f);
    const candidates = [];
    for (const id of ids) {
      const ts = this.tweets.get(id);
      if (!ts) continue;
      for (let i = ts.length - 1, c = 0; i >= 0 && c < 10; i--, c++) candidates.push(ts[i]);
    }
    candidates.sort((a, b) => b[0] - a[0]);
    return candidates.slice(0, 10).map(t => t[1]);
  }
}
```

- **Time**: `postTweet`/`follow`/`unfollow` O(1); `getNewsFeed` O(F · 10 + result-sort) ≈ O(F · 10 · log).
- **Optimization**: replace `sort` with a min-heap of size 10 → O(F · log 10) = O(F).
- **Follow-up**: at scale, **fan-out on write** (push tweets to followers' inboxes) vs **fan-out on read** (pull at read time). Real Twitter uses a hybrid based on follower count.

---

## Q6. Time-Based Key-Value Store

> `set(key, value, ts)`, `get(key, ts)` returns the value at largest stored ts ≤ given.

```js
class TimeMap {
  constructor() { this.map = new Map(); }
  set(key, value, ts) {
    if (!this.map.has(key)) this.map.set(key, []);
    this.map.get(key).push([ts, value]);
  }
  get(key, ts) {
    const arr = this.map.get(key);
    if (!arr) return '';
    let l = 0, r = arr.length - 1, ans = '';
    while (l <= r) {
      const m = (l + r) >> 1;
      if (arr[m][0] <= ts) { ans = arr[m][1]; l = m + 1; }
      else r = m - 1;
    }
    return ans;
  }
}
```

- **Time**: `set` O(1) (amortized), `get` O(log n)
- **Why binary search inside the per-key array**: the spec says timestamps for each key are strictly increasing → array is sorted → binary search.

---

## Q7. Number of Atoms

> Parse a chemical formula like `"K4(ON(SO3)2)2"` and return the canonical count: `"K4N2O14S4"`.

```js
function countOfAtoms(formula) {
  const stack = [new Map()];
  let i = 0;
  while (i < formula.length) {
    if (formula[i] === '(') { stack.push(new Map()); i++; continue; }
    if (formula[i] === ')') {
      i++;
      let mult = 0;
      while (i < formula.length && formula[i] >= '0' && formula[i] <= '9') {
        mult = mult * 10 + +formula[i]; i++;
      }
      mult = mult || 1;
      const top = stack.pop();
      const cur = stack[stack.length - 1];
      for (const [el, n] of top) cur.set(el, (cur.get(el) ?? 0) + n * mult);
      continue;
    }
    let el = formula[i++];
    while (i < formula.length && formula[i] >= 'a' && formula[i] <= 'z') el += formula[i++];
    let n = 0;
    while (i < formula.length && formula[i] >= '0' && formula[i] <= '9') {
      n = n * 10 + +formula[i]; i++;
    }
    n = n || 1;
    const cur = stack[stack.length - 1];
    cur.set(el, (cur.get(el) ?? 0) + n);
  }
  return [...stack[0].entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([el, n]) => el + (n > 1 ? n : ''))
    .join('');
}
```

- **Time**: O(n²) worst (multiplier propagation across nested groups) · **Space**: O(n)
- **Pattern**: stack-of-maps for nested-scope parsing. Same shape as nested expression evaluation.

---

## Q8. Word Pattern II (Backtracking)

> Like Word Pattern, but **no spaces** in `s`. Decide if some word-segmentation makes `pattern` and `s` map bijectively.

**Example**: `pattern="abab", s="redblueredblue"` → `true` (a=red, b=blue).

```js
function wordPatternMatch(pattern, s) {
  const c2w = new Map(), used = new Set();
  function dfs(pi, si) {
    if (pi === pattern.length && si === s.length) return true;
    if (pi === pattern.length || si === s.length) return false;
    const c = pattern[pi];
    if (c2w.has(c)) {
      const w = c2w.get(c);
      if (!s.startsWith(w, si)) return false;
      return dfs(pi + 1, si + w.length);
    }
    for (let len = 1; si + len <= s.length; len++) {
      const w = s.substr(si, len);
      if (used.has(w)) continue;            // bijective: each word used by exactly one char
      c2w.set(c, w); used.add(w);
      if (dfs(pi + 1, si + len)) return true;
      c2w.delete(c); used.delete(w);
    }
    return false;
  }
  return dfs(0, 0);
}
```

- **Time**: exponential worst case — pruning by `c2w` and `used` keeps real-world cases fast.
- **Pattern**: backtracking + two-direction map (the **bijection** invariant from Easy Q7/Q8 elevated).

---

## Q9. Find All Distinct Substrings (Rolling Hash)

> Number of distinct substrings of length `L` in `s`. Naive O(n · L) is fine for small L; for large `s`, use **rolling hash**.

```js
function distinctSubstrings(s, L) {
  if (s.length < L) return 0;
  const MOD = 2n ** 61n - 1n;       // Mersenne prime
  const BASE = 131n;
  // base^L mod
  let basePow = 1n;
  for (let i = 0; i < L; i++) basePow = (basePow * BASE) % MOD;
  let h = 0n;
  for (let i = 0; i < L; i++) h = (h * BASE + BigInt(s.charCodeAt(i))) % MOD;
  const seen = new Set();
  seen.add(h);
  for (let i = L; i < s.length; i++) {
    h = (h * BASE + BigInt(s.charCodeAt(i)) - BigInt(s.charCodeAt(i - L)) * basePow) % MOD;
    if (h < 0n) h += MOD;
    seen.add(h);
  }
  return seen.size;
}
```

- **Time**: O(n) · **Space**: O(n)
- **Pattern**: **Rabin–Karp rolling hash**. O(1) hash update per slide. Mersenne-prime moduli (`2⁶¹ − 1`) reduce collision probability dramatically.

---

## Q10. Implement Trie via HashMap

> A trie can be built without a fixed-size children array — use a Map per node. Cleaner for Unicode and sparse alphabets.

```js
class Trie {
  constructor() { this.root = new Map(); this.root.end = false; }
  insert(word) {
    let node = this.root;
    for (const c of word) {
      if (!node.has(c)) {
        const child = new Map(); child.end = false;
        node.set(c, child);
      }
      node = node.get(c);
    }
    node.end = true;
  }
  search(word) {
    let node = this.root;
    for (const c of word) {
      if (!node.has(c)) return false;
      node = node.get(c);
    }
    return node.end;
  }
  startsWith(prefix) {
    let node = this.root;
    for (const c of prefix) {
      if (!node.has(c)) return false;
      node = node.get(c);
    }
    return true;
  }
}
```

- **Time**: O(L) per op (L = word length) · **Space**: O(total chars across all words)
- **Tradeoff vs `children: Array(26)`**: Map version handles arbitrary alphabets; array version is faster for known small alphabets due to cache locality.

---

## Patterns Cheatsheet (Hard)

| Pattern                                       | Trigger                                                            |
| --------------------------------------------- | ------------------------------------------------------------------ |
| **Word-grid sliding window**                  | Concatenation problems with fixed-length tokens                    |
| **Sliding window keyed by `freq.size`**       | "At most K distinct" / "exactly K distinct"                        |
| **Hash map of (val → Set of indices)**        | O(1) ops on a multiset                                             |
| **Merge + sliding window with covered count** | "Smallest window covering all groups"                              |
| **Stack-of-maps**                             | Nested-scope parsing (formulas, expressions)                       |
| **Map of arrays + binary search per key**     | Versioned key-value stores                                         |
| **Rolling hash + Set**                        | Distinct-substring counting in O(n)                                |
| **Backtracking + bijective map**              | Pattern-matching with unknown word boundaries                      |

---

## Senior Communication Tips

1. **State the hash-key choice first.** "I'll group by sorted-string." or "I'll hash the prefix sum mod k." Half the difficulty is the key.
2. **Discuss collision probability.** For rolling hash: "Single Mersenne mod gives ~10⁻¹⁸ collision per pair; for strict guarantees, double-hash."
3. **Justify the load-factor / resize policy.** "Resize at 0.75 keeps probe length ≤ 1.5 expected."
4. **Recognize the equivalent class.** Group anagrams, find duplicate subtrees, distinct substrings — all are "canonicalize then hash".
5. **For hot data structures** (LRU/LFU/Twitter feeds): note **fan-out on write** vs **fan-out on read** trade-offs.
6. **Edge cases for caches & multisets**: empty, capacity 0, repeated insert of same value, remove what's not there.
