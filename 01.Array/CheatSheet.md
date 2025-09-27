# JavaScript Arrays Cheat Sheet (2025 Edition)

---

## Core Concepts

* **Array**: Ordered, indexed collection. Indices are non-negative integers, can be sparse.
* **length**: One greater than highest index. Writable → can truncate or extend.
* **Arrays are objects**: Inherit from `Array.prototype`.

---

## Properties

* `arr.length` — number of elements (can be set).
* `arr[index]` — access by index.
* Symbols:

  * `Symbol.iterator` — enables iteration (`for..of`, spread).
  * `Symbol.isConcatSpreadable` — flatten in `concat`.
  * `Array[Symbol.species]` — constructor for derived arrays.

---

## Static Methods (`Array.*`)

* `Array.from(iterable[, mapFn[, thisArg]])`
* `Array.of(...elements)`
* `Array.isArray(value)`

---

## Instance Methods

### Mutating (change original)

* `push(...items)` / `pop()`
* `shift()` / `unshift(...items)`
* `splice(start, deleteCount[, ...items])`
* `sort([compareFn])`
* `reverse()`
* `fill(value[, start, end])`
* `copyWithin(target, start[, end])`

### Non-Mutating (return new array)

* `concat(...items)`
* `slice([start, end])`
* `map(fn)` / `filter(fn)`
* `flat([depth])` / `flatMap(fn)`
* `reduce(fn, init)` / `reduceRight(fn, init)`
* `toReversed()` *(ES2023)*
* `toSorted([compareFn])` *(ES2023)*
* `toSpliced(start, deleteCount[, ...items])` *(ES2023)*
* `with(index, value)` *(ES2023)*
* `join([sep])`, `toString()`, `toLocaleString()`

### Searching / Testing

* `indexOf(value[, from])` / `lastIndexOf(value[, from])`
* `includes(value[, from])`
* `find(fn)` / `findIndex(fn)`
* `findLast(fn)` *(ES2023)*
* `findLastIndex(fn)` *(ES2023)*
* `some(fn)` / `every(fn)`

### Iteration

* `forEach(fn)`
* `entries()` → iterator of `[index, value]`
* `keys()` → iterator of indices
* `values()` → iterator of values
* `[Symbol.iterator]()` → default iterator

### Utility

* `at(index)` *(supports negative indices)*

---

## Modern Non-Mutating Replacements

| Old (mutates) | New (copy)     |
| ------------- | -------------- |
| `reverse()`   | `toReversed()` |
| `sort()`      | `toSorted()`   |
| `splice()`    | `toSpliced()`  |
| `arr[i] = v`  | `with(i, v)`   |

---

## Examples

```js
const arr = [3, 1, 2];

// Access
arr.at(-1);           // 2 (last element)

// Non-mutating sort
const sorted = arr.toSorted();   // [1,2,3], arr unchanged

// Non-mutating splice
const replaced = arr.toSpliced(1, 1, 99); // [3, 99, 2]

// Find from end
arr.findLast(x => x < 3);        // 2
arr.findLastIndex(x => x < 3);   // 2

// Flatten
[1, [2, [3]]].flat(2);           // [1,2,3]
```

---

## Gotchas

* **Sparse arrays**: `Array(5)` → 5 empty slots (not `undefined`). Some methods skip holes.
* **length is writable**: `arr.length = 2` truncates.
* **sort() stability**: Modern engines use stable sort; prefer `toSorted()` for clarity.
* **Subclassing**: `Array[Symbol.species]` affects returned constructors.
