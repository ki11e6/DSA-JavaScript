//*BigO(n^2)

function sumZero(arr) {
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[i] + arr[j] === 0) {
                return [arr[i], arr[j]];
            }
        }
    }
}

let arr = [-4, -3, -2, -1, 0, 1, 2, 5];
console.log(sumZero(arr));

//*BigO(n)

function sumZero(array) {
    let left = 0;
    let right = array.length - 1;
    while (left < right) {
        let sum = array[left] + array[right];
        if (sum === 0) {
            return [array[left], array[right]];
        } else if (sum > 0) {
            right--;
        } else left++;
    }
}

let array = [-4, -3, -2, -1, 0, 1, 2, 5];
console.log(sumZero(array));
