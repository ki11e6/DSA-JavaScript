# Graphs — Medium Interview Questions

> **Audience**: Mid-level / on-site rounds.
> **Goal**: Topological sort, multi-source BFS, Dijkstra, Union-Find for cycle/redundancy, and DFS with bookkeeping.

---

## Q1. Course Schedule

> `numCourses` and a list of `prerequisites = [[a, b], ...]` meaning to take a you must finish b. Return `true` iff all courses can be finished.

```js
function canFinish(numCourses, prerequisites) {
  const adj = Array.from({ length: numCourses }, () => []);
  const indeg = new Array(numCourses).fill(0);
  for (const [a, b] of prerequisites) { adj[b].push(a); indeg[a]++; }

  const queue = [];
  for (let i = 0; i < numCourses; i++) if (indeg[i] === 0) queue.push(i);
  let count = 0, head = 0;
  while (head < queue.length) {
    const u = queue[head++];
    count++;
    for (const v of adj[u]) if (--indeg[v] === 0) queue.push(v);
  }
  return count === numCourses;
}
```

- **Time**: O(V + E) · **Space**: O(V + E)
- **Pattern**: **Kahn's algorithm** — if topological order doesn't cover all courses, there's a cycle.

---

## Q2. Course Schedule II

> Same as Q1 but return one valid ordering, or `[]` if impossible.

```js
function findOrder(numCourses, prerequisites) {
  const adj = Array.from({ length: numCourses }, () => []);
  const indeg = new Array(numCourses).fill(0);
  for (const [a, b] of prerequisites) { adj[b].push(a); indeg[a]++; }

  const queue = [];
  for (let i = 0; i < numCourses; i++) if (indeg[i] === 0) queue.push(i);
  const out = [];
  let head = 0;
  while (head < queue.length) {
    const u = queue[head++];
    out.push(u);
    for (const v of adj[u]) if (--indeg[v] === 0) queue.push(v);
  }
  return out.length === numCourses ? out : [];
}
```

- **Time**: O(V + E) · **Space**: O(V + E)
- **Variant**: replace queue with **min-heap** for lexicographically smallest order.

---

## Q3. Clone Graph

> Deep-copy a connected undirected graph (each `Node` has `val` and `neighbors[]`).

```js
function cloneGraph(node) {
  if (!node) return null;
  const map = new Map();                                // original → copy
  function dfs(u) {
    if (map.has(u)) return map.get(u);
    const copy = new Node(u.val);
    map.set(u, copy);
    for (const n of u.neighbors) copy.neighbors.push(dfs(n));
    return copy;
  }
  return dfs(node);
}
```

- **Time**: O(V + E) · **Space**: O(V) for the map
- **Pattern**: hash map of original→copy avoids re-cloning shared neighbors and breaks cycles.

---

## Q4. Pacific Atlantic Water Flow

> Cells where water can flow to **both** oceans (water flows from high → low or equal). Pacific borders top + left; Atlantic borders bottom + right.

```js
function pacificAtlantic(heights) {
  const m = heights.length, n = heights[0].length;
  const pac = Array.from({ length: m }, () => new Array(n).fill(false));
  const atl = Array.from({ length: m }, () => new Array(n).fill(false));
  function dfs(r, c, visited) {
    visited[r][c] = true;
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
      if (visited[nr][nc]) continue;
      if (heights[nr][nc] < heights[r][c]) continue;    // can flow only ≥ current
      dfs(nr, nc, visited);
    }
  }
  for (let r = 0; r < m; r++) { dfs(r, 0, pac); dfs(r, n - 1, atl); }
  for (let c = 0; c < n; c++) { dfs(0, c, pac); dfs(m - 1, c, atl); }
  const out = [];
  for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) {
    if (pac[r][c] && atl[r][c]) out.push([r, c]);
  }
  return out;
}
```

- **Time**: O(m · n) · **Space**: O(m · n)
- **Trick**: **reverse the flow** — start from each ocean's edge cells, walk uphill, mark reachable cells.

---

## Q5. Surrounded Regions

> Capture all `'O'` regions surrounded by `'X'`. Border-connected `'O'`s survive.

```js
function solve(board) {
  const m = board.length, n = board[0].length;
  function dfs(r, c) {
    if (r < 0 || r >= m || c < 0 || c >= n || board[r][c] !== 'O') return;
    board[r][c] = '#';                                  // mark as safe
    dfs(r - 1, c); dfs(r + 1, c); dfs(r, c - 1); dfs(r, c + 1);
  }
  for (let r = 0; r < m; r++) { dfs(r, 0); dfs(r, n - 1); }
  for (let c = 0; c < n; c++) { dfs(0, c); dfs(m - 1, c); }
  for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) {
    board[r][c] = board[r][c] === '#' ? 'O' : 'X';
  }
}
```

- **Time**: O(m · n) · **Space**: O(m · n) recursion
- **Pattern**: invert the problem — find what to **save** (border-connected), flip the rest.

---

## Q6. Rotting Oranges

> Multi-source BFS. `2` = rotten, `1` = fresh, `0` = empty. Each minute, rotten infects 4-neighboring fresh. Return min minutes until all rotten or `-1`.

```js
function orangesRotting(grid) {
  const m = grid.length, n = grid[0].length;
  const queue = [];
  let fresh = 0;
  for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) {
    if (grid[r][c] === 2) queue.push([r, c, 0]);
    else if (grid[r][c] === 1) fresh++;
  }
  let head = 0, time = 0;
  while (head < queue.length) {
    const [r, c, t] = queue[head++];
    time = Math.max(time, t);
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
      if (grid[nr][nc] !== 1) continue;
      grid[nr][nc] = 2;
      fresh--;
      queue.push([nr, nc, t + 1]);
    }
  }
  return fresh === 0 ? time : -1;
}
```

- **Time**: O(m · n) · **Space**: O(m · n)
- **Pattern**: **multi-source BFS** — seed the queue with all initial sources; level-by-level distance is automatic.

---

## Q7. 01 Matrix

> Replace every cell with the distance to the nearest 0.

```js
function updateMatrix(mat) {
  const m = mat.length, n = mat[0].length;
  const dist = Array.from({ length: m }, () => new Array(n).fill(Infinity));
  const queue = [];
  for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) {
    if (mat[r][c] === 0) { dist[r][c] = 0; queue.push([r, c]); }
  }
  let head = 0;
  while (head < queue.length) {
    const [r, c] = queue[head++];
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
      if (dist[nr][nc] > dist[r][c] + 1) {
        dist[nr][nc] = dist[r][c] + 1;
        queue.push([nr, nc]);
      }
    }
  }
  return dist;
}
```

- **Time**: O(m · n) · **Space**: O(m · n)
- **Pattern**: same as Rotting Oranges — multi-source BFS from 0s.

---

## Q8. Network Delay Time

> Directed weighted graph. Time for signal from `k` to reach all nodes; -1 if any unreachable.

```js
const PriorityQueue = require('../04.Stacks&Queues/priorityQueue.js');

function networkDelayTime(times, n, k) {
  const adj = Array.from({ length: n + 1 }, () => []);
  for (const [u, v, w] of times) adj[u].push([v, w]);

  const dist = new Array(n + 1).fill(Infinity);
  dist[k] = 0;
  const pq = new PriorityQueue((a, b) => a[0] - b[0]);
  pq.push([0, k]);
  while (!pq.isEmpty()) {
    const [d, u] = pq.pop();
    if (d > dist[u]) continue;                         // stale
    for (const [v, w] of adj[u]) {
      const nd = d + w;
      if (nd < dist[v]) { dist[v] = nd; pq.push([nd, v]); }
    }
  }
  let max = 0;
  for (let i = 1; i <= n; i++) {
    if (dist[i] === Infinity) return -1;
    max = Math.max(max, dist[i]);
  }
  return max;
}
```

- **Time**: O((V + E) log V) · **Space**: O(V + E)
- **Pattern**: classic Dijkstra; answer = max final distance.

---

## Q9. Cheapest Flights Within K Stops

> Find cheapest path from `src` to `dst` with at most `k` intermediate stops.

```js
function findCheapestPrice(n, flights, src, dst, k) {
  let dist = new Array(n).fill(Infinity);
  dist[src] = 0;
  for (let i = 0; i <= k; i++) {
    const next = dist.slice();
    for (const [u, v, w] of flights) {
      if (dist[u] !== Infinity && dist[u] + w < next[v]) next[v] = dist[u] + w;
    }
    dist = next;
  }
  return dist[dst] === Infinity ? -1 : dist[dst];
}
```

- **Time**: O(k · E) · **Space**: O(V)
- **Pattern**: **bounded-edges Bellman-Ford** — relax for k+1 iterations using the **previous** snapshot to prevent counting an edge twice in a single round.

---

## Q10. Reconstruct Itinerary

> Given airline tickets `[from, to]`, build the itinerary starting from `"JFK"` using **all** tickets, lexicographically smallest if multiple valid.

```js
function findItinerary(tickets) {
  const adj = new Map();
  for (const [u, v] of tickets) {
    if (!adj.has(u)) adj.set(u, []);
    adj.get(u).push(v);
  }
  for (const list of adj.values()) list.sort((a, b) => b.localeCompare(a));   // reverse-sorted: pop = lex smallest

  const out = [];
  function dfs(u) {
    while (adj.has(u) && adj.get(u).length) dfs(adj.get(u).pop());
    out.push(u);
  }
  dfs('JFK');
  return out.reverse();
}
```

- **Time**: O(E log E) (sort) + O(V + E) DFS · **Space**: O(V + E)
- **Pattern**: **Hierholzer's algorithm** for Eulerian path. Reverse-postorder gives the itinerary.

---

## Q11. Word Ladder

> Number of edges (or 0 if impossible) in shortest transformation `beginWord → endWord`, changing one letter at a time, every intermediate must be in `wordList`.

```js
function ladderLength(beginWord, endWord, wordList) {
  const set = new Set(wordList);
  if (!set.has(endWord)) return 0;
  const queue = [[beginWord, 1]];
  let head = 0;
  while (head < queue.length) {
    const [word, steps] = queue[head++];
    if (word === endWord) return steps;
    for (let i = 0; i < word.length; i++) {
      for (let c = 0; c < 26; c++) {
        const nw = word.slice(0, i) + String.fromCharCode(97 + c) + word.slice(i + 1);
        if (set.has(nw)) {
          set.delete(nw);                              // mark visited
          queue.push([nw, steps + 1]);
        }
      }
    }
  }
  return 0;
}
```

- **Time**: O(N · L²) where L = word length, N = word count.
- **Pattern**: BFS where each "edge" is one letter change. The 26-letter expansion is faster than building the explicit graph.

---

## Q12. Evaluate Division

> Equations `a/b = v`, queries `c/d = ?`. Return values per query.

```js
function calcEquation(equations, values, queries) {
  const adj = new Map();
  for (let i = 0; i < equations.length; i++) {
    const [a, b] = equations[i], v = values[i];
    if (!adj.has(a)) adj.set(a, new Map());
    if (!adj.has(b)) adj.set(b, new Map());
    adj.get(a).set(b, v);
    adj.get(b).set(a, 1 / v);
  }
  function dfs(start, end) {
    if (!adj.has(start) || !adj.has(end)) return -1;
    const visited = new Set([start]);
    function go(u, product) {
      if (u === end) return product;
      for (const [v, w] of adj.get(u)) {
        if (visited.has(v)) continue;
        visited.add(v);
        const r = go(v, product * w);
        if (r !== -1) return r;
      }
      return -1;
    }
    return go(start, 1);
  }
  return queries.map(([a, b]) => dfs(a, b));
}
```

- **Time**: O(Q · (V + E)) · **Space**: O(V + E)
- **Pattern**: weighted graph, multiplied along the path.

---

## Q13. Redundant Connection

> Tree of N nodes (N edges, one extra). Return the redundant edge that, if removed, leaves a tree.

```js
function findRedundantConnection(edges) {
  const uf = new UnionFind(edges.length + 1);
  for (const [u, v] of edges) {
    if (!uf.union(u, v)) return [u, v];
  }
  return [];
}
```

- **Time**: O(E · α(n)) ≈ O(E) · **Space**: O(n)
- **Pattern**: Union-Find — first edge whose endpoints share a component creates the cycle.

---

## Q14. Min Cost to Connect All Points

> Manhattan-distance MST.

```js
function minCostConnectPoints(points) {
  const n = points.length;
  const edges = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    edges.push([i, j, Math.abs(points[i][0] - points[j][0]) + Math.abs(points[i][1] - points[j][1])]);
  }
  edges.sort((a, b) => a[2] - b[2]);
  const uf = new UnionFind(n);
  let weight = 0, used = 0;
  for (const [u, v, w] of edges) {
    if (uf.union(u, v)) {
      weight += w; used++;
      if (used === n - 1) break;
    }
  }
  return weight;
}
```

- **Time**: O(n² log n) · **Space**: O(n²)
- **Pattern**: Kruskal's MST.

---

## Q15. Path with Minimum Effort

> Grid of heights; "effort" of a path = max `|height diff|` over consecutive cells. Min-effort path top-left → bottom-right.

```js
function minimumEffortPath(heights) {
  const m = heights.length, n = heights[0].length;
  const effort = Array.from({ length: m }, () => new Array(n).fill(Infinity));
  effort[0][0] = 0;
  const pq = new PriorityQueue((a, b) => a[0] - b[0]);
  pq.push([0, 0, 0]);
  while (!pq.isEmpty()) {
    const [e, r, c] = pq.pop();
    if (r === m - 1 && c === n - 1) return e;
    if (e > effort[r][c]) continue;
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
      const ne = Math.max(e, Math.abs(heights[nr][nc] - heights[r][c]));
      if (ne < effort[nr][nc]) {
        effort[nr][nc] = ne;
        pq.push([ne, nr, nc]);
      }
    }
  }
  return 0;
}
```

- **Time**: O(m · n · log(m · n)) · **Space**: O(m · n)
- **Pattern**: Dijkstra where edge weight is `max` instead of `+`.

---

## Q16. Graph Valid Tree

> Given `n` nodes and `edges`, is the graph a tree?

```js
function validTree(n, edges) {
  if (edges.length !== n - 1) return false;             // tree has exactly n−1 edges
  const uf = new UnionFind(n);
  for (const [u, v] of edges) {
    if (!uf.union(u, v)) return false;                  // cycle
  }
  return uf.count === 1;                                // connected
}
```

- **Time**: O(E · α(n)) · **Space**: O(n)
- **Tree definition**: connected + acyclic ⇔ exactly n−1 edges + connected.

---

## Patterns Cheatsheet (Medium)

| Pattern                                  | Trigger                                                | Examples here   |
| ---------------------------------------- | ------------------------------------------------------ | --------------- |
| **Topological sort (Kahn)**              | "Can finish?" / "ordering with prerequisites"          | Q1, Q2          |
| **Hash map original→copy**               | Deep-clone graph / linked structure                    | Q3              |
| **Reverse-flow BFS/DFS**                 | "Cells reaching boundary X"                            | Q4, Q5          |
| **Multi-source BFS**                     | "Distance to nearest 0/source"                         | Q6, Q7          |
| **Dijkstra with PQ**                     | Shortest path on non-negative weighted graph           | Q8, Q15         |
| **Bounded-edge Bellman-Ford**            | "k stops" or "limited edge count"                      | Q9              |
| **Hierholzer (Eulerian)**                | "Use every edge once"                                  | Q10             |
| **Word-ladder BFS**                      | "Smallest # transformations" with adjacent rule        | Q11             |
| **Weighted multi-DFS**                   | "Compute X across an arbitrary edge chain"             | Q12             |
| **Union-Find for cycle/tree validation** | "Is the extra edge?" / "Is it a tree?"                 | Q13, Q16        |
| **Kruskal MST**                          | "Connect all with min cost"                            | Q14             |

---

## Common Interviewer Follow-Ups

1. *"Lexicographic order?"* — replace queue with min-heap (Kahn's), or pre-sort neighbors (DFS).
2. *"What if graph is dense?"* — adjacency matrix, Floyd-Warshall.
3. *"Negative weights?"* — Bellman-Ford instead of Dijkstra.
4. *"What if you need all shortest paths?"* — keep multiple parents during BFS, then DFS-reconstruct.
5. *"Online updates / dynamic connectivity?"* — Union-Find.
