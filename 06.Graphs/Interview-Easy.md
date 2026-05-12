# Graphs — Easy Interview Questions

> **Audience**: Junior / phone screen / first technical round.
> **Goal**: Master grid BFS/DFS, basic edge-list traversal, the in-degree counting pattern, and Union-Find for "is connected?" questions.

---

## Q1. Find if Path Exists in Graph

> Given `n` nodes, undirected `edges`, and `source`/`destination`, return `true` if there's a path between them.

#### Approach 1 — BFS

```js
function validPath(n, edges, source, destination) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) { adj[u].push(v); adj[v].push(u); }

  const visited = new Set([source]);
  const queue = [source];
  let head = 0;
  while (head < queue.length) {
    const u = queue[head++];
    if (u === destination) return true;
    for (const v of adj[u]) if (!visited.has(v)) { visited.add(v); queue.push(v); }
  }
  return false;
}
```

- **Time**: O(V + E) · **Space**: O(V + E)

#### Approach 2 — Union-Find

```js
function validPath(n, edges, source, destination) {
  const uf = new UnionFind(n);
  for (const [u, v] of edges) uf.union(u, v);
  return uf.connected(source, destination);
}
```

- **Time**: O(V + E · α(n)) ≈ O(V + E)
- **When to prefer**: edges arrive online; you'll do many connectivity queries.

---

## Q2. Number of Provinces

> `isConnected[i][j] = 1` ⇔ city i and j are directly connected. Return the number of "provinces" (connected components).

```js
function findCircleNum(isConnected) {
  const n = isConnected.length;
  const visited = new Set();
  let count = 0;
  function dfs(u) {
    visited.add(u);
    for (let v = 0; v < n; v++) {
      if (isConnected[u][v] && !visited.has(v)) dfs(v);
    }
  }
  for (let i = 0; i < n; i++) {
    if (!visited.has(i)) { count++; dfs(i); }
  }
  return count;
}
```

- **Time**: O(n²) · **Space**: O(n)
- **Equivalent**: Union-Find on every edge → component count.

---

## Q3. Find the Town Judge

> N people. Trust pairs `[a, b]` mean "a trusts b". The judge trusts no one and is trusted by everyone else.

```js
function findJudge(n, trust) {
  const score = new Array(n + 1).fill(0);
  for (const [a, b] of trust) { score[a]--; score[b]++; }
  for (let i = 1; i <= n; i++) if (score[i] === n - 1) return i;
  return -1;
}
```

- **Time**: O(V + E) · **Space**: O(V)
- **Trick**: judge has in-degree (n−1) and out-degree 0 → net score `n − 1`.

---

## Q4. Find Center of Star Graph

> A "star" graph: one center connected to all others. Edges given.

```js
function findCenter(edges) {
  const [a, b] = edges[0];
  const [c, d] = edges[1];
  return a === c || a === d ? a : b;
}
```

- **Time**: O(1) · **Space**: O(1)
- **Insight**: the center appears in **every** edge → check the first two edges and find the common vertex.

---

## Q5. Flood Fill

> Replace every cell connected to `(sr, sc)` with the same color, with `newColor`.

```js
function floodFill(image, sr, sc, color) {
  const orig = image[sr][sc];
  if (orig === color) return image;
  const m = image.length, n = image[0].length;
  function dfs(r, c) {
    if (r < 0 || r >= m || c < 0 || c >= n || image[r][c] !== orig) return;
    image[r][c] = color;
    dfs(r - 1, c); dfs(r + 1, c); dfs(r, c - 1); dfs(r, c + 1);
  }
  dfs(sr, sc);
  return image;
}
```

- **Time**: O(m · n) worst · **Space**: O(m · n) recursion
- **Pitfall**: if `orig === color` already, early-return — otherwise infinite recursion.

---

## Q6. Number of Islands

> Count connected groups of `'1'`s in a 2D grid (4-directional connectivity).

```js
function numIslands(grid) {
  const m = grid.length, n = grid[0].length;
  let count = 0;
  function dfs(r, c) {
    if (r < 0 || r >= m || c < 0 || c >= n || grid[r][c] !== '1') return;
    grid[r][c] = '0';                                    // sink the island
    dfs(r - 1, c); dfs(r + 1, c); dfs(r, c - 1); dfs(r, c + 1);
  }
  for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) {
    if (grid[r][c] === '1') { count++; dfs(r, c); }
  }
  return count;
}
```

- **Time**: O(m · n) · **Space**: O(m · n) recursion (or BFS queue)
- **Pattern**: grid → graph by treating each cell as a vertex, 4-directional neighbors as edges.

---

## Q7. Max Area of Island

> Same as above but return the **maximum** area instead of count.

```js
function maxAreaOfIsland(grid) {
  const m = grid.length, n = grid[0].length;
  let best = 0;
  function dfs(r, c) {
    if (r < 0 || r >= m || c < 0 || c >= n || grid[r][c] !== 1) return 0;
    grid[r][c] = 0;
    return 1 + dfs(r - 1, c) + dfs(r + 1, c) + dfs(r, c - 1) + dfs(r, c + 1);
  }
  for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) {
    if (grid[r][c] === 1) best = Math.max(best, dfs(r, c));
  }
  return best;
}
```

- **Time**: O(m · n) · **Space**: O(m · n)
- **Pattern**: DFS that **returns** subtree size (here: connected-region size).

---

## Q8. Keys and Rooms

> `n` rooms, all locked except room 0. Each room contains keys (room indices). Can you visit all rooms?

```js
function canVisitAllRooms(rooms) {
  const visited = new Set([0]);
  const stack = [0];
  while (stack.length) {
    const r = stack.pop();
    for (const k of rooms[r]) {
      if (!visited.has(k)) { visited.add(k); stack.push(k); }
    }
  }
  return visited.size === rooms.length;
}
```

- **Time**: O(V + E) · **Space**: O(V)
- **Trick**: classic reachability — BFS or DFS from room 0; check if visited count == total.

---

## Q9. Shortest Path in Binary Matrix

> 8-directional (incl. diagonals) shortest path from top-left to bottom-right through `0` cells.

```js
function shortestPathBinaryMatrix(grid) {
  const n = grid.length;
  if (grid[0][0] !== 0 || grid[n - 1][n - 1] !== 0) return -1;
  const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  const visited = Array.from({ length: n }, () => new Array(n).fill(false));
  visited[0][0] = true;
  const queue = [[0, 0, 1]];
  let head = 0;
  while (head < queue.length) {
    const [r, c, d] = queue[head++];
    if (r === n - 1 && c === n - 1) return d;
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
      if (grid[nr][nc] !== 0 || visited[nr][nc]) continue;
      visited[nr][nc] = true;
      queue.push([nr, nc, d + 1]);
    }
  }
  return -1;
}
```

- **Time**: O(n²) · **Space**: O(n²)
- **Pattern**: unweighted BFS = shortest path in number of steps.

---

## Q10. Number of Connected Components in an Undirected Graph

```js
function countComponents(n, edges) {
  const uf = new UnionFind(n);
  for (const [u, v] of edges) uf.union(u, v);
  return uf.count;
}
```

- **Time**: O(V + E · α(n)) · **Space**: O(V)
- **Pattern**: Union-Find counts components for free via the `count` field.

---

## Q11. Find if Path Exists with Restricted Paths

> Like Q1 but with a `restricted` set of forbidden vertices.

```js
function reachableNodes(n, edges, restricted) {
  const block = new Set(restricted);
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    if (!block.has(u) && !block.has(v)) { adj[u].push(v); adj[v].push(u); }
  }
  const visited = new Set([0]);
  const queue = [0];
  let head = 0;
  while (head < queue.length) {
    const u = queue[head++];
    for (const v of adj[u]) if (!visited.has(v)) { visited.add(v); queue.push(v); }
  }
  return visited.size;
}
```

- **Time**: O(V + E) · **Space**: O(V + E)

---

## Q12. Find Champion (Easy DAG)

> Directed graph where the "champion" has in-degree 0 and is the only one. Return -1 if not unique.

```js
function findChampion(n, edges) {
  const indeg = new Array(n).fill(0);
  for (const [, v] of edges) indeg[v]++;
  let champion = -1;
  for (let i = 0; i < n; i++) {
    if (indeg[i] === 0) {
      if (champion !== -1) return -1;
      champion = i;
    }
  }
  return champion;
}
```

- **Time**: O(V + E) · **Space**: O(V)
- **Pattern**: in-degree counting — same idea as topological sort's seed.

---

## Patterns Cheatsheet (Easy)

| Pattern                            | Trigger                                                | Examples here   |
| ---------------------------------- | ------------------------------------------------------ | --------------- |
| **Build adj list, BFS/DFS**        | "Is X reachable?", "shortest steps?"                   | Q1, Q9          |
| **Grid as graph (4 / 8 dir)**      | Image / matrix problems                                | Q5, Q6, Q7, Q9  |
| **Sink visited cells**             | Avoid revisits without an external `visited` set       | Q6, Q7          |
| **Multi-source BFS** (later)       | "Distance from any nearest 0" / "rotting oranges"      | (Medium)        |
| **Union-Find for components**      | "How many groups?" / "are X and Y connected?"          | Q1, Q2, Q10     |
| **In-degree / out-degree counting**| "Find the unique X" (judge, champion)                  | Q3, Q4, Q12     |

---

## Common Interviewer Follow-Ups

1. *"What if the graph is dense?"* — adjacency matrix may be more efficient for repeated edge-existence queries.
2. *"What if you have many queries on a static graph?"* — precompute components with Union-Find.
3. *"Memory-constrained?"* — sink visited cells in-place to avoid the `visited` set.
4. *"Diagonals allowed?"* — switch from 4-direction to 8-direction neighbors.
5. *"What if edges arrive online?"* — Union-Find shines.
