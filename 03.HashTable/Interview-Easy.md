# HashTable — Easy Interview Questions

> **Audience**: Junior / phone screen / first technical round.
> **Goal**: Master the three foundational hash patterns — frequency map, complement-of-seen, two-way mapping.

---

## Q1. Two Sum

> Indices of two numbers that add to `target`. Exactly one solution.

#### Approach 1 — Brute Force

```js
function twoSum(nums, target) {
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length; j++)
      if (nums[i] + nums[j] === target) return [i, j];
}
```

- **Time**: O(n²) · **Space**: O(1)

#### Approach 2 — Hash Map (One Pass)

```js
function twoSum(nums, target) {
  const seen = new Map();         // value → index
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
}
```

- **Time**: O(n) · **Space**: O(n)
- **Pattern**: complement-of-seen — set value *after* checking so a number doesn't match itself.

---

## Q2. Valid Anagram

> Return `true` if `t` is an anagram of `s`.

**Example**: `"anagram", "nagaram"` → `true`; `"rat", "car"` → `false`.

#### Approach 1 — Sort Both

```js
const isAnagram = (s, t) =>
  s.length === t.length && [...s].sort().join('') === [...t].sort().join('');
```

- **Time**: O(n log n) · **Space**: O(n)

#### Approach 2 — Frequency Map

```js
function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const freq = new Map();
  for (const c of s) freq.set(c, (freq.get(c) ?? 0) + 1);
  for (const c of t) {
    const v = freq.get(c);
    if (!v) return false;
    if (v === 1) freq.delete(c); else freq.set(c, v - 1);
  }
  return true;
}
```

- **Time**: O(n) · **Space**: O(σ) where σ is alphabet size (≤ 26 for lowercase).

#### Approach 3 — Counter Array (Lowercase ASCII Only)

```js
function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const count = new Array(26).fill(0);
  for (let i = 0; i < s.length; i++) {
    count[s.charCodeAt(i) - 97]++;
    count[t.charCodeAt(i) - 97]--;
  }
  return count.every(c => c === 0);
}
```

- **Time**: O(n) · **Space**: O(1)
- **Tradeoff**: fastest, but assumes the alphabet — say so out loud in interviews.

**Follow-up**: Unicode strings? → use a Map; iterate via `for…of` (handles surrogate pairs).

---

## Q3. Contains Duplicate

> Return `true` if any value appears at least twice.

```js
const containsDuplicate = nums => new Set(nums).size !== nums.length;
```

- **Time**: O(n) · **Space**: O(n)

**Early-exit version** (better for "duplicate appears early" inputs):

```js
function containsDuplicate(nums) {
  const seen = new Set();
  for (const n of nums) {
    if (seen.has(n)) return true;
    seen.add(n);
  }
  return false;
}
```

---

## Q4. First Unique Character in a String

> Return the index of the first non-repeating character, or `-1`.

**Example**: `"leetcode"` → `0`; `"loveleetcode"` → `2`.

```js
function firstUniqChar(s) {
  const freq = new Map();
  for (const c of s) freq.set(c, (freq.get(c) ?? 0) + 1);
  for (let i = 0; i < s.length; i++) if (freq.get(s[i]) === 1) return i;
  return -1;
}
```

- **Time**: O(n) · **Space**: O(σ)
- **Pattern**: 2-pass frequency — pass 1 counts, pass 2 finds first with count 1.

---

## Q5. Intersection of Two Arrays

> Return unique values present in both arrays.

```js
function intersection(a, b) {
  const setA = new Set(a);
  const out = new Set();
  for (const x of b) if (setA.has(x)) out.add(x);
  return [...out];
}
```

- **Time**: O(m + n) · **Space**: O(min(m, n))

**Variant — Intersection II (with multiplicity)**:

```js
function intersect(a, b) {
  const freq = new Map();
  for (const x of a) freq.set(x, (freq.get(x) ?? 0) + 1);
  const out = [];
  for (const x of b) {
    const c = freq.get(x) ?? 0;
    if (c > 0) { out.push(x); freq.set(x, c - 1); }
  }
  return out;
}
```

**Follow-ups**:
- Sorted inputs? → two pointers, O(1) extra space.
- One huge, one tiny? → hash the smaller; iterate the larger.
- Disk-resident? → external sort + merge.

---

## Q6. Happy Number

> Replace `n` with the sum of squares of its digits, repeat. Return `true` if it ever reaches 1, `false` if it cycles.

**Example**: `19` → `82 → 68 → 100 → 1` ✓

```js
function isHappy(n) {
  const seen = new Set();
  while (n !== 1 && !seen.has(n)) {
    seen.add(n);
    let next = 0;
    while (n) { const d = n % 10; next += d * d; n = (n - d) / 10; }
    n = next;
  }
  return n === 1;
}
```

- **Time**: O(log n) per step (number of digits); total bounded by the cycle length.
- **Space**: O(log n)

**Follow-up — O(1) space**: Floyd's cycle detection on the "next number" function.

---

## Q7. Word Pattern

> `pattern = "abba"`, `s = "dog cat cat dog"` → `true`. Each char must map 1-to-1 with each word.

```js
function wordPattern(pattern, s) {
  const words = s.split(' ');
  if (words.length !== pattern.length) return false;
  const c2w = new Map(), w2c = new Map();
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i], w = words[i];
    if (c2w.has(c) && c2w.get(c) !== w) return false;
    if (w2c.has(w) && w2c.get(w) !== c) return false;
    c2w.set(c, w);
    w2c.set(w, c);
  }
  return true;
}
```

- **Time**: O(n) · **Space**: O(n)
- **Pattern**: bijective two-way map — *both* directions are needed.
- **Pitfall**: One map alone fails on `"abba", "dog dog dog dog"` — char `b` would silently overwrite if you only check char→word.

---

## Q8. Isomorphic Strings

> Two strings are isomorphic if characters in `s` can be replaced to get `t`, with a 1-to-1 mapping.

**Example**: `"egg", "add"` → `true`; `"foo", "bar"` → `false`.

```js
function isIsomorphic(s, t) {
  if (s.length !== t.length) return false;
  const sToT = new Map(), tToS = new Map();
  for (let i = 0; i < s.length; i++) {
    const a = s[i], b = t[i];
    if (sToT.has(a) && sToT.get(a) !== b) return false;
    if (tToS.has(b) && tToS.get(b) !== a) return false;
    sToT.set(a, b);
    tToS.set(b, a);
  }
  return true;
}
```

- Same pattern as Q7. Memorize: **bijective mapping → two maps**.

---

## Q9. Roman to Integer

```js
function romanToInt(s) {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    if (i + 1 < s.length && map[s[i]] < map[s[i + 1]]) n -= map[s[i]];
    else n += map[s[i]];
  }
  return n;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Trick**: when a smaller numeral precedes a larger one, subtract instead of add (`IV = 4`, `IX = 9`, `XL = 40`).

---

## Q10. Ransom Note

> Can `ransomNote` be constructed using letters from `magazine` (each letter usable once)?

```js
function canConstruct(ransomNote, magazine) {
  const freq = new Map();
  for (const c of magazine) freq.set(c, (freq.get(c) ?? 0) + 1);
  for (const c of ransomNote) {
    const v = freq.get(c);
    if (!v) return false;
    freq.set(c, v - 1);
  }
  return true;
}
```

- **Time**: O(m + n) · **Space**: O(σ)

---

## Q11. Majority Element

> Element appearing more than `n/2` times. Guaranteed to exist.

#### Approach 1 — Hash Map

```js
function majorityElement(nums) {
  const freq = new Map();
  for (const x of nums) {
    freq.set(x, (freq.get(x) ?? 0) + 1);
    if (freq.get(x) > nums.length / 2) return x;
  }
}
```

- **Time**: O(n) · **Space**: O(n)

#### Approach 2 — Boyer-Moore Voting (O(1) Space)

```js
function majorityElement(nums) {
  let count = 0, candidate = null;
  for (const x of nums) {
    if (count === 0) candidate = x;
    count += x === candidate ? 1 : -1;
  }
  return candidate;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Why it works**: any non-majority is "cancelled" by a majority element; what survives is the majority.

---

## Q12. Single Number

> Every element appears twice except one. Find it. **O(n) time, O(1) space.**

```js
const singleNumber = nums => nums.reduce((a, b) => a ^ b, 0);
```

**Hash-table version (for comparison)** — O(n) space:

```js
function singleNumberHash(nums) {
  const freq = new Map();
  for (const x of nums) freq.set(x, (freq.get(x) ?? 0) + 1);
  for (const [k, v] of freq) if (v === 1) return k;
}
```

**Why XOR wins**: same time, no auxiliary memory; but XOR doesn't generalize — Single Number II/III need bitwise tricks or hash maps.

---

## Q13. Find the Difference

> `t` is `s` shuffled with one extra letter added. Return the extra letter.

#### Approach 1 — Frequency Map

```js
function findTheDifference(s, t) {
  const freq = new Map();
  for (const c of s) freq.set(c, (freq.get(c) ?? 0) + 1);
  for (const c of t) {
    const v = freq.get(c) ?? 0;
    if (v === 0) return c;
    freq.set(c, v - 1);
  }
}
```

#### Approach 2 — XOR

```js
function findTheDifference(s, t) {
  let x = 0;
  for (const c of s) x ^= c.charCodeAt(0);
  for (const c of t) x ^= c.charCodeAt(0);
  return String.fromCharCode(x);
}
```

- Both **O(n)** time; XOR uses **O(1)** space.

---

## Q14. Find Common in Two Arrays

> Return `true` if any element appears in both arrays.

```js
function itemInCommon(a, b) {
  const set = new Set(a);
  return b.some(x => set.has(x));
}
```

- **Time**: O(m + n) · **Space**: O(m)
- **Hash beats nested loop** — `O(m + n)` vs `O(m·n)`.

---

## Q15. First Recurring Character

> Return the first element that appears more than once.

```js
function firstRecurring(arr) {
  const seen = new Set();
  for (const x of arr) {
    if (seen.has(x)) return x;
    seen.add(x);
  }
  return undefined;
}
```

- **Time**: O(n) · **Space**: O(n)
- **Pattern**: as-you-scan dedup. Simplest possible Set use case.

---

## Q16. Two Sum III — Data Structure Design

> Design a class that supports `add(num)` and `find(target)` (any pair sums to target).

```js
class TwoSum {
  constructor() { this.freq = new Map(); }
  add(n) { this.freq.set(n, (this.freq.get(n) ?? 0) + 1); }
  find(target) {
    for (const [k, c] of this.freq) {
      const need = target - k;
      if (need === k ? c >= 2 : this.freq.has(need)) return true;
    }
    return false;
  }
}
```

- **`add`**: O(1) · **`find`**: O(n)
- **Tradeoff version**: store all pair-sums on add (O(n²) total) for O(1) find — pick based on workload.

---

## Patterns Cheatsheet (Easy)

| Pattern                         | Trigger                                                   | Examples here              |
| ------------------------------- | --------------------------------------------------------- | -------------------------- |
| **Frequency map**               | Counting / comparing counts                               | Q2, Q4, Q10, Q11           |
| **Complement-of-seen**          | Pair sums to target                                       | Q1, Q16                    |
| **Set membership test**         | Have I seen this?                                         | Q3, Q5, Q6, Q14, Q15       |
| **Bijective two-way map**       | One-to-one mapping between two domains                    | Q7, Q8                     |
| **Lookup table**                | Static data → constant translation                        | Q9                         |
| **XOR (special case)**          | Cancel out duplicates with O(1) space                     | Q12, Q13                   |

---

## Common Interviewer Follow-Ups

1. *"Can you do it without extra space?"* — sometimes XOR or sorting (in-place) replaces hashing.
2. *"What if there are Unicode characters?"* — `Array(26)` won't work; use `Map` and iterate with `for…of` (not `for(i)`).
3. *"What if the input is a stream?"* — `Map` works; `Array(26)` works; sorting doesn't.
4. *"What if `t` can have any length?"* — the bijective patterns need length checks first.
5. *"What if values can be `null`/`undefined`/`NaN`?"* — `Map` handles them; `Object` keys coerce.
