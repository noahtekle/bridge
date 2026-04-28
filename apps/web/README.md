# `@bridge/web` — bridge.app

The Bridge marketing site. Static Astro + Tailwind. Same design tokens as the
desktop app — same Inter + JetBrains Mono, same zinc palette, same category
gradients — so the site and the app feel like one product.

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

Free tier, static, no edge functions needed for v0.1.

**One-time setup:**

1. Sign in at https://dash.cloudflare.com → Workers & Pages → Create → Pages
2. Connect to this GitHub repo (`noahtekle/bridge`)
3. Build configuration:
   - **Production branch**: `main`
   - **Build command**: `pnpm --filter @bridge/web build`
   - **Build output directory**: `apps/web/dist`
   - **Root directory**: `/` (repo root)
   - **Environment variables**:
     - `NODE_VERSION` = `20`
     - `PNPM_VERSION` = `10`
4. Save and Deploy
5. Custom domain (Settings → Custom domains) — point your `bridge.app` /
   `usebridge.app` / etc. at the deployment

Subsequent pushes to `main` auto-deploy. Pushes to other branches deploy as
preview URLs (handy when iterating on the page).

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
