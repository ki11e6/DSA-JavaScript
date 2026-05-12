//! Bit Manipulation — Single Number (XOR cancellation)
//* Every element appears twice except one. Find it in O(n) time, O(1) space.
//* Trick: x ^ x = 0, x ^ 0 = x, XOR is commutative — pairs cancel.

const singleNumber = nums => nums.reduce((a, b) => a ^ b, 0);

// console.log(singleNumber([2, 2, 1]));         // 1
// console.log(singleNumber([4, 1, 2, 1, 2]));   // 4

module.exports = singleNumber;
