//* ES5

function swap(arr, index1, index2) {
    let temp = arr[index1];
    arr[index1] = arr[index2];
    arr[index2] = temp;
    return arr;
}

//* ES2015

const newSwap = (arr, index1, index2) => {
    [arr[index1], arr[index2]] = [arr[index2], arr[index1]];
    return arr;
};

console.log(swap([1, 2, 3, 4, 5], 2, 3));
console.log(newSwap([1, 2, 3, 4, 5], 2, 3));
