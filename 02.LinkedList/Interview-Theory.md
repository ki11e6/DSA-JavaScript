# LinkedList — Theoretical / Conceptual Interview Questions

> **Audience**: All levels. Linked lists are *the* favorite "show me you understand pointers" data structure.
> **Goal**: Explain types, trade-offs vs arrays, and design patterns (sentinel nodes, fast/slow pointers).

---

## 1. Fundamentals

---

### Q1. What is a linked list?

**Short**: A linear data structure where each element (node) holds **data + a pointer to the next node**. Unlike an array, nodes are **not contiguous in memory**; they're allocated independently and linked.

```
Singly:  [1|next] → [2|next] → [3|next] → null
Doubly:  null ← [prev|1|next] ⇄ [prev|2|next] ⇄ [prev|3|next] → null
```

**Key property**: O(1) insert/delete given a pointer to the position; O(n) random access.

---

### Q2. Types of linked lists.

| Type            | Each node has              | Pros                              | Cons                          |
| --------------- | -------------------------- | --------------------------------- | ----------------------------- |
| **Singly**      | `val`, `next`              | Less memory, simpler              | Can't go backward; O(n) prev  |
| **Doubly**      | `val`, `next`, `prev`      | O(1) bidirectional traversal      | Extra pointer per node        |
| **Circular**    | last node's `next` → head  | Round-robin scheduling            | Easy to write infinite loops  |
| **Skip List**   | Multi-level forward pointers | O(log n) search, simpler than balanced trees | Higher memory  |
| **Unrolled**    | Each node holds an array of K values | Better cache locality      | Complex split/merge logic     |
| **XOR list**    | `npx = prev XOR next` (one field) | O(1) bidirectional in 1 field | Hard to debug; rarely used  |

In interviews "linked list" without qualification almost always means **singly linked**.

---

### Q3. Why not just use an array?

Use a linked list when:
1. **Frequent insertions/deletions at the head** — O(1) vs O(n) for arrays.
2. **You don't need random access** — pure traversal workloads.
3. **You can't tolerate occasional O(n) reallocation** of dynamic arrays (real-time systems).
4. **You're building specific structures** that need pointer surgery: LRU caches, OS run queues, free-list allocators.

Use an array when:
1. **You need random access** — O(1) vs O(n).
2. **Cache locality matters** — usually it does, even when Big-O says otherwise.
3. **Simplicity/safety** — no NPE-style bugs, no manual memory management.

**Senior takeaway**: 95% of the time, `Array` is faster in practice because of cache. Pick linked list deliberately, not by reflex.

---

### Q4. Time / Space complexity table.

| Operation                        | Singly LL  | Doubly LL  | Dynamic Array  |
| -------------------------------- | ---------- | ---------- | -------------- |
| Access by index                  | O(n)       | O(n)       | O(1)           |
| Search by value                  | O(n)       | O(n)       | O(n)           |
| Insert at head                   | O(1)       | O(1)       | O(n)           |
| Insert at tail (with tail ptr)   | O(1)       | O(1)       | O(1) amortized |
| Insert at tail (no tail ptr)     | O(n)       | O(n)       | O(1) amortized |
| Insert at middle (given pointer) | O(1)       | O(1)       | O(n)           |
| Delete at head                   | O(1)       | O(1)       | O(n)           |
| Delete at tail (singly)          | O(n)       | O(1)       | O(1)           |
| Delete by pointer                | O(1)*      | O(1)       | O(n)           |
| Memory per element               | val + 1 ptr | val + 2 ptrs | val only    |

*Singly: deleting a known node is O(1) only if you copy the next node's value over and delete the next node — you can't otherwise back-link.

---

### Q5. Why is "delete a given node from a singly LL" O(1) — but tricky?

You can't reach the previous node, so you can't say `prev.next = node.next`. Instead:

```js
function deleteNode(node) {
  node.val = node.next.val;
  node.next = node.next.next;
}
```

You **copy** the next node's value into the current node, then unlink the next node. Effectively the same data structure, with the same node deleted.

**Caveats**:
- Doesn't work if the node to delete is the **tail** — there's no next node to copy.
- Mutates payload — if other code holds a reference to `node` expecting the original value, it breaks.

---

### Q6. What is a sentinel / dummy node? Why use one?

A node that doesn't carry real data, placed before head (or after tail in doubly LL).

```
dummy → [real head] → [...] → null
```

**Why**:
1. **Eliminates `if (head === null)` branches** — empty list is just `dummy.next === null`.
2. **Uniform insertion/deletion** — head insertions look like middle insertions.
3. **Return `dummy.next`** at the end of any algorithm that builds a list.

**Used everywhere in interview solutions**: `mergeTwoLists`, `removeNthFromEnd`, `partition`, `addTwoNumbers`. Memorize the pattern.

---

### Q7. What's the "runner / two-pointer" technique on linked lists?

**Two pointers traversing at different speeds or starting at different positions.** Famous variants:

| Variant                          | Use case                                         |
| -------------------------------- | ------------------------------------------------ |
| **Slow + Fast (1× / 2×)**        | Find middle, detect cycle (Floyd's algo)         |
| **Slow + Fast (k apart)**        | Find Nth from end                                |
| **Two pointers from both ends**  | Doubly linked list palindrome check              |
| **Two pointers from two heads**  | Intersection of two LLs                          |

Single pass, O(1) space — that's why interviewers love these.

---

### Q8. Floyd's Cycle Detection — why does it work?

**Algorithm**: slow advances 1, fast advances 2. If there's a cycle, they meet inside the loop.

**Why they meet**:
- Once both are inside the cycle, every step the gap closes by 1 (fast catches up by 1 per iteration).
- Gap is bounded by cycle length L → they meet in ≤ L iterations.

**Why no cycle ⇒ no meeting**:
- Fast reaches `null` first.

**Finding the cycle's start** (after they meet inside):
- Reset slow to head; advance both at speed 1; they meet at the cycle entrance.
- Math: if entrance is at distance `a` from head, meeting point is `b` into the loop, and remaining loop is `c`, then `2(a + b) = a + b + n(b + c)` ⇒ `a = (n−1)(b + c) + c`. So walking `a` from head and `c` from meeting both land on the entrance.

---

### Q9. Why is reversing a linked list iteratively the canonical "first interview question"?

It tests the **3-pointer juggling** every linked list algorithm needs:

```js
function reverse(head) {
  let prev = null, curr = head;
  while (curr) {
    const next = curr.next;   // 1. cache next
    curr.next = prev;         // 2. reverse pointer
    prev = curr;              // 3. advance prev
    curr = next;              // 4. advance curr
  }
  return prev;                // new head
}
```

**Common mistake**: forgetting to cache `next` before overwriting `curr.next` → loses the rest of the list.

**Recursive version** uses O(n) stack space — say so explicitly in interviews.

---

### Q10. When would you use a doubly linked list over a singly linked list?

When you need:
- **O(1) deletion of a known node** (no need to find prev).
- **Bidirectional iteration** — palindrome on a doubly LL is two pointers moving inward.
- **LRU Cache** — must move arbitrary nodes to the front in O(1).
- **Browser history / undo-redo** — natural prev/next semantics.

The cost is **2× pointer overhead** per node and more careful pointer surgery on inserts/deletes.

---

## 2. Memory & Performance

---

### Q11. Cache locality — why are linked lists slow in practice?

Each node is a **separately allocated object** on the heap. Adjacent nodes can be anywhere in memory, so iterating a linked list causes a **cache miss** at almost every step.

An array of the same length sits in a few **contiguous cache lines** — one miss prefetches the next several elements for free.

**Practical numbers**: iterating an array of 10M ints takes ~10 ms; iterating a linked list of the same data can take **100+ ms** despite identical Big-O.

**Mitigation**: **unrolled linked list** packs k elements per node — each node fills a cache line and amortizes the pointer overhead.

---

### Q12. How much memory does a JS `ListNode` actually use?

Roughly **40–48 bytes per node** in V8:
- Object header: 12–16 bytes (hidden class + properties pointer + length).
- `val` (boxed for non-SMI numbers): 8 bytes.
- `next`: 8 bytes (pointer).
- Padding to align: a few more.

Compare to an `Int32Array` element: **4 bytes**. That's a **10×+ memory overhead** for storing the same number — yet another reason to prefer arrays for numeric work.

---

### Q13. Iterative vs recursive — which is preferred for linked lists?

**Iterative**:
- O(1) space.
- No stack overflow risk on long lists.
- Almost always preferred in production.

**Recursive**:
- O(n) stack space.
- Cleaner for naturally recursive structures (tree-like, k-group reversals, deep merges).
- Risks `RangeError: Maximum call stack size exceeded` past ~10K nodes in V8.

**Interview answer**: write iterative for simple reversals/traversals; reach for recursion when the problem is genuinely recursive (e.g., reverse in groups of k, merging k sorted lists with divide-and-conquer).

---

### Q14. Tail recursion — does JS optimize it?

**No** — V8 does **not** implement tail-call optimization (TCO). It was specced in ES2015 (`PTC` — proper tail calls) but only Safari/JavaScriptCore implements it.

**Implication**: even tail-recursive functions consume stack frames in Node/Chrome. Don't rely on TCO; convert recursion to iteration when depth can be large.

---

## 3. Design / System-Flavored

---

### Q15. How is a linked list used in an LRU cache?

LRU = **Least Recently Used** eviction.

**Required operations** in O(1):
- `get(key)`: move accessed item to "most recent" end.
- `put(key, val)`: add to most recent; if over capacity, evict from "least recent" end.

**Design**: **HashMap + Doubly Linked List**.
- HashMap: `key → node` for O(1) lookup.
- DLL: ordering by recency. Most recent at head, least recent at tail.
- DLL needed because we must **detach a node from the middle in O(1)** (singly can't without prev).

This is the reason DLL exists in practice — it powers most caches.

---

### Q16. How is a linked list used in OS / kernel data structures?

- **Free lists** in memory allocators (`malloc` / `free`) — chunks of free memory linked together.
- **Process scheduling queues** — runnable processes in a circular linked list, scheduler rotates.
- **File system buffer cache** (LRU as above).
- **Linux kernel's `list_head`** — intrusive doubly linked lists embedded into structs to avoid extra allocations.

**Why intrusive**: in C, you embed `next`/`prev` directly in the struct rather than wrapping it in a separate `Node`. Saves one allocation and one pointer dereference per access.

---

### Q17. What is a Skip List? When is it useful?

A linked list with multiple **levels of forward pointers**. Each level skips over more elements than the level below, enabling **O(log n)** search/insert/delete.

```
Level 3:  HEAD ──────────────── 30 ──────────── null
Level 2:  HEAD ──── 10 ──────── 30 ──────────── null
Level 1:  HEAD → 5 → 10 → 20 → 30 → 40 → 50 → null
```

**Why it matters**:
- Simpler than balanced BSTs (no rotations).
- Great for concurrent data structures (lock-free skip lists exist).
- Used in Redis (`ZSET`), LevelDB / RocksDB memtables.

**Probabilistic balancing**: each insertion picks its top level by coin flips → expected O(log n) without bookkeeping.

---

### Q18. What's an "intrusive" linked list?

The `next`/`prev` pointers live **inside the data struct itself**, not in a wrapper `Node`:

```c
struct task {
  int pid;
  char name[32];
  struct task *next;     // intrusive
};
```

vs. non-intrusive (typical OOP / JS):

```js
class Node { constructor(task) { this.val = task; this.next = null; } }
```

**Pros of intrusive**: no extra allocation, fewer pointer chases, same struct can be in multiple lists (e.g., `runnable_next`, `cpu_local_next`). Used heavily in Linux kernel.

**Pros of non-intrusive**: the data struct is independent of how it's stored; same data can sit in lists, arrays, sets without modification.

---

## 4. JavaScript-Specific

---

### Q19. Are linked lists "natural" in JS?

JS has no built-in linked list — you build it from objects. The runtime treats `{ val, next }` as a regular object, with all the overhead (hidden class, GC tracking, boxing).

**Performance hit vs an array**: typically 5–20× slower iteration in benchmarks because of cache misses + object overhead.

**Use them anyway when**:
- Algorithm fundamentally needs them (LRU, problem says "linked list").
- You're solving LeetCode-style problems where the input is given as a `ListNode`.

---

### Q20. Garbage collection and linked lists — anything to watch out for?

1. **Cycles are fine** — V8 uses tracing GC (mark-and-sweep), not refcounting. Cyclic links don't leak.
2. **Detached subgraphs are collected automatically** — when you remove a node, its `next` chain is collected only if no external references remain.
3. **Common leak**: holding a reference to the head while appending forever — list grows unbounded. Make sure to break references when "removing" from a queue.

---

### Q21. Why does LeetCode use `val` instead of `value`?

Convention from C++ STL (`std::list::value_type`) and Java (`AbstractList::get`). Short, established, fits the algorithm style. In real production JS code, prefer `value` for clarity.

---

## 5. Algorithm Patterns You Must Know

---

### Q22. Master patterns checklist.

| Pattern                       | Triggers                                                                   |
| ----------------------------- | -------------------------------------------------------------------------- |
| **Dummy head**                | Building a new list, head can change                                       |
| **Slow/Fast pointers**        | Find middle, cycle detect, palindrome, Nth from end                        |
| **3-pointer reversal**        | Reverse list / sublist / k-group                                           |
| **In-place rewiring**         | Reorder, partition, swap pairs                                             |
| **Merge with dummy**          | Merge sorted lists, sort lists                                             |
| **Hash map of original→copy** | Copy list with random pointer                                              |
| **Interleave + split**        | Copy with random pointer (O(1) space)                                      |
| **Recursive divide & merge**  | Sort linked list, merge k sorted lists                                     |

---

## 6. Trick / Gotcha Questions

---

### Q23. What's wrong here?

```js
function deleteNode(head, val) {
  let curr = head;
  while (curr.next) {
    if (curr.next.val === val) curr.next = curr.next.next;
    curr = curr.next;
  }
  return head;
}
```

**Bug**: when you delete `curr.next`, the next iteration jumps **two** nodes ahead instead of one — skipping the new `curr.next`.

**Fix**:

```js
while (curr.next) {
  if (curr.next.val === val) curr.next = curr.next.next;
  else curr = curr.next;
}
```

Plus this version doesn't handle deleting the head — use a **dummy node**.

---

### Q24. What does this print?

```js
function fn(head) {
  let p = head;
  while (p && p.next) p = p.next;
  return p;
}
```

Returns the **last** node (or `null` if list is empty).

**Common mistake**: writing `while (p.next)` without checking `p` first → throws on empty list.

---

### Q25. What's wrong with this reversal?

```js
function reverse(head) {
  let prev = null;
  while (head) {
    head.next = prev;
    prev = head;
    head = head.next;     // ← always null after the assignment above
  }
  return prev;
}
```

**Bug**: by the time we read `head.next`, we already overwrote it. Cache `next` first:

```js
while (head) {
  const next = head.next;
  head.next = prev;
  prev = head;
  head = next;
}
```

This bug is **the #1 mistake** on the reverse-linked-list question.

---

## 7. Quick-Fire Drills

| Question                                                     | Answer                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| Time to access nth element of a singly LL?                   | O(n)                                                           |
| Memory overhead per node vs array element?                   | ~5–10× (header + pointer)                                      |
| Does JS have a built-in LinkedList?                          | No — build from objects.                                       |
| Singly LL — can you delete a node in O(1) given only a pointer to it? | Only if it's not the tail (copy-next-and-skip trick).  |
| Doubly LL — can you delete a known node in O(1)?             | Yes — easy pointer surgery.                                    |
| What detects a cycle in O(1) space?                          | Floyd's tortoise & hare.                                       |
| Find middle in 1 pass?                                       | Slow/fast pointers.                                            |
| Reverse a LL in-place?                                       | 3-pointer iterative, O(n) time / O(1) space.                   |
| Recursive reverse stack space?                               | O(n).                                                          |
| Best LL for LRU cache?                                       | Doubly linked list (with hash map).                            |
| Best LL for round-robin scheduling?                          | Circular linked list.                                          |
| Best LL for ordered set with O(log n) ops?                   | Skip list.                                                     |
| Why is array iteration faster than LL?                       | Cache locality.                                                |
| Does V8 do tail-call optimization?                           | No.                                                            |
| Common "head can change" trick?                              | Use a dummy/sentinel node and return `dummy.next`.             |

---

## 8. Talking-Point Cheatsheet

When asked about linked lists, weave these in:

1. *"Linked lists trade access speed for cheap insertions — but they suffer in practice from cache misses."*
2. *"I always reach for a dummy/sentinel node when the head can change — eliminates head-special-case branches."*
3. *"Two-pointer techniques solve almost every single-pass linked list problem."*
4. *"Doubly linked lists are the secret sauce of LRU caches — O(1) detach a known node."*
5. *"For the in-place pointer-surgery problems, I name and write down each pointer before I move it. Saves bugs."*
6. *"Iterative beats recursive in production — V8 has no tail-call optimization."*
