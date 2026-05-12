# React — Hard Interview Questions

> **Audience**: Senior / staff / architect rounds.
> **Goal**: Show deep understanding of fiber, concurrent rendering, RSC, hydration, Suspense semantics, performance forensics, advanced patterns.
> Verified against [react.dev](https://react.dev) (React 19.2, May 2026).

---

## 1. Fiber & Reconciliation Internals

---

### Q1. Walk me through React Fiber.

**Fiber** is a re-implementation of React's reconciliation algorithm (since React 16) that turns rendering into a sequence of *interruptible units of work*.

Key concepts:
- **FiberNode**: a JS object representing a React element. Has `child`, `sibling`, `return` (parent) pointers — forming a **linked tree**, not a regular tree.
- **Two trees**: `current` (committed to DOM) and `workInProgress` (being built). Double-buffered.
- **Two phases**:
  - **Render** (a.k.a. reconciliation) — pure, interruptible. Builds `workInProgress`.
  - **Commit** — synchronous, atomic. Applies DOM mutations and fires lifecycles/effects.

Each unit of work corresponds to one fiber. After each unit, the scheduler can check the clock and yield to the browser if needed (concurrent mode).

---

### Q2. What is the difference between rendering and committing?

| Phase   | What happens                                          | Synchronous? | Side effects |
| ------- | ----------------------------------------------------- | ------------ | ------------ |
| Render  | Call function components, build work-in-progress tree | No (interruptible) | None — must be pure |
| Commit  | Apply DOM mutations, run refs, run layout effects     | Yes          | All DOM writes here |
| Passive (Effects) | `useEffect` callbacks fire after paint     | Async        | "Side effects after the user sees the frame" |

**Why this split matters**: Render can be thrown away and re-tried (concurrent rendering). So render must be pure — any side effects there cause bugs when React re-renders the same component multiple times.

---

### Q3. How does React decide what to re-render?

For each fiber, React compares the new element to the current one:
- **Different type** → unmount old subtree, mount new.
- **Same type** → keep the fiber, update props, re-render the function (or call lifecycle methods on a class).
- **Lists** → match by `key`.

Then it recurses into children. Memoization (`React.memo`, `useMemo`) is just an early-exit at the comparison step.

---

### Q4. What is bailout?

If React enters a fiber and determines its inputs (props, context, state) are unchanged, it can **skip** re-rendering that fiber **and its descendants**. This is the optimization `React.memo` and `useMemo` lean on.

Bailouts don't happen automatically — they require shallow-equality of props (memo) and unchanged context/state.

---

## 2. Concurrent Rendering

---

### Q5. What guarantees does concurrent rendering give?

- **Interruptibility**: high-priority updates (typing, clicks) can preempt low-priority renders (filtering a big list).
- **Tearing-free reads**: React 18 introduced `useSyncExternalStore` so external stores stay consistent across concurrent renders.
- **Suspense for SSR**: stream HTML chunks, hydrate progressively.

Note: concurrent rendering is *opt-in* via `createRoot` + APIs like `useTransition`. Using `createRoot` alone gives automatic batching and the **possibility** of concurrent rendering — actual concurrency is triggered by transitions.

---

### Q6. `useTransition` vs `useDeferredValue` — when to choose each?

| Aspect        | `useTransition`                     | `useDeferredValue`                       |
| ------------- | ----------------------------------- | ---------------------------------------- |
| Control point | You wrap the **state update**       | You wrap the **value**                   |
| Best for      | Updates *you own* (state setters)   | Props *passed from parents*              |
| Returns       | `[isPending, startTransition]`      | A deferred copy of the value             |
| Multi-update  | Same transition wraps several setters | Each value is independently deferred   |

Both yield the same UX: keep the fast interaction responsive, defer the heavy work.

---

### Q7. Will React block the main thread for a transition?

A transition that takes longer than the budget (currently ~5 ms per slice) will yield to the browser, allow paint/input handling, and resume later. The actual JS work still happens on the main thread — React just chops it up.

For genuinely CPU-bound work (parsing, image processing), move it to a Web Worker.

---

## 3. Suspense Semantics

---

### Q8. What can suspend? What can't?

**Suspends**:
- `React.lazy` components while loading.
- `use(promise)` until the promise resolves.
- Components inside frameworks that integrate with Suspense (Relay, TanStack Query v5 with `suspense: true`, Next.js App Router, RSC).

**Doesn't suspend**:
- Plain `fetch().then(setState)` — that's just state.
- `await` outside `use()` in a Server Component (which is a different concept — server components are async).

---

### Q9. What happens when multiple components in the same boundary suspend?

The nearest `<Suspense>` parent shows its `fallback`. React waits for **all** suspended children to be ready, then commits the whole subtree at once.

This avoids "loading flicker" where one child resolves but its siblings are still pending.

---

### Q10. Suspense + transitions — how do they interact?

Without a transition, suspending a route navigation flashes the fallback.

With `startTransition`:
- React keeps the *old* UI visible until the new tree is ready.
- The transition reports `isPending=true` for spinner-like UX.
- The fallback only shows for **new** Suspense boundaries that didn't exist before.

This is the foundation of nice route transitions in Next.js App Router.

---

## 4. Server Components & Streaming

---

### Q11. Explain Server Components.

Server Components (RSC) render on the server and produce a **JSX-like serialized payload** (not HTML) that the client React reconciles.

Properties:
- Run only on the server. Can hit the database, read files, use secrets.
- Send **zero JS** for themselves to the client.
- Interleave with Client Components — the boundary is `'use client'`.
- Cannot use state, refs, effects, browser APIs, or event handlers.
- Can pass serializable props (string, number, array, plain object, Date, promises) but **not functions** (except Server Actions).

---

### Q12. How does streaming SSR work?

The server uses `renderToReadableStream` / `renderToPipeableStream` (or framework wrappers) to:
1. Send HTML for everything that's ready.
2. Show `<Suspense>` fallbacks for what isn't.
3. Stream chunks as data becomes ready, with `<script>` snippets that swap the fallback for the real HTML.

This decouples **time to first byte** from **time to complete data**. Critical paths render fast; slow widgets stream in.

---

### Q13. What's the difference between SSR and RSC?

| Aspect              | SSR                               | RSC                                |
| ------------------- | --------------------------------- | ---------------------------------- |
| Output              | HTML                              | Serialized JSX (RSC payload)       |
| Hydration needed?   | Yes — client re-runs the tree     | No re-run on client                |
| JS bundle impact    | Component code shipped to client  | Server Components NOT shipped      |
| Composition         | Hydrates whole client app         | Server & Client Components interleave |

Many setups combine both: stream HTML for initial paint + serialize the RSC tree for client navigation/hydration.

---

### Q14. Server Actions — under the hood?

`'use server'` marks a function callable from the client. The bundler:
1. Replaces the body with a stub that POSTs to the server.
2. Emits an action handler on the server that re-imports and runs the real function.
3. Wires up serialization (FormData / JSON), revalidation, and the response handoff.

Server Actions get progressive enhancement (work without JS) and integrate with `useFormStatus`, `useActionState`, `useOptimistic`.

---

## 5. Hydration

---

### Q15. What is a hydration mismatch?

Server-rendered HTML differs from client first render. Causes:
- `Date.now()`, `Math.random()`, `new Date()` without seeding.
- Reading `localStorage`, `window.matchMedia`, `navigator` during render.
- Locale-dependent formatting.
- Time-zone-dependent rendering.

Symptoms: warning in console, React **discards** the mismatched subtree and re-renders on the client.

Fixes:
- Move the dynamic piece into `useEffect` (after hydration).
- Use frameworks' `'use client'` boundary so the server doesn't render it at all.
- Pass deterministic seeds from server.

---

### Q16. Selective hydration — what is it?

Since React 18, hydration is **incremental**:
- React hydrates whatever is in the user's viewport / under their cursor first.
- Suspense boundaries hydrate independently and in parallel.
- A user click on an unhydrated component causes React to hydrate that subtree first.

You don't usually code for this — it falls out of using `hydrateRoot` + Suspense correctly.

---

## 6. Patterns & Architecture

---

### Q17. State colocation vs lifting — when do you do which?

**Colocation**: keep state in the smallest component that uses it. Default. Saves re-renders.

**Lifting up**: move state to the lowest common ancestor of *multiple* consumers.

**Global**: only for genuinely app-wide values (auth, theme, feature flags) — and even then, context per concern, not one giant store.

Anti-pattern: putting everything in Redux because "what if we need it everywhere later".

---

### Q18. Compound components.

```jsx
<Tabs defaultValue="overview">
  <Tabs.List>
    <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
    <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="overview">...</Tabs.Content>
  <Tabs.Content value="settings">...</Tabs.Content>
</Tabs>
```

The parent provides context; children consume it. Gives a declarative API without prop drilling configuration.

Pattern used by Radix UI, Headless UI, and most modern primitives libraries.

---

### Q19. Controlled vs uncontrolled — how do you support both?

```jsx
function Toggle({ value: valueProp, defaultValue, onChange }) {
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueProp : internal;

  function update(v) {
    if (!isControlled) setInternal(v);
    onChange?.(v);
  }
  return <button onClick={() => update(!value)}>{value ? 'on' : 'off'}</button>;
}
```

Lets callers either:
- Pass `value` + `onChange` for full control.
- Pass `defaultValue` and let the component manage state.

---

### Q20. Slots pattern with `children`.

Pass arbitrary JSX as a slot:

```jsx
<Card
  header={<h1>Title</h1>}
  footer={<Actions />}
>
  Body
</Card>
```

The component decides where each slot lands. Simpler than render props for static structure.

---

## 7. Performance Forensics

---

### Q21. How do you profile a slow React app?

1. **Chrome Performance tab** with React Profiler + React DevTools Profiler.
2. Look for:
   - Long render durations on specific components (the "flamegraph").
   - Frequent re-renders of large subtrees.
   - Long tasks (>50 ms) blocking input.
3. Common culprits:
   - Unstable callback/object props bypassing `React.memo`.
   - Context value identity changing every render.
   - Big synchronous lists without virtualization.
   - Expensive `useMemo`/`useCallback` deps that change every render (defeating the purpose).
4. With React 19.2, **Chrome DevTools Performance Tracks** include native React lanes — easier to read.

---

### Q22. React Compiler — should you adopt it?

Stable since **React Compiler 1.0 (Oct 7, 2025)**. It auto-memoizes:
- Component renders (acts like `React.memo` for all).
- Computations (acts like `useMemo` everywhere needed).
- Callbacks (acts like `useCallback`).

Recommendations from the React team:
- **New code**: enable it; remove manual memoization in most cases (keep it for stable effect deps).
- **Existing code**: enable, but leave existing memoization in place until you test; removing it can change generated output.

Doesn't fix algorithmic problems — you still need virtualization for huge lists, etc.

---

### Q23. Why is a re-render "free"?

It's not — but the cost is usually:
- Calling a few function bodies.
- Diffing fiber trees.

That's typically sub-millisecond per component. The actual DOM update is what's expensive, and React only does that if reconciliation finds differences.

**Lesson**: don't memoize prophylactically. Render → measure → memoize. Most React perf problems are over-rendering tens of thousands of items at once, not the call cost of a single component.

---

## 8. Tricky Hooks

---

### Q24. Stale closure in `useEffect` — example & fix.

```jsx
function Timer() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount(count + 1), 1000); // 🚫 stale
    return () => clearInterval(id);
  }, []); // mount once
}
```

`count` is captured at mount = 0. The setter always sets `0 + 1`. Fixes:

```jsx
setCount(c => c + 1); // functional updater (preferred)
// or
useEffect(() => { ... }, [count]); // re-arm with fresh closure (kills the interval)
// or React 19.2:
const tick = useEffectEvent(() => setCount(count + 1));
useEffect(() => { const id = setInterval(tick, 1000); return () => clearInterval(id); }, []);
```

---

### Q25. Why doesn't React warn me when I do `useState` with a non-deterministic initial value?

```jsx
const [id] = useState(Math.random()); // captured ONCE, but expression evaluated EVERY render
```

The expression evaluates every render — wasting work and sometimes confusing readers — but the *value* is stored only on the first render. To prevent the wasted evaluation, use lazy initializer:

```jsx
const [id] = useState(() => Math.random());
```

---

### Q26. Why is `useLayoutEffect` warned against on the server?

`useLayoutEffect` is synchronous and depends on DOM measurements. On the server there is no DOM, so React warns it can't run. Workarounds:
- Conditional: `const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;`
- Move the logic to a Client Component only.

---

## 9. Edge Cases / Gotchas

---

### Q27. What does `key` on a non-list element do?

Forces React to **unmount and remount** the subtree when the key changes — useful for resetting state.

```jsx
<Form key={userId} userId={userId} />
```

Each `userId` change creates a fresh `<Form>` instance — local state resets.

---

### Q28. `useId` — why and when?

Generates a unique, stable ID for a component instance. Critical for accessibility (linking `<label htmlFor>` with `<input id>`) when the same component renders multiple times.

```jsx
function NamedInput({ label }) {
  const id = useId();
  return <><label htmlFor={id}>{label}</label><input id={id} /></>;
}
```

Note: React 19.2 changed the default prefix from `:r0:` to `_r_` for CSS selector compatibility.

---

### Q29. How do you cancel a fetch on prop change?

```jsx
useEffect(() => {
  const ac = new AbortController();
  fetch(url, { signal: ac.signal })
    .then(/* ... */)
    .catch(e => { if (e.name !== 'AbortError') throw e; });
  return () => ac.abort();
}, [url]);
```

The cleanup function fires when `url` changes (or on unmount). The abort makes the obsolete fetch reject with `AbortError` — guard against it.

---

### Q30. `flushSync` — when?

Forces a state update to commit synchronously (skipping batching). Use case: read a DOM measurement *after* a state change and *before* the browser paints.

```jsx
flushSync(() => setOpen(true));
const height = panelRef.current.offsetHeight; // accurate post-state height
```

Caveat: blocks paint. Use sparingly.

---

## 10. Architecture Trade-offs (Senior)

---

### Q31. Why might you choose RSC over a SPA?

Pros:
- Smaller client bundles — big component trees ship zero client JS.
- Direct DB access without an API layer.
- Server-side data fetching, no waterfalls.
- Automatic code splitting at component granularity.
- SEO + fast TTFB.

Cons:
- Tied to a framework (Next.js App Router today; ecosystem growing).
- Mental model shift — runtime boundaries between server/client.
- Some libraries don't yet support RSC (anything that uses hooks at the top level needs `'use client'`).

---

### Q32. When would you reach for Redux / Zustand vs Context?

| Need                                       | Tool                          |
| ------------------------------------------ | ----------------------------- |
| Theme, auth, locale (low-frequency)        | Context                       |
| Multi-component shared mutable state       | Zustand / Jotai               |
| Time-travel debugging, middleware ecosystem | Redux Toolkit                |
| Local form state                           | `useState` / `useReducer`     |
| Server state (caching, retries, polling)   | TanStack Query / SWR / RSC    |

Context's biggest weakness: every consumer re-renders on value change. State libraries (Zustand, Jotai) use selectors to avoid this.

---

### Q33. How do you handle real-time data (websockets) in React?

```jsx
function useSocket(url) {
  const [data, setData] = useState(null);
  useEffect(() => {
    const ws = new WebSocket(url);
    ws.onmessage = (e) => setData(JSON.parse(e.data));
    return () => ws.close();
  }, [url]);
  return data;
}
```

Production additions:
- Batch updates: collect messages in a ref, flush every animation frame to avoid 1000s of renders/sec.
- Heartbeats + reconnect with backoff.
- Move the connection to a context if multiple components need it.
- Consider TanStack Query subscriptions or `useSyncExternalStore` for tearing-free reads.

---

### Q34. CSP, XSS, dangerouslySetInnerHTML — security.

```jsx
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

Never pass un-sanitized user input. Sanitize with DOMPurify, or render structured data instead. CSP headers should disallow inline scripts / eval.

React escapes strings automatically — `{userInput}` is safe.

---

### Q35. SSR with React 19 — what changed?

- `renderToPipeableStream` / `renderToReadableStream` are the modern entry points.
- Suspense for SSR + selective hydration since 18.
- React 19 added stylesheet hoisting + precedence — multiple Server Components can declare `<link rel="stylesheet">` and React de-duplicates and orders them.
- React 19.2 added Partial Pre-rendering APIs (`prerender`/`resume`/`resumeAndPrerender`) for hybrid SSG + SSR.

---

## Final Senior Tips

1. **Always say which phase** (render / commit / passive) the thing you're describing happens in.
2. **Never claim "React is fast"** — describe the tradeoff: VDOM diff cost vs DOM update cost.
3. **Reach for Compiler**, not manual memoization, in new code.
4. **Treat effects as last-resort synchronization** — most "lifecycle" code belongs in event handlers, RSC fetches, or external stores.
5. **Push state to URL / server** when shareability or persistence matters.
