# Next.js — Hard Interview Questions

> **Audience**: Senior / staff / architect rounds.
> **Goal**: Show deep mastery of the rendering pipeline, caching internals, runtime tradeoffs, RSC payload, build/deploy semantics, performance forensics.
> Verified against [nextjs.org](https://nextjs.org) (Next.js 16.2, May 2026).

---

## 1. Rendering Pipeline Internals

---

### Q1. What is the RSC payload?

The **React Server Components payload** is a serialized, streamed format the Next.js server emits when rendering App Router routes. It includes:
- A description of the rendered tree in a special wire format (rows of `M:`, `J:`, etc.).
- References to Client Components by their build-stable IDs.
- Serialized props for those Client Components.
- Suspense placeholders and the data to fill them.

The client-side React reads this stream and reconciles it into the existing tree — without re-running Server Components.

This is why navigation between two App Router pages doesn't re-download HTML — it fetches a smaller RSC payload and patches the tree.

---

### Q2. Walk me through what happens on the first request to an App Router page.

1. Request hits Next.js (Node runtime, Vercel edge, etc.).
2. `proxy.ts` runs (if any), can rewrite/redirect/auth.
3. Router matches segments, builds the "client component tree".
4. Server starts rendering top-down.
5. Static Server Components render synchronously.
6. Async Server Components `await` data — suspended subtrees show `<Suspense>` fallback in HTML.
7. Server streams HTML chunks **and** RSC payload chunks via `Transfer-Encoding: chunked`.
8. Browser parses HTML as it arrives; React hydrates progressively.
9. As more data resolves on the server, it streams more chunks → browser replaces fallbacks.
10. Final hydration completes; Client Components become interactive.

---

### Q3. What's hydrated vs not?

Only Client Components (`'use client'`) need hydration — React must attach event handlers, state, and refs to existing DOM. Server Components produce HTML but no client JS, so there's nothing to hydrate.

This is why RSC bundles can be far smaller: marketing pages with no `'use client'` ship near-zero JS.

---

## 2. Caching Internals

---

### Q4. Why did Next.js change the `fetch` default in 16?

**Verified rationale** (from [Next.js 16 blog](https://nextjs.org/blog/next-16)): the old default — cached by default — surprised teams when prod served stale data. Cache invalidation became "where's the leak?" debugging.

Next.js 16's default: nothing cached unless you opt in. Opt-in via `"use cache"` directive. Result:
- More predictable production behavior.
- Local reasoning — read a function, see its caching.
- Tradeoff: forces explicit caching boilerplate.

---

### Q5. Explain `"use cache"` semantics in detail.

```tsx
async function getProducts() {
  "use cache";
  cacheLife({ revalidate: 60, expire: 3600 });
  cacheTag('products');
  return db.products.all();
}
```

- **Memoization** per server: identical calls within the request dedupe.
- **Cross-request cache**: keyed by function identity + serialized args.
- **Revalidate**: after `revalidate` seconds, the next request triggers async refresh; users see stale until refresh completes.
- **Expire**: after `expire` seconds, force-recompute (no stale serving).
- **Tags**: invalidation via `revalidateTag(tag)`.

Requires `experimental.cacheComponents: true`. Replaces the older `unstable_cache` and most `fetch.next.revalidate` use cases.

---

### Q6. `revalidateTag` profile arg — what changed?

Pre-16:
```ts
revalidateTag('products'); // single-arg
```

Next 16 deprecates that. New form:
```ts
revalidateTag('products', { revalidate: 60 });    // SWR-style
revalidateTag('products', 'minutes');             // built-in profile
```

The profile tells Next how long the revalidation grace period should be — gives finer control over cache propagation.

---

### Q7. Read-your-writes: `updateTag` vs `revalidateTag`.

**Problem**: User submits a comment via Server Action. `revalidateTag('comments')` marks entries stale, but the user expects to see their comment **immediately**, not on next request.

**Solution**: `updateTag('comments')` — Server-Action only. Tells Next.js to bypass cache **for the current user's next navigation** so they read-their-write. Other users see stale until normal revalidation kicks in.

This combination — eventual consistency for the world, strong consistency for the actor — is what gives RSC the "feels instant" UX.

---

## 3. Server / Client Boundary

---

### Q8. What gets sent to the client vs server-only?

- **Server Component code**: stays on server. Imports of `fs`, `db`, secrets — never bundled to client.
- **Client Component code**: bundled, shipped, hydrated.
- **Shared modules (no `'use client'` / `'use server'`)**: bundled into whichever side imports them.
- **`'use server'` functions**: stay on server; client gets a stub that POSTs the action ID.

**Common bug**: importing a secret from a shared module that ends up on the client. Use `import 'server-only'` at the top of server-only modules to fail the build if pulled into a Client Component.

---

### Q9. How does the framework prevent a Server Component from being passed to a Client Component as a direct import?

The bundler tracks the module graph. If a `'use client'` file imports from a Server Component module, the build fails with an explicit error.

The supported pattern: pass Server Components as `children` props (or named slots) from a Server Component to a Client Component:

```tsx
// Server
<ClientLayout sidebar={<ServerNav />}>
  <ServerPosts />
</ClientLayout>

// ClientLayout.tsx — 'use client'
export default function ClientLayout({ children, sidebar }) { ... }
```

The Client Component sees React elements (serialized JSX nodes), not server code.

---

### Q10. Static generation with dynamic params — under the hood.

```tsx
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await db.posts.all();
  return posts.map(p => ({ slug: p.slug }));
}
```

At build time, Next.js calls `generateStaticParams`, then renders the page once per param tuple. The output is HTML + RSC payload per route.

`dynamicParams = true` (default) lets unknown slugs render on-demand and be cached. `false` returns 404 for unknown slugs.

ISR is just "static generation but the file is re-generated on revalidation".

---

## 4. Streaming Internals

---

### Q11. How does Next.js implement streaming?

Backed by React's `renderToReadableStream` (Edge) / `renderToPipeableStream` (Node). The server:
1. Begins writing HTML/RSC chunks to the response immediately.
2. When a Suspense boundary suspends, writes its fallback to the stream.
3. Continues server-rendering other branches.
4. When a suspended branch resolves, writes a chunk that includes:
   - The real HTML / RSC for that branch.
   - A small `<script>` (HTML mode) or RSC instruction telling React to swap the placeholder.

Critical: streaming requires the runtime to support `Transfer-Encoding: chunked` — most CDNs and proxies do, but some configurations buffer responses and break streaming.

---

### Q12. Why does my streaming page show as "blank for 5s" in production?

Common causes:
1. A CDN buffer (Cloudflare's "compression" option) — disable for streaming routes.
2. Reverse proxy buffering (`proxy_buffering on` in nginx) — turn off.
3. Compression middleware that buffers the whole body.
4. No Suspense boundaries — the whole page is one block, nothing to stream.

Fix: identify the slow Server Component, wrap with `<Suspense>`, ensure infra supports chunked transfer.

---

## 5. Performance

---

### Q13. What ships to the client for a basic `app/page.tsx` with no `'use client'`?

- React's hydration runtime (~40 KB gzip).
- Framework JS for client navigation (`router-runtime` ~10 KB).
- Page-specific JS: **near zero** (no Client Components imported).
- The RSC payload (small text, can be cached in browser).

Adding `'use client'` brings React itself + the component code into that route's chunk.

---

### Q14. How do I find what's bloating my bundle?

```bash
ANALYZE=true next build
```

with `@next/bundle-analyzer` configured:

```js
const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' });
module.exports = withBundleAnalyzer({ /* ... */ });
```

Common culprits:
- Importing whole libraries (`import * as _ from 'lodash'`).
- Client-side date libs (`moment` → swap for `date-fns` or `dayjs`).
- Inlined images.
- Server-only libs leaking through shared modules.

Modular imports help: `next.config.js > experimental.modularizeImports`.

---

### Q15. Performance budget for a Next.js app — what numbers do you target?

For a content-heavy page:
- **TTFB**: < 200 ms (cached) / < 600 ms (cold).
- **FCP**: < 1.0 s.
- **LCP**: < 2.5 s.
- **CLS**: < 0.1.
- **INP**: < 200 ms.
- **JS shipped per route**: < 200 KB gzip (top-level), client islands < 50 KB.
- **Cumulative JS budget**: 250–350 KB.

These are aspirational — measure with Web Vitals real-user data.

---

## 6. Runtime & Deployment

---

### Q16. Edge runtime — what can't you use?

Verified constraints (Web Standard APIs only):
- ❌ Node-specific modules: `fs`, `path`, `process` (most of it), `crypto` (use `globalThis.crypto`), `child_process`.
- ❌ Native (C++) modules.
- ❌ Long execution time (typical edge limit: 30–50 ms CPU).
- ❌ Most ORMs that depend on Node sockets — use HTTP-based DB clients (Neon, PlanetScale, Turso, Supabase, Upstash).

✅ Available: `fetch`, `Request`, `Response`, `Headers`, `URL`, `crypto.subtle`, `TextEncoder/Decoder`, streams.

---

### Q17. Cold start on serverless — what dominates?

In order of magnitude:
1. **Container boot** (Lambda) — 100–500 ms.
2. **Runtime init** (Node startup) — 50–150 ms.
3. **Module load** — depends on bundle size. Lazy-import expensive deps.
4. **Connection setup** (DB pool) — keep pool persistent or use HTTP-based clients.
5. **First render of root layout** — minimal.

Mitigations: smaller bundles, provisioned concurrency, warm pools, edge runtime for simple routes.

---

### Q18. Standalone output — what is it?

`output: 'standalone'` produces a self-contained build:
- Trace-analyzed `node_modules` (only files used at runtime).
- Minimal Node server (`server.js`).
- Static assets remain in `.next/static`.

Result: a Docker image ~50 MB instead of 500 MB. Great for self-hosting.

---

## 7. Auth & Security

---

### Q19. How do you do CSRF protection with Server Actions?

Next.js Server Actions are CSRF-resistant by default:
- Action IDs are non-guessable, build-time hashed.
- Server validates the action ID against the registered actions.
- Action calls require the framework's request format (POST + special header).

But: **always validate inputs**. CSRF protection prevents unauthorized invocation — it doesn't protect against the *content* of the action.

---

### Q20. Where do you store JWTs / sessions?

- **HttpOnly + Secure + SameSite=Lax cookie**: best default. Server-readable via `cookies()`.
- **LocalStorage**: vulnerable to XSS. Don't store auth tokens here.
- **In-memory (React state)**: fine for short-lived access tokens; combine with refresh tokens in cookies.

Production: use a library (Auth.js, Clerk, Lucia, NextAuth) — they handle expiration, refresh, CSRF.

---

### Q21. How does `proxy.ts` differ from `middleware.ts` security-wise?

Verified differences:
- `proxy.ts` runs on **Node runtime** by default — full crypto, DB access, secrets without Edge limitations.
- "Network boundary" naming makes it explicit: every request flows through here.
- You can still target Edge per-export if you want low-latency global auth checks.

The old `middleware.ts` only worked on Edge — limited APIs, sometimes pushed teams to do "double middleware" in a Server Component too.

---

## 8. Migration & Tooling

---

### Q22. How do you migrate `getServerSideProps`?

```tsx
// Before (Pages Router)
export async function getServerSideProps(ctx) {
  const data = await getData(ctx.params.id);
  return { props: { data } };
}

// After (App Router)
export default async function Page({ params }) {
  const { id } = await params;
  const data = await getData(id);
  return <Component data={data} />;
}
```

The component itself becomes async. Re-export `dynamic = 'force-dynamic'` if Next.js doesn't infer it.

---

### Q23. Migrate `getStaticProps` + `getStaticPaths`.

```tsx
// Before
export async function getStaticPaths() { return { paths, fallback: 'blocking' }; }
export async function getStaticProps({ params }) { return { props, revalidate: 60 }; }

// After
export async function generateStaticParams() { return paths; }
export const revalidate = 60;
export default async function Page({ params }) {
  const data = await getData((await params).slug);
  // ...
}
```

---

### Q24. `next.config.js` migration tips.

Common gotchas:
- `images.domains` → `images.remotePatterns` (typed protocol/hostname).
- `serverRuntimeConfig`/`publicRuntimeConfig` removed → use `NEXT_PUBLIC_*` env vars.
- `experimental.appDir` no longer needed (App Router is stable).
- `experimental.ppr` removed (use Cache Components).
- Custom Webpack config — verify it still works under Turbopack, or opt out with `next dev --webpack`.

---

## 9. Edge Cases

---

### Q25. Why doesn't my Server Action work after I refactored to a class?

Server Actions must be `async function` (or `export default async function`). Classes, generators, and non-async functions are rejected by the bundler. Move the logic to a function and call from your class.

---

### Q26. Why does `cookies().set(...)` throw "Cookies can only be modified in a Server Action or Route Handler"?

Reading cookies in a Server Component is fine (request-time). Mutating cookies requires a mutating context: Server Action, `route.ts`, or `proxy.ts`. The reason: mutating cookies should be tied to a specific request that *changes state* — not a pure render.

---

### Q27. Why doesn't my `revalidateTag` propagate to all pods?

In multi-instance deployments, in-memory cache state isn't shared. Use:
- Vercel — handles distribution automatically.
- Self-hosted — configure a shared cache backend (Redis adapter, or `next.cache.cacheHandler` in `next.config.js`).

Without a shared cache, each pod revalidates independently — users hitting different pods can see different cache states.

---

### Q28. Static export — what doesn't work?

`output: 'export'` produces purely static HTML. Lost features:
- Server Actions (no server).
- API routes (`route.ts`).
- Dynamic routes without `generateStaticParams`.
- ISR / revalidation.
- `proxy.ts`.
- Image optimization (the `/_next/image` endpoint).

Use when shipping to a static-only host (S3 + CloudFront, GitHub Pages).

---

## 10. Architecture

---

### Q29. App Router for a 100-route app — how do you organize?

- **Route groups `(name)`** to separate marketing, app, admin.
- **Co-locate** non-route files: components, hooks, lib in their own folders inside each segment.
- **Shared `components/`** at the project root for app-wide UI.
- **`lib/db.ts`, `lib/auth.ts`** as the single source of those concerns.
- **`actions/` per feature** (or per route) — keep Server Actions discoverable.
- **TypeScript path aliases** (`@/components/*`) for stable imports.
- **Naming**: `*.server.ts` / `*.client.tsx` for clarity (optional but readable).

---

### Q30. When would you NOT use Next.js?

- **Static site**: Astro / 11ty are simpler.
- **SPA with private API**: Vite + React Router + your own server.
- **API-only**: a plain Node framework (Hono, Fastify, NestJS).
- **Backend-heavy app with rare UI**: ship a backend + a small client.
- **Need control over the React renderer/runtime**: Next.js makes decisions for you.

Use Next.js when you want batteries-included full-stack React with server-side rendering, streaming, and a strong ecosystem.

---

## Final Senior Tips

1. **Verbalize where each thing runs** — server, client, build, edge.
2. **Cache must be opt-in (Next 16)** — explicit `"use cache"` is the new contract.
3. **`proxy.ts` is Node-default** — full APIs at the network boundary.
4. **Streaming > monolithic SSR** — wrap slow Server Components in Suspense.
5. **Static unless something forces dynamic** — the default is fast.
