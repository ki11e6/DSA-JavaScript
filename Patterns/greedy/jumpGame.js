//! Greedy — Jump Game
//* Each nums[i] is max jump length. Can you reach the last index?
//* Track the furthest reachable index in O(n).

function canJump(nums) {
    let reach = 0;
    for (let i = 0; i < nums.length; i++) {
        if (i > reach) return false;
        reach = Math.max(reach, i + nums[i]);
    }
    return true;
}

// console.log(canJump([2, 3, 1, 1, 4]));   // true
// console.log(canJump([3, 2, 1, 0, 4]));   // false

module.exports = canJump;
