//*in bubble Sort we compare 1st element with right adjacent and then 2nd element to its right adjacent and so on.
//!like that the LAST ELEMENT in the array will be LARGEST after each iteration.

function bubbleSort(array) {
    for (let i = array.length - 1; i > 0; i--) {
        for (let j = 0; j < i; j++) {
            if (array[j] > array[j + 1]) {
                let temp = array[j];
                array[j] = array[j + 1];
                array[j + 1] = temp;
            }
        }
    }
    return array;
}

// console.log(bubbleSort([4, 2, 6, 5, 1, 3, 0]));

//////////////////////////////////////////////////////////////////////////

//UNOPTIMIZED CODE

function bbSort(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        let noSwaps = true;
        for (let j = 0; j < i; j++) {
            if (arr[j] > arr[j + 1]) {
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
                noSwaps = false;
                console.log(arr);
            }
        }
        if (noSwaps) break;
    }
    return arr;
}

let arr = [11, 7, 3, 11, 9, 10];
console.log(bbSort(arr));

//!best case is when the array is sorted then time complexity is BigO(n)
//!Worst case is when in reverse order/require maximum swaping then its BigO(n^2)
