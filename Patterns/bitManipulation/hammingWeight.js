//! Bit Manipulation — Number of 1 bits (Hamming weight)
//* Brian Kernighan's algorithm: each iteration clears the lowest set bit.
//* O(set bits) time, O(1) space.

function hammingWeight(n) {
    let count = 0;
    while (n) { n &= n - 1; count++; }
    return count;
}

// console.log(hammingWeight(11));    // 3 (binary 1011)
// console.log(hammingWeight(128));   // 1 (binary 10000000)

module.exports = hammingWeight;
