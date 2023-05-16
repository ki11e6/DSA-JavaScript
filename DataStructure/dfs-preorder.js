function DFSpreorder() {
    let results = [];
    function traverse(currentNode) {
        results.push(currentNode);
        if (currentNode.left) traverse(currentNode.left);
        if (currentNode.right) traverse(currentNode.right);
    }
    traverse(this.root);
    return results;
}
