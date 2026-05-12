//! Backtracking — Permutations of an array
//* Generate all orderings. Time: O(n · n!). Space: O(n) recursion.

function permute(nums) {
    const out = [];
    const used = new Array(nums.length).fill(false);
    function dfs(path) {
        if (path.length === nums.length) { out.push([...path]); return; }
        for (let i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            used[i] = true;
            path.push(nums[i]);
            dfs(path);
            path.pop();
            used[i] = false;
        }
    }
    dfs([]);
    return out;
}

// console.log(permute([1, 2, 3]));
// → [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]

module.exports = permute;
