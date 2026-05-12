# React — Theoretical / Conceptual Interview Questions

> **Audience**: All levels.
> **Goal**: Show deep understanding of React's mental model — rendering, reconciliation, hooks rules, fiber, concurrent mode.
> **Format**: Question → short crisp answer → deeper "explain like a senior" detail → follow-ups.

---

## 1. Fundamentals

---

### Q1. What is React?

**Short**: A declarative, component-based JavaScript library for building UIs by describing what the UI should look like for a given state.

**Deeper**:
- **Declarative**: You describe *what* the UI is, not *how* to mutate the DOM. React diffs and applies.
- **Component-based**: UI = composition of pure functions of props/state.
- **Unidirectional data flow**: Data flows down via props; events flow up via callbacks.
- **Virtual DOM (legacy)** / **Fiber tree (current)**: An in-memory representation React diffs against the previous tree.
- Released by Facebook 2013, OSS under MIT.

---

### Q2. JSX — what is it?

**Short**: Syntactic sugar over `React.createElement(type, props, ...children)`.

```jsx
<button onClick={handle}>Save</button>
// compiles to
React.createElement('button', { onClick: handle }, 'Save')
// → returns { type: 'button', props: { onClick, children: 'Save' }, ... }
```

JSX:
- Is **not** HTML — it's expressions returning React elements (plain JS objects).
- Uses camelCase props (`onClick`, `className`, `htmlFor`).
- Allows JS interpolation inside `{}`.
- Must have a single root (or `<></>` fragment).

Modern transpilers (Babel, SWC) use the **automatic JSX runtime** since React 17 — no more `import React from 'react'` for JSX-only files.

---

### Q3. Virtual DOM vs Real DOM

**Virtual DOM**: a lightweight JS object tree representing the desired UI.

**Why bother**:
- Direct DOM mutation is slow because of reflow/repaint.
- Diffing two JS object trees is fast.
- React batches DOM changes after reconciling the diff.

**Common interview trap**: "VDOM is faster than real DOM." That's wrong. VDOM is **never** faster than the optimal hand-tuned DOM update. It is *fast enough* and *easy to reason about*.

---

### Q4. Components — function vs class

| Aspect                   | Function Components                  | Class Components            |
| ------------------------ | ------------------------------------ | --------------------------- |
| State                    | `useState`, `useReducer`             | `this.state`, `setState`    |
| Lifecycle                | `useEffect`, `useLayoutEffect`       | `componentDidMount`, etc.   |
| Code size                | Smaller                              | Larger                      |
| `this` binding gotchas   | None                                 | Famous problem              |
| Modern React features    | Hooks, Suspense, Server Components   | Limited / legacy            |

**Modern recommendation**: write function components. Classes are legacy.

---

### Q5. Props vs State

| Concept | Props                                | State                        |
| ------- | ------------------------------------ | ---------------------------- |
| Source  | Passed from parent                   | Owned by component           |
| Mutable | Read-only inside the component       | Mutated via setter / reducer |
| Triggers re-render | When the parent re-renders | When setter is called        |
| Use     | Configuration                        | Local interactive data       |

**Key**: never mutate props or state directly. `setState` (or `set...` hook) is the only way.

---

### Q6. Why does React need `key` in lists?

**Short**: Keys let React match elements between renders so it can update the right DOM nodes instead of recreating them.

**Without keys**, React diffs by **index**, which breaks for reorders/insertions:

```jsx
// Bad — reordering kills component state
{items.map((item, i) => <Row key={i} data={item} />)}

// Good — identity tied to data
{items.map((item) => <Row key={item.id} data={item} />)}
```

**Rules**:
- Keys must be **stable**, **unique** among siblings, **predictable**.
- Don't use `Math.random()` — breaks reuse.
- Index keys are acceptable only for **static** lists that never reorder.

---

### Q7. Controlled vs Uncontrolled components

```jsx
// Controlled — React owns the state
<input value={text} onChange={(e) => setText(e.target.value)} />

// Uncontrolled — DOM owns the state
<input defaultValue="hi" ref={inputRef} />
```

| Aspect           | Controlled                  | Uncontrolled        |
| ---------------- | --------------------------- | ------------------- |
| Source of truth  | React state                 | The DOM             |
| Validation       | Real-time                   | On submit (via ref) |
| Form integration | Easier                      | Less code           |
| Performance      | More re-renders on each key | Lighter             |

For complex forms, use libraries (React Hook Form, Formik) — they use uncontrolled inputs + refs under the hood for performance.

---

## 2. Hooks

---

### Q8. What are the rules of hooks?

1. **Only call hooks at the top level** — not inside loops, conditions, or nested functions.
2. **Only call from React function components or custom hooks** (not regular JS functions).

**Why**: React identifies hooks by **call order**, not by name. If a `useState` is conditionally skipped on render 2, the next hook gets the wrong slot.

```jsx
// 🚫 BROKEN — different call order on different renders
if (condition) {
  const [a, setA] = useState(0);
}
const [b, setB] = useState(0); // sometimes slot 0, sometimes slot 1
```

`eslint-plugin-react-hooks` enforces these.

---

### Q9. `useState` — what does it actually do?

Returns `[value, setter]`. The setter triggers a re-render and the new value is read on the next render.

**Functional update form** (for state derived from previous):

```jsx
setCount(c => c + 1); // safe under batching
```

**Lazy initial state** — only runs once:

```jsx
const [tree] = useState(() => buildExpensiveTree());
```

**Gotcha — stale closure**:

```jsx
const handle = () => setCount(count + 1); // captures stale `count`
// vs
const handle = () => setCount(c => c + 1); // always fresh
```

---

### Q10. `useEffect` — what is its mental model?

> "After every commit where my deps changed, run this side effect. Optionally clean up before the next run and on unmount."

```jsx
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id); // cleanup
}, [tick]);
```

**Order**:
1. React renders + commits to DOM.
2. The browser paints.
3. Effect runs.

**Dep arrays**:
- `undefined` → runs after every render.
- `[]` → runs once on mount, cleanup on unmount.
- `[a, b]` → runs when `a` or `b` changes (Object.is comparison).

**Effects are not lifecycle hooks**. Don't think "componentDidMount" — think "synchronize with X".

---

### Q11. `useLayoutEffect` vs `useEffect`

- **useEffect**: fires *after* paint (async). Won't block visual updates.
- **useLayoutEffect**: fires *before* paint (sync). Blocks paint until done.

Use `useLayoutEffect` only when you must measure or mutate DOM before the user sees the result (tooltip positioning, scroll restoration). Otherwise default to `useEffect`.

---

### Q12. `useMemo` vs `useCallback` — what and when?

- `useMemo(() => compute(a, b), [a, b])` — caches a **value**.
- `useCallback(fn, [a, b])` — caches a **function reference** (`useMemo` for functions).

**When to use**:
- Memoizing **expensive** computations.
- Stable references for **memoized children** (`React.memo`).
- Stable references in **effect deps**.

**Common abuse**: wrapping everything in `useMemo` "for performance". Most computations are cheap — the memo bookkeeping itself costs cycles. Profile first.

---

### Q13. `useRef` — what is it for?

A mutable container that **persists across renders but doesn't trigger re-renders**.

Uses:
1. **DOM refs**: `<div ref={ref} />` → `ref.current` is the DOM node.
2. **Instance variables**: previous-value tracking, timer IDs, latest closures.

```jsx
const prev = useRef();
useEffect(() => { prev.current = value; });
```

Important: mutating `ref.current` is **not reactive**. The UI won't update.

---

### Q14. `useContext` — what problem does it solve?

**Prop drilling**: passing props through many levels just to reach a deep child.

```jsx
const Theme = createContext('light');
<Theme.Provider value="dark"><App /></Theme.Provider>
// Anywhere inside:
const theme = useContext(Theme);
```

**Caveat**: any change to context value re-renders **all** consumers. Don't put rapidly changing values in context. Split context by concern (theme, user, settings).

---

### Q15. `useReducer` vs `useState`

Use `useReducer` when:
- State has multiple sub-values.
- Next state depends on previous in non-trivial ways.
- You want to centralize update logic.
- You want to enable testing of state transitions in pure form.

```jsx
const [state, dispatch] = useReducer(reducer, initial);
dispatch({ type: 'add', payload: item });
```

Often paired with context to mimic Redux for medium apps.

---

### Q16. Custom hooks — what makes them special?

**Nothing magical** — they're just functions that start with `use` and call other hooks. The naming convention tells React + ESLint to apply hook rules.

```jsx
function useDebounced(value, ms) {
  const [debounced, set] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => set(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}
```

Used to **share stateful logic** between components (replaces HOCs and render props).

---

## 3. Rendering & Reconciliation

---

### Q17. When does a React component re-render?

A component re-renders when:
1. Its own state changes (`setState`).
2. Its parent re-renders (passing new props or just being re-rendered — even if props are identical, unless memoized).
3. A subscribed context value changes.
4. A subscribed external store changes (`useSyncExternalStore`, Redux, Zustand).

**Common myth**: "Re-render = DOM update." False. Re-render produces a new VDOM. Whether the DOM mutates depends on **reconciliation** diff.

---

### Q18. What is reconciliation?

The diffing algorithm React uses to compare the new element tree to the previous one and apply minimal DOM mutations.

**Heuristics**:
1. Different element types → tear down subtree, rebuild.
2. Same type → keep DOM node, update props.
3. Lists → matched by `key`.

Current implementation: **Fiber** — an interruptible, prioritized re-implementation of reconciliation.

---

### Q19. What is React Fiber?

A reimplementation of React's core algorithm (since React 16) that breaks rendering into **units of work** (fibers) that can be:

- **Paused** mid-tree
- **Resumed** later
- **Reused** across renders
- **Aborted** if obsolete
- **Prioritized** by importance

This enables concurrent rendering, time slicing, and Suspense.

---

### Q20. React.memo — what does it do?

Wraps a component so it skips re-rendering when **props are shallow-equal** to previous props.

```jsx
const Row = React.memo(function Row({ item }) { ... });
```

Caveats:
- Shallow compare — pass stable refs (use `useCallback`/`useMemo` for object/function props).
- It's a **micro-optimization** — measure before applying. Wrapping cheap components adds comparison overhead.

---

### Q21. PureComponent vs React.memo

| Class                | Function          |
| -------------------- | ----------------- |
| `PureComponent`      | `React.memo`      |
| Shallow-compare props **and** state | Compares props only |

Both do the same job: skip re-render if shallow-equal.

---

### Q22. What's the cost of inline functions/objects in JSX?

```jsx
<Row onClick={() => doThing(id)} style={{ color: 'red' }} />
```

Every render creates a **new function** and **new object**. By itself this is cheap. The cost shows up when:
- The child is `React.memo`'d → memo busts every time.
- The function is in `useEffect`/`useCallback` deps → effects re-fire.

Fix: hoist outside the component, or wrap with `useCallback`/`useMemo`.

---

## 4. Lifecycle & Effects (Modern)

---

### Q23. React component lifecycle in hooks

```
mount → render → commit DOM → useLayoutEffect → paint → useEffect
update → render → commit DOM → cleanup useLayoutEffect → useLayoutEffect → paint → cleanup useEffect → useEffect
unmount → cleanup useLayoutEffect → cleanup useEffect
```

**Strict Mode** double-invokes effects in dev to surface cleanup bugs.

---

### Q24. Why does my effect fire twice in development?

`<StrictMode>` intentionally mounts → unmounts → remounts components in development to **detect missing cleanup**. Production runs effects once.

Fix: write effects that are idempotent and cleanup-safe. If you need to fetch on mount and your fetch has side effects, use AbortController in cleanup.

---

### Q25. How do you avoid race conditions in `useEffect` fetches?

```jsx
useEffect(() => {
  const ac = new AbortController();
  fetch(url, { signal: ac.signal })
    .then(r => r.json())
    .then(setData)
    .catch(e => { if (e.name !== 'AbortError') throw e; });
  return () => ac.abort();
}, [url]);
```

Without the abort, a slow request from an old `url` may resolve **after** a fast new request, overwriting fresh state with stale data.

---

## 5. Advanced

---

### Q26. What is Suspense?

A React mechanism for declaratively handling async operations: while a child is "loading", show fallback UI.

```jsx
<Suspense fallback={<Spinner />}>
  <Profile id={id} />
</Suspense>
```

Works with:
- `React.lazy` (code splitting)
- Data-fetching libraries that integrate with Suspense (Relay, TanStack Query v5, Next.js App Router, RSC)

---

### Q27. Concurrent React — what is it?

A set of opt-in features (since React 18) that let React **interrupt** and **prioritize** rendering work.

Primitives:
- `useTransition` — mark updates as non-urgent.
- `useDeferredValue` — defer a fast-changing value.
- `Suspense` — coordinate async UI.
- `startTransition` — non-hook version.

Effect: typing in a search box stays responsive while React lazily reconciles a heavy list.

---

### Q28. `useTransition` vs `useDeferredValue`

- `useTransition`: you wrap a state setter — that update becomes low-priority.
- `useDeferredValue`: you wrap a value — React holds onto the old one during high-priority work, then updates.

Use `useTransition` when you control the update site. Use `useDeferredValue` when you only receive the value as a prop.

---

### Q29. React Server Components (RSC) — what & why?

Components that render on the server and stream serialized JSX (not HTML) to the client. They:

- Run only on the server — can access DB, file system, secrets.
- Send **zero JS** for themselves to the client.
- Can interleave with client components (`'use client'` boundary).

**Wins**: smaller bundle, faster TTFB, automatic code splitting at component granularity.

**Constraints**: no hooks, no state, no event handlers, no browser APIs.

Adopted by Next.js App Router as default.

---

### Q30. What is the Context API best/worst for?

**Best**: theme, auth user, locale, feature flags — values that rarely change.

**Worst**: high-frequency updates (mouse position, form draft) — every consumer re-renders.

For dynamic global state at scale, use **Redux**, **Zustand**, **Jotai**, or **Recoil** (they avoid the every-consumer-re-render problem).

---

### Q31. Higher-Order Components (HOC) vs Render Props vs Hooks

All three are patterns for sharing behavior. Today **hooks** are the idiomatic choice.

| Pattern       | Composition style        | Status            |
| ------------- | ------------------------ | ----------------- |
| HOC           | Wrap component, pass props | Legacy           |
| Render props  | `<Comp>{(x) => ...}</Comp>` | Legacy           |
| Hooks         | `const x = useThing()`   | Current          |

HOCs still appear in `connect()`, `withRouter()`, error boundaries — but new code uses hooks.

---

### Q32. Error boundaries

A class component that implements `getDerivedStateFromError` or `componentDidCatch`. Catches rendering errors in its children.

```jsx
class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { logError(error, info); }
  render() {
    return this.state.error
      ? <Fallback error={this.state.error} />
      : this.props.children;
  }
}
```

**Don't catch**: event handlers, async code, server-side rendering, the boundary itself. Use try/catch for those.

There is **no hook equivalent yet** (as of React 19) — class is required.

---

### Q33. Refs — forwarding & imperative handles

`forwardRef` lets a parent attach a `ref` to a DOM node inside a function component:

```jsx
const Input = forwardRef((props, ref) => <input ref={ref} {...props} />);
```

`useImperativeHandle(ref, () => ({...}))` exposes a custom API instead of the DOM node:

```jsx
useImperativeHandle(ref, () => ({ focus: () => inputRef.current.focus() }));
```

React 19 removed the need for `forwardRef`: `ref` becomes a regular prop.

---

### Q34. Synthetic events — what & why?

React wraps native DOM events in **SyntheticEvent** objects that:
- Provide a consistent API across browsers.
- Are pooled (older React) — don't keep references across async boundaries (`e.persist()` if needed).
- Bubble up through a single delegated listener on the root (React 17+ attaches to the React root, not `document`).

---

### Q35. SSR vs CSR vs SSG vs ISR

| Strategy | Render where | Render when                  | Use for                       |
| -------- | ------------ | ---------------------------- | ----------------------------- |
| CSR      | Browser      | On user request              | App shells, internal tools    |
| SSR      | Server       | Per request                  | Dynamic pages, SEO            |
| SSG      | Build server | At build time                | Marketing, docs, blogs        |
| ISR      | Server       | Build time + revalidate      | Mostly-static with fresh bits |

React itself ships `renderToString`, `renderToPipeableStream`, `renderToStaticMarkup`. Frameworks (Next.js, Remix) wrap these.

---

### Q36. Hydration — what is it?

Process by which the client React attaches event handlers and state to **server-rendered HTML** rather than re-creating it.

`hydrateRoot(container, <App />)` instead of `createRoot(container).render(<App />)`.

**Common bug — hydration mismatch**: server and client render different markup. Causes: `Date.now()`, `Math.random()`, `localStorage` reads on the server.

---

### Q37. Why does React encourage immutability?

- Cheap reference equality (`prev === next`) for memoization.
- Predictable state — no spooky action at a distance.
- Time-travel debugging — keep history.
- Concurrent rendering safety — partial renders can be aborted without leaving torn state.

Always create new objects/arrays on update:
```js
setItems([...items, x]);             // 👍
setUser({ ...user, name: 'A' });     // 👍
items.push(x); setItems(items);      // 👎 (same reference, won't re-render)
```

---

### Q38. Portals — what & when?

`createPortal(child, container)` renders into a different DOM node while keeping the React tree intact (events still bubble through React parents).

Use for: modals, tooltips, dropdowns that must escape `overflow: hidden`.

---

### Q39. Strict Mode side-effects

In dev only, Strict Mode:
- Double-invokes function bodies, effects, and reducers.
- Warns about legacy APIs.
- Helps surface impure renders and missing effect cleanups.

It doesn't affect production behavior — production runs each effect once.

---

### Q40. What's new in React 19 / 19.2?

**React 19.0 (Dec 5, 2024)** — verified against [react.dev/blog/2024/12/05/react-19](https://react.dev/blog/2024/12/05/react-19):
- **Actions** + `useActionState`, `useFormStatus`, `useOptimistic` for forms.
- **`use()`** API to unwrap promises/contexts in render.
- `ref` as a regular prop — `forwardRef` deprecated.
- Server Components + Server Actions (`"use server"`) production-stable.
- Document metadata (`<title>`, `<meta>`, `<link>`) hoisting.
- Resource preloading APIs (`preload`, `preinit`, `preconnect`, `prefetchDNS`).
- Stylesheet `precedence`, async `<script>`.
- `<Context>` as provider (no `.Provider` needed).
- Cleanup function support for refs.
- `onCaughtError` / `onUncaughtError` options on `createRoot` / `hydrateRoot`.

**React 19.1 (Mar 28, 2025)**:
- Owner Stack debugging (dev-only), `captureOwnerStack` API.

**React 19.2 (Oct 1, 2025)** — verified against [react.dev/blog/2025/10/01/react-19-2](https://react.dev/blog/2025/10/01/react-19-2):
- **`useEffectEvent`** hook — stable. Separates non-reactive event logic from Effects (does not belong in dep arrays).
- **`<Activity />`** component (visible/hidden modes — preserves state for hidden subtrees).
- `cacheSignal` (RSC).
- Partial Pre-rendering APIs (`prerender`/`resume`/`resumeAndPrerender`).
- SSR Suspense batching.
- Breaking: `useId` prefix changed to `_r_`.

**React Compiler 1.0 (Oct 7, 2025)** — stable, production-ready. With Compiler enabled, you usually don't need `useMemo`/`useCallback`/`React.memo`. Keep them only for precise control (e.g., stable effect dependencies).

### Q41. What was removed/deprecated in React 19?

**Removed**:
- Legacy context (`contextTypes`, `getChildContext`).
- String refs.
- `defaultProps` on function components — use ES default parameters.
- `propTypes` — use TypeScript.
- `ReactDOM.render`, `ReactDOM.hydrate`, `unmountComponentAtNode`, `findDOMNode`.
- `React.createFactory`.
- Module pattern factories.
- `react-dom/test-utils` — use `act` from `react`.

**Deprecated**:
- `element.ref` (use `element.props.ref`).
- `forwardRef` (use ref-as-prop).
- `<Context.Provider>` (use `<Context>` directly).
- `useFormState` (use `useActionState`).
- `react-test-renderer` (use React Testing Library).

Source: [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide).

### Q42. `useEffectEvent` — what is it, when do you use it?

A stable React 19.2 hook that lets you extract "event" logic out of `useEffect` so the function can read the latest props/state without subscribing to them.

```jsx
function Chat({ roomId, theme }) {
  const onConnected = useEffectEvent(() => {
    showToast(`Welcome to ${roomId}!`, theme); // reads latest theme
  });

  useEffect(() => {
    const conn = createConnection(roomId);
    conn.on('connected', onConnected);
    conn.connect();
    return () => conn.disconnect();
  }, [roomId]); // theme is NOT a dep — onConnected captures latest
}
```

**Rule**: never list an `useEffectEvent` function in a dep array. It's specifically designed to read fresh values without re-firing the effect.

### Q43. `<Activity>` component — what is it for?

React 19.2 component that renders children in `'visible'` or `'hidden'` mode. `hidden` keeps state but unmounts effects and skips rendering work.

Use cases: tab switchers that should preserve state, route prefetching, expensive trees you want to keep "warm" but invisible.

---

## 6. State Management — Redux vs Zustand vs Others

> Verified May 2026: Redux Toolkit 2.11, Redux core 5; Zustand 5.0; Recoil **archived by Meta Jan 1, 2025**.

---

### Q44. State management — what kinds of state are there in a React app?

Before picking a library, recognize the **three kinds of state**:

| Kind                  | Examples                                  | Best owned by                     |
| --------------------- | ----------------------------------------- | --------------------------------- |
| **Local UI state**    | Modal open?, input value, hover           | `useState` / `useReducer`         |
| **Shared client state** | Theme, auth user, cart, feature flags   | Context / Zustand / Redux / Jotai |
| **Server state**      | API data, paginated lists, mutations      | TanStack Query / SWR / RSC        |

Most "we need Redux" conversations are actually **server state** problems — and TanStack Query solves them far better than any client-state library.

---

### Q45. Redux Toolkit — what is it and why is "classic Redux" legacy?

**Redux Toolkit (RTK)** is the official, recommended way to use Redux since 2019. Classic Redux (hand-written `switch` reducers, `action.type` constants, manual middleware wiring) is **legacy** — the docs themselves discourage it.

What RTK gives you:
- **`configureStore`** — auto-combines reducers, includes `redux-thunk`, wires up Redux DevTools.
- **`createSlice`** — combines `createReducer` + `createAction`; uses **Immer** so you can write "mutating" code that produces immutable updates.
- **`createAsyncThunk`** — async actions with pending/fulfilled/rejected lifecycle.
- **RTK Query** (`createApi`) — built-in data fetching with caching, invalidation, auto-generated hooks. Bundled with RTK, no extra install.

```ts
// counter slice (full code)
import { createSlice, configureStore } from '@reduxjs/toolkit';

const counter = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    inc: (s) => { s.value += 1; },      // Immer makes this safe
    add: (s, action) => { s.value += action.payload; }
  }
});

export const { inc, add } = counter.actions;
export const store = configureStore({ reducer: { counter: counter.reducer } });
```

Latest stable: **RTK 2.11.x** (May 2026). Redux core: v5.

---

### Q46. Zustand — what is it and how does it differ from Redux?

**Zustand** is a small (~1 KB) state library: a single `create` function returns a hook that reads slices of state and triggers re-renders only on **selected** changes.

```ts
import { create } from 'zustand';

const useCounter = create((set) => ({
  value: 0,
  inc: () => set((s) => ({ value: s.value + 1 })),
  add: (n) => set((s) => ({ value: s.value + n }))
}));

// In a component:
function Counter() {
  const value = useCounter((s) => s.value);
  const inc = useCounter((s) => s.inc);
  return <button onClick={inc}>{value}</button>;
}
```

Latest stable: **Zustand 5.0.x** (May 2026).

---

### Q47. Redux Toolkit vs Zustand — head-to-head.

| Aspect                  | Redux Toolkit                              | Zustand                                |
| ----------------------- | ------------------------------------------ | -------------------------------------- |
| Bundle size (gzip)      | ~13 KB (RTK) + 9 KB (react-redux)          | ~1 KB                                  |
| Boilerplate (counter)   | ~25–35 lines (slice + store + Provider)    | ~8–12 lines (single `create` call)     |
| Provider required       | Yes (`<Provider store={...}>`)             | No (works without one)                 |
| Re-render model         | `useSelector` + reference equality (or `shallowEqual`/Reselect) | Per-selector subscription with custom `equalityFn` |
| DevTools                | Auto-enabled via `configureStore`          | Opt-in via `devtools` middleware       |
| Time-travel debugging   | First-class (action log)                   | Via DevTools middleware                |
| Middleware ecosystem    | Huge (sagas, observables, logger…)         | Small but growing (`persist`, `immer`, `subscribeWithSelector`) |
| Async                   | `createAsyncThunk`, RTK Query, sagas       | Plain async functions inside actions   |
| Data fetching built-in  | **RTK Query** included                     | None — pair with TanStack Query        |
| TypeScript ergonomics   | Verbose (typed slices, dispatch types)     | Excellent inference                    |
| SSR / Next.js App Router | `makeStore` factory + per-request Provider | `createStore` from `zustand/vanilla` + per-request Provider context |
| Action-trace audit      | Yes — every state change is a typed action | No — actions are plain function calls  |
| Learning curve          | Steep (slices, reducers, thunks, selectors) | Shallow (it's a hook)                 |

**Performance**: Zustand's selector model is finer-grained out of the box — components only re-render when their *selected* slice changes. With Redux, `useSelector` returns the whole derived value, so reference identity matters; you must memoize selectors (`createSelector` / Reselect) to match Zustand's default behavior.

---

### Q48. SSR with Zustand and Redux in Next.js App Router.

**Anti-pattern**: a module-level global store. In Next.js, modules are shared across requests → one user's state leaks to another.

**Pattern (Zustand)**:
```ts
// store.ts
import { createStore } from 'zustand/vanilla';
export const makeStore = () => createStore<State>(() => ({ value: 0 }));

// StoreProvider.tsx (Client Component)
'use client';
const StoreContext = createContext<StoreApi<State> | null>(null);
export function StoreProvider({ children }) {
  const storeRef = useRef<StoreApi<State>>();
  if (!storeRef.current) storeRef.current = makeStore();
  return <StoreContext.Provider value={storeRef.current}>{children}</StoreContext.Provider>;
}
```

**Pattern (RTK)**:
```ts
// store.ts
export const makeStore = () => configureStore({ reducer });

// StoreProvider.tsx (Client Component)
'use client';
export function StoreProvider({ children }) {
  const storeRef = useRef<EnhancedStore>();
  if (!storeRef.current) storeRef.current = makeStore();
  return <Provider store={storeRef.current}>{children}</Provider>;
}
```

Wrap the app shell in `<StoreProvider>` so each request gets a fresh store.

---

### Q49. When do you pick Redux Toolkit vs Zustand vs Context?

| Need                                                | Recommendation               |
| --------------------------------------------------- | ---------------------------- |
| Small app, just one or two pieces of shared state   | **Context + `useState`**     |
| Medium app, ad-hoc shared state, want minimal boilerplate | **Zustand**            |
| Large team, complex async flows, strict action audit | **Redux Toolkit**           |
| Need built-in data-fetching with cache/invalidation | **RTK Query**, or **TanStack Query** with any of the above |
| Fine-grained reactive state, derived computations   | **Jotai** (atomic model)     |
| Mutable API with snapshots, React Compiler friendly | **Valtio** (proxy-based)     |
| Form state                                          | `useState` / **React Hook Form** / **Formik** — never a global store |

**Anti-pattern**: putting form state, server data, or transient UI state in Redux/Zustand "in case we need it elsewhere." Most state should live close to where it's used.

---

### Q50. Other libraries worth knowing in 2026.

- **Jotai**: atomic state ("bottom-up Recoil"). Each piece of state is an atom; components subscribe to specific atoms. Great for derived/computed state. Works well with React Compiler.
- **Valtio**: proxy-based mutable API + immutable snapshots. Very ergonomic; pairs cleanly with React Compiler.
- **Recoil**: **archived by Meta on Jan 1, 2025.** No concurrent-features support. Existing users are migrating to Jotai.
- **Effector**: declarative; primitives are `Event`, `Store`, `Effect`. Uses `sample` for reactions. Smaller user base but excellent design.
- **MobX**: observable-based; minimal boilerplate. Less popular in modern React due to its mental model differing from concurrent React.

---

## 7. Server State — TanStack Query vs Plain Fetch

---

### Q51. Why do you need a server-state library at all?

Plain `useEffect + useState + fetch` has **all of these problems**:

```jsx
function User({ id }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${id}`)
      .then(r => r.json())
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);
  // ...
}
```

What it's missing:
- **Race conditions**: rapid `id` changes → old response can overwrite the new one.
- **No caching**: every mount fires a fresh request.
- **No deduplication**: 5 components asking for the same user → 5 requests.
- **No retries**: a transient network error fails permanently.
- **No background refresh**: stale data sits forever until manual refetch.
- **No cancellation**: needs manual `AbortController` plumbing.
- **No shared state**: each component has its own copy.
- **No DevTools**: debugging is "add more console.logs".
- **No mutation handling**: POST/PUT/DELETE need separate hand-rolled logic.

That's the gap **TanStack Query** (and SWR) fills.

---

### Q52. What is TanStack Query?

A library for managing **server state** on the client. Latest stable: **@tanstack/react-query 5.100.x** (May 2026). Was called "React Query" — renamed because it now supports Vue, Svelte, Solid, Angular.

Core API:
- **`useQuery({ queryKey, queryFn })`** — read/cache server data (`GET`).
- **`useMutation({ mutationFn })`** — side-effect operations (`POST`/`PUT`/`DELETE`).
- **`useInfiniteQuery`** — paginated / cursor-based data.
- **`useQueryClient`** — imperative cache access (invalidation, prefetch).
- **`useSuspenseQuery`** (v5+, stable) — Suspense-integrated query.

```jsx
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';

const qc = new QueryClient();

function App() {
  return <QueryClientProvider client={qc}><Users /></QueryClientProvider>;
}

function Users() {
  const { data, isPending, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
    staleTime: 60_000,           // 1 min before refetch
    refetchOnWindowFocus: true
  });
  if (isPending) return <Spinner />;
  if (error) return <p>{error.message}</p>;
  return <ul>{data.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

---

### Q53. TanStack Query — what does it actually solve?

| Feature                         | Plain fetch        | TanStack Query                       |
| ------------------------------- | ------------------ | ------------------------------------ |
| Caching by query key            | ❌                 | ✅                                   |
| Request deduplication           | ❌                 | ✅                                   |
| Retries with exponential backoff | ❌                | ✅ (3 retries by default)            |
| Background refetch on focus/reconnect | ❌           | ✅                                   |
| Stale-while-revalidate          | ❌                 | ✅                                   |
| Race condition prevention       | ❌ (manual)        | ✅ (latest query wins)               |
| Polling (`refetchInterval`)     | ❌ (manual setInterval) | ✅                              |
| Pagination / infinite scroll    | ❌ (rebuild state) | ✅ (`useInfiniteQuery`)              |
| Optimistic mutations            | ❌                 | ✅ (`onMutate` + rollback in `onError`) |
| Query invalidation across components | ❌            | ✅ (`queryClient.invalidateQueries`) |
| Offline support                 | ❌                 | ✅                                   |
| DevTools                        | ❌                 | ✅ (React Query Devtools panel)      |
| SSR / hydration                 | ❌                 | ✅ (`dehydrate`/`hydrate`, `HydrationBoundary`) |
| Suspense integration            | ❌                 | ✅ (`useSuspenseQuery` stable in v5) |
| TypeScript inference            | ❌                 | ✅                                   |

---

### Q54. `useMutation` with optimistic update + rollback.

```jsx
const qc = useQueryClient();

const addTodo = useMutation({
  mutationFn: (text) => fetch('/api/todos', { method: 'POST', body: JSON.stringify({ text }) }),
  onMutate: async (text) => {
    await qc.cancelQueries({ queryKey: ['todos'] });
    const prev = qc.getQueryData(['todos']);
    qc.setQueryData(['todos'], (old) => [...old, { id: 'temp', text }]);
    return { prev };                            // context for rollback
  },
  onError: (err, _vars, ctx) => qc.setQueryData(['todos'], ctx.prev),
  onSettled: () => qc.invalidateQueries({ queryKey: ['todos'] })
});

<button onClick={() => addTodo.mutate('new task')}>Add</button>
```

`onMutate` runs **before** the request, lets you optimistically update + capture a snapshot. `onError` rolls back. `onSettled` invalidates the cache so the next render is authoritative.

---

### Q55. TanStack Query v5 — what's new vs v4?

(Verified — [v5 announcement](https://tanstack.com/blog/announcing-tanstack-query-v5).)

- **Unified hook signatures**: removed all overloads — every hook takes a single object.
- ~20% smaller bundle.
- **Stable Suspense hooks**: `useSuspenseQuery`, `useSuspenseInfiniteQuery`, `useSuspenseQueries`.
- **`useMutationState`** — observe mutations from a sibling component.
- `maxPages` for `useInfiniteQuery` — bound memory growth.
- `useQuery({ enabled })` more predictable; `isPending` replaces ambiguous `isLoading`/`isInitialLoading`.

---

### Q56. TanStack Query vs SWR (Vercel) — head-to-head.

| Aspect           | TanStack Query                    | SWR                            |
| ---------------- | --------------------------------- | ------------------------------ |
| Bundle (gzip)    | ~11 KB                            | ~4 KB                          |
| API surface      | Large (queries, mutations, infinite, suspense) | Minimal (`useSWR`, `useSWRMutation`) |
| Mutation handling | Full state machine + rollback    | Lighter (manual rollback)      |
| DevTools         | ✅ (rich panel)                   | ❌ (browser ext only)          |
| Offline support  | ✅                                | Partial                        |
| Plugin ecosystem | Large                             | Smaller                        |
| SSR              | ✅ (`HydrationBoundary`)           | ✅ (`fallback`)                |
| Author           | Tanner Linsley (TanStack)         | Vercel                          |

**Pick SWR** when bundle size matters and you mostly do reads.
**Pick TanStack Query** when you need complex mutations, optimistic UI, offline support, or you're already on the TanStack ecosystem (Router, Table, Form, etc.).

---

### Q57. Is TanStack Query still relevant with Server Components / Server Actions?

**Yes.** They're complementary, not competing.

| Use case                                  | Server Components / Actions | TanStack Query             |
| ----------------------------------------- | --------------------------- | -------------------------- |
| Initial page-load data                    | ✅ (faster, no round-trip)  |                            |
| SEO-critical content                      | ✅                          |                            |
| Client-side mutations with optimistic UI  |                             | ✅                         |
| Infinite scroll / live lists              |                             | ✅                         |
| Background polling / focus-refresh        |                             | ✅                         |
| Cross-component shared cache              |                             | ✅                         |
| Multi-step forms with intermediate state  |                             | ✅ (or local state)        |

Common 2025–2026 pattern: **RSC fetches initial data + hydrates → TanStack Query owns it from there**:

```jsx
// Server Component
const data = await fetchInitialTodos();
return <HydrationBoundary state={dehydrate(qc, ['todos'])}><Todos /></HydrationBoundary>;

// Client Component
function Todos() {
  const { data } = useQuery({ queryKey: ['todos'], queryFn: fetchTodos });
  // initial data already in cache from hydration
}
```

---

### Q58. When **don't** you need TanStack Query?

- Pure RSC apps with no client-side mutations or interactive lists.
- Trivial single-page tools where every fetch fires once and never changes.
- When Server Actions + `revalidatePath` / `revalidateTag` (Next.js) cover all your invalidation needs.

For a "static dashboard that loads once" — plain `useEffect + fetch` (or Server Components) is fine. For anything dynamic, interactive, or shared — reach for TanStack Query.

---

### Q59. Server state library + client state library — typical 2026 stack?

A common modern stack:
- **TanStack Query** for server state.
- **Zustand** (or Jotai) for client state.
- **React Hook Form** for form state.
- **React Router** or **Next.js App Router** for navigation state (URL).

Notice: **no Redux** in many modern setups. Redux now lives where it shines — large enterprise apps with strict action-log auditing, or RTK Query as a Redux-native alternative to TanStack Query.

---

### Q60. Common mistakes when introducing TanStack Query.

1. **Wrapping every component in its own `QueryClient`** — kills the shared cache. Use one client at the app root.
2. **Putting server data into Zustand/Redux too** — duplicated cache; manual sync.
3. **Querying inside a `useEffect`** — defeats the point; use `useQuery` directly.
4. **`queryKey: ['user']`** when the data depends on params → cache leak. Include all inputs: `['user', id]`.
5. **Disabling refetch globally** — usually means you've reinvented plain fetch with extra steps.

---

## Final Senior Tips

1. **Always say "what re-renders, what reconciles, what commits"** — three different things.
2. **Default to no memoization** — measure first.
3. **Effects are for synchronization, not lifecycle**.
4. **Lift state up, push state down** — find the right owner.
5. **State colocation > global state** when possible.
