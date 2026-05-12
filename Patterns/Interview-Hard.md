# Patterns — Hard Interview Questions

> **Audience**: Senior / FAANG on-site final rounds.
> **Goal**: Stack DP, bitmask DP, advanced backtracking with constraint propagation, hard greedy proofs.

---

## Backtracking — Hard

### Q1. Sudoku Solver

```js
function solveSudoku(board) {
  const rows = Array.from({ length: 9 }, () => new Set());
  const cols = Array.from({ length: 9 }, () => new Set());
  const boxes = Array.from({ length: 9 }, () => new Set());
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    const v = board[r][c];
    if (v !== '.') {
      rows[r].add(v); cols[c].add(v); boxes[(Math.floor(r / 3)) * 3 + Math.floor(c / 3)].add(v);
    }
  }
  function dfs(r, c) {
    if (r === 9) return true;
    if (c === 9) return dfs(r + 1, 0);
    if (board[r][c] !== '.') return dfs(r, c + 1);
    const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
    for (let d = 1; d <= 9; d++) {
      const ch = String(d);
      if (rows[r].has(ch) || cols[c].has(ch) || boxes[b].has(ch)) continue;
      board[r][c] = ch;
      rows[r].add(ch); cols[c].add(ch); boxes[b].add(ch);
      if (dfs(r, c + 1)) return true;
      board[r][c] = '.';
      rows[r].delete(ch); cols[c].delete(ch); boxes[b].delete(ch);
    }
    return false;
  }
  dfs(0, 0);
}
```

- **Time**: exponential worst, but constraint propagation (rows/cols/boxes) prunes heavily.
- **Pattern**: backtracking + **three-way constraint sets**.

---

### Q2. Word Break II

> Return all sentences formable by inserting spaces in `s` so each word is in `wordDict`.

```js
function wordBreak(s, wordDict) {
  const set = new Set(wordDict);
  const memo = new Map();
  function dfs(i) {
    if (memo.has(i)) return memo.get(i);
    if (i === s.length) return [''];
    const out = [];
    for (let j = i + 1; j <= s.length; j++) {
      const word = s.slice(i, j);
      if (!set.has(word)) continue;
      for (const rest of dfs(j)) {
        out.push(rest === '' ? word : word + ' ' + rest);
      }
    }
    memo.set(i, out);
    return out;
  }
  return dfs(0);
}
```

- **Time**: exponential worst (output dominates), much better with memoization on subproblems.
- **Pattern**: backtracking + memoization (a hybrid sometimes called "branching DP").

---

## DP — Advanced

### Q3. Edit Distance (Levenshtein)

> Min single-char ops (insert, delete, replace) to convert s1 → s2.

```js
function minDistance(s1, s2) {
  const m = s1.length, n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
    else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  }
  return dp[m][n];
}
```

- **Time**: O(m · n) · **Space**: O(m · n) (or O(min(m, n)) with rolling rows)
- **Pattern**: 2D DP comparing prefixes; three transitions = the three edit operations.

---

### Q4. Longest Common Subsequence

```js
function longestCommonSubsequence(s1, s2) {
  const m = s1.length, n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    dp[i][j] = s1[i - 1] === s2[j - 1] ? dp[i - 1][j - 1] + 1
                                        : Math.max(dp[i - 1][j], dp[i][j - 1]);
  }
  return dp[m][n];
}
```

- **Time**: O(m · n) · **Space**: O(m · n)
- **Sister problem**: LCS length × 2 − len(s1) − len(s2) gives Levenshtein with only insert/delete (no replace).

---

### Q5. Burst Balloons

> Burst balloons; each burst gives `nums[l] · nums[i] · nums[r]` coins. Maximize total.

```js
function maxCoins(nums) {
  nums = [1, ...nums, 1];
  const n = nums.length;
  const dp = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let len = 2; len < n; len++) {
    for (let l = 0; l + len < n; l++) {
      const r = l + len;
      for (let k = l + 1; k < r; k++) {
        dp[l][r] = Math.max(dp[l][r], nums[l] * nums[k] * nums[r] + dp[l][k] + dp[k][r]);
      }
    }
  }
  return dp[0][n - 1];
}
```

- **Time**: O(n³) · **Space**: O(n²)
- **Trick**: think of `k` as the **last** balloon to burst in `(l, r)` — its neighbors at burst time are exactly `l` and `r`.

---

### Q6. Bitmask DP — Travelling Salesman (Small N)

```js
function tsp(dist) {
  const n = dist.length;
  const FULL = (1 << n) - 1;
  const dp = Array.from({ length: 1 << n }, () => new Array(n).fill(Infinity));
  dp[1][0] = 0;                                          // start at city 0
  for (let mask = 1; mask <= FULL; mask++) {
    for (let u = 0; u < n; u++) {
      if (!(mask & (1 << u)) || dp[mask][u] === Infinity) continue;
      for (let v = 0; v < n; v++) {
        if (mask & (1 << v)) continue;
        const next = mask | (1 << v);
        if (dp[mask][u] + dist[u][v] < dp[next][v]) {
          dp[next][v] = dp[mask][u] + dist[u][v];
        }
      }
    }
  }
  let best = Infinity;
  for (let u = 1; u < n; u++) best = Math.min(best, dp[FULL][u] + dist[u][0]);
  return best;
}
```

- **Time**: O(n² · 2ⁿ) · **Space**: O(n · 2ⁿ)
- **Pattern**: exponential DP for permutation problems (n ≤ ~16).

---

## Greedy — Hard

### Q7. Task Scheduler

> Already in `04.Stacks&Queues/Interview-Medium.md` Q16. Closed-form greedy:
>
> ```js
> Math.max(tasks.length, (max - 1) * (n + 1) + numAtMax)
> ```

---

### Q8. Reorganize String

> Already in `04.Stacks&Queues/Interview-Medium.md` Q17. Greedy with max-heap; check feasibility up front.

---

### Q9. Candy

> N children with ratings. Each must get ≥ 1 candy; higher rating than a neighbor → strictly more candies. Minimize total.

```js
function candy(ratings) {
  const n = ratings.length;
  const candies = new Array(n).fill(1);
  for (let i = 1; i < n; i++)
    if (ratings[i] > ratings[i - 1]) candies[i] = candies[i - 1] + 1;
  for (let i = n - 2; i >= 0; i--)
    if (ratings[i] > ratings[i + 1]) candies[i] = Math.max(candies[i], candies[i + 1] + 1);
  return candies.reduce((a, b) => a + b, 0);
}
```

- **Time**: O(n) · **Space**: O(n)
- **Pattern**: two passes (left-to-right then right-to-left) — handle each direction independently, take the max.

---

### Q10. Patching Array

> Smallest number of patches needed to ensure every value in `[1, n]` is reachable as a sum of some subset of the array.

```js
function minPatches(nums, n) {
  let miss = 1, patches = 0, i = 0;
  while (miss <= n) {
    if (i < nums.length && nums[i] <= miss) {
      miss += nums[i++];
    } else {
      miss += miss;                                       // patch by inserting `miss` itself
      patches++;
    }
  }
  return patches;
}
```

- **Time**: O(m + log n) where m = nums.length · **Space**: O(1)
- **Insight**: at each step, `miss` is the smallest value not yet covered; the cheapest "patch" to extend coverage is to add exactly `miss`.

---

## Sliding Window — Hard

### Q11. Minimum Window Substring

> Smallest substring of `s` containing all characters of `t` (with multiplicity).

```js
function minWindow(s, t) {
  if (s.length < t.length) return '';
  const need = new Map();
  for (const c of t) need.set(c, (need.get(c) ?? 0) + 1);
  let missing = t.length;
  let l = 0, bestL = 0, bestLen = Infinity;
  for (let r = 0; r < s.length; r++) {
    if ((need.get(s[r]) ?? 0) > 0) missing--;
    need.set(s[r], (need.get(s[r]) ?? 0) - 1);
    while (missing === 0) {
      if (r - l + 1 < bestLen) { bestLen = r - l + 1; bestL = l; }
      need.set(s[l], (need.get(s[l]) ?? 0) + 1);
      if (need.get(s[l]) > 0) missing++;
      l++;
    }
  }
  return bestLen === Infinity ? '' : s.slice(bestL, bestL + bestLen);
}
```

- **Time**: O(s + t) · **Space**: O(t)
- **Pattern**: shrinking sliding window with a `missing` counter — generalizes to any "smallest window containing X" problem.

---

## Bit Manipulation — Hard

### Q12. Maximum XOR of Two Numbers in an Array

> Pair `i, j` with the maximum `nums[i] ^ nums[j]`.

```js
function findMaximumXOR(nums) {
  let max = 0, mask = 0;
  for (let i = 31; i >= 0; i--) {
    mask |= 1 << i;
    const prefixes = new Set();
    for (const n of nums) prefixes.add(n & mask);
    const cand = max | (1 << i);
    for (const p of prefixes) {
      if (prefixes.has(cand ^ p)) { max = cand; break; }
    }
  }
  return max;
}
```

- **Time**: O(32 · n) = O(n) · **Space**: O(n)
- **Pattern**: greedy bit-by-bit construction. Hash-set of prefixes lets us check "can two prefixes XOR to this candidate?" in O(1).

---

## Patterns Cheatsheet (Hard)

| Pattern                                  | Trigger                                                |
| ---------------------------------------- | ------------------------------------------------------ |
| **Backtracking + constraint sets**       | Sudoku, N-Queens with row/col/diag exclusion           |
| **Backtracking + memoization**           | Word Break II, decoding ways                           |
| **Interval / range DP**                  | Burst Balloons, Matrix Chain Multiplication            |
| **Bitmask DP**                           | TSP, assignment problem, set covering                  |
| **Two-direction greedy passes**          | Candy, Trapping Rain Water (alternative)               |
| **Greedy "smallest missing" patching**   | Patching Array                                         |
| **Sliding window + counter**             | Minimum Window Substring                               |
| **Bit-by-bit greedy with hash check**    | Max XOR pair                                           |

---

## Senior Communication Tips

1. **Prove your greedy.** State the exchange argument — "swapping with the optimal choice doesn't worsen the answer."
2. **For DP**: define state precisely. "`dp[i][j]` = min ops to convert `s1[0..i)` into `s2[0..j)`." Once defined, transitions follow.
3. **Bitmask DP works for n ≤ ~20.** Beyond that, look for problem structure to escape the exponential.
4. **Edge cases for sliding window**: empty input, target longer than input, all-distinct, all-same.
5. **For backtracking**: state both branching factor AND depth. Pruning saves the day; without pruning, runtime is in the trillions for moderate n.
