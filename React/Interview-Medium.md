# React — Medium Interview Questions

> **Audience**: 2–5 yr engineers.
> **Goal**: Show command of hooks composition, performance, context, refs, custom hooks, forms (Actions), data fetching, error handling.
> Verified against [react.dev](https://react.dev) (React 19.2, May 2026).

---

## 1. Hooks Composition

---

### Q1. Build a `useDebounced` hook.

```jsx
function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// Usage
function Search() {
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q, 300);
  useEffect(() => { if (debouncedQ) fetchResults(debouncedQ); }, [debouncedQ]);
  return <input value={q} onChange={e => setQ(e.target.value)} />;
}
```

Each keystroke resets the timer. Only the **final** value (after `delay` ms of silence) updates `debounced`.

---

### Q2. Build a `usePrevious` hook.

```jsx
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => { ref.current = value; });
  return ref.current; // returns *previous* render's value
}
```

`useEffect` runs *after* render, so during the current render `ref.current` still holds last render's value.

---

### Q3. Build a `useLocalStorage` hook.

```jsx
function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch { return initial; }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);

  return [value, setValue];
}
```

Key details:
- Lazy initializer (`() => ...`) — runs once, avoids reading localStorage every render.
- Try/catch — SSR (no `localStorage`), quota errors, JSON.parse failures.

---

### Q4. Build a `useFetch` hook.

```jsx
function useFetch(url) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    let alive = true;
    setState(s => ({ ...s, loading: true }));
    fetch(url)
      .then(r => r.json())
      .then(data => { if (alive) setState({ data, loading: false, error: null }); })
      .catch(error => { if (alive) setState({ data: null, loading: false, error }); });
    return () => { alive = false; };
  }, [url]);
  return state;
}
```

For production: **don't roll your own**. Use TanStack Query, SWR, or RSC + Server Actions — they handle caching, retries, deduplication, mutations, optimistic updates.

---

## 2. Performance

---

### Q5. When should you actually use `useMemo`?

For:
1. **Expensive computations** (parsing, large filters/sorts, heavy reduce).
2. **Stable references** passed to memoized children or as effect deps.

Not for:
- Cheap operations (most arithmetic, simple maps).
- Premature optimization.

```jsx
const filtered = useMemo(
  () => items.filter(matches).sort(byScore),
  [items]
);
```

**With React Compiler (stable Oct 2025)** auto-memoization makes most manual `useMemo` calls redundant. Keep them only where you need precise control.

---

### Q6. `React.memo` with comparison function.

```jsx
const Row = React.memo(
  function Row({ user }) { return <div>{user.name}</div>; },
  (prev, next) => prev.user.id === next.user.id // shallow equality override
);
```

By default `React.memo` does shallow prop comparison. The second argument runs custom logic — return `true` to **skip** re-render.

---

### Q7. Why is putting the same provider value in `<Context.Provider>` causing every consumer to re-render?

Even if values look equal, you're passing a **new object** every render:

```jsx
<Auth.Provider value={{ user, login }}>...
```

Fix: memoize.

```jsx
const ctx = useMemo(() => ({ user, login }), [user, login]);
return <Auth.Provider value={ctx}>...</Auth.Provider>;
```

---

### Q8. Split contexts when?

A single context with `{ user, theme, language, settings }` re-renders consumers when *any* field changes. Split into multiple contexts so each consumer subscribes to only what it needs.

---

### Q9. What is virtualization (windowing)? When do you need it?

Rendering 10,000 list items is slow because React reconciles all of them. **Virtualization** renders only the visible window plus a small overscan.

Libraries: `@tanstack/react-virtual`, `react-window`, `react-virtuoso`.

Use when:
- List has > ~200 items.
- Items have non-trivial render cost.

---

## 3. Refs & DOM

---

### Q10. Focus an input on mount.

```jsx
function Auto() {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return <input ref={ref} />;
}
```

---

### Q11. Pass a ref through a component.

**React 19+**: `ref` is just a regular prop. `forwardRef` is deprecated.

```jsx
function FancyInput({ ref, ...props }) {
  return <input ref={ref} className="fancy" {...props} />;
}

// Usage:
const ref = useRef(null);
<FancyInput ref={ref} />;
```

**Legacy (React 18 and earlier)**:
```jsx
const FancyInput = forwardRef((props, ref) => <input ref={ref} {...props} />);
```

---

### Q12. Expose a custom imperative API with `useImperativeHandle`.

```jsx
function Editor({ ref }) {
  const localRef = useRef(null);
  useImperativeHandle(ref, () => ({
    focus: () => localRef.current.focus(),
    clear: () => { localRef.current.value = ''; }
  }), []);
  return <input ref={localRef} />;
}

const editorRef = useRef(null);
editorRef.current?.focus();
```

Use sparingly — imperative APIs fight React's declarative model. Prefer props/state when possible.

---

## 4. Forms — React 19 Actions

---

### Q13. Form Actions.

```jsx
async function saveUser(formData) {
  'use server'; // (optional — works on both client & server in App Router)
  await db.users.update({ name: formData.get('name') });
}

function ProfileForm() {
  return (
    <form action={saveUser}>
      <input name="name" />
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus(); // must be inside a <form>
  return <button disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>;
}
```

`<form action={fn}>` handles `preventDefault`, manages pending state, and integrates with `useFormStatus` and `useActionState`.

---

### Q14. `useActionState` (form state + pending + error).

```jsx
function NameForm() {
  const [state, formAction, isPending] = useActionState(
    async (prev, formData) => {
      try {
        await save(formData.get('name'));
        return { ok: true, error: null };
      } catch (e) { return { ok: false, error: e.message }; }
    },
    { ok: false, error: null }
  );

  return (
    <form action={formAction}>
      <input name="name" />
      <button disabled={isPending}>{isPending ? '…' : 'Save'}</button>
      {state.error && <p>{state.error}</p>}
    </form>
  );
}
```

This replaces the React 18 `useFormState` (deprecated in React 19).

---

### Q15. `useOptimistic` — optimistic UI.

```jsx
function Likes({ count, like }) {
  const [optimistic, addOptimistic] = useOptimistic(count, (c, delta) => c + delta);

  async function handleLike() {
    addOptimistic(1);              // update UI immediately
    await like();                   // server call
  }

  return <button onClick={handleLike}>♥ {optimistic}</button>;
}
```

If the server call fails, React rolls back to the real value automatically.

---

## 5. Data Fetching & Suspense

---

### Q16. `use()` to unwrap a promise.

```jsx
import { use, Suspense } from 'react';

function Profile({ promise }) {
  const user = use(promise); // suspends until resolved
  return <div>{user.name}</div>;
}

<Suspense fallback={<Spinner />}>
  <Profile promise={fetchUser(id)} />
</Suspense>
```

`use()` is the only React API that can be called **conditionally** and inside loops. It throws (suspends) until the promise resolves, then re-renders with the value.

Server-side, the promise is created once and streamed. Client-side, you need stable promise references (often created in a Server Component or memoized).

---

### Q17. Error boundary.

```jsx
class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { logError(error, info); }
  render() {
    if (this.state.error) return <p>Error: {this.state.error.message}</p>;
    return this.props.children;
  }
}
```

**React 19** adds `onCaughtError` / `onUncaughtError` options to `createRoot` / `hydrateRoot` for app-wide logging.

Error boundaries do **not** catch: event handlers, async code, SSR exceptions, the boundary itself. Use `try/catch` for those.

---

### Q18. Suspense + lazy code splitting.

```jsx
const Settings = lazy(() => import('./Settings'));

<Suspense fallback={<Spinner />}>
  <Settings />
</Suspense>
```

`React.lazy` returns a component that suspends while loading its module. Wrap in `<Suspense>` to provide a fallback.

---

## 6. Routing State

---

### Q19. Why does my component lose state when I navigate?

Routers (React Router, Next.js) **unmount** components when the route changes. To persist state:
- Lift to a higher router-stable parent.
- Use URL parameters / query string (best for "shareable" state).
- Use storage (`localStorage`, `sessionStorage`).
- Use a state manager (Redux, Zustand) tied to the app, not the route.
- React 19.2's `<Activity mode="hidden">` keeps a subtree mounted but inactive.

---

## 7. Context Patterns

---

### Q20. Provider + consumer hook pattern.

```jsx
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
```

Wrapping `useContext` in a custom hook gives:
- Type inference (TypeScript).
- A clear error when the provider is missing.
- A single import for consumers.

---

## 8. Effects (Deeper)

---

### Q21. Why is my effect firing twice in development?

`<StrictMode>` deliberately mounts → unmounts → remounts every component in development to surface bugs from missing cleanup. Production behavior is unaffected.

If your effect has a side effect like POSTing to an API on mount, that's a sign the work belongs in an **event handler** (intent-driven), not an effect.

---

### Q22. `useEffectEvent` — what does it solve? (React 19.2)

Reading the latest props/state inside an effect without making them dependencies.

```jsx
function Chat({ roomId, onMessage }) {
  const onChange = useEffectEvent((msg) => {
    onMessage(msg); // always uses latest onMessage
  });

  useEffect(() => {
    const conn = connect(roomId);
    conn.on('msg', onChange);
    return () => conn.close();
  }, [roomId]); // onChange is NOT a dep — that's the point
}
```

Stable in React 19.2. **Rule**: don't put `useEffectEvent`-returned functions in dep arrays.

---

### Q23. Synchronize with an external store: `useSyncExternalStore`.

For subscribing to non-React state (Redux, Zustand, browser APIs) in a tearing-safe way:

```jsx
const isOnline = useSyncExternalStore(
  (cb) => {
    window.addEventListener('online', cb);
    window.addEventListener('offline', cb);
    return () => {
      window.removeEventListener('online', cb);
      window.removeEventListener('offline', cb);
    };
  },
  () => navigator.onLine,             // client snapshot
  () => true                          // server snapshot (for SSR)
);
```

---

## 9. Higher-Order Components & Render Props

---

### Q24. When would you write an HOC today?

Rarely. Hooks replace most HOC use cases. HOCs remain for:
- Wrapping with class-only features (error boundary).
- Static augmentation (`connect()` adding props).
- Integrations you don't control (some legacy libraries).

---

### Q25. Render props vs hooks.

```jsx
// Render props
<Mouse>{({x, y}) => <div>{x},{y}</div>}</Mouse>

// Hook
function App() {
  const { x, y } = useMouse();
  return <div>{x},{y}</div>;
}
```

Hooks are simpler — no extra component, no callback hell when composing multiple.

---

## 10. Tests

---

### Q26. How do you test a component?

Use **React Testing Library** + Jest / Vitest. Test from the user's perspective (queries by role/label/text).

```jsx
import { render, screen, fireEvent } from '@testing-library/react';

test('counter increments', () => {
  render(<Counter />);
  fireEvent.click(screen.getByRole('button', { name: '+' }));
  expect(screen.getByText('1')).toBeInTheDocument();
});
```

Avoid: testing implementation details (state shape, internal function names). Avoid `react-test-renderer` — it's deprecated in React 19.

---

### Q27. Async testing with `findBy*`.

```jsx
test('shows user after fetch', async () => {
  render(<Profile id="1" />);
  expect(await screen.findByText(/sharath/i)).toBeInTheDocument();
});
```

`findBy*` queries return a promise that retries until the element appears or times out.

---

## 11. Common Pitfalls

---

### Q28. Why does `useEffect(() => fetch(...), [])` lead to bugs?

- Refetches on every dep change you forgot.
- No abort on unmount → race conditions.
- No retries, no caching, no error recovery.
- Doesn't deduplicate concurrent requests.

Use TanStack Query, SWR, or Server Components for production.

---

### Q29. Why doesn't my child see updated context?

Common causes:
1. You forgot to wrap in `<Provider>`.
2. You're reading the **default** value from `createContext(default)` because the provider is above the consumer in the **render tree but not in scope**.
3. The provider unmounted between value updates (e.g., parent re-mounted via key change).

---

### Q30. State update batched vs not.

Since React 18, all updates (in event handlers, promises, timeouts, native event handlers) are **automatically batched**. Multiple `setX` calls in a single tick = one re-render.

```jsx
function onClick() {
  setA(1); setB(2); setC(3); // ONE render
}
```

Force flush (rare) with `flushSync`:
```jsx
import { flushSync } from 'react-dom';
flushSync(() => setA(1));
flushSync(() => setB(2));
```
