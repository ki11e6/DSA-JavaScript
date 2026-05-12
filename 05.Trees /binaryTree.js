//! Binary Tree — Generic
//* Each node has at most TWO children: `left` and `right`.
//* Unlike a BST, no ordering invariant — this is just the shape.
//* Useful for: expression trees, DOM trees, decision trees, Huffman coding.
//*
//* Traversal complexities (n nodes, h height):
//*   Recursive DFS:  O(n) time, O(h) stack space   (h = log n balanced, n skewed)
//*   Iterative DFS:  O(n) time, O(h) explicit-stack space
//*   BFS:            O(n) time, O(w) queue space   (w = max width)

class TreeNode {
    constructor(val = 0, left = null, right = null) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

class BinaryTree {
    constructor(root = null) {
        this.root = root;
    }

    //! recursive DFS
    preorder(node = this.root, out = []) {           // root → left → right
        if (!node) return out;
        out.push(node.val);
        this.preorder(node.left, out);
        this.preorder(node.right, out);
        return out;
    }

    inorder(node = this.root, out = []) {            // left → root → right
        if (!node) return out;
        this.inorder(node.left, out);
        out.push(node.val);
        this.inorder(node.right, out);
        return out;
    }

    postorder(node = this.root, out = []) {          // left → right → root
        if (!node) return out;
        this.postorder(node.left, out);
        this.postorder(node.right, out);
        out.push(node.val);
        return out;
    }

    //! iterative DFS — useful when recursion depth would overflow
    preorderIter() {
        const out = [];
        if (!this.root) return out;
        const stack = [this.root];
        while (stack.length) {
            const node = stack.pop();
            out.push(node.val);
            if (node.right) stack.push(node.right);  // push right first so left is processed first
            if (node.left)  stack.push(node.left);
        }
        return out;
    }

    inorderIter() {
        const out = [];
        const stack = [];
        let curr = this.root;
        while (curr || stack.length) {
            while (curr) { stack.push(curr); curr = curr.left; }
            curr = stack.pop();
            out.push(curr.val);
            curr = curr.right;
        }
        return out;
    }

    postorderIter() {
        const out = [];
        if (!this.root) return out;
        const stack = [this.root];
        while (stack.length) {
            const node = stack.pop();
            out.unshift(node.val);                   // reverse-preorder = postorder
            if (node.left)  stack.push(node.left);
            if (node.right) stack.push(node.right);
        }
        return out;
    }

    //! BFS — level-order with a queue
    bfs() {
        const out = [];
        if (!this.root) return out;
        const queue = [this.root];
        while (queue.length) {
            const node = queue.shift();              // O(n); use a real queue for huge trees
            out.push(node.val);
            if (node.left)  queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
        return out;
    }

    //! BFS by levels — returns array of levels
    levelOrder() {
        const out = [];
        if (!this.root) return out;
        let level = [this.root];
        while (level.length) {
            out.push(level.map(n => n.val));
            const next = [];
            for (const n of level) {
                if (n.left)  next.push(n.left);
                if (n.right) next.push(n.right);
            }
            level = next;
        }
        return out;
    }

    height(node = this.root) {
        if (!node) return 0;
        return 1 + Math.max(this.height(node.left), this.height(node.right));
    }

    size(node = this.root) {
        if (!node) return 0;
        return 1 + this.size(node.left) + this.size(node.right);
    }
}

// const t = new BinaryTree(new TreeNode(1,
//   new TreeNode(2, new TreeNode(4), new TreeNode(5)),
//   new TreeNode(3)
// ));
// console.log(t.preorder());      // [1, 2, 4, 5, 3]
// console.log(t.inorder());       // [4, 2, 5, 1, 3]
// console.log(t.postorder());     // [4, 5, 2, 3, 1]
// console.log(t.bfs());           // [1, 2, 3, 4, 5]
// console.log(t.levelOrder());    // [[1], [2, 3], [4, 5]]

module.exports = { TreeNode, BinaryTree };
