//!using Stack
//https://leetcode.com/problems/min-stack/description/

class MinStack {
    constructor() {
        this.arr = [];
        this.minArr = [];
    }
    push(val) {
        this.arr.push(val);
        val = Math.min(
            val,
            this.minArr.length === 0 ? val : this.minArr[this.minArr.length - 1]
        );
        this.minArr.push(val);
    }
    pop() {
        this.arr.pop();
        this.minArr.pop();
    }
    top() {
        return this.arr[this.minArr.length - 1];
    }
    getMin() {
        this.minArr[this.minArr.length - 1];
    }
}

// let stack = new MinStack();
let minStack = new MinStack();
