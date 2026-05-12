# Array — Easy Interview Questions

> **Audience**: Junior / fresher / phone-screen rounds.
> **Goal**: Demonstrate solid fundamentals (loops, two pointers, hashing, basic complexity).
> Each question shows multiple approaches with tradeoffs — think out loud during interviews.

---

## Conceptual Warm-Ups

### Q1. What is the time complexity of basic array operations in JavaScript?

| Operation             | Complexity       | Notes                                                                |
| --------------------- | ---------------- | -------------------------------------------------------------------- |
| Access by index       | **O(1)**         | Arrays are contiguous (V8 uses packed/holey representations)         |
| Search (unsorted)     | **O(n)**         | `indexOf`, `includes`, linear scan                                   |
| Search (sorted)       | **O(log n)**     | Binary search — array must be sorted                                 |
| `push` / `pop`        | **O(1)** amortized | Tail mutation; capacity may double internally                      |
| `shift` / `unshift`   | **O(n)**         | All other elements shift by 1                                        |
| `splice`              | **O(n)**         | Worst case shifts every element                                      |
| `concat` / `slice`    | **O(n)**         | Copies                                                               |
| `sort`                | **O(n log n)**   | TimSort/PowerSort in V8                                              |

**Follow-up**: *"Why is `unshift` O(n)?"* — every existing element must move one slot right to make room at index 0.

---

### Q2. Difference between `Array(5)` and `Array.from({length: 5})`?

```js
Array(5);                  // [ <5 empty items> ] — sparse, holes
Array.from({length: 5});   // [undefined, undefined, undefined, undefined, undefined] — dense
```

- `Array(5)` creates a **sparse** array. `map`, `filter`, `forEach` skip holes.
- `Array.from({length: 5})` creates a **dense** array — methods iterate over every index.
- For initialization, prefer: `Array.from({length: n}, (_, i) => i)` or `Array(n).fill(0)`.

---

### Q3. Difference between shallow copy and deep copy?

```js
const arr = [1, [2, 3]];

const shallow = [...arr];               // arr[1] === shallow[1] (same ref)
const deep    = structuredClone(arr);   // fully independent
```

- **Shallow**: `slice()`, spread `[...arr]`, `Array.from(arr)`, `concat()`.
- **Deep**: `structuredClone(arr)` (modern), or `JSON.parse(JSON.stringify(arr))` (loses functions, dates, undefined).

---

## Coding Questions

---

### Q4. Two Sum

> Given an array `nums` and a target `t`, return indices of two numbers that add to `t`. Exactly one solution; no element used twice.

**Example**: `nums = [2, 7, 11, 15], t = 9` → `[0, 1]`

#### Approach 1 — Brute Force (Nested Loop)

```js
function twoSum(nums, t) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === t) return [i, j];
    }
  }
  return [];
}
```

- **Time**: O(n²) · **Space**: O(1)
- **Tradeoff**: No extra memory, but quadratic — fails on large inputs.

#### Approach 2 — Hash Map (One Pass)

```js
function twoSum(nums, t) {
  const seen = new Map();        // value -> index
  for (let i = 0; i < nums.length; i++) {
    const need = t - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}
```

- **Time**: O(n) · **Space**: O(n)
- **Tradeoff**: Trades memory for speed. Industry-standard answer.

**Follow-ups**:
- Multiple pairs that sum to target? → don't return early; collect.
- Sorted input? → use two pointers, O(1) extra space.
- Find triplets? → see 3Sum (Medium).

**Pitfalls**:
- Adding `nums[i]` to map *before* the lookup → can match itself (`[3,3], t=6` would return `[0,0]`).

---

### Q5. Best Time to Buy and Sell Stock

> Return max profit from one buy + one sell. Must buy before sell.

**Example**: `[7,1,5,3,6,4]` → `5` (buy at 1, sell at 6)

#### Approach 1 — Brute Force

```js
function maxProfit(prices) {
  let best = 0;
  for (let i = 0; i < prices.length; i++)
    for (let j = i + 1; j < prices.length; j++)
      best = Math.max(best, prices[j] - prices[i]);
  return best;
}
```

- **Time**: O(n²) · **Space**: O(1)

#### Approach 2 — Single Pass (Track Min)

```js
function maxProfit(prices) {
  let min = Infinity, best = 0;
  for (const p of prices) {
    min  = Math.min(min, p);
    best = Math.max(best, p - min);
  }
  return best;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Intuition**: At each day, the best sell-today profit = today − cheapest day so far.

**Follow-ups**:
- Multiple transactions allowed? → sum every positive `prices[i+1] - prices[i]`.
- At most 2 transactions? → DP (state machine).
- Cooldown after selling? → DP with 3 states.

---

### Q6. Contains Duplicate

> Return `true` if any value appears at least twice.

#### Approaches

| # | Method                  | Time          | Space  | Notes                              |
| - | ----------------------- | ------------- | ------ | ---------------------------------- |
| 1 | Brute force nested loop | O(n²)         | O(1)   | Slow                               |
| 2 | Sort + adjacent compare | O(n log n)    | O(1)*  | Mutates input (or O(n) for copy)   |
| 3 | `Set` size check        | O(n)          | O(n)   | One-liner, idiomatic               |

```js
const containsDuplicate = nums => new Set(nums).size !== nums.length;
```

**Early-exit version** (better for huge arrays where dup is early):

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

### Q7. Maximum Subarray (Kadane's Algorithm)

> Find the contiguous subarray with the largest sum.

**Example**: `[-2,1,-3,4,-1,2,1,-5,4]` → `6` (`[4,-1,2,1]`)

#### Approach 1 — Brute Force

```js
function maxSub(nums) {
  let best = -Infinity;
  for (let i = 0; i < nums.length; i++) {
    let sum = 0;
    for (let j = i; j < nums.length; j++) {
      sum += nums[j];
      best = Math.max(best, sum);
    }
  }
  return best;
}
```

- **Time**: O(n²) · **Space**: O(1)

#### Approach 2 — Kadane (DP, O(n))

```js
function maxSub(nums) {
  let cur = nums[0], best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    cur  = Math.max(nums[i], cur + nums[i]);  // extend or restart
    best = Math.max(best, cur);
  }
  return best;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Intuition**: At each i, decide — extend the running subarray, or start fresh from nums[i].

#### Approach 3 — Divide & Conquer

- Recursively find max in left half, right half, and crossing the midpoint.
- **Time**: O(n log n) · **Space**: O(log n) stack
- **Tradeoff**: Worse than Kadane but useful when you can't see the whole array (segment trees).

**Follow-ups**:
- Return the subarray itself, not just sum → track start/end indices.
- Circular array? → answer = max(Kadane, totalSum − minKadane).

---

### Q8. Move Zeroes

> Move all zeroes to the end, in-place, preserving order of non-zeroes.

**Example**: `[0,1,0,3,12]` → `[1,3,12,0,0]`

#### Approach 1 — Two Pass

```js
function moveZeroes(nums) {
  let w = 0;
  for (const n of nums) if (n !== 0) nums[w++] = n;  // pass 1: pack
  while (w < nums.length) nums[w++] = 0;             // pass 2: zero-fill
}
```

#### Approach 2 — Two Pointers (Single Swap Pass)

```js
function moveZeroes(nums) {
  let w = 0;
  for (let r = 0; r < nums.length; r++) {
    if (nums[r] !== 0) [nums[w], nums[r]] = [nums[r], nums[w]], w++;
  }
}
```

- Both **O(n) time / O(1) space**. Approach 2 minimizes writes when zeroes are sparse.

---

### Q9. Remove Duplicates from Sorted Array

> In-place, return new length k. First k elements must be the unique ones in original order.

```js
function removeDuplicates(nums) {
  if (!nums.length) return 0;
  let k = 1;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] !== nums[i - 1]) nums[k++] = nums[i];
  }
  return k;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Why two pointers work**: sorted → duplicates are adjacent.

**Follow-up**: Allow up to 2 duplicates → compare against `nums[k - 2]`.

---

### Q10. Plus One

> Increment a non-negative integer represented as a digit array.

**Example**: `[1,2,3]` → `[1,2,4]`; `[9,9]` → `[1,0,0]`

```js
function plusOne(digits) {
  for (let i = digits.length - 1; i >= 0; i--) {
    if (digits[i] < 9) { digits[i]++; return digits; }
    digits[i] = 0;
  }
  return [1, ...digits];   // all 9s case
}
```

- **Time**: O(n) · **Space**: O(1) (or O(n) for the all-9s case)
- **Pitfall**: Don't convert to a number — overflow for large arrays.

---

### Q11. Single Number

> Every element appears twice except one. Find it. **O(n) time, O(1) space.**

```js
const singleNumber = nums => nums.reduce((a, b) => a ^ b, 0);
```

- **Why XOR**: `x ^ x = 0`, `x ^ 0 = x`, XOR is commutative — duplicates cancel.

**Follow-ups**:
- Every element appears 3× except one → bitwise count mod 3 per bit.
- Two unique numbers, rest in pairs → XOR all → split by a set bit.

---

### Q12. Merge Sorted Array (in-place into nums1)

> `nums1` has size `m + n` with trailing zeros to hold `nums2`.

```js
function merge(nums1, m, nums2, n) {
  let i = m - 1, j = n - 1, k = m + n - 1;
  while (j >= 0) {
    nums1[k--] = (i >= 0 && nums1[i] > nums2[j]) ? nums1[i--] : nums2[j--];
  }
}
```

- **Trick**: Fill from the **back** so we never overwrite unread data.
- **Time**: O(m + n) · **Space**: O(1).

---

### Q13. Reverse an Array (in-place)

```js
function reverse(arr) {
  for (let l = 0, r = arr.length - 1; l < r; l++, r--) {
    [arr[l], arr[r]] = [arr[r], arr[l]];
  }
}
```

- **Time**: O(n) · **Space**: O(1)
- **Don't say** `arr.reverse()` first — interviewer wants the algorithm.

---

### Q14. Find Pivot Index

> Index where sum of left side == sum of right side.

```js
function pivotIndex(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  let left = 0;
  for (let i = 0; i < nums.length; i++) {
    if (left === total - left - nums[i]) return i;
    left += nums[i];
  }
  return -1;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Pattern**: prefix sum without an extra array.

---

### Q15. Running Sum / Prefix Sum

```js
function runningSum(nums) {
  for (let i = 1; i < nums.length; i++) nums[i] += nums[i - 1];
  return nums;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Why important**: building block for range-sum and subarray-sum problems (Medium/Hard).

---

## Quick Pattern Cheatsheet

| Pattern               | When to use                                        | Example here       |
| --------------------- | -------------------------------------------------- | ------------------ |
| Hash map              | Need fast lookup of "have I seen X?"               | Two Sum, Duplicate |
| Two pointers          | Sorted array, in-place rearrange, pair sums        | Move Zeroes, Merge |
| Single pass + track   | Min/max while scanning                             | Stock, Kadane      |
| Prefix sum            | Range / subarray sum queries                       | Pivot, Running Sum |
| Bitwise XOR           | Pair cancellation                                  | Single Number      |
| Iterate from the back | Avoid overwriting unread data when filling in-place| Merge Sorted       |

---

## Common Interviewer Follow-Ups (Memorize These)

1. *"Can you reduce the space complexity?"* — usually swap hash-map for two pointers (sorted) or bitwise.
2. *"What if input is sorted?"* — almost always unlocks two-pointer or binary-search solutions.
3. *"What if input is a stream?"* — need single pass; can't index back.
4. *"What if n is huge and doesn't fit in memory?"* — chunked processing, external sort, sampling.
5. *"What if there are duplicates?"* — clarify behavior; deduplicate or count occurrences.
6. *"Can you do it in-place?"* — usually means O(1) extra space.
