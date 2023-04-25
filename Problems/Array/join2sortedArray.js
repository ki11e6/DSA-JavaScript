function mergeSorted2Array(arr1, arr2) {
    if (arr1.length && arr2.length === 0) return undefined;
    if (arr1.length === 0) return arr2;
    if (arr2.length === 0) return arr1;
    let arr = [...arr1, ...arr2];
    for (let i = 1; i < arr.length; i++) {
        let temp = arr[i];
        for (j = i - 1; j > -1 && arr[j] > temp; j--) {
            arr[j + 1] = arr[j];
        }
        arr[j + 1] = temp;
    }
    return arr;
}

function join2SortedArray(arr1, arr2) {
    if (arr1.length === 0) return arr2;
    if (arr2.length === 0) return arr1;
    let arr = [];
    let arr1Item = arr1[0];
    let arr2Item = arr2[0];
    let i = 1,
        j = 1;
    while (arr1Item || arr2Item) {
        console.log(arr1Item, arr2Item);
        if (arr1Item < arr2Item || !arr2Item) {
            arr.push(arr1Item);
            arr1Item = arr1[i];
            i++;
        } else {
            arr.push(arr2Item);
            arr2Item = arr2[j];
            j++;
        }
    }
    return arr;
}

arr1 = [1, 3, 5, 7, 9];
arr2 = [2, 4, 16, 8, 10];
// x = mergeSorted2Array(arr1, arr2);
x = join2SortedArray(arr1, arr2);
console.log(x);
