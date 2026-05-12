//! Recursion — Factorial (basic recursion drill)
//* O(n) time, O(n) stack.
//* Tail-recursive variant included; V8 doesn't actually optimize it (no TCO).

function factorial(n) {
    if (n < 0) throw new RangeError('negative');
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

function factorialTail(n, acc = 1) {
    if (n < 0) throw new RangeError('negative');
    if (n <= 1) return acc;
    return factorialTail(n - 1, n * acc);
}

function factorialIter(n) {
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
}

// console.log(factorial(5));      // 120
// console.log(factorialTail(5));  // 120
// console.log(factorialIter(5));  // 120

module.exports = { factorial, factorialTail, factorialIter };
