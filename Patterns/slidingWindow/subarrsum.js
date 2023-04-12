//*naive method

function maxSubarraySumN(arr, num) {
    if (num > arr.length) return null;
    let max = -Infinity;
    for (let i = 0; i < arr.length - num + 1; i++) {
        temp = 0;
        for (let j = 0; j < num; j++) {
            temp += arr[i + j];
        }
        if (temp > max) {
            max = temp;
        }
    }
    return max;
}

x = maxSubarraySumN([2, 6, 9, 2, 1, 8, 5, 6, 3], 3);
console.log(x);

//!refactored with O(N) usig sliding window method

function maxSubarraySum(arr, num) {
    if (num > arr.length) return null;
    let maxSum = 0;
    let tempSum = 0;
    for (let i = 0; i < num; i++) {
        maxSum += arr[i];
    }
    tempSum = maxSum;
    for (let i = num; i < arr.length; i++) {
        tempSum = tempSum - arr[i - num] + arr[i];
        maxSum = Math.max(maxSum, tempSum);
    }
    return maxSum;
}

x = maxSubarraySum([2, 6, 9, 2, 1, 8, 5, 6, 3], 3);
console.log(x);
