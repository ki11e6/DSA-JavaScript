# Algorithms — Hard Interview Questions

> **Audience**: Senior / FAANG on-site final rounds.
> **Goal**: Quickselect, divide-and-conquer with non-trivial combine, search-on-the-answer applied to scheduling, count-inversions via merge sort.

---

## Q1. Median of Two Sorted Arrays

> Already covered in `01.Array/Interview-Hard.md` Q2 — O(log min(m, n)) via partitioning.

The key trick: instead of merging, **binary-search the partition point** in the smaller array. The median is the average of `max(left)` and `min(right)` across both partitions.

---

## Q2. Find the K-th Smallest Pair Distance

> Among all `C(n, 2)` pairs, find the k-th smallest absolute difference. **O(n log n + n log(max - min))**.

```js
function smallestDistancePair(nums, k) {
  nums.sort((a, b) => a - b);
  const n = nums.length;
  // count pairs with distance ≤ d (sliding window on sorted array)
  const countAtMost = (d) => {
    let count = 0, l = 0;
    for (let r = 0; r < n; r++) {
      while (nums[r] - nums[l] > d) l++;
      count += r - l;
    }
    return count;
  };
  let lo = 0, hi = nums[n - 1] - nums[0];
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (countAtMost(mid) >= k) hi = mid;
    else                       lo = mid + 1;
  }
  return lo;
}
```

- **Time**: O(n log n) sort + O(n · log(max - min)) search · **Space**: O(1)
- **Pattern**: search-on-the-answer — feasibility = "are there at least k pairs with distance ≤ x?"

---

## Q3. Split Array Largest Sum

> Split nums into m non-empty contiguous subarrays so the largest sum is minimized.

> Already in `01.Array/Interview-Hard.md` Q14. Same pattern as Q5/Q6 in Medium — search-on-the-answer.

---

## Q4. Count of Smaller Numbers After Self

> Already covered in `01.Array/Interview-Hard.md` Q6 — O(n log n) via modified merge sort, counting cross-inversions during the merge step.

**Alternative**: BIT (Fenwick) on coordinate-compressed values. Same complexity, simpler to write once you have a BIT.

---

## Q5. Find Median from Data Stream

> Already covered in `04.Stacks&Queues/Interview-Hard.md` Q8. Two heaps with size invariant.

---

## Q6. Maximum Profit in Job Scheduling

> Each job has `[start, end, profit]`. Choose non-overlapping subset for max total profit.

```js
function jobScheduling(startTime, endTime, profit) {
  const jobs = startTime
    .map((s, i) => [s, endTime[i], profit[i]])
    .sort((a, b) => a[1] - b[1]);                  // sort by end time
  const ends = jobs.map(j => j[1]);
  const n = jobs.length;
  const dp = new Array(n + 1).fill(0);

  // Binary search the latest job ending ≤ start
  const findPrev = (i) => {
    let lo = 0, hi = i - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (ends[mid] <= jobs[i][0]) lo = mid + 1;
      else                          hi = mid - 1;
    }
    return hi;
  };

  for (let i = 0; i < n; i++) {
    const skip = dp[i];
    const take = jobs[i][2] + dp[findPrev(i) + 1];
    dp[i + 1] = Math.max(skip, take);
  }
  return dp[n];
}
```

- **Time**: O(n log n) · **Space**: O(n)
- **Pattern**: weighted interval scheduling — DP + binary search.

---

## Q7. Russian Doll Envelopes

> Already in `01.Array/Interview-Hard.md` Q12. Sort by width asc + height desc on ties → LIS on heights via patience sorting.

---

## Q8. Find K-th Smallest in Sorted Matrix

> n×n matrix where each row and column is sorted ascending. Find k-th smallest.

```js
function kthSmallest(matrix, k) {
  const n = matrix.length;
  // count elements ≤ x
  const countAtMost = (x) => {
    let count = 0, r = n - 1, c = 0;
    while (r >= 0 && c < n) {
      if (matrix[r][c] <= x) { count += r + 1; c++; }
      else r--;
    }
    return count;
  };
  let lo = matrix[0][0], hi = matrix[n - 1][n - 1];
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (countAtMost(mid) >= k) hi = mid;
    else                       lo = mid + 1;
  }
  return lo;
}
```

- **Time**: O(n · log(max - min)) · **Space**: O(1)
- **Pattern**: binary search on **value** + O(n) staircase traversal counts elements ≤ x.

---

## Q9. Aggressive Cows / Magnetic Force Between Two Balls

> Place k balls in a sorted positions array maximizing the minimum distance.

```js
function maxDistance(position, m) {
  position.sort((a, b) => a - b);
  const canPlace = (d) => {
    let count = 1, last = position[0];
    for (let i = 1; i < position.length; i++) {
      if (position[i] - last >= d) { count++; last = position[i]; }
    }
    return count >= m;
  };
  let lo = 1, hi = position[position.length - 1] - position[0];
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;                   // upper-bias
    if (canPlace(mid)) lo = mid;
    else               hi = mid - 1;
  }
  return lo;
}
```

- **Time**: O(n log n + n · log(max - min)) · **Space**: O(1)
- **Pitfall**: this is **maximizing the minimum** — flip the binary search bias (`(lo + hi + 1) >> 1` to avoid infinite loop).

---

## Q10. Closest Pair of Points (Divide & Conquer)

> Smallest distance between any two points in 2D. **O(n log n)** beats the O(n²) brute force.

```js
function closestPair(points) {
  const sortedX = [...points].sort((a, b) => a[0] - b[0]);

  function dist(p, q) {
    return Math.hypot(p[0] - q[0], p[1] - q[1]);
  }

  function solve(px) {
    const n = px.length;
    if (n <= 3) {
      let best = Infinity;
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) best = Math.min(best, dist(px[i], px[j]));
      return best;
    }
    const mid = n >> 1;
    const midX = px[mid][0];
    const dl = solve(px.slice(0, mid));
    const dr = solve(px.slice(mid));
    let d = Math.min(dl, dr);

    // strip — points within d of the midline, sorted by y
    const strip = px.filter(p => Math.abs(p[0] - midX) < d).sort((a, b) => a[1] - b[1]);
    for (let i = 0; i < strip.length; i++) {
      for (let j = i + 1; j < strip.length && strip[j][1] - strip[i][1] < d; j++) {
        d = Math.min(d, dist(strip[i], strip[j]));
      }
    }
    return d;
  }
  return solve(sortedX);
}
```

- **Time**: O(n log² n) (this version with re-sort), can be O(n log n) with merge-sort-style maintenance of y-ordering.
- **Pattern**: classic **divide-and-conquer** with a non-trivial combine step (the strip check).

---

## Q11. Sort an "almost sorted" array (each element at most k off)

> Each element is at most k positions away from its sorted position. Sort in **O(n log k)**.

```js
function nearlySortedKplaces(arr, k) {
  const PriorityQueue = require('../04.Stacks&Queues/priorityQueue.js');
  const heap = new PriorityQueue();
  for (let i = 0; i <= k && i < arr.length; i++) heap.push(arr[i]);
  let writeIdx = 0;
  for (let i = k + 1; i < arr.length; i++) {
    arr[writeIdx++] = heap.pop();
    heap.push(arr[i]);
  }
  while (!heap.isEmpty()) arr[writeIdx++] = heap.pop();
  return arr;
}
```

- **Time**: O(n log k) · **Space**: O(k)
- **Pattern**: min-heap of size (k+1) — the answer at position i is always among the next k+1 elements.

---

## Patterns Cheatsheet (Hard)

| Pattern                                    | Trigger                                                 |
| ------------------------------------------ | ------------------------------------------------------- |
| **Binary search on value, count ≤ mid**    | K-th smallest in sorted structure / smallest pair dist  |
| **Search on the answer (min-of-max)**      | Capacity / scheduling / split-array                     |
| **Search on the answer (max-of-min)**      | Aggressive cows / placement                             |
| **DP + binary search**                     | Weighted interval scheduling, LIS                       |
| **Divide & conquer with strip combine**    | Closest pair of points                                  |
| **Heap of size k**                         | Nearly-sorted array, top-K, streaming median            |
| **Modified merge sort**                    | Count inversions, count smaller after self              |

---

## Senior Communication Tips

1. **Identify "search on the answer" early.** As soon as you see "min/max X such that …", stop trying to compute X directly — binary-search it.
2. **State the monotonicity.** `canDo(x)` ⇒ `canDo(x + 1)` (or vice versa). Bug-prevention through invariant talk.
3. **Recognize duality**: count-inversions, count-smaller-after-self, count-pairs-with-condition all reduce to merge sort with a tweak.
4. **For sorted-matrix problems**: distinguish "sorted by row" (treat as flat) from "row + column sorted" (staircase or heap).
5. **Edge cases**: empty array, all equal, sorted asc/desc, max/min int boundary, k > n.
