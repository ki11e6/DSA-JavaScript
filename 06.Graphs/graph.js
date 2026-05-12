//! Graph — Adjacency List (unweighted)
//* Two flavors via the `directed` flag.
//*
//* Representation trade-offs:
//*   Adjacency LIST   — O(V + E) memory, O(deg(v)) to list neighbors. Best for sparse graphs.
//*   Adjacency MATRIX — O(V²) memory, O(1) edge lookup. Best for dense graphs / many edge tests.
//*
//* Operations:
//*   addVertex / addEdge / removeEdge / removeVertex   — O(deg) for edge ops
//*   bfs / dfs                                          — O(V + E)

class Graph {
    constructor(directed = false) {
        this.adj = new Map();
        this.directed = directed;
    }

    addVertex(v) {
        if (!this.adj.has(v)) this.adj.set(v, []);
        return this;
    }

    addEdge(u, v) {
        this.addVertex(u);
        this.addVertex(v);
        this.adj.get(u).push(v);
        if (!this.directed) this.adj.get(v).push(u);
        return this;
    }

    removeEdge(u, v) {
        if (this.adj.has(u)) this.adj.set(u, this.adj.get(u).filter(x => x !== v));
        if (!this.directed && this.adj.has(v)) this.adj.set(v, this.adj.get(v).filter(x => x !== u));
        return this;
    }

    removeVertex(v) {
        if (!this.adj.has(v)) return this;
        for (const u of this.adj.get(v)) {
            this.adj.set(u, this.adj.get(u).filter(x => x !== v));
        }
        if (this.directed) {
            // also remove any incoming edges to v
            for (const [u, list] of this.adj) {
                if (u !== v) this.adj.set(u, list.filter(x => x !== v));
            }
        }
        this.adj.delete(v);
        return this;
    }

    neighbors(v) {
        return this.adj.get(v) ?? [];
    }

    vertexCount() {
        return this.adj.size;
    }

    //! BFS from `start` — visits all reachable vertices in O(V + E)
    bfs(start) {
        if (!this.adj.has(start)) return [];
        const visited = new Set([start]);
        const queue = [start];
        const out = [];
        let head = 0;                                       // avoid O(n) shift
        while (head < queue.length) {
            const v = queue[head++];
            out.push(v);
            for (const u of this.neighbors(v)) {
                if (!visited.has(u)) { visited.add(u); queue.push(u); }
            }
        }
        return out;
    }

    //! Iterative DFS — order matches recursive preorder when neighbors are pushed reversed
    dfs(start) {
        if (!this.adj.has(start)) return [];
        const visited = new Set();
        const out = [];
        const stack = [start];
        while (stack.length) {
            const v = stack.pop();
            if (visited.has(v)) continue;
            visited.add(v);
            out.push(v);
            const nbrs = this.neighbors(v);
            for (let i = nbrs.length - 1; i >= 0; i--) {
                if (!visited.has(nbrs[i])) stack.push(nbrs[i]);
            }
        }
        return out;
    }

    //! Recursive DFS — cleaner code; risks stack overflow on huge graphs
    dfsRecursive(start) {
        if (!this.adj.has(start)) return [];
        const visited = new Set();
        const out = [];
        const dfs = v => {
            visited.add(v);
            out.push(v);
            for (const u of this.neighbors(v)) if (!visited.has(u)) dfs(u);
        };
        dfs(start);
        return out;
    }

    //! Connected components in an UNDIRECTED graph — count + groupings
    connectedComponents() {
        const visited = new Set();
        const groups = [];
        for (const v of this.adj.keys()) {
            if (visited.has(v)) continue;
            const group = [];
            const stack = [v];
            while (stack.length) {
                const u = stack.pop();
                if (visited.has(u)) continue;
                visited.add(u);
                group.push(u);
                for (const w of this.neighbors(u)) if (!visited.has(w)) stack.push(w);
            }
            groups.push(group);
        }
        return groups;
    }

    //! Cycle detection — works for both directed and undirected
    hasCycle() {
        if (this.directed) return this._hasCycleDirected();
        return this._hasCycleUndirected();
    }

    _hasCycleUndirected() {
        const visited = new Set();
        const dfs = (v, parent) => {
            visited.add(v);
            for (const u of this.neighbors(v)) {
                if (!visited.has(u)) {
                    if (dfs(u, v)) return true;
                } else if (u !== parent) {
                    return true;                            // back edge to non-parent
                }
            }
            return false;
        };
        for (const v of this.adj.keys()) {
            if (!visited.has(v) && dfs(v, null)) return true;
        }
        return false;
    }

    _hasCycleDirected() {
        const state = new Map();                            // 0 unseen, 1 visiting, 2 done
        for (const v of this.adj.keys()) state.set(v, 0);
        const dfs = v => {
            state.set(v, 1);
            for (const u of this.neighbors(v)) {
                if (state.get(u) === 1) return true;        // back edge → cycle
                if (state.get(u) === 0 && dfs(u)) return true;
            }
            state.set(v, 2);
            return false;
        };
        for (const v of this.adj.keys()) {
            if (state.get(v) === 0 && dfs(v)) return true;
        }
        return false;
    }

    print() {
        for (const [v, nbrs] of this.adj) console.log(v, '→', nbrs);
    }
}

// const g = new Graph();
// g.addEdge('A', 'B').addEdge('A', 'C').addEdge('B', 'D').addEdge('C', 'D');
// console.log(g.bfs('A'));    // ['A', 'B', 'C', 'D']
// console.log(g.dfs('A'));    // ['A', 'B', 'D', 'C']
// console.log(g.hasCycle());  // true (B-D-C-A-B)

module.exports = Graph;
