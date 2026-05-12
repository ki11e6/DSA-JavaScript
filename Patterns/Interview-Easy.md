# Patterns — Easy Interview Questions

> **Audience**: Junior / phone screen.
> **Goal**: Recognize each pattern from a representative problem.

---

## Two Pointers

### Q1. Squares of a Sorted Array

> Sorted array (negatives allowed). Return the **sorted** array of each element's square.

```js
function sortedSquares(nums) {
  const n = nums.length;
  const out = new Array(n);
  let l = 0, r = n - 1, w = n - 1;
  while (l <= r) {
    const ls = nums[l] * nums[l];
    const rs = nums[r] * nums[r];
    if (ls > rs) { out[w--] = ls; l++; }
    else         { out[w--] = rs; r--; }
  }
  return out;
}
```

- **Time**: O(n) · **Space**: O(n)
- **Pattern**: opposite-direction two-pointers, fill from the **back**.

---

### Q2. Move Zeroes (Two Pointers)

```js
function moveZeroes(nums) {
  let w = 0;
  for (let r = 0; r < nums.length; r++) {
    if (nums[r] !== 0) [nums[w], nums[r]] = [nums[r], nums[w]], w++;
  }
}
```

- **Time**: O(n) · **Space**: O(1)
- **Pattern**: same-direction two-pointers — `w` writes, `r` reads.

---

## Sliding Window

### Q3. Maximum Average Subarray of Length K (Fixed Window)

```js
function findMaxAverage(nums, k) {
  let sum = 0;
  for (let i = 0; i < k; i++) sum += nums[i];
  let best = sum;
  for (let i = k; i < nums.length; i++) {
    sum += nums[i] - nums[i - k];
    best = Math.max(best, sum);
  }
  return best / k;
}
```

- **Time**: O(n) · **Space**: O(1)

---

### Q4. Best Time to Buy and Sell Stock (Variable-Window-ish)

```js
function maxProfit(prices) {
  let min = Infinity, best = 0;
  for (const p of prices) {
    min = Math.min(min, p);
    best = Math.max(best, p - min);
  }
  return best;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Pattern**: track minimum so far while scanning — like a sliding window with lower bound only.

---

## Frequency Counter

### Q5. Valid Anagram

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
- **Pattern**: counter array (alphabet bounded) — the simplest frequency counter.

---

### Q6. Same Frequency

> Are these arrays element-by-element same multiset?

```js
function sameFreq(a, b) {
  if (a.length !== b.length) return false;
  const f = new Map();
  for (const x of a) f.set(x, (f.get(x) ?? 0) + 1);
  for (const x of b) {
    if (!f.has(x)) return false;
    f.set(x, f.get(x) - 1);
    if (f.get(x) === 0) f.delete(x);
  }
  return f.size === 0;
}
```

- **Time**: O(n) · **Space**: O(n)

---

## Recursion

### Q7. Power Set (Recursion / Backtracking)

```js
function subsets(nums) {
  const out = [];
  function dfs(i, path) {
    out.push([...path]);
    for (let j = i; j < nums.length; j++) {
      path.push(nums[j]);
      dfs(j + 1, path);
      path.pop();
    }
  }
  dfs(0, []);
  return out;
}
```

- **Time**: O(n · 2ⁿ) (output dominates) · **Space**: O(n) recursion
- **Pattern**: classic backtracking — take or skip each element.

---

### Q8. Generate All Permutations

```js
function permute(nums) {
  const out = [];
  function dfs(path) {
    if (path.length === nums.length) { out.push([...path]); return; }
    for (const n of nums) {
      if (path.includes(n)) continue;
      path.push(n);
      dfs(path);
      path.pop();
    }
  }
  dfs([]);
  return out;
}
```

- **Time**: O(n · n!) · **Space**: O(n) recursion
- **Pattern**: backtracking with `includes` check (or boolean visited array for speed).

---

## Greedy

### Q9. Assign Cookies

> Each child has a greed factor `g[i]`; each cookie has size `s[j]`. A child is content iff a cookie size ≥ their greed. Maximize content children.

```js
function findContentChildren(g, s) {
  g.sort((a, b) => a - b);
  s.sort((a, b) => a - b);
  let i = 0;                                        // child pointer
  for (let j = 0; j < s.length && i < g.length; j++) {
    if (s[j] >= g[i]) i++;
  }
  return i;
}
```

- **Time**: O(n log n) · **Space**: O(1)
- **Pattern**: sort both, greedily match smallest cookie to least-greedy child it satisfies.

---

### Q10. Lemonade Change

> $5 lemonades. Bills come in 5/10/20. Return `true` if you can give correct change to everyone.

```js
function lemonadeChange(bills) {
  let five = 0, ten = 0;
  for (const b of bills) {
    if (b === 5) five++;
    else if (b === 10) {
      if (!five) return false;
      five--; ten++;
    } else {                                          // 20
      if (ten && five) { ten--; five--; }
      else if (five >= 3) five -= 3;
      else return false;
    }
  }
  return true;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Pattern**: greedy — use 10s before 5s when paying back 15.

---

## Bit Manipulation

### Q11. Single Number

> Every element appears twice except one. **O(n) time, O(1) space.**

```js
const singleNumber = nums => nums.reduce((a, b) => a ^ b, 0);
```

- **Trick**: `x ^ x = 0`, `x ^ 0 = x`, XOR is commutative — pairs cancel.

---

### Q12. Number of 1 Bits (Hamming Weight)

```js
function hammingWeight(n) {
  let count = 0;
  while (n) { n &= n - 1; count++; }
  return count;
}
```

- **Time**: O(set bits) · **Space**: O(1)
- **Trick**: `n &= n - 1` clears the lowest set bit each iteration.

---

### Q13. Power of Two

```js
const isPowerOfTwo = n => n > 0 && (n & (n - 1)) === 0;
```

- **Trick**: powers of 2 have exactly one set bit.

---

## Divide & Conquer

### Q14. Maximum Subarray (D&C variant)

> Already covered with Kadane's in `01.Array/Interview-Easy.md` Q7. The D&C version (less commonly asked but worth knowing):

```js
function maxSubarrayDC(nums) {
  function solve(l, r) {
    if (l === r) return nums[l];
    const mid = (l + r) >> 1;
    const left = solve(l, mid);
    const right = solve(mid + 1, r);
    // best subarray crossing mid
    let leftSum = -Infinity, sum = 0;
    for (let i = mid; i >= l; i--) { sum += nums[i]; leftSum = Math.max(leftSum, sum); }
    let rightSum = -Infinity; sum = 0;
    for (let i = mid + 1; i <= r; i++) { sum += nums[i]; rightSum = Math.max(rightSum, sum); }
    return Math.max(left, right, leftSum + rightSum);
  }
  return solve(0, nums.length - 1);
}
```

- **Time**: O(n log n) · **Space**: O(log n)

---

## Pattern Recognition Quiz

For each prompt, name the pattern:

| Prompt                                                              | Pattern                  |
| ------------------------------------------------------------------- | ------------------------ |
| "Find the longest substring without repeating characters"           | Sliding window           |
| "Sort 0/1/2 in-place"                                               | Two pointers (Dutch flag)|
| "Group anagrams together"                                           | Frequency / canonical key|
| "Find the kth largest"                                              | Heap / quickselect       |
| "All possible n-letter passwords from a charset"                    | Backtracking             |
| "Min cost to climb n stairs"                                        | DP                       |
| "Schedule jobs to maximize profit, none overlap"                    | Greedy + sort, or DP     |
| "Number of distinct paths in an m×n grid"                           | DP                       |
| "Compute x^n in O(log n)"                                           | Divide & conquer / bit   |
