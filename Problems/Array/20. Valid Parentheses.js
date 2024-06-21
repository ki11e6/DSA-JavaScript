//!USING STACK

//https://leetcode.com/problems/valid-parentheses/description/

/**
 * @param {string} s
 * @return {boolean}
 */
// var isValid = function (s) {
//     let stack = [];
//     let brackets = {
//         ')': '(',
//         '}': '{',
//         ']': '[',
//     };

//     for (let i = 0; i < s.length; i++) {
//         if (brackets.hasOwnProperty(s[i])) {
//             if (stack[stack.length - 1] == brackets[s[i]] && stack.length > 0) {
//                 stack.pop();
//             } else return false;
//         } else stack.push(s[i]);
//         console.log(stack);
//     }
//     return stack.length > 0 ? false : true;
// };

var isValid = function (s) {
    let stack = [];
    let brackets = {
        ')': '(',
        '}': '{',
        ']': '[',
    };
    for (e of s) {
        if (brackets.hasOwnProperty(e)) {
            if (stack[stack.length - 1] == brackets[e] && stack.length > 0)
                stack.pop();
            else return false;
        } else stack.push(e);
    }
    return stack.length > 0 ? false : true;
};

let s1 = '[]';
let s2 = '([{}])';
let s3 = '[(])';

console.log(isValid(s3));
