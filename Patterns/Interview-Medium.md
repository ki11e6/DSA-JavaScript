# Patterns — Medium Interview Questions

> **Audience**: Mid-level / on-site rounds.
> **Goal**: Apply each pattern to harder problems where the variant matters.

---

## Sliding Window — Variable Size

### Q1. Longest Substring with At Most K Distinct Characters

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
- **Variant**: with `k = 2`, this is "Fruit Into Baskets". The same algorithm.

---

### Q2. Minimum Size Subarray Sum

> Smallest contiguous window with sum ≥ target.

```js
function minSubArrayLen(target, nums) {
  let l = 0, sum = 0, best = Infinity;
  for (let r = 0; r < nums.length; r++) {
    sum += nums[r];
    while (sum >= target) {
      best = Math.min(best, r - l + 1);
      sum -= nums[l++];
    }
  }
  return best === Infinity ? 0 : best;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Pattern**: shrinking window — expand to satisfy, then shrink while still satisfying.

---

## Two Pointers

### Q3. 3Sum (Sorted + Two Pointers)

> Already in `01.Array/Interview-Medium.md` Q1 — sort then for each `i`, run two-pointer on `(i+1..n-1)`. **O(n²)**.

---

### Q4. Container With Most Water

> Already in `01.Array/Interview-Medium.md` Q2 — opposite-direction pointers, advance the **shorter** wall.

---

## Frequency Counter

### Q5. Group Anagrams

> Already in `01.Array/Interview-Medium.md` Q12 — group by sorted-string or by char-count signature.

---

### Q6. Subarray Sum Equals K (Negatives Allowed)

> Already in `03.HashTable/Interview-Medium.md` Q5 — prefix sum + hash counts.

---

## Backtracking

### Q7. Combinations

> All k-element combinations from 1..n.

```js
function combine(n, k) {
  const out = [];
  function dfs(start, path) {
    if (path.length === k) { out.push([...path]); return; }
    for (let i = start; i <= n; i++) {
      path.push(i);
      dfs(i + 1, path);
      path.pop();
    }
  }
  dfs(1, []);
  return out;
}
```

- **Time**: O(C(n, k) · k) · **Space**: O(k) recursion

**Pruning**: only iterate `i` up to `n - (k - path.length) + 1` to skip impossible prefixes.

---

### Q8. N-Queens

> Place N queens on an N×N board so none attack each other. Return one valid placement (or count of all).

```js
function solveNQueens(n) {
  const out = [];
  const cols = new Set(), diag1 = new Set(), diag2 = new Set();
  const board = Array.from({ length: n }, () => Array(n).fill('.'));

  function dfs(r) {
    if (r === n) { out.push(board.map(row => row.join(''))); return; }
    for (let c = 0; c < n; c++) {
      if (cols.has(c) || diag1.has(r - c) || diag2.has(r + c)) continue;
      cols.add(c); diag1.add(r - c); diag2.add(r + c);
      board[r][c] = 'Q';
      dfs(r + 1);
      cols.delete(c); diag1.delete(r - c); diag2.delete(r + c);
      board[r][c] = '.';
    }
  }
  dfs(0);
  return out;
}
```

- **Time**: O(n!) (theoretical), but pruning makes it much faster in practice.
- **Pattern**: place one queen per row; track three exclusion sets (column, anti-diagonal, main-diagonal).

---

### Q9. Word Search

> Given a board and word, return whether the word can be formed by a sequence of adjacent (4-direction) cells, each used at most once.

```js
function exist(board, word) {
  const m = board.length, n = board[0].length;
  function dfs(r, c, i) {
    if (i === word.length) return true;
    if (r < 0 || r >= m || c < 0 || c >= n || board[r][c] !== word[i]) return false;
    const tmp = board[r][c];
    board[r][c] = '#';
    const found = dfs(r-1, c, i+1) || dfs(r+1, c, i+1) || dfs(r, c-1, i+1) || dfs(r, c+1, i+1);
    board[r][c] = tmp;
    return found;
  }
  for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) {
    if (dfs(r, c, 0)) return true;
  }
  return false;
}
```

- **Time**: O(m · n · 4^L) where L = word length · **Space**: O(L) recursion
- **Pattern**: backtracking with **mark-and-restore** (mutate board, restore on return).

---

## Greedy

### Q10. Gas Station

> Circular route. `gas[i]` and `cost[i]`. Return start station from which you can complete the loop, or -1.

```js
function canCompleteCircuit(gas, cost) {
  let total = 0, tank = 0, start = 0;
  for (let i = 0; i < gas.length; i++) {
    const diff = gas[i] - cost[i];
    total += diff;
    tank += diff;
    if (tank < 0) { start = i + 1; tank = 0; }
  }
  return total < 0 ? -1 : start;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Greedy insight**: if the loop is possible, the **last station** before tank goes negative cannot be a valid start. Restart from the next.

---

### Q11. Jump Game

> Each `nums[i]` is max jump length. Can you reach the last index?

```js
function canJump(nums) {
  let reach = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > reach) return false;
    reach = Math.max(reach, i + nums[i]);
  }
  return true;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Pattern**: track furthest reachable; fail when current index is past it.

---

### Q12. Non-overlapping Intervals

> Min number of intervals to remove so the rest don't overlap.

```js
function eraseOverlapIntervals(intervals) {
  intervals.sort((a, b) => a[1] - b[1]);             // sort by end time
  let count = 0, end = -Infinity;
  for (const [s, e] of intervals) {
    if (s >= end) end = e;                            // keep
    else count++;                                      // overlap → remove
  }
  return count;
}
```

- **Time**: O(n log n) · **Space**: O(1)
- **Greedy**: prefer the interval ending earliest — leaves more room for the rest.

---

## Dynamic Programming — 1D

### Q13. House Robber

> Rob houses for max total without robbing two adjacent.

```js
function rob(nums) {
  let prev2 = 0, prev1 = 0;
  for (const n of nums) [prev2, prev1] = [prev1, Math.max(prev1, prev2 + n)];
  return prev1;
}
```

- **Time**: O(n) · **Space**: O(1)
- **State**: `dp[i] = max(dp[i-1], dp[i-2] + nums[i])`. Two rolling vars.

---

### Q14. Climbing Stairs

```js
function climbStairs(n) {
  let a = 1, b = 1;
  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
  return b;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Recurrence**: `f(n) = f(n-1) + f(n-2)` (Fibonacci).

---

### Q15. Coin Change

> Min coins to make `amount`. Return -1 if impossible.

```js
function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let i = 1; i <= amount; i++) {
    for (const c of coins) if (c <= i) dp[i] = Math.min(dp[i], dp[i - c] + 1);
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}
```

- **Time**: O(n · amount) · **Space**: O(amount)
- **Why DP, not greedy**: greedy fails for `[1, 3, 4]`, amount = 6 → greedy gives `4 + 1 + 1 = 3 coins`; DP gives `3 + 3 = 2 coins`.

---

## Dynamic Programming — 2D

### Q16. Unique Paths

> m×n grid, move only right or down. Count paths from top-left to bottom-right.

```js
function uniquePaths(m, n) {
  const dp = new Array(n).fill(1);
  for (let r = 1; r < m; r++)
    for (let c = 1; c < n; c++)
      dp[c] += dp[c - 1];
  return dp[n - 1];
}
```

- **Time**: O(m · n) · **Space**: O(n) (rolling row)
- **Recurrence**: `dp[r][c] = dp[r-1][c] + dp[r][c-1]`.

---

### Q17. Longest Increasing Subsequence

> Length of LIS. `O(n²)` DP shown; `O(n log n)` patience-sort variant in `01.Array/Interview-Hard.md`.

```js
function lengthOfLIS(nums) {
  const dp = new Array(nums.length).fill(1);
  for (let i = 1; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
    }
  }
  return Math.max(...dp);
}
```

- **Time**: O(n²) · **Space**: O(n)

---

## Bit Manipulation

### Q18. Counting Bits

> Return array `out[i] = number of 1 bits in i`, for `i = 0..n`.

```js
function countBits(n) {
  const out = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) out[i] = out[i >> 1] + (i & 1);
  return out;
}
```

- **Time**: O(n) · **Space**: O(n)
- **Recurrence**: `out[i] = out[i / 2] + (i & 1)` — knock off the lowest bit.

---

### Q19. Subsets via Bitmask

> Generate all subsets without recursion.

```js
function subsetsBitmask(nums) {
  const n = nums.length;
  const out = [];
  for (let mask = 0; mask < (1 << n); mask++) {
    const sub = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) sub.push(nums[i]);
    out.push(sub);
  }
  return out;
}
```

- **Time**: O(n · 2ⁿ) · **Space**: O(n · 2ⁿ) for output
- **Trick**: each binary number 0..2ⁿ−1 represents a subset; bit i set ⇒ include nums[i].

---

## Patterns Cheatsheet (Medium)

| Pattern                            | Trigger                                           | Examples here    |
| ---------------------------------- | ------------------------------------------------- | ---------------- |
| **Variable sliding window**        | "Longest/shortest with constraint"                | Q1, Q2           |
| **Backtracking + path mutation**   | "All combinations / permutations / placements"    | Q7, Q8, Q9       |
| **Mark-and-restore (board DFS)**   | Word Search, grid backtracking                    | Q9               |
| **Greedy with sort**               | Interval scheduling                               | Q12              |
| **Greedy + running max/min**       | Gas Station, Jump Game                            | Q10, Q11         |
| **1D DP with rolling vars**        | Linear recurrence                                 | Q13, Q14         |
| **1D DP with multi-choice**        | Coin Change, Knapsack                             | Q15              |
| **2D DP with rolling row**         | Unique Paths, LCS                                 | Q16              |
| **DP table per index**             | LIS                                               | Q17              |
| **Bitmask enumeration**            | All subsets without recursion                     | Q19              |
