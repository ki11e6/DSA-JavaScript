//! Heap Sort
//* O(n log n) time in ALL cases (best/avg/worst — unlike quicksort).
//* O(1) extra space (in-place).
//* NOT stable — equal elements may swap order.
//*
//* Two phases:
//*   1. Heapify the array into a max-heap (O(n)).
//*   2. Repeatedly swap heap[0] (largest) with heap[end], then siftDown.
//*
//* Use heap sort when you need:
//*   - guaranteed O(n log n) (vs quicksort's O(n²) worst case)
//*   - in-place sorting (vs merge sort's O(n) extra)

function heapSort(arr) {
    const n = arr.length;

    // 1. Build max-heap bottom-up — O(n) thanks to amortized analysis
    for (let i = (n >> 1) - 1; i >= 0; i--) siftDown(arr, i, n);

    // 2. Pop the max one at a time, shrinking the heap
    for (let end = n - 1; end > 0; end--) {
        [arr[0], arr[end]] = [arr[end], arr[0]];      // move max to its final position
        siftDown(arr, 0, end);                         // restore heap on the prefix [0..end-1]
    }
    return arr;
}

function siftDown(arr, i, end) {
    while (true) {
        const l = i * 2 + 1, r = i * 2 + 2;
        let largest = i;
        if (l < end && arr[l] > arr[largest]) largest = l;
        if (r < end && arr[r] > arr[largest]) largest = r;
        if (largest === i) return;
        [arr[i], arr[largest]] = [arr[largest], arr[i]];
        i = largest;
    }
}

// console.log(heapSort([4, 6, 1, 7, 3, 2, 5]));   // [1, 2, 3, 4, 5, 6, 7]

module.exports = heapSort;
