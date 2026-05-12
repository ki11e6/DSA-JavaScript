# JavaScript — Medium Interview Questions

> **Audience**: Mid-level / senior dev rounds.
> **Goal**: Polyfill core APIs (`bind`, `Promise.all`, `compose`), build pub/sub, EventEmitter, retry-with-backoff.

---

## Q1. Polyfill `Function.prototype.bind`

```js
Function.prototype.myBind = function(thisArg, ...preArgs) {
  const fn = this;
  return function(...args) {
    return fn.apply(thisArg, [...preArgs, ...args]);
  };
};
```

- **Catch — `new`-able bound functions**: real `bind` returns a function that ignores `thisArg` when called with `new`. Add a check via `new.target` for full fidelity.

---

## Q2. Polyfill `Function.prototype.call` and `apply`

```js
Function.prototype.myCall = function(ctx, ...args) {
  ctx = ctx ?? globalThis;
  const key = Symbol();
  ctx[key] = this;
  const result = ctx[key](...args);
  delete ctx[key];
  return result;
};

Function.prototype.myApply = function(ctx, args) {
  return this.myCall(ctx, ...(args ?? []));
};
```

- **Trick**: temporarily attach `this` (the function) to `ctx` under a unique Symbol → calling it gives the right `this`.

---

## Q3. Polyfill `Promise.all`

```js
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    if (!promises.length) return resolve([]);
    const out = new Array(promises.length);
    let remaining = promises.length;
    promises.forEach((p, i) => {
      Promise.resolve(p).then(
        v => {
          out[i] = v;
          if (--remaining === 0) resolve(out);
        },
        reject                                 // fail-fast on first rejection
      );
    });
  });
}
```

- **Pitfall**: don't `resolve` after a rejection. The Promise is already settled; subsequent `resolve` is no-op, but this is a common bug area.
- **Pitfall**: `Promise.resolve(p)` — handles both Promises and plain values.

---

## Q4. Polyfill `Promise.allSettled`

```js
function promiseAllSettled(promises) {
  return Promise.all(promises.map(p =>
    Promise.resolve(p).then(
      value => ({ status: 'fulfilled', value }),
      reason => ({ status: 'rejected', reason })
    )
  ));
}
```

- **Insight**: catch each rejection individually and convert to a `{status, reason}` object → no Promise ever rejects → `Promise.all` waits for all.

---

## Q5. Polyfill `Promise.race`

```js
function promiseRace(promises) {
  return new Promise((resolve, reject) => {
    for (const p of promises) Promise.resolve(p).then(resolve, reject);
  });
}
```

- **Note**: settles with the **first** outcome (fulfilled OR rejected). Subsequent `resolve`/`reject` calls are silently ignored by the Promise.

---

## Q6. Polyfill `Promise.any`

```js
function promiseAny(promises) {
  return new Promise((resolve, reject) => {
    if (!promises.length) return reject(new AggregateError([], 'All promises were rejected'));
    const errors = new Array(promises.length);
    let remaining = promises.length;
    promises.forEach((p, i) => {
      Promise.resolve(p).then(
        resolve,                                 // first to fulfill wins
        reason => {
          errors[i] = reason;
          if (--remaining === 0) reject(new AggregateError(errors));
        }
      );
    });
  });
}
```

- **Mirror of `Promise.all`**: success if any resolves, failure only if all reject.

---

## Q7. Compose / Pipe

> `compose(f, g, h)(x) === f(g(h(x)))` — right to left.
> `pipe(f, g, h)(x) === h(g(f(x)))` — left to right.

```js
const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);
const pipe    = (...fns) => x => fns.reduce((v, f) => f(v), x);

// const inc = x => x + 1;
// const dbl = x => x * 2;
// compose(inc, dbl)(3);   // inc(dbl(3)) = 7
// pipe(inc, dbl)(3);      // dbl(inc(3)) = 8
```

- **Foundational** for functional composition (Redux middleware, Ramda, lodash/fp).

---

## Q8. Retry with Exponential Backoff

```js
async function retry(fn, { retries = 3, base = 100 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); }
    catch (err) {
      lastErr = err;
      if (i < retries) await new Promise(r => setTimeout(r, base * 2 ** i));
    }
  }
  throw lastErr;
}
```

- **Pattern**: idempotent operations only. Add jitter (random factor) to avoid thundering-herd.

---

## Q9. EventEmitter

```js
class EventEmitter {
  constructor() { this.listeners = new Map(); }
  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
    return () => this.off(event, fn);                      // disposer
  }
  off(event, fn) { this.listeners.get(event)?.delete(fn); }
  once(event, fn) {
    const wrapped = (...args) => { fn(...args); this.off(event, wrapped); };
    return this.on(event, wrapped);
  }
  emit(event, ...args) {
    for (const fn of this.listeners.get(event) ?? []) fn(...args);
  }
}
```

- **Why a Set**: O(1) add / remove, deduplication of identical listeners.
- **Why a disposer**: clean teardown without holding the original `fn` reference.

---

## Q10. Pub/Sub

```js
class PubSub {
  constructor() { this.topics = new Map(); }
  subscribe(topic, handler) {
    if (!this.topics.has(topic)) this.topics.set(topic, new Set());
    this.topics.get(topic).add(handler);
    return () => this.topics.get(topic)?.delete(handler);
  }
  publish(topic, data) {
    for (const h of this.topics.get(topic) ?? []) {
      try { h(data); } catch { /* swallow per subscriber */ }
    }
  }
}
```

- **Difference from EventEmitter**: usually decoupled — publishers don't know about subscribers (and vice versa).

---

## Q11. LRU Cache

> Already covered in `02.LinkedList/Interview-Medium.md` Q13 — both Map-based and DLL+HashMap manual versions.

For JS interviews, the Map version is canonical:

```js
class LRUCache {
  constructor(capacity) { this.cap = capacity; this.map = new Map(); }
  get(key) {
    if (!this.map.has(key)) return -1;
    const v = this.map.get(key);
    this.map.delete(key); this.map.set(key, v);
    return v;
  }
  put(key, val) {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size === this.cap) this.map.delete(this.map.keys().next().value);
    this.map.set(key, val);
  }
}
```

---

## Q12. Async Series / Sequential Execution

> Run a list of async tasks one after another, collect results.

```js
async function series(tasks) {
  const out = [];
  for (const task of tasks) out.push(await task());
  return out;
}
```

- **Use**: when each task depends on the previous one's effect (e.g., DB writes).

---

## Q13. Async Parallel with Concurrency Limit

> Run async tasks in parallel but at most `n` at a time.

```js
async function parallelLimit(tasks, n) {
  const results = new Array(tasks.length);
  let i = 0;
  const worker = async () => {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  };
  await Promise.all(Array.from({ length: n }, worker));
  return results;
}
```

- **Pattern**: worker pool. Each worker pulls the next task index until none left.

---

## Q14. Object Equality (Deep)

```js
function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
  if (a.constructor !== b.constructor) return false;
  if (a instanceof Date)   return a.getTime() === b.getTime();
  if (a instanceof RegExp) return a.source === b.source && a.flags === b.flags;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
}
```

- **Pitfall — cycles**: this version doesn't handle them. Add a `WeakMap` of seen pairs for production.

---

## Q15. Custom `instanceof`

```js
function myInstanceOf(obj, Cls) {
  let proto = Object.getPrototypeOf(obj);
  while (proto) {
    if (proto === Cls.prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}
```

- **Insight**: walks the prototype chain looking for `Cls.prototype`.

---

## Q16. Cancellable Promise (with `AbortController`)

```js
function cancellable(executor) {
  const controller = new AbortController();
  const promise = new Promise((resolve, reject) => {
    controller.signal.addEventListener('abort', () => reject(new Error('cancelled')));
    executor(resolve, reject, controller.signal);
  });
  return { promise, cancel: () => controller.abort() };
}
```

- **Modern pattern**: many APIs (`fetch`, timers via `AbortSignal.timeout`) accept a signal directly. Use that wherever possible.

---

## Q17. Polyfill `Object.create`

```js
function objectCreate(proto, props = {}) {
  function F() {}
  F.prototype = proto;
  const obj = new F();
  for (const key of Object.keys(props)) {
    Object.defineProperty(obj, key, props[key]);
  }
  return obj;
}
```

---

## Q18. JSON.stringify Custom

> Simplified — handles objects, arrays, primitives, no cycles, no Dates.

```js
function stringify(v) {
  if (v === null) return 'null';
  if (typeof v === 'string') return '"' + v.replace(/"/g, '\\"') + '"';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'undefined' || typeof v === 'function') return undefined;
  if (Array.isArray(v)) return '[' + v.map(x => stringify(x) ?? 'null').join(',') + ']';
  if (typeof v === 'object') {
    const parts = [];
    for (const k of Object.keys(v)) {
      const child = stringify(v[k]);
      if (child !== undefined) parts.push('"' + k + '":' + child);
    }
    return '{' + parts.join(',') + '}';
  }
}
```

- **Pitfall**: real `JSON.stringify` calls `toJSON()` if it exists, handles Dates, etc.

---

## Q19. Two-Way Data Binding (Simplified)

```js
function bind(input, getValue, setValue) {
  input.value = getValue();
  input.addEventListener('input', e => setValue(e.target.value));
  return () => input.removeEventListener('input', /* same handler */ () => {});  // simplified
}
```

For a real version, use a `Proxy` to detect setter calls and re-render.

---

## Q20. Render JSON to HTML (Simple Template Engine)

```js
function render(template, data) {
  return template.replace(/\{\{\s*(\w+(?:\.\w+)*)\s*\}\}/g, (_, path) => {
    return path.split('.').reduce((acc, key) => acc?.[key], data) ?? '';
  });
}

// render('Hello {{user.name}}!', { user: { name: 'Alice' } });
// → 'Hello Alice!'
```

- **Pattern**: regex-driven path lookup. Real templating engines (Mustache, Handlebars) layer escaping, conditionals, loops on top.

---

## Patterns Cheatsheet (Medium)

| Pattern                          | Trigger                                              | Examples here       |
| -------------------------------- | ---------------------------------------------------- | ------------------- |
| **Symbol-based context attach**  | `call`/`apply` polyfill                              | Q2                  |
| **Counter-of-pending**           | `Promise.all`/`any`/`race` polyfills                 | Q3, Q4, Q5, Q6      |
| **Reduce as composition**        | Compose / pipe                                       | Q7                  |
| **Exponential backoff**          | Retry on failure                                     | Q8                  |
| **Map of sets**                  | Pub/Sub / EventEmitter                               | Q9, Q10             |
| **Worker pool**                  | Parallel-limit                                       | Q13                 |
| **WeakMap for cycle tracking**   | Deep equal / deep clone                              | Q14                 |
| **Prototype chain walk**         | Custom `instanceof`                                  | Q15                 |
| **AbortController + Promise**    | Cancellation                                         | Q16                 |
