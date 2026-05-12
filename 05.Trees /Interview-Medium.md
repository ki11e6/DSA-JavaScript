# Trees — Medium Interview Questions

> **Audience**: Mid-level / on-site rounds.
> **Goal**: Combine BFS with positional info, build trees from traversals, navigate BSTs by invariant, design tries.

---

## Q1. Binary Tree Level Order Traversal

```js
function levelOrder(root) {
  const out = [];
  if (!root) return out;
  let level = [root];
  while (level.length) {
    out.push(level.map(n => n.val));
    level = level.flatMap(n => [n.left, n.right].filter(Boolean));
  }
  return out;
}
```

- **Time**: O(n) · **Space**: O(w)
- **Foundation** for the next four problems.

---

## Q2. Binary Tree Zigzag Level Order Traversal

> Alternate left-to-right / right-to-left per level.

```js
function zigzagLevelOrder(root) {
  const out = [];
  if (!root) return out;
  let level = [root], leftToRight = true;
  while (level.length) {
    const vals = level.map(n => n.val);
    out.push(leftToRight ? vals : vals.reverse());
    level = level.flatMap(n => [n.left, n.right].filter(Boolean));
    leftToRight = !leftToRight;
  }
  return out;
}
```

- **Time**: O(n) · **Space**: O(w)

---

## Q3. Binary Tree Right Side View

> Values visible from the right side (rightmost node at each level).

```js
function rightSideView(root) {
  const out = [];
  if (!root) return out;
  let level = [root];
  while (level.length) {
    out.push(level[level.length - 1].val);
    level = level.flatMap(n => [n.left, n.right].filter(Boolean));
  }
  return out;
}
```

- **Time**: O(n) · **Space**: O(w)
- **Variant**: left side view → take `level[0]`.

---

## Q4. Construct Binary Tree from Preorder and Inorder

> Two unique-valued traversals uniquely determine the tree.

```js
function buildTree(preorder, inorder) {
  const idx = new Map();
  inorder.forEach((v, i) => idx.set(v, i));
  let pi = 0;
  function build(l, r) {
    if (l > r) return null;
    const v = preorder[pi++];
    const i = idx.get(v);
    return new TreeNode(v, build(l, i - 1), build(i + 1, r));
  }
  return build(0, inorder.length - 1);
}
```

- **Time**: O(n) · **Space**: O(n) for the index map
- **Insight**: preorder picks roots top-to-bottom; inorder splits at the picked root.

**Variant — postorder + inorder**: walk postorder backward (root → right → left); same idea.

---

## Q5. Path Sum II

> All root-to-leaf paths summing to `target`.

```js
function pathSum(root, target) {
  const out = [];
  function dfs(node, remaining, path) {
    if (!node) return;
    path.push(node.val);
    if (!node.left && !node.right && remaining === node.val) out.push([...path]);
    dfs(node.left, remaining - node.val, path);
    dfs(node.right, remaining - node.val, path);
    path.pop();                              // backtrack
  }
  dfs(root, target, []);
  return out;
}
```

- **Time**: O(n²) worst (each leaf path can be length n) · **Space**: O(h)
- **Pattern**: classic DFS + backtracking with shared `path` array.
- **Pitfall**: forget `path.pop()` → all leaf entries share the *full* path.

---

## Q6. Lowest Common Ancestor of a Binary Tree

```js
function lowestCommonAncestor(root, p, q) {
  if (!root || root === p || root === q) return root;
  const l = lowestCommonAncestor(root.left, p, q);
  const r = lowestCommonAncestor(root.right, p, q);
  if (l && r) return root;                   // p and q are in different subtrees
  return l || r;                              // both in one subtree (or not found)
}
```

- **Time**: O(n) · **Space**: O(h)
- **Why this works**: each recursive call returns "I found p or q in here" — when both children return non-null, the current node is the LCA.

---

## Q7. Lowest Common Ancestor of a BST

> The BST invariant gives us a faster algorithm.

```js
function lowestCommonAncestorBST(root, p, q) {
  while (root) {
    if (p.val < root.val && q.val < root.val) root = root.left;
    else if (p.val > root.val && q.val > root.val) root = root.right;
    else return root;
  }
  return null;
}
```

- **Time**: O(h) — O(log n) average · **Space**: O(1)
- **Insight**: LCA is the **first node** whose value is between `p.val` and `q.val` (inclusive).

---

## Q8. Validate BST

```js
function isValidBST(root, lo = -Infinity, hi = Infinity) {
  if (!root) return true;
  if (root.val <= lo || root.val >= hi) return false;
  return isValidBST(root.left,  lo, root.val)
      && isValidBST(root.right, root.val, hi);
}
```

- **Time**: O(n) · **Space**: O(h)
- **Pitfall**: comparing only against immediate children misses `[10, 5, 15, null, null, 6, 20]` — node 6 violates 10's right-subtree bound.

**Inorder alternative**: inorder must be strictly increasing.

---

## Q9. Kth Smallest Element in a BST

```js
function kthSmallest(root, k) {
  const stack = [];
  let curr = root;
  while (curr || stack.length) {
    while (curr) { stack.push(curr); curr = curr.left; }
    curr = stack.pop();
    if (--k === 0) return curr.val;
    curr = curr.right;
  }
}
```

- **Time**: O(h + k) · **Space**: O(h)
- **Pattern**: iterative inorder, **stop early** at the k-th pop.

**Follow-up — frequent kth queries**: augment each node with subtree size; descend by comparing k to `left.size + 1`. Reduces each query to O(h).

---

## Q10. Insert into a BST

```js
function insertIntoBST(root, val) {
  if (!root) return new TreeNode(val);
  if (val < root.val) root.left  = insertIntoBST(root.left,  val);
  else                root.right = insertIntoBST(root.right, val);
  return root;
}
```

- **Time**: O(h) · **Space**: O(h)

---

## Q11. Delete Node in a BST

```js
function deleteNode(root, key) {
  if (!root) return null;
  if (key < root.val)      root.left  = deleteNode(root.left,  key);
  else if (key > root.val) root.right = deleteNode(root.right, key);
  else {
    if (!root.left)  return root.right;       // 0 or 1 child
    if (!root.right) return root.left;
    let succ = root.right;                    // in-order successor
    while (succ.left) succ = succ.left;
    root.val   = succ.val;
    root.right = deleteNode(root.right, succ.val);
  }
  return root;
}
```

- **Time**: O(h) · **Space**: O(h)
- **Pattern**: replace node with **in-order successor** (or predecessor) in the two-child case.

---

## Q12. Flatten Binary Tree to Linked List

> In-place flatten so the tree is a right-only linked list in **preorder**.

```js
function flatten(root) {
  let prev = null;
  function dfs(node) {
    if (!node) return;
    dfs(node.right);
    dfs(node.left);
    node.right = prev;
    node.left = null;
    prev = node;
  }
  dfs(root);
}
```

- **Time**: O(n) · **Space**: O(h)
- **Insight**: walk in **reverse preorder** (right → left → root); link each node to the previously processed one.

---

## Q13. Implement Trie (Prefix Tree)

> See `trie.js` in this folder for the full implementation. The interview question is just the LeetCode contract:
>
> - `insert(word)`
> - `search(word)` — exact word stored?
> - `startsWith(prefix)` — any stored word starts with this prefix?
>
> All operations **O(L)** in the word/prefix length.

---

## Q14. Add and Search Word — `WordDictionary`

> Like Trie, but `search` supports `'.'` as a wildcard for any letter.

```js
class WordDictionary {
  constructor() { this.root = {}; }
  addWord(word) {
    let node = this.root;
    for (const c of word) {
      if (!node[c]) node[c] = {};
      node = node[c];
    }
    node.end = true;
  }
  search(word) {
    function dfs(node, i) {
      if (!node) return false;
      if (i === word.length) return !!node.end;
      const c = word[i];
      if (c === '.') {
        for (const k in node) if (k !== 'end' && dfs(node[k], i + 1)) return true;
        return false;
      }
      return dfs(node[c], i + 1);
    }
    return dfs(this.root, 0);
  }
}
```

- **Time**: `addWord` O(L); `search` O(26^d · L) worst (d = number of dots).
- **Pattern**: trie + DFS branching at wildcards.

---

## Q15. Path Sum III

> Count downward-only paths (any start, any end) that sum to `target`.

```js
function pathSumIII(root, target) {
  const counts = new Map([[0, 1]]);
  let total = 0;
  function dfs(node, sum) {
    if (!node) return;
    sum += node.val;
    total += counts.get(sum - target) ?? 0;
    counts.set(sum, (counts.get(sum) ?? 0) + 1);
    dfs(node.left,  sum);
    dfs(node.right, sum);
    counts.set(sum, counts.get(sum) - 1);    // backtrack
  }
  dfs(root, 0);
  return total;
}
```

- **Time**: O(n) · **Space**: O(h + n)
- **Pattern**: prefix-sum hash, exactly like the **Subarray Sum Equals K** trick on arrays — adapted to tree paths via DFS.
- **Pitfall**: forget the **backtracking** decrement → counts spill across siblings.

---

## Q16. Count Good Nodes in Binary Tree

> A node is "good" if no ancestor is **strictly greater** than it.

```js
function goodNodes(root) {
  let count = 0;
  function dfs(node, max) {
    if (!node) return;
    if (node.val >= max) count++;
    const m = Math.max(max, node.val);
    dfs(node.left, m);
    dfs(node.right, m);
  }
  dfs(root, -Infinity);
  return count;
}
```

- **Time**: O(n) · **Space**: O(h)
- **Pattern**: pass running max top-down; classic DFS with accumulating state.

---

## Q17. Maximum Width of Binary Tree

> Width of the widest level. Width = distance from leftmost to rightmost non-null node, including any nulls between them.

```js
function widthOfBinaryTree(root) {
  if (!root) return 0;
  let best = 0;
  let level = [[root, 0]];                   // [node, indexInPerfectTree]
  while (level.length) {
    const min = level[0][1];
    const max = level[level.length - 1][1];
    if (max - min + 1 > best) best = max - min + 1;
    const next = [];
    for (const [n, idx] of level) {
      if (n.left)  next.push([n.left,  (idx - min) * 2]);
      if (n.right) next.push([n.right, (idx - min) * 2 + 1]);
    }
    level = next;
  }
  return best;
}
```

- **Time**: O(n) · **Space**: O(w)
- **Trick**: position each node as if it were in a perfect tree. Subtract `min` per level to keep numbers small.

---

## Q18. Binary Tree Paths

> Return all root-to-leaf paths formatted as `"a->b->c"`.

```js
function binaryTreePaths(root) {
  const out = [];
  function dfs(node, path) {
    if (!node) return;
    const next = path ? path + '->' + node.val : '' + node.val;
    if (!node.left && !node.right) { out.push(next); return; }
    dfs(node.left, next);
    dfs(node.right, next);
  }
  dfs(root, '');
  return out;
}
```

- **Time**: O(n · h) (string copy) · **Space**: O(h)

---

## Patterns Cheatsheet (Medium)

| Pattern                                  | Trigger                                                | Examples here  |
| ---------------------------------------- | ------------------------------------------------------ | -------------- |
| **Level-by-level BFS aggregator**        | Per-level metrics                                      | Q1, Q2, Q3     |
| **Build via root-of-traversal split**    | Reconstruct from traversals                            | Q4             |
| **DFS + backtrack via shared path**      | Enumerate paths under a constraint                     | Q5, Q15, Q18   |
| **DFS returns null/found/ancestor**      | LCA-style ancestry questions                           | Q6             |
| **BST descent by comparison**            | Search/insert/delete/range queries                     | Q7, Q10, Q11   |
| **Bounds-passed-down validation**        | "Every node satisfies invariant relative to ancestors" | Q8, Q16        |
| **Iterative inorder with early exit**    | Kth smallest / first ≥ x in BST                        | Q9             |
| **Reverse preorder for in-place flatten**| Linearize a tree without aux                           | Q12            |
| **Trie + branching DFS**                 | Wildcard search                                        | Q13, Q14       |
| **Position-tracking BFS**                | Width / vertical / column-order                        | Q17            |

---

## Common Interviewer Follow-Ups

1. *"Iterative version?"* — preorder/postorder with stack; inorder via dive-and-pivot.
2. *"Avoid the call stack altogether?"* — Morris traversal (O(1) space inorder).
3. *"What if the BST is unbalanced?"* — discuss self-balancing variants (AVL/Red-Black).
4. *"What if the tree doesn't fit in memory?"* — external traversals: store children lazily, use disk-backed B-trees.
5. *"Multiple `kth smallest` queries?"* — augment each node with subtree size for O(h) per query.
