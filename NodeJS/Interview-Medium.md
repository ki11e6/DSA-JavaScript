# Node.js — Medium Interview Questions

> **Audience**: 2–5 yr engineers.
> **Goal**: Streams, error handling, performance basics, child processes, worker threads, secure defaults, ESM/CJS interop, testing.
> Verified against [nodejs.org](https://nodejs.org) (Node 26 / 24 LTS, May 2026).

---

## 1. Streams

---

### Q1. Pipe a file through gzip with proper error handling.

```js
import fs from 'node:fs';
import zlib from 'node:zlib';
import { pipeline } from 'node:stream/promises';

await pipeline(
  fs.createReadStream('big.txt'),
  zlib.createGzip(),
  fs.createWriteStream('big.txt.gz')
);
```

`pipeline` handles errors and cleanup on any stage. Don't roll your own `.pipe().pipe()` chains — they leak descriptors on errors.

---

### Q2. Write a custom Transform stream.

```js
import { Transform } from 'node:stream';

const upper = new Transform({
  transform(chunk, encoding, cb) {
    cb(null, chunk.toString().toUpperCase());
  }
});

process.stdin.pipe(upper).pipe(process.stdout);
```

`cb(err, transformedChunk)` is the contract. `flush(cb)` for final cleanup (e.g., emit a trailer).

---

### Q3. Stream a large HTTP response without buffering.

```js
import http from 'node:http';
import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';

http.createServer(async (req, res) => {
  res.writeHead(200, { 'content-type': 'application/octet-stream' });
  try {
    await pipeline(fs.createReadStream('big.bin'), res);
  } catch (e) {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
}).listen(3000);
```

This serves 10 GB without 10 GB of RAM.

---

### Q4. Convert between Web Streams and Node Streams.

```js
import { Readable } from 'node:stream';

// Web → Node
const nodeStream = Readable.fromWeb(webStream);

// Node → Web
const webStream = Readable.toWeb(nodeStream);
```

Useful when integrating fetch responses (Web Streams) with `pipeline`.

---

## 2. Error Handling

---

### Q5. Why is unhandled rejection bad?

```js
async function bad() { throw new Error('boom'); }
bad(); // no .catch — unhandled rejection
```

Node logs a warning and (depending on flags + version) terminates the process. Always:
- `await` the call inside a `try/catch`.
- Or `.catch()` the Promise.
- Or attach a global handler:

```js
process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection', reason);
  // Decide: crash or continue
});
```

Default mode in modern Node is `throw` — unhandled rejection crashes.

---

### Q6. Difference between `process.on('uncaughtException')` and `unhandledRejection`?

| Event                  | Source                  | Recovery safe?           |
| ---------------------- | ----------------------- | ------------------------ |
| `uncaughtException`    | Sync throw not caught   | No — state may be torn   |
| `unhandledRejection`   | Promise rejected, no `.catch` | Sometimes               |

Best practice: log, flush observability, **exit**. Don't pretend nothing happened — the process state is suspect.

---

### Q7. How do you make a "must-await" function?

Use the operational error pattern: never silently fail.

```js
async function transfer(from, to, amount) {
  const tx = await db.beginTransaction();
  try {
    await tx.debit(from, amount);
    await tx.credit(to, amount);
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e; // re-throw so caller decides
  }
}
```

Returning Promises that callers may forget is a footgun — at minimum log them or wrap them in something that flags forgotten awaits.

---

### Q8. AbortController for cancellation.

```js
const ac = new AbortController();
const t = setTimeout(() => ac.abort(), 5000); // 5s timeout

try {
  const res = await fetch(url, { signal: ac.signal });
  return await res.json();
} finally {
  clearTimeout(t);
}
```

Most modern APIs accept `signal` — `fetch`, `fs/promises`, `setTimeout/setInterval` (via `node:timers/promises`), child processes, streams. Use it everywhere.

---

## 3. Performance

---

### Q9. Why is `JSON.parse` on a huge string a problem?

It blocks the event loop while parsing the entire string into a JS object. Multi-megabyte payloads can pause requests for tens to hundreds of milliseconds.

Workarounds:
- **Streaming parsers** (`stream-json`, `JSONStream`) — incremental.
- **Reject early** — set body size limits at the framework layer.
- **Use binary formats** (Protobuf, MessagePack) for hot paths.

---

### Q10. CPU work in a Worker Thread.

```js
// worker.js
import { parentPort } from 'node:worker_threads';
parentPort.on('message', (n) => {
  // CPU-bound work
  let sum = 0;
  for (let i = 0; i <= n; i++) sum += i;
  parentPort.postMessage(sum);
});

// main.js
import { Worker } from 'node:worker_threads';
const worker = new Worker(new URL('./worker.js', import.meta.url));
worker.postMessage(1_000_000_000);
worker.on('message', (sum) => console.log(sum));
```

Use a **pool** (`piscina` library, or write your own) — don't spawn a worker per task.

---

### Q11. Share data between workers efficiently.

`SharedArrayBuffer` lets multiple threads read/write the same memory:

```js
const sab = new SharedArrayBuffer(1024);
const view = new Int32Array(sab);
worker.postMessage(sab); // no copy
```

Use `Atomics` for coordination (CAS, wait/notify). Useful for hot-loop computation without serialization overhead.

---

### Q12. Measure performance precisely.

```js
import { performance, PerformanceObserver } from 'node:perf_hooks';

performance.mark('a');
// ...work...
performance.mark('b');
performance.measure('a → b', 'a', 'b');

new PerformanceObserver((list) => {
  for (const m of list.getEntries()) console.log(m.name, m.duration);
}).observe({ entryTypes: ['measure'] });
```

`performance.now()` returns high-resolution time in milliseconds (sub-ms precision).

---

## 4. Process Management

---

### Q13. Run a shell command and capture output.

```js
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);

const { stdout, stderr } = await execFileAsync('git', ['log', '--oneline']);
console.log(stdout);
```

Prefer `execFile` over `exec` — no shell, no injection risk from interpolated strings.

---

### Q14. Graceful shutdown.

```js
let shuttingDown = false;
const server = http.createServer(/* ... */).listen(3000);

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}, shutting down`);
  server.close(() => console.log('http closed'));
  await db.close();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

Kubernetes sends `SIGTERM`, waits `terminationGracePeriodSeconds`, then `SIGKILL`. Don't drag your feet — `db.close()` should be fast.

---

### Q15. Cluster vs Worker Threads — quick differences?

| Aspect           | Cluster (processes)              | Worker Threads             |
| ---------------- | -------------------------------- | -------------------------- |
| Isolation        | Full process boundary            | Threads in same process    |
| Shared memory    | None (IPC only)                  | `SharedArrayBuffer`        |
| Crash blast      | One worker dies, others OK       | Whole process if heap dies |
| Startup cost     | ~50–100 ms per worker            | ~5–20 ms per worker        |
| Best for         | Scale HTTP across cores          | CPU-bound JS work          |

For HTTP scaling, most teams use a process manager (PM2, Kubernetes Deployment) rather than cluster directly.

---

### Q16. Spawn another Node script with options.

```js
import { spawn } from 'node:child_process';

const child = spawn(process.execPath, ['./worker.js'], {
  stdio: ['ignore', 'pipe', 'inherit'], // stdin ignored, stdout piped, stderr inherited
  env: { ...process.env, ROLE: 'worker' }
});

child.stdout.on('data', (d) => console.log('child:', d.toString()));
child.on('exit', (code) => console.log('exit', code));
```

---

## 5. Networking

---

### Q17. Build a TCP server.

```js
import net from 'node:net';

const server = net.createServer((socket) => {
  socket.on('data', (data) => socket.write(data)); // echo
  socket.on('end', () => console.log('disconnected'));
});

server.listen(4000);
```

---

### Q18. Use the built-in WebSocket client (Node 22.4+).

```js
const ws = new WebSocket('wss://example.com/socket');

ws.addEventListener('open', () => ws.send('hello'));
ws.addEventListener('message', (e) => console.log(e.data));
ws.addEventListener('close', (e) => console.log('closed', e.code));
ws.addEventListener('error', (e) => console.error('err', e));
```

Server-side WebSocket still needs `ws` or `uWebSockets.js`.

---

### Q19. Custom fetch with retries + timeout.

```js
async function fetchRetry(url, opts = {}, { retries = 3, timeout = 5000 } = {}) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeout);
    try {
      const res = await fetch(url, { ...opts, signal: ac.signal });
      if (res.ok) return res;
      if (res.status >= 500 && attempt < retries - 1) continue;
      return res;
    } catch (e) {
      if (e.name !== 'AbortError' && attempt === retries - 1) throw e;
    } finally {
      clearTimeout(t);
    }
  }
}
```

For production: `undici.fetch` directly with `dispatcher: new Agent({ connections, pipelining })` for fine-grained control.

---

## 6. Modules — Deep

---

### Q20. ESM importing CJS.

```js
// counter.cjs
module.exports = { count: () => 1 };

// main.mjs
import counter from './counter.cjs';
counter.count();          // 1
```

The default export is the entire `module.exports`. Named imports work only if the bundler/Node detects named exports statically (heuristic).

---

### Q21. CJS requiring ESM.

Stable in Node 24:

```js
const { add } = require('./math.mjs'); // works
```

**Limitation**: ESM modules with **top-level await** can't be `require()`d. Use `await import(...)`.

---

### Q22. Dynamic import.

```js
const moduleName = './plugins/' + name + '.js';
const plugin = await import(moduleName);
plugin.run();
```

Works in both ESM and CJS. Returns a Promise. Use for code splitting, optional deps, conditional loading.

---

### Q23. Conditional exports in `package.json`.

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./utils": {
      "import": "./dist/utils.mjs",
      "require": "./dist/utils.cjs"
    }
  }
}
```

Hides internal files from consumers. Bundlers pick `import` for ESM, `require` for CJS, `types` for TypeScript.

---

## 7. Security

---

### Q24. The Permission Model (stable since Node 24).

```bash
node --permission \
     --allow-fs-read=/app/data \
     --allow-net=api.example.com \
     server.js
```

Runtime check:
```js
if (process.permission.has('fs.write', '/etc/passwd')) {
  throw new Error('Refuse');
}
```

Granular allow lists for fs, net, child_process, worker, addons, wasi. Reduces blast radius if a dependency is compromised.

---

### Q25. Prevent prototype pollution.

```js
// Vulnerable
function setDeep(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    cur = cur[keys[i]] ??= {};
  }
  cur[keys.at(-1)] = value;
}
setDeep({}, '__proto__.polluted', 'yes'); // 💥
```

Fixes:
- Filter `__proto__`, `constructor`, `prototype` keys.
- Use `Object.create(null)` for maps with user keys.
- Validate input with a schema library (`zod`, `valibot`).

---

### Q26. What is `package-lock.json` for security?

Pins exact versions + integrity hashes (SHA-512). Without it, `npm install` resolves semver ranges fresh, potentially pulling a poisoned new patch release.

Commit it. Use `npm ci` (or pnpm/yarn equivalents) in CI for reproducible installs.

Audit:
```bash
npm audit --omit=dev
```

---

### Q27. Don't run as root.

In Docker:
```dockerfile
RUN useradd -m nodeuser
USER nodeuser
```

Node has no special privileges — running as root just gives a compromised process more power.

---

## 8. Testing

---

### Q28. Native test runner.

```js
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

describe('User', () => {
  before(() => db.connect());

  test('create', async () => {
    const u = await User.create({ name: 'A' });
    assert.equal(u.name, 'A');
  });

  test('delete', async (t) => {
    await t.test('marks deleted', () => { /* ... */ });
  });
});
```

Run with:
```bash
node --test
node --test --watch
node --test --experimental-test-coverage --test-reporter=lcov
```

---

### Q29. Mock with the built-in mocker.

```js
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

test('calls fetch', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => new Response('ok'));
  await callIt();
  assert.equal(fetchMock.mock.calls.length, 1);
});
```

No `jest`/`vitest` required for basic mocking. For deep mocks, prefer Vitest in larger codebases.

---

## 9. Observability

---

### Q30. Structured logging.

```js
const log = {
  info: (msg, fields) => console.log(JSON.stringify({ level: 'info', msg, ...fields, ts: new Date().toISOString() })),
  error: (msg, fields) => console.error(JSON.stringify({ level: 'error', msg, ...fields, ts: new Date().toISOString() }))
};

log.info('user_signup', { userId: 42 });
```

For production: `pino` (fastest), `winston` (most features), `bunyan`. They handle JSON serialization, transports, log levels, redaction.

---

### Q31. Tracing with AsyncLocalStorage.

```js
import { AsyncLocalStorage } from 'node:async_hooks';
const tracing = new AsyncLocalStorage();

http.createServer((req, res) => {
  const ctx = { requestId: crypto.randomUUID() };
  tracing.run(ctx, () => handler(req, res));
});

function deepFunction() {
  const ctx = tracing.getStore();
  log.info('did work', { requestId: ctx.requestId });
}
```

Survives `await`, callbacks, timers. The standard way to propagate request context.

---

### Q32. OpenTelemetry — quick setup.

```js
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  serviceName: 'my-service',
  instrumentations: [getNodeAutoInstrumentations()]
});
await sdk.start();
```

Auto-instruments `http`, `pg`, `mysql`, `redis`, `express`, fetches, more. Outputs OTLP to your collector.

---

## 10. Frameworks

---

### Q33. Express vs Fastify vs Hono — quick comparison.

| Aspect       | Express                  | Fastify                       | Hono                          |
| ------------ | ------------------------ | ----------------------------- | ----------------------------- |
| Speed        | Baseline                 | ~2–3× faster                  | Comparable, web-standards     |
| Schema       | Manual                   | JSON-Schema built-in          | Zod / Valibot adapters        |
| Maturity     | Veteran                  | Mature                        | Younger but stable            |
| Runtime      | Node                     | Node                          | Node, Bun, Deno, Workers, Edge |
| API style    | Callback                 | Async-first                   | Web-fetch (Request/Response)  |

For new projects: **Fastify** for Node-only, **Hono** for multi-runtime / edge.

---

### Q34. Why is Express middleware slow?

Express's `app.use(...)` chain has a known per-request overhead from its sync middleware design. Fastify's encapsulation + JSON-Schema serialization wins benchmarks by ~2–3×.

In practice: most apps aren't framework-bound — DB queries dominate. Pick by ergonomics first.

---

### Q35. CORS.

```js
import cors from 'cors';
app.use(cors({
  origin: ['https://example.com'],
  credentials: true
}));
```

Without a library:
```js
res.setHeader('Access-Control-Allow-Origin', 'https://example.com');
res.setHeader('Access-Control-Allow-Credentials', 'true');
res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
if (req.method === 'OPTIONS') return res.end();
```

Don't `Access-Control-Allow-Origin: *` with credentials — browsers reject it.

---

### Q36. Rate limit.

```js
import { RateLimiterMemory } from 'rate-limiter-flexible';
const limiter = new RateLimiterMemory({ points: 60, duration: 60 });

app.use(async (req, res, next) => {
  try {
    await limiter.consume(req.ip);
    next();
  } catch {
    res.status(429).json({ error: 'rate limited' });
  }
});
```

In production: Redis-backed (`RateLimiterRedis`) so all instances share state.
