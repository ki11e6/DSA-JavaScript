# Array — Medium Interview Questions

> **Audience**: Mid-level / on-site rounds at product companies and FAANG.
> **Goal**: Combine multiple techniques (two pointers + sort, prefix sum + hash, binary search on monotonic property).
> Each question shows multiple approaches with tradeoffs.

---

## Q1. 3Sum

> Return all **unique triplets** `[a, b, c]` where `a + b + c = 0`.

**Example**: `[-1,0,1,2,-1,-4]` → `[[-1,-1,2], [-1,0,1]]`

#### Approach 1 — Brute Force

- Three nested loops, dedupe via stringified key in a `Set`.
- **Time**: O(n³) · **Space**: O(n) for dedupe set.

#### Approach 2 — Hash Set per Pair

- Outer loop fixes `a`, inner uses a set to find pair summing to `-a`.
- **Time**: O(n²) · **Space**: O(n) — but dedupe is fiddly.

#### Approach 3 — Sort + Two Pointers (Standard)

```js
function threeSum(nums) {
  nums.sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;     // skip dup `a`
    let l = i + 1, r = nums.length - 1;
    while (l < r) {
      const s = nums[i] + nums[l] + nums[r];
      if (s === 0) {
        out.push([nums[i], nums[l], nums[r]]);
        while (l < r && nums[l] === nums[l + 1]) l++;   // skip dup `b`
        while (l < r && nums[r] === nums[r - 1]) r--;   // skip dup `c`
        l++; r--;
      } else if (s < 0) l++;
      else r--;
    }
  }
  return out;
}
```

- **Time**: O(n²) · **Space**: O(1) extra (output not counted)
- **Tradeoff**: Sort cost dominated by O(n²) — net win. Cleanest dedupe.

**Follow-ups**:
- 3Sum Closest → track minimum `|s - target|`.
- 4Sum → outer loop fixes two values, then 2-pointer (O(n³)).
- kSum generic → recursive reduction.

---

## Q2. Container With Most Water

> Given heights, max area `min(h[i], h[j]) * (j - i)`.

**Example**: `[1,8,6,2,5,4,8,3,7]` → `49`

#### Approach 1 — Brute Force

- O(n²) over all pairs.

#### Approach 2 — Two Pointers (Greedy)

```js
function maxArea(h) {
  let l = 0, r = h.length - 1, best = 0;
  while (l < r) {
    best = Math.max(best, Math.min(h[l], h[r]) * (r - l));
    h[l] < h[r] ? l++ : r--;        // move the shorter wall
  }
  return best;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Why move the shorter wall**: width shrinks by 1 either way; only the shorter side could possibly grow the area.

**Pitfall**: Often confused with **Trapping Rain Water** (Hard) — different problem.

---

## Q3. Product of Array Except Self

> `output[i]` = product of all `nums[j]` where `j != i`. **Without division, in O(n).**

**Example**: `[1,2,3,4]` → `[24,12,8,6]`

#### Approach 1 — Two Arrays (Prefix + Suffix)

```js
function productExceptSelf(nums) {
  const n = nums.length, L = Array(n), R = Array(n), out = Array(n);
  L[0] = 1;
  for (let i = 1; i < n; i++) L[i] = L[i - 1] * nums[i - 1];
  R[n - 1] = 1;
  for (let i = n - 2; i >= 0; i--) R[i] = R[i + 1] * nums[i + 1];
  for (let i = 0; i < n; i++) out[i] = L[i] * R[i];
  return out;
}
```

- **Time**: O(n) · **Space**: O(n)

#### Approach 2 — O(1) Extra Space (Output Array Doesn't Count)

```js
function productExceptSelf(nums) {
  const n = nums.length, out = Array(n).fill(1);
  for (let i = 1; i < n; i++) out[i] = out[i - 1] * nums[i - 1];   // prefix
  let R = 1;
  for (let i = n - 1; i >= 0; i--) {
    out[i] *= R;
    R *= nums[i];
  }
  return out;
}
```

- **Time**: O(n) · **Space**: O(1) extra
- **Pitfall**: Why no division? → fails on zeros and is "cheating" per the prompt.

---

## Q4. Rotate Array (by k)

> Rotate right by `k` steps in-place.

**Example**: `[1,2,3,4,5,6,7], k=3` → `[5,6,7,1,2,3,4]`

#### Approach 1 — Extra Array

```js
function rotate(nums, k) {
  const n = nums.length;
  k %= n;
  const out = Array(n);
  for (let i = 0; i < n; i++) out[(i + k) % n] = nums[i];
  for (let i = 0; i < n; i++) nums[i] = out[i];
}
```

- **Time**: O(n) · **Space**: O(n)

#### Approach 2 — Reverse Trick (In-Place, Standard)

```js
function rotate(nums, k) {
  const n = nums.length;
  k %= n;
  reverse(nums, 0, n - 1);
  reverse(nums, 0, k - 1);
  reverse(nums, k, n - 1);
}
function reverse(a, i, j) {
  while (i < j) [a[i], a[j]] = [a[j], a[i]], i++, j--;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Intuition**: Reverse all → reverse first k → reverse rest. Three reversals = rotation.

#### Approach 3 — Cyclic Replacement

- Walk the array following `(i + k) % n` cycles. O(n) time, O(1) space, but tricky to handle multi-cycles when `gcd(n, k) > 1`.

---

## Q5. Find Min in Rotated Sorted Array

> Sorted array rotated unknown number of times. No duplicates.

**Example**: `[4,5,6,7,0,1,2]` → `0`

```js
function findMin(nums) {
  let l = 0, r = nums.length - 1;
  while (l < r) {
    const m = (l + r) >> 1;
    if (nums[m] > nums[r]) l = m + 1;   // min is in right half
    else r = m;                          // min is at m or left of m
  }
  return nums[l];
}
```

- **Time**: O(log n) · **Space**: O(1)
- **Trick**: Compare to `nums[r]`, not `nums[l]` — handles non-rotated arrays correctly.

**Follow-up — with duplicates** (Hard): when `nums[m] === nums[r]`, can't decide → `r--`. Worst case O(n).

---

## Q6. Search in Rotated Sorted Array

> Find target in rotated sorted array. Return index or -1. O(log n).

```js
function search(nums, target) {
  let l = 0, r = nums.length - 1;
  while (l <= r) {
    const m = (l + r) >> 1;
    if (nums[m] === target) return m;
    if (nums[l] <= nums[m]) {              // left half sorted
      if (target >= nums[l] && target < nums[m]) r = m - 1;
      else l = m + 1;
    } else {                                // right half sorted
      if (target > nums[m] && target <= nums[r]) l = m + 1;
      else r = m - 1;
    }
  }
  return -1;
}
```

- **Time**: O(log n) · **Space**: O(1)
- **Key insight**: At any midpoint, **at least one** half is sorted. Decide which, then check if target lies inside it.

---

## Q7. Subarray Sum Equals K

> Count contiguous subarrays whose sum equals k. Negatives allowed.

**Example**: `nums=[1,1,1], k=2` → `2`

#### Approach 1 — Brute Force

- O(n²) over all (i, j) pairs.

#### Approach 2 — Prefix Sum + Hash Map

```js
function subarraySum(nums, k) {
  const counts = new Map([[0, 1]]);     // empty prefix has sum 0, count 1
  let sum = 0, total = 0;
  for (const n of nums) {
    sum += n;
    if (counts.has(sum - k)) total += counts.get(sum - k);
    counts.set(sum, (counts.get(sum) ?? 0) + 1);
  }
  return total;
}
```

- **Time**: O(n) · **Space**: O(n)
- **Why sliding window doesn't work**: negatives can shrink prefix unpredictably.

**Pitfall**: Forgetting the `(0, 1)` seed entry → misses subarrays starting at index 0.

---

## Q8. Longest Consecutive Sequence

> Length of the longest run of consecutive integers (any order, with possible duplicates).

**Example**: `[100,4,200,1,3,2]` → `4` (`1,2,3,4`)

#### Approach 1 — Sort

- O(n log n), then linear scan.

#### Approach 2 — Hash Set, Smart Start (O(n))

```js
function longestConsecutive(nums) {
  const set = new Set(nums);
  let best = 0;
  for (const n of set) {
    if (set.has(n - 1)) continue;        // only start from a sequence start
    let cur = n, len = 1;
    while (set.has(cur + 1)) cur++, len++;
    best = Math.max(best, len);
  }
  return best;
}
```

- **Time**: O(n) — inner `while` is amortized; each element belongs to one chain.
- **Pitfall**: Without the `set.has(n - 1)` guard, you start mid-chain and inner loop runs more than once per element → O(n²) worst case.

---

## Q9. Sort Colors (Dutch National Flag)

> Sort an array of 0s, 1s, 2s in-place. **One pass.**

```js
function sortColors(nums) {
  let l = 0, m = 0, r = nums.length - 1;
  while (m <= r) {
    if (nums[m] === 0)      [nums[l], nums[m]] = [nums[m], nums[l]], l++, m++;
    else if (nums[m] === 2) [nums[m], nums[r]] = [nums[r], nums[m]], r--;
    else                    m++;
  }
}
```

- **Time**: O(n) · **Space**: O(1)
- **Don't increment `m` on the 2-swap** — value swapped in is unprocessed.

---

## Q10. Spiral Matrix

> Return matrix elements in spiral order.

```js
function spiralOrder(M) {
  const out = [];
  let top = 0, bot = M.length - 1, left = 0, right = M[0].length - 1;
  while (top <= bot && left <= right) {
    for (let c = left; c <= right; c++) out.push(M[top][c]);   top++;
    for (let r = top;  r <= bot;   r++) out.push(M[r][right]); right--;
    if (top <= bot)    { for (let c = right; c >= left; c--) out.push(M[bot][c]); bot--; }
    if (left <= right) { for (let r = bot;   r >= top;  r--) out.push(M[r][left]); left++; }
  }
  return out;
}
```

- **Time**: O(m·n) · **Space**: O(1) extra
- **Pitfalls**: Forget the `if` guards on bottom/left passes for non-square matrices → emits duplicates.

---

## Q11. Set Matrix Zeroes

> If element is 0, zero its entire row and column. **In-place.**

#### Approach 1 — Mark with Sets

- Track zero rows/cols in two sets. **Space**: O(m + n).

#### Approach 2 — Use First Row & First Column as Markers (O(1) Space)

```js
function setZeroes(M) {
  const m = M.length, n = M[0].length;
  let firstRowZero = false, firstColZero = false;
  for (let c = 0; c < n; c++) if (M[0][c] === 0) firstRowZero = true;
  for (let r = 0; r < m; r++) if (M[r][0] === 0) firstColZero = true;
  for (let r = 1; r < m; r++)
    for (let c = 1; c < n; c++)
      if (M[r][c] === 0) M[r][0] = M[0][c] = 0;
  for (let r = 1; r < m; r++)
    for (let c = 1; c < n; c++)
      if (M[r][0] === 0 || M[0][c] === 0) M[r][c] = 0;
  if (firstRowZero) for (let c = 0; c < n; c++) M[0][c] = 0;
  if (firstColZero) for (let r = 0; r < m; r++) M[r][0] = 0;
}
```

- **Time**: O(m·n) · **Space**: O(1)

---

## Q12. Group Anagrams

> Group strings that are anagrams of each other.

**Example**: `["eat","tea","tan","ate","nat","bat"]` → `[["eat","tea","ate"],["tan","nat"],["bat"]]`

#### Approach 1 — Sort Each Word as Key

```js
function groupAnagrams(strs) {
  const map = new Map();
  for (const s of strs) {
    const key = [...s].sort().join('');
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  return [...map.values()];
}
```

- **Time**: O(n · k log k) where k = max length

#### Approach 2 — Char-Count Key

- Build a 26-length array from char counts, use as key. **Time**: O(n · k) — faster when words are long.

---

## Q13. Next Permutation

> Rearrange to the lexicographically next greater permutation. If none, sort ascending. **In-place.**

```js
function nextPermutation(nums) {
  const n = nums.length;
  let i = n - 2;
  while (i >= 0 && nums[i] >= nums[i + 1]) i--;     // find first ascending pair from right
  if (i >= 0) {
    let j = n - 1;
    while (nums[j] <= nums[i]) j--;                 // find rightmost > nums[i]
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  for (let l = i + 1, r = n - 1; l < r; l++, r--)   // reverse suffix
    [nums[l], nums[r]] = [nums[r], nums[l]];
}
```

- **Time**: O(n) · **Space**: O(1)
- **Algorithm in 3 steps**: find pivot from right → find swap target → reverse suffix.

---

## Q14. Maximum Product Subarray

> Largest product of a contiguous subarray (negatives allowed).

```js
function maxProduct(nums) {
  let mx = nums[0], mn = nums[0], best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const a = nums[i] * mx, b = nums[i] * mn;
    mx = Math.max(nums[i], a, b);
    mn = Math.min(nums[i], a, b);
    best = Math.max(best, mx);
  }
  return best;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Why track min**: A negative × min (very negative) → large positive.

---

## Q15. Merge Intervals

> Merge all overlapping intervals.

**Example**: `[[1,3],[2,6],[8,10],[15,18]]` → `[[1,6],[8,10],[15,18]]`

```js
function merge(intervals) {
  intervals.sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const [s, e] of intervals) {
    if (out.length && s <= out.at(-1)[1]) out.at(-1)[1] = Math.max(out.at(-1)[1], e);
    else out.push([s, e]);
  }
  return out;
}
```

- **Time**: O(n log n) (sort dominates) · **Space**: O(n) for output
- **Follow-up**: Insert a new interval into a non-overlapping sorted list → O(n).

---

## Q16. Insert Interval

> Insert `[s, e]` into a sorted, non-overlapping list and merge if needed.

```js
function insert(intervals, ni) {
  const out = [];
  let i = 0, n = intervals.length;
  while (i < n && intervals[i][1] < ni[0]) out.push(intervals[i++]);          // before
  while (i < n && intervals[i][0] <= ni[1]) {                                 // overlap
    ni[0] = Math.min(ni[0], intervals[i][0]);
    ni[1] = Math.max(ni[1], intervals[i][1]);
    i++;
  }
  out.push(ni);
  while (i < n) out.push(intervals[i++]);                                     // after
  return out;
}
```

- **Time**: O(n) · **Space**: O(n) for output

---

## Q17. Find First and Last Position in Sorted Array

> Return `[first, last]` indices of `target`. O(log n).

```js
function searchRange(nums, target) {
  const find = (leftBias) => {
    let l = 0, r = nums.length - 1, ans = -1;
    while (l <= r) {
      const m = (l + r) >> 1;
      if (nums[m] === target) {
        ans = m;
        if (leftBias) r = m - 1; else l = m + 1;
      } else if (nums[m] < target) l = m + 1;
      else r = m - 1;
    }
    return ans;
  };
  return [find(true), find(false)];
}
```

- **Time**: O(log n) · **Space**: O(1)
- **Pattern**: Two binary searches — one biased left, one biased right.

---

## Q18. Top K Frequent Elements

> Return the k most frequent elements.

#### Approach 1 — Sort by Frequency

- O(n log n).

#### Approach 2 — Heap (Min-Heap of size k)

- O(n log k). JS has no built-in heap; bring your own.

#### Approach 3 — Bucket Sort (O(n))

```js
function topKFrequent(nums, k) {
  const freq = new Map();
  for (const n of nums) freq.set(n, (freq.get(n) ?? 0) + 1);
  const buckets = Array(nums.length + 1).fill(null).map(() => []);
  for (const [n, c] of freq) buckets[c].push(n);
  const out = [];
  for (let i = buckets.length - 1; i >= 0 && out.length < k; i--)
    out.push(...buckets[i]);
  return out.slice(0, k);
}
```

- **Time**: O(n) · **Space**: O(n)
- **Insight**: Frequency is bounded by `n`, so use it as bucket index — no comparison sort needed.

---

## Q19. Kth Largest Element in an Array

#### Approach 1 — Sort

- O(n log n).

#### Approach 2 — Min-Heap of size k

- O(n log k).

#### Approach 3 — Quickselect (Average O(n))

```js
function findKthLargest(nums, k) {
  const target = nums.length - k;          // index in sorted order
  const partition = (l, r) => {
    const pivot = nums[r];
    let i = l;
    for (let j = l; j < r; j++) if (nums[j] <= pivot) [nums[i], nums[j]] = [nums[j], nums[i]], i++;
    [nums[i], nums[r]] = [nums[r], nums[i]];
    return i;
  };
  let l = 0, r = nums.length - 1;
  while (true) {
    const p = partition(l, r);
    if (p === target) return nums[p];
    if (p < target) l = p + 1; else r = p - 1;
  }
}
```

- **Time**: O(n) average / O(n²) worst · **Space**: O(1)
- **Pitfall**: Random pivot to avoid worst case on already-sorted input.

---

## Q20. Maximum Sum Circular Subarray

> Like Kadane, but the array is circular.

```js
function maxSubarraySumCircular(nums) {
  let curMax = 0, curMin = 0, max = -Infinity, min = Infinity, total = 0;
  for (const n of nums) {
    curMax = Math.max(curMax + n, n); max = Math.max(max, curMax);
    curMin = Math.min(curMin + n, n); min = Math.min(min, curMin);
    total += n;
  }
  return max < 0 ? max : Math.max(max, total - min);
}
```

- **Insight**: Either the answer is non-circular (regular Kadane) or it wraps — if it wraps, the *unselected* middle is the **minimum** subarray.
- **Edge case**: All negatives → `total - min === 0` (empty), but problem requires non-empty, so return `max`.

---

## Patterns You Should Recognize

| Pattern                       | Trigger                                                  | Examples here                                |
| ----------------------------- | -------------------------------------------------------- | -------------------------------------------- |
| Two pointers (sorted)         | Sorted, find pair/triplet, in-place rearrange            | 3Sum, Container, Sort Colors                 |
| Prefix sum                    | Range / subarray sum, divisible by k                     | Subarray Sum K, Pivot Index                  |
| Hash map of seen sums/values  | Need O(1) lookup of complement                           | Two Sum, Subarray Sum K                      |
| Binary search on rotated/monotonic | "Find X in O(log n)" on partially-sorted data       | Rotated Search, Find Min                     |
| Reverse trick                 | Rotation in-place                                        | Rotate Array                                 |
| Bucket sort by count          | k-th frequency or score, bounded values                  | Top K Frequent                               |
| Quickselect                   | k-th smallest/largest, average linear                    | Kth Largest                                  |
| Kadane-style DP               | Optimal contiguous subarray                              | Max Subarray, Max Product, Circular          |
| Markers in input              | O(1) extra space when allowed to mutate                  | Set Matrix Zeroes                            |

---

## Top Follow-Up Questions Interviewers Ask

1. **"What if the input is sorted?"** — unlocks two pointers / binary search.
2. **"What if values can be negative?"** — kills sliding window for sum problems → use prefix-sum hash.
3. **"Streaming input?"** — heap of size k, reservoir sampling, or running stats.
4. **"How would you parallelize this?"** — divide into chunks, merge results.
5. **"What if the data doesn't fit in memory?"** — external sort / bucket on disk.
6. **"How would you test this?"** — empty, single element, all duplicates, all same, sorted asc/desc, max/min int, overflow.
