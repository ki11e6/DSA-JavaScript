# React — Easy Interview Questions

> **Audience**: Junior / fresher / phone-screen rounds.
> **Goal**: Show solid foundations: JSX, components, props, state, basic hooks, lists, forms.
> Verified against [react.dev](https://react.dev) (React 19.2, May 2026).

---

## 1. JSX & Components

---

### Q1. Write a "Hello, World" component.

```jsx
function Hello({ name = 'World' }) {
  return <h1>Hello, {name}!</h1>;
}

// Usage:
<Hello name="Sharath" />;
```

**Why default destructuring?** React 19 removed `defaultProps` for function components — use ES default parameters instead.

---

### Q2. Why must JSX have a single root element?

JSX compiles to one `React.createElement(...)` call per expression. Two sibling roots = two values, which isn't a valid JS expression.

Use a **Fragment** to avoid wrapping in an extra DOM node:

```jsx
return (
  <>
    <header />
    <main />
  </>
);
```

`<></>` is shorthand for `<React.Fragment></React.Fragment>`. Use the long form when you need a `key` (e.g., inside a list).

---

### Q3. Difference between `class` and `className`.

`class` is a reserved word in JS. JSX uses `className` for CSS classes.

```jsx
<div className="card primary" />
```

For dynamic classes, template strings, or libraries like `clsx`:

```jsx
<div className={`card ${active ? 'on' : ''}`} />
```

---

### Q4. Why does this component re-render on every render of the parent?

```jsx
function Parent() {
  const [n, setN] = useState(0);
  return <Child onClick={() => setN(n+1)} />;
}
```

The inline arrow `() => setN(n+1)` is a **new function reference** every render. Even if `Child` is `React.memo`'d, props differ.

Fix with `useCallback` — or with React Compiler enabled (stable since Oct 2025), this is auto-memoized.

---

## 2. Props

---

### Q5. How do you pass a child element as a prop?

Anything between opening/closing tags arrives as the special `children` prop:

```jsx
function Card({ children }) {
  return <div className="card">{children}</div>;
}

<Card><h1>Hi</h1></Card>;
```

For multiple slots, pass JSX as named props:

```jsx
<Layout header={<Nav />} sidebar={<Menu />} />
```

---

### Q6. What is prop drilling?

Passing a prop through intermediate components that don't use it, just to reach a deep child.

```jsx
<App user={u}><Page user={u}><Header user={u}><Avatar user={u} /></Header></Page></App>
```

**Fixes** (easy → heavy):
1. Move the consumer into a child position via `children` (composition).
2. `useContext` for shared values.
3. State libraries (Zustand, Redux) for app-wide state.

---

### Q7. Difference between `props.children` and explicit props?

`children` is positional (whatever is *inside* the JSX tags). Explicit props are named slots. Use children for the "main content" and named props when you need multiple slots.

---

## 3. State Basics

---

### Q8. Counter component (using `useState`).

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <>
      <span>{count}</span>
      <button onClick={() => setCount(c => c + 1)}>+</button>
      <button onClick={() => setCount(c => c - 1)}>-</button>
    </>
  );
}
```

**Why `c => c + 1`** (functional updater)? When multiple `setCount` calls are batched, each gets the *latest* state instead of a stale closure.

---

### Q9. Why does calling `setState` twice with `+1` only add 1?

```jsx
function onClick() {
  setCount(count + 1);
  setCount(count + 1);
}
```

Both reads see the *current* render's `count`. They both compute `count + 1` from the same starting value. Final state = `count + 1`, not `+2`.

**Fix**:
```jsx
setCount(c => c + 1);
setCount(c => c + 1);
```

---

### Q10. How do you update an object/array in state?

Never mutate. Always create a new reference.

```jsx
// 👎 React doesn't see the change
user.name = 'A';
setUser(user);

// 👍
setUser(prev => ({ ...prev, name: 'A' }));
setItems(prev => [...prev, newItem]);
setItems(prev => prev.filter(x => x.id !== id));
setItems(prev => prev.map(x => x.id === id ? { ...x, done: true } : x));
```

---

### Q11. Two siblings need the same state — what do you do?

**Lift state up** to their common parent. Pass the value down as a prop and a setter as another prop.

```jsx
function Parent() {
  const [n, setN] = useState(0);
  return (<><Display n={n} /><Controls onInc={() => setN(n+1)} /></>);
}
```

---

## 4. Lists

---

### Q12. Render a list with keys.

```jsx
function TodoList({ todos }) {
  return (
    <ul>
      {todos.map(t => (
        <li key={t.id}>{t.text}</li>
      ))}
    </ul>
  );
}
```

**Why key**? React uses keys to match elements between renders. Without stable keys, reorders cause component state mix-ups.

**When is `key={index}` okay?** Static lists that never reorder, insert, or delete. Otherwise, prefer a stable `id`.

---

### Q13. How do you conditionally render?

```jsx
{isLoading && <Spinner />}
{user ? <Profile /> : <Login />}
{count > 0 && <Badge n={count} />}
```

**Gotcha**: `{count && <X />}` renders the literal `0` when `count === 0`. Use `count > 0 && ...` or `Boolean(count) && ...`.

---

## 5. Events

---

### Q14. How do you handle events in React?

camelCase prop, function reference:

```jsx
<button onClick={handleClick}>Click</button>
```

Inline:
```jsx
<button onClick={() => save(id)}>Save</button>
```

To pass arguments, wrap in an arrow. Don't write `onClick={save(id)}` — that *calls* `save` on render.

---

### Q15. How do you prevent default form submission?

```jsx
function Form() {
  const [v, setV] = useState('');
  function submit(e) {
    e.preventDefault();
    // ...
  }
  return (
    <form onSubmit={submit}>
      <input value={v} onChange={e => setV(e.target.value)} />
      <button>Save</button>
    </form>
  );
}
```

In React 19, `<form action={fn}>` (Actions) automatically handles `preventDefault` and gives you `useFormStatus`/`useActionState` for pending/error state.

---

## 6. Forms

---

### Q16. Controlled input?

```jsx
function NameInput() {
  const [name, setName] = useState('');
  return <input value={name} onChange={e => setName(e.target.value)} />;
}
```

The DOM never "owns" the value — React state is the source of truth.

---

### Q17. Uncontrolled input with `useRef`?

```jsx
function Form() {
  const ref = useRef(null);
  function submit() { console.log(ref.current.value); }
  return <><input ref={ref} defaultValue="" /><button onClick={submit}>Go</button></>;
}
```

Faster for very long forms (no re-render per keystroke).

---

## 7. Effects

---

### Q18. Fetch on mount.

```jsx
function User({ id }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const ac = new AbortController();
    fetch(`/api/users/${id}`, { signal: ac.signal })
      .then(r => r.json())
      .then(setUser)
      .catch(e => { if (e.name !== 'AbortError') console.error(e); });
    return () => ac.abort();
  }, [id]);

  if (!user) return <div>Loading…</div>;
  return <div>{user.name}</div>;
}
```

**Why `AbortController`?** Without it, a stale fetch can resolve *after* a newer one and overwrite fresh data.

In dev with `<StrictMode>`, effects run twice — the cleanup keeps this safe.

---

### Q19. Run effect only once on mount.

```jsx
useEffect(() => {
  console.log('mounted');
  return () => console.log('unmounted');
}, []);
```

Note: in dev `<StrictMode>`, this runs → cleans up → runs again. Production runs it once.

---

### Q20. Why is my effect running on every render?

You forgot the dependency array, or one of the dependencies is a fresh reference every render (inline object, inline function).

```jsx
useEffect(() => { ... }); // 🚫 no deps → every render
useEffect(() => { ... }, [{ id: 1 }]); // 🚫 new object every render
```

---

## 8. Hooks Rules

---

### Q21. Why can't I call a hook inside an `if`?

React matches hook calls by **call order**, not name. If a hook is conditionally skipped, every later hook ends up in the wrong slot.

✅ Always at the top level of the component / custom hook.

---

### Q22. What's a custom hook?

A function whose name starts with `use` that internally calls other hooks. Lets you share stateful logic between components.

```jsx
function useToggle(initial = false) {
  const [on, set] = useState(initial);
  return [on, () => set(o => !o)];
}

const [open, toggle] = useToggle();
```

---

## 9. Misc

---

### Q23. Difference between `useRef` and `useState`?

| `useState`                          | `useRef`                              |
| ----------------------------------- | ------------------------------------- |
| Mutating triggers re-render         | Mutating does **not** trigger re-render |
| Read in render is reactive          | Read in render gives "latest" sync value |
| Use for UI-visible data             | Use for timers, prev values, DOM refs |

---

### Q24. How do you set a CSS style inline?

```jsx
<div style={{ color: 'red', backgroundColor: '#eee' }} />
```

Object form, camelCase keys (`backgroundColor`, not `background-color`).

---

### Q25. Difference between `null`, `undefined`, `false`, `0` in JSX?

- `null`, `undefined`, `false`, `true` → render **nothing**.
- `0` → renders the text `"0"`.

So `{count && <X />}` renders `0` when count is 0. Use `{count > 0 && <X />}`.

---

### Q26. How do you import / export components?

```jsx
// Default export
export default function Card() { ... }
import Card from './Card';

// Named export
export function Card() { ... }
import { Card } from './Card';
```

Named exports are friendlier for IDE rename refactoring and avoid the "what name did I give it on import" inconsistency.

---

### Q27. What's `React.StrictMode`?

A dev-only wrapper that:
- Double-invokes function bodies, effects, and reducers to surface side-effect bugs.
- Warns on deprecated APIs.
- Does nothing in production.

Always wrap your app root in it during development.

---

### Q28. How do you debug a component that won't update?

1. Confirm state mutation: `setX(prev => ...)`, not `x.push(...)`.
2. Check `key` stability in lists.
3. Verify the parent isn't passing a brand-new prop value (object/function) that breaks `React.memo`.
4. Add `console.log` at the top of the component to confirm renders.
5. Use React DevTools "Why did this render?" highlight feature.

---

### Q29. Difference between `useEffect` and an event handler?

- **Event handler**: runs in response to a user action. Synchronous with the event. Use for *intent-driven* code (button click, form submit).
- **Effect**: runs after commit. Use for *synchronization* with external systems (API, subscriptions, timers).

Rule of thumb: "Would this fire even without a user doing something?" If yes, it's an effect.

---

### Q30. What's `React.Fragment`'s purpose?

To group multiple elements without adding a wrapper DOM node. Saves CSS/layout pain and keeps the DOM clean. Shorthand: `<>...</>`.
