//BigO(n)

function validAnagram(string1, string2) {
    if (string1.length !== string2.length) return false;
    const lookup = {};
    for (let char of string1) {
        lookup[char] = (lookup[char] || 0) + 1;
    }
    for (let char of string2) {
        if (!lookup[char]) return false;
        else lookup[char] -= 1;
    }
    return true;
}

console.log(validAnagram("iceman", "cinema"));
console.log(validAnagram("anagram", "nagaram"));
