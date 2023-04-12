//*search a short sting inside a long string eg:'omg' in 'ofsdomgaegomg'

function naiveSearch(long, short) {
    let count = 0;
    for (let i = 0; i < long.length; i++) {
        // console.log(i)
        for (let j = 0; j < short.length; j++) {
            if (short[j] != long[i + j]) {
                break;
            }
            if (j == short.length - 1) {
                console.log("fond in index =" + [i, i + j]);
                count++;
            }
            // console.log([i,j])
        }
    }
    return count;
}

x = naiveSearch("lorie loled", "lo");
console.log(x);
