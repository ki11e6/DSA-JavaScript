# LinkedList — Hard Interview Questions

> **Audience**: Senior / FAANG on-site final rounds.
> **Goal**: Deep pointer surgery, multi-data-structure design (DLL + hash + heap), invariant reasoning.
> **Convention**:
>
> ```js
> class ListNode {
>   constructor(val = 0, next = null) { this.val = val; this.next = next; }
> }
> ```

---

## Q1. Reverse Nodes in k-Group

> Reverse every k consecutive nodes. If the last group has fewer than k nodes, leave it as-is.

**Example**: `1→2→3→4→5, k=2` → `2→1→4→3→5`; `k=3` → `3→2→1→4→5`

#### Approach 1 — Iterative with Length Count (Standard)

```js
function reverseKGroup(head, k) {
  let len = 0, p = head;
  while (p) { len++; p = p.next; }

  const dummy = new ListNode(0, head);
  let prev = dummy;
  while (len >= k) {
    const curr = prev.next;
    let next = curr.next;
    for (let i = 1; i < k; i++) {
      curr.next = next.next;
      next.next = prev.next;
      prev.next = next;
      next = curr.next;
    }
    prev = curr;
    len -= k;
  }
  return dummy.next;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Pattern**: per-group "head insertion" reverse, just like Reverse Sublist (Medium).

#### Approach 2 — Recursive

```js
function reverseKGroup(head, k) {
  let p = head;
  for (let i = 0; i < k; i++) {
    if (!p) return head;     // fewer than k left → leave as-is
    p = p.next;
  }
  // reverse first k
  let prev = null, curr = head;
  for (let i = 0; i < k; i++) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  head.next = reverseKGroup(curr, k);
  return prev;
}
```

- **Time**: O(n) · **Space**: O(n / k) recursion depth

---

## Q2. Merge K Sorted Lists

> Merge `k` sorted lists into one sorted list. Total elements N.

#### Approach 1 — Naive Sequential Merge

- Merge 1 with 2, then result with 3, etc. **Time**: O(k·N) — bad.

#### Approach 2 — Min-Heap of Heads

```js
class MinHeap {
  constructor() { this.h = []; }
  push(node) {
    this.h.push(node);
    let i = this.h.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.h[p].val <= this.h[i].val) break;
      [this.h[p], this.h[i]] = [this.h[i], this.h[p]];
      i = p;
    }
  }
  pop() {
    if (!this.h.length) return null;
    const top = this.h[0];
    const last = this.h.pop();
    if (this.h.length) {
      this.h[0] = last;
      let i = 0, n = this.h.length;
      while (true) {
        const l = i * 2 + 1, r = l + 1;
        let s = i;
        if (l < n && this.h[l].val < this.h[s].val) s = l;
        if (r < n && this.h[r].val < this.h[s].val) s = r;
        if (s === i) break;
        [this.h[s], this.h[i]] = [this.h[i], this.h[s]];
        i = s;
      }
    }
    return top;
  }
  get size() { return this.h.length; }
}

function mergeKLists(lists) {
  const heap = new MinHeap();
  for (const l of lists) if (l) heap.push(l);
  const dummy = new ListNode();
  let tail = dummy;
  while (heap.size) {
    const node = heap.pop();
    tail.next = node;
    tail = node;
    if (node.next) heap.push(node.next);
  }
  return dummy.next;
}
```

- **Time**: O(N log k) · **Space**: O(k) heap
- **Why log k, not log N**: heap holds at most k nodes (one per list).

#### Approach 3 — Divide & Conquer (Pairwise Merge)

```js
function mergeKLists(lists) {
  if (!lists.length) return null;
  while (lists.length > 1) {
    const merged = [];
    for (let i = 0; i < lists.length; i += 2) {
      merged.push(mergeTwo(lists[i], lists[i + 1] ?? null));
    }
    lists = merged;
  }
  return lists[0];

  function mergeTwo(l1, l2) {
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
}
```

- **Time**: O(N log k) · **Space**: O(1) extra (no heap)
- **Why log k levels**: list count halves each round.
- **Recommended**: easier to write than the heap version under time pressure, same complexity.

---

## Q3. LFU Cache (Least-Frequently-Used)

> O(1) `get` and `put`. On eviction, remove the **least frequently used**; tiebreak by **least recently used**.

```js
class LFUNode {
  constructor(key, val) {
    this.key = key; this.val = val; this.freq = 1;
    this.prev = null; this.next = null;
  }
}
class DLL {
  constructor() {
    this.head = new LFUNode();
    this.tail = new LFUNode();
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.size = 0;
  }
  addFront(n) {
    n.prev = this.head; n.next = this.head.next;
    this.head.next.prev = n; this.head.next = n;
    this.size++;
  }
  remove(n) {
    n.prev.next = n.next; n.next.prev = n.prev;
    this.size--;
  }
  removeLast() {
    if (this.size === 0) return null;
    const n = this.tail.prev;
    this.remove(n);
    return n;
  }
}

class LFUCache {
  constructor(capacity) {
    this.cap = capacity;
    this.size = 0;
    this.minFreq = 0;
    this.keyToNode = new Map();      // key  → LFUNode
    this.freqToList = new Map();     // freq → DLL  (most recent at front)
  }
  _bump(node) {
    const oldList = this.freqToList.get(node.freq);
    oldList.remove(node);
    if (oldList.size === 0 && this.minFreq === node.freq) this.minFreq++;
    node.freq++;
    if (!this.freqToList.has(node.freq)) this.freqToList.set(node.freq, new DLL());
    this.freqToList.get(node.freq).addFront(node);
  }
  get(key) {
    if (!this.keyToNode.has(key)) return -1;
    const n = this.keyToNode.get(key);
    this._bump(n);
    return n.val;
  }
  put(key, val) {
    if (this.cap === 0) return;
    if (this.keyToNode.has(key)) {
      const n = this.keyToNode.get(key);
      n.val = val;
      this._bump(n);
      return;
    }
    if (this.size === this.cap) {
      const lru = this.freqToList.get(this.minFreq).removeLast();
      this.keyToNode.delete(lru.key);
      this.size--;
    }
    const n = new LFUNode(key, val);
    this.keyToNode.set(key, n);
    if (!this.freqToList.has(1)) this.freqToList.set(1, new DLL());
    this.freqToList.get(1).addFront(n);
    this.minFreq = 1;
    this.size++;
  }
}
```

- **Time**: O(1) per `get` / `put` · **Space**: O(capacity)
- **Key invariants**:
  - `keyToNode`: O(1) key lookup.
  - `freqToList[f]`: DLL of all nodes with frequency `f`, most-recent at front.
  - `minFreq`: smallest freq with a non-empty list.
- **Pitfall on `_bump`**: only increment `minFreq` if removing from the current min-freq list emptied it.

---

## Q4. Design Skiplist

> Implement `add`, `erase`, `search` with **O(log n)** expected time per op.

```js
const MAX_LEVEL = 16;
const P = 0.5;

class SkipNode {
  constructor(val, level) {
    this.val = val;
    this.next = Array(level).fill(null);
  }
}

class Skiplist {
  constructor() {
    this.head = new SkipNode(-Infinity, MAX_LEVEL);
    this.level = 1;
  }
  _randomLevel() {
    let l = 1;
    while (Math.random() < P && l < MAX_LEVEL) l++;
    return l;
  }
  search(target) {
    let curr = this.head;
    for (let i = this.level - 1; i >= 0; i--) {
      while (curr.next[i] && curr.next[i].val < target) curr = curr.next[i];
    }
    curr = curr.next[0];
    return !!(curr && curr.val === target);
  }
  add(num) {
    const update = Array(MAX_LEVEL).fill(this.head);
    let curr = this.head;
    for (let i = this.level - 1; i >= 0; i--) {
      while (curr.next[i] && curr.next[i].val < num) curr = curr.next[i];
      update[i] = curr;
    }
    const lvl = this._randomLevel();
    if (lvl > this.level) this.level = lvl;
    const node = new SkipNode(num, lvl);
    for (let i = 0; i < lvl; i++) {
      node.next[i] = update[i].next[i];
      update[i].next[i] = node;
    }
  }
  erase(num) {
    const update = Array(MAX_LEVEL).fill(this.head);
    let curr = this.head;
    for (let i = this.level - 1; i >= 0; i--) {
      while (curr.next[i] && curr.next[i].val < num) curr = curr.next[i];
      update[i] = curr;
    }
    curr = curr.next[0];
    if (!curr || curr.val !== num) return false;
    for (let i = 0; i < this.level; i++) {
      if (update[i].next[i] !== curr) break;
      update[i].next[i] = curr.next[i];
    }
    while (this.level > 1 && !this.head.next[this.level - 1]) this.level--;
    return true;
  }
}
```

- **Expected time**: O(log n) · **Space**: O(n) average, O(n log n) worst-case
- **Why probabilistic balancing works**: each level retains ~half the nodes, giving height O(log n) w.h.p.
- **Real-world use**: Redis sorted sets, LevelDB / RocksDB memtables.

---

## Q5. Convert Sorted Linked List to Binary Search Tree

> Build a height-balanced BST from a sorted linked list.

#### Approach — In-Order Construction (O(n) Time, O(log n) Space)

```js
function sortedListToBST(head) {
  let len = 0, p = head;
  while (p) { len++; p = p.next; }
  let curr = head;

  function build(n) {
    if (n <= 0) return null;
    const left = build(n >> 1);
    const node = new TreeNode(curr.val);
    curr = curr.next;
    node.left = left;
    node.right = build(n - (n >> 1) - 1);
    return node;
  }
  return build(len);
}
```

- **Time**: O(n) · **Space**: O(log n) recursion
- **Trick**: traverse the list in-order while constructing the tree top-down. Avoid the obvious O(n log n) "find middle each split" approach.

---

## Q6. Reverse Nodes in Even Length Groups

> Group sizes follow `1, 2, 3, 4, 5, …`. Reverse the group **only** if its length is **even**. The last group can be shorter.

**Example**: `5→2→6→3→9→1→7→3→8→4` →
- group sizes 1, 2, 3, 4 → 5 | 2,6 | 3,9,1 | 7,3,8,4
- last group (4) has length 4 (even) → reverse → 4,8,3,7
- group of 3 has length 3 (odd) → leave
- group of 2 has length 2 (even) → reverse → 6,2
- group of 1 has length 1 (odd) → leave
- → `5 → 6,2 → 3,9,1 → 4,8,3,7` = `5→6→2→3→9→1→4→8→3→7`

```js
function reverseEvenLengthGroups(head) {
  let prev = head;
  for (let target = 2; prev.next; target++) {
    let count = 0, p = prev;
    while (p.next && count < target) { p = p.next; count++; }
    if (count % 2 === 0) {
      // reverse `count` nodes after prev using head-insertion
      let curr = prev.next, next = curr.next;
      for (let i = 1; i < count; i++) {
        curr.next = next.next;
        next.next = prev.next;
        prev.next = next;
        next = curr.next;
      }
      prev = curr;             // tail of reversed group
    } else {
      prev = p;                // skip the odd group
    }
  }
  return head;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Pitfall**: the **actual** group size matters (last group may be shorter than the "target"), not the target size — that's why we count `count`, not `target`.

---

## Q7. All O(1) Data Structure

> Insert / delete / get min key / get max key, all O(1). Keys count their occurrence; on each call the count goes up or down. Get-min/max return any key with the smallest/largest count.

#### Design

- **HashMap** `key → DLLNode`.
- **DLL of "buckets"** sorted ascending by count. Each bucket holds a `Set<key>` of keys at that count.
- `inc(key)`: move key to bucket `count + 1` (create if missing), splice next to current bucket.
- `dec(key)`: similar, but key may disappear (count = 0).
- `getMaxKey()`: any key in the **last** bucket. `getMinKey()`: any key in the **first** bucket.

```js
class Bucket {
  constructor(count) {
    this.count = count;
    this.keys = new Set();
    this.prev = null;
    this.next = null;
  }
}

class AllOne {
  constructor() {
    this.head = new Bucket(0);
    this.tail = new Bucket(0);
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.map = new Map();   // key → Bucket
  }
  _insertAfter(node, b) {
    b.prev = node; b.next = node.next;
    node.next.prev = b; node.next = b;
  }
  _remove(b) {
    b.prev.next = b.next; b.next.prev = b.prev;
  }
  inc(key) {
    const cur = this.map.get(key);
    const newCount = cur ? cur.count + 1 : 1;
    let target = cur ? cur.next : this.head.next;
    if (target === this.tail || target.count !== newCount) {
      const b = new Bucket(newCount);
      this._insertAfter(cur ?? this.head, b);
      target = b;
    }
    target.keys.add(key);
    this.map.set(key, target);
    if (cur) {
      cur.keys.delete(key);
      if (!cur.keys.size) this._remove(cur);
    }
  }
  dec(key) {
    const cur = this.map.get(key);
    if (!cur) return;
    const newCount = cur.count - 1;
    if (newCount === 0) {
      this.map.delete(key);
    } else {
      let target = cur.prev;
      if (target === this.head || target.count !== newCount) {
        const b = new Bucket(newCount);
        this._insertAfter(cur.prev, b);
        target = b;
      }
      target.keys.add(key);
      this.map.set(key, target);
    }
    cur.keys.delete(key);
    if (!cur.keys.size) this._remove(cur);
  }
  getMaxKey() {
    if (this.tail.prev === this.head) return '';
    return this.tail.prev.keys.values().next().value;
  }
  getMinKey() {
    if (this.head.next === this.tail) return '';
    return this.head.next.keys.values().next().value;
  }
}
```

- **Time**: O(1) per op · **Space**: O(unique keys)
- **Why a DLL of buckets**: count changes are always **±1**, so the new bucket is always **adjacent** to the current one — we can splice in O(1) without searching.

---

## Q8. Sort a Linked List with O(1) Extra (Bottom-Up Merge Sort)

> Merge sort without recursion stack overhead.

```js
function sortListBottomUp(head) {
  if (!head || !head.next) return head;
  let len = 0, p = head;
  while (p) { len++; p = p.next; }

  const dummy = new ListNode(0, head);
  for (let size = 1; size < len; size *= 2) {
    let prev = dummy, curr = dummy.next;
    while (curr) {
      const left = curr;
      const right = split(left, size);
      curr = split(right, size);
      prev = mergeInto(prev, left, right);
    }
  }
  return dummy.next;
}
function split(head, n) {
  while (--n && head) head = head.next;
  if (!head) return null;
  const rest = head.next;
  head.next = null;
  return rest;
}
function mergeInto(prev, l1, l2) {
  let tail = prev;
  while (l1 && l2) {
    if (l1.val <= l2.val) { tail.next = l1; l1 = l1.next; }
    else                  { tail.next = l2; l2 = l2.next; }
    tail = tail.next;
  }
  tail.next = l1 || l2;
  while (tail.next) tail = tail.next;
  return tail;
}
```

- **Time**: O(n log n) · **Space**: O(1) (no recursion)
- **Use case**: massive lists where the recursion stack of the standard sort would overflow.

---

## Patterns Cheatsheet (Hard)

| Pattern                           | Trigger                                                              |
| --------------------------------- | -------------------------------------------------------------------- |
| Per-group head-insertion reverse  | k-group reverse, even-length-group reverse                           |
| Min-heap of list heads            | Merge k sorted streams                                               |
| Pairwise divide & conquer         | Merge k sorted streams without a heap                                |
| Hash + multiple DLLs              | LFU cache, AllO(1)                                                   |
| Bucket DLL of adjacent counts     | O(1) min/max queries with ±1 updates (AllO(1))                       |
| Probabilistic levels              | Skip list                                                            |
| Inorder build during traversal    | Sorted LL → balanced BST in O(n)                                     |
| Bottom-up iterative merge sort    | O(1)-stack sort of huge lists                                        |

---

## Senior Communication Tips

1. **Define invariants first.** "DLL holds nodes most-recent-first, bucket of count c holds all keys with that count." Bugs nearly disappear when invariants are explicit.
2. **State worst-case AND expected.** Skip lists are O(log n) **expected** — interviewer will probe.
3. **Discuss what fails under concurrency.** LFU/LRU caches need fine-grained locking or lock-free structures in production.
4. **Mention the alternatives you ruled out.** "I could use a balanced BST here, but a skip list is simpler to implement and has the same asymptotic performance."
5. **Edge cases for caches**: capacity 0, repeated puts of same key, get on missing key, eviction tiebreak.
