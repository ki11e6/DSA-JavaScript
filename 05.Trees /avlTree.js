//! AVL Tree — Self-Balancing BST
//* INVARIANT: at every node, |height(left) − height(right)| ≤ 1.
//* Maintained via 4 rotation cases (LL, RR, LR, RL) after every insert/delete.
//* Operations are O(log n) WORST case (vs O(n) worst for plain BST).
//* Slightly slower in practice than red-black trees on writes (more rotations),
//* but faster on reads (more strictly balanced).

class Node {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
        this.height = 1;
    }
}

class AVLTree {
    constructor() {
        this.root = null;
    }

    insert(value) {
        this.root = this._insert(this.root, value);
        return this;
    }

    remove(value) {
        this.root = this._remove(this.root, value);
        return this;
    }

    contains(value) {
        let node = this.root;
        while (node) {
            if (value === node.value) return true;
            node = value < node.value ? node.left : node.right;
        }
        return false;
    }

    inorder(node = this.root, out = []) {
        if (!node) return out;
        this.inorder(node.left, out);
        out.push(node.value);
        this.inorder(node.right, out);
        return out;
    }

    height(node = this.root) {
        return node ? node.height : 0;
    }

    _h(node) { return node ? node.height : 0; }

    _balanceFactor(node) {
        return this._h(node.left) - this._h(node.right);
    }

    _updateHeight(node) {
        node.height = 1 + Math.max(this._h(node.left), this._h(node.right));
    }

    //*    z              y
    //*   /              / \
    //*  y     →        x   z
    //* / \                / \
    //* x  ?              ?  ?
    _rotateRight(z) {
        const y = z.left;
        const T3 = y.right;
        y.right = z;
        z.left = T3;
        this._updateHeight(z);
        this._updateHeight(y);
        return y;
    }

    //*  z                y
    //*   \              / \
    //*    y      →     z   x
    //*   / \            \
    //*  ?   x            ?
    _rotateLeft(z) {
        const y = z.right;
        const T2 = y.left;
        y.left = z;
        z.right = T2;
        this._updateHeight(z);
        this._updateHeight(y);
        return y;
    }

    _rebalance(node) {
        this._updateHeight(node);
        const bf = this._balanceFactor(node);

        // Left-heavy
        if (bf > 1) {
            if (this._balanceFactor(node.left) < 0) node.left = this._rotateLeft(node.left);  // LR
            return this._rotateRight(node);                                                    // LL
        }
        // Right-heavy
        if (bf < -1) {
            if (this._balanceFactor(node.right) > 0) node.right = this._rotateRight(node.right); // RL
            return this._rotateLeft(node);                                                       // RR
        }
        return node;
    }

    _insert(node, value) {
        if (!node) return new Node(value);
        if (value === node.value) return node;     // ignore duplicates
        if (value < node.value)  node.left  = this._insert(node.left,  value);
        else                     node.right = this._insert(node.right, value);
        return this._rebalance(node);
    }

    _remove(node, value) {
        if (!node) return null;
        if (value < node.value)      node.left  = this._remove(node.left,  value);
        else if (value > node.value) node.right = this._remove(node.right, value);
        else {
            if (!node.left || !node.right) return node.left || node.right;
            let succ = node.right;
            while (succ.left) succ = succ.left;
            node.value = succ.value;
            node.right = this._remove(node.right, succ.value);
        }
        return this._rebalance(node);
    }
}

// const avl = new AVLTree();
// // Inserting in sorted order: a plain BST would skew into a list (height 5).
// // AVL keeps the height at O(log n).
// [1, 2, 3, 4, 5].forEach(v => avl.insert(v));
// console.log(avl.height());      // 3 (not 5!)
// console.log(avl.inorder());     // [1, 2, 3, 4, 5]

module.exports = { Node, AVLTree };
