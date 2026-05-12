# Node.js — Latest Interview Questions (2025–2026)

> **Audience**: Interview prep for 2025–2026 backend rounds.
> **Focus**: Node 24/26 features, event loop forensics, supply chain security incidents (Sept 2025 npm compromise), performance, observability.
> **Verified** against [nodejs.org](https://nodejs.org) docs, Platformatic/NearForm/Semgrep blogs, and aggregated 2025–2026 interview reports.

---

## 1. Node 24 / 26 & Modern Features

---

### Q1. How does Node 24's native TypeScript execution work? Will it run any `.ts` file?

Node uses **type stripping** (no transpilation) — it removes type annotations and replaces them with whitespace to preserve source maps. **No type checking** is performed.

**Doesn't work without `--experimental-transform-types`**:
- Enums.
- Namespaces with runtime code.
- Parameter properties (`constructor(public name: string)`).
- Experimental decorators.

Stable in **v24.12+**, no flag, no `tsconfig.json` (it's ignored). Use `tsc` only for type-checking in CI.

---

### Q2. What changes in the October 2026 release schedule?

- One major per year, **in April**.
- **Every major becomes LTS** (no more even/odd split).
- **36-month support** per major.
- Version numbers align to the calendar year (27.0.0 in 2027, 28.0.0 in 2028).
- An **alpha channel** is added.

Source: [Node.js — Evolving the Release Schedule](https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule).

---

### Q3. Explain `require(esm)` in Node 24. When does it still throw?

`require()` can now synchronously load an ESM module. It throws **`ERR_REQUIRE_ASYNC_MODULE`** if the target ESM (or anything in its graph) uses **top-level await** — `require` cannot pause.

Default exports come back as `ns.default`, not directly.

```js
const ns = require('./esm.mjs');
ns.default; // the default export
ns.namedExport;
```

Stable since v22.12, refined in v24.

---

### Q4. How does the permission model work, and what are its limits?

```bash
node --permission \
     --allow-fs-read=./data \
     --allow-net=api.example.com \
     --allow-child-process \
     app.js
```

Stable since **v23.5**. Restricts fs, child_process, worker_threads, native addons. Workers inherit parent's permissions.

**Limits**:
- Process-wide, not per-module — can't restrict only the `lodash` import.
- Doesn't protect against pure-JS exploits (prototype pollution, in-process tampering with globals).

---

### Q5. How do you build a Single Executable Application (SEA)?

1. Write a `sea-config.json`.
2. `node --experimental-sea-config sea-config.json` → produces a blob.
3. Copy the `node` binary.
4. Use `postject` to inject the blob into the binary.
5. Codesign on macOS/Windows.

```js
import { getAsset, isSea } from 'node:sea';
if (isSea()) {
  const cfg = getAsset('config.json', 'utf8');
}
```

Joyee Cheung's 2026 work moves the build into core via `--build-sea`.

---

## 2. Event Loop & Async Internals

---

### Q6. Predict the output.

```js
setImmediate(() => console.log('immediate'));
Promise.resolve().then(() => console.log('promise'));
process.nextTick(() => console.log('nextTick'));
console.log('sync');
```

**Output**: `sync, nextTick, promise, immediate`

Reasoning:
- Sync runs first.
- `nextTick` queue drains **before** the microtask queue.
- Both drain between every event loop phase.
- `setImmediate` runs in the **check phase** — after `nextTick` + microtasks settle.

---

### Q7. What is event loop starvation and how do you detect it?

```js
function bad() { process.nextTick(bad); }
bad();
http.createServer(...).listen(3000); // never sees requests
```

`nextTick` queue is drained before each phase. If it never empties, the loop never advances → no I/O, no timers.

**Detection in production**:
```js
import { monitorEventLoopDelay } from 'node:perf_hooks';
const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();
setInterval(() => {
  if (h.percentile(99) / 1e6 > 100) alert('event loop lag > 100ms');
  h.reset();
}, 5000);
```

---

### Q8. What does AsyncLocalStorage do and what's the cost?

Stores per-async-chain context (request id, tenant, trace id) without threading args through every call.

```js
import { AsyncLocalStorage } from 'node:async_hooks';
const als = new AsyncLocalStorage();

app.use((req, _res, next) => als.run({ reqId: crypto.randomUUID() }, next));
logger.info({ reqId: als.getStore()?.reqId }, 'handled');
```

**Cost** (benchmarks on v22/v24):
- ALS alone: ~7% throughput overhead.
- Full OpenTelemetry auto-instrumentation: 80%+ in pathological cases — measure before turning on globally.

Used internally by OpenTelemetry's Node SDK to propagate span context.

---

## 3. Streams, HTTP, Concurrency

---

### Q9. What is backpressure, and what happens if you ignore `write()`'s return value?

When `writable.write(chunk)` returns `false`, the internal buffer exceeded `highWaterMark`.

**Ignoring it** → memory grows unbounded → OOM.

**Correct**: pause the readable or `await once(writable, 'drain')`. Or use `stream.pipeline()`:

```js
import { pipeline } from 'node:stream/promises';

await pipeline(
  fs.createReadStream('big.bin'),
  zlib.createGzip(),
  fs.createWriteStream('big.bin.gz')
);
```

`pipeline` handles backpressure, errors, and cleanup.

---

### Q10. How do you convert a Node `Readable` to a Web `ReadableStream`?

```js
import { Readable } from 'node:stream';

const webStream = Readable.toWeb(nodeStream);
const nodeStream = Readable.fromWeb(webStream);
```

Backpressure is preserved across the bridge. Needed for `fetch` request bodies and edge-runtime interop.

---

### Q11. Worker threads vs cluster vs child_process — pick one and justify.

- **`cluster` / `child_process.fork`**: separate V8 isolates, IPC by message-passing, scale to cores for stateless HTTP. Memory **duplicated** per worker.
- **`worker_threads`**: same process, can share memory via `SharedArrayBuffer` / `MessageChannel`. Lower spawn cost. **Best for CPU-bound work** (image resize, crypto, parsing).
- **`child_process.spawn`**: external binaries / language interop.

**Modern advice**: prefer a reverse proxy + multiple Node processes over `cluster` (PM2/Kubernetes). Use `worker_threads` for compute hot paths.

---

### Q12. Native `fetch` vs `undici.request` — when reach for undici directly?

Native `fetch` is an undici wrapper. Drop to `undici.request` / `Pool` / `Agent` for:
- Explicit **connection pooling** per origin.
- **HTTP/2** via `allowH2: true`.
- **Pipelining**.
- Lower overhead (no `Response` wrapper).
- **`MockAgent`** for tests.

```js
import { Pool } from 'undici';
const pool = new Pool('https://api.example.com', { connections: 10, pipelining: 1 });
const { body } = await pool.request({ method: 'GET', path: '/v1/x' });
```

---

### Q13. Why is the default Node HTTP agent often a bottleneck in microservices?

Legacy `http.Agent` has `maxSockets: Infinity` per host but **keep-alive off** in older code paths. Result: TLS handshake on every call → high latency, CPU burn.

**Fix**: undici `Pool` with `connections: N, pipelining: 1, keepAliveTimeout`. Native `fetch` defaults to keep-alive — good for most cases.

---

## 4. Performance Forensics

---

### Q14. A prod service shows P99 latency spikes every ~30s but CPU is low. How do you diagnose?

1. **Enable `monitorEventLoopDelay`** — if lag spikes during the latency window, it's loop lag.
2. Capture **`--cpu-prof`** during the spike, open in Chrome DevTools.
3. **`clinic doctor`** for a quick "what's wrong" report.
4. If I/O-bound: **`clinic bubbleprof`**.
5. If CPU-bound: **`clinic flame`** or **`0x`** for flamegraphs.
6. Common cause: **GC pauses** (check `--trace-gc`). Sub-causes: large objects, leaks, heap pressure.
7. Or: synchronous code (`crypto.pbkdf2Sync`, `JSON.parse` on huge bodies).

---

### Q15. How do you read a flamegraph?

- **X-axis** = sample count (**width = CPU time**, NOT call order).
- **Y-axis** = stack depth.

Wide plateaus at the top are **hot leaves** — that's where the CPU is. Look for unexpected sync code (regex, `Buffer.toString` on huge buffers, JSON serialization).

---

## 5. Security (recent incidents)

---

### Q16. Walk me through the September 2025 npm chalk/debug compromise.

- **Date**: 2025-09-08.
- **Attack**: maintainer Josh Junon was **phished** via `npmjs.help` (fake 2FA reset).
- **Scope**: malicious versions of `debug`, `chalk`, and 16 others (~2.6B weekly downloads combined).
- **Payload**: browser-only — hooked `window.ethereum` to **rewrite crypto wallet recipients**.
- **Duration**: live ~2 hours.

**Mitigations**:
- Pin versions in `package.json` (not `^` ranges for security-critical deps).
- `npm ci` with lockfile in CI.
- npm provenance attestations + Sigstore verification.
- Internal proxy registry (Verdaccio, Nexus).
- `--ignore-scripts` for direct deps, run install scripts only after audit.
- Subresource integrity for CDN-loaded code.

Sources: [Semgrep](https://semgrep.dev/blog/2025/chalk-debug-and-color-on-npm-compromised-in-new-supply-chain-attack/), [Vercel](https://vercel.com/blog/critical-npm-supply-chain-attack-response-september-8-2025).

---

### Q17. Explain prototype pollution with a recent CVE.

- **CVE-2025-64718** (`js-yaml` `merge`): crafted YAML sets `__proto__` / `constructor.prototype`, polluting `Object.prototype` globally.
- **CVE-2025-57820** (`devalue` `parse`): similar issue via serialized JS-like values.

Consequence: auth bypass, template-engine RCE.

**Defenses**:
- `Object.create(null)` for maps with user keys.
- `Map` instead of plain objects for user-provided keys.
- `Object.freeze(Object.prototype)` (can break libraries).
- Input schema validation (Zod, Ajv).
- `--disable-proto=delete` Node flag.

---

### Q18. Can the permission model prevent the chalk attack?

**Partially.**

```bash
node --permission \
     --allow-fs-read=./node_modules \
     --allow-net=api.myservice.com \
     server.js
```

Would block:
- Writes to `~/.ssh`, `~/.aws/credentials`.
- Network calls to attacker domains (the chalk payload exfiltrated wallet redirects).

**Doesn't block** in-process JS tampering with globals or other deps' exports — that's the same JS context.

---

## 6. Modules & Testing

---

### Q19. Can you `require()` an ESM module that has `await fetch(...)` at top level?

**No** — throws `ERR_REQUIRE_ASYNC_MODULE`. You must `await import()` it, or refactor the TLA into an exported async init function.

```js
// 🚫 import.ts has `await fetch(url)` at top level
const mod = require('./import.ts'); // throws

// ✅
const mod = await import('./import.ts');
```

---

### Q20. Replace Jest with `node:test` — what do you get and lose?

**Get**:
- Built-in (no install).
- `node --test --experimental-test-coverage --watch`.
- TAP / JUnit reporters.
- Mocks via `mock.method`.
- Subtests with `t.test(...)`.
- Snapshot testing (v22+).

**Lose**:
- Jest's auto-mocking.
- Rich `expect` matchers (use `node:assert/strict` or import `expect` from another lib).
- Large plugin ecosystem.

For new small/medium projects: `node:test` is enough. For migrating large Jest suites: stay on Jest or move to Vitest.

---

### Q21. What does `--env-file=.env` do, and what's the gotcha?

Loads `KEY=VALUE` pairs into `process.env` before user code runs — no `dotenv` package.

**Gotchas**:
- **No variable expansion** (`${OTHER_VAR}` doesn't expand).
- Multi-line values need quotes.
- Overrides existing env only with `--env-file-if-exists` semantics in newer versions.

For complex configs, still use `dotenv-expand` or a typed config library.

---

### Q22. How does the built-in WebSocket client (v22.4+) differ from `ws`?

```js
const ws = new WebSocket('wss://example.com');
ws.addEventListener('message', e => console.log(e.data));
```

**Built-in**:
- Matches the browser API (events, not `.on()`).
- Client only — no server.
- No `permessage-deflate`.
- No extension API.

For **server-side** WebSocket: still `ws`, `uWebSockets.js`, or upgrade a `node:http` socket.

---

### Q23. Senior design: implement request-scoped logging across async DB calls without passing `ctx` everywhere.

```js
import { AsyncLocalStorage } from 'node:async_hooks';
const als = new AsyncLocalStorage();

http.createServer((req, res) => {
  const ctx = { reqId: crypto.randomUUID(), userId: parseUser(req) };
  als.run(ctx, () => handler(req, res));
});

// Any depth:
function dbCall() {
  const ctx = als.getStore();
  logger.info({ reqId: ctx?.reqId }, 'querying users');
  // ...
}
```

Same store backs OpenTelemetry's span context — they coexist. ALS survives `await`, callbacks, timers, Promise chains.

---

## 7. Operational

---

### Q24. Graceful shutdown for Kubernetes.

```js
let shuttingDown = false;
const server = http.createServer(handler).listen(3000);

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[${signal}] draining`);
  server.close(() => console.log('http drained'));
  await db.close();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

K8s sends `SIGTERM`, waits `terminationGracePeriodSeconds`, then `SIGKILL`. Make `db.close()` fast (idle connections only) — don't wait on user transactions forever.

---

### Q25. Common 2025 production gotchas.

1. **Lambda + Node 20**: cold start + connection pool exhaustion → use HTTP-based DB clients (Neon, PlanetScale, Turso) instead of Postgres TCP.
2. **`process.env` reads in hot paths** are slow on some Node versions — cache at module scope.
3. **Logging to stdout synchronously** in tight loops blocks the loop. Use Pino with `async: true` or a transport.
4. **Forgetting to `.unref()`** dev timers → process won't exit in CLI scripts.
5. **HTTP keep-alive shedding** during shutdown: send `Connection: close` on responses while draining so clients don't hold open sockets.

---

## Final Senior Tips

1. **Microtasks drain between every event loop phase** — `nextTick` first, then Promise queue.
2. **Native APIs (TS, fetch, test, permission, env-file)** are stable — drop legacy deps.
3. **Supply chain hygiene** is the security topic of 2025–2026 — name the chalk/debug incident specifically.
4. **AsyncLocalStorage > threading ctx args** — it's the standard request-context primitive.
5. **`require(esm)` is stable** but TLA-incompatible — clarify limits.

---

## Sources

- [Node.js Release Schedule Evolution](https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule)
- [Node 24 Native TypeScript (dev.to)](https://dev.to/benriemer/nodejs-24-ships-native-typescript-the-end-of-build-steps-440f)
- [Fullstack Notes — require(esm)](https://fullstacknotes.dev/blog/2026/2026-01/2026-01-24-nodejs-require-esm/)
- [Brian Douglass — Permission Model](https://bhdouglass.com/blog/the-nodejs-permission-model/)
- [Node.js — Single Executable Applications](https://nodejs.org/api/single-executable-applications.html)
- [Mastering Event Loop: Tricky Questions](https://medium.com/@aayushpatniya1999/mastering-event-loop-tricky-node-interview-questions-048fe36a225c)
- [Platformatic — Hidden Cost of Async Context](https://blog.platformatic.dev/the-hidden-cost-of-context)
- [Dash0 — Contextual Logging in Node.js](https://www.dash0.com/guides/contextual-logging-in-nodejs)
- [Node.js — Backpressuring in Streams](https://nodejs.org/learn/modules/backpressuring-in-streams)
- [Platformatic — Undici](https://blog.platformatic.dev/http-fundamentals-understanding-undici-and-its-working-mechanism)
- [Performance Profiling in Production](https://dev.to/axiom_agent/nodejs-performance-profiling-in-production-v8-flame-graphs-clinicjs-and-heap-snapshots-2d70)
- [Semgrep — chalk/debug npm compromise (Sept 2025)](https://semgrep.dev/blog/2025/chalk-debug-and-color-on-npm-compromised-in-new-supply-chain-attack/)
- [Vercel — npm supply chain response](https://vercel.com/blog/critical-npm-supply-chain-attack-response-september-8-2025)
- [Snyk — CVE-2025-64718 js-yaml](https://security.snyk.io/vuln/SNYK-JS-JSYAML-13961110)
- [Second Talent — 25 Advanced Node.js Q (Feb 2026)](https://www.secondtalent.com/interview-guide/node-js/)
