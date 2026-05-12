# Stacks & Queues — Theoretical / Conceptual Interview Questions

> **Audience**: All levels.
> **Goal**: Master LIFO/FIFO semantics, the distinction between **abstract data type** and **implementation**, and the four "advanced" variants (deque, circular queue, priority queue, monotonic stack).

---

## 1. Fundamentals

---

### Q1. What is a stack?

**Short**: A linear data structure that supports two main operations — `push` (add to top) and `pop` (remove from top) — both in **O(1)**. It enforces **LIFO** (Last-In-First-Out) order.

**Picture**:

```
push(3)            pop() → 3
push(2)            pop() → 2
push(1)            pop() → 1
```

**Real-world analogies**:
- Stack of plates.
- "Undo" history in editors.
- Browser back-button stack.
- Function call stack (the OS-level one).

---

### Q2. What is a queue?

**Short**: A linear data structure with `enqueue` (add to back) and `dequeue` (remove from front) — both in **O(1)**. It enforces **FIFO** (First-In-First-Out) order.

**Picture**:

```
enqueue: 1, 2, 3
dequeue → 1
dequeue → 2
dequeue → 3
```

**Real-world analogies**:
- Cashier line.
- Print job queue.
- Web server request queue.
- BFS frontier.

---

### Q3. Stack vs Queue at a glance.

| Property            | Stack                         | Queue                              |
| ------------------- | ----------------------------- | ---------------------------------- |
| Discipline          | LIFO                          | FIFO                               |
| Add at              | Top (one end)                 | Back (one end)                     |
| Remove at           | Top (same end)                | Front (the **other** end)          |
| Peek shows          | Most recent                   | Oldest                             |
| Common use cases    | Backtracking, parsing, undo   | BFS, scheduling, buffering         |
| Recursion mirrors   | Yes (call stack)              | No                                 |

---

### Q4. ADT vs implementation — what's the distinction?

A **stack/queue** is an **abstract data type** — a contract that says *what* operations you can do, not *how* they're implemented.

The same ADT can be backed by:
- **Array** (dynamic array → push/pop at end is O(1) amortized)
- **Linked list** (insert/remove at head/tail is O(1) with the right pointers)
- **Two stacks** for a queue, or **two queues** for a stack
- **Circular buffer** for a fixed-capacity queue
- **Binary heap** for a priority queue

Interviewers love this question because it tests whether you can separate **interface** from **implementation**.

---

### Q5. Time-complexity table.

| Op             | Stack (array) | Stack (LL) | Queue (LL) | Circular Q | Deque | Priority Q (heap) |
| -------------- | ------------- | ---------- | ---------- | ---------- | ----- | ----------------- |
| push / enq     | O(1) amortized| O(1)       | O(1)       | O(1)       | O(1)  | O(log n)          |
| pop / deq      | O(1)          | O(1)       | O(1)       | O(1)       | O(1)  | O(log n)          |
| peek / front   | O(1)          | O(1)       | O(1)       | O(1)       | O(1)  | O(1)              |
| search by val  | O(n)          | O(n)       | O(n)       | O(n)       | O(n)  | O(n)              |
| memory/elem    | low           | medium     | medium     | low        | high  | low               |

---

### Q6. Why is `arr.shift()` a poor way to dequeue?

`Array.prototype.shift()` removes index 0, which forces every remaining element to move left by one slot → **O(n) per dequeue**. A queue of n elements dequeued one-by-one becomes **O(n²)** total.

**Fixes**:
- Use a linked list (head/tail pointers, O(1) per op).
- Use a circular buffer (modular indexing, O(1) per op).
- Use a "two-pointer" array: keep a `head` index, advance it instead of shifting; periodically compact when wasted prefix grows large.

---

### Q7. When does a stack overflow happen?

In the **call stack**: too-deep recursion exhausts the OS-allocated stack frame quota (typically ~1 MB in Node, ~8 MB in Linux user threads). Each frame holds locals, return address, saved registers.

**Symptoms**:
- `RangeError: Maximum call stack size exceeded` (V8).
- `StackOverflowError` (JVM).
- `Segmentation fault` (C/C++).

**Fixes**:
- Convert recursion to iteration with an **explicit stack**.
- Trampolining (return next-step thunks).
- Continuation-passing style.
- For tail-recursive code in engines that support **TCO** — but **V8 does not implement TCO**.

---

## 2. Stack-Specific

---

### Q8. How is the function call stack structured?

When a function is called, a **stack frame** is pushed onto the runtime call stack containing:
- Return address (where to resume in caller).
- Saved registers.
- Local variables.
- Function arguments.

When the function returns, its frame is popped. This is exactly a stack — and it's the reason every recursive algorithm has an iterative version using an explicit stack.

---

### Q9. How do you implement a stack using two queues?

Two strategies — interviewer will ask which to optimize:

**Push-costly (`push` → O(n), `pop` → O(1))**:
- Always keep all elements in `q1`. To `push`, enqueue into `q2`, drain `q1` into `q2`, then swap. Now the newest element is at the front.

**Pop-costly (`push` → O(1), `pop` → O(n))**:
- `push` straight to `q1`. To `pop`, move all but the last element of `q1` into `q2`, return the leftover, then swap.

Used in interviews as the textbook example of the **ADT vs implementation** distinction.

---

### Q10. How do you implement a queue using two stacks?

- **Input stack** (for enqueue) and **output stack** (for dequeue).
- `enqueue(x)`: push to input stack — O(1).
- `dequeue()`: if output is empty, drain input → output (this reverses order); pop from output. **Amortized O(1)** because each element is moved at most twice.

This pattern is called **two-stack queue** and is the simplest example of **amortized analysis**.

---

### Q11. What is a monotonic stack?

A stack whose values are always **monotonically increasing** (or decreasing) from bottom to top. Achieved by **popping** any top elements that violate the invariant before pushing a new one.

**Used to solve "next greater / smaller element" in O(n)**:

```js
function nextGreater(nums) {
  const out = new Array(nums.length).fill(-1);
  const stack = [];               // indices, values strictly decreasing
  for (let i = 0; i < nums.length; i++) {
    while (stack.length && nums[stack[stack.length - 1]] < nums[i]) {
      out[stack.pop()] = nums[i];
    }
    stack.push(i);
  }
  return out;
}
```

**Total work**: each index is pushed/popped at most once → **O(n)** despite the inner `while`.

**Triggers in interview prompts**: "next greater", "previous smaller", "histogram rectangle", "trapping rain water", "stock span".

---

### Q12. What does a stack-based parser look like?

For balanced delimiters, expressions, or simple grammars:
- Push the **opening token** onto the stack.
- On a **closing token**, pop and verify the match.
- On a **value**, evaluate using the top of the stack as context (operator, scope, multiplier).

Examples:
- Valid Parentheses (Easy).
- Evaluate Reverse Polish Notation (Medium).
- Decode String, Basic Calculator (Hard).
- Compiler / interpreter expression evaluation.

---

## 3. Queue-Specific

---

### Q13. What is a circular queue (ring buffer)?

A fixed-capacity queue backed by an array, with `head` and `tail` indices that wrap modulo capacity. All operations are **O(1)** with **no allocations** after construction.

```
buf:   [_, _, A, B, C, _, _, _]   cap = 8
head = 2, tail = 5, size = 3
```

**Why fixed capacity?** Many real systems need **bounded memory** — kernel device drivers, audio output buffers, log ring buffers, lock-free producer-consumer queues.

**Common gotcha**: distinguishing "empty" from "full" when `head === tail`. Solutions:
- Track `size` separately (cleanest).
- Reserve one slot empty (capacity is logical capacity − 1).

---

### Q14. What is a deque?

**Double-ended queue** — supports `push`/`pop` at **both** ends in O(1). Generalizes both stack and queue.

**Key uses**:
- **Sliding window maximum** (monotonic deque).
- **BFS bidirectional search**.
- **Work-stealing schedulers** (own thread takes from front, stealers take from back).
- **Browser history** with backward/forward.
- **0-1 BFS** (front-push for 0-weight edges, back-push for 1-weight).

Implemented either with a doubly linked list or with a circular buffer that grows on overflow.

---

### Q15. What is a monotonic deque?

A deque whose values are monotonically increasing (or decreasing) from front to back, just like a monotonic stack — but with the extra ability to **drop stale elements from the front** as the window slides.

**Canonical use — Sliding Window Maximum**:

```js
function maxSlidingWindow(nums, k) {
  const dq = [];                  // indices, values decreasing
  const out = [];
  for (let i = 0; i < nums.length; i++) {
    if (dq.length && dq[0] <= i - k) dq.shift();          // drop out-of-window
    while (dq.length && nums[dq[dq.length - 1]] < nums[i]) dq.pop();
    dq.push(i);
    if (i >= k - 1) out.push(nums[dq[0]]);
  }
  return out;
}
```

- **Time**: O(n). Each index pushed/popped at most once.

---

### Q16. What is a priority queue?

A queue where each element has a priority; `dequeue` always returns the **highest-priority** (or lowest-priority) element. Implementation: **binary heap** in an array.

**Key operations and complexity**:

| Operation         | Complexity           |
| ----------------- | -------------------- |
| `peek`            | O(1)                 |
| `push`            | O(log n)             |
| `pop`             | O(log n)             |
| Build from array  | **O(n)** with heapify |

**Used in**:
- Dijkstra's shortest path.
- Prim's MST.
- A\* search.
- Top-K problems.
- Event-driven simulations.
- LFU cache (one variant).
- Median maintenance (two heaps).

---

### Q17. Min-heap vs max-heap — what's the difference?

Same structure, different invariant:
- **Min-heap**: parent ≤ children → root is minimum.
- **Max-heap**: parent ≥ children → root is maximum.

In code: just flip the comparator. JS has neither built-in; you bring your own (see `priorityQueue.js`).

**Don't confuse with sorted order** — heaps are *only* sorted in the parent/children sense, not globally. `_heap.toString()` will not print sorted output.

---

### Q18. What's the heap-property of a binary heap stored in an array?

For any index `i`:
- Parent: `(i - 1) >> 1`
- Left child: `2 * i + 1`
- Right child: `2 * i + 2`

The tree is **always complete** (filled level-by-level, last level packed left), so an array with no gaps is the perfect storage. No pointers needed.

---

### Q19. How does `heapify` build a heap in O(n) instead of O(n log n)?

Naive: push each of n elements → n × O(log n) = O(n log n).

**`heapify`**: start from the last internal node `(n / 2) - 1` and `siftDown` each toward leaves, going up. The total work is bounded by:

```
∑ (height of node) ≤ n
```

Most nodes are near the leaves (low height), so they contribute O(1) each. Sum telescopes to **O(n)**.

**When to use**: when you have a batch of n items up front and want all of them in the heap before starting `pop`.

---

## 4. Design / Patterns

---

### Q20. When does an interviewer expect a **stack** answer?

Tell-tale prompts:
- "Validate matched/balanced …"
- "Evaluate this expression …"
- "Next greater / smaller / span …"
- "Iterative DFS / preorder / inorder traversal of a tree."
- "Undo / redo …"

If you hear any of these, **mention stack first** — it's almost always the right tool.

---

### Q21. When does an interviewer expect a **queue** answer?

- "Level-order / BFS …"
- "Process tasks in arrival order …"
- "Cool-down / rate limiter …"
- "Hit counter in last X seconds …"
- "Find the shortest path in an unweighted graph."

---

### Q22. When do you need a **priority queue**?

- "Top K …"
- "K-th largest / smallest …"
- "Merge K sorted …"
- "Schedule jobs by deadline …"
- "Median of a stream …"
- "Shortest path with weights …"

---

### Q23. What's the difference between recursion and iteration with an explicit stack?

Recursion uses the **runtime call stack**. Iteration with an explicit stack uses the **heap** (array-backed). They produce identical results but:

- **Iteration is safer** — no `RangeError` on deep inputs.
- **Iteration is observable** — you can introspect/serialize the stack.
- **Recursion is shorter** — easier to read and write for problems that branch (tree, backtracking).

Interview prompts like "convert this recursive function to iterative" are testing whether you can simulate the call stack manually, including saved local state.

---

## 5. JavaScript-Specific

---

### Q24. Does JS have built-in stack/queue?

Not as named types. You use:
- **Stack**: `Array` with `push`/`pop`.
- **Queue**: `Array` with `push`/`shift` — **avoid** for large queues; use a linked list or circular buffer.
- **Deque**: no good built-in; build your own.
- **Priority Queue**: no built-in; build a heap.

This is a frequent JS-specific gotcha — competitive programmers from C++/Java are used to `std::priority_queue` / `PriorityQueue` and assume JS has one. It doesn't.

---

### Q25. Why is the JS event loop a queue?

**Macrotask queue + microtask queue + render** — all FIFO data structures. The event loop dequeues one task, runs it to completion, then drains microtasks, then renders, then loops.

Knowing this helps explain order-of-execution questions involving `setTimeout` vs Promise vs `queueMicrotask`.

---

## 6. Trick / Gotcha Questions

---

### Q26. What does this print?

```js
const stack = [1, 2, 3];
const top = stack[stack.length];           // ?
console.log(top);
```

**Answer**: `undefined`. The top of the stack is at `length - 1`, not `length`. Off-by-one is the most common stack bug.

---

### Q27. What's wrong here?

```js
function bfs(start) {
  const queue = [start];
  while (queue.length) {
    const node = queue.shift();
    for (const n of neighbors(node)) queue.push(n);
  }
}
```

**Bug**: `queue.shift()` is O(n) per call → BFS becomes O(V²) instead of O(V + E).

**Fix**: use a linked-list queue, a circular buffer, or a head-index array:

```js
let head = 0;
while (head < queue.length) {
  const node = queue[head++];
  ...
}
```

---

### Q28. What's wrong with this validate-parentheses?

```js
function isValid(s) {
  let count = 0;
  for (const c of s) {
    if (c === '(') count++;
    else if (c === ')') count--;
    if (count < 0) return false;
  }
  return count === 0;
}
```

**Bug**: works for `()` but fails for `[(])` — counter loses track of which type closed. Use a **stack** to remember each open bracket's type.

---

## 7. Quick-Fire Drills

| Question                                                    | Answer                                                            |
| ----------------------------------------------------------- | ----------------------------------------------------------------- |
| Stack discipline?                                           | LIFO                                                              |
| Queue discipline?                                           | FIFO                                                              |
| Best stack backing in JS?                                   | Array (push/pop are O(1)).                                        |
| Best queue backing in JS?                                   | Linked list or circular buffer — **not** array+shift.             |
| `arr.shift()` complexity?                                   | O(n).                                                             |
| Two-stacks queue dequeue complexity?                        | Amortized O(1).                                                   |
| Heap push?                                                  | O(log n).                                                         |
| Heap pop?                                                   | O(log n).                                                         |
| Heap peek?                                                  | O(1).                                                             |
| Heapify time?                                               | O(n).                                                             |
| When to use monotonic stack?                                | "Next/previous greater/smaller" problems.                         |
| When to use monotonic deque?                                | Sliding-window min/max.                                           |
| When to use priority queue?                                 | Top-K / merge-K / shortest path / scheduling.                     |
| Does JS have a built-in PriorityQueue?                      | No.                                                               |
| Does V8 do tail-call optimization?                          | No.                                                               |
| BFS tool?                                                   | Queue.                                                            |
| DFS tool?                                                   | Stack (or recursion).                                             |
| What kind of queue is the JS microtask queue?               | FIFO.                                                             |

---

## 8. Talking-Point Cheatsheet

1. *"Stack and queue are abstract data types — they describe operations, not implementation. Pick the backing structure based on the workload."*
2. *"Avoid `arr.shift()` for queues — it's O(n). Use a linked list or circular buffer."*
3. *"Monotonic stack reduces 'next greater element' from O(n²) to O(n) — every index is pushed and popped at most once."*
4. *"Heaps give O(log n) push/pop and O(1) peek, with O(n) bulk build via heapify."*
5. *"Two-stack queue achieves amortized O(1) dequeue — each element is moved at most twice."*
6. *"Recursion uses the call stack; you can always rewrite it iteratively with an explicit stack to avoid stack-overflow."*
7. *"Deques are the swiss-army-knife — they generalize stack, queue, and unlock sliding-window-max in O(n)."*
8. *"For shortest path on weighted graphs, you want a priority queue — that's why Dijkstra uses one."*
