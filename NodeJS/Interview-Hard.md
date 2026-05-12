# Node.js — Hard Interview Questions

> **Audience**: Senior / staff / architect rounds.
> **Goal**: Deep understanding of V8, libuv, the event loop, memory, performance, internals, and operational concerns.
> Verified against [nodejs.org](https://nodejs.org) (Node 26 / 24 LTS, May 2026).

---

## 1. V8 & Memory

---

### Q1. Walk me through V8's pipeline.

1. **Parser** → AST.
2. **Ignition** (interpreter) → bytecode. Runs immediately, collects type feedback.
3. **TurboFan** (optimizing compiler) → machine code, using collected feedback to speculate types.
4. If speculation fails (e.g., hidden class mismatch), V8 **deoptimizes** back to bytecode and re-collects.
5. Sparkplug (since V8 9.1): a fast non-optimizing baseline compiler that sits between Ignition and TurboFan.

**Takeaway**: V8 is fastest when code is "monomorphic" — same shapes (hidden classes), same types per call site. Polymorphic / megamorphic code falls off the fast path.

---

### Q2. What is a hidden class?

V8's internal representation of an object's shape. Every property addition/removal can transition the object to a new hidden class.

```js
const a = {}; a.x = 1; a.y = 2;  // hidden class C1 → C2 → C3
const b = {}; b.x = 1; b.y = 2;  // same chain → shares C3 ✓

const c = {}; c.y = 2; c.x = 1;  // DIFFERENT chain, different class
```

**Lesson**: initialize all properties in the same order in constructors / object literals. Avoid `delete` on hot objects.

---

### Q3. Why is the heap size 4 GB by default and how do you grow it?

V8 historically reserved space tuned for 32-bit pointer compression. The default max old generation is roughly 1.4–4 GB depending on Node version and architecture.

```bash
node --max-old-space-size=8192 server.js  # 8 GB
```

For services using close to the limit: bigger heaps mean longer GC pauses. Often better to fix the leak or split workload across processes.

---

### Q4. How does V8's garbage collector work?

**Generational**:
- **New space** (semi-space copying GC): short-lived objects, frequent + fast.
- **Old space** (mark-sweep + mark-compact): long-lived objects, less frequent but more expensive.
- **Large object space**: > 512 KB, allocated directly.
- **Code space**: JIT-compiled code.

V8 minimizes pauses with:
- **Incremental marking** (chunks the mark phase).
- **Concurrent sweeping** (background thread).
- **Orinoco** parallel/concurrent collector design.

Symptoms of trouble: rising heap, lengthening GC pauses (see `node --trace-gc`).

---

### Q5. How do you find a memory leak?

1. Reproduce with realistic traffic.
2. `--inspect`; Chrome DevTools → Memory → "Heap snapshot" before and after the leak window.
3. Compare snapshots → identify growing retainers.
4. Top suspects:
   - Closures holding references (e.g., timers/intervals not cleared).
   - Event listener accumulation (`emitter.on` without `off`).
   - Large in-memory caches without eviction (LRU + max size).
   - Global maps with user-supplied keys.

Tools: `clinic.js doctor`, `heapdump` (programmatic), `node --heap-prof`.

---

## 2. The Event Loop, Deeply

---

### Q6. Walk through every event loop phase and what runs there.

(Verified against [Node Event Loop docs](https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick).)

1. **timers**: `setTimeout`, `setInterval` callbacks whose deadline has passed.
2. **pending callbacks**: deferred I/O callbacks (e.g., some TCP error reports).
3. **idle, prepare**: internal libuv bookkeeping.
4. **poll**: retrieves new I/O events; executes most fs/net callbacks. May block here waiting for I/O if nothing else is pending.
5. **check**: `setImmediate` callbacks.
6. **close callbacks**: `socket.on('close', ...)`, `process.on('exit', ...)`.

Between every phase: drain `process.nextTick` queue, then microtask (Promise) queue. So microtasks run roughly **6 times per loop iteration**.

---

### Q7. When does the event loop exit?

When no more pending work is scheduled:
- No active timers.
- No active I/O (sockets, file handles, child processes).
- No active immediates.
- No pending `process.nextTick` / microtasks.
- No `keep-alive` handles (`setInterval`, `server.listen` keeps the loop alive).

`process.exit(code)` forces immediate exit. Use sparingly — it doesn't flush pending output cleanly.

---

### Q8. `setImmediate` vs `setTimeout(0)` — which runs first?

**Outside an I/O callback** (top-level): order is non-deterministic. Depends on the loop's startup state.

**Inside an I/O callback**: `setImmediate` always runs first (you're in `poll`; `check` is next, `timers` is next iteration).

This is a classic interview question — saying "it's non-deterministic" with the context distinction shows depth.

---

### Q9. Microtask starvation of I/O.

```js
function bad() {
  Promise.resolve().then(bad); // recursive microtask
}
bad();
http.createServer(...).listen(3000); // never sees requests
```

The microtask queue drains before the loop continues. Infinite microtask recursion starves all I/O. Same hazard with recursive `process.nextTick`.

Counterintuitively: an infinite **setTimeout(0)** loop does **not** starve I/O — between each scheduling, the loop completes a full iteration including `poll`.

---

## 3. Async Hooks & Context

---

### Q10. How does `AsyncLocalStorage` work under the hood?

Backed by `node:async_hooks`. Node tracks "async resources" via the **AsyncResource** abstraction:
- Each async operation (timer, Promise, I/O) has a numeric ID.
- A parent-child graph links them.
- ALS attaches a JS Map per async ID; lookups walk the chain.

Cost: every async transition runs hook callbacks. Modern Node optimizes the hot path significantly, but if you're tracing every microsecond, measure.

---

### Q11. How would you implement request-scoped context for a Node HTTP service?

```js
import { AsyncLocalStorage } from 'node:async_hooks';
import http from 'node:http';

const als = new AsyncLocalStorage();

http.createServer((req, res) => {
  als.run({ requestId: crypto.randomUUID(), start: Date.now() }, async () => {
    await handler(req, res);
  });
}).listen(3000);

// In any deeper code:
const ctx = als.getStore();
log.info('worked', { requestId: ctx.requestId });
```

Survives every `await` boundary, callback, Promise chain. Use for tracing, logging context, tenant identity, audit metadata.

---

### Q12. Why might trace IDs leak across requests if you don't use ALS?

```js
let currentRequestId = null; // 🚫 mutable global

http.createServer((req, res) => {
  currentRequestId = crypto.randomUUID();
  await handler(); // any await... another request may overwrite the global
});
```

Concurrent requests overwrite each other's `currentRequestId`. ALS gives each "async chain" its own store — concurrent requests don't collide.

---

## 4. Streams, Backpressure, Performance

---

### Q13. How does `pipeline` handle errors that streams emit?

It listens to `'error'` on every stream and:
1. Destroys the others (`.destroy(err)`).
2. Cleans up file descriptors / sockets.
3. Rejects the returned Promise.

Manual `.pipe()` chains don't propagate errors — a failing upstream leaves the downstream open. `pipeline` was added specifically to fix this footgun.

---

### Q14. Implement a custom Readable with backpressure.

```js
import { Readable } from 'node:stream';

class CounterStream extends Readable {
  #n = 0;
  #max;
  constructor(max) { super({ objectMode: true }); this.#max = max; }
  _read() {
    while (this.#n < this.#max) {
      const ok = this.push({ value: this.#n++ });
      if (!ok) return; // consumer told us to slow down
    }
    this.push(null); // EOF
  }
}
```

`_read()` is called when the consumer has room. `push` returns `false` when the internal buffer is full — that's the signal to pause production.

---

### Q15. `highWaterMark` — what is it?

The buffer threshold (in bytes for binary streams; in objects for objectMode) at which a stream signals backpressure.

Defaults:
- Readable / Writable: 16 KB.
- Object mode: 16 objects.

Tune up to reduce syscalls (when downstream is slow) or down to limit memory (when objects are large). Most code shouldn't touch it.

---

### Q16. Why is `pipeline` not enough for HTTP/2 streaming?

HTTP/2 multiplexes streams on one connection. Errors on one stream shouldn't tear down the connection. Use `nghttp2`-aware helpers in `node:http2`, and watch out for backpressure interactions with the underlying TCP stream.

---

## 5. Networking Internals

---

### Q17. `http.Agent` and `keep-alive`.

```js
import http from 'node:http';

const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10
});

await fetch(url, { dispatcher: agent }); // (undici syntax differs slightly)
```

Without keep-alive, each request opens a new TCP + TLS handshake — devastating for latency. Modern Node's `fetch` (undici) defaults to a pooled keep-alive Agent.

---

### Q18. TLS termination — where should it happen?

For high traffic:
- **Load balancer** (NGINX, HAProxy, ALB) terminates TLS, talks plaintext HTTP to Node. Node frees up cycles, balancer handles cert rotation.

For low traffic / single-node:
- **Node terminates** via `https.createServer({ key, cert }, handler)`. Simpler.

Edge cases: gRPC, mTLS, end-to-end encryption requirements → Node terminates.

---

### Q19. Why does my Node server hit a "EMFILE" error?

Too many open file descriptors. Each socket, file, stream uses one.

Check + raise the limit:
```bash
ulimit -n      # check
ulimit -n 65536
```

Production: set `LimitNOFILE=65536` in systemd unit, or `fs.file-max` kernel param.

Causes: leaked sockets (HTTP keep-alive misuse, missing `.end()`/`.destroy()`), forgotten streams.

---

### Q20. EADDRINUSE — what's actually happening?

The OS port is held by another listener (or a TIME_WAIT socket).

```bash
lsof -i :3000
fuser -k 3000/tcp
```

For graceful restarts, use `SO_REUSEPORT` (set automatically by Node when `cluster.fork` workers listen on the same port) or rolling deploys.

---

## 6. Process Lifecycle

---

### Q21. Why use `process.exit` vs `process.exitCode`?

- `process.exit(code)`: immediate termination. Doesn't flush async output, doesn't run cleanup hooks.
- `process.exitCode = code`: set the desired exit code, then let the event loop drain naturally.

Use exitCode in normal code paths; reserve exit for emergency aborts.

---

### Q22. Zero-downtime deploys for a Node service.

Several strategies:
- **Rolling deployment** (Kubernetes, ECS): start new pods, wait for readiness, drain old.
- **Graceful shutdown handler** on `SIGTERM`: stop accepting new connections, finish in-flight requests, close DB pool, exit.
- **`server.close(callback)`**: stops accepting, waits for active sockets to close.
- **Keep-alive shedding**: send `Connection: close` on responses during drain.

Typical termination grace period: 30s. Don't make `server.close()` infinite — clients may hold open connections forever.

---

### Q23. Detecting and recovering from a hung process.

A process can stop responding while still alive:
- Infinite loop (CPU-bound JS).
- Deadlocked on a futex (worker threads using Atomics.wait).

Healthchecks: a `/health` endpoint that updates a "last activity" timestamp. If checks fail for N seconds, orchestrator restarts.

In-process watchdog (last resort):
```js
const lastActive = { time: Date.now() };
setInterval(() => { lastActive.time = Date.now(); }, 1000);
setInterval(() => {
  if (Date.now() - lastActive.time > 5000) process.exit(1);
}, 1000).unref();
```

The `.unref()` prevents the watchdog itself from keeping the loop alive.

---

## 7. Security

---

### Q24. Threat: prototype pollution → RCE chain.

```js
// User input: { "__proto__": { "isAdmin": true } }
Object.assign({}, userInput); // pollutes Object.prototype
// Anywhere that checks `if (obj.isAdmin)` now sees true
```

Defenses:
- Validate JSON input against a schema (`zod`).
- Use `Object.create(null)` for maps.
- `Object.freeze(Object.prototype)` — works but can break libraries.
- Modern Node has runtime protections, but don't rely on them.

---

### Q25. Threat: SSRF via fetch.

```js
// User-supplied URL → fetch
const res = await fetch(req.body.url);
```

Attacker hits `http://169.254.169.254/latest/meta-data` (cloud metadata) or internal services. Defenses:
- Allow-list outbound hostnames.
- Resolve hostnames first, reject RFC 1918 / link-local / IPv6 ULA.
- Use a separate egress proxy.

---

### Q26. Supply chain — `npm` ecosystem.

- **Pin** dependencies with `package-lock.json`.
- **Audit**: `npm audit --production`, GitHub Dependabot, Snyk.
- **Subresource integrity** for CDN-loaded scripts.
- **Lockfile linting** (`lockfile-lint`) — ensure registry, exact versions.
- **Provenance** (`npm publish --provenance` since npm 9) for first-party packages.
- **Scoped registries** for internal packages — keep them off the public registry.

Recent incidents (event-stream, ua-parser-js, colors): malicious patches to deeply-buried deps. Lockfiles + audit + minimal deps reduce surface area.

---

## 8. Performance Forensics

---

### Q27. Find the slow path in a production service.

1. **Metrics**: p50/p99 latency by endpoint. Tail-latency tells the story.
2. **Tracing**: OpenTelemetry — identify the slow span (DB call, downstream API, deserialization).
3. **CPU profile**: `--cpu-prof` flag, open in Chrome → flamegraph.
4. **Event loop lag**: `monitorEventLoopDelay`. > 200 ms hints at sync work.
5. **Heap snapshots**: rising memory + GC pauses.
6. **OS-level**: `top`, `iotop`, `vmstat` — is it CPU, IO, or scheduling?

Don't optimize without profiling. The bottleneck is usually NOT what you guessed.

---

### Q28. Common Node performance footguns.

- `JSON.parse` / `JSON.stringify` on huge payloads.
- `bcrypt` with sync API on the main thread.
- `console.log` to stdout in hot loops (synchronous writes!).
- Regex with catastrophic backtracking (run untrusted input through `safe-regex`).
- Unbounded `Buffer.concat` in stream handlers.
- `process.env` reads in hot paths (slow on some Node versions).
- Forgetting to `.unref()` debug timers — keeps process alive in dev.

---

### Q29. Why is your service eating one core entirely?

Most likely: a synchronous loop or a CPU-bound JSON.parse / decryption / regex. Node uses one main thread for JS — once it's pegged, throughput stops.

Mitigations:
- Move CPU work to worker threads.
- Batch + queue.
- Pre-compute outside the request path.
- Use streaming serialization for huge payloads (`fast-json-stringify`, schema-based).

---

## 9. Operational

---

### Q30. Docker container best practices for Node.

```dockerfile
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:24-alpine AS runtime
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
USER node
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
```

Pin the **major** version (24-alpine). Multi-stage build keeps image small. Run as `node` user. Don't use `npm start` as entrypoint — it adds a npm process layer that doesn't forward signals well (use `node` directly).

---

### Q31. Healthchecks — liveness vs readiness.

- **Liveness**: am I deadlocked? If failing → restart pod.
- **Readiness**: am I ready to serve traffic? If failing → remove from load balancer.

```js
app.get('/livez', (req, res) => res.send('ok')); // cheap
app.get('/readyz', async (req, res) => {
  try {
    await db.ping();
    await cache.ping();
    res.send('ok');
  } catch { res.status(503).send('not ready'); }
});
```

Don't put expensive checks on `/livez` — flapping kills uptime.

---

### Q32. When to use a process manager (PM2, systemd, supervisord)?

- **Kubernetes / ECS**: don't. The orchestrator handles restarts.
- **Bare metal / VM single host**: a manager (PM2, systemd) for auto-restart on crash, log shipping, multi-instance fork.
- **Local dev**: `nodemon` / `node --watch` for restart on file change.

`cluster` was once king; today the orchestrator-or-PM2 + `worker_threads` for CPU is the modern split.

---

## 10. Misc — Senior Edge

---

### Q33. Cluster vs reverse proxy load balancing.

Cluster (`cluster.fork`) shares one listening port across workers, OS distributes connections.

Reverse proxy (NGINX, ALB) terminates externally, forwards to workers on different ports.

Pros of cluster: simple, no extra infra.
Cons: hard to do canary, no graceful drain across workers, limited routing logic.

Most modern setups: container orchestrator + single-worker Node + L7 proxy.

---

### Q34. Worker thread tuning.

Default thread pool size: 4 (libuv).

```bash
UV_THREADPOOL_SIZE=16 node server.js
```

Pool is used for: fs, DNS, some crypto, async_hooks dispatch. Bumping helps if you saturate the pool (lots of file I/O or DNS).

For pure JS CPU work, use `worker_threads` + a pool library (Piscina). Don't conflate UV_THREADPOOL_SIZE with worker thread count.

---

### Q35. Hot reload in production?

Don't. Hot-reload introduces stale module state, ghost references, leaks.

For zero-downtime: replace processes (rolling deploy). For dev: `node --watch` reloads cleanly.

Exception: feature flags + dynamic config (LaunchDarkly, ConfigCat) for runtime behavior toggles — that's data reload, not code.

---

## Final Senior Tips

1. **Know the event loop phases by name** and what runs in each.
2. **Always discuss backpressure** when streams come up — it's the difference between a senior and a junior answer.
3. **Use AsyncLocalStorage** for context — it's the modern standard.
4. **Native APIs (fetch, test, TS, permission)** are stable — drop legacy deps.
5. **Performance issues are measured, not guessed** — bring up tracing/profiling tools.
