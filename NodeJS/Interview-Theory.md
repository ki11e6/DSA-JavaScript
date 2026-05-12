# Node.js — Theoretical / Conceptual Interview Questions

> **Audience**: All levels.
> **Goal**: Show deep understanding of Node.js runtime, event loop, async model, modules, streams, and concurrency primitives.
> Verified against [nodejs.org](https://nodejs.org) (Node.js 26 Current / 24 Active LTS, May 2026).

---

## 1. Fundamentals

---

### Q1. What is Node.js?

**Short**: A JavaScript runtime built on V8 (Chrome's JS engine) with a non-blocking, event-driven I/O model. Ships a standard library, a module system, and a package manager (`npm`).

**Deeper**:
- V8 compiles JS to machine code.
- I/O is delegated to **libuv**, a C library that provides the cross-platform event loop, file system, sockets, and a thread pool.
- The result: single-threaded JS execution + multi-threaded background I/O.
- As of May 2026: **Node 26** is Current, **Node 24** is Active LTS. Source: [Node.js release schedule](https://nodejs.org/en/about/previous-releases).

---

### Q2. Is Node.js single-threaded?

**Yes**, JavaScript runs on a single thread (the "main thread" / event loop thread).

**But**:
- libuv maintains a **thread pool** (default 4 threads) used for blocking syscalls (`fs.*`, DNS, some crypto) and CPU work.
- **Worker threads** (`node:worker_threads`) let you spawn separate JS threads with their own V8 isolate.
- **C++ addons** can spawn arbitrary native threads.

So Node is single-threaded *for JS execution* but multi-threaded under the hood for I/O.

---

### Q3. What is libuv and what does it do?

C library providing Node's cross-platform async I/O:
- Event loop.
- Async file system (via thread pool).
- Async networking (epoll/kqueue/IOCP on respective OSes).
- Timers, signals, child processes.
- Thread pool for CPU-bound tasks.

When you call `fs.readFile()`, libuv submits it to the thread pool. When complete, libuv places the callback on the event loop.

---

## 2. The Event Loop

---

### Q4. Explain the event loop phases.

Each tick goes through phases in this order (verified — [Node.js Event Loop docs](https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick)):

```
   ┌───────────────────────────┐
┌─►│           timers          │  setTimeout, setInterval
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │     pending callbacks     │  some I/O errors
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │       idle, prepare       │  internal
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │           poll            │  I/O callbacks (most fs, net)
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │           check           │  setImmediate
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
└──┤      close callbacks      │  e.g., socket.on('close')
   └───────────────────────────┘
```

Between **every** phase, the **microtask queue** (Promise `.then`, `queueMicrotask`) and the **`process.nextTick`** queue drain (nextTick first, then microtasks).

---

### Q5. `setTimeout(fn, 0)` vs `setImmediate(fn)` vs `process.nextTick(fn)` — order?

```js
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('microtask'));
console.log('sync');
```

**Output** (deterministic at top level):
```
sync
nextTick
microtask
timeout
immediate
```

Reasoning:
- Sync runs first.
- After sync completes, `nextTick` drains (Node-specific, higher priority than microtasks since Node 11).
- Then microtasks (Promises).
- Then event loop phases: `timers` (setTimeout) → `poll` → `check` (setImmediate).

**Inside an I/O callback**, `setImmediate` always runs before `setTimeout(0)` (because you're already in `poll` and `check` is next).

---

### Q6. What's the difference between `process.nextTick()` and `queueMicrotask()`?

| Aspect      | `process.nextTick`                         | `queueMicrotask` / Promise.then       |
| ----------- | ------------------------------------------ | ------------------------------------- |
| Source      | Node.js–specific                           | Web standard (also in browsers)       |
| Priority    | Higher — drains before microtasks          | Standard microtask queue              |
| Use case    | "Definitely run before any I/O"            | "Run after the current task"          |
| Risk        | Recursive `nextTick` can starve I/O        | Won't starve I/O (well, still can)    |

Use `queueMicrotask` for general-purpose deferral. Reserve `nextTick` for Node internals or specific event-emitter patterns.

---

### Q7. What's blocking the event loop?

Anything **synchronous** that takes a long time:
- `JSON.parse` on huge strings.
- Synchronous crypto (`crypto.pbkdf2Sync` with high iterations).
- Sync filesystem (`readFileSync`).
- CPU-bound loops (e.g., image processing in JS).
- Bad regex (catastrophic backtracking).

While blocked, no callbacks run, no requests are handled. Symptoms: rising p99 latency, dropped connections, timeouts.

**Detect** with `--inspect` + Performance flamegraph, `perf_hooks.monitorEventLoopDelay`, or `clinic.js doctor`.

**Fix**: split work, offload to worker threads, use streaming APIs.

---

## 3. Modules

---

### Q8. CommonJS vs ESM — what's the practical difference?

| Aspect              | CommonJS (CJS)                | ESM (ECMAScript Modules)        |
| ------------------- | ----------------------------- | ------------------------------- |
| Syntax              | `require` / `module.exports`  | `import` / `export`             |
| Loading             | Synchronous                   | Async                           |
| Top-level await     | ❌                            | ✅                              |
| File extension      | `.js` (with `"type": "commonjs"` or default) | `.mjs` or `.js` with `"type": "module"` |
| Tree-shaking        | Poor                          | Good                            |
| `__dirname`/`__filename` | Available globally        | Use `import.meta.dirname`       |

**Verified (Node.js 24)**: `require(esm)` is **stable** — CJS can `require()` an ESM module synchronously (except modules with top-level await). Source: [Node ESM docs](https://nodejs.org/api/esm.html).

---

### Q9. How does Node resolve a `require('foo')`?

1. Built-in module? Return it.
2. Relative/absolute path (`./`, `../`, `/`)? Resolve as file or directory.
3. Otherwise: walk up `node_modules/` from the caller, looking for `foo/package.json`.
4. In that package's directory, use `"main"`, `"exports"`, or `"index.js"` to pick the entry file.

**Modern packages** use `"exports"` to expose multiple entry points and conditionally pick CJS vs ESM:
```json
"exports": {
  ".": { "import": "./dist/index.mjs", "require": "./dist/index.cjs" }
}
```

---

### Q10. Can CommonJS require ESM and vice versa?

- **ESM importing CJS**: always worked. Default export is `module.exports`.
- **CJS requiring ESM**: stable in Node 24+. Caveat: ESM with **top-level await** cannot be `require()`d — only `await import()` works.

---

### Q11. What is `import.meta`?

Provides metadata about the current ESM module:
- `import.meta.url` — module URL.
- `import.meta.dirname` — directory path (Node 20+).
- `import.meta.filename` — file path (Node 20+).
- `import.meta.resolve(specifier)` — resolve a specifier relative to this module.

ESM equivalent of CJS's `__dirname`/`__filename` and `require.resolve`.

---

## 4. Async Patterns

---

### Q12. Callbacks vs Promises vs async/await — what changed and why?

- **Callbacks** (original Node): `fn(arg, cb)` where `cb(err, result)`. Caused callback hell, hard error propagation.
- **Promises** (ES2015): `.then()`/`.catch()`/`.finally()`. Composable, but still nesting if you're not careful.
- **async/await** (ES2017): syntax over Promises. Looks synchronous, errors propagate via `try/catch`.

Modern Node code uses async/await almost exclusively. Built-in callback APIs have `node:*/promises` siblings (e.g., `node:fs/promises`).

---

### Q13. What is a Promise — internally?

A state machine with three states: **pending** → **fulfilled** or **rejected**. Once settled, immutable.

```js
const p = new Promise((resolve, reject) => {
  setTimeout(() => resolve(42), 100);
});
```

Settled callbacks run as **microtasks** — they always run after the current task but before the next I/O turn.

---

### Q14. What does `async` actually do to a function?

Makes the function return a Promise. The function body executes synchronously until the first `await`, then suspends. Resumption happens on the microtask queue when the awaited Promise settles.

```js
async function f() { return 1; }
// equivalent to
function f() { return Promise.resolve(1); }
```

---

### Q15. Error handling in async code — where do errors go?

- **In a Promise chain**: caught by `.catch()`. Unhandled rejections → `'unhandledRejection'` event (and warning, soon to be fatal by default).
- **In async/await**: throw → caller's `catch`/`try`.
- **In callback APIs**: convention is `(err, result)`. Forgetting to check `err` is a bug.

```js
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
```

---

### Q16. `Promise.all` vs `Promise.allSettled` vs `Promise.race` vs `Promise.any`.

| Method               | Resolves when                       | Rejects when                  |
| -------------------- | ----------------------------------- | ----------------------------- |
| `Promise.all([])`    | **All** fulfill                     | **Any** rejects (others lost) |
| `Promise.allSettled` | All settle (fulfill or reject)      | Never                         |
| `Promise.race([])`   | First to settle (either way)        | First to reject (if first)    |
| `Promise.any([])`    | First to **fulfill**                | All reject (AggregateError)   |

`Promise.all` is the most common; switch to `allSettled` if you need each result regardless of failures.

---

## 5. Streams

---

### Q17. What are streams, and why?

Streams represent data that flows over time, in chunks, without loading it all into memory.

Four types:
- **Readable** — produces data (`fs.createReadStream`, HTTP request body).
- **Writable** — consumes data (`fs.createWriteStream`, HTTP response).
- **Duplex** — both (TCP socket).
- **Transform** — Duplex where the output is computed from input (`zlib.createGzip`).

```js
import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import zlib from 'node:zlib';

await pipeline(
  fs.createReadStream('big.txt'),
  zlib.createGzip(),
  fs.createWriteStream('big.txt.gz')
);
```

Use `pipeline` (handles errors + cleanup) instead of manual `.pipe()` chains.

---

### Q18. Backpressure — what is it?

When a writable stream can't accept data as fast as the readable produces it. Symptoms: ballooning memory, crashes, OOM.

Streams handle backpressure automatically when you use `pipeline` or `.pipe()`:
- Writable returns `false` from `write()` when its buffer is full.
- Readable pauses production.
- Writable emits `'drain'` when it has room again.
- Readable resumes.

Manual `write` loops must check the return value:
```js
const ok = writable.write(chunk);
if (!ok) await once(writable, 'drain');
```

---

### Q19. Web Streams vs Node Streams.

Two parallel APIs:
- **Node streams** (`node:stream`) — older, Node-specific, event-emitter based.
- **Web Streams** (`ReadableStream`, `WritableStream`, `TransformStream`) — web-standard, work in browsers, Deno, Bun, Workers, AND Node.

Interop:
```js
import { Readable } from 'node:stream';
const webStream = Readable.toWeb(nodeReadable);
const nodeStream = Readable.fromWeb(webStream);
```

Use Web Streams in new code targeting cross-runtime compatibility (`fetch` response bodies, Workers).

---

## 6. Process & Concurrency

---

### Q20. Worker Threads vs Child Process vs Cluster.

| Mechanism          | What it spawns                  | Memory                | Best for                              |
| ------------------ | ------------------------------- | --------------------- | ------------------------------------- |
| `worker_threads`   | Separate JS thread (same process) | Shared via `SharedArrayBuffer` | CPU-bound JS work                   |
| `child_process`    | Separate OS process             | Isolated, IPC          | Run other binaries, isolation         |
| `cluster`          | Multiple Node processes (fork)  | Isolated, IPC          | Scale a single Node app across cores  |

**Modern recommendation**: `worker_threads` for in-process parallelism. `cluster` is older and you often want a process manager (PM2, systemd) instead.

---

### Q21. AsyncLocalStorage — what is it?

A request-scoped context propagation primitive in `node:async_hooks`.

```js
import { AsyncLocalStorage } from 'node:async_hooks';
const als = new AsyncLocalStorage();

app.use((req, res, next) => {
  als.run({ requestId: crypto.randomUUID() }, next);
});

// Anywhere downstream:
function log(msg) {
  const ctx = als.getStore();
  console.log(`[${ctx?.requestId}] ${msg}`);
}
```

Survives `await`, callbacks, timers. The Node.js equivalent of thread-local storage. Use for tracing, request IDs, tenant context.

---

### Q22. process.on signals & graceful shutdown.

```js
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down');
  await server.close();
  await db.close();
  process.exit(0);
});
```

Important for Kubernetes (`SIGTERM` then `SIGKILL` after grace period), Heroku, Docker.

Don't `process.exit()` from random code — let pending work finish, then exit naturally or after explicit close.

---

## 7. File System & I/O

---

### Q23. `node:fs` vs `node:fs/promises`.

```js
import fs from 'node:fs';
fs.readFile('x.txt', (err, data) => {});

import fs from 'node:fs/promises';
const data = await fs.readFile('x.txt');
```

Prefer the promises variant in modern code. Sync variants (`readFileSync`) exist but **block the event loop** — only use at startup or in CLI scripts.

---

### Q24. Why is `fs.readFile` slower than `fs.createReadStream` for big files?

`readFile` allocates a Buffer big enough for the whole file. Memory + GC pressure. Single I/O cliff.

`createReadStream` reads chunks (default 64 KB), processes them as they arrive. Constant memory, parallel CPU work.

Rule: > a few MB → streams.

---

## 8. Networking

---

### Q25. How does `http.createServer` work?

```js
import http from 'node:http';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('hi');
});
server.listen(3000);
```

Under the hood: libuv's `uv_tcp_t` plus an HTTP parser. Each connection re-enters the event loop on every socket event. No threads per connection — c10k-scale by default.

---

### Q26. Native `fetch` — when did it land?

`fetch` (with `Request`, `Response`, `Headers`, `FormData`) is stable since **Node 21** (introduced experimentally in Node 18). No more `node-fetch` dependency in new code.

```js
const res = await fetch('https://api.example.com/users');
const users = await res.json();
```

Powered by **undici** internally — faster than the legacy http client.

---

### Q27. Native WebSocket client.

Stable since **Node 22.4** (verified): there's a built-in `WebSocket` global for **client** use.

```js
const ws = new WebSocket('wss://example.com');
ws.addEventListener('message', e => console.log(e.data));
```

Server-side WebSocket still requires a library (`ws`, `uWebSockets.js`).

---

## 9. Modern Built-ins

---

### Q28. Built-in test runner.

Stable since Node 20 (`node:test`).

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('adds', () => {
  assert.equal(1 + 1, 2);
});
```

Run with `node --test`. Supports subtests, beforeEach/afterEach, mocking (`mock.fn`), code coverage (`--experimental-test-coverage`, `--test-reporter=lcov`).

Reduces dependency on Jest/Mocha for small projects.

---

### Q29. Native TypeScript execution.

Verified: native `.ts` execution is **stable** in Node 24.12+ and 25.2+:

- No flag needed for **erasable TS syntax** (type annotations, interfaces, type aliases) since v22.18.
- `--experimental-transform-types` enables enums and namespaces.
- `tsconfig.json` is **ignored** — Node strips types only.

```bash
node script.ts   # works in Node 24+
```

For complex builds (path aliases, decorators, JSX), keep `tsc`/`swc` in the pipeline.

---

### Q30. Permission model.

Stable in Node 24 (verified — flag is `--permission`, no longer `--experimental-permission`).

```bash
node --permission \
     --allow-fs-read=/app \
     --allow-fs-write=/app/logs \
     --allow-net \
     --allow-child-process \
     script.js
```

Granular allow lists for filesystem, network, child processes, workers, native addons, WASI. Runtime API: `process.permission.has('fs.read', '/app')`.

Replaces the deprecated `--experimental-policy` (removed in v22).

---

### Q31. `--env-file`, `--watch`.

- `--env-file=.env` — load env vars from a file at startup (stable, no need for `dotenv` package).
- `--watch script.js` — auto-restart on file change (stable since Node 22).

Both reduce dev tooling boilerplate.

---

## 10. Performance & Observability

---

### Q32. Event loop lag — how do you measure it?

```js
import { monitorEventLoopDelay } from 'node:perf_hooks';
const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();

setInterval(() => {
  console.log('p99 lag (ms):', (histogram.percentile(99) / 1e6).toFixed(2));
  histogram.reset();
}, 5000);
```

Useful for production health signals. > 200ms lag means trouble.

---

### Q33. Garbage collection — what should you know?

V8 uses a **generational** GC:
- **Young generation** (short-lived objects) — frequent, fast scavenges.
- **Old generation** (long-lived) — mark-sweep, mark-compact, more pauses.

Tuning flags (rarely needed):
- `--max-old-space-size=4096` — bump heap to 4 GB.
- `--expose-gc` — exposes `global.gc()` for explicit triggers (debugging only).

Memory leak symptoms: heap rising over time, GC pauses lengthening. Diagnose with heap snapshots (`--inspect`, Chrome DevTools Memory tab).

---

### Q34. Profiling production Node.

Tools:
- **`--prof`** then `node --prof-process` → V8 tick samples.
- **`--inspect`** + Chrome DevTools → CPU profiler.
- **clinic.js** — `doctor` (event loop), `flame` (CPU flamegraph), `bubbleprof` (async).
- **0x** — flamegraphs.
- **OpenTelemetry** — distributed tracing.

Generate flamegraphs in staging with realistic traffic; don't profile in pure dev.

---

### Q35. Native crypto vs Web Crypto API.

- `node:crypto`: full Node API (hashes, ciphers, key generation, KDFs).
- `globalThis.crypto.subtle`: Web Crypto API, also available — promise-based, cross-runtime.

Use Web Crypto when sharing code between Node, browsers, Workers, Deno. Use `node:crypto` for things only it supports (streaming ciphers, legacy algorithms).

---

## 11. Package Management

---

### Q36. npm vs pnpm vs yarn — what's bundled with Node?

- **npm** ships with Node by default.
- **Corepack** (bundled in Node up to v25; phased out in v25+) is a shim that downloads pnpm/yarn on-demand based on `packageManager` in `package.json`.
- After Corepack's removal from the default distribution: install your preferred PM separately.

For most teams: **pnpm** for speed and disk efficiency; **npm** for zero-setup compatibility; **yarn** legacy/v4 for monorepos.

---

### Q37. `package-lock.json` — what does it actually do?

Pins the exact version (and integrity hash) of every dependency in the resolved tree. Without it, two `npm install` calls can produce different node_modules trees (semver ranges resolve to different versions over time).

Always commit it. CI should use `npm ci` (strict, faster, removes existing `node_modules`).

---

## 12. Release Schedule

---

### Q38. Node.js release cycle (verified).

**Old schedule** (until Oct 2026):
- Major versions every 6 months (April + October).
- Even majors get LTS in October of release year.
- LTS lifecycle: Active LTS → Maintenance LTS.
- Odd majors EOL after 6 months.

**New schedule** (announced — applies from Oct 2026 onward):
- One major per year, **in April**.
- **All majors become LTS** in October.
- 36-month total support per major.
- Version numbers align with calendar year (Node 27 in 2027, Node 28 in 2028, etc.).

Source: [Node.js release schedule announcement](https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule).

---

### Q39. Should I use Current or LTS in production?

Always LTS unless you have a specific need from Current. As of May 2026:
- **Node 24** is Active LTS — production default.
- **Node 22** is Maintenance LTS — still patched, no new features.
- **Node 26** is Current — for experimenting with newest features.

---

## Final Senior Tips

1. **Single-threaded JS, multi-threaded I/O** — get that distinction right.
2. **Microtasks drain between every phase**; `nextTick` drains before microtasks.
3. **Streams scale; buffers crash** — for big data, use streams or batches.
4. **Worker threads for CPU work; cluster/process for isolation.**
5. **Native TS/fetch/test/permission** all stable now — drop the legacy deps.
