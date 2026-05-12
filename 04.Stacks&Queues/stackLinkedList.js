//! Stack — Linked-List Backed (LIFO)
//* push and pop happen at the head → both O(1) without any reallocation.
//* No capacity ceiling beyond available memory.
//* Trade-off: extra pointer per element + cache misses (vs. array-backed).

class Node {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

class Stack {
    constructor() {
        this.top = null;
        this.length = 0;
    }

    //* push at head: O(1), no resize ever
    push(value) {
        const node = new Node(value);
        node.next = this.top;
        this.top = node;
        this.length++;
        return this;
    }

    //* pop at head: O(1)
    pop() {
        if (!this.top) return undefined;
        const value = this.top.value;
        this.top = this.top.next;
        this.length--;
        return value;
    }

    peek() {
        return this.top?.value;
    }

    size() {
        return this.length;
    }

    isEmpty() {
        return this.length === 0;
    }

    print() {
        let s = '', curr = this.top;
        while (curr) {
            s += curr.value + (curr.next ? ' -> ' : '');
            curr = curr.next;
        }
        console.log(s);
    }
}

// const s = new Stack();
// s.push(22).push(10).push(2).push(32).push(62);
// s.pop();                       // 62
// console.log(s.peek());         // 32
// s.print();                     // 32 -> 2 -> 10 -> 22

module.exports = Stack;
