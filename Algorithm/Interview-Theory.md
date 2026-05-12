# Algorithms — Theoretical / Conceptual Interview Questions

> **Audience**: All levels.
> **Goal**: Master sorting trade-offs, binary-search templates, recursion, and "search-on-the-answer" thinking.

---

## 1. Sorting

---

### Q1. Comparison of sorting algorithms.

| Algorithm        | Best        | Average     | Worst       | Space    | Stable? | In-Place? |
| ---------------- | ----------- | ----------- | ----------- | -------- | ------- | --------- |
| **Bubble**       | O(n)        | O(n²)       | O(n²)       | O(1)     | yes     | yes       |
| **Selection**    | O(n²)       | O(n²)       | O(n²)       | O(1)     | no      | yes       |
| **Insertion**    | O(n)        | O(n²)       | O(n²)       | O(1)     | yes     | yes       |
| **Merge**        | O(n log n)  | O(n log n)  | O(n log n)  | O(n)     | **yes** | no        |
| **Quick**        | O(n log n)  | O(n log n)  | **O(n²)**   | O(log n) | no      | yes       |
| **Heap**         | O(n log n)  | O(n log n)  | O(n log n)  | O(1)     | no      | yes       |
| **Counting**     | O(n + k)    | O(n + k)    | O(n + k)    | O(n + k) | yes     | no        |
| **Radix**        | O(d·(n+k))  | O(d·(n+k))  | O(d·(n+k))  | O(n + k) | yes     | no        |
| **Bucket**       | O(n + k)    | O(n + k)    | O(n²)       | O(n + k) | yes     | no        |
| **TimSort** (V8)| O(n)        | O(n log n)  | O(n log n)  | O(n)     | **yes** | no        |

**JS `Array.prototype.sort()`** uses TimSort (V8) since ECMA-262 2019 spec mandates stability.

---

### Q2. What does "stable sort" mean — and why does it matter?

A sort is **stable** if equal elements keep their original relative order.

**Multi-key sort example**: sort by name first, then by age. Stability preserves the name ordering within same-age groups. Without stability, you'd need a single composite comparator.

```js
const records = [
    { name: 'Alice', age: 30 },
    { name: 'Bob',   age: 30 },
    { name: 'Carol', age: 25 },
];
records.sort((a, b) => a.name.localeCompare(b.name));   // sort by name
records.sort((a, b) => a.age - b.age);                   // then by age
// stable: [Carol(25), Alice(30), Bob(30)]
```

---

### Q3. When does quicksort degrade to O(n²)?

When the chosen pivot is consistently the smallest (or largest) — e.g., picking `arr[0]` on already-sorted input. Each partition produces a 1-vs-(n-1) split → recursion depth = n.

**Mitigations**:
- Random pivot (`Math.floor(Math.random() * (hi - lo + 1)) + lo`).
- **Median-of-three** pivot (median of first/middle/last).
- Switch to insertion sort for small subarrays (< 16). TimSort does this.

---

### Q4. Why does merge sort use O(n) extra space?

Each merge step needs to write the merged result somewhere — you can't merge two adjacent sorted runs in-place efficiently. The standard implementation allocates a single auxiliary array of size n.

**O(1)-space merge sort exists** (block merge sort, e.g., Wikisort) but is rarely worth implementing.

For **linked lists**, merge sort is naturally O(1) extra (just rewire pointers) — see `02.LinkedList/Interview-Medium.md`.

---

### Q5. When should you NOT use comparison sort?

Comparison-based sorts have a **proven Ω(n log n) lower bound** — you can't beat it asymptotically.

**Non-comparison sorts** can do better when the input has structure:
- **Counting sort**: bounded integer range, O(n + k).
- **Radix sort**: integers / fixed-length strings, O(d · (n + k)).
- **Bucket sort**: uniformly distributed reals, O(n) average.

**When**: ages (0..150), grades (0..100), color codes (0..255), uniform floats in `[0, 1)`.

---

### Q6. Why is `arr.sort()` weird with numbers in JS?

Default comparator converts elements to **strings** and sorts lexicographically:

```js
[1, 10, 2, 20].sort();           // [1, 10, 2, 20] — '1' < '10' < '2' < '20'
[1, 10, 2, 20].sort((a, b) => a - b);   // [1, 2, 10, 20]
```

Always pass a comparator for numeric sorts. **Common interview gotcha.**

---

## 2. Searching

---

### Q7. Linear search vs binary search.

| Concern             | Linear | Binary       |
| ------------------- | ------ | ------------ |
| Time                | O(n)   | O(log n)     |
| Requires sorted?    | no     | **yes**      |
| Random access?      | no     | yes          |
| Implementation cost | trivial| off-by-one risk |

**Crossover**: binary search wins for n > ~10 in practice (constants matter for small arrays).

---

### Q8. The four binary-search templates.

```js
// 1. Find exact match → return index or -1
while (lo <= hi) { const mid = (lo + hi) >> 1; ... }

// 2. Lower bound → leftmost i with arr[i] >= target
while (lo < hi)  { const mid = (lo + hi) >> 1; arr[mid] < target ? lo = mid + 1 : hi = mid; }

// 3. Upper bound → leftmost i with arr[i] > target
while (lo < hi)  { const mid = (lo + hi) >> 1; arr[mid] <= target ? lo = mid + 1 : hi = mid; }

// 4. Search on the answer → smallest x in [lo, hi) with canDo(x)
while (lo < hi)  { const mid = (lo + hi) >> 1; canDo(mid) ? hi = mid : lo = mid + 1; }
```

**Pick one**, memorize it, stick with it. Almost every binary-search problem maps to one of these templates.

---

### Q9. What's "search on the answer"?

When the **answer space** is bounded `[lo, hi]` and there's a feasibility predicate `canDo(x)` that is **monotonic**, you can binary-search the answer instead of the input.

**Examples**:
- "Min capacity to ship packages in D days" — feasibility = "can we finish in D days at capacity X?"
- "Koko eating bananas" — feasibility = "can Koko finish at speed K?"
- "Painters" / "Allocate books" — same shape.
- "Find sqrt(n)" — feasibility = "is x² ≤ n?"

**Tell-tale prompts**: "minimum X such that ...", "largest X such that ...", "minimize the maximum ...".

---

### Q10. Why is the midpoint computed as `(lo + hi) >> 1` and not `(lo + hi) / 2`?

In JS specifically, `>>` is **bitwise right shift** which forces an integer (truncates fractional part) AND is faster than `Math.floor`.

In **other languages** (Java, C++), `(lo + hi) / 2` overflows for large lo/hi values near `INT_MAX`. The safer `lo + ((hi - lo) >> 1)` avoids overflow.

In JS, numbers are 64-bit floats so overflow isn't an issue until ~2⁵³, but `>> 1` is still a clean way to floor-divide.

---

## 3. Recursion

---

### Q11. What makes a recursion correct?

A recursive function needs:
1. **Base case(s)** — input that doesn't recurse, returning a known answer.
2. **Recursive case** — solves a subproblem on a **smaller** input.
3. **Combine** — turn subresults into the answer.

If any of these is wrong, you get either infinite recursion or wrong results.

---

### Q12. Stack-overflow considerations in JS.

V8 stack is ~10K frames in Node, more in browsers. Deep recursion **does** crash:

```js
function f(n) { if (n === 0) return 0; return f(n - 1) + 1; }
f(15000);   // RangeError: Maximum call stack size exceeded
```

**V8 does NOT do tail-call optimization** (only Safari/JSC does). So even tail-recursive functions consume stack.

**Convert recursion → iteration** for safety on large inputs:
- Use an explicit stack.
- Use trampolining: return functions ("thunks") and run them in a loop.

---

### Q13. The Master Theorem in 30 seconds.

For recurrences like `T(n) = a · T(n/b) + f(n)` where `f(n) = O(n^c)`:

| Case                   | Result                       |
| ---------------------- | ---------------------------- |
| `c < log_b(a)`         | T(n) = Θ(n^(log_b a))        |
| `c = log_b(a)`         | T(n) = Θ(n^c · log n)        |
| `c > log_b(a)`         | T(n) = Θ(n^c)                |

**Quick examples**:
- Merge sort: `T(n) = 2T(n/2) + O(n)` → log₂(2) = 1 = c → **O(n log n)**.
- Binary search: `T(n) = T(n/2) + O(1)` → log₂(1) = 0 = c → **O(log n)**.
- Karatsuba multiplication: `T(n) = 3T(n/2) + O(n)` → log₂(3) ≈ 1.58 > 1 → **O(n^1.58)**.

---

### Q14. Tail recursion vs head recursion.

**Tail recursive**: recursive call is the LAST thing in the function — no work after.

```js
function factTail(n, acc = 1) {
  if (n <= 1) return acc;
  return factTail(n - 1, n * acc);    // tail call
}
```

**Head recursive**: more work happens after the recursive call.

```js
function factHead(n) {
  if (n <= 1) return 1;
  return n * factHead(n - 1);          // multiplication is "after" the recursive call
}
```

**With TCO** (which JS lacks), tail recursion runs in O(1) stack. Without TCO, both are O(n) stack.

---

## 4. Divide & Conquer

---

### Q15. The D&C blueprint.

1. **Divide**: split the problem into smaller subproblems of the same type.
2. **Conquer**: solve subproblems recursively.
3. **Combine**: merge subresults.

**Examples**:
- Merge sort, quicksort, binary search.
- Closest pair of points.
- Strassen's matrix multiplication.
- FFT (fast Fourier transform).
- Karatsuba multiplication.

---

### Q16. When is D&C better than a single linear pass?

- The combine step must be **cheap relative to** the divide work for D&C to win.
- Skewed splits ruin the time complexity.
- For trivially additive metrics (sum, min, max), D&C is often **no better** than a single pass — both are O(n).
- D&C is essential when subproblems have structure (sorted halves, balanced spatial regions).

---

## 5. Trick / Gotcha

---

### Q17. What's wrong with this binary search?

```js
function bs(arr, target) {
  let lo = 0, hi = arr.length;
  while (lo <= hi) {
    const mid = (lo + hi) / 2;
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
```

**Bugs**:
1. `hi = arr.length` should be `arr.length - 1` (since `arr[arr.length]` is `undefined`).
2. `(lo + hi) / 2` doesn't floor → `mid` becomes a float, `arr[2.5]` is `undefined`.
3. Combined with the wrong `hi`, the first `arr[mid]` access is OOB.

**Fix**: `lo = 0, hi = arr.length - 1`; `mid = (lo + hi) >> 1`.

---

### Q18. Which sort works best for nearly-sorted arrays?

**Insertion sort** — O(n) on already-sorted input, makes only O(k) moves where k = number of inversions. TimSort exploits this by detecting "runs" and merging them.

For huge nearly-sorted data, TimSort is O(n) in the best case.

---

### Q19. Are JS array methods like `Array.from(...)`, `arr.slice()`, `arr.fill(0)` the same complexity?

| Operation            | Time   |
| -------------------- | ------ |
| `Array.from({length: n}, () => 0)` | O(n) |
| `new Array(n).fill(0)` | O(n)   |
| `arr.slice()`        | O(n)   |
| `[...arr]`           | O(n)   |
| `arr.concat(other)`  | O(n + m) |
| `arr.length = m`     | O(1)   (truncate) / O(m - n) (extend) |

All linear in the work they do. **Don't** assume O(1) for any allocation/copy.

---

## 6. Quick-Fire Drills

| Question                                              | Answer                                                  |
| ----------------------------------------------------- | ------------------------------------------------------- |
| Lower bound on comparison sort?                       | Ω(n log n)                                              |
| Stable sort in JS?                                    | Yes (ES2019+).                                          |
| Quick sort worst case?                                | O(n²) on already-sorted with bad pivot.                 |
| Merge sort space?                                     | O(n) (or O(1) for linked lists).                        |
| Heap sort time / space?                               | O(n log n) / O(1).                                      |
| Counting sort when?                                   | Bounded integer range.                                  |
| Radix sort when?                                      | Fixed-length integers / strings.                        |
| Binary search prerequisite?                           | Sorted input.                                           |
| Best for nearly-sorted?                               | Insertion sort / TimSort.                               |
| `arr.sort()` complexity?                              | O(n log n) (TimSort in V8).                             |
| V8 tail-call optimization?                            | No.                                                     |
| Master theorem case for merge sort?                   | Case 2 → O(n log n).                                    |
| What does "in-place" mean?                            | O(1) auxiliary memory beyond the input.                 |
| Quickselect average / worst?                          | O(n) / O(n²).                                           |
| Search on the answer trigger?                         | "Min/max X such that …"                                 |

---

## 7. Talking-Point Cheatsheet

1. *"Comparison sorts have a Ω(n log n) lower bound — counting/radix beat it by exploiting input structure."*
2. *"JS `Array.prototype.sort` is stable since ES2019 and uses TimSort — adaptive to nearly-sorted data."*
3. *"Quicksort with random pivot beats heap sort in practice due to better cache locality, despite the same Big-O."*
4. *"For huge arrays where stack overflow matters, prefer iterative bottom-up merge sort."*
5. *"Binary search isn't just for arrays — 'search on the answer' applies whenever feasibility is monotone."*
6. *"V8 has no TCO — convert deep recursion to iteration for production."*
7. *"For multi-key sorting in JS, do unstable→stable: sort by least significant key first, most significant last."*
