# Next.js — Latest Interview Questions (2025–2026)

> **Audience**: Interview prep for 2025–2026 rounds.
> **Focus**: Next.js 15 → 16 migration, App Router mastery, Server Actions, caching internals, common production gotchas.
> **Verified** against [nextjs.org](https://nextjs.org), Vercel blog, Auth0 / BeyondIT migration guides, and aggregated 2025–2026 interview reports.

---

## 1. Next.js 15 → 16 Migration

---

### Q1. Why are `params`, `searchParams`, `cookies()`, and `headers()` async in Next.js 16, and how do you migrate?

**Why**: To enable Partial Prerendering — Next.js can stream the static shell *before* request-bound data is resolved. Sync access blocked that optimization.

**Sync access is fully removed in v16.**

```tsx
// Old
export default function Page({ params }: { params: { id: string } }) {
  return <h1>{params.id}</h1>;
}

// New
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <h1>{id}</h1>;
}
```

Migrate with the codemod:
```bash
npx @next/codemod@latest next-async-request-api .
```

Generate types with `npx next typegen` (`PageProps`, `LayoutProps`, `RouteContext`).

---

### Q2. Why was `middleware.ts` renamed to `proxy.ts` in v16, and what should NOT live there?

**Rationale**: "Middleware" was confused with Express middleware. "Proxy" better reflects its role as a thin network boundary in front of the app.

**Key change**: `proxy.ts` now defaults to **Node.js runtime** (full APIs available).

**Don't put in `proxy.ts`**:
- Authoritative auth (DB lookups, JWT signature verification).
- Anything slow — it runs on every matched request.

**Do**:
- Optimistic checks ("does a session cookie exist?").
- Redirects, geo-routing, A/B tests.

Real auth belongs in **layouts, Server Components, or a Data Access Layer**.

**Famous migration bug**: a "logout loop" where `proxy.ts` doesn't pass the response header so the cookie never clears (Supabase / Auth.js / Clerk users all hit this).

---

### Q3. `fetch` is no longer cached by default in v16. What's the new mental model?

With **Cache Components** (`cacheComponents: true`), **nothing is cached unless you explicitly mark it**.

Use `"use cache"` at route, component, or function level:

```tsx
async function getProducts() {
  "use cache";
  cacheLife({ revalidate: 60 });
  cacheTag('products');
  return db.products.all();
}
```

The compiler derives cache keys from closure inputs + arguments.

---

### Q4. Difference between `revalidateTag` and the new `updateTag`?

- **`updateTag(tag)`** (Server Actions only) — **read-your-writes**: expires the entry immediately, the next request waits for fresh data.
- **`revalidateTag(tag, profile)`** — stale-while-revalidate: serves stale, refreshes in background.

Plus: `revalidateTag` now **requires** a second `cacheLife` profile argument; the single-arg form is deprecated.

```ts
'use server';
export async function postComment(formData: FormData) {
  await db.comments.create(/* ... */);
  await updateTag('comments');                          // current user sees their comment now
  revalidateTag('comments', { revalidate: 60 });        // others within 60s
}
```

---

### Q5. What breaks with parallel routes in v16?

Hard navigation to an unmatched slot now **errors unless every `@slot` has a `default.tsx`**. Pre-16 you could leave `default.tsx` off — builds will fail in 16.

```
app/dashboard/
  layout.tsx
  @analytics/page.tsx
  @analytics/default.tsx       ← REQUIRED in 16
  @team/page.tsx
  @team/default.tsx            ← REQUIRED in 16
```

Even if it returns `null`, the file must exist.

---

### Q6. Where did `next lint` go?

**Removed in v16.** Run ESLint directly (`eslint .`) or use Biome. Add it to `package.json` scripts yourself.

---

## 2. App Router & Routing

---

### Q7. Difference between route groups `(marketing)`, parallel routes `@slot`, and intercepting routes `(.)`?

- **Route groups `(name)`**: organize folders without affecting the URL. Useful for shared layouts per section.
- **Parallel routes `@slot`**: render multiple slots simultaneously inside one layout. Each has independent navigation/loading/error.
- **Intercepting routes `(.)`, `(..)`, `(...)`**: override a route when navigated to from elsewhere. Classic: parallel + intercepting for **modals over feed** (`/feed` → `/photo/[id]` renders modal in slot; hard reload renders full page).

---

### Q8. Where do `loading.tsx` and `error.tsx` fit, and what is a Suspense boundary?

Each segment can declare:
- **`loading.tsx`** — auto Suspense fallback.
- **`error.tsx`** — auto error boundary (must be Client Component).

For finer control, use `<Suspense>` **inside a page** to stream individual slow children — each boundary is an independent hydration unit.

---

## 3. Server vs Client Components

---

### Q9. When do you push a component to the client, and how do you keep the boundary small?

Only when you need: hooks, browser APIs, or event handlers.

**Keep `'use client'` at the leaf**:
- Pass server-fetched data down as serializable props.
- Pass Server Components as `children` props into Client Components — they stay server-side.

```tsx
// Server Component
<ClientShell><ServerHeavyTree /></ClientShell>
```

`ServerHeavyTree` ships zero JS even though it lives inside `ClientShell`.

---

### Q10. Most common Server/Client mistake?

Importing a Server Component directly into a Client Component (`import Sc from './sc'` in a `'use client'` file). Fix: pass via `children` or `props`.

Also: non-serializable props (functions other than Server Actions, Dates with methods, class instances) crash the boundary.

---

## 4. Server Actions

---

### Q11. What's the security model?

- Server Actions are POST endpoints with auto-generated **obfuscated IDs**.
- Framework-managed **CSRF check** (Origin vs Host header).
- You **still must** do your own authn/authz inside the action — the framework does NOT do it for you.
- Validate input with Zod; treat the action like a public API.

```ts
'use server';
import { z } from 'zod';

const Schema = z.object({ title: z.string().min(3) });

export async function createPost(formData: FormData) {
  const session = await getSession();
  if (!session?.user) throw new Error('unauthorized');

  const data = Schema.parse(Object.fromEntries(formData));
  await db.posts.create({ ...data, userId: session.user.id });
  revalidatePath('/posts');
}
```

---

### Q12. Show a production form with `useActionState` + `useFormStatus` + `useOptimistic`.

```tsx
'use client';

function CommentForm() {
  const [state, action, pending] = useActionState(postComment, { error: null });
  const [optimistic, addOptimistic] = useOptimistic([], (s, c) => [...s, c]);

  async function handle(fd: FormData) {
    addOptimistic({ id: 'temp', body: fd.get('body') });
    await action(fd);
  }

  return (
    <form action={handle}>
      <input name="body" />
      <SubmitBtn />
      {state.error && <p>{state.error}</p>}
      <ul>{optimistic.map(c => <li key={c.id}>{c.body}</li>)}</ul>
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? '…' : 'Send'}</button>;
}
```

---

### Q13. Progressive enhancement — what makes it work?

Server Actions submit as a real `<form>` POST. Without JS:
- Browser submits normally.
- Server runs the action and returns the page.

Don't wrap submit in `onClick` handlers — keep `<form action={...}>` so no-JS clients still submit.

---

## 5. Caching Strategy

---

### Q14. `"use cache"` vs `unstable_cache`?

`"use cache"` is the v15+ stable directive. The compiler derives the cache key from **closure inputs + arguments** — no manual key plumbing.

`unstable_cache` requires explicit keys and tags — more flexibility, more error-prone.

New code: **`"use cache"` with `cacheTag()` and `cacheLife()`**.

---

### Q15. `revalidatePath` vs `revalidateTag` vs `updateTag`?

- **`revalidatePath('/posts')`** — busts everything rendered for that path.
- **`revalidateTag('comments', { revalidate: 60 })`** — busts entries with that tag (SWR semantics).
- **`updateTag('comments')`** — immediate invalidation inside Server Action for read-your-writes.

---

### Q16. How do you reduce RSC payload size?

- Don't pass huge objects through Client Component props (they get serialized into the payload).
- Memoize fetches with `"use cache"`.
- Avoid leaking entire DB rows — `SELECT` only needed fields.
- Split `<Suspense>` boundaries so payloads stream incrementally.

---

## 6. Performance / Runtime

---

### Q17. When Edge over Node runtime?

- **Edge**: lightweight, globally distributed, low-latency. Limited APIs (no `fs`, no native modules, smaller crypto). Memory ceiling.
- **Node**: anything using Node APIs, Prisma, heavy CPU, or large bundles.

In v16, both `proxy.ts` and route handlers **default to Node**. Switch per-route with `export const runtime = 'edge'`.

---

### Q18. Turbopack stable for dev AND build in v16 — what changes?

- Default bundler for `next dev` and `next build`.
- Big cold-build wins.
- Custom Webpack plugins, some loaders, and legacy CSS-in-JS may need migration.
- Verify any `next.config.js > webpack` block.
- Opt out: `next dev --webpack`, `next build --webpack`.

---

## 7. Auth

---

### Q19. Reading cookies in a Server Component now (v16).

```tsx
import { cookies } from 'next/headers';

export default async function Page() {
  const store = await cookies();
  const token = store.get('session')?.value;
  // ...
}
```

Verify in a Data Access Layer function called from layouts/pages. **Do not rely on `proxy.ts` for authorization** — it's an optimistic shield, not the auth boundary.

---

### Q20. Auth.js + App Router pitfall.

Don't call `auth()` inside `proxy.ts` for **DB-backed** sessions — it forces Node runtime and slows every request.

**Pattern**: JWT strategy in the proxy for optimistic check; full session lookup in a `getServerSession()`-style helper inside layouts.

---

## 8. Images, Fonts, Scripts

---

### Q21. What changed about `next/image` defaults in v16?

- `minimumCacheTTL`: 60s → **14400s (4h)**.
- `qualities` default: `[75]`.
- Local IP optimization blocked by default.
- **`images.domains` deprecated** — migrate to `images.remotePatterns`.
- `next/legacy/image` deprecated.

---

### Q22. `next/font` and `next/script` best practices.

`next/font` self-hosts at build time — zero external requests, zero CLS. **Never** add Google Fonts via raw `<link>` for App Router.

`next/script` with strategies: `beforeInteractive`, `afterInteractive` (default), `lazyOnload`, `worker`.

---

## 9. React Compiler Integration

---

### Q23. What does `experimental.reactCompiler: true` do in Next.js?

Enables build-time auto-memoization. Most `useMemo`/`useCallback`/`React.memo` become unnecessary.

**Silently skips** components that violate Rules of React (mutating props, side effects in render) — impure code just won't optimize. Use the lint rule (`react-hooks/unsupported-syntax`) to surface this.

Stable React Compiler 1.0 since **October 2025**.

---

## 10. Production Gotchas

---

### Q24. Top hydration mismatch causes in 2026?

1. `Date.now()` / `Math.random()` in render.
2. Locale-dependent formatting.
3. `typeof window !== 'undefined'` branches.
4. **Browser extensions** injecting attributes (`cz-shortcut-listen` from ColorZilla, Grammarly's `data-gr-*`).
5. Invalid HTML nesting (`<p>` containing `<div>`).

Fix:
- Use `suppressHydrationWarning` only at the attribute level.
- Gate dynamic values behind `useEffect` or `'use client'` with `dynamic(() => ..., { ssr: false })`.

---

### Q25. Why does my stream "buffer" all the way to the end?

Two common culprits:
1. **A blocking `await` ABOVE your `<Suspense>` boundary** — must move it into the suspended child.
2. **Edge proxy buffering** the `text/x-component` content type. Check Cloudflare buffering, nginx `proxy_buffering off`.

---

### Q26. Multi-instance cache propagation?

`revalidateTag` on a single Vercel instance **doesn't auto-propagate** across regions instantly.

- **Vercel**: rely on the shared Data Cache + tag-based invalidation.
- **Self-hosted**: configure a shared cache handler in `next.config.js > cacheHandler` (Redis adapter, etc.).

Without it, each pod revalidates independently — users hitting different pods see different cache states.

---

### Q27. Sanity-check before shipping Next 16 to prod.

1. Run `npx @next/codemod@latest next-async-request-api .` for async params.
2. Rename `middleware.ts` → `proxy.ts`, audit cookie response headers.
3. Add `default.tsx` to every parallel-route slot.
4. Audit `fetch` calls — wrap with `"use cache"` where you previously relied on default caching.
5. Replace `revalidateTag(tag)` with `revalidateTag(tag, profile)`.
6. Replace `images.domains` with `images.remotePatterns`.
7. Replace `next lint` with `eslint .` / Biome in CI.
8. Bump Node to **20.9+** (required).

---

## Final Senior Tips

1. **State the rendering mental model first** — Server Components default, Client at leaves.
2. **Caching is opt-in (v16)** — be precise: `"use cache"`, `cacheLife`, `cacheTag`, `revalidateTag`.
3. **`proxy.ts` ≠ auth** — it's an optimistic shield, not the boundary.
4. **Migration sequence matters** — async APIs → proxy rename → caching adjustments → parallel route defaults.
5. **Hydration mismatches in 2026 are usually browser extensions** — call this out.

---

## Sources

- [Upgrading to Version 16 — Next.js docs](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js 16 release blog](https://nextjs.org/blog/next-16)
- [Renaming Middleware to Proxy](https://nextjs.org/docs/messages/middleware-to-proxy)
- [proxy.js file convention](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [BeyondIT — middleware to proxy migration](https://beyondit.blog/blogs/nextjs-16-1-migration-middleware-to-proxy)
- [Auth0 — What's New for Authentication in Next.js 16](https://auth0.com/blog/whats-new-nextjs-16/)
- [Cache Components config](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)
- [`use cache` directive](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- [`revalidateTag`](https://nextjs.org/docs/app/api-reference/functions/revalidateTag) / [`updateTag`](https://nextjs.org/docs/app/api-reference/functions/updateTag)
- [Vercel — updateTag vs revalidateTag discussion](https://github.com/vercel/next.js/discussions/84805)
- [Parallel Routes](https://nextjs.org/docs/app/api-reference/file-conventions/parallel-routes)
- [Senior-Level Next.js Interview Questions — Aayush Pagare](https://medium.com/@aayushpagare21/senior-level-next-js-interview-questions-part-1-571b85306b94)
- [Frontend Interview Strategy 2026 — Medium](https://medium.com/@gopesh.jangid/frontend-interview-strategy-2026-mastering-next-js-react-19-and-full-stack-performance-c63727be06a0)
- [Server Actions Complete Guide 2026 — Makerkit](https://makerkit.dev/blog/tutorials/nextjs-server-actions)
- [Hydration Errors in 2026 — Medium](https://medium.com/@blogs-world/next-js-hydration-errors-in-2026-the-real-causes-fixes-and-prevention-checklist-4a8304d53702)
- [Streaming guide](https://nextjs.org/docs/app/guides/streaming)
- [Taming Caching in v15 & v16 — Zignuts](https://www.zignuts.com/blog/blog-nextjs-caching-production-guide-v15-v16)
