//https://leetcode.com/problems/baseball-game/description/
/**
 * @param {string[]} operations
 * @return {number}
 */
var calPoints = function (operations) {
    let stack = [];
    for (let i = 0; i < operations.length; i++) {
        if (operations[i] === '+') {
            sum =
                Number(stack[stack.length - 1]) +
                Number(Number(stack[stack.length - 2]));
            stack.push(sum);
        } else if (operations[i] === 'D') {
            double = 2 * Number(stack[stack.length - 1]);
            stack.push(double);
        } else if (operations[i] === 'C') {
            stack.pop();
        } else {
            stack.push(Number(operations[i]));
        }
    }
    return stack.reduce((sum, cur) => {
        return (sum = sum + cur);
    }, 0);
};

let ops1 = ['5', '2', 'C', 'D', '+'];
let ops2 = ['5', '-2', '4', 'C', 'D', '9', '+', '+'];
let ops3 = ['1', 'C'];

console.log(calPoints(ops3));
