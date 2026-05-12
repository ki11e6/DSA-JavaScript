# Next.js — Medium Interview Questions

> **Audience**: 2–5 yr engineers.
> **Goal**: Demonstrate fluent App Router usage, caching, Server Actions, streaming, error handling, auth, and migration knowledge.
> Verified against [nextjs.org](https://nextjs.org) (Next.js 16.2, May 2026).

---

## 1. Data Fetching Patterns

---

### Q1. Sequential vs parallel data fetching.

**Sequential (bad — waterfall)**:
```tsx
const user = await getUser();
const posts = await getPosts(user.id);
```

**Parallel**:
```tsx
const userP = getUser();
const postsP = getPosts(); // doesn't depend on user
const [user, posts] = await Promise.all([userP, postsP]);
```

For genuinely dependent calls, parallelize what you can.

Better still — `<Suspense>` boundaries let independent slow queries stream in parallel without `Promise.all`:

```tsx
<Suspense fallback={<Spinner />}><User /></Suspense>
<Suspense fallback={<Spinner />}><Posts /></Suspense>
```

---

### Q2. Pass data from a Server Component to a Client Component.

```tsx
// Server
import ClientChart from './ClientChart';
async function Page() {
  const data = await db.metrics.all();
  return <ClientChart data={data} />;
}

// Client
'use client';
export default function ClientChart({ data }: { data: Metric[] }) {
  // hooks ok here
}
```

Props get serialized — must be JSON-serializable (no functions, no class instances). Dates and `BigInt` are now supported.

---

### Q3. Streaming a slow data widget.

```tsx
async function SlowChart() {
  const data = await slowFetch(); // 3s
  return <Chart data={data} />;
}

export default function Page() {
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

Next.js streams the header first, then streams the chart HTML when ready. Single round trip from the client's perspective.

---

### Q4. Cache strategy — when to cache, when not.

| Data                            | Caching                                          |
| ------------------------------- | ------------------------------------------------ |
| Public + rarely changes (CMS)   | `"use cache"` + tag, revalidate hourly           |
| User-specific (account)         | Don't cache; or per-user cache with user as key  |
| Heavy aggregation               | `"use cache"` + manual `revalidateTag` on mutate |
| Real-time feed                  | No cache; possibly client-side WebSocket         |
| Auth checks                     | Never cache                                      |

**Verified default (Next.js 16)**: `fetch` is uncached unless you wrap with `"use cache"` or use a cached source.

---

## 2. Server Actions

---

### Q5. Form submission with a Server Action.

```tsx
// app/posts/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const Post = z.object({ title: z.string().min(3), body: z.string() });

export async function createPost(formData: FormData) {
  const data = Post.parse({
    title: formData.get('title'),
    body: formData.get('body')
  });
  await db.posts.create(data);
  revalidatePath('/posts');
}

// app/posts/new/page.tsx
import { createPost } from '../actions';
export default function Page() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <textarea name="body" required />
      <button>Publish</button>
    </form>
  );
}
```

No client JS required for basic submission (progressive enhancement).

---

### Q6. Pending state with `useFormStatus`.

```tsx
'use client';
import { useFormStatus } from 'react-dom';
function Submit() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>;
}
// inside <form action={createPost}>
//   ... <Submit />
```

`useFormStatus` must live inside the `<form>` it's reporting on.

---

### Q7. `useActionState` for form state + errors.

```tsx
'use client';
import { useActionState } from 'react';
import { saveProfile } from './actions';

export default function Profile() {
  const [state, formAction, isPending] = useActionState(saveProfile, { error: null });
  return (
    <form action={formAction}>
      <input name="name" />
      <button disabled={isPending}>Save</button>
      {state.error && <p>{state.error}</p>}
    </form>
  );
}
```

Server action signature changes to `(prevState, formData) => newState`.

---

### Q8. Optimistic UI with `useOptimistic`.

```tsx
'use client';
import { useOptimistic } from 'react';

function Likes({ initial, like }: { initial: number, like: () => Promise<void> }) {
  const [optimistic, addOptimistic] = useOptimistic(initial, (c, delta: number) => c + delta);

  async function onClick() {
    addOptimistic(1);
    await like(); // Server Action
  }
  return <button onClick={onClick}>♥ {optimistic}</button>;
}
```

UI bumps to `initial + 1` instantly. If the action fails, React rolls back automatically.

---

## 3. Caching API Deep Dive

---

### Q9. `revalidateTag` vs `updateTag` vs `refresh`.

- **`revalidateTag(tag, profile)`**: marks all cached entries with that tag stale. Next request will refetch.
- **`updateTag(tag)`**: Server Action only. Immediately updates for the current user (read-your-writes).
- **`refresh()`**: refreshes only **uncached** data on the current page.

```ts
'use server';
import { revalidateTag, updateTag } from 'next/cache';

export async function createComment(form: FormData) {
  await db.comments.create(/* ... */);
  await updateTag('comments');           // user sees their comment immediately
  revalidateTag('comments', { revalidate: 60 }); // other users see it within 60s
}
```

---

### Q10. `revalidatePath` — what's it for?

Invalidate cache for a specific route path:

```ts
revalidatePath('/products');     // exact
revalidatePath('/products/[id]', 'page'); // dynamic
revalidatePath('/dashboard', 'layout');   // include layout
```

Use when you've mutated data that affects multiple components on a route.

---

### Q11. `cacheLife` and `cacheTag` inside `"use cache"`.

```tsx
async function getProducts() {
  "use cache";
  cacheLife({ revalidate: 60, expire: 3600 });
  cacheTag('products');

  return db.products.all();
}
```

- `cacheLife`: how fresh / stale-while-revalidate.
- `cacheTag`: identifier for invalidation via `revalidateTag`.

Profiles: `'default'`, `'minutes'`, `'hours'`, `'days'`, `'weeks'`, `'max'` or custom.

---

## 4. Routing Patterns

---

### Q12. Build a tabbed dashboard with parallel routes.

```
app/dashboard/
  layout.tsx
  @analytics/page.tsx
  @team/page.tsx
  @analytics/default.tsx    ← required in Next 16!
  @team/default.tsx         ← required in Next 16!
  page.tsx
```

```tsx
// layout.tsx
export default function Layout({
  children, analytics, team
}: { children: React.ReactNode, analytics: React.ReactNode, team: React.ReactNode }) {
  return (
    <>
      {children}
      <div className="grid grid-cols-2">{analytics}{team}</div>
    </>
  );
}
```

`default.tsx` files are **required** in Next.js 16 — builds fail without them. They render when the slot doesn't have an active route.

---

### Q13. Photo modal via intercepting routes.

```
app/feed/
  page.tsx
  photo/[id]/page.tsx               ← direct URL: /feed/photo/123
  @modal/(.)photo/[id]/page.tsx     ← from /feed: opens as modal
```

The `(.)` prefix intercepts the same-level route. Hard refresh on `/feed/photo/123` shows the full page; clicking from `/feed` shows the modal overlay.

---

### Q14. Route groups `(name)`.

Wrap folders in parentheses to share a layout without affecting the URL:

```
app/
  (marketing)/
    layout.tsx
    page.tsx                → /
    about/page.tsx          → /about
  (app)/
    layout.tsx
    dashboard/page.tsx      → /dashboard
```

Useful when sections have different layouts/auth at the same URL depth.

---

## 5. Error Handling

---

### Q15. Error boundary in App Router.

```tsx
// app/posts/error.tsx
'use client';

export default function Error({
  error, reset
}: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <div>
      <h1>Couldn't load posts</h1>
      <p>{error.message}</p>
      <button onClick={reset}>Retry</button>
    </div>
  );
}
```

- Must be a Client Component (it uses `useEffect` internally for logging).
- Catches errors in `page.tsx` and child Server Components.
- Doesn't catch errors in the segment's own `layout.tsx` — for that, put `error.tsx` one level up.

---

### Q16. `notFound()` and `not-found.tsx`.

```tsx
// app/post/[slug]/page.tsx
import { notFound } from 'next/navigation';

export default async function Post({ params }) {
  const { slug } = await params;
  const post = await db.posts.find({ slug });
  if (!post) notFound();
  return <article>...</article>;
}
```

```tsx
// app/post/[slug]/not-found.tsx
export default function NotFound() { return <h1>No such post</h1>; }
```

Renders for unmatched dynamic routes and explicit `notFound()` calls.

---

## 6. Auth

---

### Q17. Read cookies in a Server Component.

```tsx
import { cookies } from 'next/headers';

export default async function Page() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return <Login />;
  return <Dashboard session={session} />;
}
```

Marks the page **dynamic** (server-rendered per request).

---

### Q18. Implement auth-protected routes.

Option A — `proxy.ts` (recommended for blanket protection):

```ts
// proxy.ts
import { NextResponse, NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  const session = req.cookies.get('session')?.value;
  if (!session) return NextResponse.redirect(new URL('/login', req.url));
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*', '/account/:path*'] };
```

Option B — per-page guard in Server Component (more flexibility, runs only on requested pages).

---

### Q19. Sessions with NextAuth / Auth.js?

`Auth.js` (formerly NextAuth.js) provides:
- OAuth providers (Google, GitHub, etc.).
- Email magic links.
- Credentials (custom).
- Server Components helpers (`auth()` to read session in any Server Component).

```ts
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/auth';
export const { GET, POST } = handlers;
```

For App Router, prefer reading session via `await auth()` instead of `useSession`.

---

## 7. Performance

---

### Q20. Lazy-load a heavy client component.

```tsx
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('./Chart'), {
  loading: () => <Spinner />,
  ssr: false   // skip SSR if chart depends on window
});
```

Useful for charting libs, rich text editors, large maps.

---

### Q21. Prefetch a route on hover.

`<Link>` auto-prefetches in viewport. To control timing:

```tsx
<Link href="/heavy" prefetch={true}>Heavy</Link>      // default: viewport
<Link href="/heavy" prefetch={false}>Heavy</Link>     // disable
<Link href="/heavy" prefetch="hover">Heavy</Link>     // on hover (Next 16+)
```

---

### Q22. `Suspense` boundary placement — where?

Wrap independently-slow parts so they don't block fast ones:

```tsx
<Header />                           {/* fast */}
<Suspense fallback={<S />}><Comments /></Suspense> {/* slow */}
<Footer />                           {/* fast */}
```

Don't wrap the whole page — defeats streaming.

---

## 8. Internationalization & SEO

---

### Q23. Generate sitemap.

```ts
// app/sitemap.ts
import type { MetadataRoute } from 'next';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await db.posts.all();
  return [
    { url: 'https://example.com', changeFrequency: 'weekly' },
    ...posts.map(p => ({
      url: `https://example.com/post/${p.slug}`,
      lastModified: p.updatedAt
    }))
  ];
}
```

Next.js generates `/sitemap.xml` automatically.

---

### Q24. `robots.txt` via code.

```ts
// app/robots.ts
import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: 'https://example.com/sitemap.xml'
  };
}
```

---

### Q25. Dynamic OG image.

```tsx
// app/og/route.tsx
import { ImageResponse } from 'next/og';

export async function GET(req: Request) {
  return new ImageResponse(
    <div style={{ fontSize: 48, color: '#fff', background: '#111', width: '100%', height: '100%' }}>
      Hello world
    </div>,
    { width: 1200, height: 630 }
  );
}
```

Returns a JPEG/PNG. Use as `<meta property="og:image" content="/og">`.

---

## 9. Configuration

---

### Q26. Enable React Compiler.

```js
// next.config.js
module.exports = {
  experimental: { reactCompiler: true }
};
```

After enabling, you can remove most manual `useMemo` / `useCallback` / `React.memo`.

---

### Q27. Configure `images.remotePatterns`.

```js
module.exports = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.example.com' },
      { protocol: 'https', hostname: '**.amazonaws.com' }
    ]
  }
};
```

`images.domains` is **deprecated in Next.js 16** — migrate to `remotePatterns`.

---

### Q28. Output modes.

```js
module.exports = {
  output: 'standalone' // minimal Node server for Docker
  // output: 'export'  // static HTML export (no SSR, no Server Actions)
};
```

`standalone` includes only the files needed at runtime — great for slim container images.

---

## 10. Migration

---

### Q29. Pages → App Router migration steps?

1. Create `app/` alongside `pages/`.
2. Move a single page over: create `app/<route>/page.tsx`.
3. Convert `getServerSideProps` to `await` calls inside the Server Component.
4. Convert `getStaticProps` + `getStaticPaths` to default static rendering + `generateStaticParams`.
5. Wrap hooks/components needing interactivity in `'use client'` files.
6. Move `_app.tsx` logic into `app/layout.tsx`.
7. Repeat for remaining pages, then delete the `pages/` entries.

App Router and Pages can coexist — there's no big-bang requirement.

---

### Q30. Next.js 15 → 16 migration — what breaks?

**Verified breaking changes** (from [Upgrading to v16](https://nextjs.org/docs/app/guides/upgrading/version-16)):
- `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` are async.
- `middleware.ts` deprecated → `proxy.ts`.
- `fetch` no longer cached by default.
- Parallel route slots require `default.tsx`.
- `next lint` removed.
- `serverRuntimeConfig`/`publicRuntimeConfig` removed.
- AMP support removed.
- `images.domains` deprecated → `remotePatterns`.
- Minimum Node 20.9.

Use the codemod:
```bash
npx @next/codemod@latest next-async-request-api .
```
