//! Minimum Spanning Tree — Kruskal's & Prim's
//*
//* MST = subset of edges that connects all vertices with minimum total weight.
//* Both Kruskal's and Prim's are greedy and produce the same total weight (the MST is unique
//* if all edge weights are distinct; otherwise multiple valid MSTs exist with equal total).
//*
//* Use Kruskal's when the graph is given as an EDGE LIST.
//* Use Prim's when the graph is given as ADJACENCY LIST and is dense.
//*
//* Complexities (V vertices, E edges):
//*   Kruskal's   O(E log E) — sort dominates; union-find adds α(V)
//*   Prim's      O((V+E) log V) — same as Dijkstra structure with PQ

const UnionFind = require('./unionFind.js');
const PriorityQueue = require('../04.Stacks&Queues/priorityQueue.js');

//! Kruskal's — sort edges, union-find to skip cycles
//* edges: [[u, v, weight], ...]
function kruskal(n, edges) {
    edges = edges.slice().sort((a, b) => a[2] - b[2]);
    const uf = new UnionFind(n);
    const mst = [];
    let weight = 0;
    for (const [u, v, w] of edges) {
        if (uf.union(u, v)) {
            mst.push([u, v, w]);
            weight += w;
            if (mst.length === n - 1) break;
        }
    }
    return mst.length === n - 1 ? { mst, weight } : null;   // null = disconnected graph
}

//! Prim's — grow MST by adding cheapest edge crossing the visited frontier
//* adj: array of length n; adj[u] = [[v, weight], ...]; assumed UNDIRECTED
function prim(n, adj, start = 0) {
    const visited = new Array(n).fill(false);
    visited[start] = true;
    const pq = new PriorityQueue((a, b) => a[0] - b[0]);    // [weight, from, to]
    for (const [v, w] of adj[start]) pq.push([w, start, v]);

    const mst = [];
    let weight = 0;
    while (!pq.isEmpty() && mst.length < n - 1) {
        const [w, u, v] = pq.pop();
        if (visited[v]) continue;                            // already in MST
        visited[v] = true;
        mst.push([u, v, w]);
        weight += w;
        for (const [x, w2] of adj[v]) if (!visited[x]) pq.push([w2, v, x]);
    }
    return mst.length === n - 1 ? { mst, weight } : null;
}

// const edges = [[0,1,1],[0,2,4],[1,2,2],[1,3,5],[2,3,3]];
// console.log(kruskal(4, edges).weight);    // 6  (1 + 2 + 3)
// const adj = Array.from({length: 4}, () => []);
// for (const [u, v, w] of edges) { adj[u].push([v, w]); adj[v].push([u, w]); }
// console.log(prim(4, adj).weight);          // 6

module.exports = { kruskal, prim };
