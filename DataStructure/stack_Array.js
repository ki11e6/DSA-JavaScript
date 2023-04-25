class Stack {
    constructor(value) {
        this.array = [];
        this.array.push(value);
        this.length = this.array.length;
    }
    peak() {
        return this.array[this.length - 1];
    }
    push(value) {
        this.array.push(value);
        this.length++;
        return this.array;
    }
    pop() {
        this.array.pop();
        this.length--;
        return this.array;
    }
}

let newStack = new Stack('google');
newStack.push('facebook');
newStack.push('linkedIn');
newStack.push('flipkart');
newStack.push('amazon');
newStack.pop();
console.log(newStack);
