//! Greedy — Non-overlapping Intervals
//* Min number of intervals to remove so the rest don't overlap.
//* Sort by end time, then keep the one ending earliest at each step.

function eraseOverlapIntervals(intervals) {
    intervals.sort((a, b) => a[1] - b[1]);
    let count = 0, end = -Infinity;
    for (const [s, e] of intervals) {
        if (s >= end) end = e;
        else count++;
    }
    return count;
}

// console.log(eraseOverlapIntervals([[1,2],[2,3],[3,4],[1,3]]));   // 1

module.exports = eraseOverlapIntervals;
