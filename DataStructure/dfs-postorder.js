function DFSPostorder() {
    let results = [];
    function traverse(currentNode) {
        if (currentNode.left) traverse(currentNode.left);
        if (currentNode.right) traverse(currentNode.right);
        results.push(currentNode.value);
    }
    traverse(this.root);
    return results;
}
