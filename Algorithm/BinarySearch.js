function binaySearch(arr, elem) {
    let start = 0;
    let end = arr.length - 1;
    let middle = Math.floor((start + end) / 2);
    while (arr[middle] !== elem && start <= end) {
        // console.log(start, middle, end);
        if (arr[middle] > elem) {
            end = middle - 1;
        } else {
            start = middle + 1;
        }
        middle = Math.floor((start + end) / 2);
    }
    if (arr[middle] === elem) {
        return middle;
    }
    return -1;
}

binaySearch([2, 4, 6, 7, 23, 54, 56, 77, 87, 92], 56);

//!BigO(logN)
