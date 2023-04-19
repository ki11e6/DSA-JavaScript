//!Space Complexity is O(1)
//!Time Complexity is O(n log n)
//!worst case is when the given array is already sorted hence there won't be a pivot so it will be Big O(n^2)

//* Quick sorting method is best for unsorted random array. For sorted Insertion sort is best.

function swap(array, firstIndex, secondIndex) {
    let temp = array[firstIndex];
    array[firstIndex] = array[secondIndex];
    array[secondIndex] = temp;
}

function pivot(array, pivotIndex = 0, endIndex = array.length - 1) {
    let swapIndex = pivotIndex;
    for (let i = pivotIndex + 1; i <= endIndex; i++) {
        if (array[i] < array[pivotIndex]) {
            swapIndex++;
            swap(array, swapIndex, i);
        }
    }
    swap(array, pivotIndex, swapIndex);
    return swapIndex;
}

function quickSort(array, left = 0, right = array.length - 1) {
    if (left < right) {
        let pivotIndex = pivot(array, left, right);
        quickSort(array, left, pivotIndex - 1);
        quickSort(array, pivotIndex + 1, right);
    }
    return array;
}

let myArray = [4, 6, 1, 7, 3, 2, 5];
console.log("Before: " + myArray);
quickSort(myArray);
console.log("After: " + myArray);
