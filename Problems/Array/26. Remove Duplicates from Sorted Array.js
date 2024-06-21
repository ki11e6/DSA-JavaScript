//https://leetcode.com/problems/remove-duplicates-from-sorted-array/description/

/**
 * @param {number[]} nums
 * @return {number}
 */

// two pointer solution.

var removeDuplicates = function (nums) {
    let l = 1;
    let r;
    for (r = 1; r < nums.length; r++) {
        if (nums[r] != nums[r - 1]) {
            nums[l] = nums[r];
            l++;
        }
    }
    return nums.slice(0, l);
};

const nums1 = [1, 1, 2];

const nums2 = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4];

console.log(removeDuplicates(nums2));
