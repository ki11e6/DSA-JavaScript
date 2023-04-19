//!space Complexity increases as we break down the array so O(n).
//!Time Complexity , when we break down it is O(logn) operation and when we put them back together is O(n). So together we get O(n log n)

function mergeCombine(arr1, arr2) {
    let combined = [];
    let i = 0;
    let j = 0;
    while (i < arr1.length && j < arr2.length) {
        if (arr1[i] < arr2[j]) {
            combined.push(arr1[i]);
            i++;
        } else {
            combined.push(arr2[j]);
            j++;
        }
    }
    while (i < arr1.length) {
        combined.push(arr1[i]);
        i++;
    }
    while (j < arr2.length) {
        combined.push(arr2[j]);
        j++;
    }
    return combined;
}

function mergeSort(array) {
    if (array.length === 1) return array;
    let mid = Math.floor(array.length / 2);
    let left = array.slice(0, mid);
    let right = array.slice(mid);
    return mergeCombine(mergeSort(left), mergeSort(right));
}

array = [3, 1, 4, 2, 9, 0, 5, 2];

console.log(mergeSort(array));
