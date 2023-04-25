//! Find if there is any common items in give 2 arrays

function itemInCommon(arr1, arr2) {
    let obj = {};
    for (let i = 0; i < arr1.length; i++) {
        obj[arr1[i]] = true;
    }
    for (let j = 0; j < arr2.length; j++) {
        if (obj.hasOwnProperty(arr2[j])) {
            return true;
        }
    }
    return false;
}

console.log(itemInCommon([1, 2, 3, 6], [6, 7, 4, 33]));
