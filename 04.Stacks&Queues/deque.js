//! Deque — Double-Ended Queue
//* Push and pop from BOTH ends in O(1).
//* Backed by a doubly linked list with sentinel head and tail nodes —
//* eliminates null-check special cases on every insert/remove.
//* Used in BFS layer-by-layer, sliding-window-maximum (monotonic deque),
//* undo/redo histories, work-stealing schedulers.

class Node {
    constructor(value) {
        this.value = value;
        this.prev = null;
        this.next = null;
    }
}

class Deque {
    constructor() {
        // sentinel head ↔ sentinel tail → empty deque
        this.head = new Node();
        this.tail = new Node();
        this.head.next = this.tail;
        this.tail.prev = this.head;
        this.length = 0;
    }

    //* O(1): insert just after head
    pushFront(value) {
        const node = new Node(value);
        node.prev = this.head;
        node.next = this.head.next;
        this.head.next.prev = node;
        this.head.next = node;
        this.length++;
        return this;
    }

    //* O(1): insert just before tail
    pushBack(value) {
        const node = new Node(value);
        node.next = this.tail;
        node.prev = this.tail.prev;
        this.tail.prev.next = node;
        this.tail.prev = node;
        this.length++;
        return this;
    }

    //* O(1): remove first real node
    popFront() {
        if (this.length === 0) return undefined;
        const node = this.head.next;
        this.head.next = node.next;
        node.next.prev = this.head;
        this.length--;
        return node.value;
    }

    //* O(1): remove last real node
    popBack() {
        if (this.length === 0) return undefined;
        const node = this.tail.prev;
        this.tail.prev = node.prev;
        node.prev.next = this.tail;
        this.length--;
        return node.value;
    }

    front() { return this.length === 0 ? undefined : this.head.next.value; }
    back()  { return this.length === 0 ? undefined : this.tail.prev.value; }
    size()  { return this.length; }
    isEmpty() { return this.length === 0; }

    print() {
        const items = [];
        for (let n = this.head.next; n !== this.tail; n = n.next) items.push(n.value);
        console.log(items.join(' <-> '));
    }
}

// const d = new Deque();
// d.pushBack(1).pushBack(2).pushFront(0);
// d.print();                       // 0 <-> 1 <-> 2
// console.log(d.popFront());       // 0
// console.log(d.popBack());        // 2
// console.log(d.front());          // 1

module.exports = Deque;
