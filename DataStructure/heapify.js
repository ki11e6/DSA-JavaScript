function heapify(arr, n, i) {
    let largest = i;
    let left = 2 * i + 1;
    let right = 2 * i + 2;

    if (left < n && arr[left] > arr[largest]) {
        largest = left;
    }

    if (right < n && arr[right] > arr[largest]) {
        largest = right;
    }

    if (largest !== i) {
        let temp = arr[i];
        arr[i] = arr[largest];
        arr[largest] = temp;

        heapify(arr, n, largest);
    }
}

// Example usage:
let arr = [3, 2, 1, 5, 6, 4];
let n = arr.length;
for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(arr, n, i);
}
console.log(arr);
