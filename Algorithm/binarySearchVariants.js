//! Binary Search — Standard + Common Variants
//* All run in O(log n) time, O(1) space (iterative form below).
//*
//* The art of binary search isn't writing the loop — it's stating the LOOP INVARIANT
//* clearly. Pick a variant template and stick with it; mixing them causes off-by-one bugs.

//! Variant 1: Find exact match. Return index, or -1.
function binarySearch(arr, target) {
    let lo = 0, hi = arr.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid] === target) return mid;
        if (arr[mid] < target) lo = mid + 1;
        else                   hi = mid - 1;
    }
    return -1;
}

//! Variant 2: Lower bound — leftmost index where `arr[i] >= target`.
//* Returns arr.length if no such index. Equivalent to C++ `std::lower_bound`.
function lowerBound(arr, target) {
    let lo = 0, hi = arr.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid] < target) lo = mid + 1;
        else                   hi = mid;
    }
    return lo;
}

//! Variant 3: Upper bound — leftmost index where `arr[i] > target`.
//* Returns arr.length if all elements are ≤ target.
function upperBound(arr, target) {
    let lo = 0, hi = arr.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid] <= target) lo = mid + 1;
        else                    hi = mid;
    }
    return lo;
}

//! Variant 4: Count of `target` in a sorted array — O(log n) via the two bounds.
function countOccurrences(arr, target) {
    return upperBound(arr, target) - lowerBound(arr, target);
}

//! Variant 5: Search-on-the-answer template.
//* `canDo(x)` is monotonic: if true for x, true for all > x.
//* Find the smallest x where `canDo(x)` is true within [lo, hi].
function searchOnAnswer(lo, hi, canDo) {
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (canDo(mid)) hi = mid;
        else            lo = mid + 1;
    }
    return lo;
}

// const arr = [1, 2, 4, 4, 4, 5, 7, 9];
// console.log(binarySearch(arr, 4));       // 2 (any of indices 2, 3, 4 — depends on impl)
// console.log(lowerBound(arr, 4));         // 2
// console.log(upperBound(arr, 4));         // 5
// console.log(countOccurrences(arr, 4));   // 3
// console.log(countOccurrences(arr, 6));   // 0
// console.log(searchOnAnswer(0, 100, x => x * x >= 50));   // 8 (smallest x with x² ≥ 50)

module.exports = {
    binarySearch,
    lowerBound,
    upperBound,
    countOccurrences,
    searchOnAnswer,
};
