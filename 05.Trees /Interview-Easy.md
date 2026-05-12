# Trees — Easy Interview Questions

> **Audience**: Junior / phone screen / first technical round.
> **Goal**: Master DFS recursion, BFS level traversal, the BST invariant, and the "return + accumulate" pattern.
> **Convention** (matches LeetCode):
>
> ```js
> class TreeNode {
>   constructor(val = 0, left = null, right = null) {
>     this.val = val; this.left = left; this.right = right;
>   }
> }
> ```

---

## Q1. Maximum Depth of Binary Tree

```js
function maxDepth(root) {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}
```

- **Time**: O(n) · **Space**: O(h) recursion stack
- **Foundational pattern**: every tree problem starts as `if (!root) return base; combine(left, right)`.

**Iterative BFS variant** (when depth could overflow stack):

```js
function maxDepth(root) {
  if (!root) return 0;
  let depth = 0, level = [root];
  while (level.length) {
    depth++;
    level = level.flatMap(n => [n.left, n.right].filter(Boolean));
  }
  return depth;
}
```

---

## Q2. Same Tree

```js
function isSameTree(p, q) {
  if (!p && !q) return true;
  if (!p || !q) return false;
  return p.val === q.val
      && isSameTree(p.left, q.left)
      && isSameTree(p.right, q.right);
}
```

- **Time**: O(min(m, n)) · **Space**: O(min(h_p, h_q))
- **Pattern**: structural equality — both base cases (null + null OK, single null fail).

---

## Q3. Symmetric Tree

> Is the tree a mirror of itself around the root?

```js
function isSymmetric(root) {
  function mirror(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.val === b.val
        && mirror(a.left, b.right)
        && mirror(a.right, b.left);
  }
  return !root || mirror(root.left, root.right);
}
```

- **Pattern**: same-tree comparator, but with **inverted child order** (`a.left ↔ b.right`).

---

## Q4. Invert Binary Tree

> Swap the left and right children of every node.

```js
function invertTree(root) {
  if (!root) return null;
  [root.left, root.right] = [invertTree(root.right), invertTree(root.left)];
  return root;
}
```

- **Time**: O(n) · **Space**: O(h)
- **Famous origin**: Max Howell (Homebrew creator) tweet — "Google: 90% of our engineers use the software you wrote, but you can't invert a binary tree on a whiteboard so f-off."

---

## Q5. Path Sum

> Does any **root-to-leaf** path sum to `target`?

```js
function hasPathSum(root, target) {
  if (!root) return false;
  if (!root.left && !root.right) return root.val === target;
  return hasPathSum(root.left,  target - root.val)
      || hasPathSum(root.right, target - root.val);
}
```

- **Time**: O(n) · **Space**: O(h)
- **Pitfall**: `if (!root) return target === 0` is wrong — it counts a "no path" as success. Must check leaf explicitly.

---

## Q6. Diameter of Binary Tree

> Length (in edges) of the longest path between any two nodes.

```js
function diameterOfBinaryTree(root) {
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

- **Time**: O(n) · **Space**: O(h)
- **Pattern**: **return one value, update another globally**. Most "longest path" tree problems follow this.
- **Pitfall**: returning `l + r` directly forgets that the path can lie entirely in a subtree.

---

## Q7. Balanced Binary Tree

> Height-balanced means every node's two subtrees differ in height by ≤ 1.

```js
function isBalanced(root) {
  function check(node) {
    if (!node) return 0;
    const l = check(node.left);
    if (l === -1) return -1;
    const r = check(node.right);
    if (r === -1 || Math.abs(l - r) > 1) return -1;
    return 1 + Math.max(l, r);
  }
  return check(root) !== -1;
}
```

- **Time**: O(n) — `-1` short-circuits.
- **Pattern**: encode "failure" as a sentinel return value to combine signal + state in one return.

---

## Q8. Merge Two Binary Trees

> Overlay two trees; if both have a node at the same position, sum values.

```js
function mergeTrees(a, b) {
  if (!a) return b;
  if (!b) return a;
  a.val += b.val;
  a.left  = mergeTrees(a.left,  b.left);
  a.right = mergeTrees(a.right, b.right);
  return a;
}
```

- **Time**: O(min(m, n)) · **Space**: O(min(h_a, h_b))
- **Note**: this mutates `a`. Returning a fresh tree is a follow-up to discuss.

---

## Q9. Binary Tree Inorder / Preorder / Postorder Traversal

> Recursive — covered in `binaryTree.js`. The interview version is the **iterative** form.

```js
function inorderTraversal(root) {
  const out = [], stack = [];
  let curr = root;
  while (curr || stack.length) {
    while (curr) { stack.push(curr); curr = curr.left; }
    curr = stack.pop();
    out.push(curr.val);
    curr = curr.right;
  }
  return out;
}

function preorderTraversal(root) {
  const out = [];
  if (!root) return out;
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    out.push(node.val);
    if (node.right) stack.push(node.right);
    if (node.left)  stack.push(node.left);
  }
  return out;
}

function postorderTraversal(root) {
  const out = [];
  if (!root) return out;
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    out.unshift(node.val);                 // reverse-preorder = postorder
    if (node.left)  stack.push(node.left);
    if (node.right) stack.push(node.right);
  }
  return out;
}
```

- **Time**: O(n) each · **Space**: O(h) explicit stack.
- **Why interviewers ask iterative**: tests whether you can simulate recursion without language support.

---

## Q10. Convert Sorted Array to BST

> Build a height-balanced BST from a sorted array.

```js
function sortedArrayToBST(nums) {
  function build(l, r) {
    if (l > r) return null;
    const m = (l + r) >> 1;
    return new TreeNode(nums[m], build(l, m - 1), build(m + 1, r));
  }
  return build(0, nums.length - 1);
}
```

- **Time**: O(n) · **Space**: O(log n)
- **Trick**: midpoint as root → balanced by construction.

---

## Q11. Search in BST

```js
function searchBST(root, val) {
  while (root) {
    if (root.val === val) return root;
    root = val < root.val ? root.left : root.right;
  }
  return null;
}
```

- **Time**: O(h) — O(log n) average, O(n) worst (skewed).
- **Iterative is preferred** — no recursion overhead, no overflow risk.

---

## Q12. Range Sum of BST

> Sum of all node values in `[low, high]`.

```js
function rangeSumBST(root, low, high) {
  if (!root) return 0;
  if (root.val < low)  return rangeSumBST(root.right, low, high);
  if (root.val > high) return rangeSumBST(root.left,  low, high);
  return root.val + rangeSumBST(root.left, low, high) + rangeSumBST(root.right, low, high);
}
```

- **Time**: O(n) worst, but **O(log n + k)** if balanced — prune entire subtrees outside the range.
- **Pattern**: BST's invariant lets you skip whole branches.

---

## Q13. Minimum Absolute Difference in BST

> Smallest `|node.val - other.val|` between any two nodes.

```js
function getMinimumDifference(root) {
  let prev = null, min = Infinity;
  function inorder(node) {
    if (!node) return;
    inorder(node.left);
    if (prev !== null) min = Math.min(min, node.val - prev);
    prev = node.val;
    inorder(node.right);
  }
  inorder(root);
  return min;
}
```

- **Time**: O(n) · **Space**: O(h)
- **Trick**: inorder = sorted values → minimum diff is between consecutive entries.

---

## Q14. Average of Levels in Binary Tree

```js
function averageOfLevels(root) {
  const out = [];
  let level = [root];
  while (level.length) {
    const sum = level.reduce((a, n) => a + n.val, 0);
    out.push(sum / level.length);
    level = level.flatMap(n => [n.left, n.right].filter(Boolean));
  }
  return out;
}
```

- **Time**: O(n) · **Space**: O(w) (max width)
- **Pattern**: level-by-level BFS aggregator.

---

## Q15. Subtree of Another Tree

> Is `subRoot` a structural subtree of `root` (matching values + structure)?

```js
function isSubtree(root, subRoot) {
  if (!root) return false;
  return isSameTree(root, subRoot)
      || isSubtree(root.left, subRoot)
      || isSubtree(root.right, subRoot);
}
function isSameTree(p, q) {
  if (!p && !q) return true;
  if (!p || !q) return false;
  return p.val === q.val
      && isSameTree(p.left, q.left)
      && isSameTree(p.right, q.right);
}
```

- **Time**: O(m · n) worst · **Space**: O(h)
- **Optimization (senior-level)**: serialize both trees, then a single substring check — O(m + n) with KMP.

---

## Patterns Cheatsheet (Easy)

| Pattern                            | Trigger                                                 | Examples here       |
| ---------------------------------- | ------------------------------------------------------- | ------------------- |
| **Top-down DFS**                   | Compute attribute from root down                        | Q1, Q2, Q3, Q5      |
| **Bottom-up DFS** (return + accum) | "Diameter / longest path / balance" — combine subtrees  | Q6, Q7, Q15         |
| **Mutate during recursion**        | Invert / merge / flatten                                | Q4, Q8              |
| **BST invariant pruning**          | Skip out-of-range branches                              | Q11, Q12, Q13       |
| **Level-by-level BFS**             | Per-level metrics                                       | Q14                 |
| **Inorder = sorted (BST)**         | Min difference, kth smallest, validate                  | Q13                 |
| **Iterative DFS with stack**       | Avoid recursion overflow                                | Q9                  |
| **Sentinel return** (`-1`)         | Encode "failure" in the same return type as success     | Q7                  |

---

## Common Interviewer Follow-Ups

1. *"Iterative version?"* — preorder/postorder via stack; inorder needs the dive-and-pivot pattern.
2. *"What about a very deep tree?"* — convert to iterative; trees up to 10K nodes can blow V8's call stack.
3. *"What if the BST has duplicates?"* — clarify whether duplicates go left or right; the invariant becomes `≤` or `≥`.
4. *"Can you do it in one pass?"* — return + accumulate via DFS.
5. *"Memory-constrained?"* — Morris traversal for inorder in O(1) extra space.
