//! DP — Climbing Stairs (Fibonacci variant)
//* f(n) = f(n-1) + f(n-2). Two rolling vars, O(n) time, O(1) space.

function climbStairs(n) {
    let a = 1, b = 1;
    for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
    return b;
}

// console.log(climbStairs(5));   // 8

module.exports = climbStairs;
