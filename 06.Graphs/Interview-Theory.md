# Graphs — Theoretical / Conceptual Interview Questions

> **Audience**: All levels.
> **Goal**: Master representations, traversals, and the canonical algorithms — BFS, DFS, Dijkstra, Bellman-Ford, Kruskal, Prim, Union-Find, Topological Sort.

---

## 1. Fundamentals

---

### Q1. What is a graph?

**Short**: A set of **vertices** (V) and **edges** (E), where each edge connects a pair of vertices. Trees are a special case (connected + acyclic + |E| = |V| - 1).

**Notation**: G = (V, E). Common to write `n` for `|V|` and `m` for `|E|`.

---

### Q2. Types of graphs.

| Type             | Property                                                           |
| ---------------- | ------------------------------------------------------------------ |
| **Undirected**   | Edges have no direction; (u, v) === (v, u)                         |
| **Directed**     | Edges are ordered pairs; (u, v) ≠ (v, u)                           |
| **Weighted**     | Edges carry a numeric weight (cost, distance, capacity)            |
| **Unweighted**   | All edges treated equally                                          |
| **Cyclic**       | Contains at least one cycle                                        |
| **Acyclic**      | No cycles. **DAG** = directed acyclic                              |
| **Connected**    | Path between every pair (in undirected); for directed: **strongly connected** |
| **Bipartite**    | Vertices split into two groups; edges only between groups          |
| **Tree**         | Connected, acyclic. n vertices, n−1 edges                          |
| **Forest**       | Disjoint union of trees                                            |
| **Complete**     | Edge between every pair of distinct vertices                       |
| **Sparse**       | E ≪ V²                                                             |
| **Dense**        | E ≈ V²                                                             |
| **Multigraph**   | Allows multiple edges between same pair                            |

---

### Q3. Adjacency list vs adjacency matrix — when to use which?

| Concern                  | Adj. List              | Adj. Matrix          |
| ------------------------ | ---------------------- | -------------------- |
| Memory                   | **O(V + E)**           | O(V²)                |
| Edge existence (`u-v`?)  | O(deg(u))              | **O(1)**             |
| List neighbors of u      | **O(deg(u))**          | O(V)                 |
| Add edge                 | O(1)                   | O(1)                 |
| Remove edge              | O(deg(u))              | O(1)                 |
| Iterate all edges        | O(V + E)               | O(V²)                |
| Best for                 | **Sparse** graphs      | **Dense** graphs     |

**Heuristic**: most real-world graphs are sparse → adj list almost always wins.

---

### Q4. BFS vs DFS — what's each used for?

| Aspect                         | BFS                                  | DFS                                  |
| ------------------------------ | ------------------------------------ | ------------------------------------ |
| Data structure                 | Queue (FIFO)                         | Stack (LIFO) or recursion            |
| Visits in                      | Layer by layer                       | One path to a leaf, then backtrack   |
| Shortest path (unweighted)     | **Yes** — first time = shortest      | No (gives some path, not shortest)   |
| Cycle detection                | Possible (track distance/parent)     | Easier (back-edge = cycle)           |
| Topological sort               | **Kahn's** uses BFS                  | DFS postorder reversed               |
| Memory                         | O(V) — frontier can be wide          | O(h) where h is path depth           |
| Bipartite check                | **Yes** — color while leveling       | Yes — color during DFS               |
| Connected components           | Both work                            | Both work                            |

**Reach for BFS** when the question mentions: "shortest", "minimum steps/moves", "fewest", "level".
**Reach for DFS** when the question mentions: "all paths", "cycle", "topological", "reachable", "components".

---

### Q5. Time / space complexity of common algorithms.

| Algorithm                             | Time                  | Space    | Notes                                |
| ------------------------------------- | --------------------- | -------- | ------------------------------------ |
| **BFS / DFS**                         | O(V + E)              | O(V)     |                                      |
| **Dijkstra (binary heap)**            | O((V + E) log V)      | O(V)     | Non-negative weights only            |
| **Dijkstra (Fibonacci heap)**         | O(E + V log V)        | O(V)     | Better asymptotic, worse constant    |
| **Bellman-Ford**                      | O(V · E)              | O(V)     | Handles negatives, detects neg-cycle |
| **Floyd-Warshall (all-pairs)**        | O(V³)                 | O(V²)    | Negatives OK; no neg-cycle           |
| **Kruskal's MST**                     | O(E log E)            | O(V)     | Sort edges + union-find              |
| **Prim's MST (heap)**                 | O((V + E) log V)      | O(V)     | Same shape as Dijkstra               |
| **Union-Find**                        | O(α(n)) amortized     | O(n)     | α = inverse Ackermann (≈ 4 forever)  |
| **Topological Sort (Kahn / DFS)**     | O(V + E)              | O(V)     | DAG only                             |
| **Tarjan's SCC**                      | O(V + E)              | O(V)     | Strongly Connected Components        |
| **Kosaraju's SCC**                    | O(V + E)              | O(V)     | Two DFS passes                       |
| **Bridge / Articulation point**       | O(V + E)              | O(V)     | DFS with low-link                    |

---

## 2. Representation

---

### Q6. Why is adjacency list O(V + E) memory?

You store one entry per vertex (`O(V)`) plus one entry per directed edge (`O(E)`; `2E` for undirected, but still `O(E)`). Total: `O(V + E)`.

Compare to adjacency matrix at `O(V²)` — for sparse graphs (e.g., E = O(V)) this is a **massive** difference (1M vs 1T entries for V = 10⁶).

---

### Q7. How do you represent a weighted graph in JS?

Most common:

```js
const adj = new Map();           // vertex → [[neighbor, weight], ...]
adj.set('A', [['B', 4], ['C', 1]]);
```

Or for integer-labeled vertices:

```js
const adj = Array.from({ length: n }, () => []);   // adj[u] = [[v, w], ...]
```

Less common but compact for small graphs:

```js
const matrix = Array.from({ length: n }, () => new Array(n).fill(Infinity));
matrix[u][v] = weight;     // Infinity = no edge
```

---

## 3. Traversal

---

### Q8. The canonical BFS template.

```js
function bfs(start, neighbors) {
  const visited = new Set([start]);
  const queue = [start];
  let head = 0;                              // avoid arr.shift()
  while (head < queue.length) {
    const u = queue[head++];
    for (const v of neighbors(u)) {
      if (!visited.has(v)) { visited.add(v); queue.push(v); }
    }
  }
}
```

**Pitfalls**:
- Using `queue.shift()` → O(V²) instead of O(V + E).
- Adding to `visited` only when **dequeueing** → wastes memory and revisits; mark when **enqueueing**.

---

### Q9. The canonical DFS template (recursive).

```js
function dfs(start, neighbors) {
  const visited = new Set();
  function go(u) {
    visited.add(u);
    for (const v of neighbors(u)) if (!visited.has(v)) go(v);
  }
  go(start);
}
```

**Iterative version**: stack-based; push neighbors *reversed* if you want the same order as recursive.

**Caveat**: deep DFS recursion can blow V8's call stack (~10K frames). For huge graphs, prefer iterative.

---

### Q10. How do you detect a cycle?

**Undirected graph (DFS)**: a cycle exists if you find an edge to a **visited** node that is **not the parent** in DFS.

```js
function hasCycle(adj) {
  const visited = new Set();
  function dfs(u, parent) {
    visited.add(u);
    for (const v of adj.get(u)) {
      if (!visited.has(v)) { if (dfs(v, u)) return true; }
      else if (v !== parent) return true;
    }
    return false;
  }
  // run DFS from every unvisited vertex (handles disconnected graphs)
  for (const u of adj.keys()) if (!visited.has(u) && dfs(u, null)) return true;
  return false;
}
```

**Directed graph (DFS, three-color)**: cycle exists when DFS encounters a vertex currently being explored (gray/visiting state).

```js
// 0 = unseen, 1 = visiting, 2 = done
function hasCycleDirected(adj) {
  const state = new Map();
  for (const u of adj.keys()) state.set(u, 0);
  function dfs(u) {
    state.set(u, 1);
    for (const v of adj.get(u)) {
      if (state.get(v) === 1) return true;     // back edge → cycle
      if (state.get(v) === 0 && dfs(v)) return true;
    }
    state.set(u, 2);
    return false;
  }
  for (const u of adj.keys()) if (state.get(u) === 0 && dfs(u)) return true;
  return false;
}
```

**Union-Find (undirected)**: when adding an edge whose endpoints are **already in the same set**, there's a cycle.

---

### Q11. Bipartite check.

A graph is **bipartite** iff its vertices can be 2-colored so no edge connects same-colored vertices. Equivalently: **no odd cycle**.

```js
function isBipartite(adj) {
  const color = new Map();
  function bfs(start) {
    color.set(start, 0);
    const queue = [start];
    let head = 0;
    while (head < queue.length) {
      const u = queue[head++];
      for (const v of adj.get(u)) {
        if (!color.has(v)) {
          color.set(v, 1 - color.get(u));
          queue.push(v);
        } else if (color.get(v) === color.get(u)) return false;
      }
    }
    return true;
  }
  for (const u of adj.keys()) if (!color.has(u) && !bfs(u)) return false;
  return true;
}
```

---

## 4. Shortest Path

---

### Q12. Dijkstra — when does it work, and when does it fail?

**Works for**: non-negative edge weights.
**Fails for**: negative edges. Greedy "this distance is final" is wrong if a later negative edge could undercut it.

**Why?** Dijkstra commits to a vertex's distance the moment it pops from the PQ. With negatives, that distance might still improve.

**Use Bellman-Ford** for negatives.

---

### Q13. Why does Dijkstra use a min-heap?

To always pop the **closest unfinished** vertex. Without a heap, finding it is O(V) → total O(V²) (still better than O(V·E) for very dense graphs!). With a heap, total is O((V+E) log V).

---

### Q14. Bellman-Ford — what does the V−1 loop mean?

The shortest path has at most V−1 edges (otherwise it has a cycle, which we either reject if it's negative or skip if it's not useful). So V−1 relaxation passes is enough to converge if no negative cycle exists.

A V-th pass that **still relaxes** an edge proves a reachable negative cycle.

---

### Q15. Floyd-Warshall — how does it work?

Triple loop, "consider intermediate vertex k":

```js
for (let k = 0; k < n; k++)
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      if (dist[i][k] + dist[k][j] < dist[i][j])
        dist[i][j] = dist[i][k] + dist[k][j];
```

Simple. **Works with negatives** but **not negative cycles** (detected by `dist[i][i] < 0` afterward).

**Use case**: small dense graphs (V ≤ 500), all-pairs shortest path.

---

### Q16. 0-1 BFS — what is it?

When edges have weights ∈ {0, 1}, you can replace Dijkstra's heap with a **deque**: push 0-weight edges to the **front**, 1-weight to the **back**. Runs in O(V + E).

Useful for grid problems where moving in some directions is free and others cost 1.

---

## 5. Minimum Spanning Tree

---

### Q17. Kruskal's vs Prim's — when use which?

| Aspect           | Kruskal's              | Prim's                       |
| ---------------- | ---------------------- | ---------------------------- |
| Input form       | Edge list              | Adjacency list               |
| Approach         | Sort edges, take cheap | Grow tree from a start node  |
| Backbone         | Union-Find             | Min-heap                     |
| Best for         | Sparse                 | Dense                        |

**Both** produce the same total weight (the MST is unique if all weights distinct).

---

### Q18. Why does the greedy "always pick cheapest non-cycling edge" work?

**Cut property**: for any cut (V₁, V₂) of the graph, the minimum-weight edge crossing the cut is in some MST.

**Proof sketch**: if you exclude that edge, the graph is still connected only via a heavier crossing edge → swap them and the total weight decreases. Contradiction with MST minimality.

This justifies both Kruskal's (cheapest edge across "cut" between components) and Prim's (cheapest edge crossing the frontier).

---

## 6. Topological Sort

---

### Q19. What's a topological order?

A linear ordering of a DAG's vertices such that every directed edge goes from "earlier" to "later" in the order.

**Use cases**:
- Course scheduling.
- Build systems / Makefiles.
- Symbol resolution in compilers.
- Spreadsheet formula evaluation.

---

### Q20. Kahn's algorithm vs DFS for topological sort.

**Kahn's**:
- Start with all in-degree-0 vertices.
- Pop one, append to result, decrement in-degree of its neighbors; any that hit 0 join the queue.
- Cycle detection: if not all vertices made it to the result → cycle.

**DFS**:
- DFS the graph; record each vertex on **finish** (post-order).
- Reverse the postorder.
- Cycle detection: encounter a "visiting" (gray) vertex during DFS.

Use **Kahn's** if you need lexicographic order (replace queue with min-heap) or want streaming output. Use **DFS** if it composes more naturally with surrounding code.

---

## 7. Strongly Connected Components

---

### Q21. What is a strongly connected component (SCC)?

In a **directed** graph, a maximal subset of vertices where every pair has a path each way.

**Algorithms**:
- **Tarjan's**: single DFS, low-link arrays, O(V + E).
- **Kosaraju's**: two DFS passes — first on original to record finish order, second on transpose. O(V + E), simpler conceptually.

**Use cases**:
- 2-SAT solver.
- Web link analysis (page-rank precursor).
- Compiler dataflow analysis.

---

## 8. Union-Find

---

### Q22. Why is Union-Find effectively O(1)?

With **path compression** + **union by rank/size**, m operations on n elements take **O(m · α(n))** where α is the inverse Ackermann function — bounded by 4 for any n ≤ 10⁸⁰.

For interview purposes: state "O(α(n)) ≈ O(1) amortized".

---

### Q23. When use Union-Find vs DFS for components?

| Scenario                                       | Pick                  |
| ---------------------------------------------- | --------------------- |
| Edges given offline, query at the end          | DFS (simpler)         |
| Edges arrive ONLINE; queries interleaved       | Union-Find            |
| Need to **count** components dynamically       | Union-Find            |
| MST                                            | Union-Find (Kruskal)  |
| Detect cycle while reading edges               | Union-Find            |
| Path information / coloring                    | DFS                   |

---

## 9. Advanced

---

### Q24. What is an articulation point / bridge?

- **Articulation point** (cut vertex): removing it disconnects the graph.
- **Bridge** (cut edge): removing it disconnects the graph.

Found by **Tarjan's algorithm** with `low[u]` (lowest discovery time reachable from u via DFS subtree). Edge `(u, v)` is a bridge iff `low[v] > disc[u]`.

**Use cases**: network reliability, road networks, "Critical Connections in a Network" (LeetCode 1192).

---

### Q25. What is bipartite matching?

Matching = set of edges with no shared vertex. Maximum matching in a bipartite graph is solved by:
- **Hungarian algorithm** for weighted: O(n³).
- **Hopcroft-Karp** for unweighted: O(E√V).
- **Augmenting-path DFS**: O(V · E), simpler.

Reduction-based: many problems (assignment, grid covering, cake-eating) reduce to bipartite matching.

---

### Q26. What is max-flow / min-cut?

Given a directed graph with edge capacities, max-flow = max amount of "stuff" that can flow from source to sink. Equal to min-cut (sum of capacities to remove to disconnect source from sink) by the **max-flow min-cut theorem**.

**Algorithms**:
- Ford-Fulkerson (with augmenting paths)
- Edmonds-Karp (BFS): O(V · E²)
- Dinic's: O(V² · E)

Most interviews don't drill into flow; recognize it as the right tool when you see "match", "assign", "cover", or "cut".

---

## 10. Trick / Gotcha Questions

---

### Q27. Why does this BFS produce wrong shortest distances on a weighted graph?

```js
// graph with weights 1 and 5
function shortest(start, target) {
  const dist = new Map([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const u = queue.shift();
    for (const [v, w] of adj.get(u)) {
      if (!dist.has(v)) { dist.set(v, dist.get(u) + w); queue.push(v); }
    }
  }
  return dist.get(target);
}
```

**Bug**: BFS treats all edges as cost 1. With weights, the first arrival isn't necessarily the cheapest path. Use Dijkstra (or 0-1 BFS for {0, 1} weights).

---

### Q28. Why might this Dijkstra produce wrong answers?

```js
function dijkstra(start) {
  const dist = new Map();
  dist.set(start, 0);
  const visited = new Set();
  while (visited.size < adj.size) {
    let u = ..., best = Infinity;
    for (const [v, d] of dist) if (!visited.has(v) && d < best) { u = v; best = d; }
    visited.add(u);
    for (const [v, w] of adj.get(u)) {
      const nd = dist.get(u) + w;
      if (!dist.has(v) || nd < dist.get(v)) dist.set(v, nd);
    }
  }
  return dist;
}
```

**Bug 1**: O(V²) without a heap — fine for dense graphs, slow for sparse.
**Bug 2**: assumes the graph is connected. If not, the loop never terminates.
**Bug 3**: silently uses NEGATIVE weights as if non-negative.

---

### Q29. What's wrong with this cycle detection?

```js
function hasCycle(adj) {
  const visited = new Set();
  function dfs(u) {
    if (visited.has(u)) return true;     // ✗
    visited.add(u);
    for (const v of adj.get(u)) if (dfs(v)) return true;
    return false;
  }
  for (const u of adj.keys()) if (!visited.has(u) && dfs(u)) return true;
  return false;
}
```

**Bug** (undirected): re-visiting the parent node (every undirected edge looks like a cycle). Need to track parent and skip it.

**Bug** (directed): can't distinguish back edges from cross edges with a single visited set. Need three states (unseen / visiting / done).

---

## 11. Quick-Fire Drills

| Question                                                    | Answer                                                    |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| Best traversal for shortest path in unweighted graph?       | BFS                                                       |
| Best traversal for cycle detection?                         | DFS (or Union-Find for undirected)                        |
| Dijkstra prerequisite?                                      | Non-negative weights                                      |
| Bellman-Ford complexity?                                    | O(V · E)                                                  |
| Floyd-Warshall complexity?                                  | O(V³)                                                     |
| Topo sort prerequisite?                                     | Graph must be a DAG                                       |
| Kruskal backbone?                                           | Union-Find                                                |
| Prim's backbone?                                            | Min-heap                                                  |
| Detect negative cycle?                                      | Bellman-Ford with V-th relaxation                         |
| Best for sparse graphs — list or matrix?                    | List                                                      |
| Best for dense graphs — list or matrix?                     | Matrix                                                    |
| α(n) bound?                                                 | ≤ 4 for any practical n                                   |
| MST unique?                                                 | Yes if all edge weights are distinct                      |
| BFS in JS — pitfall?                                        | Don't use `arr.shift()` — O(n)                            |
| 0-1 BFS data structure?                                     | Deque                                                     |
| Bipartite ⇔ ?                                               | No odd cycle                                              |
| SCC algorithms?                                             | Tarjan's (1 DFS), Kosaraju's (2 DFS)                      |

---

## 12. Talking-Point Cheatsheet

1. *"Adjacency list is O(V + E) memory — almost always the right pick for sparse graphs."*
2. *"BFS gives shortest path in unweighted graphs; Dijkstra for non-negative weights; Bellman-Ford for negatives."*
3. *"Topological sort detects cycles for free — if the result is shorter than V, there's a cycle."*
4. *"Union-Find with path compression + union-by-rank is effectively O(1) per op."*
5. *"Kruskal's sort + union-find takes O(E log E); Prim's heap variant takes O((V+E) log V)."*
6. *"Avoid `arr.shift()` for BFS queues — use a head index or linked list."*
7. *"For directed cycle detection, three-color (white/gray/black) is the cleanest pattern."*
8. *"For most grid problems, BFS from all sources simultaneously is faster than running BFS from each source."*
