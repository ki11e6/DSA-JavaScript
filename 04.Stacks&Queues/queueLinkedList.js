//! Queue — Linked-List Backed (FIFO)
//* Enqueue at the tail, dequeue at the head → both O(1).
//* Why not a plain array? `arr.shift()` is O(n) — every dequeue would shift
//* every remaining element by one slot.

class Node {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

class Queue {
    constructor() {
        this.head = null;       // dequeue end
        this.tail = null;       // enqueue end
        this.length = 0;
    }

    //* add value at tail: O(1)
    enqueue(value) {
        const node = new Node(value);
        if (this.tail) {
            this.tail.next = node;
            this.tail = node;
        } else {
            this.head = this.tail = node;
        }
        this.length++;
        return this;
    }

    //* remove value at head: O(1)
    dequeue() {
        if (!this.head) return undefined;
        const value = this.head.value;
        this.head = this.head.next;
        if (!this.head) this.tail = null;
        this.length--;
        return value;
    }

    peek() {
        return this.head?.value;
    }

    size() {
        return this.length;
    }

    isEmpty() {
        return this.length === 0;
    }

    print() {
        let s = '', curr = this.head;
        while (curr) {
            s += curr.value + (curr.next ? ' -> ' : '');
            curr = curr.next;
        }
        console.log(s);
    }
}

// const q = new Queue();
// q.enqueue(12).enqueue(21).enqueue(7).enqueue(77);
// q.dequeue();                  // 12
// console.log(q.peek());        // 21
// q.print();                    // 21 -> 7 -> 77

module.exports = Queue;
