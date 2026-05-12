# Stacks & Queues — Medium Interview Questions

> **Audience**: Mid-level / on-site rounds.
> **Goal**: Apply monotonic stack, two-stack/two-queue tricks, heap-based scheduling, and string-decoding via stack.

---

## Q1. Daily Temperatures

> For each day, return how many days until a warmer temperature. 0 if none.

**Example**: `[73,74,75,71,69,72,76,73]` → `[1,1,4,2,1,1,0,0]`.

```js
function dailyTemperatures(temps) {
  const out = new Array(temps.length).fill(0);
  const stack = [];                        // indices, temps strictly decreasing
  for (let i = 0; i < temps.length; i++) {
    while (stack.length && temps[stack[stack.length - 1]] < temps[i]) {
      const j = stack.pop();
      out[j] = i - j;
    }
    stack.push(i);
  }
  return out;
}
```

- **Time**: O(n) · **Space**: O(n)
- **Pattern**: monotonic stack of *indices* (not values) so we can compute distance.

---

## Q2. Next Greater Element II (Circular)

> Like NGE I but the array is **circular** — wrap around past the end.

**Example**: `[1,2,1]` → `[2,-1,2]`.

```js
function nextGreaterElements(nums) {
  const n = nums.length;
  const out = new Array(n).fill(-1);
  const stack = [];
  for (let i = 0; i < 2 * n; i++) {
    const v = nums[i % n];
    while (stack.length && nums[stack[stack.length - 1]] < v) out[stack.pop()] = v;
    if (i < n) stack.push(i);              // only push during the first pass
  }
  return out;
}
```

- **Time**: O(n) · **Space**: O(n)
- **Trick**: iterate twice (`2 * n`) but only push during the first pass — emulates the wraparound without doubling the array.

---

## Q3. Evaluate Reverse Polish Notation

> Postfix expression with `+ - * /`. Division **truncates toward zero**.

**Example**: `["2","1","+","3","*"]` → `9`.

```js
function evalRPN(tokens) {
  const stack = [];
  for (const t of tokens) {
    if (t === '+' || t === '-' || t === '*' || t === '/') {
      const b = stack.pop(), a = stack.pop();
      stack.push(t === '+' ? a + b
              : t === '-' ? a - b
              : t === '*' ? a * b
              : Math.trunc(a / b));
    } else {
      stack.push(+t);
    }
  }
  return stack[0];
}
```

- **Time**: O(n) · **Space**: O(n)
- **Pitfall**: JS division gives `-0.5` → use `Math.trunc` (toward zero), **not** `Math.floor` (which rounds toward negative infinity and breaks `-7 / 2`).

---

## Q4. Asteroid Collision

> Positive = moving right, negative = moving left. They collide if a positive precedes a negative; smaller explodes (equal → both).

**Example**: `[5,10,-5]` → `[5,10]`; `[8,-8]` → `[]`.

```js
function asteroidCollision(asteroids) {
  const stack = [];
  for (const a of asteroids) {
    let alive = true;
    while (alive && a < 0 && stack.length && stack[stack.length - 1] > 0) {
      const top = stack[stack.length - 1];
      if (top < -a) stack.pop();
      else if (top === -a) { stack.pop(); alive = false; }
      else alive = false;
    }
    if (alive) stack.push(a);
  }
  return stack;
}
```

- **Time**: O(n) · **Space**: O(n)
- **Pitfall**: track `alive` explicitly — `break`-ing out leaves `a` un-pushed but you still need to know whether `a` survived.

---

## Q5. Decode String

> `k[encoded]` repeats `encoded` k times. Decode nested patterns.

**Example**: `"3[a2[c]]"` → `"accaccacc"`.

```js
function decodeString(s) {
  const numStack = [], strStack = [];
  let num = 0, curr = '';
  for (const c of s) {
    if (c >= '0' && c <= '9') num = num * 10 + +c;
    else if (c === '[') { numStack.push(num); strStack.push(curr); num = 0; curr = ''; }
    else if (c === ']') {
      const k = numStack.pop();
      const prev = strStack.pop();
      curr = prev + curr.repeat(k);
    } else {
      curr += c;
    }
  }
  return curr;
}
```

- **Time**: O(n · k_max) · **Space**: O(depth)
- **Pattern**: two parallel stacks — one for the multiplier, one for the partial string accumulated **before** the `[`.

---

## Q6. Simplify Path

> Unix-style path: `.` (stay), `..` (up), `//` (collapse). Return canonical absolute path.

**Example**: `"/a/./b/../../c/"` → `"/c"`.

```js
function simplifyPath(path) {
  const stack = [];
  for (const p of path.split('/')) {
    if (p === '' || p === '.') continue;
    if (p === '..') stack.pop();
    else stack.push(p);
  }
  return '/' + stack.join('/');
}
```

- **Time**: O(n) · **Space**: O(n)
- **Pitfall**: `''` from leading/trailing/double slashes — must be skipped.

---

## Q7. Online Stock Span

> Each `next(price)` returns the count of consecutive previous days (including today) where price ≤ today.

```js
class StockSpanner {
  constructor() { this.stack = []; }       // entries [price, span]
  next(price) {
    let span = 1;
    while (this.stack.length && this.stack[this.stack.length - 1][0] <= price) {
      span += this.stack.pop()[1];
    }
    this.stack.push([price, span]);
    return span;
  }
}
```

- **Time**: amortized O(1) per `next` · **Space**: O(n)
- **Pattern**: compress runs into `[price, span]` so future spans can absorb them in O(1).

---

## Q8. Validate Stack Sequences

> Given `pushed` and `popped` arrays, can they correspond to a real stack run?

```js
function validateStackSequences(pushed, popped) {
  const stack = [];
  let j = 0;
  for (const x of pushed) {
    stack.push(x);
    while (stack.length && stack[stack.length - 1] === popped[j]) {
      stack.pop(); j++;
    }
  }
  return stack.length === 0;
}
```

- **Time**: O(n) · **Space**: O(n)
- **Insight**: simulate. After each push, eagerly pop everything that matches `popped[j]` from the top.

---

## Q9. Remove K Digits

> Given a numeric string `num`, remove `k` digits to produce the smallest possible result.

**Example**: `num="1432219", k=3` → `"1219"`.

```js
function removeKdigits(num, k) {
  const stack = [];
  for (const c of num) {
    while (k > 0 && stack.length && stack[stack.length - 1] > c) { stack.pop(); k--; }
    stack.push(c);
  }
  while (k > 0) { stack.pop(); k--; }
  return stack.join('').replace(/^0+/, '') || '0';
}
```

- **Time**: O(n) · **Space**: O(n)
- **Pattern**: monotonic increasing stack — when current digit is smaller than top, popping reduces the result.
- **Edge cases**: trailing pops when k > 0 after scan; strip leading zeros; "0" if everything erased.

---

## Q10. 132 Pattern

> Indices `i < j < k` with `nums[i] < nums[k] < nums[j]`?

**Example**: `[3,1,4,2]` → `true` (1 < 2 < 4).

```js
function find132pattern(nums) {
  const stack = [];                        // indices of decreasing values from the right
  let secondMax = -Infinity;               // best candidate for the "2" (the k value)
  for (let i = nums.length - 1; i >= 0; i--) {
    if (nums[i] < secondMax) return true;
    while (stack.length && nums[stack[stack.length - 1]] < nums[i]) {
      secondMax = nums[stack.pop()];
    }
    stack.push(i);
  }
  return false;
}
```

- **Time**: O(n) · **Space**: O(n)
- **Pattern**: scan right-to-left, maintain "the largest possible '2' (k-value) such that some bigger '3' (j-value) exists to its right".

---

## Q11. Design Circular Queue

> Implement `MyCircularQueue(k)` with `enQueue`, `deQueue`, `Front`, `Rear`, `isEmpty`, `isFull`.

> See `circularQueue.js` in this folder for the full implementation. The interview discussion is the **why**:
>
> - O(1) per op without allocations after construction.
> - Modular indexing (`(idx + 1) % cap`) — never have to physically move data.
> - Track `length` separately to disambiguate "empty" vs "full" when `head === tail`.

---

## Q12. Design Hit Counter

> `hit(timestamp)` and `getHits(timestamp)` returning hits in the last 300 seconds.

```js
class HitCounter {
  constructor() { this.q = []; this.head = 0; }
  hit(t) { this.q.push(t); }
  getHits(t) {
    while (this.head < this.q.length && this.q[this.head] <= t - 300) this.head++;
    return this.q.length - this.head;
  }
}
```

- **Time**: amortized O(1) per `hit`, O(1) per `getHits` (each timestamp expires once).
- **Pitfall**: don't `q.shift()` — use a head index.

**Follow-up — bursty stream with millions of hits per second**: use a 300-bucket array indexed by `t % 300`, storing per-second counts.

---

## Q13. Find K Pairs with Smallest Sums

> From two sorted arrays, return the `k` pairs `(a, b)` with smallest `a + b`.

```js
function kSmallestPairs(nums1, nums2, k) {
  const PriorityQueue = require('./priorityQueue.js');
  const heap = new PriorityQueue((a, b) => a.sum - b.sum);
  for (let i = 0; i < Math.min(nums1.length, k); i++) {
    heap.push({ sum: nums1[i] + nums2[0], i, j: 0 });
  }
  const out = [];
  while (out.length < k && heap.size()) {
    const { i, j } = heap.pop();
    out.push([nums1[i], nums2[j]]);
    if (j + 1 < nums2.length) heap.push({ sum: nums1[i] + nums2[j + 1], i, j: j + 1 });
  }
  return out;
}
```

- **Time**: O(k · log k) · **Space**: O(k)
- **Pattern**: seed the heap with top-of-each-row, then advance the row whose head pops. Same as merging k sorted streams.

---

## Q14. Top K Frequent Elements (Heap Approach)

> Already shown as **bucket sort** in `03.HashTable/Interview-Medium.md`. Heap variant for completeness:

```js
function topKFrequent(nums, k) {
  const PriorityQueue = require('./priorityQueue.js');
  const freq = new Map();
  for (const n of nums) freq.set(n, (freq.get(n) ?? 0) + 1);
  // min-heap of size k
  const heap = new PriorityQueue((a, b) => a[1] - b[1]);
  for (const [v, c] of freq) {
    heap.push([v, c]);
    if (heap.size() > k) heap.pop();
  }
  const out = [];
  while (heap.size()) out.push(heap.pop()[0]);
  return out;
}
```

- **Time**: O(n + m log k) where m = distinct values.
- **Pattern**: a **min-heap of size k** for "top K" — pop the smallest whenever it overflows. Counter-intuitive but correct.

---

## Q15. K Closest Points to Origin

```js
function kClosest(points, k) {
  const PriorityQueue = require('./priorityQueue.js');
  const dist = ([x, y]) => x * x + y * y;
  // max-heap of size k
  const heap = new PriorityQueue((a, b) => dist(b) - dist(a));
  for (const p of points) {
    heap.push(p);
    if (heap.size() > k) heap.pop();
  }
  const out = [];
  while (heap.size()) out.push(heap.pop());
  return out;
}
```

- **Time**: O(n log k) · **Space**: O(k)
- **Pattern**: **max-heap of size k** for "k smallest" — symmetry to the previous question.
- **Quickselect alternative**: average O(n), but worst O(n²); usually mentioned as a follow-up.

---

## Q16. Task Scheduler

> Given tasks (letters) and cooldown `n` between identical tasks, return minimum total time.

**Example**: `tasks=["A","A","A","B","B","B"], n=2` → `8` (`A B _ A B _ A B`).

```js
function leastInterval(tasks, n) {
  const freq = new Array(26).fill(0);
  for (const t of tasks) freq[t.charCodeAt(0) - 65]++;
  const max = Math.max(...freq);
  const numAtMax = freq.filter(f => f === max).length;
  return Math.max(tasks.length, (max - 1) * (n + 1) + numAtMax);
}
```

- **Time**: O(n) · **Space**: O(1)
- **Math**: most-frequent task fills (max−1) frames of width (n+1), plus the final occurrences of all max-frequency tasks. Compare against `tasks.length` (lower bound when n is small).

**Follow-up — return the schedule itself**: needs a max-heap of (count, char) and a cooldown queue.

---

## Q17. Reorganize String

> Rearrange so no two adjacent characters are the same. Return `""` if impossible.

```js
function reorganizeString(s) {
  const PriorityQueue = require('./priorityQueue.js');
  const freq = new Map();
  for (const c of s) freq.set(c, (freq.get(c) ?? 0) + 1);
  if ([...freq.values()].some(f => f > Math.ceil(s.length / 2))) return '';
  const heap = new PriorityQueue((a, b) => b[1] - a[1]);
  for (const [c, n] of freq) heap.push([c, n]);
  let out = '';
  while (heap.size() >= 2) {
    const [c1, n1] = heap.pop();
    const [c2, n2] = heap.pop();
    out += c1 + c2;
    if (n1 - 1 > 0) heap.push([c1, n1 - 1]);
    if (n2 - 1 > 0) heap.push([c2, n2 - 1]);
  }
  if (heap.size()) out += heap.pop()[0];
  return out;
}
```

- **Time**: O(n log σ) where σ ≤ 26 · **Space**: O(σ)
- **Pattern**: **greedy with max-heap** — always emit the two most-frequent letters in alternation. Feasibility check up front saves the heap work in impossible cases.

---

## Patterns Cheatsheet (Medium)

| Pattern                             | Trigger                                                  | Examples here   |
| ----------------------------------- | -------------------------------------------------------- | --------------- |
| **Monotonic stack of indices**      | Distance-based "next greater/smaller"                    | Q1, Q2, Q9, Q10 |
| **Stack-based parser**              | Decode/evaluate nested string structures                 | Q3, Q5, Q6      |
| **Stack with collision rules**      | Asteroid-style elimination                               | Q4              |
| **Stack with compression**          | Span-style queries with run aggregation                  | Q7              |
| **Stack simulation**                | Validate sequences match a real stack execution          | Q8              |
| **Sliding window with head index**  | Last-X-seconds counters                                  | Q11, Q12        |
| **Min-heap of size K**              | "Top K largest"                                          | Q13, Q14        |
| **Max-heap of size K**              | "K smallest"                                             | Q15             |
| **Greedy + heap**                   | Schedule / pick by remaining frequency                   | Q16, Q17        |

---

## Common Interviewer Follow-Ups

1. *"Can you do this without an explicit stack?"* — sometimes a single pass with bookkeeping suffices (Q9 with monotonic counter).
2. *"What about a stream / online version?"* — Stock Span, Hit Counter style.
3. *"What if values can repeat?"* — Top K with ties; clarify ordering; bucket sort if values fit.
4. *"What's the heap size for top K?"* — **min-heap of size K** for top K *largest*. Easy to reverse mentally.
5. *"What's the cost of `heap.pop()` in JS?"* — O(log n) with a hand-rolled binary heap; remind interviewer JS has no built-in PriorityQueue.
