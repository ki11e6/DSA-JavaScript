# Array — Hard Interview Questions

> **Audience**: Senior / FAANG on-site final rounds, system-design-flavored DSA.
> **Goal**: Multiple non-obvious optimizations, tight space bounds, deep edge-case reasoning.
> Each question shows several approaches — interviewers reward you for naming the brute force first, then refining.

---

## Q1. Trapping Rain Water

> Given heights, compute total water trapped.

**Example**: `[0,1,0,2,1,0,1,3,2,1,2,1]` → `6`

#### Approach 1 — Brute Force

- For each index, find max-left and max-right, water at i = `min(maxL, maxR) - h[i]`.
- **Time**: O(n²) · **Space**: O(1)

#### Approach 2 — Precompute MaxL / MaxR Arrays

```js
function trap(h) {
  const n = h.length;
  if (n === 0) return 0;
  const L = Array(n), R = Array(n);
  L[0] = h[0];
  for (let i = 1; i < n; i++) L[i] = Math.max(L[i - 1], h[i]);
  R[n - 1] = h[n - 1];
  for (let i = n - 2; i >= 0; i--) R[i] = Math.max(R[i + 1], h[i]);
  let total = 0;
  for (let i = 0; i < n; i++) total += Math.min(L[i], R[i]) - h[i];
  return total;
}
```

- **Time**: O(n) · **Space**: O(n)

#### Approach 3 — Two Pointers (O(1) Space, Standard)

```js
function trap(h) {
  let l = 0, r = h.length - 1, lMax = 0, rMax = 0, total = 0;
  while (l < r) {
    if (h[l] < h[r]) {
      h[l] >= lMax ? lMax = h[l] : total += lMax - h[l];
      l++;
    } else {
      h[r] >= rMax ? rMax = h[r] : total += rMax - h[r];
      r--;
    }
  }
  return total;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Insight**: Whichever side is shorter bounds the water at that pointer — safe to commit and advance.

#### Approach 4 — Monotonic Stack

- Push indices of decreasing heights; on a higher bar, pop and compute trapped water layer-by-layer.
- O(n) time / O(n) space. Useful prep for **Largest Rectangle in Histogram**.

**Follow-up — 2D Trapping Rain Water (Hard II)**: replace pointers with a min-heap of boundary cells; flood-fill inwards. O(m·n·log(m·n)).

---

## Q2. Median of Two Sorted Arrays

> Two sorted arrays of sizes m and n. Find median in **O(log(min(m, n)))**.

```js
function findMedianSortedArrays(A, B) {
  if (A.length > B.length) [A, B] = [B, A];
  const m = A.length, n = B.length, half = (m + n + 1) >> 1;
  let l = 0, r = m;
  while (l <= r) {
    const i = (l + r) >> 1, j = half - i;
    const Aleft  = i === 0 ? -Infinity : A[i - 1];
    const Aright = i === m ?  Infinity : A[i];
    const Bleft  = j === 0 ? -Infinity : B[j - 1];
    const Bright = j === n ?  Infinity : B[j];
    if (Aleft <= Bright && Bleft <= Aright) {
      if ((m + n) % 2) return Math.max(Aleft, Bleft);
      return (Math.max(Aleft, Bleft) + Math.min(Aright, Bright)) / 2;
    }
    if (Aleft > Bright) r = i - 1;
    else l = i + 1;
  }
}
```

- **Time**: O(log min(m, n)) · **Space**: O(1)
- **Why log on the smaller**: keeps `j = half - i` non-negative.
- **Pitfalls**: handling i = 0 / i = m boundary; using `±Infinity` as sentinels avoids ugly conditionals.

---

## Q3. First Missing Positive

> Smallest missing positive integer. **O(n) time, O(1) extra space.**

**Example**: `[3,4,-1,1]` → `2`

```js
function firstMissingPositive(nums) {
  const n = nums.length;
  for (let i = 0; i < n; i++) {
    while (nums[i] > 0 && nums[i] <= n && nums[nums[i] - 1] !== nums[i]) {
      const j = nums[i] - 1;
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
  }
  for (let i = 0; i < n; i++) if (nums[i] !== i + 1) return i + 1;
  return n + 1;
}
```

- **Time**: O(n) (each element placed at most once) · **Space**: O(1)
- **Insight**: Answer is in `[1..n+1]`. Use the array itself as a hash by placing value `v` at index `v - 1` (cyclic sort).

**Alternative**: Mark presence by negating sign at index `|v| - 1`. Same time; preserves magnitude but signals presence.

---

## Q4. Largest Rectangle in Histogram

> Largest rectangle area in a bar histogram.

**Example**: `[2,1,5,6,2,3]` → `10`

```js
function largestRectangleArea(h) {
  const stack = [];   // indices with increasing heights
  let best = 0;
  for (let i = 0; i <= h.length; i++) {
    const cur = i === h.length ? 0 : h[i];
    while (stack.length && h[stack.at(-1)] > cur) {
      const top = stack.pop();
      const left = stack.length ? stack.at(-1) : -1;
      best = Math.max(best, h[top] * (i - left - 1));
    }
    stack.push(i);
  }
  return best;
}
```

- **Time**: O(n) · **Space**: O(n)
- **Trick**: Append a sentinel `0` to flush the stack.
- **Pattern**: monotonic stack — also drives Q1 alt approach and "Maximal Rectangle".

**Follow-up — Maximal Rectangle**: build a histogram per row (count of consecutive 1s above) and run this algorithm on each. O(m·n).

---

## Q5. Sliding Window Maximum

> Max of every window of size k in nums. **O(n).**

```js
function maxSlidingWindow(nums, k) {
  const dq = [];      // indices, decreasing values
  const out = [];
  for (let i = 0; i < nums.length; i++) {
    if (dq.length && dq[0] <= i - k) dq.shift();
    while (dq.length && nums[dq.at(-1)] < nums[i]) dq.pop();
    dq.push(i);
    if (i >= k - 1) out.push(nums[dq[0]]);
  }
  return out;
}
```

- **Time**: O(n) · **Space**: O(k)
- **Insight**: Front of deque always holds the index of the current window's max. Monotonic deque — old/smaller indices are useless.
- **Note**: `shift()` is O(n) on a JS array; for production use a real deque (linked list or ring buffer).

---

## Q6. Count of Smaller Numbers After Self

> For each `nums[i]`, count `j > i` with `nums[j] < nums[i]`.

#### Approaches

1. **Brute force**: O(n²).
2. **Merge sort with index tracking**: count cross-inversions during the merge step.
3. **Binary indexed tree (Fenwick)**: coordinate-compress, then update + prefix-query as you go right-to-left.

#### Merge Sort (Cleanest Senior-Level Answer)

```js
function countSmaller(nums) {
  const n = nums.length;
  const counts = Array(n).fill(0);
  const indices = nums.map((_, i) => i);
  const temp = Array(n);
  function sort(l, r) {
    if (r - l <= 1) return;
    const m = (l + r) >> 1;
    sort(l, m); sort(m, r);
    let i = l, j = m, k = l, rightCount = 0;
    while (i < m || j < r) {
      if (j === r || (i < m && nums[indices[i]] <= nums[indices[j]])) {
        counts[indices[i]] += rightCount;
        temp[k++] = indices[i++];
      } else {
        rightCount++;
        temp[k++] = indices[j++];
      }
    }
    for (let x = l; x < r; x++) indices[x] = temp[x];
  }
  sort(0, n);
  return counts;
}
```

- **Time**: O(n log n) · **Space**: O(n)
- **Why merge sort**: Every cross-pair is examined exactly once during merging.

---

## Q7. Maximum Sum of 3 Non-Overlapping Subarrays

> Three non-overlapping subarrays each of length k with max total sum. Return their starting indices (lex-smallest tuple).

```js
function maxSumOfThreeSubarrays(nums, k) {
  const n = nums.length;
  const sums = Array(n - k + 1);                 // sliding window sums
  let s = 0;
  for (let i = 0; i < k; i++) s += nums[i];
  sums[0] = s;
  for (let i = k; i < n; i++) {
    s += nums[i] - nums[i - k];
    sums[i - k + 1] = s;
  }

  const left = Array(sums.length).fill(0);       // best index ≤ i
  for (let i = 1; i < sums.length; i++)
    left[i] = sums[i] > sums[left[i - 1]] ? i : left[i - 1];

  const right = Array(sums.length).fill(sums.length - 1);  // best index ≥ i
  for (let i = sums.length - 2; i >= 0; i--)
    right[i] = sums[i] >= sums[right[i + 1]] ? i : right[i + 1];

  let best = [-1, -1, -1], bestSum = -1;
  for (let m = k; m <= sums.length - 1 - k; m++) {
    const l = left[m - k], r = right[m + k];
    const total = sums[l] + sums[m] + sums[r];
    if (total > bestSum) { bestSum = total; best = [l, m, r]; }
  }
  return best;
}
```

- **Time**: O(n) · **Space**: O(n)
- **Pattern**: Fix the middle window, then the best-left and best-right are precomputed.

---

## Q8. Maximum Gap

> Largest difference between two successive elements in the **sorted** form. **Linear time and space.**

#### Approach — Bucket Sort

- With n elements in `[min, max]`, by pigeonhole, the answer ≥ `ceil((max - min) / (n - 1))`.
- Create `n - 1` buckets of that size; max gap can only occur **between buckets** (min of next − max of previous).

```js
function maximumGap(nums) {
  if (nums.length < 2) return 0;
  const n = nums.length;
  const lo = Math.min(...nums), hi = Math.max(...nums);
  if (lo === hi) return 0;
  const size = Math.ceil((hi - lo) / (n - 1));
  const mins = Array(n - 1).fill(Infinity);
  const maxs = Array(n - 1).fill(-Infinity);
  for (const x of nums) {
    if (x === hi) continue;
    const b = Math.floor((x - lo) / size);
    mins[b] = Math.min(mins[b], x);
    maxs[b] = Math.max(maxs[b], x);
  }
  let best = 0, prev = lo;
  for (let i = 0; i < n - 1; i++) {
    if (mins[i] === Infinity) continue;
    best = Math.max(best, mins[i] - prev);
    prev = maxs[i];
  }
  return Math.max(best, hi - prev);
}
```

- **Time**: O(n) · **Space**: O(n)

---

## Q9. Reverse Pairs

> Count pairs `(i, j)` with `i < j` and `nums[i] > 2 * nums[j]`.

- **Approach**: Modified merge sort — during merge of sorted halves, for each `i` in left half, advance `j` in right half while `nums[i] > 2 * nums[j]`; accumulate.
- **Time**: O(n log n) · **Space**: O(n)
- **Why not just compare during normal merge**: the condition `2 * nums[j]` doesn't preserve the merge invariant, so the count loop is separate from the merge loop.

---

## Q10. Minimum Window Substring (subarray variant on arrays)

> Smallest contiguous subarray containing all elements (with multiplicity) of a target multiset.

```js
function minWindow(arr, target) {
  const need = new Map();
  for (const t of target) need.set(t, (need.get(t) ?? 0) + 1);
  let missing = target.length, l = 0, best = [0, Infinity];
  for (let r = 0; r < arr.length; r++) {
    if ((need.get(arr[r]) ?? 0) > 0) missing--;
    need.set(arr[r], (need.get(arr[r]) ?? 0) - 1);
    while (missing === 0) {
      if (r - l < best[1] - best[0]) best = [l, r];
      need.set(arr[l], (need.get(arr[l]) ?? 0) + 1);
      if (need.get(arr[l]) > 0) missing++;
      l++;
    }
  }
  return best[1] === Infinity ? [] : arr.slice(best[0], best[1] + 1);
}
```

- **Time**: O(n) · **Space**: O(k) (k = distinct in target)
- **Pattern**: shrinking sliding window with a "missing" counter — generalizes to many "smallest window contains X" problems.

---

## Q11. Find K Closest Elements

> Return the k closest elements to x, sorted ascending. Sorted input.

#### Approach — Binary Search the Window's Left Edge

```js
function findClosestElements(arr, k, x) {
  let l = 0, r = arr.length - k;
  while (l < r) {
    const m = (l + r) >> 1;
    if (x - arr[m] > arr[m + k] - x) l = m + 1;
    else r = m;
  }
  return arr.slice(l, l + k);
}
```

- **Time**: O(log(n - k) + k) · **Space**: O(k)
- **Insight**: Don't search by value; search by **window position** — k-sized windows form a monotonic landscape.

---

## Q12. Russian Doll Envelopes

> Max number of envelopes you can nest. Both width and height must be strictly larger.

#### Approach — Sort + LIS on Heights

- Sort by width ascending; **on ties, sort heights descending** (prevents same-width pairs from chaining).
- Then run patience-sort LIS on heights. **O(n log n)**.

```js
function maxEnvelopes(env) {
  env.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const tails = [];
  for (const [, h] of env) {
    let l = 0, r = tails.length;
    while (l < r) {
      const m = (l + r) >> 1;
      tails[m] < h ? l = m + 1 : r = m;
    }
    tails[l] = h;
  }
  return tails.length;
}
```

- **Time**: O(n log n) · **Space**: O(n)
- **Why descending tie-break**: ensures only one of equal-width envelopes participates in the LIS.

---

## Q13. Best Time to Buy and Sell Stock IV (At Most k Transactions)

```js
function maxProfit(k, prices) {
  const n = prices.length;
  if (k >= n / 2) {                                  // unlimited transactions
    let p = 0;
    for (let i = 1; i < n; i++) if (prices[i] > prices[i - 1]) p += prices[i] - prices[i - 1];
    return p;
  }
  const buy = Array(k + 1).fill(-Infinity);
  const sell = Array(k + 1).fill(0);
  for (const price of prices) {
    for (let j = 1; j <= k; j++) {
      buy[j]  = Math.max(buy[j], sell[j - 1] - price);
      sell[j] = Math.max(sell[j], buy[j] + price);
    }
  }
  return sell[k];
}
```

- **Time**: O(n · k) · **Space**: O(k)
- **State**: `buy[j]` = max profit holding stock with at most j buys; `sell[j]` = max profit not holding after at most j sells.

---

## Q14. Split Array Largest Sum

> Split nums into m non-empty contiguous subarrays so the **largest sum** among them is **minimized**.

#### Approach — Binary Search on the Answer

```js
function splitArray(nums, m) {
  let lo = Math.max(...nums), hi = nums.reduce((a, b) => a + b, 0);
  const canSplit = (cap) => {
    let groups = 1, cur = 0;
    for (const n of nums) {
      if (cur + n > cap) { groups++; cur = n; if (groups > m) return false; }
      else cur += n;
    }
    return true;
  };
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    canSplit(mid) ? hi = mid : lo = mid + 1;
  }
  return lo;
}
```

- **Time**: O(n · log(sum)) · **Space**: O(1)
- **Pattern**: When the answer space is monotonic (`canSplit(x)` ⇒ `canSplit(x+1)`), binary-search on the answer.

---

## Q15. Count of Range Sum

> Number of subarrays whose sum is in `[lower, upper]`.

#### Approach — Merge Sort on Prefix Sums

- Build prefix sums, then count pairs `(i, j)` with `lower ≤ P[j] − P[i] ≤ upper`.
- During merge, for each P[i] in the left half, find the window in the right half satisfying the inequality (two pointers).

- **Time**: O(n log n) · **Space**: O(n)
- **Alternative**: BIT over compressed prefix sums.

---

## Patterns You Should Master at Senior Level

| Pattern                              | Trigger                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------- |
| Monotonic stack / deque              | "Next greater/smaller element", histogram, sliding-window max           |
| Binary search on the answer          | Min-of-max / max-of-min, monotonic feasibility                          |
| Merge sort (count inversions)        | Counting pairs with order/value relation                                |
| Cyclic sort / index-as-hash          | Values bounded by length; O(1) extra space                              |
| Bucket / counting / radix            | Bounded range or pigeonhole gives linear time                           |
| Two-pointer with running max         | Trapping water, greedy boundary advance                                 |
| Patience sort (LIS in n log n)       | Longest increasing subsequence under custom order                       |
| State-machine DP                     | Stock with k transactions / cooldown, regex matching                    |

---

## Senior-Level Communication Tips

1. **Always state the brute force first** — even if you skip coding it. Shows you can baseline.
2. **Name the technique** before coding ("This is monotonic stack." / "Binary search on answer."). Saves interviewer time.
3. **State invariants out loud** — "Stack holds indices in decreasing height", "Left pointer's lMax ≤ rMax always". Bugs are rarer when invariants are explicit.
4. **Edge cases checklist**: empty, single element, all equal, negatives, overflow (`Number.MAX_SAFE_INTEGER`), n = 1, very large n.
5. **Discuss the trade-offs you didn't pick** — "I could use a heap here for O(n log k), but bucket sort gives O(n) since values are bounded."
6. **For 2D / matrix problems**: ask if input is mutable; that often unlocks O(1) extra space.
