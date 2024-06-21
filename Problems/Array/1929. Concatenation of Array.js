//https://leetcode.com/problems/concatenation-of-array/

/**
 * @param {number[]} nums
 * @return {number[]}
 */
// var getConcatenation = function (nums) {
//     let ans = [];
//     let n = nums.length;
//     let j = 0;
//     for (let i = 0; i < 2 * n; i++) {
//         if (i === n) j = 0;
//         ans.push(nums[j]);
//         j++;
//     }
//     return ans;
// };

function getConcatenation(nums) {
    return [...nums, ...nums];
}

let nums1 = [1, 2, 1];
let nums2 = [1, 3, 2, 1];

console.log(getConcatenation(nums1));
