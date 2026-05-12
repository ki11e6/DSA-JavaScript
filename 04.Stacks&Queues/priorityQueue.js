//! PriorityQueue — Binary Heap
//* push:    O(log n) — sift the new element up
//* pop:     O(log n) — replace root with last, sift down
//* peek:    O(1)
//* By default this is a MIN-heap (smallest on top).
//* Pass a comparator (a, b) => a > b ? 1 : -1 for max-heap, or any custom order
//* (e.g. (a, b) => a.priority - b.priority for objects).

class PriorityQueue {
    constructor(comparator = (a, b) => a - b) {
        this._heap = [];
        this._compare = comparator;
    }

    size() {
        return this._heap.length;
    }

    isEmpty() {
        return this._heap.length === 0;
    }

    peek() {
        return this._heap[0];
    }

    push(value) {
        this._heap.push(value);
        this._siftUp(this._heap.length - 1);
        return this.size();
    }

    pop() {
        if (this._heap.length === 0) return undefined;
        const top = this._heap[0];
        const last = this._heap.pop();
        if (this._heap.length > 0) {
            this._heap[0] = last;
            this._siftDown(0);
        }
        return top;
    }

    _parent(i)     { return (i - 1) >> 1; }
    _leftChild(i)  { return i * 2 + 1; }
    _rightChild(i) { return i * 2 + 2; }

    _swap(i, j) {
        const t = this._heap[i];
        this._heap[i] = this._heap[j];
        this._heap[j] = t;
    }

    //* sift element at index `i` upward toward the root
    _siftUp(i) {
        while (i > 0) {
            const p = this._parent(i);
            if (this._compare(this._heap[i], this._heap[p]) >= 0) break;
            this._swap(i, p);
            i = p;
        }
    }

    //* sift element at index `i` downward toward leaves
    _siftDown(i) {
        const n = this._heap.length;
        while (true) {
            const l = this._leftChild(i), r = this._rightChild(i);
            let best = i;
            if (l < n && this._compare(this._heap[l], this._heap[best]) < 0) best = l;
            if (r < n && this._compare(this._heap[r], this._heap[best]) < 0) best = r;
            if (best === i) break;
            this._swap(i, best);
            i = best;
        }
    }

    //! O(n) bulk build — faster than n × push
    static heapify(arr, comparator = (a, b) => a - b) {
        const pq = new PriorityQueue(comparator);
        pq._heap = arr.slice();
        for (let i = (pq._heap.length >> 1) - 1; i >= 0; i--) pq._siftDown(i);
        return pq;
    }

    print() {
        console.log(this._heap);
    }
}

// const pq = new PriorityQueue();             // min-heap of numbers
// pq.push(5); pq.push(1); pq.push(3); pq.push(2);
// console.log(pq.pop());                       // 1
// console.log(pq.pop());                       // 2

// const max = new PriorityQueue((a, b) => b - a);
// max.push(5); max.push(1); max.push(3);
// console.log(max.pop());                      // 5

// const tasks = PriorityQueue.heapify(
//   [{ p: 3, t: 'a' }, { p: 1, t: 'b' }, { p: 2, t: 'c' }],
//   (a, b) => a.p - b.p
// );
// console.log(tasks.pop().t);                  // 'b' (lowest priority value)

module.exports = PriorityQueue;
