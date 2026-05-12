# JavaScript — Latest Interview Questions (2025–2026)

> **Audience**: Interview prep for 2025–2026 rounds at FAANG / mid-tier / startups.
> **Goal**: Questions that have actually surfaced recently — modern ES features, microtask ordering, async patterns, type coercion edges, and senior-level memory/perf.
> **Verified** against MDN, V8 blog, TC39 proposals, react.dev, and aggregated 2025–2026 interview reports.

---

## 1. Output Prediction / Event Loop

---

### Q1. Microtask vs macrotask ordering. *(Google, Amazon)*

```js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
```

**Output**: `1, 4, 3, 2`

Sync first. The microtask queue (Promise `.then`) drains **fully** between the current task and the next macrotask (`setTimeout`). So all `.then` callbacks run before any timer fires.

---

### Q2. async/await microtask quirk.

```js
async function a() { console.log(1); await b(); console.log(2); }
async function b() { console.log(3); }
a();
console.log(4);
```

**Output**: `1, 3, 4, 2`

Code **after** `await` is always scheduled as a microtask — even if the awaited Promise is already resolved. The synchronous part of `a()` (logs 1) and `b()` (logs 3) runs immediately. Then `console.log(4)` runs (sync). Then the microtask queue drains and logs `2`.

---

### Q3. Temporal Dead Zone (TDZ).

```js
console.log(typeof x);
let x = 5;
```

**Output**: `ReferenceError: Cannot access 'x' before initialization`

`let`/`const` are hoisted but **uninitialized** until the declaration line. `typeof` is *not* safe inside the TDZ (unlike with truly-undeclared variables, where `typeof undeclared` returns `'undefined'`).

---

### Q4. `var`-in-loop closure. *(classic but still asked)*

```js
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i), 0);
```

**Output**: `3, 3, 3`

`var` is function-scoped — one shared `i`. By the time timers fire, `i` is `3`. Fix:

```js
for (let i = 0; i < 3; i++) setTimeout(() => console.log(i), 0); // 0, 1, 2
```

`let` creates a fresh per-iteration binding.

---

### Q5. `process.nextTick` vs Promise.then vs `setImmediate` (Node).

```js
setImmediate(() => console.log('immediate'));
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('promise'));
console.log('sync');
```

**Output**: `sync, nextTick, promise, immediate`

`process.nextTick` has its own queue, drained **before** the regular microtask queue. Both drain before any phase of the event loop (timers / poll / check).

---

## 2. `this` Binding & Scope

---

### Q6. Arrow vs method `this`.

```js
const obj = { x: 1, f: () => this.x, g() { return this.x; } };
console.log(obj.f()); // undefined
console.log(obj.g()); // 1
```

Arrow functions capture `this` lexically (here: module / global scope). Method shorthand binds `this` to the calling object.

---

### Q7. Detached method.

```js
class C { x = 1; get() { return this.x; } }
const c = new C();
const { get } = c;
get(); // 🚫 TypeError in strict mode (undefined.x)
```

Destructuring detaches the method. Always bind: `const get = c.get.bind(c)` or use class fields with arrow: `get = () => this.x`.

---

## 3. Type Coercion / Spec Edge

---

### Q8. `[] == ![]`.

```js
[] == ![] // true
```

Steps: `![]` → `false` (object is truthy, `!` flips). Then `[] == false` triggers ToPrimitive on `[]` → `""`. Then `"" == false` → `0 == 0` → `true`.

Lesson: use `===`.

---

### Q9. `NaN === NaN`.

```js
NaN === NaN // false
```

`NaN` never equals anything, including itself. To detect:

```js
Number.isNaN(x)      // strict — only true for actual NaN
isNaN("foo")         // true — coerces first
Number.isNaN("foo")  // false
```

---

### Q10. `{} + []` vs `[] + {}`.

```js
{} + [] // 0   (statement: {} is a block, then +[] coerces to 0)
[] + {} // "[object Object]"
({}) + [] // "[object Object]"  (parens force expression)
```

Trick: position matters. Put `{}` in parentheses to force expression context.

---

## 4. Modern Async (frequently asked)

---

### Q11. `Promise.withResolvers()` (ES2024).

```js
const { promise, resolve, reject } = Promise.withResolvers();
emitter.once('data', resolve);
emitter.once('error', reject);
return promise;
```

Replaces the "deferred" boilerplate (`new Promise((res, rej) => { resolveOut = res; ... })`). Lets you resolve/reject from outside the executor. Common in event-driven and RPC code.

---

### Q12. AbortController + fetch + timeout.

```js
const ac = new AbortController();
const t = setTimeout(() => ac.abort(), 1000);
try {
  const res = await fetch(url, { signal: ac.signal });
  return await res.json();
} finally {
  clearTimeout(t);
}
```

Senior follow-up: combine signals with `AbortSignal.any([s1, s2])` (ES2024) for "any-cancels" semantics, or use `AbortSignal.timeout(ms)` to skip the timer plumbing.

---

### Q13. Top-level await deadlock.

Sibling modules execute in parallel; a TLA module only blocks its **importers**. A true deadlock requires a **cycle**: if A `await`s B and B imports A, evaluation hangs.

Most "TLA is slow" complaints are actually unrelated to cycles — they're sequential `await` chains across imports that should run in parallel. Use `Promise.all` inside one module instead.

---

### Q14. `for await...of` with rejection.

```js
for await (const x of asyncIterable) { ... }
```

A single rejected promise aborts the loop. Remaining promises are **not** cancelled automatically. To clean up, pair with `AbortController`:

```js
const ac = new AbortController();
try {
  for await (const x of stream(ac.signal)) { ... }
} catch { ac.abort(); }
```

---

## 5. ES2024 / ES2025 Features

---

### Q15. Set methods (ES2025).

```js
const a = new Set([1, 2, 3]);
const b = new Set([2, 3, 4]);

a.union(b);              // Set {1, 2, 3, 4}
a.intersection(b);       // Set {2, 3}
a.difference(b);         // Set {1}
a.symmetricDifference(b); // Set {1, 4}
a.isSubsetOf(b);          // false
a.isSupersetOf(b);        // false
a.isDisjointFrom(b);      // false
```

**Gotcha**: the argument must be **set-like** (has `size`, `has`, `keys` — like a `Set` or `Map`), not just any iterable. Passing an array throws `TypeError`.

---

### Q16. Iterator helpers (ES2025).

```js
function* nats() { let n = 0; while (true) yield n++; }

const evens = nats()
  .filter(n => n % 2 === 0)
  .map(n => n * n)
  .take(5)
  .toArray();
// [0, 4, 16, 36, 64]
```

Lazy — `take(5)` only pulls 5 from the source. Compare to `Array.from(nats())` which would never return on an infinite iterator.

---

### Q17. `Array.fromAsync` (ES2025).

```js
const data = await Array.fromAsync(asyncIterable);
```

Awaits each yielded promise **sequentially**. For parallelism use `await Promise.all([...].map(...))`.

---

### Q18. `Promise.try(fn)` (ES2025).

```js
const result = await Promise.try(fn); // fn may throw sync OR return a promise
```

Wraps a function so synchronous throws become rejected promises. Replaces the older `new Promise(r => r(fn()))` idiom.

---

### Q19. `Error.cause` (ES2022, popular in senior rounds).

```js
try { await loadConfig(); }
catch (err) { throw new Error('startup failed', { cause: err }); }
```

Preserves the underlying cause for logging. Read with `err.cause`. The `cause` is set directly on the instance, so it's enumerable for serialization.

---

### Q20. RegExp `/v` flag.

```js
/[\p{Script=Greek}--[π]]/v.test('π'); // false (difference)
/[\p{ASCII}&&\p{Letter}]/v.test('A'); // true (intersection)
```

Enables **set notation** (`--`, `&&`, `||`) inside character classes. Mixing with `/u` throws — pick one.

**Note**: Records & Tuples is **not** shipped. The original proposal was withdrawn / restructured. Mention this if asked.

---

### Q21. `structuredClone` — what it can/can't do.

**Can**:
- Circular references.
- `Map`, `Set`, `Date`, `RegExp`, `ArrayBuffer`, `TypedArray`, `Blob`, `File`.

**Cannot**:
- Functions (`DataCloneError`).
- DOM nodes.
- Error stack frames.
- Class identity (clones as plain object of base `Object.prototype` for non-built-ins).
- Property descriptors / getters / setters.

Compared with `JSON.parse(JSON.stringify(...))`: better in every way for valid input, but throws on functions instead of silently dropping them.

---

## 6. Memory & Performance (senior)

---

### Q22. Closure-driven leak.

```js
function attach(el) {
  const bigData = new Array(1e6).fill(0);
  el.addEventListener('click', () => console.log(bigData[0]));
}
```

The listener closes over `bigData`. Even if `el` is detached from the DOM, as long as the listener holds the ref, `bigData` survives GC.

**Fixes**:
- `removeEventListener` on cleanup.
- `el.addEventListener('click', handler, { signal })` — abort signal removes the listener.
- `WeakRef` / `WeakMap` for caches that should release with their keys.

---

### Q23. `WeakMap` for memoization.

```js
const cache = new WeakMap();
function memo(obj) {
  if (!cache.has(obj)) cache.set(obj, expensive(obj));
  return cache.get(obj);
}
```

Keys must be objects. When the key has no other references, the entry is GC'd. Compare to `Map`, which keeps strong references — manual eviction required.

---

### Q24. `requestIdleCallback` vs `requestAnimationFrame` vs `queueMicrotask`.

| API                        | When                                | Use case                          |
| -------------------------- | ----------------------------------- | --------------------------------- |
| `queueMicrotask`           | After current task, before next     | Tiny deferral inside one tick     |
| `requestAnimationFrame`    | Before next paint (~16ms)           | DOM / canvas animation            |
| `requestIdleCallback`      | When the browser is idle            | Low-priority background work      |
| `scheduler.postTask` (proposal) | Priority-aware scheduling      | Modern replacement for the others |

---

## 7. Misc / Trending

---

### Q25. Decorators (Stage 3).

```js
function logged(value, ctx) {
  return function(...args) {
    console.log(`call ${ctx.name}`);
    return value.apply(this, args);
  };
}

class Service { @logged greet(n) { return `hi ${n}`; } }
```

Stage 3 decorators (different from the legacy ones in TypeScript) are widely available via TC39. Used in NestJS, Angular, and increasingly in stdlib-like JS frameworks.

---

### Q26. Temporal API.

Replaces the buggy `Date`:

```js
const now = Temporal.Now.zonedDateTimeISO('Asia/Kolkata');
const tomorrow = now.add({ days: 1 });
const diff = then.since(now, { largestUnit: 'days' });
```

Shipped in Node 26 (May 2026) by default. Polyfill available for older runtimes / browsers. Worth knowing the shape: `Instant`, `ZonedDateTime`, `PlainDate`, `PlainTime`, `Duration`, `TimeZone`, `Calendar`.

---

### Q27. `Object.groupBy` and `Map.groupBy` (ES2024).

```js
const items = [{ kind: 'a', v: 1 }, { kind: 'b', v: 2 }, { kind: 'a', v: 3 }];
Object.groupBy(items, x => x.kind);
// { a: [{kind:'a',v:1}, {kind:'a',v:3}], b: [{kind:'b',v:2}] }
```

Replaces hand-written `reduce` for grouping. `Map.groupBy` for object keys.

---

### Q28. `using` declaration (Explicit Resource Management, Stage 4).

```js
{
  using db = openDb();      // calls db[Symbol.dispose]() at block exit
  await using lock = await acquireLock(); // async cleanup
}
```

Auto-cleanup on scope exit — like Python's `with` or C#'s `using`. Useful for connections, locks, file handles.

---

### Q29. `Symbol.dispose` and `Symbol.asyncDispose`.

```js
class DbConnection {
  [Symbol.asyncDispose]() { return this.close(); }
}
```

Object implements the protocol; `using`/`await using` consumes it.

---

### Q30. Quick-fire: "What's wrong with this code?"

```js
async function batch() {
  const items = [1, 2, 3];
  items.forEach(async x => {
    await process(x); // fire-and-forget — forEach ignores returned promise
  });
  console.log('done'); // logs before processing finishes
}
```

`Array.forEach` doesn't await async callbacks. Use:
```js
for (const x of items) await process(x);          // sequential
await Promise.all(items.map(process));            // parallel
```

---

## Final Senior Tips

1. **Know the microtask queue** — say "microtask queue drains between tasks" and you've already passed the bar.
2. **Modern features signal currency** — `Promise.withResolvers`, set methods, `using`, Temporal.
3. **AbortController is the modern cancellation primitive** — every async API now accepts a `signal`.
4. **`===` always** — coercion questions are traps to see if you'll claim cleverness.
5. **TC39 stages** — Stage 4 = shipped, Stage 3 = in implementations, Stage 2 = drafts. Don't claim "TC39 proposal X is in production" without checking.

---

## Sources

- [TC39 advances nine proposals (June 2025) — InfoQ](https://www.infoq.com/news/2025/06/tc39-stage-4-2025/)
- [Set methods — V8 blog / Sonar blog](https://www.sonarsource.com/blog/union-intersection-difference-javascript-sets)
- [Promise.withResolvers — GreatFrontEnd](https://www.greatfrontend.com/questions/javascript/promise-with-resolvers)
- [structuredClone — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone)
- [Top-level await — V8 blog](https://v8.dev/features/top-level-await)
- [RegExp /v flag — V8 blog](https://v8.dev/features/regexp-v-flag)
- [Number.isNaN — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN)
- [Temporal API — Bryntum 2026](https://bryntum.com/blog/javascript-temporal-is-it-finally-here/)
- [Node 26 ships Temporal — Help Net Security, May 2026](https://www.helpnetsecurity.com/2026/05/07/node-js-26-released/)
- [Tricky JS asked by Google & Amazon — Coderbyte](https://medium.com/coderbyte/a-tricky-javascript-interview-question-asked-by-google-and-amazon-48d212890703)
- [Senior-level Promises questions — Medium Sep 2025](https://medium.com/@theNewGenCoder/senior-level-javascript-promises-interview-questions-and-real-world-scenarios-f9ee6c85ab3f)
- [GreatFrontEnd — Top JS Interview Questions 2026](https://github.com/greatfrontend/top-javascript-interview-questions)
