# `@bridge/web` — bridge-stack.pages.dev

The Bridge marketing site. Static Astro + Tailwind, hosted on Cloudflare Pages
free tier at `https://bridge-stack.pages.dev`. Same design tokens as the desktop
app — same Inter + JetBrains Mono, same zinc palette, same category gradients —
so the site and the app feel like one product.

## Local dev

```bash
pnpm install         # from the repo root, picks up the workspace
pnpm --filter @bridge/web dev
```

Default URL: `http://localhost:4321`.

## Build

```bash
pnpm --filter @bridge/web build
```

Output lands in `apps/web/dist/` as plain HTML + CSS + a tiny bit of JS for
the IntersectionObserver that triggers the stack-reveal counter animation.

## Deploy — Cloudflare Pages

Free tier, static. v0.1 ships on the free `bridge-stack.pages.dev` subdomain;
custom domain is a v0.2 problem.

**One-time setup:**

1. Sign in at https://dash.cloudflare.com → Workers & Pages → Create → Pages
2. Connect to this GitHub repo (`noahtekle/bridge`)
3. Project name: `bridge-stack` (this becomes the `bridge-stack.pages.dev` subdomain)
4. Build configuration:
   - **Production branch**: `main`
   - **Build command**: `pnpm --filter @bridge/web build`
   - **Build output directory**: `apps/web/dist`
   - **Root directory**: `/` (repo root)
   - **Environment variables**:
     - `NODE_VERSION` = `20`
     - `PNPM_VERSION` = `10`
5. Save and Deploy. First deploy takes ~2 min.

Subsequent pushes to `main` auto-deploy. Pushes to other branches (e.g.
`week-4`) get preview URLs at `<branch>.bridge-stack.pages.dev` — handy when
iterating on the page without merging.

**Adding a custom domain later (v0.2):**

Settings → Custom domains → "Set up a custom domain" → enter the domain →
Cloudflare walks you through the DNS records. If the domain is already on
Cloudflare it's instant; otherwise add a CNAME `@` → `bridge-stack.pages.dev`.

## What's NOT on this site (and isn't going on it)

Per the rules:

- No analytics, no tracking pixels, no Google Tag Manager
- No email capture, no newsletter signup
- No fake testimonials, made-up user counts, or fictional company logos
- No claims about features that aren't shipping in v0.1

Things tracked here would undermine the privacy pitch the page makes about
the desktop app. If we want analytics in v0.2, opt-in only.

## Editing content

- Hero: `src/components/Hero.astro`
- Stack reveal numbers (illustrative): `src/components/StackReveal.astro`
- Feature row: `src/components/FeatureRow.astro`
- How-it-works: `src/components/HowItWorks.astro`
- Privacy: `src/components/Privacy.astro`
- Discover preview: `src/components/DiscoverPreview.astro` — keep in sync
  with `apps/desktop/src/main/discover/curated.json` on cosmetic edits
- Footer: `src/components/Footer.astro`
