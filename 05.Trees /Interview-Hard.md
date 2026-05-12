# Trees — Hard Interview Questions

> **Audience**: Senior / FAANG on-site final rounds.
> **Goal**: DFS state-passing for global optima, serialization, trie-driven search, segment trees, distance/cover problems requiring a parent map or DP.

---

## Q1. Binary Tree Maximum Path Sum

> Maximum sum of any path between any two nodes (path doesn't have to pass through the root).

```js
function maxPathSum(root) {
  let best = -Infinity;
  function gain(node) {
    if (!node) return 0;
    const l = Math.max(0, gain(node.left));        // ignore negative branches
    const r = Math.max(0, gain(node.right));
    best = Math.max(best, node.val + l + r);       // best path THROUGH this node
    return node.val + Math.max(l, r);              // max single-side return for parent
  }
  gain(root);
  return best;
}
```

- **Time**: O(n) · **Space**: O(h)
- **Pattern**: **return one thing, update another**. Each node returns "best one-sided extension"; meanwhile a global tracker considers the full through-path (`l + node + r`).
- **Pitfall**: include-vs-skip per child via `Math.max(0, ...)` — negative branches can hurt the path.

---

## Q2. Serialize and Deserialize Binary Tree

> Convert a tree to a string and back. Format is your choice — be consistent.

```js
function serialize(root) {
  if (!root) return 'X';
  return root.val + ',' + serialize(root.left) + ',' + serialize(root.right);
}

function deserialize(data) {
  const tokens = data.split(',');
  let i = 0;
  function build() {
    const t = tokens[i++];
    if (t === 'X') return null;
    return new TreeNode(+t, build(), build());
  }
  return build();
}
```

- **Time**: O(n) each direction · **Space**: O(n)
- **Pattern**: **preorder + null sentinel** uniquely reconstructs a tree. Inorder alone wouldn't work — you'd need two traversals.
- **Pitfall** in DFS deserialize: pass `i` by reference, not value. JS approach above uses an outer-scope counter.

**BFS variant** (LeetCode standard format): level-order with `'null'` for missing children.

---

## Q3. Word Search II — Trie + DFS

> Given an `m × n` board and a list of words, return all words that can be formed by adjacent (4-directional) cells, each cell used once.

```js
function findWords(board, words) {
  // 1. Build a trie
  const root = {};
  for (const w of words) {
    let node = root;
    for (const c of w) {
      if (!node[c]) node[c] = {};
      node = node[c];
    }
    node.word = w;
  }

  const out = [];
  const m = board.length, n = board[0].length;

  function dfs(r, c, node) {
    const ch = board[r][c];
    if (!ch || !node[ch]) return;
    const next = node[ch];
    if (next.word) { out.push(next.word); next.word = null; }   // dedup
    board[r][c] = null;                                         // mark visited
    if (r > 0)     dfs(r - 1, c, next);
    if (r < m - 1) dfs(r + 1, c, next);
    if (c > 0)     dfs(r, c - 1, next);
    if (c < n - 1) dfs(r, c + 1, next);
    board[r][c] = ch;                                           // backtrack
  }

  for (let r = 0; r < m; r++)
    for (let c = 0; c < n; c++)
      dfs(r, c, root);
  return out;
}
```

- **Time**: O(m · n · 4^L) where L is max word length.
- **Pattern**: trie prunes branches as soon as the path stops matching any prefix.
- **Optimization**: prune empty trie nodes after a successful match — saves work on subsequent traversals.

---

## Q4. Recover BST

> Two values in a BST were swapped by mistake. Recover without changing the structure.

```js
function recoverTree(root) {
  let prev = null, first = null, second = null;
  function inorder(node) {
    if (!node) return;
    inorder(node.left);
    if (prev && prev.val > node.val) {
      if (!first) first = prev;     // first violation: the LARGER of the swapped pair
      second = node;                 // last violation's right side: the SMALLER
    }
    prev = node;
    inorder(node.right);
  }
  inorder(root);
  [first.val, second.val] = [second.val, first.val];
}
```

- **Time**: O(n) · **Space**: O(h)
- **Insight**: inorder of a valid BST is strictly increasing. A single swap creates at most **two violations** (or one if the swapped pair was adjacent in inorder).

**Follow-up — O(1) space**: Morris traversal version.

---

## Q5. All Nodes Distance K in Binary Tree

> Find all nodes exactly `k` edges from `target`.

```js
function distanceK(root, target, k) {
  const parent = new Map();
  function annotate(node, p = null) {
    if (!node) return;
    parent.set(node, p);
    annotate(node.left,  node);
    annotate(node.right, node);
  }
  annotate(root);

  const visited = new Set([target]);
  let level = [target];
  for (let d = 0; d < k; d++) {
    const next = [];
    for (const n of level) {
      for (const nb of [n.left, n.right, parent.get(n)]) {
        if (nb && !visited.has(nb)) { visited.add(nb); next.push(nb); }
      }
    }
    level = next;
  }
  return level.map(n => n.val);
}
```

- **Time**: O(n) · **Space**: O(n)
- **Pattern**: build a **parent map** to convert the tree to an undirected graph, then BFS from `target`.

---

## Q6. Vertical Order Traversal of a Binary Tree

> Group nodes by column. Within a column, sort top-to-bottom; ties broken by smaller value first.

```js
function verticalTraversal(root) {
  const map = new Map();                            // col → [[row, val], ...]
  function dfs(node, r, c) {
    if (!node) return;
    if (!map.has(c)) map.set(c, []);
    map.get(c).push([r, node.val]);
    dfs(node.left,  r + 1, c - 1);
    dfs(node.right, r + 1, c + 1);
  }
  dfs(root, 0, 0);

  const cols = [...map.keys()].sort((a, b) => a - b);
  return cols.map(c =>
    map.get(c)
      .sort((a, b) => a[0] - b[0] || a[1] - b[1])
      .map(([, v]) => v)
  );
}
```

- **Time**: O(n log n) (sort dominates) · **Space**: O(n)
- **Pattern**: assign `(row, col)` per node; group by `col`, sort within.

---

## Q7. Range Sum Query — Mutable (Segment Tree)

> See `segmentTree.js` in this folder. Interview discussion is the trade vs **Fenwick (BIT)** vs **square-root decomposition**:

| Structure   | Update    | Range query | Space  | Flexibility           |
| ----------- | --------- | ----------- | ------ | --------------------- |
| Naive       | O(1)      | O(n)        | O(n)   | any                   |
| Sqrt-decomp | O(√n)     | O(√n)       | O(n)   | any                   |
| Fenwick     | O(log n)  | O(log n)    | O(n)   | invertible ops only   |
| **Segment** | O(log n)  | O(log n)    | O(4n)  | any associative op    |

For range **min/max** or generic ops → segment tree.
For pure **sum** with point updates → Fenwick (smaller, faster constant).

---

## Q8. Binary Tree Cameras

> Place the **minimum** number of cameras on tree nodes so that every node is monitored. A camera monitors itself, its parent, and its direct children.

```js
function minCameraCover(root) {
  let count = 0;
  // states:
  //   0 = needs a camera (this node is uncovered)
  //   1 = has a camera
  //   2 = covered (no camera here)
  function dfs(node) {
    if (!node) return 2;
    const l = dfs(node.left), r = dfs(node.right);
    if (l === 0 || r === 0) { count++; return 1; }     // a child needs me
    if (l === 1 || r === 1) return 2;                  // a child has a camera
    return 0;                                           // children are covered but don't help me
  }
  if (dfs(root) === 0) count++;                        // root still needs a camera
  return count;
}
```

- **Time**: O(n) · **Space**: O(h)
- **Pattern**: **post-order DP with a tri-state**. Each node decides based on what its children need.
- **Why greedy works**: a camera at a leaf is wasteful — placing it at the parent covers grandparent, parent, and leaves. The DFS encodes this.

---

## Q9. Lowest Common Ancestor of Deepest Leaves

> The smallest subtree that contains all of the deepest leaves.

```js
function lcaDeepestLeaves(root) {
  function dfs(node) {
    if (!node) return [null, 0];
    const [lNode, lDepth] = dfs(node.left);
    const [rNode, rDepth] = dfs(node.right);
    if (lDepth > rDepth) return [lNode, lDepth + 1];
    if (rDepth > lDepth) return [rNode, rDepth + 1];
    return [node, lDepth + 1];                          // depths equal → LCA is here
  }
  return dfs(root)[0];
}
```

- **Time**: O(n) · **Space**: O(h)
- **Pattern**: each subtree returns "(LCA-of-deepest-here, depth)". When children depths match, current is the LCA.

---

## Q10. Count of Smaller Numbers After Self (BST / Merge Sort)

> Already covered with merge sort in `01.Array/Interview-Hard.md`. **Tree variant** uses a BST augmented with `leftCount`:

```js
class CountNode {
  constructor(val) { this.val = val; this.left = null; this.right = null; this.leftCount = 0; }
}
function countSmaller(nums) {
  const out = new Array(nums.length).fill(0);
  let root = null;
  function insert(node, val, idx) {
    if (!node) return new CountNode(val);
    if (val <= node.val) {
      node.leftCount++;
      node.left = insert(node.left, val, idx);
    } else {
      out[idx] += node.leftCount + 1;                 // node.val is smaller, count it
      node.right = insert(node.right, val, idx);
    }
    return node;
  }
  for (let i = nums.length - 1; i >= 0; i--) root = insert(root, nums[i], i);
  return out;
}
```

- **Time**: O(n log n) average, O(n²) worst (skewed BST) · **Space**: O(n)
- **Insight**: walk right-to-left; for each insert, sum the `leftCount` of nodes you turn right at.
- **Robust version**: AVL / Red-Black for guaranteed O(n log n), or use Fenwick tree on coordinate-compressed values.

---

## Q11. Diameter of N-Ary Tree

> Generalize Diameter (`Easy Q6`) to a tree where each node has `.children: TreeNode[]`.

```js
function diameter(root) {
  let best = 0;
  function depth(node) {
    if (!node) return 0;
    const tops = node.children.map(depth);
    tops.sort((a, b) => b - a);
    const top1 = tops[0] ?? 0, top2 = tops[1] ?? 0;
    best = Math.max(best, top1 + top2);                // path through `node`
    return 1 + top1;
  }
  depth(root);
  return best;
}
```

- **Time**: O(n log k) where k is max children · **Space**: O(h)
- **Pattern**: same return + accumulate as binary diameter, but pick **two largest** child depths.

---

## Patterns Cheatsheet (Hard)

| Pattern                                | Trigger                                                              |
| -------------------------------------- | -------------------------------------------------------------------- |
| **Return single-extension, track global** | Max path sum, diameter — full path is `l + node + r`, return `node + max(l,r)` |
| **Preorder + null sentinel**           | Serialize / deserialize                                              |
| **Trie + DFS + backtrack**             | Word Search II, prefix-pruned grid search                            |
| **Inorder violation detection**        | Recover BST, validate invariants                                     |
| **Tree → graph via parent map**        | "All nodes distance K", undirected reachability                      |
| **(row, col) DFS + group/sort**        | Vertical / column-order traversals                                   |
| **Tri-state post-order DP**            | Tree DP problems like camera placement                               |
| **Augmented BST**                      | Range/order-statistic queries (kth, count smaller)                   |
| **Two largest children**               | Diameter on n-ary trees                                              |

---

## Senior Communication Tips

1. **State the recursion contract.** "Each call returns the best one-sided extension; the global maximum is updated to consider through-paths."
2. **Identify when to convert tree → graph.** Distance-K, infection-spread problems require traversal *upward*, so build a parent map.
3. **Pre-pruning vs post-pruning in tries.** Discuss memory vs CPU trade.
4. **For mutable range queries, justify segment tree over Fenwick** — based on operator (sum vs min vs gcd).
5. **State the inorder invariant for BST checks.** "Inorder must be strictly increasing" — every BST validation/recovery flows from this.
6. **Edge cases**: empty tree, single node, all left children, all right children, all values equal, very deep/skewed trees.
