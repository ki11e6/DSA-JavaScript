//! Counting Sort — non-comparison sort
//* O(n + k) time, O(n + k) space, where k is the range of input values.
//* STABLE.
//* Beats O(n log n) when k is small relative to n (e.g., sorting bytes, ages, grades).
//*
//* Used as a subroutine in radix sort.

function countingSort(arr) {
    if (!arr.length) return arr;
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const k = max - min + 1;

    // 1. Count occurrences
    const counts = new Array(k).fill(0);
    for (const v of arr) counts[v - min]++;

    // 2. Cumulative counts → these become indices into the output
    for (let i = 1; i < k; i++) counts[i] += counts[i - 1];

    // 3. Build output by iterating arr from RIGHT to LEFT (preserves stability)
    const out = new Array(arr.length);
    for (let i = arr.length - 1; i >= 0; i--) {
        const v = arr[i];
        out[--counts[v - min]] = v;
    }
    return out;
}

// console.log(countingSort([4, 6, 1, 7, 3, 2, 5]));     // [1, 2, 3, 4, 5, 6, 7]
// console.log(countingSort([-3, 5, -1, 0, 2]));         // [-3, -1, 0, 2, 5]

module.exports = countingSort;
