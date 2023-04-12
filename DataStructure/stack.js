//!stack created using Linked List
//!in Linkedlist adding to head and removing from head is BigO(1)
//*Last In Last Out

class Node {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

class Stack {
    constructor(value) {
        const newNode = new Node(value);
        this.top = newNode;
        this.length = 1;
    }
    push(value) {
        const newNode = new Node(value);
        if (this.length === 0) {
            this.top = newNode;
        } else {
            newNode.next = this.top;
            this.top = newNode;
        }
        this.length++;
        return this;
    }
    pop() {
        if (this.length === 0) return undefined;
        let temp = this.top;
        this.top = this.top.next;
        temp.next = null;
        this.length--;
        return temp;
    }
}

let myStack = new Stack(22);
myStack.push(10);
myStack.push(2);
myStack.push(32);
myStack.push(62);
myStack.pop();
console.log(myStack);
