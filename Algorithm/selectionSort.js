//*In selection sort we take 1st element and compare with rest if found any smallest initial value of min which was i will be change to the index of the smallest and compare that value with rest in the 2nd loop.
//*after 2nd iteration we swap with the ith position.

function selectionSort(array) {
    for (let i = 0; i < array.length - 1; i++) {
        let min = i;
        for (let j = i + 1; j < array.length; j++) {
            if (array[min] > array[j]) {
                min = j;
            }
        }
        if (i !== min) {
            let temp = array[i];
            array[i] = array[min];
            array[min] = temp;
        }
    }
    return array;
}

console.log(selectionSort([3, 1, 6, 2, 7, 9, 5]));
