# Patterns — Theoretical / Conceptual Interview Questions

> **Audience**: All levels.
> **Goal**: Recognize the pattern from the prompt. Half the difficulty of any DSA problem is naming the right technique.

---

## 1. Two Pointers (Multi-Pointer)

**When to use**: sorted array, in-place rearrangement, pair/triplet sums, palindrome checks.

**Three flavors**:

```
Opposite-direction:    l → → →  ← ← ← r           // pair sum, container with water
Same-direction:        l → r →                      // sliding window, dedup, partition
Fast/slow:             slow → ; fast → →            // cycle detection, find middle
```

**Why O(n)**: each pointer advances at most n times → total ≤ 2n moves.

**Templates**:

```js
// Opposite-direction (sorted)
let l = 0, r = arr.length - 1;
while (l < r) {
  const sum = arr[l] + arr[r];
  if (sum === target) return [l, r];
  sum < target ? l++ : r--;
}

// Same-direction (in-place rearrange)
let w = 0;
for (let r = 0; r < arr.length; r++) {
  if (keep(arr[r])) arr[w++] = arr[r];
}

// Fast/slow (cycle / middle)
let slow = head, fast = head;
while (fast && fast.next) { slow = slow.next; fast = fast.next.next; }
```

**Triggers in prompts**: "sorted", "in-place", "two values that …", "palindrome".

---

## 2. Sliding Window

**When to use**: contiguous subarray/substring problems where you need a metric over a range.

**Two flavors**:

| Flavor       | Example trigger                                |
| ------------ | ---------------------------------------------- |
| **Fixed size** | "Average of every k-element window"           |
| **Variable size** | "Smallest/longest with sum at most/least k" |

**Why O(n)**: each element enters and exits the window once.

**Templates**:

```js
// Fixed window of size k
let sum = 0;
for (let i = 0; i < k; i++) sum += arr[i];
let best = sum;
for (let i = k; i < arr.length; i++) {
  sum += arr[i] - arr[i - k];
  best = Math.max(best, sum);
}

// Variable window — shrink while invariant violates
let l = 0, sum = 0, best = 0;
for (let r = 0; r < arr.length; r++) {
  sum += arr[r];
  while (sum > k) sum -= arr[l++];
  best = Math.max(best, r - l + 1);
}
```

**Doesn't work when**: array can have negatives in a sum problem (use **prefix-sum hash** instead).

**Triggers in prompts**: "longest/shortest subarray", "at most K distinct", "exactly K", "minimum window".

---

## 3. Frequency Counter

**When to use**: comparing two collections, counting items, anagrams.

**Why a hash map (or array)?** Avoids the nested-loop O(n · m) dance — single pass each → O(n + m).

**Template**:

```js
const freq = new Map();
for (const x of a) freq.set(x, (freq.get(x) ?? 0) + 1);
for (const x of b) {
  if (!freq.has(x)) return false;
  freq.set(x, freq.get(x) - 1);
  if (freq.get(x) === 0) freq.delete(x);
}
return freq.size === 0;
```

**Triggers**: "anagram", "permutation of", "same characters", "first non-repeating", "count occurrences".

---

## 4. Divide & Conquer

**When to use**: problem splits cleanly into independent subproblems whose answers combine cheaply.

**Three steps**:
1. **Divide**: split into smaller subproblems of the same shape.
2. **Conquer**: solve recursively (with a base case).
3. **Combine**: merge subresults.

**Examples**:
- Merge sort, quicksort, binary search.
- Closest pair of points.
- Strassen's matrix multiplication.

**Master Theorem in 30s**: `T(n) = a·T(n/b) + f(n)`. Three cases depending on whether divide work or combine work dominates. (See `Algorithm/Interview-Theory.md` Q13.)

---

## 5. Backtracking

**When to use**: enumerate / search a combinatorial space (permutations, combinations, subsets, board placements).

**Idea**: build a candidate **incrementally**. As soon as the candidate violates constraints, **undo the last choice** and try a different one.

**Template**:

```js
function solve(state, choices) {
  if (isComplete(state)) { record(state); return; }
  for (const c of choicesFor(state)) {
    apply(c, state);
    if (isValid(state)) solve(state, choices);
    undo(c, state);
  }
}
```

**Used for**: N-Queens, Sudoku, permutations, combinations, word search, graph coloring.

**Why "backtracking" not "brute force"**: pruning invalid prefixes early — cuts the search tree drastically.

---

## 6. Greedy

**When to use**: making **locally optimal** choices yields the **globally optimal** answer.

**The hard part**: proving (or recognizing) that greedy works for this problem. Classic patterns:

- **Sort first, then walk**: meeting rooms, intervals, jump game II.
- **Pick by ratio**: fractional knapsack (cost/weight ratio).
- **Earliest deadline first**: task scheduling.
- **Exchange argument**: if your choice differs from optimal, you can swap without losing.

**Counterexamples** where greedy fails:
- 0/1 knapsack (need DP).
- Minimum coin change with arbitrary denominations (need DP).

**Rule of thumb**: try greedy first; if you find a counterexample, switch to DP.

---

## 7. Dynamic Programming

**When to use**: problem has **overlapping subproblems** + **optimal substructure** (the optimum is built from optima of subproblems).

**Two styles**:

| Style              | Direction        | Pros                                    |
| ------------------ | ---------------- | --------------------------------------- |
| **Top-down (memo)** | Recursive + cache | Computes only what you need; intuitive |
| **Bottom-up (tab)** | Iterative table   | No stack risk; cache-friendly          |

**Identify state**: ask "what minimum info do I need to solve a subproblem?" That's your DP signature.

**Examples by state shape**:
- 1D: Fibonacci, Climb Stairs, Max Subarray.
- 2D: Edit Distance, Longest Common Subsequence, Unique Paths.
- 1D over indices + 1D over choices: Knapsack.
- State machine: Stock with cooldown.

---

## 8. Recursion (Pure)

**When to use**: the problem has a clean recursive definition (trees, graphs, factorial-like).

**Three rules**:
1. Always have a base case.
2. Always recurse on a **smaller** input.
3. Trust the recursion ("inductive faith") — assume the subcall returns correctly.

**Stack depth concern**: V8 stack ≈ 10K frames. Convert to iteration when depth could be huge.

---

## 9. Bit Manipulation

**Common tricks**:

| Operation                           | Trick                                   |
| ----------------------------------- | --------------------------------------- |
| Check if x is even                  | `(x & 1) === 0`                         |
| Multiply / divide by 2              | `x << 1` / `x >> 1`                     |
| Floor of `x / 2`                    | `x >> 1` (integers)                     |
| Toggle the i-th bit                 | `x ^ (1 << i)`                          |
| Set the i-th bit                    | `x |= (1 << i)`                         |
| Clear the i-th bit                  | `x &= ~(1 << i)`                        |
| Read the i-th bit                   | `(x >> i) & 1`                          |
| Lowest set bit                      | `x & -x`                                |
| Clear lowest set bit                | `x & (x - 1)`                           |
| Power of 2 check                    | `x > 0 && (x & (x - 1)) === 0`          |
| Count set bits (Hamming weight)     | Brian Kernighan: while `x` → `x &= x-1; count++` |
| Swap two ints without temp          | `a ^= b; b ^= a; a ^= b;`               |

**JS specifics**:
- Bitwise ops are 32-bit — large integers get truncated.
- For 64-bit, use `BigInt` and bigint-flavored bitwise ops.

---

## 10. Quick Pattern → Trigger Map

| Trigger phrase                                              | Pattern                          |
| ----------------------------------------------------------- | -------------------------------- |
| "sorted array", "in-place", "two-sum (sorted)"              | Two pointers                     |
| "longest/shortest contiguous subarray", "at most K"         | Sliding window                   |
| "anagram", "same chars", "frequency"                        | Frequency counter                |
| "shortest path (unweighted)", "level-by-level", "BFS"       | BFS                              |
| "all paths", "topological", "cycle"                         | DFS                              |
| "merge K", "top K"                                          | Heap                             |
| "next greater/smaller"                                      | Monotonic stack                  |
| "sliding window max"                                        | Monotonic deque                  |
| "min capacity / max minimum / min-of-max"                   | Search on the answer             |
| "all permutations / combinations / subsets"                 | Backtracking                     |
| "minimum cost / maximum profit / count ways"                | DP                               |
| "intervals", "meeting rooms", "earliest deadline"           | Greedy + sort                    |
| "kth element", "nth largest"                                | Quickselect / heap               |
| "groups of equivalent things"                               | Group by canonical key (hash)    |
| "subarray sum equals K (with negatives)"                    | Prefix sum + hash                |
| "is connected / number of components"                       | Union-Find / DFS                 |
| "shortest path (weighted, non-negative)"                    | Dijkstra                         |
| "shortest path (weighted with negatives)"                   | Bellman-Ford                     |
| "minimum spanning tree"                                     | Kruskal / Prim                   |
| "single number among duplicates", "XOR"                     | Bit manipulation                 |

---

## 11. Talking-Point Cheatsheet

1. *"Two pointers gets us O(n) when the array is sorted."*
2. *"Sliding window assumes monotonicity — negatives break it for sum problems."*
3. *"Frequency counter beats nested loops by trading space for time."*
4. *"Greedy with sort works for intervals when local choices don't lock you out of a better global one."*
5. *"DP signature = the minimum info that determines a subproblem's answer."*
6. *"Search on the answer applies whenever feasibility is monotone."*
7. *"Backtracking with pruning explodes only on intentional cases — early validity checks are key."*
8. *"Bit tricks turn O(log n) into O(1) for small fixed-size problems."*
