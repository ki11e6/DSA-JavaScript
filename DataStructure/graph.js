class Graph {
    constructor() {
        this.adjacencyList = {};
    }
    addVertex(vertex) {
        if (!this.adjacencyList[vertex]) {
            this.adjacencyList[vertex] = [];
            return true;
        }
        return false;
    }
    addEdge(vertex1, vertex2) {
        if (this.adjacencyList[vertex1] && this.adjacencyList[vertex2]) {
            this.adjacencyList[vertex1].push(vertex2);
            this.adjacencyList[vertex2].push(vertex1);
            return true;
        }
        return false;
    }
    removeEdge(vertex1, vertex2) {
        if (this.adjacencyList[vertex1] && this.adjacencyList[vertex2]) {
            this.adjacencyList[vertex1] = this.adjacencyList[vertex1].filter(
                (v) => v !== vertex2
            );
            this.adjacencyList[vertex2] = this.adjacencyList[vertex2].filter(
                (v) => v !== vertex1
            );
            return true;
        }
        return false;
    }
    removeVertex(vertex) {
        if (!this.adjacencyList[vertex]) return undefined;
        while (this.adjacencyList[vertex].length) {
            let temp = this.adjacencyList[vertex].pop();
            this.removeEdge(vertex, temp);
        }
        delete this.adjacencyList[vertex];
        return this;
    }
}

let mygraph = new Graph();
x = mygraph.addVertex(1);
x = mygraph.addVertex(2);
x = mygraph.addVertex(3);
x = mygraph.addVertex(4);
x = mygraph.addEdge(1, 2);
x = mygraph.addEdge(2, 3);
x = mygraph.addEdge(3, 4);
x = mygraph.addEdge(4, 1);
x = mygraph.addEdge(4, 2);
// x = mygraph.removeVertex(4);
x = mygraph;
console.log(x);
