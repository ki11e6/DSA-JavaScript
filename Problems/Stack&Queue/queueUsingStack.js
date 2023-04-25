class CrazyQueue {
    constructor() {
        this.firstStack = [];
        this.LastStack = [];
    }
    enqueue(value) {
        const length = this.firstStack.length;
        for (let i = 0; i < length; i++) {
            this.LastStack.push(this.firstStack.pop());
        }
        this.LastStack.push(value);
        return this;
    }

    dequeue() {
        const length = this.LastStack.length;
        for (let i = 0; i < length; i++) {
            this.firstStack.push(this.LastStack.pop());
        }
        this.firstStack.pop();
    }

    peek() {
        if (this.LastStack.length > 0) {
            return this.LastStack[0];
        }
        return this.firstStack[this.firstStack.length - 1];
    }
}

const newQueue = new CrazyQueue();
newQueue.enqueue(23);
newQueue.enqueue(3);
newQueue.enqueue(2);
newQueue.enqueue(11);
newQueue.enqueue(10);
newQueue.peek();
console.log(newQueue);
