# Next.js — Theoretical / Conceptual Interview Questions

> **Audience**: All levels.
> **Goal**: Show deep understanding of Next.js rendering models, routing, caching, and server/client boundary.
> Verified against [nextjs.org](https://nextjs.org) (Next.js 16.2, May 2026).

---

## 1. Fundamentals

---

### Q1. What is Next.js?

**Short**: A React framework that provides routing, server-side rendering, static generation, streaming, image optimization, bundling, and a server runtime — all batteries-included.

**Deeper**:
- Built by Vercel, open-source.
- Wraps React with conventions (file-based routing, opinionated data fetching).
- Two routers exist today: **App Router** (default, Server Components first) and **Pages Router** (legacy).
- Current stable version is **Next.js 16.2.6** (released March 2026). Source: [Next.js 16.2 blog](https://nextjs.org/blog/next-16-2).

---

### Q2. Next.js App Router vs Pages Router — which to use?

| Aspect              | App Router (`app/`)             | Pages Router (`pages/`)        |
| ------------------- | ------------------------------- | ------------------------------ |
| Default since       | Next.js 13.4 (stable 14)        | Original                       |
| Default render mode | Server Components               | Client Components (CSR/SSR)    |
| Data fetching       | `fetch` in components, Server Actions | `getServerSideProps`, `getStaticProps` |
| Layouts             | Nested via `layout.tsx`         | `_app.tsx` only                |
| Streaming           | First-class (Suspense)          | None                           |
| Status              | Default & recommended           | Still supported, not removed   |

**Verified recommendation**: `create-next-app` ships App Router by default; new projects should adopt it.

---

### Q3. What is the file system convention in the App Router?

Each segment of a URL is a folder under `app/`. Special files:

| File              | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `page.tsx`        | UI for that route (renders the segment)              |
| `layout.tsx`      | Wraps children; persists across child navigations    |
| `loading.tsx`     | Suspense fallback for the segment                    |
| `error.tsx`       | Error boundary (Client Component)                    |
| `not-found.tsx`   | UI for `notFound()` calls / unmatched dynamic routes |
| `route.ts`        | API route (HTTP handler — `GET`, `POST`, etc.)       |
| `template.tsx`    | Like layout but re-mounts on navigation              |
| `default.tsx`     | Fallback for parallel routes (**required** in 16)    |
| `proxy.ts`        | Network-boundary middleware (replaces `middleware.ts`) |

Source: [Next.js Routing docs](https://nextjs.org/docs/app/getting-started/project-structure).

---

### Q4. What does "Server Components by default" mean in App Router?

Every component under `app/` is a **Server Component** unless you mark it with `'use client'` at the top.

Server Components:
- Render on the server, never on the client.
- Can `await` data directly (no `useEffect` fetching).
- Send zero JS to the client.
- Cannot use hooks, state, effects, event handlers, or browser APIs.

Client Components:
- Marked with `'use client'`.
- Render on server (for HTML) and on client (for interactivity).
- Can use the full React hooks API.

The boundary is **directional**: a Client Component cannot import a Server Component, but a Server Component can import a Client Component as a leaf.

---

### Q5. What rendering modes does Next.js support?

| Mode             | Render where | When                          | Use case                       |
| ---------------- | ------------ | ----------------------------- | ------------------------------ |
| **Static**       | Build server | At build time                 | Marketing, docs, blogs         |
| **Dynamic SSR**  | Server       | Per request                   | Authenticated pages            |
| **Streaming SSR**| Server       | Per request, chunked          | Mixed fast/slow data           |
| **CSR**          | Browser      | After hydration               | Highly interactive widgets     |
| **ISR**          | Server       | Build + revalidate            | Mostly-static with fresh bits  |

In App Router these aren't discrete modes — they're **inferred** from how you write your component (uses of `cookies`, `headers`, dynamic params, `'use cache'`, etc.).

---

## 2. Caching Model (Next.js 16)

---

### Q6. Is `fetch` cached by default?

**No — that changed in Next.js 16.**

> "`fetch` requests are not cached by default and will block the page from rendering until the request is complete." — [Fetching Data docs](https://nextjs.org/docs/app/getting-started/fetching-data)

To opt in, use the `"use cache"` directive (Cache Components) or wrap with explicit caching APIs:

```tsx
async function getProducts() {
  "use cache";
  const res = await fetch('https://api.example.com/products');
  return res.json();
}
```

In Next.js 14/15 the default was the opposite: `fetch` cached unless you opted out. **Calling this out in interviews is a key signal.**

---

### Q7. Cache Components — what are they?

A Next.js 16 opt-in (`experimental.cacheComponents: true` in `next.config.js`) that consolidates caching around the `"use cache"` directive.

```tsx
async function ProductList() {
  "use cache";
  cacheLife({ revalidate: 60 });
  cacheTag('products');

  const products = await db.products.findAll();
  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

Replaces the older mix of `unstable_cache`, `fetch.next.revalidate`, and `force-cache` flags.

---

### Q8. `revalidateTag`, `updateTag`, `refresh` — differences?

Next.js 16 reshaped the invalidation API:

| API                  | Where it runs    | What it does                                          |
| -------------------- | ---------------- | ----------------------------------------------------- |
| `revalidateTag(tag, profile)` | Server Actions, route handlers | Marks tagged cache entries stale, re-render on next visit |
| `updateTag(tag)`     | Server Actions only | Read-your-writes — refreshes immediately for the current user |
| `refresh()`          | Server Actions   | Refreshes only uncached data                          |
| `revalidatePath(p)`  | Server Actions, route handlers | Invalidate by path                              |

**Note**: `revalidateTag` now **requires** a `cacheLife` profile as the second arg. Single-arg form is deprecated.

Sources: [Next.js 16 blog](https://nextjs.org/blog/next-16).

---

### Q9. What was the old caching model and why did Next.js change it?

Pre-16 had four caches:
1. Full Route Cache (build-time HTML/RSC).
2. Router Cache (client navigation).
3. Data Cache (`fetch` results).
4. Request Memoization (per-request fetch dedup).

Confusion came from `fetch` being cached by default + multiple invalidation routes. Next.js 16 makes caching **explicit** — code is dynamic unless you opt in via `"use cache"`. Less surprise, more local reasoning.

---

## 3. Rendering & Streaming

---

### Q10. How does streaming work in Next.js App Router?

Place a Server Component that `await`s slow data inside `<Suspense>` (or rely on `loading.tsx`):

```tsx
// app/dashboard/page.tsx
export default function Dashboard() {
  return (
    <>
      <Header />
      <Suspense fallback={<Spinner />}>
        <SlowChart />
      </Suspense>
    </>
  );
}
```

Next.js streams HTML for `<Header />` immediately. When `<SlowChart />` resolves, it streams the rest with a tiny script that swaps the spinner.

---

### Q11. `loading.tsx` — what does it do?

Auto-wraps the segment's `page.tsx` in `<Suspense fallback={<Loading />}>`. While the page's data loads, the user sees the loading UI.

```tsx
// app/dashboard/loading.tsx
export default function Loading() { return <Spinner />; }
```

Trade-off: covers the **whole** segment. For finer-grained streaming, place `<Suspense>` boundaries around specific components.

---

### Q12. `error.tsx` — what does it do?

Defines a React error boundary (Client Component) for the segment:

```tsx
'use client';

export default function Error({ error, reset }: { error: Error, reset: () => void }) {
  return (
    <>
      <h1>Something went wrong</h1>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </>
  );
}
```

Does not catch errors in the segment's `layout.tsx` — for that, put `error.tsx` in the parent segment.

---

## 4. Routing

---

### Q13. Dynamic routes — `[slug]`, `[...slug]`, `[[...slug]]`.

| Syntax              | URL example          | `params`                          |
| ------------------- | -------------------- | --------------------------------- |
| `app/post/[id]/page.tsx`   | `/post/42`     | `{ id: '42' }`                    |
| `app/[...slug]/page.tsx`   | `/a/b/c`       | `{ slug: ['a', 'b', 'c'] }`       |
| `app/[[...slug]]/page.tsx` | `/` or `/a/b`  | `{ slug?: ['a', 'b'] }` (optional catch-all) |

**Important (Next.js 16)**: `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` are now **async**:

```tsx
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div>{id}</div>;
}
```

---

### Q14. Parallel routes & intercepting routes — what are they?

**Parallel routes**: render multiple pages in the same layout via named slots:

```
app/
  @analytics/page.tsx   ← renders into the @analytics slot
  @team/page.tsx        ← renders into the @team slot
  layout.tsx            ← receives them as props
```

```tsx
export default function Layout({ children, analytics, team }) {
  return <>{children}{analytics}{team}</>;
}
```

**Important (Next.js 16)**: every parallel-route slot now **requires** a `default.tsx` — builds fail without it.

**Intercepting routes**: render one URL inside another (e.g., open a photo as a modal over the feed). Syntax: `(.)folder`, `(..)folder`, `(...)folder`.

---

### Q15. `proxy.ts` — what replaced middleware?

In Next.js 16, `middleware.ts` is **deprecated**, replaced by `proxy.ts`:

```ts
// proxy.ts (project root)
import { NextRequest, NextResponse } from 'next/server';

export async function proxy(req: NextRequest) {
  const session = req.cookies.get('session');
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*'] };
```

Differences from middleware:
- Runs on the **Node.js runtime** (not just Edge), so full APIs are available.
- Explicit "network boundary" terminology.
- Edge runtime still available but is no longer the default.

Source: [Next.js 16 blog](https://nextjs.org/blog/next-16).

---

### Q16. `route.ts` — API routes in App Router?

```ts
// app/api/users/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const users = await db.users.findAll();
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const body = await req.json();
  return NextResponse.json({ id: crypto.randomUUID(), ...body });
}
```

Exports per HTTP method. Replaces `pages/api/*.ts` from the Pages Router.

For internal use, **Server Actions** are usually preferable — type-safe, no manual fetch wrapping.

---

## 5. Server Actions

---

### Q17. Server Actions — what & how?

Functions marked `'use server'` that can be invoked from client components — runs on the server, with the framework handling transport, serialization, and revalidation:

```tsx
// app/actions.ts
'use server';
export async function createPost(formData: FormData) {
  await db.posts.create({ title: formData.get('title') });
  revalidatePath('/posts');
}

// Anywhere
<form action={createPost}>
  <input name="title" />
  <button>Create</button>
</form>
```

Works with React 19's `useActionState`, `useFormStatus`, `useOptimistic`.

---

### Q18. What's the security model for Server Actions?

- Each action has a **cryptographic ID** generated at build time — adversaries can't construct arbitrary calls.
- Closures over server state are serialized (with care — don't capture secrets in client-visible closures).
- The framework checks action signatures and origins.
- **Always validate inputs** inside the action — the form data is user-controlled.

---

### Q18a. Middleware (`proxy.ts`) vs Server Actions — when to use which?

These solve **different problems** but both run on the server. Mixing them up is a common interview red flag.

**The one-line distinction**:
- **`proxy.ts` (middleware)**: runs **before** the route is matched. Shapes the **request** (rewrite, redirect, set cookies, gate access).
- **Server Action**: runs **on user invocation** from a Client Component. Performs a **mutation** (DB write, send email, revalidate cache).

**Side-by-side**:

| Aspect                | `proxy.ts` (Middleware)                      | Server Action                                      |
| --------------------- | -------------------------------------------- | -------------------------------------------------- |
| **When it runs**      | Every matched request, before routing        | Only when explicitly invoked from the client       |
| **Trigger**           | URL hits a matched path                      | `<form action={fn}>` or `fn()` call from `'use client'` |
| **Purpose**           | Auth gate, redirects, headers, A/B, rewrites | Database mutations, API calls, business logic      |
| **Inputs**            | `NextRequest` (URL, cookies, headers)        | Typed args (`FormData`, JSON-serializable values)  |
| **Outputs**           | `NextResponse` (redirect, rewrite, next)     | Anything — usually returns to React via `useActionState` |
| **Has CSRF protection?** | You implement it (origin check)           | **Yes** — framework-generated action IDs + origin checks |
| **Runtime (v16)**     | Node by default (was Edge in v15)            | Node (server)                                      |
| **Latency budget**    | Tight — runs on **every** matched request    | Per-invocation; user is actively waiting           |
| **Cache invalidation** | Cannot revalidate directly                  | `revalidatePath` / `revalidateTag` / `updateTag`   |
| **DB access**         | Discouraged — adds latency to all routes     | Idiomatic                                          |
| **Progressive enhancement** | Transparent (it's HTTP)                | ✅ — works without JS via `<form action={fn}>`     |
| **Auth role**         | **Optimistic** check ("does session cookie exist?") | **Authoritative** — verify and authorize inside |

**Examples of correct usage**:

```ts
// proxy.ts — optimistic auth gate; redirect early so no rendering wasted
export async function proxy(req: NextRequest) {
  const hasSession = req.cookies.has('session');
  if (!hasSession && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}
```

```ts
// app/posts/actions.ts — authoritative mutation
'use server';
export async function createPost(formData: FormData) {
  const session = await getSession();       // ✅ verify here, not in proxy
  if (!session?.user) throw new Error('unauthorized');
  await db.posts.create({ ...parse(formData), userId: session.user.id });
  revalidatePath('/posts');
}
```

**Anti-patterns**:
- ❌ Doing DB lookups in `proxy.ts` — every request pays the latency.
- ❌ Treating `proxy.ts` as the auth boundary — it's a fast-path shield. Always re-verify inside Server Components / Server Actions / Route Handlers.
- ❌ Using Server Actions for read-only data fetching — that belongs in Server Components.
- ❌ Mutating state in a Route Handler when a Server Action would do — Actions get progressive enhancement + framework-managed CSRF for free.

**Mental model**: middleware shapes **what gets to your app**; Server Actions are **what your app does** when the user clicks something.

---

## 6. Static / Dynamic Inference

---

### Q19. How does Next.js decide static vs dynamic?

In App Router, a page is **static-renderable** unless something forces it dynamic:
- Accessing `cookies()` / `headers()` / `draftMode()`.
- Reading `searchParams`.
- Using uncached data (in Next 16, that's any plain `fetch`).
- Calling `noStore()` (Next 15) or marking with explicit dynamic config.

You can override with route segment config:
```ts
export const dynamic = 'force-dynamic'; // 'auto' | 'force-dynamic' | 'force-static' | 'error'
export const revalidate = 60;
export const runtime = 'nodejs';        // 'edge' | 'nodejs'
```

---

### Q20. `generateStaticParams` — pre-render dynamic routes at build.

```tsx
// app/post/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await db.posts.findAll();
  return posts.map(p => ({ slug: p.slug }));
}
```

Next.js statically pre-renders one HTML per slug. With ISR, you can also generate on-demand (`dynamicParams: true`) and revalidate.

---

## 7. Bundling & Runtime

---

### Q21. Turbopack — what is it?

Rust-based bundler (Vercel) that replaces Webpack.

**Verified (Next.js 16)**:
- Default bundler for **both** `next dev` and `next build` (production).
- Opt out: `next dev --webpack`, `next build --webpack`.
- Filesystem caching (beta).
- Much faster cold start and HMR than Webpack.

Source: [Next.js Turbopack docs](https://nextjs.org/docs/app/api-reference/turbopack).

---

### Q22. Edge runtime vs Node runtime — when to choose each?

| Aspect           | Edge                          | Node                                |
| ---------------- | ----------------------------- | ----------------------------------- |
| APIs available   | Web Standard only             | Full Node.js                        |
| Cold start       | ~5 ms                         | ~50–300 ms                          |
| Globally distributed | Yes                       | Region-bound                        |
| Native modules   | No                            | Yes                                 |
| Best for         | Auth checks, redirects, A/B   | DB queries, heavy logic, file I/O   |

Switch with `export const runtime = 'edge'` per route. Next.js 16's `proxy.ts` runs on Node by default.

---

### Q23. React Compiler in Next.js?

**Verified**: React Compiler 1.0 is stable (October 2025). Enable in `next.config.js`:

```js
module.exports = {
  experimental: { reactCompiler: true }
};
```

The compiler auto-memoizes — most manual `useMemo` / `useCallback` / `React.memo` becomes redundant.

---

## 8. Optimizations

---

### Q24. `next/image` — what does it do?

Wraps `<img>` with:
- Automatic format negotiation (WebP/AVIF).
- Responsive `srcset` generation.
- Lazy loading by default.
- Built-in optimization endpoint (`/_next/image?url=...`).
- Blur placeholder.

**Verified Next.js 16 default changes**:
- `minimumCacheTTL`: 60s → 14400s (4 h).
- `qualities` default: `[75]`.
- Local IP optimization blocked by default.
- `images.domains` deprecated — use `images.remotePatterns`.
- `next/legacy/image` deprecated.

---

### Q25. `next/font` and `next/script`?

`next/font`: loads fonts at build time, self-hosts them, eliminates layout shift (CLS). Inline by default — no external requests.

`next/script`: optimized `<script>` loading with strategies (`beforeInteractive`, `afterInteractive`, `lazyOnload`, `worker`).

---

### Q26. Metadata API.

Next.js 14+ provides a typed metadata API:

```tsx
// app/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sharath — Profile',
  description: '...',
  openGraph: { ... }
};

// Or dynamic:
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPost((await params).slug);
  return { title: post.title };
}
```

Generates `<title>`, `<meta>`, `<link>` tags. Works seamlessly with React 19's document metadata hoisting.

---

## 9. Misc / Deprecations

---

### Q27. What was removed in Next.js 16?

**Verified**:
- `next lint` removed (use Biome / ESLint directly).
- AMP support removed.
- `serverRuntimeConfig` / `publicRuntimeConfig` removed (use env vars).
- `experimental.ppr` removed (folded into Cache Components).
- `images.domains` deprecated (use `remotePatterns`).
- `next/legacy/image` deprecated.
- `middleware.ts` → `proxy.ts`.
- `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` are async.
- Node.js 20.9+ required.

Source: [Upgrading to Version 16](https://nextjs.org/docs/app/guides/upgrading/version-16).

---

### Q28. Next.js DevTools MCP — what is it?

A Model Context Protocol server bundled with Next.js 16 that exposes:
- Route tree
- Cache state
- Build errors
- Performance traces

…to AI assistants (Claude, Cursor) and other tools. Helps debug without leaving the editor.

---

### Q29. Internationalization in Next.js?

Two approaches:
1. **Sub-path routing**: `app/[locale]/page.tsx` + `proxy.ts` redirects.
2. **Library**: `next-intl`, `next-i18next`, `react-i18next`.

Built-in i18n routing exists in Pages Router; App Router prefers the sub-path approach.

---

### Q30. Deployment options for Next.js?

- **Vercel** (first-class, edge + Node, ISR).
- **Self-host Node server**: `next start`, plus a reverse proxy.
- **Standalone output**: `output: 'standalone'` produces a minimal Node app for Docker.
- **Static export**: `output: 'export'` for fully static sites (no Server Actions, no ISR, no dynamic routes).
- **Adapters**: Netlify, AWS Amplify, Cloudflare Pages — feature parity varies; check what's needed.

---

## Final Senior Tips

1. **Always state which router** (App vs Pages) you're answering for.
2. **Caching is now opt-in** in Next.js 16 — don't assume `fetch` is cached.
3. **`middleware.ts` → `proxy.ts`**, async params/cookies — call these out as upgrade hazards.
4. **Server Components first** — push interactivity to small client-leaf components.
5. **Streaming is cheap** with Suspense — don't wait for everything before sending anything.
