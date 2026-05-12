//! Bellman-Ford — Single-Source Shortest Path with NEGATIVE weights allowed
//* O(V · E) time, O(V) space.
//* Slower than Dijkstra (O((V+E) log V)) but works with negative edges and detects negative cycles.
//*
//* Edges given as [u, v, weight] (treat as directed; for undirected, add both directions).
//* Returns:
//*   { dist }                 — shortest distances from `start` to every vertex
//*   { dist: null }           — when a NEGATIVE CYCLE is reachable from `start`
//*   dist[v] = Infinity       — v is unreachable

function bellmanFord(n, edges, start) {
    const dist = new Array(n).fill(Infinity);
    dist[start] = 0;

    // Relax all edges up to V−1 times
    for (let i = 0; i < n - 1; i++) {
        let any = false;
        for (const [u, v, w] of edges) {
            if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                any = true;
            }
        }
        if (!any) break;                              // early termination — converged
    }

    // V-th relaxation succeeds iff a negative cycle exists on a reachable path
    for (const [u, v, w] of edges) {
        if (dist[u] !== Infinity && dist[u] + w < dist[v]) return { dist: null };
    }
    return { dist };
}

// const result = bellmanFord(5, [
//   [0, 1, -1], [0, 2, 4], [1, 2, 3], [1, 3, 2], [1, 4, 2],
//   [3, 2, 5], [3, 1, 1], [4, 3, -3]
// ], 0);
// console.log(result.dist);    // [0, -1, 2, -2, 1]

module.exports = bellmanFord;
