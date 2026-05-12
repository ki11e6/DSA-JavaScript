# Algorithms — Easy Interview Questions

> **Audience**: Junior / phone screen.
> **Goal**: Implement the basic sorts from scratch, write all four binary-search templates, recursion drills.

---

## Q1. Implement Bubble Sort

```js
function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapped = true;
      }
    }
    if (!swapped) break;                  // already sorted
  }
  return arr;
}
```

- **Time**: O(n²) worst, **O(n) best** (with the `swapped` flag) · **Space**: O(1)
- **Pattern**: bubbling — biggest element rises to the right.

---

## Q2. Implement Selection Sort

```js
function selectionSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) if (arr[j] < arr[min]) min = j;
    if (min !== i) [arr[i], arr[min]] = [arr[min], arr[i]];
  }
  return arr;
}
```

- **Time**: O(n²) (always) · **Space**: O(1)
- **Trade**: minimum number of **swaps** (≤ n−1) — useful when writes are expensive.

---

## Q3. Implement Insertion Sort

```js
function insertionSort(arr) {
  for (let i = 1; i < arr.length; i++) {
    const cur = arr[i];
    let j = i - 1;
    while (j >= 0 && arr[j] > cur) { arr[j + 1] = arr[j]; j--; }
    arr[j + 1] = cur;
  }
  return arr;
}
```

- **Time**: O(n²) worst, **O(n) on nearly-sorted** · **Space**: O(1)
- **Why TimSort uses it**: on small subarrays (< 32) it beats merge sort.

---

## Q4. Implement Merge Sort

```js
function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = arr.length >> 1;
  return merge(mergeSort(arr.slice(0, mid)), mergeSort(arr.slice(mid)));
}
function merge(a, b) {
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    out.push(a[i] <= b[j] ? a[i++] : b[j++]);
  }
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);
  return out;
}
```

- **Time**: O(n log n) · **Space**: O(n)
- **Always stable**, predictable O(n log n) — but allocates a new array per recursion level.

---

## Q5. Implement Quicksort

```js
function quickSort(arr, lo = 0, hi = arr.length - 1) {
  if (lo < hi) {
    const p = partition(arr, lo, hi);
    quickSort(arr, lo, p - 1);
    quickSort(arr, p + 1, hi);
  }
  return arr;
}
function partition(arr, lo, hi) {
  // Lomuto partition with random pivot
  const r = lo + Math.floor(Math.random() * (hi - lo + 1));
  [arr[r], arr[hi]] = [arr[hi], arr[r]];
  const pivot = arr[hi];
  let i = lo;
  for (let j = lo; j < hi; j++) {
    if (arr[j] < pivot) { [arr[i], arr[j]] = [arr[j], arr[i]]; i++; }
  }
  [arr[i], arr[hi]] = [arr[hi], arr[i]];
  return i;
}
```

- **Time**: O(n log n) average, O(n²) worst (mitigated by random pivot) · **Space**: O(log n)
- **Pitfall**: deterministic pivot choice (`arr[lo]`) gives O(n²) on sorted input.

---

## Q6. Binary Search

```js
function binarySearch(arr, target) {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) lo = mid + 1;
    else                   hi = mid - 1;
  }
  return -1;
}
```

- **Time**: O(log n) · **Space**: O(1)
- **Memorize this template** — almost every binary search question is a variation.

---

## Q7. Search Insert Position

> Given a sorted array and a target, return the index where target should be inserted (or its current index).

```js
function searchInsert(nums, target) {
  let lo = 0, hi = nums.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] < target) lo = mid + 1;
    else                    hi = mid;
  }
  return lo;
}
```

- **Time**: O(log n) · **Space**: O(1)
- **Equivalent to `lowerBound`** — the standard insertion point pattern.

---

## Q8. Sqrt(x) (Integer Square Root)

> `floor(√x)` for non-negative integer `x`. **No floating-point math.**

```js
function mySqrt(x) {
  if (x < 2) return x;
  let lo = 1, hi = x >> 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const sq = mid * mid;
    if (sq === x) return mid;
    if (sq < x) lo = mid + 1;
    else        hi = mid - 1;
  }
  return hi;                              // floor
}
```

- **Time**: O(log x) · **Space**: O(1)
- **Pattern**: search-on-the-answer — find largest `mid` with `mid² ≤ x`.

---

## Q9. Valid Perfect Square

```js
function isPerfectSquare(num) {
  let lo = 1, hi = num;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const sq = mid * mid;
    if (sq === num) return true;
    if (sq < num) lo = mid + 1;
    else          hi = mid - 1;
  }
  return false;
}
```

- **Time**: O(log n) · **Space**: O(1)

---

## Q10. First Bad Version

> Among 1..n, find the first bad version. `isBadVersion(v)` is monotone — once bad, all later are bad.

```js
function firstBadVersion(n, isBadVersion) {
  let lo = 1, hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (isBadVersion(mid)) hi = mid;
    else                   lo = mid + 1;
  }
  return lo;
}
```

- **Time**: O(log n) · **Space**: O(1)
- **Pattern**: search-on-the-answer with a custom predicate.

---

## Q11. Fibonacci (Recursive vs Iterative vs Memoized)

```js
// Naive — O(2^n) time, O(n) stack
function fibNaive(n) {
  if (n < 2) return n;
  return fibNaive(n - 1) + fibNaive(n - 2);
}

// Memoized — O(n) time, O(n) space
function fibMemo(n, memo = new Map()) {
  if (n < 2) return n;
  if (memo.has(n)) return memo.get(n);
  const r = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, r);
  return r;
}

// Iterative — O(n) time, O(1) space
function fib(n) {
  if (n < 2) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
  return b;
}
```

- **Pattern**: shows three levels of optimization — naive → memoize → iterate.

---

## Q12. Power Function `x^n`

```js
function myPow(x, n) {
  if (n < 0) { x = 1 / x; n = -n; }
  let result = 1;
  while (n > 0) {
    if (n & 1) result *= x;               // n is odd
    x *= x;                                // square the base
    n = Math.floor(n / 2);
  }
  return result;
}
```

- **Time**: O(log n) · **Space**: O(1)
- **Pattern**: **fast exponentiation** by squaring — exploits binary representation of n.

---

## Q13. Reverse a Number

```js
function reverse(n) {
  let sign = n < 0 ? -1 : 1;
  n = Math.abs(n);
  let rev = 0;
  while (n > 0) { rev = rev * 10 + n % 10; n = Math.floor(n / 10); }
  return sign * rev;
}
```

- **Time**: O(d) where d = digits · **Space**: O(1)

---

## Q14. Count Digits Recursively

```js
function countDigits(n) {
  if (n === 0) return 0;
  return 1 + countDigits(Math.floor(n / 10));
}
```

- **Time**: O(log n) · **Space**: O(log n) stack

---

## Q15. Power of Two

```js
const isPowerOfTwo = n => n > 0 && (n & (n - 1)) === 0;
```

- **Time**: O(1) · **Space**: O(1)
- **Trick**: powers of two have exactly one set bit — `n & (n-1)` clears the lowest set bit. If the result is 0, n had only one bit.

---

## Patterns Cheatsheet (Easy)

| Pattern                          | Trigger                                 | Examples here     |
| -------------------------------- | --------------------------------------- | ----------------- |
| **Sort with two nested loops**   | Implement basic sort from scratch       | Q1, Q2, Q3        |
| **Divide & merge**               | Stable, predictable O(n log n)          | Q4                |
| **Partition + recurse**          | Average O(n log n), in-place            | Q5                |
| **Standard binary search**       | Find exact value in sorted array        | Q6, Q7            |
| **Search-on-the-answer**         | Min/max satisfying a predicate          | Q8, Q9, Q10       |
| **Memoization**                  | Cache subproblem answers                | Q11               |
| **Fast exponentiation**          | x^n in O(log n)                         | Q12               |
| **Bit tricks**                   | Power of two / count set bits           | Q15               |
