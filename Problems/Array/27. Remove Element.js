//https://leetcode.com/problems/remove-element/description/

/**
 * @param {number[]} nums
 * @param {number} val
 * @return {number}
 */
var removeElement = function (nums, val) {
    let k = 0;
    for (let i = 0; i < nums.length; i++) {
        if (nums[i] !== val) {
            nums[k] = nums[i];
            k = k + 1;
        }
    }
    return k;
};

const nums1 = [3, 2, 2, 3];
const nums2 = [0, 1, 2, 2, 3, 0, 4, 2];

console.log(removeElement(nums2, 2));
