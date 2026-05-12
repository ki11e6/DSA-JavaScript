# Trees — Theoretical / Conceptual Interview Questions

> **Audience**: All levels.
> **Goal**: Master tree types, traversal orders, recursion semantics, balance, and the when/why of each variant (BST, AVL, Red-Black, Trie, Segment, B-Tree).

---

## 1. Fundamentals

---

### Q1. What is a tree?

**Short**: A connected, **acyclic** collection of nodes where each non-root node has exactly **one parent**. Subset of graphs.

**Key terminology**:
- **Root**: the only node without a parent.
- **Leaf**: node without children.
- **Edge**: parent-child connection.
- **Depth** of a node: edge-distance from root (root has depth 0).
- **Height** of a node: edge-distance from node to its deepest leaf (leaf has height 0).
- **Height of tree**: height of the root = depth of the deepest leaf.

**Common confusion**: "depth" and "height" are *not* the same. A node has a depth (top-down) and a height (bottom-up).

---

### Q2. Tree types you must know.

| Type                    | Constraint                                                              |
| ----------------------- | ----------------------------------------------------------------------- |
| **Binary tree**         | Each node has ≤ 2 children                                              |
| **Full binary tree**    | Every node has 0 or 2 children (no single-child nodes)                  |
| **Complete binary tree**| All levels filled except possibly the last, which fills left-to-right   |
| **Perfect binary tree** | All internal nodes have 2 children; all leaves at the same depth        |
| **Balanced binary tree**| Height is O(log n); difference between left/right subtree heights bounded |
| **BST**                 | Binary tree with `left < node < right` invariant                        |
| **AVL / Red-Black**     | Self-balancing BSTs with O(log n) worst-case ops                        |
| **B-Tree / B+ Tree**    | n-ary, node holds many keys; used in databases & filesystems            |
| **Trie**                | n-ary, edges labeled by characters; for prefix search                   |
| **Heap**                | Complete binary tree with parent ≤/≥ children                           |
| **Segment Tree**        | Stores aggregates of array ranges for fast range-query                  |
| **N-ary tree**          | Each node has any number of children (e.g., DOM, file system)           |

---

### Q3. Why "complete" vs "perfect" vs "full"?

Common interview gotcha. Easy mnemonic:

```
Full     → 0 or 2 children only
Complete → packed left-to-right, last level may be partial
Perfect  → completely filled, all leaves same depth
```

**Why it matters**:
- A heap is a **complete** tree → array-backed with no gaps.
- A perfect binary tree of height h has exactly `2^(h+1) − 1` nodes.
- All perfect trees are complete; all complete trees are not perfect.

---

### Q4. What's the difference between depth and height?

```
            A   ← depth 0, height 2
           / \
          B   C ← depth 1, height 1
         /
        D       ← depth 2, height 0
```

- **Depth** = edges from root → node.
- **Height** = edges from node → deepest descendant.

For a tree of n nodes:
- A balanced tree has height **O(log n)**.
- A skewed tree (sorted-input BST) has height **O(n)**.
- A perfect tree of n nodes has height exactly **⌊log₂ n⌋**.

---

### Q5. What are the traversal orders, and what's each one used for?

| Traversal      | Visit Order            | Common Use                                  |
| -------------- | ---------------------- | ------------------------------------------- |
| **Preorder**   | root → left → right    | Copy/serialize a tree, prefix expressions   |
| **Inorder**    | left → root → right    | Sorted output of a BST                      |
| **Postorder**  | left → right → root    | Delete tree, postfix expressions, dependencies |
| **Level-order**| BFS (level-by-level)   | Shortest-path / level metrics, pretty print |

**Why inorder gives sorted output for BST**: by induction on the BST invariant — left subtree all < root, right subtree all > root.

---

### Q6. Recursive vs iterative tree traversal.

**Recursive** (the default):
- Pros: trivial code, mirrors the structure.
- Cons: O(h) stack — overflow on skewed trees of size > ~10K in Node.

**Iterative with explicit stack**:
- Pros: no risk of stack overflow; can pause/resume traversal.
- Cons: more code; inorder iterative is the trickiest.

**Morris traversal** (advanced):
- Threaded traversal — temporarily mutates `.right` pointers to act as predecessor links.
- O(n) time, **O(1) space**, no recursion.
- Senior-level "can you do it without recursion AND without a stack?" answer.

---

### Q7. Time / space complexity table.

| Operation              | BST avg  | BST worst | AVL / RB | Heap (binary) | Trie    |
| ---------------------- | -------- | --------- | -------- | ------------- | ------- |
| Search                 | O(log n) | O(n)      | O(log n) | O(n)          | O(L)    |
| Insert                 | O(log n) | O(n)      | O(log n) | O(log n)      | O(L)    |
| Delete                 | O(log n) | O(n)      | O(log n) | O(log n)      | O(L)    |
| Find min/max           | O(log n) | O(n)      | O(log n) | O(1) for one  | O(L)    |
| Range query            | O(log n + k) | —     | O(log n + k) | —         | —       |
| Sorted iteration       | O(n)     | O(n)      | O(n)     | —             | O(N)    |
| Memory                 | O(n)     | O(n)      | O(n)     | O(n)          | O(N)    |

(N = sum of all word lengths in the trie, L = single word length.)

---

## 2. BST-Specific

---

### Q8. What is the BST invariant, and why is it powerful?

**Invariant**: for every node, all values in the left subtree are **strictly less than** the node, and all values in the right subtree are **strictly greater than** the node.

**Why powerful**:
- Inorder traversal gives sorted output for free.
- Search/insert/delete each rule out half the tree per step → O(log n) on balanced trees.
- **Range queries** (e.g., "all values between l and r") are also O(log n + k).

---

### Q9. Why does BST degrade to O(n)?

Inserting **already-sorted** data builds a right-skewed tree → height = n → operations become O(n).

**Mitigations**:
- **Self-balancing variants**: AVL, Red-Black.
- **Random insertion order** if you control the input.
- **Treaps**: combine BST with random priorities for expected balance.

---

### Q10. How do you delete a node from a BST?

Three cases:

1. **Leaf**: just set parent's pointer to null.
2. **One child**: replace node with its child.
3. **Two children**: replace node with its **in-order successor** (or predecessor):
   - Successor = leftmost node of right subtree.
   - Copy successor's value to the node; recursively delete the successor (which now falls into case 1 or 2).

**Why successor (not arbitrary descendant)**: it preserves the BST invariant — successor is the smallest value still > everything in the left subtree.

---

### Q11. Validate BST — common mistake.

**Wrong**: comparing each node only to its immediate children.

```js
// ✗ buggy: passes for [10, 5, 15, null, null, 6, 20]
function isValidBST(node) {
  if (!node) return true;
  if (node.left && node.left.val >= node.val) return false;
  if (node.right && node.right.val <= node.val) return false;
  return isValidBST(node.left) && isValidBST(node.right);
}
```

The tree above has root 10 with right child 15. But 15's left child is **6** — less than 10! The BST invariant requires *every* descendant on the right to be > 10, not just immediate children.

**Correct — pass min/max bounds down**:

```js
function isValidBST(node, lo = -Infinity, hi = Infinity) {
  if (!node) return true;
  if (node.val <= lo || node.val >= hi) return false;
  return isValidBST(node.left, lo, node.val) &&
         isValidBST(node.right, node.val, hi);
}
```

---

## 3. Self-Balancing

---

### Q12. AVL vs Red-Black tree — when use which?

| Property                   | AVL                            | Red-Black                            |
| -------------------------- | ------------------------------ | ------------------------------------ |
| Strict balance             | `|h(L) - h(R)| ≤ 1`           | Black-height equal on every path     |
| Worst-case height          | ~1.44 · log n                  | ~2 · log n                           |
| Read performance           | **Faster** (more balanced)     | Slightly slower                      |
| Write performance          | More rotations on insert/delete | Fewer rotations → faster writes     |
| Used in                    | DBs that read-heavy             | Linux kernel (`fair scheduler`), Java `TreeMap`, C++ `std::map` |

**Heuristic**: read-heavy workloads → AVL; write-heavy → red-black. But in interviews you rarely have to pick — knowing the trade-off is enough.

---

### Q13. What are the four AVL rotation cases?

After insert/delete, if a node's balance factor is ±2:

1. **LL** (left-left heavy): single right rotation.
2. **RR** (right-right heavy): single left rotation.
3. **LR** (left-right): left rotation on left child, then right rotation on node.
4. **RL** (right-left): right rotation on right child, then left rotation on node.

**Pattern**: rotations turn a "zig" (LR/RL) into a "zig-zig" (LL/RR), then the single rotation handles it.

---

### Q14. Why does balancing keep operations O(log n)?

A binary tree of n nodes that's bounded in height by `c · log n` (for some constant c ≤ 2 in Red-Black, ≤ 1.44 in AVL) gives O(log n) for any root-to-leaf walk — which is what search, insert, and delete amount to.

**Key idea**: the rotations cost O(1) each, and at most O(log n) of them happen per insert/delete. Total work stays in O(log n).

---

## 4. Specialized Trees

---

### Q15. What is a Trie?

Tree where each **edge** is labeled with a character; each path from root to a marked node spells a stored word.

**Useful for**:
- Autocomplete (prefix search).
- Spell-checkers.
- IP routing tables (each bit = an edge label).
- Word puzzles like Boggle / Word Search II.

**Time**: O(L) per insert/search/prefix-match — independent of how many words are stored.

---

### Q16. What is a Segment Tree?

Tree (usually binary) where each node covers a **range** of an underlying array, storing some **aggregate** (sum, min, max, GCD).

**Use cases**:
- "What's the sum of `arr[l..r]`?" with O(log n) per query.
- "Update `arr[i] = v`" with O(log n) per update.
- "Find first position with value ≥ x" — also O(log n).

**Compared to Fenwick (BIT)**: segment tree is more flexible (any associative op), Fenwick is more compact (O(n) instead of O(4n) memory) but limited to invertible ops (sum, XOR).

---

### Q17. What is a B-Tree / B+ Tree, and why does the database use it?

**B-Tree**: balanced n-ary tree where each node holds many keys (typically 50–200) and many children. Minimizes tree height → minimizes disk I/O.

**Why DBs love it**:
- Disk reads happen in pages (~4–16 KB). One page can hold hundreds of keys.
- Tree height for 1 billion records is ~5 → at most 5 page reads per query.
- B+ Tree variant keeps all data in **leaves**, with leaves linked → super-fast range scans.

**Used in**: PostgreSQL, MySQL InnoDB, SQLite, NTFS, ext4, RocksDB SSTables (similar idea).

---

### Q18. What is a Heap, and how does it differ from a BST?

**Heap**: a complete binary tree with the **heap property** (parent ≤ or ≥ children).

**Differences from BST**:
- Heap orders only **vertically** (parent vs children); BST orders horizontally.
- Heap has O(1) access to min/max; BST takes O(log n).
- Heap doesn't support efficient search by value; BST does.

**Stored in an array** (no pointers) thanks to the complete-tree property.

---

## 5. Traversal & Algorithm Patterns

---

### Q19. The "DFS with return value" pattern.

For tree problems where each subtree contributes a result:

```js
function solve(root) {
  function dfs(node) {
    if (!node) return /* base value */;
    const left = dfs(node.left);
    const right = dfs(node.right);
    /* combine: aggregate or update an external answer */
    return /* what this subtree reports up */;
  }
  return dfs(root);
}
```

**Examples**:
- Diameter of Binary Tree (return depth, update global max).
- Maximum Path Sum (return single-path-down, update global max).
- LCA (return found ancestor or null).
- Balanced check (return height or `-1` for "imbalanced").

---

### Q20. The "level-by-level BFS" pattern.

For problems concerned with depths or per-level aggregates:

```js
function levels(root) {
  if (!root) return [];
  const out = [];
  let level = [root];
  while (level.length) {
    out.push(level.map(n => n.val));
    level = level.flatMap(n => [n.left, n.right].filter(Boolean));
  }
  return out;
}
```

**Examples**:
- Level Order Traversal.
- Right Side View.
- Average of Levels.
- Maximum Width of Binary Tree (with index-tracking).

---

### Q21. The "iterative inorder" pattern.

The trickiest of the iterative DFS variants:

```js
function inorder(root) {
  const out = [];
  const stack = [];
  let curr = root;
  while (curr || stack.length) {
    while (curr) { stack.push(curr); curr = curr.left; }   // dive left
    curr = stack.pop();
    out.push(curr.val);
    curr = curr.right;                                       // pivot to right subtree
  }
  return out;
}
```

**Why this matters**: Senior-level "find Kth smallest in BST in O(K) time" — stop early after K pops.

---

### Q22. Construct tree from traversals.

Given two traversals (preorder + inorder, or postorder + inorder), the tree is **uniquely determined**.

**Why preorder + inorder works**:
- First element of preorder = root.
- Find that root in inorder → everything left of it is the left subtree's inorder, everything right is the right subtree's inorder.
- Recurse on the partitions.

**Why preorder + postorder doesn't always work**: ambiguous when a node has only one child.

**Performance**: O(n) using a Map of `value → inorder index` for O(1) lookup.

---

## 6. Trick / Gotcha Questions

---

### Q23. What's wrong with this "tree height"?

```js
function height(root) {
  if (!root) return 1;                    // ✗
  return 1 + Math.max(height(root.left), height(root.right));
}
```

**Bug**: empty tree should have height 0, not 1. Convention varies, but the consistent one with leaf height 0 is:

```js
function height(root) {
  if (!root) return 0;
  return 1 + Math.max(height(root.left), height(root.right));
}
```

Or "number of edges" version: leaf height = 0; null = -1; `height = 1 + max(left, right)` → leaf = 1 + max(-1, -1) = 0. Pick a convention and state it out loud.

---

### Q24. Why doesn't this find the diameter?

```js
function diameter(root) {
  if (!root) return 0;
  return height(root.left) + height(root.right);
}
```

**Bug**: only considers paths through the root. The actual diameter might be entirely in a subtree.

**Fix**: recurse and return height; track diameter globally.

```js
function diameter(root) {
  let best = 0;
  function depth(node) {
    if (!node) return 0;
    const l = depth(node.left);
    const r = depth(node.right);
    best = Math.max(best, l + r);
    return 1 + Math.max(l, r);
  }
  depth(root);
  return best;
}
```

---

### Q25. Why this LCA implementation can return wrong results.

```js
function lca(root, p, q) {
  if (!root) return null;
  if (root.val === p.val || root.val === q.val) return root;
  const l = lca(root.left, p, q);
  const r = lca(root.right, p, q);
  if (l && r) return root;
  return l || r;
}
```

**Subtle bug**: comparing by `.val` not by node identity. If two nodes have the same value (which is allowed in the problem statement), we return wrong ancestor.

**Fix**: compare by reference — `if (root === p || root === q)`.

---

## 7. Quick-Fire Drills

| Question                                                    | Answer                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------ |
| Inorder of a BST?                                           | Sorted ascending.                                            |
| Preorder use case?                                          | Serialize / clone.                                           |
| Postorder use case?                                         | Delete / dependency resolution.                              |
| Height of a perfect tree of n nodes?                        | ⌊log₂ n⌋                                                     |
| Worst-case height of an unbalanced BST?                     | O(n)                                                         |
| AVL height bound?                                           | ~1.44 · log n                                                |
| Red-Black height bound?                                     | ~2 · log n                                                   |
| BST search complexity (average)?                            | O(log n)                                                     |
| Array vs LL queue for BFS?                                  | LL (or head index) — `arr.shift()` is O(n).                  |
| How to delete BST node with two children?                   | Replace with in-order successor (or predecessor).            |
| What is Morris traversal?                                   | O(1)-space inorder using temporary right-pointer threads.    |
| Trie operation cost?                                        | O(L), independent of n stored words.                         |
| Segment tree memory?                                        | ~4n.                                                         |
| Heap operation cost?                                        | O(log n).                                                    |
| Heapify time?                                               | O(n).                                                        |
| What's the connection between BST and merge sort?           | Inorder of BST = sorted output, similar invariants.          |
| Balanced BST → which JS library?                            | None native; use `Map` / `Set` (hash-based) or third-party.  |
| Skip-list height expectation?                               | O(log n) expected.                                           |

---

## 8. Talking-Point Cheatsheet

1. *"Recursion mirrors tree structure — but use iterative DFS for very deep trees to avoid stack overflow."*
2. *"BST gives you O(log n) average ops AND ordered traversal — that's the trade vs hash table."*
3. *"AVL is more strictly balanced than Red-Black — better for read-heavy workloads."*
4. *"Self-balancing variants guarantee O(log n) **worst case** — plain BST does not."*
5. *"For range queries with point updates, a segment tree gives you O(log n) on both — Fenwick if you only need invertible ops and want lower memory."*
6. *"Tries excel at prefix queries — autocomplete is O(L), independent of how many words you've stored."*
7. *"B-Trees in databases minimize disk I/O by packing many keys per node — height of 5 covers a billion rows."*
8. *"Inorder traversal of a BST is the canonical example of why the structure exists — it gives sorted output 'for free'."*
