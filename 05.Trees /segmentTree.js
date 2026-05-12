//! Segment Tree — Range Query + Point Update Structure
//* Supports range sum / min / max / GCD / etc. in O(log n) with O(log n) point update.
//* Backed by a flat array of size ~4n.
//* Compared to Fenwick Tree (BIT): more flexible (any associative op) at a cost of ~4× memory.
//*
//* Generic over a binary "combine" function:
//*   sum:  (a, b) => a + b,         identity = 0
//*   min:  (a, b) => Math.min(a, b), identity = Infinity
//*   max:  (a, b) => Math.max(a, b), identity = -Infinity
//*   gcd:  (a, b) => gcd(a, b),     identity = 0

class SegmentTree {
    constructor(arr, combine = (a, b) => a + b, identity = 0) {
        this.n = arr.length;
        this.combine = combine;
        this.identity = identity;
        this.tree = new Array(4 * this.n).fill(identity);
        if (this.n > 0) this._build(arr, 0, 0, this.n - 1);
    }

    _build(arr, node, l, r) {
        if (l === r) { this.tree[node] = arr[l]; return; }
        const mid = (l + r) >> 1;
        this._build(arr, 2 * node + 1, l, mid);
        this._build(arr, 2 * node + 2, mid + 1, r);
        this.tree[node] = this.combine(this.tree[2 * node + 1], this.tree[2 * node + 2]);
    }

    //! O(log n)
    update(i, value) {
        this._update(0, 0, this.n - 1, i, value);
    }

    _update(node, l, r, i, value) {
        if (l === r) { this.tree[node] = value; return; }
        const mid = (l + r) >> 1;
        if (i <= mid) this._update(2 * node + 1, l, mid, i, value);
        else          this._update(2 * node + 2, mid + 1, r, i, value);
        this.tree[node] = this.combine(this.tree[2 * node + 1], this.tree[2 * node + 2]);
    }

    //! O(log n) — query the combined value over [ql..qr] inclusive
    query(ql, qr) {
        if (ql > qr || this.n === 0) return this.identity;
        return this._query(0, 0, this.n - 1, ql, qr);
    }

    _query(node, l, r, ql, qr) {
        if (qr < l || r < ql)  return this.identity;
        if (ql <= l && r <= qr) return this.tree[node];
        const mid = (l + r) >> 1;
        return this.combine(
            this._query(2 * node + 1, l, mid, ql, qr),
            this._query(2 * node + 2, mid + 1, r, ql, qr)
        );
    }
}

// const arr = [1, 3, 5, 7, 9, 11];
// const st = new SegmentTree(arr);            // sum by default
// console.log(st.query(1, 3));                // 3+5+7 = 15
// st.update(1, 10);                            // arr[1] = 10
// console.log(st.query(1, 3));                // 10+5+7 = 22
// const stMin = new SegmentTree(arr, Math.min, Infinity);
// console.log(stMin.query(0, 5));             // 1

module.exports = SegmentTree;
