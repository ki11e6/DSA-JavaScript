function insertionSort(array) {
    let temp;
    for (let i = 1; i < array.length; i++) {
        temp = array[i];
        for (var j = i - 1; j > -1 && array[j] > temp; j--) {
            array[j + 1] = array[j];
            console.log(array);
        }
        console.log("loop" + i);
        array[j + 1] = temp;
        console.log(array);
    }
    return array;
}

console.log(insertionSort([4, 2, 6, 5, 1, 3]));
