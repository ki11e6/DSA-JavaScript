//! Find the 1st element that repeat in an array

//* this will be O(n^2)
function recurrence(array) {
    for (let i = 0; i < array.length; i++) {
        for (let j = i + 1; j < array.length; j++) {
            if (array[i] === array[j]) {
                return array[i];
            }
        }
    }
    return undefined;
}

////////////////////////////////////////////
//* this will  be O(n)
function recurrence2(array) {
    let obj = {};
    for (let i = 0; i < array.length; i++) {
        // obj[array[i]] = (obj[array[i]] + 1) | 1;
        // console.log(obj);
        // if (obj[array[i]] > 1) return array[i];
        console.log(obj);
        if (obj[array[i]]) return array[i];
        obj[array[i]] = 1;
    }
    console.log(obj);
    return undefined;
}

let array = [2, 3, 4, 5, 1, 7, 1, 7];
console.log(recurrence2(array));
