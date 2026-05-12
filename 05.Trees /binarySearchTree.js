//! Binary Search Tree (BST)
//* INVARIANT: every node's left subtree contains values < node, right contains values > node.
//* Operations average O(log n), worst O(n) when input is sorted (skews into a linked list).
//* No duplicates in this version — duplicates are silently ignored on insert.

class Node {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

class BinarySearchTree {
    constructor() {
        this.root = null;
    }

    //! O(h) — average O(log n), worst O(n)
    insert(value) {
        const node = new Node(value);
        if (!this.root) { this.root = node; return this; }
        let curr = this.root;
        while (true) {
            if (value === curr.value) return this;       // ignore duplicates
            if (value < curr.value) {
                if (!curr.left)  { curr.left  = node; return this; }
                curr = curr.left;
            } else {
                if (!curr.right) { curr.right = node; return this; }
                curr = curr.right;
            }
        }
    }

    //! O(h)
    contains(value) {
        let curr = this.root;
        while (curr) {
            if (value === curr.value) return true;
            curr = value < curr.value ? curr.left : curr.right;
        }
        return false;
    }

    //! O(h)
    min(node = this.root) {
        if (!node) return undefined;
        while (node.left) node = node.left;
        return node.value;
    }

    max(node = this.root) {
        if (!node) return undefined;
        while (node.right) node = node.right;
        return node.value;
    }

    //! O(h) — three cases:
    //*   leaf            → unlink
    //*   one child       → replace with that child
    //*   two children    → replace with in-order successor (min of right subtree)
    remove(value) {
        this.root = this._removeRec(this.root, value);
        return this;
    }

    _removeRec(node, value) {
        if (!node) return null;
        if (value < node.value)      node.left  = this._removeRec(node.left,  value);
        else if (value > node.value) node.right = this._removeRec(node.right, value);
        else {                                              // found it
            if (!node.left)  return node.right;             // 0 or 1 child
            if (!node.right) return node.left;
            // two children — copy successor value, delete successor
            let succ = node.right;
            while (succ.left) succ = succ.left;
            node.value = succ.value;
            node.right = this._removeRec(node.right, succ.value);
        }
        return node;
    }

    //! traversal — sorted order is in-order DFS for a BST
    inorder(node = this.root, out = []) {
        if (!node) return out;
        this.inorder(node.left, out);
        out.push(node.value);
        this.inorder(node.right, out);
        return out;
    }

    preorder(node = this.root, out = []) {
        if (!node) return out;
        out.push(node.value);
        this.preorder(node.left, out);
        this.preorder(node.right, out);
        return out;
    }

    postorder(node = this.root, out = []) {
        if (!node) return out;
        this.postorder(node.left, out);
        this.postorder(node.right, out);
        out.push(node.value);
        return out;
    }

    bfs() {
        const out = [];
        if (!this.root) return out;
        const queue = [this.root];
        while (queue.length) {
            const n = queue.shift();
            out.push(n.value);
            if (n.left)  queue.push(n.left);
            if (n.right) queue.push(n.right);
        }
        return out;
    }
}

// const t = new BinarySearchTree();
// [3, 1, 2, 4, 9, 5].forEach(v => t.insert(v));
// console.log(t.inorder());       // [1, 2, 3, 4, 5, 9] — sorted!
// console.log(t.contains(4));     // true
// console.log(t.min());           // 1
// console.log(t.max());           // 9
// t.remove(3);                    // re-roots
// console.log(t.inorder());       // [1, 2, 4, 5, 9]

module.exports = { Node, BinarySearchTree };
