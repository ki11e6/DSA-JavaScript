# Next.js — Easy Interview Questions

> **Audience**: Junior / fresher / phone-screen rounds.
> **Goal**: Show solid foundation in routing, basic data fetching, layouts, and the server/client boundary.
> Verified against [nextjs.org](https://nextjs.org) (Next.js 16.2, May 2026).

---

## 1. Project Setup

---

### Q1. Create a new Next.js project.

```bash
npx create-next-app@latest my-app
```

You're prompted for TypeScript, ESLint, Tailwind, App Router (yes — default), `src/` directory, import aliases, and Turbopack.

Out of the box you get:
- `app/` directory (App Router).
- TypeScript + Tailwind (optional).
- Turbopack for dev + build.

---

### Q2. What's the difference between `app/` and `pages/`?

`app/` is the **App Router** (default, modern). `pages/` is the **Pages Router** (legacy). They can coexist — Next.js prefers `app/` for matching routes.

| Feature                   | App Router          | Pages Router          |
| ------------------------- | ------------------- | --------------------- |
| Server Components default | ✅                  | ❌                    |
| Streaming                 | ✅ (Suspense)       | ❌                    |
| Nested layouts            | ✅ (`layout.tsx`)   | ❌ (only `_app.tsx`)  |
| Server Actions            | ✅                  | ❌                    |
| Data fetching             | `fetch` + `await`   | `getServerSideProps`, `getStaticProps` |

New code: **App Router**.

---

## 2. Routing

---

### Q3. How does file-based routing work?

URL paths mirror folder structure under `app/`:

```
app/
  page.tsx              → /
  about/page.tsx        → /about
  blog/page.tsx         → /blog
  blog/[slug]/page.tsx  → /blog/:slug
```

The file named `page.tsx` defines the UI for that URL.

---

### Q4. Create a dynamic route.

```
app/posts/[id]/page.tsx
```

```tsx
export default async function Post({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // ⚠ async in Next.js 16
  return <h1>Post {id}</h1>;
}
```

Hits `/posts/42` → renders "Post 42".

**Note**: `params` is a Promise in Next.js 16. You must `await` it.

---

### Q5. Link between pages.

```tsx
import Link from 'next/link';

<Link href="/about">About</Link>
<Link href={`/posts/${id}`}>Read</Link>
```

`<Link>` does:
- Client-side navigation (no full page reload).
- Auto prefetches the linked route when it enters the viewport.
- Preserves layouts that don't need to re-render.

Don't use raw `<a>` for internal links — you lose all of the above.

---

### Q6. Programmatic navigation.

```tsx
'use client';
import { useRouter } from 'next/navigation';

function LoginButton() {
  const router = useRouter();
  function login() {
    // ...
    router.push('/dashboard');
  }
  return <button onClick={login}>Log in</button>;
}
```

Note the import: `next/navigation` (App Router) vs `next/router` (Pages Router — legacy). Don't confuse them.

---

## 3. Layouts

---

### Q7. What does `layout.tsx` do?

Wraps its segment and **all child segments**. Doesn't re-render when navigating between siblings.

```tsx
// app/layout.tsx (root)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html><body>{children}</body></html>
  );
}
```

Required: the root `app/layout.tsx` must render `<html>` and `<body>`.

You can nest layouts at any level:
```
app/dashboard/layout.tsx → wraps everything under /dashboard
```

---

### Q8. Difference between `layout.tsx` and `template.tsx`?

- **`layout.tsx`**: persists across child navigations. State, scroll, effects survive.
- **`template.tsx`**: re-mounts on every navigation. Useful for entry animations or per-page state isolation.

Default to layout; reach for template only when you need re-mount semantics.

---

## 4. Server vs Client Components

---

### Q9. How do you make a component a Client Component?

Put `'use client'` at the top:

```tsx
'use client';
import { useState } from 'react';
export default function Counter() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n+1)}>{n}</button>;
}
```

Otherwise everything in `app/` is a Server Component by default.

---

### Q10. What can't a Server Component do?

- ❌ `useState`, `useEffect`, `useRef`, or any hook.
- ❌ Event handlers (`onClick`, `onChange`).
- ❌ Browser APIs (`window`, `document`, `localStorage`).
- ❌ Class components (mostly).

✅ But it **can**:
- `await` data (DB, fetch).
- Read env vars, secrets, files.
- Compose with Client Components as children.

---

### Q11. Can a Client Component import a Server Component?

No — directly imported, it would have to ship the server code to the client.

You **can** pass a Server Component as `children` or as a prop from a Server Component to a Client Component:

```tsx
// Server Component
<ClientCarousel>
  <ServerImageCard />   {/* allowed: passed as child */}
</ClientCarousel>
```

---

## 5. Data Fetching

---

### Q12. Fetch data in a Server Component.

```tsx
async function Page() {
  const res = await fetch('https://api.example.com/users');
  const users = await res.json();
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
export default Page;
```

No `useEffect`, no `useState`. The `await` runs on the server.

**Note (Next.js 16)**: `fetch` is **not cached by default** — every request hits the API. Opt in with `"use cache"` for caching.

---

### Q13. Cache a fetch result with `"use cache"`.

```tsx
async function getUsers() {
  "use cache";
  const res = await fetch('https://api.example.com/users');
  return res.json();
}
```

Requires `experimental.cacheComponents: true` in `next.config.js`. Subsequent calls within the same build/revalidation window return the cached value.

---

### Q14. Fetch from a Client Component.

```tsx
'use client';
import { useEffect, useState } from 'react';

function Users() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers);
  }, []);
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

Use this for client-only data (real-time, user actions). For everything else, Server Component fetching is simpler.

---

## 6. API Routes

---

### Q15. Create a `GET` API route.

```ts
// app/api/users/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([{ id: 1, name: 'Sharath' }]);
}
```

Hit `/api/users` → JSON response.

---

### Q16. Add a `POST` handler.

```ts
export async function POST(req: Request) {
  const body = await req.json();
  // ... save body
  return NextResponse.json({ ok: true }, { status: 201 });
}
```

Same file, different exported function per HTTP method.

---

## 7. Static & Dynamic

---

### Q17. How do I make a page statically generated?

In App Router, a page is **static by default** if it doesn't use dynamic features (`cookies()`, `headers()`, `searchParams`, uncached data). Just write the component:

```tsx
export default function About() {
  return <h1>About us</h1>;
}
```

Next.js detects this and pre-renders at build.

---

### Q18. How do I force a page to be dynamic?

```tsx
export const dynamic = 'force-dynamic';
```

Or use any dynamic API:
```tsx
import { cookies } from 'next/headers';
const c = await cookies(); // forces dynamic
```

---

### Q19. How do I revalidate static content?

```tsx
export const revalidate = 60; // every 60 seconds
```

Or per-fetch:
```tsx
const data = await fetch(url, { next: { revalidate: 60 } });
```

Or imperative (in a Server Action / route handler):
```ts
revalidateTag('products', { revalidate: 60 });
revalidatePath('/products');
```

---

## 8. Images, Fonts, Scripts

---

### Q20. Use `next/image`.

```tsx
import Image from 'next/image';

<Image src="/hero.jpg" alt="" width={1200} height={600} priority />
```

Provides:
- Lazy loading.
- Automatic WebP/AVIF conversion.
- Responsive `srcset`.
- `priority` prop hints for above-the-fold images (preload).

For remote images, configure `images.remotePatterns` in `next.config.js`.

---

### Q21. Use `next/font`.

```tsx
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'] });

<html className={inter.className}>...</html>
```

Builds the font into your bundle — zero external requests, zero layout shift.

---

## 9. Environment Variables

---

### Q22. How do you use env vars in Next.js?

- `.env.local` for secrets.
- `.env.production` / `.env.development` for env-specific defaults.
- Server-only: `process.env.DATABASE_URL` (any name).
- Client-exposed: must start with `NEXT_PUBLIC_` (e.g., `NEXT_PUBLIC_API_URL`).

Without the prefix, the variable is stripped from the client bundle.

---

## 10. Common Errors

---

### Q23. "useState can only be used inside a Client Component."

You forgot `'use client'` at the top of the file.

---

### Q24. "params should be awaited before using its properties."

Next.js 16 made `params` async. Update:

```tsx
// Old (Next.js ≤15)
function Page({ params }: { params: { id: string } }) { return params.id; }

// New (Next.js 16+)
async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return id;
}
```

Same applies to `searchParams`, `cookies()`, `headers()`, `draftMode()`.

---

### Q25. "Hydration mismatch" warning — what causes it?

Server and client rendered different HTML. Common causes:
- Using `Date.now()`, `Math.random()` in render.
- Reading `localStorage` / `window` during render.
- Locale or timezone-dependent rendering.

Fix: defer dynamic values to `useEffect`, or render those parts only on the client (`'use client'` + mounted check).

---

### Q26. "Cannot use Server Component as a Client Component child."

You imported a Server Component into a `'use client'` file. Either:
1. Make the Server Component a child via `children` prop.
2. Refactor so the Server Component lives in a Server Component parent.

---

### Q27. Where do I configure Next.js?

`next.config.js` (or `.mjs`, `.ts`):

```js
module.exports = {
  experimental: { reactCompiler: true, cacheComponents: true },
  images: { remotePatterns: [{ protocol: 'https', hostname: 'images.example.com' }] }
};
```

---

### Q28. How do I deploy a Next.js app?

- **Vercel**: `git push`, done. First-class support.
- **Node host**: `next build && next start`.
- **Docker**: `output: 'standalone'` → minimal Node bundle in a container.
- **Static**: `output: 'export'` → fully static (no dynamic routes, no Server Actions).

---

### Q29. How do I add custom HTTP headers?

`next.config.js`:
```js
module.exports = {
  async headers() {
    return [
      { source: '/(.*)', headers: [{ key: 'X-Frame-Options', value: 'DENY' }] }
    ];
  }
};
```

Or set per-response in `route.ts` / `proxy.ts`.

---

### Q30. Where do CSS / Tailwind go?

- **CSS Modules**: `Button.module.css` next to the component.
- **Global CSS**: imported in the root `layout.tsx`.
- **Tailwind**: configured via `tailwind.config.js`; `@tailwind` directives in your global stylesheet.

Tailwind v4+ (default in Next.js 16 templates) uses CSS-first config — no JS config file needed in many cases.
