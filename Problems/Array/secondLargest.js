function secondLargest(n, vec) {
    // size of array should be greater than 1
    if (n < 2) {
        console.log("Invalid Input");
        return;
    }
    let count = {};
    for (let i = 0; i < n; i++) {
        if (vec[i] in count) {
            count[vec[i]] += 1;
        } else {
            count[vec[i]] = 1;
        }
    }

    // checking if count size is equal to 1
    // it means only largest element exist
    // there is no second largest element
    if (count.length == 1) {
        console.log("No second largest element exist");
        return;
    }

    let keys = Object.keys(count);
    console.log(keys[keys.length - 2]);
}
let vec = [12, 35, 1, 10, 34, 1];

secondLargest(vec.length, vec);

// This code is contributed by sdeadityasharma.
