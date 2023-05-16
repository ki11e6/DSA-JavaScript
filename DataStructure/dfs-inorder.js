function DFSInOrder() {
    let results = [];
    function traverse(currentNode) {
        if (currentNode.left) traverse(currentNode.left);
        results.push(currentNode.value);
        if (currentNode.right) traverse(currentNode.right);
    }
    traverse(this.root);
    return results;
}
