//! Stack — Array-Backed (LIFO)
//* Last-In-First-Out: push to end, pop from end.
//* Both operations are O(1) amortized (relies on JS Array.prototype.push/pop).
//* Memory is contiguous → cache-friendly. Capacity grows automatically (doubling).

class Stack {
    constructor() {
        this.array = [];
    }

    //* push value onto the top
    push(value) {
        this.array.push(value);
        return this;
    }

    //* remove and return the top value; undefined if empty
    pop() {
        return this.array.pop();
    }

    //* return the top value without removing it
    peek() {
        return this.array[this.array.length - 1];
    }

    size() {
        return this.array.length;
    }

    isEmpty() {
        return this.array.length === 0;
    }

    print() {
        // top → bottom
        console.log([...this.array].reverse().join(' -> '));
    }
}

// const s = new Stack();
// s.push(1).push(2).push(3);
// console.log(s.peek());      // 3
// console.log(s.pop());       // 3
// console.log(s.size());      // 2
// s.print();                  // 2 -> 1

module.exports = Stack;
