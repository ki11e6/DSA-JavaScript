# LinkedList — Medium Interview Questions

> **Audience**: Mid-level / on-site rounds.
> **Goal**: Combine multiple LL techniques (split + reverse + merge, hash + rewire, dummy nodes for in-place rebuilds).
> **Convention**:
>
> ```js
> class ListNode {
>   constructor(val = 0, next = null) { this.val = val; this.next = next; }
> }
> ```

---

## Q1. Add Two Numbers

> Two non-empty lists represent non-negative integers, **LSB first**. Add and return as a list.

**Example**: `2→4→3` + `5→6→4` → `7→0→8` (342 + 465 = 807)

```js
function addTwoNumbers(l1, l2) {
  const dummy = new ListNode();
  let tail = dummy, carry = 0;
  while (l1 || l2 || carry) {
    const sum = (l1?.val ?? 0) + (l2?.val ?? 0) + carry;
    carry = sum >= 10 ? 1 : 0;
    tail.next = new ListNode(sum % 10);
    tail = tail.next;
    l1 = l1?.next;
    l2 = l2?.next;
  }
  return dummy.next;
}
```

- **Time**: O(max(m, n)) · **Space**: O(max(m, n)) for output
- **Pitfall**: Don't forget the final carry — `9→9 + 1 = 0→0→1`.

---

## Q2. Add Two Numbers II (MSB First)

> Same problem, but digits are **MSB first**. **Don't modify the inputs.**

**Example**: `7→2→4→3` + `5→6→4` → `7→8→0→7`

#### Approach 1 — Reverse, Add, Reverse

- Reverse both, run Q1, reverse result. Mutates inputs unless you clone first.

#### Approach 2 — Stacks (No Mutation)

```js
function addTwoNumbersII(l1, l2) {
  const s1 = [], s2 = [];
  while (l1) { s1.push(l1.val); l1 = l1.next; }
  while (l2) { s2.push(l2.val); l2 = l2.next; }
  let head = null, carry = 0;
  while (s1.length || s2.length || carry) {
    const sum = (s1.pop() ?? 0) + (s2.pop() ?? 0) + carry;
    carry = sum >= 10 ? 1 : 0;
    head = new ListNode(sum % 10, head);   // build at head — auto-MSB-first
  }
  return head;
}
```

- **Time**: O(m + n) · **Space**: O(m + n)
- **Trick**: building the result list **at the head** with `new ListNode(v, head)` reverses naturally.

---

## Q3. Reverse Linked List II (Sublist Reverse)

> Reverse from position `left` to `right` (1-indexed). One pass.

**Example**: `1→2→3→4→5, left=2, right=4` → `1→4→3→2→5`

```js
function reverseBetween(head, left, right) {
  if (left === right) return head;
  const dummy = new ListNode(0, head);
  let prev = dummy;
  for (let i = 1; i < left; i++) prev = prev.next;     // prev at left-1
  const curr = prev.next;
  for (let i = 0; i < right - left; i++) {
    const next = curr.next;
    curr.next = next.next;
    next.next = prev.next;
    prev.next = next;
  }
  return dummy.next;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Pattern**: "Head insertion" — repeatedly take `curr.next` and move it just after `prev`.

---

## Q4. Reorder List

> `L0 → L1 → … → Ln−1 → Ln` becomes `L0 → Ln → L1 → Ln−1 → L2 → Ln−2 → …` **In place.**

**Example**: `1→2→3→4→5` → `1→5→2→4→3`

```js
function reorderList(head) {
  if (!head || !head.next) return;

  // 1. Find first middle
  let slow = head, fast = head;
  while (fast.next && fast.next.next) {
    slow = slow.next; fast = fast.next.next;
  }

  // 2. Reverse second half
  let prev = null, curr = slow.next;
  slow.next = null;
  while (curr) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }

  // 3. Merge alternately
  let l1 = head, l2 = prev;
  while (l2) {
    const t1 = l1.next, t2 = l2.next;
    l1.next = l2; l2.next = t1;
    l1 = t1; l2 = t2;
  }
}
```

- **Time**: O(n) · **Space**: O(1)
- **Pattern**: 3-step combo — find middle + reverse + merge — appears across many "fold this list" problems.

---

## Q5. Sort List

> Sort a linked list in O(n log n) time and **O(1) extra (non-stack)** space.

```js
function sortList(head) {
  if (!head || !head.next) return head;
  // split at first middle
  let slow = head, fast = head;
  while (fast.next && fast.next.next) {
    slow = slow.next; fast = fast.next.next;
  }
  const second = slow.next;
  slow.next = null;
  return merge(sortList(head), sortList(second));
}

function merge(l1, l2) {
  const dummy = new ListNode();
  let tail = dummy;
  while (l1 && l2) {
    if (l1.val <= l2.val) { tail.next = l1; l1 = l1.next; }
    else                  { tail.next = l2; l2 = l2.next; }
    tail = tail.next;
  }
  tail.next = l1 || l2;
  return dummy.next;
}
```

- **Time**: O(n log n) · **Space**: O(log n) recursion stack
- **Why merge sort, not quicksort**: arrays favor quicksort because of in-place partitioning + cache; linked lists have no random access, so partitioning is awkward. Merge sort splits cleanly and merges in O(1) extra by rewiring pointers.

**Follow-up — true O(1) space**: bottom-up merge sort (iterative pass with subarray sizes 1, 2, 4, …) avoids the recursion stack.

---

## Q6. Copy List with Random Pointer

> Each node has `val`, `next`, and `random` (points anywhere or `null`). Deep copy the list.

#### Approach 1 — Hash Map (Two Passes)

```js
function copyRandomList(head) {
  if (!head) return null;
  const map = new Map();
  let curr = head;
  while (curr) { map.set(curr, new Node(curr.val)); curr = curr.next; }
  curr = head;
  while (curr) {
    map.get(curr).next   = map.get(curr.next)   ?? null;
    map.get(curr).random = map.get(curr.random) ?? null;
    curr = curr.next;
  }
  return map.get(head);
}
```

- **Time**: O(n) · **Space**: O(n)

#### Approach 2 — Interleave + Split (O(1) Extra Space)

```js
function copyRandomList(head) {
  if (!head) return null;

  // 1. Insert each copy right after its original: A→A'→B→B'→…
  let curr = head;
  while (curr) {
    const copy = new Node(curr.val);
    copy.next = curr.next;
    curr.next = copy;
    curr = copy.next;
  }

  // 2. Set random on copies (copy of X is X.next)
  curr = head;
  while (curr) {
    if (curr.random) curr.next.random = curr.random.next;
    curr = curr.next.next;
  }

  // 3. Split into original and copy
  curr = head;
  const copyHead = head.next;
  while (curr) {
    const copy = curr.next;
    curr.next = copy.next;
    copy.next = copy.next?.next ?? null;
    curr = curr.next;
  }
  return copyHead;
}
```

- **Time**: O(n) · **Space**: O(1) extra

---

## Q7. Rotate List by k

> Rotate to the right by k places.

**Example**: `1→2→3→4→5, k=2` → `4→5→1→2→3`

```js
function rotateRight(head, k) {
  if (!head || !head.next || k === 0) return head;
  let len = 1, tail = head;
  while (tail.next) { tail = tail.next; len++; }
  k %= len;
  if (k === 0) return head;
  let newTail = head;
  for (let i = 0; i < len - k - 1; i++) newTail = newTail.next;
  const newHead = newTail.next;
  newTail.next = null;
  tail.next = head;
  return newHead;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Pitfall**: `k %= len` first — k can be larger than length.

---

## Q8. Partition List

> Reorder so all nodes `< x` come before nodes `≥ x`. Preserve relative order in each group.

**Example**: `1→4→3→2→5→2, x=3` → `1→2→2→4→3→5`

```js
function partition(head, x) {
  const beforeDummy = new ListNode(), afterDummy = new ListNode();
  let before = beforeDummy, after = afterDummy;
  while (head) {
    if (head.val < x) { before.next = head; before = before.next; }
    else              { after.next  = head; after  = after.next; }
    head = head.next;
  }
  after.next = null;                       // critical to terminate
  before.next = afterDummy.next;
  return beforeDummy.next;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Pitfall**: Without `after.next = null`, the tail may still point into the original list → cycle.

---

## Q9. Odd Even Linked List

> Reorder so odd-indexed nodes come before even-indexed nodes (1-indexed by position, not value).

**Example**: `1→2→3→4→5` → `1→3→5→2→4`

```js
function oddEvenList(head) {
  if (!head) return null;
  let odd = head, even = head.next, evenHead = even;
  while (even && even.next) {
    odd.next  = even.next;  odd  = odd.next;
    even.next = odd.next;   even = even.next;
  }
  odd.next = evenHead;
  return head;
}
```

- **Time**: O(n) · **Space**: O(1)

---

## Q10. Swap Nodes in Pairs

> Swap every two adjacent nodes. **Don't just swap values.**

**Example**: `1→2→3→4` → `2→1→4→3`

```js
function swapPairs(head) {
  const dummy = new ListNode(0, head);
  let prev = dummy;
  while (prev.next && prev.next.next) {
    const a = prev.next, b = a.next;
    a.next = b.next;
    b.next = a;
    prev.next = b;
    prev = a;
  }
  return dummy.next;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Recursive variant**: cleaner but O(n) stack.

```js
function swapPairs(head) {
  if (!head || !head.next) return head;
  const second = head.next;
  head.next = swapPairs(second.next);
  second.next = head;
  return second;
}
```

---

## Q11. Insertion Sort List

```js
function insertionSortList(head) {
  const dummy = new ListNode();
  let curr = head;
  while (curr) {
    const next = curr.next;
    let p = dummy;
    while (p.next && p.next.val < curr.val) p = p.next;
    curr.next = p.next;
    p.next = curr;
    curr = next;
  }
  return dummy.next;
}
```

- **Time**: O(n²) worst (already sorted descending) · **Space**: O(1)
- **Optimization for nearly-sorted**: maintain a pointer to the last sorted tail; only rewind to dummy when the new element is smaller than the tail.

---

## Q12. Remove Duplicates from Sorted List II

> Delete **all** nodes that have duplicates — leave only distinct values.

**Example**: `1→2→3→3→4→4→5` → `1→2→5`

```js
function deleteDuplicates(head) {
  const dummy = new ListNode(0, head);
  let prev = dummy;
  while (prev.next) {
    if (prev.next.next && prev.next.val === prev.next.next.val) {
      const dup = prev.next.val;
      while (prev.next && prev.next.val === dup) prev.next = prev.next.next;
    } else {
      prev = prev.next;
    }
  }
  return dummy.next;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Trick**: dummy is essential — the duplicate group might start at the head.

---

## Q13. LRU Cache

> Design a Least-Recently-Used cache with O(1) `get` and `put`.

#### Approach 1 — JS Map (preserves insertion order)

```js
class LRUCache {
  constructor(capacity) { this.cap = capacity; this.map = new Map(); }
  get(key) {
    if (!this.map.has(key)) return -1;
    const v = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, v);          // re-insert → moves to end (most recent)
    return v;
  }
  put(key, val) {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size === this.cap) this.map.delete(this.map.keys().next().value);
    this.map.set(key, val);
  }
}
```

- **Time**: O(1) per op · **Space**: O(capacity)
- **Why this works in JS**: `Map` iteration order is insertion order; `keys().next().value` gives the oldest key.

#### Approach 2 — HashMap + Doubly Linked List (Language-Agnostic Answer)

```js
class DLLNode {
  constructor(key, val) { this.key = key; this.val = val; this.prev = null; this.next = null; }
}
class LRUCache {
  constructor(capacity) {
    this.cap = capacity;
    this.map = new Map();
    this.head = new DLLNode();      // dummy head (most recent side)
    this.tail = new DLLNode();      // dummy tail (least recent side)
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }
  _remove(n) { n.prev.next = n.next; n.next.prev = n.prev; }
  _addFront(n) {
    n.prev = this.head;
    n.next = this.head.next;
    this.head.next.prev = n;
    this.head.next = n;
  }
  get(key) {
    if (!this.map.has(key)) return -1;
    const n = this.map.get(key);
    this._remove(n); this._addFront(n);
    return n.val;
  }
  put(key, val) {
    if (this.map.has(key)) {
      const n = this.map.get(key);
      n.val = val;
      this._remove(n); this._addFront(n);
      return;
    }
    if (this.map.size === this.cap) {
      const lru = this.tail.prev;
      this._remove(lru);
      this.map.delete(lru.key);
    }
    const n = new DLLNode(key, val);
    this._addFront(n);
    this.map.set(key, n);
  }
}
```

- **Time**: O(1) per op · **Space**: O(capacity)
- **Why DLL not singly LL**: O(1) detach of a known node requires `prev`.
- **Interview tip**: present the manual version unless explicitly told JS Map tricks are fine — most interviewers want to see you handle the data structures.

---

## Q14. Linked List Random Node (Reservoir Sampling)

> Return a random node from the list with **uniform probability**. Length is unknown / very large; can't precompute.

```js
class Solution {
  constructor(head) { this.head = head; }
  getRandom() {
    let result = this.head.val, n = 1, curr = this.head.next;
    while (curr) {
      n++;
      if (Math.floor(Math.random() * n) === 0) result = curr.val;
      curr = curr.next;
    }
    return result;
  }
}
```

- **Time**: O(n) per call · **Space**: O(1)
- **Why uniform**: the i-th node is kept with probability `1/i × (i/(i+1)) × … × (n−1/n) = 1/n`.

---

## Q15. Flatten a Multilevel Doubly Linked List

> Each node has `prev`, `next`, and `child`. Flatten to a single-level doubly linked list.

```js
function flatten(head) {
  if (!head) return null;
  const stack = [];
  let curr = head;
  while (curr) {
    if (curr.child) {
      if (curr.next) stack.push(curr.next);
      curr.next = curr.child;
      curr.child.prev = curr;
      curr.child = null;
    }
    if (!curr.next && stack.length) {
      const next = stack.pop();
      curr.next = next;
      next.prev = curr;
    }
    curr = curr.next;
  }
  return head;
}
```

- **Time**: O(n) · **Space**: O(d) where d is max depth
- **Pattern**: DFS via explicit stack to flatten a tree-shaped list.

---

## Patterns Cheatsheet (Medium)

| Pattern                            | Trigger                                                         | Examples here     |
| ---------------------------------- | --------------------------------------------------------------- | ----------------- |
| Two dummies (split → splice)       | Partitioning into two groups in order                           | Q8, Q9            |
| Reverse with head-insertion        | In-place sublist reverse                                        | Q3                |
| Find middle + reverse + merge      | Reorder, palindrome (Easy), folding problems                    | Q4                |
| Recursive merge sort on LL         | Sort with O(log n) extra (no random access)                     | Q5                |
| Interleave + split                 | Deep clone of structurally tangled lists                        | Q6                |
| Stacks for digit-by-digit MSB ops  | Add / subtract numbers stored MSB-first                         | Q2                |
| HashMap + DLL                      | O(1) cache / scheduler with arbitrary detach                    | Q13               |
| Reservoir sampling                 | Uniform random over unknown-length stream                       | Q14               |

---

## Common Interviewer Follow-Ups

1. *"What if the list is doubly linked?"* — most "find middle / reverse second half" tricks become unnecessary.
2. *"What's the recursion depth in the worst case?"* — for recursive solutions, state O(n) or O(log n) and explain stack growth.
3. *"What if memory is constrained?"* — push toward O(1) extra (e.g., interleave-and-split, bottom-up merge sort).
4. *"How would you make LRUCache thread-safe?"* — fine-grained locking around DLL operations, or lock-free CAS variants.
5. *"How would you test these?"* — empty list, single node, two nodes, all-equal values, palindrome, cycle, very long list (10⁶).
