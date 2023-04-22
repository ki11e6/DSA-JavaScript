//* reverse a string="my name is sharath" to "htarahs si eman ym"

function reverse1(str) {
    if (str.length === 0) return undefined;
    let backwards = [];
    for (let i = str.length - 1; i >= 0; i--) {
        backwards.push(str[i]);
    }
    return backwards.join('');
}

function reverse2(str) {
    if (str.length === 0) return undefined;
    return str.split('').reverse().join('');
}

const reverse = (str) => {
    if (str.length === 0) return undefined;
    return [...str].reverse().join('');
};

let str = 'my name is sharath';
console.log(reverse(str));
