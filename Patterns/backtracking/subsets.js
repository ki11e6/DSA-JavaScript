//! Backtracking — Power Set (all subsets)
//* Time: O(n · 2ⁿ). Space: O(n) recursion.

function subsets(nums) {
    const out = [];
    function dfs(i, path) {
        out.push([...path]);
        for (let j = i; j < nums.length; j++) {
            path.push(nums[j]);
            dfs(j + 1, path);
            path.pop();
        }
    }
    dfs(0, []);
    return out;
}

// console.log(subsets([1, 2, 3]));
// → [[],[1],[1,2],[1,2,3],[1,3],[2],[2,3],[3]]

module.exports = subsets;
