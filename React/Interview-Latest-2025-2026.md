# React — Latest Interview Questions (2025–2026)

> **Audience**: Interview prep for 2025–2026 rounds.
> **Focus**: React 19.0/19.2, React Compiler 1.0 (stable Oct 2025), Server Components, modern patterns actually asked.
> **Verified** against [react.dev](https://react.dev) blogs, LogRocket, Epic React, Mux, and aggregated 2025–2026 interview reports.

---

## 1. React 19 — Actions & Form Hooks

---

### Q1. What's the difference between `useActionState`, `useFormStatus`, and `useOptimistic`?

- **`useActionState(action, initial)`**: wraps an async action; returns `[state, dispatch, isPending]`. Consolidates pending/error/data in one place.
- **`useFormStatus()`**: reads the **nearest parent `<form>`**'s pending/data/method/action. Must live in a child component of the form.
- **`useOptimistic(state, reducer)`**: returns `[optimisticState, addOptimistic]` for instant UI updates; React auto-reverts on failure/finish.

```jsx
function ProfileForm() {
  const [state, formAction, isPending] = useActionState(saveProfile, { error: null });
  return (
    <form action={formAction}>
      <input name="name" />
      <SubmitButton />  {/* useFormStatus lives here */}
    </form>
  );
}
function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? '…' : 'Save'}</button>;
}
```

---

### Q2. Why is `useFormStatus().pending` always `false` in my code?

You called it in the **same component** as the `<form>`. `useFormStatus` only reads the status of an **ancestor form** — move it into a child (e.g., `<SubmitButton />`).

This is one of the most commonly missed gotchas in 2025–2026 interviews.

---

### Q3. Combine `useActionState` + `useOptimistic` for a like button — when does each fire?

```jsx
function LikeButton({ postId, count }) {
  const [state, action, pending] = useActionState(likeAction, { count });
  const [optimisticCount, addOptimistic] = useOptimistic(state.count, (n, delta) => n + delta);

  async function handle() {
    addOptimistic(1);     // synchronous UI bump
    await action(postId); // server roundtrip
  }
  return <button onClick={handle}>♥ {optimisticCount}</button>;
}
```

`addOptimistic` runs inside the action (or `startTransition`) so the UI updates immediately. `pending` covers the network round trip. On rejection, the optimistic value is discarded and `state` reflects the server result.

---

## 2. React 19 — `use()` Hook

---

### Q4. Why does my component using `use(fetchUser())` suspend forever?

The promise is **created inline on every render** — a new pending promise each render. Fix: create the promise *outside* the component (or via `cache(fetchUser)` server-side, or memoize client-side). `use()` requires a **stable** promise reference.

```jsx
// 🚫 new promise every render
function Profile({ id }) { return <p>{use(fetchUser(id)).name}</p>; }

// ✅ stable promise from a parent
function Page({ id }) {
  const userP = useMemo(() => fetchUser(id), [id]);
  return <Profile userP={userP} />;
}
function Profile({ userP }) { return <p>{use(userP).name}</p>; }
```

---

### Q5. How is `use()` different from every other hook?

- **Can** be called conditionally (inside `if`, loops, after early returns).
- Accepts promises **or** contexts.
- With a pending promise, throws (suspends) to the nearest `<Suspense>`.
- On rejection, the nearest error boundary catches.

It's the only React API that escapes the "call hooks at the top level" rule — by design.

---

## 3. React 19 — ref-as-prop

---

### Q6. Migrate this `forwardRef` component.

```jsx
// Before (React 18)
const Input = forwardRef((props, ref) => <input ref={ref} {...props} />);

// After (React 19)
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}
```

`forwardRef` is **deprecated** in React 19 (still works). A codemod ships:
```bash
npx codemod@latest react/19/replace-use-form-state
```

TypeScript users: type `ref` as `Ref<HTMLInputElement>` directly in props.

---

### Q7. What new ref-callback behavior shipped in React 19?

Ref callbacks can now **return a cleanup function** that runs on unmount — symmetric with `useEffect`:

```jsx
<div ref={(node) => {
  if (!node) return;
  const obs = new IntersectionObserver(...);
  obs.observe(node);
  return () => obs.disconnect();
}} />
```

Previously you had to receive a second `null` call on unmount and handle that manually.

---

## 4. React 19.2 — `useEffectEvent` & `<Activity>`

---

### Q8. Why is the function from `useEffectEvent` NOT listed in the effect's dependencies?

Stable identity across renders + internally reads from a ref updated each render → always sees the latest props/state. Adding it to deps would defeat the purpose; the ESLint rule actually **forbids** it.

```jsx
function Chat({ roomId, theme }) {
  const onConnected = useEffectEvent(() => {
    showToast(`Welcome to ${roomId}`, theme); // reads latest theme
  });

  useEffect(() => {
    const conn = connect(roomId);
    conn.on('connected', onConnected);
    return () => conn.close();
  }, [roomId]); // theme is NOT a dep
}
```

Stable in React 19.2 (Oct 2025).

---

### Q9. What does `<Activity mode="hidden">` do that `display: none` doesn't?

State and DOM are **preserved**, but effects' cleanups fire and setups don't re-run, and updates inside the hidden tree run at **lower priority**. Conditional rendering destroys state; `display: none` keeps effects running.

```jsx
<Activity mode={tab === 'a' ? 'visible' : 'hidden'}>
  <TabA />  {/* state preserved; effects paused when hidden */}
</Activity>
```

Use for: tabs, prefetched routes that should "warm" the UI, modals with persistent state.

---

### Q10. What is Owner Stack (19.1+) and how does it differ from Component Stack?

- **Component Stack**: parent DOM chain (`A → B → C`).
- **Owner Stack**: render-time **owner** chain (who *rendered* whom — relevant when components are passed as props/children).

Invaluable for debugging context, HOCs, and "why was this rendered here?". Available via `captureOwnerStack()` in dev.

---

## 5. React Compiler 1.0 (Oct 2025)

---

### Q11. With React Compiler 1.0 on, do I still need `useMemo` / `useCallback` / `React.memo`?

**Mostly no.** The compiler auto-memoizes values, callbacks, and JSX based on dataflow analysis.

You **still need** manual memo when:
- A function or value escapes to a non-React boundary (`useSyncExternalStore`, stored in a ref where identity matters, passed to a non-React library).
- The component **silently opts out** due to a Rules-of-React violation.
- Referential identity is part of a **public API contract**.

---

### Q12. How do you know the compiler skipped your component?

`eslint-plugin-react-hooks` v6+ (absorbed `eslint-plugin-react-compiler` in late 2025) flags unsafe patterns. Promote the rule to `error` if you want silent skips to break builds. React DevTools shows a compiler badge per component.

---

### Q13. Name three Rules-of-React violations that disable compilation.

1. **Mutating props or state in place** (`obj.x = 1`).
2. **Conditional hook calls** (`if (x) useState(...)`).
3. **Reading/writing refs during render** (`ref.current = ...` in the body).

The compiler treats these as hard opts-out — the component compiles to a no-op transform.

---

### Q14. How do you opt a single function out?

Add `"use no memo"` directive at the top of the function body:

```jsx
function Buggy() {
  "use no memo";
  // ... compiler skips this function
}
```

Treat as a TODO with a comment explaining why.

---

## 6. Concurrent Rendering

---

### Q15. `useTransition` vs `useDeferredValue` — when to pick which?

- **`useTransition`**: you **own the state setter**, wrap it in `startTransition` (filter changes, route nav).
- **`useDeferredValue`**: value comes from props/context you **don't own** (third-party input).

Both mark work as interruptible. `useDeferredValue` lets the old value render while the new one is computed in the background.

---

### Q16. Build a type-ahead search that stays responsive on a 10k-item list.

```jsx
function Search({ items }) {
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const results = useMemo(() => filter(items, deferred), [items, deferred]);
  const isStale = query !== deferred;

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul style={{ opacity: isStale ? 0.5 : 1 }}>
        {results.map(r => <li key={r.id}>{r.name}</li>)}
      </ul>
    </>
  );
}
```

The input stays at 60fps; results render with priority drop and visible "stale" hint.

---

## 7. Tearing & External Stores

---

### Q17. What is tearing and which hook prevents it?

**Tearing** = different components reading different snapshots of the same external store during a single concurrent render.

`useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` forces a synchronous, consistent read per render — mandatory for any non-React store (Redux, Zustand internals, custom pub/sub).

```jsx
const isOnline = useSyncExternalStore(
  (cb) => { window.addEventListener('online', cb); return () => window.removeEventListener('online', cb); },
  () => navigator.onLine,
  () => true // SSR snapshot
);
```

---

## 8. SSR / RSC / Hydration

---

### Q18. What is the RSC "Flight" payload?

A **serialized component tree** (not HTML) streamed over HTTP. The client React runtime reconstructs the tree as chunks arrive, interleaving with Client Component placeholders. RSCs ship **zero JS** for their own code.

Navigation between two App Router pages fetches a small RSC payload (not full HTML) and patches the tree in place.

---

### Q19. Three common causes of hydration mismatch and the React 19 fix.

1. `Date.now()` / `Math.random()` during render.
2. Locale-dependent formatting.
3. Reading `window` / `localStorage` in render.

**React 19 improvements**: narrower mismatch error messages (shows the exact attribute), more granular `suppressHydrationWarning`. **Real fix**: render server placeholder, patch in `useEffect`, or use `useSyncExternalStore` with `getServerSnapshot`.

---

### Q20. Streaming SSR — what changed in 19?

- Suspense boundaries **flush their HTML chunk** as soon as their data resolves.
- `<title>`, `<meta>`, `<link>` rendered anywhere in the tree are **hoisted to `<head>`** automatically — no `react-helmet`.
- Stylesheet `<link>` with `precedence` prop is de-duplicated and ordered.

---

## 9. Performance Forensics

---

### Q21. A component re-renders on every keystroke despite stable-looking props. Walkthrough?

1. **Profiler** → "why did this render?" (props/state/context/parent).
2. New **object/array literal** passed as prop (`style={{ color: 'red' }}`) — creates fresh reference each render.
3. **Context value identity** churning — wrap in `useMemo` or split contexts.
4. With **Compiler 1.0 on**, check the lint warning — the component may have opted out.

---

### Q22. Resource preloading: `preload` vs `preinit`?

- `preload(href, { as })` — fetches and caches.
- `preinit(href, { as: 'style' | 'script' })` — fetches **and** executes/inserts.

Both deduplicate. Call from any component (often inside an action or route handler) to start the request **earlier** than the renderer would. Available in React 19.

---

## 10. Migration & Edge

---

### Q23. `useFormState` → `useActionState` — what actually changed?

Same shape, but:
- Import moved from `react-dom` to `react`.
- Return tuple now includes **`isPending`** as the third element.

A codemod handles the rename. `useFormState` is deprecated in React 19.

---

### Q24. Build `useDebouncedCallback` that's compiler-safe.

```jsx
function useDebouncedCallback(fn, delay) {
  const latest = useEffectEvent(fn); // stable, sees latest fn
  const timer = useRef(null);

  return useCallback((...args) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => latest(...args), delay);
  }, [delay]);
}
```

Avoid mutating refs during render. Use `useEffectEvent` for latest-callback read. Don't memoize the inner timer — use a ref initialized once.

---

### Q25. Advanced Suspense: nested boundaries and "reveal order" problem.

Sibling Suspense boundaries reveal independently → layout shift.

Fixes:
- Hoist to a **single parent boundary** — wait for all.
- **`<SuspenseList revealOrder="forwards">`** (still experimental in 19.2).
- With RSC, structure server components so slow data sits behind its own boundary while the shell streams immediately.

---

## Final Senior Tips

1. **Use "Server Components default" mental model** — RSC unless you need state/effects/handlers, then `'use client'`.
2. **React Compiler kills most manual memoization** — but you must know what still needs it.
3. **`useEffectEvent` ≠ `useCallback`** — different identity model; different rules.
4. **The Flight payload is JSX, not HTML** — explain it correctly.
5. **State the React 19 deprecations**: `forwardRef`, `<Context.Provider>`, `useFormState`, string refs, propTypes, defaultProps on functions.

---

## Sources

- [React v19 official release](https://react.dev/blog/2024/12/05/react-19)
- [React 19.2 release](https://react.dev/blog/2025/10/01/react-19-2)
- [React Compiler v1.0 release](https://react.dev/blog/2025/10/07/react-compiler-1)
- [`useActionState` API](https://react.dev/reference/react/useActionState)
- [`useSyncExternalStore` API](https://react.dev/reference/react/useSyncExternalStore)
- [`<Activity>` API](https://react.dev/reference/react/Activity)
- [`preload`](https://react.dev/reference/react-dom/preload) / [`preinit`](https://react.dev/reference/react-dom/preinit)
- [LogRocket — React 19.2: Activity & useEffectEvent](https://blog.logrocket.com/react-19-2-is-here/)
- [LogRocket — useEffectEvent: goodbye stale closures](https://blog.logrocket.com/react-useeffectevent/)
- [InfoQ — Meta's React Compiler 1.0 in production](https://www.infoq.com/news/2025/12/react-compiler-meta/)
- [Sascha Becker — React Compiler at 18 months](https://saschb2b.com/blog/react-compiler-year-in-review)
- [Epic React — useSyncExternalStore demystified](https://www.epicreact.dev/use-sync-external-store-demystified-for-practical-react-development-w5ac0)
- [Mux — Activity component for streaming apps](https://www.mux.com/blog/react-is-changing-the-game-for-streaming-apps-with-the-activity-component)
- [GreatFrontEnd — Top React Interview Questions 2026](https://github.com/greatfrontend/top-reactjs-interview-questions)
- [Saeloun blog — React 19 ref-as-prop](https://blog.saeloun.com/2025/03/24/react-19-ref-as-prop/)
