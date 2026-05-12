# Graphs — Hard Interview Questions

> **Audience**: Senior / FAANG on-site final rounds.
> **Goal**: Bridges (Tarjan), all-shortest-paths reconstruction, modified Dijkstra (max along path), 0-1 BFS, Eulerian trails, complex topological reasoning.

---

## Q1. Word Ladder II

> Return **all** shortest transformations from `beginWord` to `endWord`.

```js
function findLadders(beginWord, endWord, wordList) {
  const set = new Set(wordList);
  if (!set.has(endWord)) return [];

  // BFS to build a parents map (multiple parents → all shortest paths to each word)
  const parents = new Map();
  let level = new Set([beginWord]);
  set.delete(beginWord);
  let found = false;

  while (level.size && !found) {
    const next = new Set();
    for (const word of level) {
      for (let i = 0; i < word.length; i++) {
        for (let c = 0; c < 26; c++) {
          const nw = word.slice(0, i) + String.fromCharCode(97 + c) + word.slice(i + 1);
          if (set.has(nw)) {
            if (!parents.has(nw)) parents.set(nw, []);
            parents.get(nw).push(word);
            if (nw === endWord) found = true;
            next.add(nw);
          }
        }
      }
    }
    for (const w of next) set.delete(w);
    level = next;
  }
  if (!found) return [];

  // DFS reconstruct from endWord backward
  const out = [];
  function dfs(word, path) {
    path.unshift(word);
    if (word === beginWord) out.push([...path]);
    else if (parents.has(word)) {
      for (const p of parents.get(word)) dfs(p, path);
    }
    path.shift();
  }
  dfs(endWord, []);
  return out;
}
```

- **Time**: O(N · L²) BFS + O(P · L) reconstruction (P = number of paths) · **Space**: O(N · L)
- **Pattern**: BFS to build a **shortest-path DAG** (parents map), then DFS to enumerate.
- **Pitfall**: only delete a word from `set` **after** all of the current level is processed — otherwise sibling words at the same level miss connections.

---

## Q2. Critical Connections in a Network (Bridges — Tarjan)

> Edges whose removal disconnects the graph.

```js
function criticalConnections(n, connections) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of connections) { adj[u].push(v); adj[v].push(u); }
  const disc = new Array(n).fill(-1);                  // DFS discovery time
  const low  = new Array(n).fill(-1);                  // earliest reachable disc time
  const out = [];
  let timer = 0;

  function dfs(u, parent) {
    disc[u] = low[u] = timer++;
    for (const v of adj[u]) {
      if (disc[v] === -1) {
        dfs(v, u);
        low[u] = Math.min(low[u], low[v]);
        if (low[v] > disc[u]) out.push([u, v]);        // bridge!
      } else if (v !== parent) {
        low[u] = Math.min(low[u], disc[v]);
      }
    }
  }

  for (let i = 0; i < n; i++) if (disc[i] === -1) dfs(i, -1);
  return out;
}
```

- **Time**: O(V + E) · **Space**: O(V)
- **Insight**: edge `(u, v)` is a bridge iff `low[v] > disc[u]` — child v can't reach back above u except through this edge.

---

## Q3. Alien Dictionary

> Given dictionary `words` sorted in alien-language order, recover any consistent letter ordering, or return `""` if inconsistent.

```js
function alienOrder(words) {
  const indeg = new Map();
  const adj = new Map();
  for (const w of words) for (const c of w) {
    if (!indeg.has(c)) { indeg.set(c, 0); adj.set(c, new Set()); }
  }
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i], b = words[i + 1];
    if (a.length > b.length && a.startsWith(b)) return '';     // invalid (prefix conflict)
    for (let j = 0; j < Math.min(a.length, b.length); j++) {
      if (a[j] !== b[j]) {
        if (!adj.get(a[j]).has(b[j])) {
          adj.get(a[j]).add(b[j]);
          indeg.set(b[j], indeg.get(b[j]) + 1);
        }
        break;
      }
    }
  }
  const q = [];
  for (const [c, d] of indeg) if (d === 0) q.push(c);
  let head = 0, out = '';
  while (head < q.length) {
    const c = q[head++];
    out += c;
    for (const v of adj.get(c)) {
      indeg.set(v, indeg.get(v) - 1);
      if (indeg.get(v) === 0) q.push(v);
    }
  }
  return out.length === indeg.size ? out : '';                 // cycle
}
```

- **Time**: O(C) where C = total characters · **Space**: O(unique chars + edges)
- **Pitfalls**:
  - Prefix-conflict check: `["abc", "ab"]` is invalid.
  - Don't double-count edges → check `Set.has` before incrementing in-degree.

---

## Q4. Swim in Rising Water

> Grid of heights. Start at (0,0); water level rises by 1 each second. From a cell you can move 4-directionally only if water level ≥ both cells' heights. Return earliest second to reach (n-1, n-1).

```js
const PriorityQueue = require('../04.Stacks&Queues/priorityQueue.js');

function swimInWater(grid) {
  const n = grid.length;
  const visited = Array.from({ length: n }, () => new Array(n).fill(false));
  const pq = new PriorityQueue((a, b) => a[0] - b[0]);
  pq.push([grid[0][0], 0, 0]);
  while (!pq.isEmpty()) {
    const [t, r, c] = pq.pop();
    if (visited[r][c]) continue;
    visited[r][c] = true;
    if (r === n - 1 && c === n - 1) return t;
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= n || nc < 0 || nc >= n || visited[nr][nc]) continue;
      pq.push([Math.max(t, grid[nr][nc]), nr, nc]);
    }
  }
  return -1;
}
```

- **Time**: O(n² · log n) · **Space**: O(n²)
- **Pattern**: Dijkstra with **path metric = max along path** (instead of sum).
- **Alternative**: binary search on the answer + BFS feasibility.

---

## Q5. Bus Routes

> Each `routes[i]` is a circular bus route. From `source` to `target`, return min number of buses. -1 if impossible.

```js
function numBusesToDestination(routes, source, target) {
  if (source === target) return 0;
  const stopToRoutes = new Map();
  for (let i = 0; i < routes.length; i++) {
    for (const stop of routes[i]) {
      if (!stopToRoutes.has(stop)) stopToRoutes.set(stop, []);
      stopToRoutes.get(stop).push(i);
    }
  }

  const visitedRoutes = new Set();
  const visitedStops = new Set([source]);
  let level = [source], buses = 0;
  while (level.length) {
    buses++;
    const next = [];
    for (const stop of level) {
      for (const r of stopToRoutes.get(stop) ?? []) {
        if (visitedRoutes.has(r)) continue;
        visitedRoutes.add(r);
        for (const ns of routes[r]) {
          if (ns === target) return buses;
          if (!visitedStops.has(ns)) { visitedStops.add(ns); next.push(ns); }
        }
      }
    }
    level = next;
  }
  return -1;
}
```

- **Time**: O(Σ |routes|) · **Space**: O(Σ |routes|)
- **Pattern**: BFS where the **state is "current stop"** but the **edge cost is buses, not stops**. Visiting all stops in a route counts as one bus-hop.

---

## Q6. Minimum Cost to Make at Least One Valid Path in a Grid (0-1 BFS)

> Each cell has a direction (1=right, 2=left, 3=down, 4=up). Following the arrow costs 0; going against it costs 1. Min cost from (0,0) to (m-1, n-1).

```js
function minCost(grid) {
  const m = grid.length, n = grid[0].length;
  const cost = Array.from({ length: m }, () => new Array(n).fill(Infinity));
  cost[0][0] = 0;
  const dirs = [null, [0, 1], [0, -1], [1, 0], [-1, 0]];     // 1..4
  const dq = [[0, 0]];
  while (dq.length) {
    const [r, c] = dq.shift();
    for (let d = 1; d <= 4; d++) {
      const nr = r + dirs[d][0], nc = c + dirs[d][1];
      if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
      const free = grid[r][c] === d;
      const nc2 = cost[r][c] + (free ? 0 : 1);
      if (nc2 < cost[nr][nc]) {
        cost[nr][nc] = nc2;
        if (free) dq.unshift([nr, nc]);                     // push to FRONT for 0-cost
        else      dq.push([nr, nc]);                        // push to BACK for 1-cost
      }
    }
  }
  return cost[m - 1][n - 1];
}
```

- **Time**: O(m · n) · **Space**: O(m · n)
- **Pattern**: **0-1 BFS** — replaces Dijkstra's heap with a deque when edge weights are 0 or 1.

---

## Q7. Number of Islands II (Online)

> Stream of land additions. After each, return the current island count.

```js
function numIslands2(m, n, positions) {
  const uf = new UnionFind(m * n);
  const isLand = new Array(m * n).fill(false);
  let count = 0;
  const out = [];
  for (const [r, c] of positions) {
    const idx = r * n + c;
    if (isLand[idx]) { out.push(count); continue; }         // dup add
    isLand[idx] = true;
    count++;
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
      const nIdx = nr * n + nc;
      if (isLand[nIdx] && uf.union(idx, nIdx)) count--;     // merged two islands
    }
    out.push(count);
  }
  return out;
}
```

- **Time**: O(K · α(m · n)) where K = positions count · **Space**: O(m · n)
- **Pattern**: **Union-Find with online merge counting**. Each successful `union` reduces island count by 1.

---

## Q8. Find the Shortest Superstring

> Smallest string containing each word in `words` as a substring. (Hamiltonian path on overlap graph — NP-hard, but small n with bitmask DP.)

```js
function shortestSuperstring(words) {
  const n = words.length;
  const overlap = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) {
    const max = Math.min(words[i].length, words[j].length);
    for (let k = max; k > 0; k--) {
      if (words[i].endsWith(words[j].slice(0, k))) { overlap[i][j] = k; break; }
    }
  }

  // dp[mask][i] = best (smallest) length when visited set = mask and ending at i
  const dp = Array.from({ length: 1 << n }, () => new Array(n).fill(Infinity));
  const parent = Array.from({ length: 1 << n }, () => new Array(n).fill(-1));
  for (let i = 0; i < n; i++) dp[1 << i][i] = words[i].length;

  for (let mask = 1; mask < (1 << n); mask++) {
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i))) continue;
      for (let j = 0; j < n; j++) {
        if (mask & (1 << j)) continue;
        const next = mask | (1 << j);
        const cand = dp[mask][i] + words[j].length - overlap[i][j];
        if (cand < dp[next][j]) { dp[next][j] = cand; parent[next][j] = i; }
      }
    }
  }
  const full = (1 << n) - 1;
  let best = 0;
  for (let i = 0; i < n; i++) if (dp[full][i] < dp[full][best]) best = i;

  const order = [];
  let mask = full, curr = best;
  while (curr !== -1) {
    order.push(curr);
    const p = parent[mask][curr];
    mask ^= 1 << curr;
    curr = p;
  }
  order.reverse();

  let res = words[order[0]];
  for (let i = 1; i < order.length; i++) {
    const o = overlap[order[i - 1]][order[i]];
    res += words[order[i]].slice(o);
  }
  return res;
}
```

- **Time**: O(2ⁿ · n²) · **Space**: O(2ⁿ · n)
- **Pattern**: **bitmask DP for Hamiltonian path**. Maximum word count is small (~12) — exponent blows up otherwise.

---

## Q9. Reconstruct Itinerary (Eulerian — already in Medium Q10)

> Already covered. Hard variants reduce to:
> - All Eulerian paths (enumerate)
> - Eulerian circuit existence (every vertex even degree, connected)

---

## Q10. Cheapest Flights — Dijkstra with Stop Constraint

> Same as Medium Q9 but with a heap-based variant for very sparse graphs.

```js
function findCheapestPriceDijkstra(n, flights, src, dst, k) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v, w] of flights) adj[u].push([v, w]);
  const pq = new PriorityQueue((a, b) => a[0] - b[0]);    // [cost, node, stops]
  pq.push([0, src, 0]);
  // best stops to each node
  const bestStops = new Array(n).fill(Infinity);
  while (!pq.isEmpty()) {
    const [cost, u, stops] = pq.pop();
    if (u === dst) return cost;
    if (stops > k || stops >= bestStops[u]) continue;
    bestStops[u] = stops;
    for (const [v, w] of adj[u]) pq.push([cost + w, v, stops + 1]);
  }
  return -1;
}
```

- **Time**: O((V + E) · k · log) · **Space**: O(V)
- **Trade-off**: Dijkstra-style is faster when valid paths are short relative to V; Bellman-Ford is simpler.

---

## Patterns Cheatsheet (Hard)

| Pattern                                  | Trigger                                                           |
| ---------------------------------------- | ----------------------------------------------------------------- |
| **BFS shortest-path DAG → DFS reconstruct** | "All shortest paths"                                          |
| **Tarjan low-link**                      | Bridges, articulation points                                      |
| **Topological sort with prefix-conflict check** | Alien dictionary, ordering with implicit constraints      |
| **Dijkstra with non-additive metric**    | Min-of-max (swim) / max-of-min (effort)                           |
| **Edge cost = bus / level / hop, not nodes** | Bus Routes                                                  |
| **0-1 BFS (deque)**                      | Edge weights ∈ {0, 1}                                             |
| **Union-Find online**                    | Streaming connectivity, "Number of Islands II"                    |
| **Bitmask DP on graph**                  | Hamiltonian path, TSP, set-covering paths                         |

---

## Senior Communication Tips

1. **Identify the right algorithm first.** "Negative weights → Bellman-Ford." / "All shortest → BFS-DAG." / "Bridge detection → Tarjan." Saves 30 seconds of reasoning.
2. **State the metric explicitly.** Dijkstra works for **any monotone non-decreasing** combine function — not just sum. Min-of-max and max-of-min are valid.
3. **Discuss the data structure trade-off.** Heap vs deque vs queue — the constraint "only 0/1 weights" or "only increment by 1" lets you drop the log factor.
4. **For online problems** (streaming queries / edges), **prefer Union-Find** to recomputing components.
5. **For "ordering" problems** (alien dict, course schedule), check for the **prefix-conflict edge case**.
6. **Edge cases**: disconnected graph, single vertex, self-loops, duplicate edges, no path exists.
