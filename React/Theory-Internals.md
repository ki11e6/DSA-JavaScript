# Internals — How They Actually Work

> **Audience**: Senior interview prep. The goal is to *explain how things work under the hood*, not just use them.
> **Format**: Each library has — Concept → Internals → Code → Senior-level talking points → Common traps.
> **Verified** May 2026 against React docs, Redux Toolkit, Reselect, Zustand, TanStack Query/Table/Form, React Hook Form.

---

## Quick Map

| Topic                              | What lives here                                |
| ---------------------------------- | ---------------------------------------------- |
| [1. State (`useState`/`useReducer`)](#1-react-state) | Hook slots, batching, stale closures |
| [2. Context API](#2-context-api)    | Provider broadcast, every-consumer re-render   |
| [3. Redux Toolkit](#3-redux-toolkit) | `useSelector`, Reselect, RTK Query             |
| [4. Zustand](#4-zustand)            | Listener Set, `useSyncExternalStore`           |
| [5. TanStack Query](#5-tanstack-query) | QueryCache, observers, staleTime vs gcTime  |
| [6. TanStack Table](#6-tanstack-table) | Headless, row models, virtualization        |
| [7. React Hook Form / TanStack Form](#7-forms) | Uncontrolled refs, subscriptions       |

---

## 1. React State

### Concept

`useState` and `useReducer` are React's built-in primitives. They're **slot-indexed** — React stores them in a per-component list and looks them up by **call order** on every render.

### Internals

When a function component renders:
1. React maintains an internal **hook list** on the corresponding fiber.
2. The first `useState` call reads slot 0, the second reads slot 1, and so on.
3. Calling the setter doesn't update state synchronously — it **schedules** a re-render. The new value is read on the next render.
4. Multiple setter calls in the same task are **automatically batched** (React 18+) into one re-render.

This is why hooks must be called at the **top level** of the component — branching changes the call order and corrupts the slot index.

```jsx
// React stores: [{value: 0}, {value: ''}, ...] on the fiber
function Form() {
  const [count, setCount] = useState(0);      // slot 0
  const [name, setName]   = useState('');     // slot 1
  // ...
}
```

### Code — functional updater (why it matters)

```jsx
function Counter() {
  const [n, setN] = useState(0);

  // 🚫 Stale closure — all three reads see the SAME n
  function badAdd3() { setN(n + 1); setN(n + 1); setN(n + 1); }

  // ✅ Functional updater — each reads the latest queued value
  function goodAdd3() { setN(c => c + 1); setN(c => c + 1); setN(c => c + 1); }
}
```

`badAdd3()` adds 1 (not 3). `goodAdd3()` adds 3. The setter is queued; the **functional form** receives the **latest queued state**, not the closure-captured one.

### `useReducer`

Same model with an explicit reducer:

```jsx
const [state, dispatch] = useReducer(reducer, init);
dispatch({ type: 'add', payload: 5 });
```

Use when:
- State has multiple sub-fields with related transitions.
- Next state is a function of previous + action (not just a value).
- You want to centralize transition logic for testing.

### Senior talking points

- React 18 **automatically batches** all updates (event handlers, Promises, timeouts) — pre-18, only synthetic event handlers batched.
- `flushSync` forces a synchronous commit — rare; only when you need to read DOM measurements between two state changes.
- React 19's **`use(promise)`** is the only hook that can be called conditionally — every other hook is slot-indexed and order-sensitive.

### Common traps

- Mutating state directly (`obj.x = 1; setObj(obj)`) — same reference, no re-render.
- Stale closures inside `setInterval` / `useEffect` — use functional updaters or `useEffectEvent` (React 19.2).
- `useState(expensiveInit())` re-evaluates every render — wrap: `useState(() => expensiveInit())`.

---

## 2. Context API

### Concept

`React.createContext(defaultValue)` creates a (Provider, Consumer) pair. Providers broadcast a value to all descendants; descendants read it via `useContext` or `use()`.

### Internals

- The Provider holds the current `value`.
- When `value` changes (compared by `Object.is`), **every** descendant that calls `useContext(C)` is **scheduled to re-render** — regardless of which slice of the value they actually use.
- There is **no built-in selector**. This is the single most important fact about Context.

```jsx
<UserContext.Provider value={{ name, role }}>
  {/* Every consumer below re-renders when EITHER name OR role changes */}
</UserContext.Provider>
```

### Code — the every-consumer-re-render problem

```jsx
const AppCtx = createContext(null);

function App() {
  const [theme, setTheme] = useState('light');
  const [user,  setUser]  = useState(null);

  // 🚫 Every change to theme re-renders all user consumers, and vice versa
  return (
    <AppCtx.Provider value={{ theme, user, setTheme, setUser }}>
      <Dashboard />
    </AppCtx.Provider>
  );
}
```

**Fix 1 — Split contexts by change frequency**:
```jsx
<ThemeCtx.Provider value={theme}>
  <UserCtx.Provider value={user}>
    <Dashboard />
  </UserCtx.Provider>
</ThemeCtx.Provider>
```

**Fix 2 — Memoize the value** (necessary but not sufficient):
```jsx
const value = useMemo(() => ({ theme, user, setTheme, setUser }), [theme, user]);
```

**Fix 3 — Use a state library with selectors** (Zustand, Jotai, Redux + `useSelector`) for high-churn shared state.

### React 19 syntax

```jsx
// ✅ React 19+ — render the Context itself
<ThemeCtx value="dark"><App /></ThemeCtx>

// 🚫 Legacy (still works; will be deprecated)
<ThemeCtx.Provider value="dark"><App /></ThemeCtx.Provider>
```

Plus the new **`use(Context)`** API — works like `useContext` but **can be called conditionally** (after early returns, inside `if`/loops).

### Senior talking points

- "Context is **propagation, not state management**." It's a *transport* for values — selectors and equality checks are your responsibility.
- The Provider's `value` re-renders consumers on **reference change**. Inline `value={{ ... }}` creates a fresh object every render → broadcasts to all consumers every render. Always memoize.
- For genuinely fast-changing values (mouse position, scroll), don't use context — use a ref + an external store + `useSyncExternalStore`.

### Common traps

- Inline object/array in `value` → every render busts every consumer.
- Putting **server state** (paginated API data) in context — server state belongs in TanStack Query / SWR / RSC, not Context.
- One mega-context with `{ everything }` — split it.

---

## 3. Redux Toolkit

### Concept

Redux is a **predictable, single-source-of-truth store**. Every state change is described by a typed **action**; reducers compute the next state purely from the previous state + action.

**Redux Toolkit (RTK)** is the official, opinionated way to use Redux since 2019 — replaces the verbose classic API.

### Internals

The store is a closure holding:
- `state` (a plain object).
- `listeners` (a `Set` of subscribers).
- `{ getState, dispatch, subscribe, replaceReducer }`.

`dispatch(action)`:
1. Runs the root reducer: `state = reducer(state, action)`.
2. Iterates over `listeners` and calls each.

`useSelector(selector)` from `react-redux`:
1. Subscribes to the store.
2. On every dispatch, re-runs `selector(state)`.
3. Compares result to previous via **`===`** (reference equality) — re-renders only if changed.
4. Pass `shallowEqual` as 2nd arg for object/array results.

```ts
const value = useSelector(state => state.counter.value);
const list  = useSelector(state => state.items, shallowEqual); // for arrays
```

### Reselect (`createSelector`) — memoization

Selectors that derive data should be memoized — otherwise they return new references on every render, defeating `useSelector`'s `===` check.

```ts
import { createSelector } from '@reduxjs/toolkit';

const selectItems  = (s) => s.items;
const selectFilter = (s) => s.filter;

const selectVisible = createSelector(
  [selectItems, selectFilter],
  (items, filter) => items.filter(matches(filter))
);
```

Reselect identity-checks each input selector's output via `===`. Recomputes only when an input ref changes.

**v5+ default memoizer is `weakMapMemoize`** — a tree of `WeakMap` cache nodes giving effectively infinite, GC-friendly cache (compared to the old single-slot LRU which thrashed when called from multiple components with different args).

### RTK Query

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (build) => ({
    getUser: build.query<User, string>({ query: (id) => `/users/${id}` })
  })
});

export const { useGetUserQuery } = api;
```

Internals:
- Each endpoint serializes its args into a **`queryCacheKey`** string (e.g., `'getUser("42")'`).
- Identical key → **shared subscription**, deduped fetch, shared updates.
- Customize via `serializeQueryArgs`.

### Senior talking points

- **`createSlice`** uses **Immer** internally — you write "mutating" code (`state.value += 1`) and Immer produces an immutable update via proxies.
- The **single store, action log, time-travel** model is RTK's superpower in large teams — every state change is replayable and inspectable in DevTools.
- **Performance vs Zustand**: equivalent for simple cases, but `useSelector` re-runs on **every** dispatch; if your selector is expensive, Reselect is mandatory. Zustand subscriptions are inherently scoped.

### Common traps

- Calling `useSelector(state => ({ a: state.a, b: state.b }))` — returns a new object every time → re-render every dispatch. Either pass `shallowEqual`, or use multiple `useSelector` calls (cheaper).
- Forgetting `Immer`'s rules in `createSlice` — you can mutate or return a new object, but not both.
- Putting server data in Redux **and** TanStack Query — pick one cache.

---

## 4. Zustand

### Concept

Zustand is a **minimal store** (~1 KB) built around a single `create` function. It looks like a hook, but under the hood it's a vanilla store glued to React via `useSyncExternalStore`.

### Internals

`createStore` returns a closure with:
- `state` (plain object).
- `listeners: Set<(state, prevState) => void>`.
- `getState()`, `setState(partial, replace?)`, `subscribe(listener)`, `destroy()`.

`setState`:
1. Computes the next state (`Object.assign`-merge by default; full replace if `replace = true`).
2. If the next state is `Object.is` equal to current — bail out.
3. Otherwise iterate `listeners` and call each with `(nextState, prevState)`.

React binding (`useStore` / the hook returned by `create`):
- Uses **`useSyncExternalStoreWithSelector`** (from `use-sync-external-store/shim/with-selector`).
- `subscribe` adds a listener to the Set; cleanup removes it.
- `getSnapshot` returns the current state.
- Selector + equality fn (default `===`) decide whether to re-render this component.
- **Concurrent-mode safe** by construction.

```ts
import { create } from 'zustand';

const useStore = create((set) => ({
  value: 0,
  inc: () => set((s) => ({ value: s.value + 1 }))
}));

// Only re-renders when `value` changes:
const value = useStore((s) => s.value);

// Custom equality for object selectors:
const slice = useStore((s) => ({ a: s.a, b: s.b }), shallow);
```

### Slices pattern

For larger stores, split into composable slices:

```ts
const createCounterSlice = (set) => ({
  value: 0,
  inc: () => set((s) => ({ value: s.value + 1 }))
});

const createUserSlice = (set, get) => ({
  user: null,
  login: async (creds) => { /* uses get().value if needed */ }
});

const useStore = create((set, get) => ({
  ...createCounterSlice(set, get),
  ...createUserSlice(set, get)
}));
```

### Middleware

- **`devtools`** — connect to Redux DevTools (Zustand has no DevTools of its own).
- **`persist`** — auto-serialize to localStorage / sessionStorage / custom storage.
- **`immer`** — write mutating updates (like RTK).
- **`subscribeWithSelector`** — fine-grained subscriptions outside React (animations, side effects).

### Senior talking points

- "Zustand is just `useSyncExternalStore` with a nice API." If you understand `useSyncExternalStore`, you understand Zustand.
- **No Provider needed** — the store is a module export. But that's a trap in Next.js / SSR (see below).
- **Per-component selector subscriptions** mean it's inherently performant without Reselect.

### SSR / Next.js App Router

**Anti-pattern**: module-level global store. In Next.js, modules are shared across requests → cross-user state leak.

```ts
// store.ts
import { createStore } from 'zustand/vanilla';
export const makeStore = () => createStore<State>(() => ({ value: 0 }));

// StoreProvider.tsx — Client Component
'use client';
const StoreContext = createContext<StoreApi<State> | null>(null);
export function StoreProvider({ children }) {
  const ref = useRef<StoreApi<State>>();
  if (!ref.current) ref.current = makeStore();
  return <StoreContext.Provider value={ref.current}>{children}</StoreContext.Provider>;
}
```

Each request gets a fresh store via the Provider.

### Common traps

- Mutating state outside `set` (`state.value = 1`) — listeners never fire.
- Forgetting selectors (`useStore()` with no arg) → component re-renders on every change.
- Global store in Next.js without Provider → cross-request state leak.

---

## 5. TanStack Query

### Concept

A library for **server state** on the client: cache, deduplication, retries, background refetching, optimistic mutations.

The mental shift: server state is **not** the same as client state. Server state has TTL, staleness, ownership outside your control. TanStack Query is purpose-built for it.

### Internals

The architecture is the **Observer pattern**:

- **`QueryClient`** owns one **`QueryCache`** and one **`MutationCache`**.
- The QueryCache is a `Map<queryHash, Query>`.
- Each `useQuery({ queryKey, queryFn })` creates (or reuses) a `Query` and attaches a `QueryObserver`.
- When a `Query`'s state changes, it notifies its observers, which call `setState` on the React components.

**Query key hashing**:
- The `queryKey` (array) is serialized to a stable JSON string with **sorted object keys**.
- So `['todos', { a: 1, b: 2 }]` and `['todos', { b: 2, a: 1 }]` hash to the same key.
- Identical hash → same `Query` → shared cache, deduped fetch, shared subscribers.

**Lifecycle of a query**:
1. Component mounts → `QueryObserver` subscribes.
2. If data is **fresh** (within `staleTime`) → return cached.
3. If **stale** → return cached + refetch in background.
4. Refetch completes → all observers re-render with new data.
5. Component unmounts → observer detaches.
6. When observer count hits 0, the `Query` becomes **inactive**.
7. After `gcTime` of inactivity → garbage collected.

### `staleTime` vs `gcTime`

| Setting       | What it means                                        | Default |
| ------------- | ---------------------------------------------------- | ------- |
| `staleTime`   | How long data is **fresh** — no refetch within window even on remount/focus | `0` (immediately stale) |
| `gcTime` *(was `cacheTime` in v4)* | How long an **inactive** query lingers before GC | `5 minutes` |

**Best practice**: `gcTime >= staleTime`. Otherwise, stale data is GC'd before it ever gets reused.

### Code

```ts
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, gcTime: 5 * 60_000 } }
});

function Users() {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
    refetchOnWindowFocus: true,
    retry: 3
  });
  // ...
}
```

### Mutations + optimistic updates

```ts
const addTodo = useMutation({
  mutationFn: (text) => fetch('/api/todos', { method: 'POST', body: JSON.stringify({ text }) }),
  onMutate: async (text) => {
    await qc.cancelQueries({ queryKey: ['todos'] });
    const prev = qc.getQueryData(['todos']);
    qc.setQueryData(['todos'], (old) => [...old, { id: 'temp', text }]);
    return { prev };
  },
  onError: (_e, _vars, ctx) => qc.setQueryData(['todos'], ctx.prev),
  onSettled: () => qc.invalidateQueries({ queryKey: ['todos'] })
});
```

Lifecycle: `onMutate` → optimistic update + snapshot for rollback → request → `onError` rolls back / `onSuccess` confirms → `onSettled` invalidates.

### v5 highlights (May 2026 — `5.100.x`)

- **Stable Suspense hooks**: `useSuspenseQuery`, `useSuspenseInfiniteQuery`, `useSuspenseQueries`.
- ~20% smaller bundle.
- Unified hook signatures (single object arg).
- `isPending` replaces ambiguous `isLoading`.
- `useMutationState` — observe mutations from a sibling.
- `maxPages` for `useInfiniteQuery` — bounds memory growth.

### SSR / Next.js App Router

```tsx
// page.tsx (Server Component)
const qc = new QueryClient();
await qc.prefetchQuery({ queryKey: ['todos'], queryFn: fetchTodos });

return (
  <HydrationBoundary state={dehydrate(qc)}>
    <Todos />
  </HydrationBoundary>
);

// Todos.tsx (Client Component)
'use client';
function Todos() {
  const { data } = useQuery({ queryKey: ['todos'], queryFn: fetchTodos });
  // initial data already in cache from hydration
}
```

RSC fetches initial data + hydrates → TanStack Query owns it from there for mutations, optimistic updates, refetching.

### Senior talking points

- "TanStack Query replaces `useEffect + useState + fetch` because it correctly models server state — TTL, ownership, invalidation."
- The query key is the **cache identity** — include every input that affects the response. `['user', id]` not `['user']`.
- `staleTime` controls freshness; `gcTime` controls retention. Tune both per query type.
- Compatible with RSC — they're **complementary**, not competing.

### Common traps

- Querying inside a `useEffect` — defeats the point.
- Missing inputs in `queryKey` → stale cache hits.
- One `QueryClient` per component → kills shared cache.
- Using TanStack Query for *client* state (UI toggles, form values) — wrong tool.

---

## 6. TanStack Table

### Concept

**Headless** table primitives — TanStack Table ships only **logic** (row models, sorting, filtering, pagination, virtualization adapters). You bring your own DOM and CSS.

This is opposite to **MUI DataGrid** / **AG Grid**, which ship rendered components with styling.

Trade-off: more code to write, total control over markup and styling, smallest possible bundle for what you actually use.

### Internals

The core hook:

```ts
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel
} from '@tanstack/react-table';

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  state: { sorting, columnFilters, pagination },
  onSortingChange: setSorting,
  onColumnFiltersChange: setColumnFilters,
  onPaginationChange: setPagination
});
```

**Row models are opt-in**. The `getXRowModel` functions are tree-shakeable — import only what you use. Without `getPaginationRowModel`, the table won't paginate. This is how the library stays tiny.

### Column definitions

```ts
const columns = [
  { accessorKey: 'name', header: 'Name' },
  {
    accessorFn: row => `${row.firstName} ${row.lastName}`,
    id: 'fullName',
    header: 'Full Name',
    cell: info => <strong>{info.getValue()}</strong>
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => <Button onClick={() => del(row.original.id)}>Delete</Button>
  }
];
```

- `accessorKey`: string path into the row.
- `accessorFn`: compute the cell value from the row.
- `header` / `cell`: render functions receiving context (`info.getValue()`, `row.original`, `column`, `table`).

### Controlled vs uncontrolled state

Each slice (sorting, filtering, columnVisibility, rowSelection, pagination, expanded, grouping) can be:
- **Uncontrolled** — the table manages internal state.
- **Controlled** — pass `state.x` and `onXChange` so you own it (and can persist to URL, localStorage, etc.).

### Rendering

The table object exposes:
- `table.getHeaderGroups()` — header rows.
- `table.getRowModel().rows` — current visible rows (post-filter/sort/pagination).
- `header.getContext()`, `cell.getContext()` — passed to render functions.
- `flexRender(component, context)` — render helper.

```jsx
<table>
  <thead>
    {table.getHeaderGroups().map(hg => (
      <tr key={hg.id}>
        {hg.headers.map(h => (
          <th key={h.id} onClick={h.column.getToggleSortingHandler()}>
            {flexRender(h.column.columnDef.header, h.getContext())}
            {{ asc: ' ▲', desc: ' ▼' }[h.column.getIsSorted()]}
          </th>
        ))}
      </tr>
    ))}
  </thead>
  <tbody>
    {table.getRowModel().rows.map(row => (
      <tr key={row.id}>
        {row.getVisibleCells().map(cell => (
          <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
        ))}
      </tr>
    ))}
  </tbody>
</table>
```

### Server-side pagination/sorting/filtering

Set `manualPagination: true` (or `manualSorting` / `manualFiltering`) and supply `pageCount` / `rowCount`:

```ts
const table = useReactTable({
  data,
  columns,
  manualPagination: true,
  manualSorting: true,
  pageCount: pagination.totalPages,
  state: { sorting, pagination },
  onSortingChange: setSorting,
  onPaginationChange: setPagination,
  getCoreRowModel: getCoreRowModel()
  // do NOT include getSortedRowModel / getPaginationRowModel
});
```

You then fetch the server-side data using `sorting` and `pagination` as query inputs (often with TanStack Query). The table doesn't sort/paginate locally — it just renders what you give it.

### Virtualization

No built-in virtualization. Pairs with **`@tanstack/react-virtual`**:

```ts
const rowVirtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 32,
  overscan: 10
});

// Render only virtual rows
{rowVirtualizer.getVirtualItems().map(virtualRow => {
  const row = rows[virtualRow.index];
  return <tr key={row.id} style={{ transform: `translateY(${virtualRow.start}px)` }}>...</tr>;
})}
```

Essential for 10,000+ row tables.

### Senior talking points

- "TanStack Table is **logic only** — you own the DOM." Contrast with AG Grid (heavyweight, opinionated, $$$ for enterprise) and MUI DataGrid (heavy, styled, includes a lot you might not need).
- Row models are **opt-in tree-shakeable** — that's why the same library scales from "simple sortable table" (~5 KB) to "100-column server-paginated grid with row selection, expanded subrows, column resizing".
- Same core works for React, Vue, Solid, Svelte, Qwik, Angular, Lit.

### Common traps

- Forgetting to provide a stable `id` for rows → `rowSelection` keys break.
- Including both `manualPagination: true` AND `getPaginationRowModel()` → confused state.
- Mutating column defs across renders → React Compiler / referential equality breaks; define columns outside or with `useMemo`.

---

## 7. Forms

Two camps in 2026: **React Hook Form (RHF)** dominates by usage; **TanStack Form** is the newer, framework-agnostic challenger.

### 7a. React Hook Form (RHF)

#### Concept

Make form inputs **uncontrolled by default** (data lives in refs, not React state), so keystrokes don't re-render the form. ~9 KB gzipped, zero deps.

Current: **react-hook-form 7.75.x** (May 2026).

#### Internals

- `useForm()` creates an internal form state object stored in refs.
- `register('field')` returns `{ ref, name, onChange, onBlur }` to spread on inputs:

```jsx
<input {...register('email', { required: true, pattern: /^.+@.+$/ })} />
```

  - The `ref` registers the DOM input.
  - `onChange` updates RHF's internal store **without** triggering React re-renders of the form.
- `handleSubmit(onValid, onInvalid)` reads all registered field refs, validates, and calls your callback.
- `formState` is a Proxy — accessing `formState.errors` subscribes only that consumer to error changes. Touching `formState.isDirty` subscribes to dirty changes. **Field-scoped subscriptions** prevent form-wide re-renders.

#### Controller (for controlled inputs)

For libraries that need controlled props (MUI Select, React-Select, custom components):

```jsx
<Controller
  name="country"
  control={control}
  rules={{ required: true }}
  render={({ field }) => <Select {...field} options={countries} />}
/>
```

The `field` object provides `{ value, onChange, onBlur, ref, name }`. RHF still owns the state, but the field is rendered controlled.

#### `useFieldArray`

Dynamic lists (add/remove/move items):

```jsx
const { fields, append, remove } = useFieldArray({ control, name: 'items' });
fields.map((f, i) => <input key={f.id} {...register(`items.${i}.value`)} />)
```

`fields[i].id` is a stable RHF-generated key — use it, not the index.

#### Validation with Zod

```jsx
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const Schema = z.object({
  email: z.string().email(),
  age: z.number().min(18)
});

const { register, handleSubmit } = useForm({ resolver: zodResolver(Schema) });
```

#### React 19 / Server Actions interop

RHF isn't natively built for `useActionState` / `<form action={fn}>`, but coexists:

```tsx
'use client';
const { register, handleSubmit, setError } = useForm({ resolver: zodResolver(Schema) });
const [state, formAction] = useActionState(saveAction, { errors: null });

useEffect(() => {
  if (state.errors) Object.entries(state.errors).forEach(([f, m]) => setError(f, { message: m }));
}, [state]);

return (
  <form onSubmit={handleSubmit((data) => formAction(toFormData(data)))}>
    <input {...register('email')} />
    {/* ... */}
  </form>
);
```

RHF validates client-side; the Server Action handles the mutation; server-side errors are surfaced back into RHF via `setError`.

#### Senior talking points

- "RHF is fast because inputs are **uncontrolled** — value lives in refs, not React state. No keystroke re-renders the form."
- `formState` is a **Proxy** — subscriptions are per-field, per-property. That's how it stays cheap.
- For libraries that need controlled props, use `Controller` / `useController` — same internal model, just a controlled bridge.

#### Common traps

- Using `value` + `onChange` on a `register`'d input — re-introduces controlled re-renders.
- Watching everything: `watch()` with no args → component re-renders on every change. Use `useWatch({ name })` for scoped subscriptions.
- Forgetting `useFieldArray`'s `field.id` → list items lose state on reorder.

---

### 7b. TanStack Form (v1)

#### Concept

Framework-agnostic form library (React, Vue, Solid, Angular, Lit). Built around **first-class TypeScript inference** — types flow from defaults / schema through every field.

Current: **TanStack Form v1** (stable since March 2025).

#### Internals

- `@tanstack/form-core` — framework-agnostic state machine.
- Framework adapters (`@tanstack/react-form`, etc.) provide hooks like `useForm`.
- Uses signals-like reactivity internally — components subscribe to **specific fields** via `<form.Field>` render-prop or `form.useStore(selector)`.
- Validates against the **[Standard Schema](https://standardschema.dev)** spec — works with Zod, Valibot, ArkType, etc. without per-lib adapters.

```ts
import { useForm } from '@tanstack/react-form';

const form = useForm({
  defaultValues: { email: '', age: 0 },
  validators: { onChange: Schema },
  onSubmit: async ({ value }) => { await save(value); }
});

return (
  <form onSubmit={e => { e.preventDefault(); form.handleSubmit(); }}>
    <form.Field name="email">
      {(field) => (
        <input
          name={field.name}
          value={field.state.value}
          onChange={(e) => field.handleChange(e.target.value)}
        />
      )}
    </form.Field>
  </form>
);
```

#### `createFormHook` for ergonomics

```ts
import { createFormHook, createFormHookContexts } from '@tanstack/react-form';

const { fieldContext, formContext } = createFormHookContexts();

const { useAppForm } = createFormHook({
  fieldComponents: { TextField, NumberField, Select },
  formComponents: { SubmitButton },
  fieldContext,
  formContext
});

// In a component:
const form = useAppForm({ defaultValues: { email: '' } });
return (
  <form.AppForm>
    <form.AppField name="email">{(f) => <f.TextField label="Email" />}</form.AppField>
    <form.SubmitButton />
  </form.AppForm>
);
```

Pre-binds your custom field components so consumers write less.

#### When TanStack Form vs RHF?

| Factor                       | TanStack Form         | React Hook Form     |
| ---------------------------- | --------------------- | ------------------- |
| TypeScript inference         | **Best-in-class**     | Good                |
| Framework support            | React, Vue, Solid, Angular, Lit | React only |
| Bundle size                  | Slightly larger       | ~9 KB (smaller)     |
| Maturity / ecosystem         | Younger               | Massive             |
| Examples / community         | Growing               | Huge                |
| TanStack Query / Router synergy | ✅                  | Indirect            |
| Controlled-only inputs       | Natural (render-prop) | `Controller` bridge |

**Default for new React projects**: RHF (mature, fast, smaller). **Pick TanStack Form** when you need framework-agnostic forms, max TS inference, or a TanStack-native stack.

---

## Final Senior Tips

1. **"How does it work" beats "what does it do"** — interviewers test depth. Explain the listener Set, the Proxy, the QueryCache, the `===` checks.
2. **Always position the library against its alternative**: Redux ↔ Zustand, RHF ↔ TanStack Form, TanStack Table ↔ AG Grid, Context ↔ state libraries.
3. **Know what's *not* the right tool**:
   - Context is propagation, not state management.
   - TanStack Query is server state, not client state.
   - Redux/Zustand are client state, not form state.
   - Form state belongs in RHF/TanStack Form, not a global store.
4. **The 2026 default stack** in many teams: **TanStack Query (server) + Zustand (client) + RHF (forms) + TanStack Table (when needed) + Next.js App Router (routing/SSR)**.

---

## Sources

- [React 19 release](https://react.dev/blog/2024/12/05/react-19)
- [createContext docs](https://react.dev/reference/react/createContext)
- [`use` API](https://react.dev/reference/react/use)
- [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore)
- [Redux Toolkit docs](https://redux-toolkit.js.org/)
- [Reselect (createSelector)](https://github.com/reduxjs/reselect)
- [RTK Query Cache Behavior](https://redux-toolkit.js.org/rtk-query/usage/cache-behavior)
- [Zustand](https://github.com/pmndrs/zustand) / [docs](https://zustand.docs.pmnd.rs/)
- [Zustand Next.js setup](https://zustand.docs.pmnd.rs/learn/guides/nextjs)
- [TanStack Query v5](https://tanstack.com/query/v5/docs/react/overview)
- [TanStack Query Important Defaults](https://tanstack.com/query/v5/docs/react/guides/important-defaults)
- [TanStack Query Advanced SSR (App Router)](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)
- [TanStack Table v8](https://tanstack.com/table/v8)
- [TanStack Table Pagination](https://tanstack.com/table/v8/docs/guide/pagination) / [Virtualization](https://tanstack.com/table/v8/docs/guide/virtualization)
- [React Hook Form](https://react-hook-form.com/) / [useController](https://react-hook-form.com/docs/usecontroller)
- [RHF + React 19 Actions](https://markus.oberlehner.net/blog/using-react-hook-form-with-react-19-use-action-state-and-next-js-15-app-router)
- [TanStack Form v1 announcement](https://tanstack.com/blog/announcing-tanstack-form-v1)
- [createFormHook docs](https://tanstack.dev/form/latest/docs/framework/react/reference/functions/createFormHook)
- [Standard Schema spec](https://standardschema.dev)
- [TanStack Form vs RHF — LogRocket](https://blog.logrocket.com/tanstack-form-vs-react-hook-form/)
