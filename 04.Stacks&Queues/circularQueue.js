//! Circular Queue — Fixed-Capacity Ring Buffer (FIFO)
//* All operations O(1) using a fixed-size array + two indices wrapping with modulo.
//* No allocations after construction → ideal for streaming logs, audio buffers, IPC.
//* `head` points to the next slot to dequeue from.
//* `tail` points to the next slot to enqueue into.

class CircularQueue {
    constructor(capacity) {
        if (!capacity || capacity < 1) throw new RangeError('capacity must be ≥ 1');
        this.buf = new Array(capacity);
        this.cap = capacity;
        this.head = 0;
        this.tail = 0;
        this.length = 0;
    }

    //* enqueue at tail; return false if full
    enqueue(value) {
        if (this.length === this.cap) return false;
        this.buf[this.tail] = value;
        this.tail = (this.tail + 1) % this.cap;
        this.length++;
        return true;
    }

    //* dequeue at head; return undefined if empty
    dequeue() {
        if (this.length === 0) return undefined;
        const value = this.buf[this.head];
        this.buf[this.head] = undefined;             // help GC
        this.head = (this.head + 1) % this.cap;
        this.length--;
        return value;
    }

    front() {
        return this.length === 0 ? undefined : this.buf[this.head];
    }

    rear() {
        return this.length === 0 ? undefined : this.buf[(this.tail - 1 + this.cap) % this.cap];
    }

    isEmpty() { return this.length === 0; }
    isFull()  { return this.length === this.cap; }
    size()    { return this.length; }

    print() {
        const items = [];
        for (let i = 0, idx = this.head; i < this.length; i++, idx = (idx + 1) % this.cap) {
            items.push(this.buf[idx]);
        }
        console.log(items.join(' -> '));
    }
}

// const q = new CircularQueue(3);
// q.enqueue(1); q.enqueue(2); q.enqueue(3);
// console.log(q.enqueue(4));   // false — full
// console.log(q.front());      // 1
// console.log(q.rear());       // 3
// q.dequeue();                 // 1
// q.enqueue(4);                // wraps to slot 0
// q.print();                   // 2 -> 3 -> 4

module.exports = CircularQueue;
