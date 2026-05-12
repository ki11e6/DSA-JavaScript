# Algorithms — Medium Interview Questions

> **Audience**: Mid-level / on-site rounds.
> **Goal**: Quickselect, search-on-the-answer applied to scheduling problems, and sort variants (Dutch flag, wiggle).

---

## Q1. Find First and Last Position of Element in Sorted Array

> Two binary searches — one for the leftmost and one for the rightmost match.

```js
function searchRange(nums, target) {
  const find = (leftBias) => {
    let lo = 0, hi = nums.length - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (nums[mid] === target) {
        ans = mid;
        if (leftBias) hi = mid - 1; else lo = mid + 1;
      } else if (nums[mid] < target) lo = mid + 1;
      else                            hi = mid - 1;
    }
    return ans;
  };
  return [find(true), find(false)];
}
```

- **Time**: O(log n) · **Space**: O(1)

---

## Q2. Search in Rotated Sorted Array

> Already covered in `01.Array/Interview-Medium.md`. Key insight: at every midpoint, **at least one half is sorted** — decide which by comparing endpoints.

---

## Q3. Find Peak Element

> Any local maximum. `nums[-1]` and `nums[n]` treated as `-Infinity`. **O(log n).**

```js
function findPeakElement(nums) {
  let lo = 0, hi = nums.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] > nums[mid + 1]) hi = mid;          // peak is at mid or to the left
    else                            lo = mid + 1;     // peak is to the right
  }
  return lo;
}
```

- **Time**: O(log n) · **Space**: O(1)
- **Why it works**: walk uphill. Since `nums[-1] = nums[n] = -Infinity`, you must hit a peak.

---

## Q4. Search in 2D Matrix

> Each row is sorted; first integer of each row > last integer of the previous row. **O(log(m·n)).**

```js
function searchMatrix(matrix, target) {
  const m = matrix.length, n = matrix[0].length;
  let lo = 0, hi = m * n - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const v = matrix[Math.floor(mid / n)][mid % n];
    if (v === target) return true;
    if (v < target) lo = mid + 1;
    else            hi = mid - 1;
  }
  return false;
}
```

- **Time**: O(log(m·n)) · **Space**: O(1)
- **Trick**: treat the matrix as a flattened sorted array; convert linear index to (row, col).

---

## Q5. Capacity to Ship Packages Within D Days

> Min ship capacity such that all packages fit in ≤ D days, in given order.

```js
function shipWithinDays(weights, days) {
  const canShip = (cap) => {
    let used = 1, sum = 0;
    for (const w of weights) {
      if (sum + w > cap) { used++; sum = 0; }
      sum += w;
    }
    return used <= days;
  };
  let lo = Math.max(...weights), hi = weights.reduce((a, b) => a + b, 0);
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (canShip(mid)) hi = mid;
    else              lo = mid + 1;
  }
  return lo;
}
```

- **Time**: O(n · log(sum)) · **Space**: O(1)
- **Pattern**: **search on the answer** — `canShip(cap)` is monotone in cap.

---

## Q6. Koko Eating Bananas

> Min eating speed (bananas/hour) so Koko finishes all piles within H hours.

```js
function minEatingSpeed(piles, h) {
  const canFinish = (k) => piles.reduce((acc, p) => acc + Math.ceil(p / k), 0) <= h;
  let lo = 1, hi = Math.max(...piles);
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (canFinish(mid)) hi = mid;
    else                lo = mid + 1;
  }
  return lo;
}
```

- **Time**: O(n · log(maxPile)) · **Space**: O(1)
- **Same pattern as Q5** — recognize the shape.

---

## Q7. Sort Colors (Dutch National Flag)

> Sort `[0, 1, 2]` array in-place, **one pass**.

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
- **Pitfall**: don't increment `m` after the 2-swap — the swapped-in value hasn't been classified yet.

---

## Q8. Wiggle Sort

> Reorder so `nums[0] ≤ nums[1] ≥ nums[2] ≤ nums[3] ≥ …`. **One pass.**

```js
function wiggleSort(nums) {
  for (let i = 0; i < nums.length - 1; i++) {
    if ((i % 2 === 0) === (nums[i] > nums[i + 1])) {
      [nums[i], nums[i + 1]] = [nums[i + 1], nums[i]];
    }
  }
}
```

- **Time**: O(n) · **Space**: O(1)
- **Insight**: at each step, swap when the current pair violates the local rule. Local fix preserves earlier ordering.

---

## Q9. H-Index

> Researcher's h-index = largest h with ≥ h papers having ≥ h citations.

```js
function hIndex(citations) {
  citations.sort((a, b) => b - a);
  let h = 0;
  for (let i = 0; i < citations.length; i++) {
    if (citations[i] >= i + 1) h = i + 1;
    else break;
  }
  return h;
}
```

- **Time**: O(n log n) · **Space**: O(1)

#### O(n) variant — counting sort:

```js
function hIndex(citations) {
  const n = citations.length;
  const count = new Array(n + 1).fill(0);
  for (const c of citations) count[Math.min(c, n)]++;
  let cum = 0;
  for (let i = n; i >= 0; i--) {
    cum += count[i];
    if (cum >= i) return i;
  }
  return 0;
}
```

- **Time**: O(n) · **Space**: O(n)

---

## Q10. Find K-th Largest Element

> Already in `01.Array/Interview-Medium.md` Q19. Three approaches: sort O(n log n), heap of size K O(n log k), **quickselect** O(n) average.

#### Quickselect (expected O(n))

```js
function findKthLargest(nums, k) {
  const target = nums.length - k;
  let lo = 0, hi = nums.length - 1;
  while (true) {
    const p = partition(nums, lo, hi);
    if (p === target) return nums[p];
    if (p < target) lo = p + 1;
    else            hi = p - 1;
  }
}
function partition(arr, lo, hi) {
  const r = lo + Math.floor(Math.random() * (hi - lo + 1));
  [arr[r], arr[hi]] = [arr[hi], arr[r]];
  const pivot = arr[hi];
  let i = lo;
  for (let j = lo; j < hi; j++) if (arr[j] <= pivot) [arr[i], arr[j]] = [arr[j], arr[i]], i++;
  [arr[i], arr[hi]] = [arr[hi], arr[i]];
  return i;
}
```

---

## Q11. Sort an Array (Implement TimSort-ish)

> LeetCode 912 — sort the array in O(n log n) without using `Array.prototype.sort`.

Use any of the O(n log n) algorithms — **merge sort** or **heap sort** are safest (no quicksort worst case).

```js
function sortArray(nums) {
  function mergeSort(lo, hi) {
    if (lo >= hi) return;
    const mid = (lo + hi) >> 1;
    mergeSort(lo, mid);
    mergeSort(mid + 1, hi);
    merge(lo, mid, hi);
  }
  function merge(lo, mid, hi) {
    const tmp = [];
    let i = lo, j = mid + 1;
    while (i <= mid && j <= hi) tmp.push(nums[i] <= nums[j] ? nums[i++] : nums[j++]);
    while (i <= mid) tmp.push(nums[i++]);
    while (j <= hi) tmp.push(nums[j++]);
    for (let k = 0; k < tmp.length; k++) nums[lo + k] = tmp[k];
  }
  mergeSort(0, nums.length - 1);
  return nums;
}
```

- **Time**: O(n log n) · **Space**: O(n)

---

## Q12. Largest Number

> Concatenate numbers as strings to form the largest possible number.

```js
function largestNumber(nums) {
  const strs = nums.map(String);
  strs.sort((a, b) => (b + a).localeCompare(a + b));
  if (strs[0] === '0') return '0';                   // [0, 0] → '0', not '00'
  return strs.join('');
}
```

- **Time**: O(n · k log n) where k = max digits · **Space**: O(n)
- **Trick**: pairwise concat comparison (`b + a` vs `a + b`) gives the right ordering.

---

## Q13. Pancake Sorting

> Sort by repeatedly reversing a prefix of the array. Return the sequence of prefix-lengths used.

```js
function pancakeSort(arr) {
  const ops = [];
  for (let size = arr.length; size > 1; size--) {
    let max = 0;
    for (let i = 1; i < size; i++) if (arr[i] > arr[max]) max = i;
    if (max + 1 !== size) {
      if (max > 0) { reverse(arr, max + 1); ops.push(max + 1); }
      reverse(arr, size);
      ops.push(size);
    }
  }
  return ops;
}
function reverse(arr, k) {
  for (let l = 0, r = k - 1; l < r; l++, r--) [arr[l], arr[r]] = [arr[r], arr[l]];
}
```

- **Time**: O(n²) · **Space**: O(1)
- **Pattern**: greedy — flip the max to the front, then to its final position.

---

## Q14. Sort List by Frequency

> Sort items by frequency (most frequent first); break ties by insertion order.

```js
function frequencySort(arr) {
  const freq = new Map();
  for (const x of arr) freq.set(x, (freq.get(x) ?? 0) + 1);
  return arr.sort((a, b) => freq.get(b) - freq.get(a) || arr.indexOf(a) - arr.indexOf(b));
}
```

- **Time**: O(n²) due to `indexOf` per comparison; can be improved to O(n log n) with first-seen-index map.

---

## Patterns Cheatsheet (Medium)

| Pattern                          | Trigger                                          | Examples here     |
| -------------------------------- | ------------------------------------------------ | ----------------- |
| **Two binary searches**          | First/last occurrence                            | Q1                |
| **Modified binary search**       | Rotated / 2D matrix                              | Q2, Q4            |
| **Walk uphill**                  | Find any peak                                    | Q3                |
| **Search on the answer**         | Min/max with monotone feasibility                | Q5, Q6            |
| **Three-way partition**          | Sort 0/1/2, Dutch flag                           | Q7                |
| **Local-pair fix**               | Wiggle / alternating order                       | Q8                |
| **Quickselect**                  | Kth largest in O(n) average                      | Q10               |
| **Counting sort**                | Bounded values, O(n)                             | Q9                |
| **Custom-comparator sort**       | Largest number / merge intervals                 | Q12               |
| **Greedy local maximum**         | Pancake sort                                     | Q13               |
