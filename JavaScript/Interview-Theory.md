# JavaScript — Theoretical / Conceptual Interview Questions

> **Audience**: All levels — junior to senior frontend / Node engineers.
> **Goal**: Master the JS language internals interviewers probe: hoisting, closures, prototype, `this`, event loop, promises, types, modules.

---

## 1. Variables & Scope

---

### Q1. What is hoisting?

**Short**: declarations are conceptually moved to the top of their scope before code runs.

| Declaration | Hoisted? | Initial value |
| ----------- | -------- | ------------- |
| `var`       | yes      | `undefined`   |
| `function`  | yes (entire function) | the function |
| `let` / `const` | yes (the *binding*) | **TDZ** (temporal dead zone) — `ReferenceError` if accessed early |
| `class`     | yes (binding) | TDZ |

```js
console.log(x);    // undefined  (var hoisted)
var x = 5;

console.log(y);    // ReferenceError (TDZ)
let y = 5;

foo();             // works — function hoisted entirely
function foo() {}
```

---

### Q2. `var` vs `let` vs `const` — what's the practical difference?

| Feature           | `var`           | `let`         | `const`               |
| ----------------- | --------------- | ------------- | --------------------- |
| Scope             | function        | block         | block                 |
| Hoisted           | yes (init undef)| yes (TDZ)     | yes (TDZ)             |
| Re-declarable     | yes             | no            | no                    |
| Re-assignable     | yes             | yes           | **no**                |
| Attached to global| yes (`window`)  | no            | no                    |

**Rule of thumb**: `const` by default; `let` when you need to reassign; `var` essentially never (legacy code only).

---

### Q3. What is a closure?

A function that **remembers the variables** from its enclosing scope, even after that scope has exited.

```js
function counter() {
  let count = 0;
  return () => ++count;            // returned function "closes over" `count`
}
const tick = counter();
tick();   // 1
tick();   // 2
```

**Use cases**:
- Encapsulation / private state.
- Memoization.
- Currying.
- Iterators / module pattern.

**Memory caveat**: closures keep their captured variables alive → potential leak if you hold a long-lived closure that captures a heavy object.

---

### Q4. What's the **temporal dead zone**?

The window between when a `let`/`const` binding is hoisted and when it's initialized. Accessing it during that window throws `ReferenceError`.

```js
{
  console.log(x);     // ReferenceError, not undefined
  let x = 5;
}
```

**Why it exists**: catches bugs early. `var`'s "silent undefined" behavior masked many issues.

---

## 2. Types & Equality

---

### Q5. JavaScript's primitive types.

`number`, `bigint`, `string`, `boolean`, `null`, `undefined`, `symbol`. Plus `object` (everything else).

**Gotchas**:
- `typeof null === 'object'` — historical bug, kept for compatibility.
- `typeof function() {} === 'function'` — even though functions are objects.
- `typeof NaN === 'number'`.

---

### Q6. `==` vs `===` — when does each apply?

`===` is **strict equality** — no type coercion.
`==` is **loose equality** — coerces both sides to a common type via the abstract equality algorithm.

```js
1 == '1';          // true
1 === '1';         // false
null == undefined; // true
null === undefined;// false
NaN == NaN;        // false (NaN is never equal to anything, including itself)
0 == '';           // true
0 == false;        // true
```

**Best practice**: always `===` except when explicitly checking for `null` *or* `undefined` (`x == null`).

---

### Q7. `Object.is(x, y)` — how does it differ from `===`?

Same in 99% of cases, with two differences:

```js
Object.is(NaN, NaN);       // true   (=== returns false)
Object.is(+0, -0);         // false  (=== returns true)
Object.is(0, -0);          // false
```

Used internally by React's `useState` to decide whether to skip a re-render.

---

### Q8. Truthy and falsy values.

**Falsy**: `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, `NaN`, `document.all`.

**Everything else is truthy**, including:
- `'0'`, `'false'`, `' '` (non-empty strings).
- `[]`, `{}` (empty array/object).

---

## 3. `this` Binding

---

### Q9. The four rules of `this`.

In order of priority:

1. **`new` binding** — `new Foo()` → `this` is the freshly created instance.
2. **Explicit binding** — `fn.call(obj)`, `fn.apply(obj)`, `fn.bind(obj)`.
3. **Implicit binding** — `obj.fn()` → `this` is `obj`.
4. **Default binding** — standalone `fn()` → `this` is `undefined` in strict mode, `globalThis` in sloppy.

**Plus**: arrow functions **don't have their own `this`** — they inherit from the enclosing lexical scope.

---

### Q10. Why does `setTimeout(this.method, 100)` lose `this`?

```js
class Foo {
  constructor() { this.value = 42; }
  log() { console.log(this.value); }
}
const f = new Foo();
setTimeout(f.log, 100);    // undefined — `this` is lost
```

You're passing the function reference; the implicit binding is broken when the function is called by `setTimeout` later.

**Fixes**:
- `setTimeout(() => f.log(), 100)` — arrow preserves outer `this`.
- `setTimeout(f.log.bind(f), 100)` — explicit bind.
- Define `log` as an arrow class field: `log = () => console.log(this.value);` (auto-bound).

---

## 4. Prototype & Inheritance

---

### Q11. What is the prototype chain?

Every object has an internal `[[Prototype]]` slot pointing to another object (or `null`). Property lookups walk this chain until found or `null`.

```js
const arr = [1, 2, 3];
arr.push(4);
//        ↑
// not on `arr` directly → walks to Array.prototype → found push there
```

`Array.prototype` → `Object.prototype` → `null`.

**Access via**: `Object.getPrototypeOf(obj)` (preferred) or `obj.__proto__` (legacy).

---

### Q12. `Object.create(null)` — what's special?

Creates an object with **no prototype chain**. Useful as a safe dictionary (no `toString`, `hasOwnProperty`, `__proto__` collisions).

```js
const map = Object.create(null);
map.toString = 'safe key';      // doesn't collide with anything
```

Used in security-sensitive code or as the backing for hash-map-like libraries.

---

### Q13. `class` vs prototype-based inheritance.

`class` is **syntactic sugar** over the prototype chain — there's nothing it does that prototypes can't.

```js
class Animal {
  constructor(name) { this.name = name; }
  speak() { return this.name + ' speaks'; }
}
class Dog extends Animal {
  bark() { return this.name + ' barks'; }
}
```

Equivalent prototype version:

```js
function Animal(name) { this.name = name; }
Animal.prototype.speak = function() { return this.name + ' speaks'; };

function Dog(name) { Animal.call(this, name); }
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;
Dog.prototype.bark = function() { return this.name + ' barks'; };
```

`class` adds: cleaner syntax, `super.method()`, private `#fields`, static methods, automatic strict mode.

---

## 5. Functions

---

### Q14. Arrow function vs regular function.

| Concern               | Arrow `() => {}`           | Regular `function() {}`   |
| --------------------- | -------------------------- | ------------------------- |
| `this` binding        | **Lexical** (from outer)   | Dynamic (call site)       |
| `arguments`           | not bound                  | bound                     |
| Can be `new`'d        | **no**                     | yes                       |
| Has `prototype`       | no                         | yes                       |
| Can be a generator    | no                         | yes (`function*`)         |
| Method shorthand      | not for classes            | yes                       |

**Use arrow** when you want to inherit `this` (callbacks, array methods).
**Use regular** for object methods, constructors, and generators.

---

### Q15. Function declaration vs expression.

```js
foo();                          // works — declaration is hoisted
function foo() {}

bar();                          // TypeError — bar is undefined
var bar = function() {};
```

**Declaration**: name visible throughout the enclosing scope, hoisted with body.
**Expression**: only the variable binding is hoisted (as `undefined`); body is assigned at runtime.

---

### Q16. IIFE — Immediately Invoked Function Expression.

```js
(function() { /* private scope */ })();
```

**Purpose**: create a private scope before ES6's `let`/`const` introduced block scoping. Today, mostly used in browser scripts and bundle output.

---

## 6. Asynchronous JavaScript

---

### Q17. The event loop in 60 seconds.

JS is **single-threaded** with an event loop:

1. Run synchronous code from the call stack.
2. When stack is empty, drain the **microtask queue** (Promises, `queueMicrotask`).
3. Take **one** macrotask (timers, I/O, `setImmediate`, UI events).
4. Repeat from step 1.

```js
setTimeout(() => console.log('A'), 0);    // macrotask
Promise.resolve().then(() => console.log('B'));    // microtask
console.log('C');
// Output: C, B, A
```

Microtasks always run **before** the next macrotask — a single sync tick can drain unlimited microtasks.

---

### Q18. Promise states and methods.

**States**: `pending` → `fulfilled` (with value) or `rejected` (with reason). Once settled, never changes.

**Methods**:
- `Promise.resolve(v)` / `Promise.reject(r)` — pre-settled.
- `.then(onFulfilled, onRejected)` — chain.
- `.catch(fn)` — alias for `.then(undefined, fn)`.
- `.finally(fn)` — runs on either outcome; preserves the value/reason.
- `Promise.all([...])` — waits for all, **fail-fast** on any rejection.
- `Promise.allSettled([...])` — waits for all, never rejects, returns `{status, value/reason}` objects.
- `Promise.race([...])` — first to settle (resolve OR reject).
- `Promise.any([...])` — first to **resolve** (rejects only if all reject).

---

### Q19. `async/await` — what is it really?

Syntactic sugar over Promises. An `async` function:
- Always returns a Promise.
- `await` pauses execution until the awaited Promise settles.
- Throws on rejection (catchable with `try/catch`).

```js
async function f() {
  const x = await fetch(url);
  return x.json();
}
// equivalent to:
function f() {
  return fetch(url).then(x => x.json());
}
```

**Pitfall — sequential vs parallel**:

```js
const a = await fetchA();   // sequential
const b = await fetchB();
// 2× total time

const [a, b] = await Promise.all([fetchA(), fetchB()]);   // parallel
// max(timeA, timeB)
```

---

### Q20. Microtasks vs Macrotasks.

| Macrotasks                     | Microtasks                     |
| ------------------------------ | ------------------------------ |
| `setTimeout`                   | `Promise.then/catch/finally`   |
| `setInterval`                  | `queueMicrotask`               |
| I/O callbacks                  | `MutationObserver` (browser)   |
| UI rendering                   | `process.nextTick` (Node, before microtasks even) |
| `setImmediate` (Node)          |                                |

**Order**: microtask queue is drained completely between each macrotask. **Don't rely on** `setTimeout(_, 0)` running "next" — promises run before it.

---

## 7. Modules

---

### Q21. CommonJS vs ES Modules.

| Aspect            | CommonJS                            | ES Modules (ESM)                   |
| ----------------- | ----------------------------------- | ---------------------------------- |
| Syntax            | `require()`, `module.exports`       | `import`, `export`                 |
| Loading           | Synchronous                         | Asynchronous, static                |
| When evaluated    | At require call                     | Before any code runs (parse time)  |
| Top-level await   | no                                  | yes                                |
| Bindings          | Copy of value                       | Live binding (re-imports see updates) |
| Tree-shakeable    | no                                  | **yes** (static analysis)          |

Modern Node supports both; browsers only support ESM.

---

### Q22. Dynamic `import()`.

Returns a Promise to a module namespace object:

```js
const { default: fn } = await import('./module.js');
```

Use cases: code splitting (lazy-load routes), conditional imports, plugin systems.

---

## 8. Memory & Performance

---

### Q23. How does JavaScript garbage collection work?

V8 uses a **generational mark-and-sweep** collector:

1. **Young generation** (Scavenger): short-lived objects in a small space; copied between two halves on each collection.
2. **Old generation** (Mark-Compact): long-lived objects; full mark-and-sweep, expensive but rare.

**Key principle**: an object is garbage iff **no chain of references** from a "root" (global, stack frame, closure) reaches it.

---

### Q24. Common memory leak patterns.

1. **Forgotten timers**: `setInterval` callbacks holding references after the component unmounts.
2. **Detached DOM nodes**: removing a node from the tree but keeping a JS reference.
3. **Closures over large objects**: inner function captures a big array; outer scope can never GC the array.
4. **Event listeners**: not removing them on cleanup.
5. **Caches without bounds**: unbounded `Map` growth.

**Tools**: Chrome DevTools Memory tab, heap snapshots, allocation timeline.

---

## 9. ES6+ Features

---

### Q25. Spread / rest.

```js
// Spread (expand)
const a = [1, 2, 3];
const b = [...a, 4];                     // [1, 2, 3, 4]
const o = { ...obj, x: 5 };

// Rest (collect)
function f(first, ...rest) {}            // rest = array of remaining args
const { a, ...others } = obj;            // others = remaining own props
```

Conceptually inverse — context decides which one is at play.

---

### Q26. Destructuring.

```js
const { a, b: renamed = 5, ...rest } = obj;
const [first, , third = 0] = arr;
function f({ x, y } = {}) { ... }
```

Powerful for parameter passing, return values, splitting object/array fields.

---

### Q27. Optional chaining `?.` and nullish coalescing `??`.

```js
obj?.foo?.bar?.[0]                       // safe path access
const x = value ?? 'default';            // only falls back on null/undefined (not 0/''/false)
obj.fn?.();                              // call only if exists
```

Shorter, clearer than `&&`-chains; differs from `||` which falls back on any falsy.

---

### Q28. `Symbol` and `Symbol.iterator`.

`Symbol()` creates a unique, non-stringifiable value — used as object keys that won't collide.

`Symbol.iterator` is a well-known symbol; defining it makes an object iterable:

```js
class Range {
  constructor(start, end) { this.start = start; this.end = end; }
  [Symbol.iterator]() {
    let i = this.start;
    return { next: () => i < this.end ? { value: i++ } : { done: true } };
  }
}
for (const n of new Range(1, 4)) console.log(n);    // 1, 2, 3
```

---

## 10. Trick / Gotcha Questions

---

### Q29. What does this print?

```js
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i), 0);
```

**Answer**: `3, 3, 3`. `var` is function-scoped; by the time the timeouts fire, `i` is `3`.

**Fix**: use `let` (block-scoped, fresh binding per iteration) → prints `0, 1, 2`.

---

### Q30. What does this print?

```js
console.log([] + []);            // ''
console.log([] + {});            // '[object Object]'
console.log({} + []);            // 0 in some contexts, '[object Object]' in others
console.log(true + true);        // 2
```

**Why**: `+` triggers ToPrimitive. Arrays → empty string. Objects → `'[object Object]'`. `+ true` → numeric coercion.

---

### Q31. What's the output?

```js
const obj = { a: 1, b: 2 };
const { a, b } = obj;
console.log(a, b);
({ a, b } = obj);                // wrap in parens to use destructuring as expression
```

Without the parentheses, `{ a, b } = obj` is parsed as a block. The parens force expression context.

---

### Q32. What does `[1, 2, 3] + [4, 5, 6]` give?

`'1,2,34,5,6'`. Both arrays coerce to strings via `.toString()` (which joins with commas), then concatenate.

---

## 11. Quick-Fire Drills

| Question                                                | Answer                                                    |
| ------------------------------------------------------- | --------------------------------------------------------- |
| `typeof null`?                                          | `'object'` (legacy bug)                                   |
| `typeof NaN`?                                           | `'number'`                                                |
| `NaN === NaN`?                                          | `false`                                                   |
| Default params: `function f(x = 5)`?                    | ES6, evaluated at call time                               |
| Closure use cases?                                      | Private state, memoize, curry, module pattern             |
| When to use `for…in`?                                   | Object keys (incl. inherited). Avoid for arrays.          |
| When to use `for…of`?                                   | Iterables (Array, Map, Set, generators).                  |
| `[1,2] === [1,2]`?                                      | `false` — reference comparison.                           |
| Promise `.then` returns?                                | Always a Promise (allows chaining).                       |
| Difference between `Object.freeze` and `const`?         | `const`: rebind. `freeze`: mutate properties.             |
| `Map` vs `Object`?                                      | Map: any keys, size, ordered, no proto pollution.         |
| Microtask vs macrotask order?                           | All microtasks drain between macrotasks.                  |
| `let` vs `var` loop binding?                            | `let` creates new binding each iter; `var` shares one.    |
| Why does `setTimeout(fn, 0)` not run immediately?       | At minimum waits for current sync + all microtasks.       |
| ES Module top-level await?                              | Yes (in ESM, not CJS).                                    |

---

## 12. Talking-Point Cheatsheet

1. *"Closures keep captured variables alive — useful for state, dangerous for memory."*
2. *"Arrow functions don't have their own `this`; that's why they're great for callbacks."*
3. *"`==` does coercion via the abstract equality algorithm — too many edge cases to memorize. Use `===`."*
4. *"Microtasks drain between macrotasks — that's why `Promise.resolve().then()` runs before `setTimeout(0)`."*
5. *"Always `Promise.all` independent async work — don't `await` sequentially when you don't need order."*
6. *"`class` is sugar over prototypes — same chain, cleaner syntax with `super`, `#private`, `static`."*
7. *"V8 garbage collection is generational — short-lived objects are cheap, long-lived ones are expensive to collect."*
8. *"For type-safe equality including NaN / -0, use `Object.is` — it's what React's hooks compare by."*
