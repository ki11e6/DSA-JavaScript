# JavaScript — Hard Interview Questions

> **Audience**: Senior / staff / FAANG.
> **Goal**: Implement Promise from scratch, async pool, scheduler, observable, reactive store. Senior engineering, not just JS trivia.

---

## Q1. Implement `Promise` from Scratch

> Spec-conformant enough for chaining, async resolution, and correct error propagation.

```js
class MyPromise {
  static PENDING   = 'pending';
  static FULFILLED = 'fulfilled';
  static REJECTED  = 'rejected';

  constructor(executor) {
    this.state = MyPromise.PENDING;
    this.value = undefined;
    this.callbacks = [];                            // [{onF, onR, resolveNext, rejectNext}]
    const resolve = (v) => this._settle(MyPromise.FULFILLED, v);
    const reject  = (r) => this._settle(MyPromise.REJECTED, r);
    try { executor(resolve, reject); } catch (e) { reject(e); }
  }

  _settle(state, value) {
    if (this.state !== MyPromise.PENDING) return;
    // Promise resolution: if value is a thenable, follow it
    if (state === MyPromise.FULFILLED && value && typeof value.then === 'function') {
      try {
        value.then(v => this._settle(MyPromise.FULFILLED, v),
                   r => this._settle(MyPromise.REJECTED, r));
      } catch (e) { this._settle(MyPromise.REJECTED, e); }
      return;
    }
    this.state = state;
    this.value = value;
    queueMicrotask(() => this.callbacks.forEach(cb => this._run(cb)));
  }

  _run({ onF, onR, resolveNext, rejectNext }) {
    const handler = this.state === MyPromise.FULFILLED ? onF : onR;
    if (typeof handler !== 'function') {
      (this.state === MyPromise.FULFILLED ? resolveNext : rejectNext)(this.value);
      return;
    }
    try { resolveNext(handler(this.value)); }
    catch (e) { rejectNext(e); }
  }

  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const cb = { onF: onFulfilled, onR: onRejected, resolveNext: resolve, rejectNext: reject };
      if (this.state === MyPromise.PENDING) this.callbacks.push(cb);
      else queueMicrotask(() => this._run(cb));
    });
  }

  catch(onRejected) { return this.then(undefined, onRejected); }

  finally(onFinally) {
    return this.then(
      v => MyPromise.resolve(onFinally()).then(() => v),
      r => MyPromise.resolve(onFinally()).then(() => { throw r; })
    );
  }

  static resolve(v) { return new MyPromise((res) => res(v)); }
  static reject(r)  { return new MyPromise((_, rej) => rej(r)); }
}
```

- **Critical invariants**:
  1. `state` transitions exactly once; subsequent `resolve`/`reject` are no-ops.
  2. Callbacks always run **asynchronously** via `queueMicrotask`.
  3. Resolving with a thenable follows it (chain-flattening).
  4. Errors thrown inside `then` callbacks reject the next Promise in the chain.

---

## Q2. Async Pool (Concurrency Limit)

> Run up to `n` async tasks concurrently. Same idea as `parallelLimit` from Medium but with a streaming API.

```js
async function asyncPool(limit, tasks) {
  const results = [];
  const executing = new Set();
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);
    executing.add(p);
    p.finally(() => executing.delete(p));
    if (executing.size >= limit) await Promise.race(executing);
  }
  return Promise.all(results);
}
```

- **Pattern**: `Promise.race` blocks the producer until at least one slot frees.
- **Caveat**: when one task rejects, the others continue. To fail-fast, race the rejection.

---

## Q3. Custom Scheduler — Priority Job Queue

> Schedule async jobs with priorities (higher first). At most N concurrent.

```js
const PriorityQueue = require('../04.Stacks&Queues/priorityQueue.js');

class Scheduler {
  constructor(concurrency = 4) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = new PriorityQueue((a, b) => b.priority - a.priority);
  }
  schedule(taskFn, priority = 0) {
    return new Promise((resolve, reject) => {
      this.queue.push({ taskFn, priority, resolve, reject });
      this._tick();
    });
  }
  _tick() {
    while (this.running < this.concurrency && !this.queue.isEmpty()) {
      const { taskFn, resolve, reject } = this.queue.pop();
      this.running++;
      Promise.resolve()
        .then(taskFn)
        .then(resolve, reject)
        .finally(() => { this.running--; this._tick(); });
    }
  }
}
```

- **Use**: rate-limited APIs, request prioritization, build pipelines.
- **Extension**: add cancellation via `AbortController`, retry-with-backoff per task, deadlines.

---

## Q4. Observable / Reactive Stream

```js
class Observable {
  constructor(producer) { this._producer = producer; }

  subscribe(observer) {
    if (typeof observer === 'function') observer = { next: observer };
    let unsubscribed = false;
    const safe = {
      next:     v => !unsubscribed && observer.next?.(v),
      error:    e => { if (!unsubscribed) { observer.error?.(e); unsubscribed = true; } },
      complete: () => { if (!unsubscribed) { observer.complete?.(); unsubscribed = true; } },
    };
    const teardown = this._producer(safe) || (() => {});
    return () => { unsubscribed = true; teardown(); };
  }

  // Operators: map, filter
  map(fn) {
    return new Observable(observer => this.subscribe({
      next: v => observer.next(fn(v)),
      error: observer.error, complete: observer.complete,
    }));
  }
  filter(pred) {
    return new Observable(observer => this.subscribe({
      next: v => { if (pred(v)) observer.next(v); },
      error: observer.error, complete: observer.complete,
    }));
  }

  static from(iterable) {
    return new Observable(observer => {
      for (const v of iterable) observer.next(v);
      observer.complete();
    });
  }
}
```

- **Pattern**: lazy push-based stream — nothing happens until `subscribe()`.
- **Real-world**: RxJS is the heavyweight; this is the toy version interviewers want to see.

---

## Q5. Reactive Store (Redux-Lite)

> Pub/sub + immutable state + actions.

```js
function createStore(reducer, initial) {
  let state = initial;
  const listeners = new Set();
  return {
    getState: () => state,
    dispatch(action) {
      state = reducer(state, action);
      for (const l of listeners) l(state);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// const store = createStore(
//   (state = 0, action) => action.type === 'INC' ? state + 1 : state,
//   0
// );
// store.subscribe(s => console.log(s));
// store.dispatch({ type: 'INC' });    // logs 1
```

- **Single source of truth** + **pure reducer** + **subscribe** = the Redux pattern in 12 lines.

---

## Q6. Middleware Chain (Express-style)

```js
function createPipeline() {
  const middlewares = [];
  return {
    use(fn) { middlewares.push(fn); },
    run(ctx) {
      let i = -1;
      function next(err) {
        i++;
        if (err) throw err;
        const fn = middlewares[i];
        if (!fn) return;
        return fn(ctx, next);
      }
      return next();
    },
  };
}

// const p = createPipeline();
// p.use(async (ctx, next) => { ctx.start = Date.now(); await next(); ctx.elapsed = Date.now() - ctx.start; });
// p.use(async (ctx, next) => { ctx.body = 'hello'; });
// const ctx = {}; p.run(ctx); console.log(ctx);
```

- **Pattern**: nested function calls forming an "onion" of pre/post hooks.
- **Used by**: Koa, Express, Redux middleware.

---

## Q7. Generator-Based Async (Pre-async/await)

> How `async/await` is implemented under the hood.

```js
function run(genFn) {
  return new Promise((resolve, reject) => {
    const gen = genFn();
    function step(method, arg) {
      let result;
      try { result = gen[method](arg); } catch (e) { return reject(e); }
      const { value, done } = result;
      if (done) return resolve(value);
      Promise.resolve(value).then(
        v => step('next', v),
        e => step('throw', e),
      );
    }
    step('next');
  });
}

// run(function* () {
//   const a = yield fetch(url);
//   const b = yield a.json();
//   return b;
// });
```

- **Insight**: a generator's `yield` lets you "pause" — `run` resumes it when each yielded Promise settles.
- **Babel and TypeScript** compile `async/await` to roughly this pattern for older targets.

---

## Q8. Debounced + Cancellable Async (Latest-Only)

> Many calls in flight; only the most recent should "win".

```js
function latestOnly(fn) {
  let token = 0;
  return async function(...args) {
    const myToken = ++token;
    const result = await fn(...args);
    if (myToken !== token) throw new Error('stale');
    return result;
  };
}

// Useful for typeahead/search where stale responses must be discarded.
```

- **Pattern**: monotonic ticket; the latest call increments the counter; older ones are detected by mismatch.

---

## Q9. Mini Promise.all with Timeout

```js
function allWithTimeout(promises, ms) {
  return Promise.race([
    Promise.all(promises),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}
```

- **Use**: SLOs — "fail if not all done within X ms".
- **Note**: with `AbortController`, you can also cancel the underlying work, not just the promise.

---

## Q10. Rate Limiter (Token Bucket)

```js
class TokenBucket {
  constructor(capacity, refillPerSec) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillPerSec = refillPerSec;
    this.last = Date.now();
  }
  _refill() {
    const now = Date.now();
    const elapsed = (now - this.last) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSec);
    this.last = now;
  }
  tryAcquire() {
    this._refill();
    if (this.tokens >= 1) { this.tokens--; return true; }
    return false;
  }
  async acquire() {
    while (!this.tryAcquire()) {
      const wait = (1 - this.tokens) * 1000 / this.refillPerSec;
      await new Promise(r => setTimeout(r, wait));
    }
  }
}
```

- **Pattern**: tokens accumulate at fixed rate up to a cap; each operation consumes one.
- **Use**: API rate limits, traffic shaping, fair queueing.

---

## Q11. Memoize with TTL

```js
function memoizeTTL(fn, ttl) {
  const cache = new Map();
  return function(...args) {
    const key = JSON.stringify(args);
    const entry = cache.get(key);
    if (entry && Date.now() - entry.t < ttl) return entry.v;
    const v = fn.apply(this, args);
    cache.set(key, { v, t: Date.now() });
    return v;
  };
}
```

- **Pattern**: classic memoize + freshness check. For async, return cached Promise to dedupe in-flight calls.

---

## Q12. Curry with Placeholders

> `curry(fn)(_, b)(a, c)` — _ marks "still missing".

```js
const _ = Symbol('placeholder');

function curry(fn) {
  return function curried(...args) {
    const filled = args.filter(a => a !== _);
    const hasHole = args.includes(_);
    if (filled.length >= fn.length && !hasHole) return fn.apply(this, args);
    return (...next) => {
      const merged = [...args];
      let j = 0;
      for (let i = 0; i < merged.length && j < next.length; i++) {
        if (merged[i] === _) merged[i] = next[j++];
      }
      while (j < next.length) merged.push(next[j++]);
      return curried.apply(this, merged);
    };
  };
}

// const f = (a, b, c) => [a, b, c];
// curry(f)(1, _, 3)(2);   // [1, 2, 3]
```

- **Senior-level**: shows you understand variadic args + custom marker symbols.

---

## Patterns Cheatsheet (Hard)

| Pattern                              | Trigger                                                    |
| ------------------------------------ | ---------------------------------------------------------- |
| **State machine + microtask queue**  | Custom Promise                                             |
| **Worker pool**                      | Async pool / concurrency-limited execution                 |
| **Priority queue + concurrency**     | Custom scheduler                                           |
| **Lazy push-based stream**           | Observable / Subject                                       |
| **Reducer + listeners**              | Reactive store / Redux                                     |
| **Onion-style middleware**           | Express / Koa / Redux middleware                           |
| **Generator-driven async**           | Pre-async/await async sequencing                           |
| **Monotonic ticket cancellation**    | Latest-only / debounced typeahead                          |
| **Token bucket**                     | Rate limiter                                               |
| **Cache with TTL / freshness check** | TTL memoize / stale-while-revalidate                       |

---

## Senior Communication Tips

1. **State the failure modes first.** A custom Promise must handle: synchronous resolve, async resolve, thenable resolve, throw in executor, throw in `.then`, double-resolve, etc.
2. **For schedulers / pools**: explain the back-pressure mechanism. Without one, an unbounded producer crashes the system.
3. **For Observables**: distinguish hot vs cold streams. Cold = each subscriber gets a fresh source; hot = all share one.
4. **For middleware chains**: discuss error propagation — does an error in middleware N skip N+1..M, or trigger an error handler?
5. **For rate limiters**: token bucket vs leaky bucket — bursts allowed in token-bucket, smoothed in leaky.
6. **For caches**: cache invalidation is one of the two hard problems in CS — discuss TTL, LRU, stale-while-revalidate, cache-stampede prevention.
