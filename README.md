# Trees vs Graphs: Understanding the Differences

## What is the difference between a tree and a graph?

### Tree

A **tree** is a special type of graph that is connected and acyclic, meaning that there are no cycles in the graph.

Key characteristics:

- There is a unique path between any two vertices
- There is a single vertex called the root that serves as the starting point for traversing the tree
- Trees can be used to model hierarchical relationships, such as:
  - File system structure
  - Organization charts
  - Family trees

### Graph

A **graph** is a collection of vertices (also known as nodes) and edges that connect these vertices.

Key characteristics:

- Each edge represents a relationship between two vertices
- Graphs can be:
  - Directed (digraph) - edges have a specific direction
  - Undirected - edges have no direction
  - Weighted - edges have associated weights or costs

### Key Difference

**The main difference between a tree and a graph is that a tree is connected and acyclic, while a graph can have cycles and may not necessarily be connected.**

## Applications

### Graph Applications

[To be filled]

### Tree Applications

[To be filled]

## Advantages and Disadvantages

### Tree

[To be filled]

### Graph

[To be filled]

## Big O Cheat Sheet

### Big Os

- **O(1)** Constant - no loops
- **O(log N)** Logarithmic - usually searching algorithms have log n if they are sorted (Binary Search)
- **O(n)** Linear - for loops, while loops through n items
- **O(n log(n))** Log Linear - usually sorting operations
- **O(n²)** Quadratic - every element in a collection needs to be compared to every other element. Two nested loops
- **O(2ⁿ)** Exponential - recursive algorithms that solve a problem of size N
- **O(n!)** Factorial - you are adding a loop for every element

### Important Notes

- Iterating through half a collection is still O(n)
- Two separate collections: O(a * b)

### What Can Cause Time in a Function?

- Operations (+, -, *, /)
- Comparisons (<, >, ==)
- Looping (for, while)
- Outside Function call (function())

### Rule Book

1. Always worst Case
2. Remove Constants
3. Different inputs should have different variables
   - O(a+b) for steps in order
   - O(a*b) for nested steps
4. Drop Non-dominant terms

### What Causes Space Complexity?

- Variables
- Data Structures
- Function Call
- Allocations
