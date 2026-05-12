# JavaScript — Easy Interview Questions

> **Audience**: Junior / phone screen.
> **Goal**: Implement common utilities from scratch — debounce, throttle, deep clone, flatten, curry, memoize.

---

## Q1. Debounce

> Wait for `delay` ms of silence after the last call before invoking.

```js
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
```

- **Use**: search input, window resize, autosave.
- **Trick**: each call **resets** the timer — only the last call within a quiet period fires.

---

## Q2. Throttle

> Allow `fn` to fire **at most once per `delay` ms**.

```js
function throttle(fn, delay) {
  let waiting = false;
  let lastArgs = null;
  return function(...args) {
    if (waiting) { lastArgs = args; return; }
    fn.apply(this, args);
    waiting = true;
    setTimeout(() => {
      waiting = false;
      if (lastArgs) { fn.apply(this, lastArgs); lastArgs = null; waiting = true;
        setTimeout(() => waiting = false, delay); }
    }, delay);
  };
}
```

- **Use**: scroll, mousemove, drag handlers.
- **Pitfall**: the trailing call (last input within a throttle window) is often expected to fire too — handle it.

---

## Q3. Deep Clone

> Recursively clone an object including nested objects/arrays. Cycles + Dates supported.

```js
function deepClone(obj, seen = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (seen.has(obj)) return seen.get(obj);
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);
  if (Array.isArray(obj)) {
    const copy = [];
    seen.set(obj, copy);
    for (const v of obj) copy.push(deepClone(v, seen));
    return copy;
  }
  const copy = Object.create(Object.getPrototypeOf(obj));
  seen.set(obj, copy);
  for (const key of Reflect.ownKeys(obj)) copy[key] = deepClone(obj[key], seen);
  return copy;
}
```

- **Modern alternative**: `structuredClone(obj)` — built-in, handles cycles, Maps, Sets, typed arrays.
- **Don't use** `JSON.parse(JSON.stringify(obj))`: loses functions, undefined, dates, throws on cycles.

---

## Q4. Flatten Array

> Flatten nested arrays to a given depth.

#### Recursive

```js
function flatten(arr, depth = 1) {
  const out = [];
  for (const v of arr) {
    if (Array.isArray(v) && depth > 0) out.push(...flatten(v, depth - 1));
    else out.push(v);
  }
  return out;
}
```

#### Iterative (using a stack — handles arbitrary depth without recursion)

```js
function flattenDeep(arr) {
  const stack = [...arr];
  const out = [];
  while (stack.length) {
    const top = stack.pop();
    if (Array.isArray(top)) stack.push(...top);
    else out.push(top);
  }
  return out.reverse();
}
```

- **Built-in**: `arr.flat(depth)` since ES2019. `arr.flat(Infinity)` flattens fully.

---

## Q5. Curry

> Convert `f(a, b, c)` into `f(a)(b)(c)`.

```js
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn.apply(this, args);
    return (...next) => curried.apply(this, [...args, ...next]);
  };
}

// const add = (a, b, c) => a + b + c;
// const cAdd = curry(add);
// cAdd(1)(2)(3);    // 6
// cAdd(1, 2)(3);    // 6
// cAdd(1)(2, 3);    // 6
```

- **`fn.length`** is the number of declared parameters → use as completion threshold.

---

## Q6. Memoize

> Cache results so repeated calls with same args return instantly.

```js
function memoize(fn, keyFn = JSON.stringify) {
  const cache = new Map();
  return function(...args) {
    const key = keyFn(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}
```

- **Pitfall**: `JSON.stringify` doesn't work for functions, Dates, undefined, cycles. Pass a custom `keyFn` for those.
- **Cache bound**: the version above grows unbounded → in production, use an LRU cache.

---

## Q7. Once

> Function that runs only the first time it's called.

```js
function once(fn) {
  let called = false, result;
  return function(...args) {
    if (called) return result;
    called = true;
    result = fn.apply(this, args);
    return result;
  };
}
```

- **Use**: initialization that must happen exactly once.

---

## Q8. Type Checker

> Reliable `typeOf` that distinguishes arrays, dates, regex, null, etc.

```js
function typeOf(v) {
  return Object.prototype.toString.call(v).slice(8, -1).toLowerCase();
}

// typeOf(null);          // 'null'
// typeOf([1, 2]);        // 'array'
// typeOf(new Date());    // 'date'
// typeOf(/abc/);         // 'regexp'
```

- **Why this works**: `Object.prototype.toString` returns `[object Type]` for any value, including primitives.

---

## Q9. Capitalize Words

```js
function capitalize(s) {
  return s.split(' ').map(w => w[0]?.toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}
```

- **Time**: O(n) · **Space**: O(n)
- **Pitfall**: empty words from double spaces. Filter or join with single space.

---

## Q10. Fisher–Yates Shuffle

> Uniform random permutation in-place.

```js
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

- **Time**: O(n) · **Space**: O(1)
- **Pitfall — naive shuffle (`arr.sort(() => Math.random() - 0.5)`)**: distribution is biased, the comparator must be a true ordering.

---

## Q11. Array `map` Polyfill

```js
Array.prototype.myMap = function(callback, thisArg) {
  const out = new Array(this.length);
  for (let i = 0; i < this.length; i++) {
    if (i in this) out[i] = callback.call(thisArg, this[i], i, this);
  }
  return out;
};
```

- **Time**: O(n) · **Space**: O(n)
- **Pitfall**: must skip holes (`if (i in this)`) for sparse arrays.

---

## Q12. Promise Basics — Sequential vs Parallel

```js
// Sequential — total = sum of times
async function sequential() {
  const a = await fetchA();
  const b = await fetchB();
  return [a, b];
}

// Parallel — total = max time
async function parallel() {
  const [a, b] = await Promise.all([fetchA(), fetchB()]);
  return [a, b];
}
```

**Common bug**: starting both fetches in `await` separately:

```js
const a = await fetchA();         // ✗ this serializes them
const b = await fetchB();
```

Even if these are independent, the `await` on the first stops the second from starting.

---

## Q13. `setTimeout` Promisified

```js
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Usage:
async function go() {
  console.log('start');
  await delay(1000);
  console.log('after 1s');
}
```

- **Pattern**: wrap any callback-based API with `new Promise(resolve, reject)`.

---

## Q14. Sleep without `setTimeout`

> Just for practice — wraps timers.

```js
const sleep = ms => new Promise(r => setTimeout(r, ms));
```

Most modern code calls this `sleep` or `delay`. Don't reinvent in production unless you need cancellation.

---

## Q15. Convert Callback to Promise (Promisify)

```js
function promisify(fn) {
  return (...args) => new Promise((resolve, reject) => {
    fn(...args, (err, result) => err ? reject(err) : resolve(result));
  });
}
```

- **Use**: bridging Node-style callbacks (`(err, data) => …`) to async/await.
- **Built-in**: Node has `util.promisify`.

---

## Patterns Cheatsheet (Easy)

| Pattern                    | Trigger                                           | Examples here    |
| -------------------------- | ------------------------------------------------- | ---------------- |
| **Timer-based wrapping**   | Debounce / throttle / delay                       | Q1, Q2, Q13      |
| **Recursive descent**      | Deep clone / flatten                              | Q3, Q4           |
| **Closure as cache**       | Memoize / once                                    | Q6, Q7           |
| **Higher-order function**  | Curry / debounce / throttle                       | Q1, Q2, Q5       |
| **Polyfill an iterator**   | `map`, `filter`, `reduce`                         | Q11              |
| **Promise wrapper**        | Promisify / sleep / new Promise                   | Q13, Q14, Q15    |
| **Random sampling**        | Fisher-Yates shuffle                              | Q10              |
