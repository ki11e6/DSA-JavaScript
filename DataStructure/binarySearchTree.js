class Node {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

class BinarySearchTree {
    constructor() {
        this.root = null;
    }
    insert(value) {
        const newNode = new Node(value);
        if (this.root === null) {
            this.root = newNode;
            return this;
        }
        let temp = this.root;
        while (true) {
            if (newNode.value === temp.value) return undefined;
            if (newNode.value < temp.value) {
                if (temp.left === null) {
                    temp.left = newNode;
                    return this;
                }
                temp = temp.left;
            } else {
                if (temp.right === null) {
                    temp.right = newNode;
                    return this;
                }
                temp = temp.right;
            }
        }
    }
    contains(value) {
        if (this.root === null) return false;
        let temp = this.root;
        while (temp) {
            if (value < temp.value) {
                temp = temp.left;
            } else if (value > temp.value) {
                temp = temp.right;
            } else {
                return true;
            }
        }
        return false;
    }

    remove(value) {
        if (!this.root) return undefined;
        let currentNode = this.root;
        let parentNode = null;
        while (currentNode) {
            if (value < currentNode.value) {
                parentNode = currentNode;
                currentNode = currentNode.left;
            } else if (value > currentNode.value) {
                parentNode = currentNode;
                currentNode = currentNode.right;
            } else if (currentNode.value === value) {
                //we found a match
                //option 1:No right child
                if (currentNode.right === null) {
                    if (parentNode == null) {
                        this.root = currentNode.left;
                    } else {
                        //if parent >current value ,make  current left child a child of parent
                        if (currentNode.value < parentNode.value) {
                            parentNode.left = currentNode.left;
                        }
                        //if parent < current value, make left child a right child of parent
                        else if (currentNode.value > parentNode.value) {
                            parentNode.right = currentNode.left;
                        }
                    }
                }
                //Option 2: Right child which doesnt have a left child
                else if (currentNode.right.left === null) {
                    currentNode.right.left = currentNode.left;
                    if (parentNode === null) {
                        this.root = currentNode.right;
                    } else {
                        //if parent > current, make right child of the left the parent
                        if (currentNode.value < parentNode.value) {
                            parentNode.left = currentNode.right;
                        }
                        //if parent < current, make right child a right child of the parent
                        else if (currentNode.value > parentNode.value) {
                            parentNode.right = currentNode.right;
                        }
                    }
                }
                //option 3: right child that has a left child
                else {
                    //find the right child's left most child
                    let leftmost = currentNode.right.left;
                    let leftmostParent = currentNode.right;
                    while (leftmost.left !== null) {
                        leftmostParent = leftmost;
                        leftmost = leftmost.left;
                    }
                    //Parent's left subtree is now leftmost's right subtree
                    leftmostParent.left = leftmost.right;
                    leftmost.left = currentNode.left;
                    leftmost.right = currentNode.right;
                    if (parentNode === null) {
                        this.root = leftmost;
                    } else {
                        if (currentNode < parentNode.value) {
                            parentNode.left = leftmost;
                        } else if (currentNode.value > parentNode.value) {
                            parentNode.right = leftmost;
                        }
                    }
                }
                return true;
            }
        }
    }

    //*BREADTH FIRST SEARCH

    BFS() {
        let currentNode = this.root;
        let queue = [];
        let results = [];
        queue.push(currentNode);
        while (queue.length) {
            currentNode = queue.shift();
            results.push(currentNode.value);
            if (currentNode.left) queue.push(currentNode.left);
            if (currentNode.right) queue.push(currentNode.right);
        }
        return results;
    }

    //*Depth First Search Preorder
    DFSpreorder() {
        let results = [];
        function traverse(currentNode) {
            results.push(currentNode.value);
            if (currentNode.left) traverse(currentNode.left);
            if (currentNode.right) traverse(currentNode.right);
        }
        traverse(this.root);
        return results;
    }

    //*Depth First Search Postorder
    DFSPostorder() {
        let results = [];
        function traverse(currentNode) {
            if (currentNode.left) traverse(currentNode.left);
            if (currentNode.right) traverse(currentNode.right);
            results.push(currentNode.value);
        }
        traverse(this.root);
        return results;
    }

    //*Depth First Search InOrder
    DFSInOrder() {
        let results = [];
        function traverse(currentNode) {
            if (currentNode.left) traverse(currentNode.left);
            results.push(currentNode.value);
            if (currentNode.right) traverse(currentNode.right);
        }
        traverse(this.root);
        return results;
    }
}

let myTree = new BinarySearchTree();
myTree.insert(3);
myTree.insert(1);
myTree.insert(2);
myTree.insert(4);
myTree.insert(9);
myTree.insert(5);
console.log('BFS', myTree.BFS());
console.log('DFS preorder', myTree.DFSpreorder());
console.log('DFS postorder', myTree.DFSPostorder());
console.log('DFS InOrder', myTree.DFSInOrder());
