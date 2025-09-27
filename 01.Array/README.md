# Array overview

* An `Array` is an ordered, indexed collection. Indexes are non-negative integers; arrays can be *sparse* (holes). The `length` property is one greater than the highest integer index and can be set to truncate the array. ([MDN Web Docs][2])
* Arrays are objects: they inherit from `Array.prototype`. Many methods are on `Array.prototype`; some are static (on `Array`). There are also well-known symbols (`Symbol.iterator`, `Symbol.species`, `Symbol.isConcatSpreadable`) that affect behavior. ([ECMA International][1])

---

## Properties (on instances / object-level)

* `length` — numeric property that reflects (and can control) number of elements. Mutating `length` can truncate or extend (creates holes). ([MDN Web Docs][2])
* `constructor` — points to `Array` (unless subclassed). ([ECMA International][1])
* Indexed integer properties: `arr[0]`, `arr[1]`, … (these are normal object properties with special length semantics). ([MDN Web Docs][2])

Important symbols related to arrays:

* `Array[Symbol.species]` — controls the constructor used by methods that return new arrays in subclassing scenarios. ([ECMA International][1])
* `Symbol.isConcatSpreadable` — when true on an object, `Array.prototype.concat` will flatten that object’s elements. ([ECMA International][1])
* `Symbol.iterator` — arrays are iterable; `for..of`, spread `[...]`, etc. use the iterator. ([MDN Web Docs][2])

---

## Static methods (on `Array`)

* `Array.from(iterable|arrayLike[, mapFn[, thisArg]])`
* `Array.of(...elements)`
* `Array.isArray(value)`
* (There are also `Array[@@species]` behaviors handled by spec.) ([MDN Web Docs][2])

---

## Prototype / instance methods — full (grouped by behavior)

### **Mutating (in-place) methods**

These change the original array:

* `copyWithin(target, start[, end])`
* `fill(value[, start[, end]])`
* `pop()`
* `push(...items)`
* `reverse()` — *in place* (use `toReversed()` for non-mutating copy). ([MDN Web Docs][3])
* `shift()`
* `sort([compareFn])` — *in place* (use `toSorted()` for non-mutating copy). ([MDN Web Docs][4])
* `splice(start, deleteCount[, ...items])` — *in place* (use `toSpliced()` for copy). ([MDN Web Docs][5])
* `unshift(...items)`

### **Non-mutating / return-new methods**

* `concat(...items)`
* `slice([start[, end]])`
* `map(callback[, thisArg])`
* `filter(callback[, thisArg])`
* `flat([depth=1])`
* `flatMap(callback[, thisArg])`
* `reduce(callback[, initialValue])`
* `reduceRight(callback[, initialValue])`
* `join([separator])`
* `toString()` / `toLocaleString()`
* `toReversed()` — returns a new reversed copy (added in modern ECMAScript). ([MDN Web Docs][6])
* `toSorted([compareFn])` — returns a sorted copy (non-mutating). ([MDN Web Docs][7])
* `toSpliced(start, deleteCount[, ...items])` — returns a copy with splicing applied. ([MDN Web Docs][8])
* `with(index, value)` — returns copy with value replaced at index (non-mutating). ([MDN Web Docs][9])

### **Searching / test methods**

* `indexOf(searchElement[, fromIndex])`
* `lastIndexOf(searchElement[, fromIndex])`
* `includes(valueToFind[, fromIndex])`
* `find(predicate[, thisArg])`
* `findIndex(predicate[, thisArg])`
* `findLast(predicate[, thisArg])` — finds from the end; returns value (newer addition). ([MDN Web Docs][10])
* `findLastIndex(predicate[, thisArg])` — finds index from the end. ([MDN Web Docs][11])
* `some(callback[, thisArg])`
* `every(callback[, thisArg])` ([MDN Web Docs][2])

### **Iteration / view methods**

* `forEach(callback[, thisArg])` — iterate (no return value)
* `entries()` — iterator of `[index, value]` pairs
* `keys()` — iterator of indices
* `values()` — iterator of values
* `[@@iterator]()` — same as `values()`; enables spread and `for..of`. ([MDN Web Docs][2])

### **Transform / utility**

* `fill()` (mutates), `copyWithin()` (mutates) already listed
* `slice()` (copy a portion)
* `flat()` / `flatMap()` (flattening)
* `reverse()` / `toReversed()`
* `sort()` / `toSorted()`
* `splice()` / `toSpliced()`
* `join()` / `toString()` / `toLocaleString()`
* `at(index)` — accepts negative indices (ES2022). Example: `arr.at(-1)` returns last element. ([MDN Web Docs][2])

---

## Mutating vs Non-mutating summary (short)

* Mutating: `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`, `copyWithin`.
* Non-mutating returns new arrays or values: `map`, `filter`, `slice`, `concat`, `flat`, `flatMap`, `toSorted`, `toReversed`, `toSpliced`, `with`, `at`, `findLast`, etc. (Where modern additions marked above produce copies instead of mutating). ([MDN Web Docs][2])

---

## Short examples (practical / modern)

1. `at()` negative index:

```js
const a = [10,20,30];
a.at(-1); // 30
```

2. Non-mutating reverse / sort / splice:

```js
const a = [3,1,2];
const sorted = a.toSorted(); // [1,2,3]    (a unchanged)
const rev = a.toReversed();  // [2,1,3] ? (reverse of original order)
const spliced = a.toSpliced(1,1,99); // returns copy with middle replaced
```

(These newer `to*` methods were standardized in the 2023/2024+ cycle — use them for immutable style). ([MDN Web Docs][7])

3. `findLast` / `findLastIndex`:

```js
const nums = [1,2,3,2];
nums.findLast(x => x === 2);      // 2  (the last matching value)
nums.findLastIndex(x => x === 2); // 3  (index of last match)
```

Useful when you need to search from the end. ([MDN Web Docs][10])

4. Flatten:

```js
const nested = [1, [2, [3]]];
nested.flat(2); // [1,2,3]
nested.flatMap(x => [x, x*2]); // map then flatten 1 level
```

---

## Notes / gotchas

* **Sparse arrays:** `Array(5)` creates five empty slots (not `undefined` entries). Many methods skip holes; be mindful of behavior (e.g., `map` skips holes). ([MDN Web Docs][2])
* **`length` is writable:** Setting `arr.length = 2` truncates. Setting it larger creates holes. ([MDN Web Docs][2])
* **Stability of `sort()`** depends on engine but modern engines use stable sorts; still prefer `toSorted()` with comparator for clarity. ([MDN Web Docs][4])
* **Subclassing arrays:** `Symbol.species` controls which constructor methods use when returning new arrays. See spec for details. ([ECMA International][1])

---

[1]: https://262.ecma-international.org/?utm_source=chatgpt.com "ECMAScript® 2025 Language Specification - Ecma International"
[2]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array?utm_source=chatgpt.com "Array - JavaScript"
[3]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reverse?utm_source=chatgpt.com "Array.prototype.reverse() - JavaScript - MDN - Mozilla"
[4]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort?utm_source=chatgpt.com "Array.prototype.sort() - JavaScript | MDN - Mozilla"
[5]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice?utm_source=chatgpt.com "Array.prototype.splice() - JavaScript - MDN - Mozilla"
[6]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toReversed?utm_source=chatgpt.com "Array.prototype.toReversed() - JavaScript - MDN - Mozilla"
[7]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSorted?utm_source=chatgpt.com "Array.prototype.toSorted() - JavaScript - MDN - Mozilla"
[8]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSpliced?utm_source=chatgpt.com "Array.prototype.toSpliced() - JavaScript - MDN - Mozilla"
[9]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/with?utm_source=chatgpt.com "Array.prototype.with() - JavaScript - MDN - Mozilla"
[10]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findLast?utm_source=chatgpt.com "Array.prototype.findLast() - JavaScript - MDN - Mozilla"
[11]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findLastIndex?utm_source=chatgpt.com "Array.prototype.findLastIndex() - JavaScript - MDN - Mozilla"
