//! NO multi pointer method instead freq count method

function uniqNumbs(arr) {
    arrCounter = {};
    for (let val of arr) {
        arrCounter[val] = (arrCounter[val] || 0) + 1;
    }
    return Object.keys(arrCounter).length;
}

// console.log(uniqNumbs([1, 1, 1, 1, 1, 2]));

//*using multi pointer

function UniquCount(array) {
    if (array.length === 0) return undefined;
    let i = 0;
    for (j = 1; j < array.length; j++) {
        if (array[i] !== array[j]) {
            i++;
            array[i] = array[j];
        }
    }
    return i + 1;
}

console.log(UniquCount([1, 1, 1, 2, 3, 3, 4, 4, 5, 6, 7]));
// console.log(UniquCount([]));
