/*
!The sort() function in JavaScript sorts the elements of an array by converting them to strings and comparing their sequences of UTF-16 code unit values. By default, it performs a lexicographic (dictionary) sort, which means that the array elements are sorted based on their string representations.
*/
let array = [6, 4, 15, 10];
array.sort();
//! the output will be [10,15,4,6]
/*
 *Notice that the array is sorted lexicographically as strings, not numerically as numbers. This is because the numbers are compared as strings, so the sorting is based on their string representations. To sort the array numerically, you can provide a custom comparison function as an argument to the sort() function. Here's an example:
 */
array.sort((a, b) => {
    return a - b;
});
//! the output will be [4, 6, 10, 15] , it depent on the return value if its +ve ascending order or for -ve descending order.
