//! Topological Sort — DAG only
//* Linear ordering of vertices such that for every directed edge u → v, u comes before v.
//* Two equivalent algorithms:
//*   Kahn's (BFS):  iteratively remove zero-in-degree vertices
//*   DFS:           postorder reversed
//*
//* Both: O(V + E) time, O(V + E) space.
//* Both detect cycles — a topological order does NOT exist for graphs with cycles.

//! Kahn's algorithm — also useful when you want LEXICOGRAPHIC order
//* by replacing the queue with a min-heap.
function topologicalSortKahn(numNodes, edges) {
    const adj = Array.from({ length: numNodes }, () => []);
    const indeg = new Array(numNodes).fill(0);
    for (const [u, v] of edges) {
        adj[u].push(v);
        indeg[v]++;
    }

    const queue = [];
    for (let i = 0; i < numNodes; i++) if (indeg[i] === 0) queue.push(i);

    const out = [];
    let head = 0;
    while (head < queue.length) {
        const u = queue[head++];
        out.push(u);
        for (const v of adj[u]) {
            if (--indeg[v] === 0) queue.push(v);
        }
    }
    return out.length === numNodes ? out : [];      // [] indicates a cycle
}

//! DFS-based — postorder reversed
function topologicalSortDFS(numNodes, edges) {
    const adj = Array.from({ length: numNodes }, () => []);
    for (const [u, v] of edges) adj[u].push(v);

    const state = new Array(numNodes).fill(0);     // 0 unseen, 1 visiting, 2 done
    const out = [];
    let hasCycle = false;

    function dfs(u) {
        if (hasCycle) return;
        if (state[u] === 1) { hasCycle = true; return; }
        if (state[u] === 2) return;
        state[u] = 1;
        for (const v of adj[u]) dfs(v);
        state[u] = 2;
        out.push(u);
    }

    for (let i = 0; i < numNodes; i++) if (state[i] === 0) dfs(i);
    return hasCycle ? [] : out.reverse();
}

// Example: tasks 0 ← 1 ← 2 (need 1 before 2 → 1, need 0 before 1 → 0)
// edges = [[0, 1], [1, 2]]      // u must come before v in the result
// topologicalSortKahn(3, edges)  // [0, 1, 2]
// topologicalSortDFS(3, edges)   // [0, 1, 2]
//
// With a cycle:
// topologicalSortKahn(2, [[0, 1], [1, 0]])   // [] — cycle detected

module.exports = { topologicalSortKahn, topologicalSortDFS };
