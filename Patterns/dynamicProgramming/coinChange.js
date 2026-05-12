//! DP — Coin Change (min coins for amount)
//* O(n · amount) time, O(amount) space.
//* Greedy fails for non-canonical coin systems (e.g., [1, 3, 4]).

function coinChange(coins, amount) {
    const dp = new Array(amount + 1).fill(Infinity);
    dp[0] = 0;
    for (let i = 1; i <= amount; i++) {
        for (const c of coins) {
            if (c <= i) dp[i] = Math.min(dp[i], dp[i - c] + 1);
        }
    }
    return dp[amount] === Infinity ? -1 : dp[amount];
}

// console.log(coinChange([1, 2, 5], 11));   // 3 (5 + 5 + 1)
// console.log(coinChange([2], 3));          // -1

module.exports = coinChange;
