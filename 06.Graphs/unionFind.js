//! Union-Find / Disjoint Set Union (DSU)
//* Tracks a partition of {0..n-1} into disjoint sets. Two operations:
//*   find(x):   which set does x belong to?      (canonical "root")
//*   union(x,y): merge the sets containing x and y
//*
//* With BOTH path compression and union-by-rank, each op runs in
//* effectively O(α(n)) — α is the inverse Ackermann function.
//* For all practical n (n ≤ 10^80), α(n) ≤ 4 → essentially O(1).
//*
//* Used in:
//*   - Kruskal's MST
//*   - Cycle detection in undirected graphs
//*   - Connected-component counting
//*   - "Number of Islands II" (online)
//*   - "Redundant Connection"
//*   - "Accounts Merge"

class UnionFind {
    constructor(n) {
        this.parent = Array.from({ length: n }, (_, i) => i);
        this.rank   = new Array(n).fill(0);
        this.count  = n;                        // number of disjoint sets
    }

    //! find with PATH COMPRESSION (halving variant — iterative, no recursion)
    find(x) {
        while (this.parent[x] !== x) {
            this.parent[x] = this.parent[this.parent[x]];   // halve the path
            x = this.parent[x];
        }
        return x;
    }

    //! union by RANK — attach smaller tree under larger
    //* returns true if merged, false if already connected
    union(x, y) {
        const px = this.find(x), py = this.find(y);
        if (px === py) return false;
        if      (this.rank[px] < this.rank[py]) this.parent[px] = py;
        else if (this.rank[px] > this.rank[py]) this.parent[py] = px;
        else                                   { this.parent[py] = px; this.rank[px]++; }
        this.count--;
        return true;
    }

    connected(x, y) {
        return this.find(x) === this.find(y);
    }

    //* size of x's component (slow — iterate, used rarely)
    componentSize(x) {
        const root = this.find(x);
        let size = 0;
        for (let i = 0; i < this.parent.length; i++) {
            if (this.find(i) === root) size++;
        }
        return size;
    }
}

// const uf = new UnionFind(5);             // {0} {1} {2} {3} {4}
// uf.union(0, 1);                          // {0,1} {2} {3} {4}
// uf.union(2, 3);                          // {0,1} {2,3} {4}
// console.log(uf.connected(0, 1));         // true
// console.log(uf.connected(0, 2));         // false
// console.log(uf.count);                   // 3
// uf.union(1, 2);                          // {0,1,2,3} {4}
// console.log(uf.count);                   // 2

module.exports = UnionFind;
