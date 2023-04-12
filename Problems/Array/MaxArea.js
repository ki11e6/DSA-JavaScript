/*
*https://leetcode.com/problems/container-with-most-water/
?You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]).Find two lines that together with the x-axis form a container, such that the container contains the most water.Return the maximum amount of water a container can store.
*/

//* Usig Brute Force Method ,we get time complexity of O(n^2)
let arr = [4, 8, 1, 2, 3, 9];
const MaxArea = function (arr) {
    let maxArea = 0;
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            area = Math.min(arr[i], arr[j]) * (j - i);
            maxArea = Math.max(maxArea, area);
        }
    }
    return maxArea;
};
// console.log(MaxArea(arr));

//!using 2 pointer technique

let heights = [1, 8, 6, 2, 5, 4, 8, 3, 7];
//!Formula area = min(a,b) x (bi-ai)
const WaterArea = function (heights) {
    let p1 = 0,
        p2 = heights.length - 1,
        maxArea = 0;
    while (p1 < p2) {
        let height = Math.min(heights[p1], heights[p2]);
        let width = p2 - p1;
        let area = height * width;
        maxArea = Math.max(maxArea, area);
        if (heights[p1] <= heights[p2]) {
            p1++;
        } else {
            p2--;
        }
    }
    return maxArea;
};

console.log(WaterArea(heights));
