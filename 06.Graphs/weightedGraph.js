//! Weighted Graph + Dijkstra's Shortest Path
//* Adjacency list of [neighbor, weight] pairs.
//* Dijkstra requires NON-NEGATIVE weights (use Bellman-Ford for negatives).
//*
//* Complexities (using a binary heap PQ):
//*   Dijkstra      O((V + E) log V) time, O(V) space
//*   With Fibonacci heap: O(E + V log V) — rarely worth implementing in practice

const PriorityQueue = require('../04.Stacks&Queues/priorityQueue.js');

class WeightedGraph {
    constructor(directed = false) {
        this.adj = new Map();
        this.directed = directed;
    }

    addVertex(v) {
        if (!this.adj.has(v)) this.adj.set(v, []);
        return this;
    }

    addEdge(u, v, weight) {
        this.addVertex(u); this.addVertex(v);
        this.adj.get(u).push([v, weight]);
        if (!this.directed) this.adj.get(v).push([u, weight]);
        return this;
    }

    neighbors(v) {
        return this.adj.get(v) ?? [];
    }

    //! Dijkstra — returns Map vertex → shortest distance from `start`
    //* Optional: also returns prev-map for path reconstruction
    dijkstra(start) {
        const dist = new Map();
        const prev = new Map();
        for (const v of this.adj.keys()) dist.set(v, Infinity);
        dist.set(start, 0);

        const pq = new PriorityQueue((a, b) => a[0] - b[0]);
        pq.push([0, start]);

        while (!pq.isEmpty()) {
            const [d, v] = pq.pop();
            if (d > dist.get(v)) continue;                  // stale entry
            for (const [u, w] of this.neighbors(v)) {
                const nd = d + w;
                if (nd < dist.get(u)) {
                    dist.set(u, nd);
                    prev.set(u, v);
                    pq.push([nd, u]);
                }
            }
        }
        return { dist, prev };
    }

    //* reconstruct the path from `start` to `end` after Dijkstra
    static reconstructPath(prev, start, end) {
        const path = [end];
        let curr = end;
        while (curr !== start && prev.has(curr)) {
            curr = prev.get(curr);
            path.push(curr);
        }
        return path[path.length - 1] === start ? path.reverse() : [];
    }

    print() {
        for (const [v, nbrs] of this.adj) console.log(v, '→', nbrs);
    }
}

// const g = new WeightedGraph();
// g.addEdge('A', 'B', 4)
//  .addEdge('A', 'C', 1)
//  .addEdge('B', 'C', 2)
//  .addEdge('B', 'D', 5)
//  .addEdge('C', 'D', 8);
// const { dist, prev } = g.dijkstra('A');
// console.log(dist.get('D'));                                  // 8 (A→C→B→D)
// console.log(WeightedGraph.reconstructPath(prev, 'A', 'D'));  // ['A', 'C', 'B', 'D']

module.exports = WeightedGraph;
