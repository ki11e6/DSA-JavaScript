# Node.js — Easy Interview Questions

> **Audience**: Junior / fresher / phone-screen rounds.
> **Goal**: Show solid grasp of runtime basics, modules, async I/O, fs, http, npm, environment.
> Verified against [nodejs.org](https://nodejs.org) (Node.js 26 Current / 24 Active LTS, May 2026).

---

## 1. Getting Started

---

### Q1. What is Node.js? Is it a language?

No — Node.js is a **runtime**. The language is JavaScript. Node provides a JS engine (V8) plus a standard library (fs, http, crypto, etc.) plus a module system (CJS + ESM) plus a package manager (npm).

---

### Q2. How is Node.js different from a browser?

| Aspect           | Browser                          | Node.js                              |
| ---------------- | -------------------------------- | ------------------------------------ |
| Global object    | `window`                         | `global` (or `globalThis`)           |
| DOM              | ✅                              | ❌                                   |
| File system      | ❌                               | ✅ (`node:fs`)                       |
| Modules          | ESM only                         | CJS + ESM                            |
| Networking       | `fetch`, `WebSocket`             | `node:http`, `fetch`, sockets, more  |
| Permissions      | Sandboxed                        | Full process by default              |

Both share JavaScript syntax and `fetch`/`WebSocket` APIs.

---

### Q3. Check your Node version.

```bash
node -v
# v26.x.x
```

Use **nvm** (`nvm install --lts && nvm use --lts`) or **fnm** to switch between versions.

---

## 2. Modules

---

### Q4. Import a module.

**ESM (recommended)**:
```js
import fs from 'node:fs/promises';
const data = await fs.readFile('./hello.txt', 'utf8');
```

**CommonJS**:
```js
const fs = require('node:fs').promises;
const data = await fs.readFile('./hello.txt', 'utf8');
```

The `node:` prefix is best practice — explicit, can't be shadowed by a malicious npm package.

---

### Q5. What does `package.json` "type" do?

- `"type": "module"` → `.js` files are ESM.
- `"type": "commonjs"` (or absent) → `.js` files are CJS.

You can force the other with explicit extensions: `.mjs` (always ESM), `.cjs` (always CJS).

---

### Q6. How do you export from a module?

**ESM**:
```js
// utils.js
export function add(a, b) { return a + b; }
export default function main() {}

// usage
import main, { add } from './utils.js';
```

**CJS**:
```js
function add(a, b) { return a + b; }
module.exports = { add };

// usage
const { add } = require('./utils');
```

---

## 3. Async Basics

---

### Q7. Read a file asynchronously.

```js
import fs from 'node:fs/promises';

const data = await fs.readFile('./hello.txt', 'utf8');
console.log(data);
```

Don't use `readFileSync` in production — it blocks the event loop.

---

### Q8. Write a file.

```js
import fs from 'node:fs/promises';

await fs.writeFile('./out.txt', 'Hello\n', 'utf8');
await fs.appendFile('./out.txt', 'World\n', 'utf8');
```

---

### Q9. Read a JSON config.

```js
import fs from 'node:fs/promises';
const cfg = JSON.parse(await fs.readFile('./config.json', 'utf8'));
```

In Node 22+ you can also `import config from './config.json' with { type: 'json' };` (still experimental — flag may be required).

---

### Q10. `setTimeout` and `setInterval`.

```js
const t = setTimeout(() => console.log('once'), 1000);
clearTimeout(t);

const i = setInterval(() => console.log('every'), 1000);
clearInterval(i);
```

`setImmediate(fn)` is Node-specific — runs in the `check` phase, after I/O callbacks.

---

### Q11. Difference between callback, Promise, async/await.

```js
// Callback
fs.readFile('a.txt', (err, data) => {});

// Promise
fs.promises.readFile('a.txt').then(data => {}).catch(err => {});

// async/await
const data = await fs.promises.readFile('a.txt');
```

All three describe the same thing. Modern code uses async/await almost exclusively.

---

## 4. HTTP

---

### Q12. Create a simple HTTP server.

```js
import http from 'node:http';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('Hello, World!\n');
});

server.listen(3000, () => console.log('http://localhost:3000'));
```

---

### Q13. Make an HTTP request.

```js
const res = await fetch('https://api.github.com/users/octocat');
const user = await res.json();
console.log(user.name);
```

`fetch` is built-in since Node 21 (no need for `node-fetch` or `axios`).

---

### Q14. Send JSON in a response.

```js
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
});
```

---

## 5. Environment & Args

---

### Q15. Read env variables.

```js
const port = process.env.PORT || 3000;
const url = process.env.DATABASE_URL;
```

Run with:
```bash
PORT=8080 node server.js
```

Load from a file (built-in since Node 20):
```bash
node --env-file=.env server.js
```

No `dotenv` dependency needed.

---

### Q16. Read command-line args.

```js
// node script.js hello world
console.log(process.argv);
// ['/path/to/node', '/path/to/script.js', 'hello', 'world']

const args = process.argv.slice(2);
console.log(args); // ['hello', 'world']
```

For real CLI tools, use a parser: `node:util.parseArgs` (built-in), or libraries like `commander`, `yargs`.

---

### Q17. Parse arguments with `node:util.parseArgs`.

```js
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    port: { type: 'string', short: 'p', default: '3000' },
    quiet: { type: 'boolean', short: 'q', default: false }
  }
});

console.log(values); // { port: '3000', quiet: false }
```

---

## 6. npm Basics

---

### Q18. Install a package.

```bash
npm install express          # regular dep
npm install -D vitest        # dev dep
npm install -g typescript    # global
npm ci                       # CI install (uses lockfile exactly)
```

---

### Q19. What's in `package.json`?

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "test": "node --test"
  },
  "dependencies": { "express": "^4.19.0" },
  "devDependencies": { "vitest": "^1.0.0" }
}
```

---

### Q20. Run a script.

```bash
npm run dev     # runs "scripts.dev"
npm test        # alias for "scripts.test"
npm start       # alias for "scripts.start"
```

You can also use `node --run dev` (built-in script runner since Node 22) — skips npm overhead.

---

## 7. The Event Loop (Surface Level)

---

### Q21. Why is Node "non-blocking"?

It uses async I/O instead of blocking the thread. When you call `fs.readFile`, Node submits the read to libuv's thread pool and continues. When done, libuv puts your callback on the event loop.

Result: a single thread can handle thousands of concurrent connections.

---

### Q22. Why does this print `B A`?

```js
setTimeout(() => console.log('A'), 0);
console.log('B');
// Output: B then A
```

`console.log('B')` is synchronous — runs first. `setTimeout` schedules the callback for the next `timers` phase — runs only after current synchronous code completes.

---

### Q23. `process.nextTick` vs `Promise.then` vs `setTimeout(0)`.

```js
setTimeout(() => console.log('timeout'), 0);
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('promise'));
console.log('sync');
```

Output:
```
sync
nextTick
promise
timeout
```

- Sync first.
- `nextTick` queue drains next (Node-specific priority).
- Microtask queue (Promises) drains.
- Event loop phases — `timers` etc.

---

## 8. Common Tasks

---

### Q24. List files in a directory.

```js
import fs from 'node:fs/promises';
const files = await fs.readdir('./');
console.log(files);
```

Recursively:
```js
const files = await fs.readdir('./', { recursive: true });
```

---

### Q25. Check if a file exists.

```js
try {
  await fs.access('./file.txt');
  console.log('exists');
} catch {
  console.log('missing');
}
```

Don't use the older `fs.exists` — deprecated for race-condition reasons.

---

### Q26. Read stdin / write stdout.

```js
process.stdout.write('Hello\n');
process.stderr.write('Error\n');

let chunks = '';
for await (const chunk of process.stdin) chunks += chunk;
console.log('got:', chunks);
```

---

### Q27. Run a child process.

```js
import { spawn } from 'node:child_process';

const ls = spawn('ls', ['-la']);
ls.stdout.on('data', (data) => console.log(data.toString()));
ls.on('close', (code) => console.log('exit', code));
```

For simple one-shot commands: `node:child_process.exec` or `execFile` (with callbacks/promises).

---

## 9. Crypto

---

### Q28. Hash a password (don't store plain SHA).

```js
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `${salt.toString('hex')}:${key.toString('hex')}`;
}

async function verify(password, hash) {
  const [salt, key] = hash.split(':');
  const newKey = await scryptAsync(password, Buffer.from(salt, 'hex'), 64);
  return timingSafeEqual(Buffer.from(key, 'hex'), newKey);
}
```

In production, prefer **argon2** or **bcrypt** via a library — they're memory-hard.

---

### Q29. Generate a random ID.

```js
import { randomUUID } from 'node:crypto';
const id = randomUUID(); // v4 UUID
```

Or `crypto.randomBytes(16).toString('hex')` for a 32-char hex string.

---

## 10. Common Mistakes

---

### Q30. Why is `forEach` not running my async function properly?

```js
[1,2,3].forEach(async (n) => {
  await save(n); // fire-and-forget — forEach doesn't await
});
console.log('done'); // logged before saves finish
```

Fix:
```js
for (const n of [1,2,3]) {
  await save(n);
}

// Or parallel:
await Promise.all([1,2,3].map(save));
```

`Array.forEach` ignores returned Promises. Use `for..of` for sequential or `Promise.all(map(...))` for parallel.

---

### Q31. Why does this crash with "MaxListenersExceededWarning"?

```js
for (let i = 0; i < 20; i++) emitter.on('event', handler);
```

Each `EventEmitter` has a soft limit of 10 listeners. Either:
- Avoid attaching duplicate handlers.
- Increase limit: `emitter.setMaxListeners(50)`.
- Detach when done: `emitter.off('event', handler)`.

---

### Q32. Why is my server slow under load?

Common culprits (in order):
1. **Synchronous code in a request handler** — JSON.parse on huge bodies, sync crypto, big loops.
2. **Database without indexes** — your slow query is the bottleneck.
3. **Memory pressure** — heap fills, GC pauses lengthen.
4. **DNS lookups** — every request resolving hostnames.
5. **Logging** — synchronous `console.log` to stdout in tight loops.

Measure first with Chrome DevTools (`--inspect`) or clinic.js.

---

### Q33. Why doesn't my `require` work in an ESM file?

`require` is CJS-only. In ESM use `import` or:

```js
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const data = require('./data.json');
```

---

### Q34. How do I run TypeScript directly?

**Node 24.12+**: native, no flag needed for plain TypeScript:
```bash
node script.ts
```

`tsconfig.json` is ignored — Node only strips types. For enums/namespaces add `--experimental-transform-types`.

For projects with path aliases, decorators, or JSX: use `tsx` or build with `tsc`/`swc`.

---

### Q35. How do I debug a Node program?

```bash
node --inspect-brk script.js
```

Then open `chrome://inspect` in Chrome — full DevTools (breakpoints, profiler, memory).

VS Code has a built-in Node debugger — F5 to launch.
