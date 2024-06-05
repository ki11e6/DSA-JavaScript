let nums = [1, 3, 7, 9, 2];
let target = 11;
const twoSum = function (nums, target) {
    const obj = {};
    //! way #1
    // for (let i = 0; i < nums.length; i++) {
    //     const curObjVal = obj[nums[i]];
    //     if (curObjVal >= 0) {
    //         return [curObjVal, i];
    //     } else {
    //         const NumToFind = target - nums[i];
    //         obj[NumToFind] = i;
    //     }
    // }
    //! way #2
    for (let i = 0; i < nums.length; i++) {
        const numFind = target - nums[i];
        if (obj.hasOwnProperty(numFind)) {
            return [obj[numFind], i];
        }
        obj[nums[i]] = i;
    }
    return null;
};

console.log(twoSum(nums, target));
