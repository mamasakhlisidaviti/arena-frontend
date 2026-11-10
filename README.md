# Arena.ge — Frontend

Angular 22 browser + SSR application for the Arena.ge tournament platform.

The UI is chess-first but driven by a generic game-category engine, so additional board-game categories can be added from the admin panel without code changes. The REST API lives in a separate repository.

## Stack

- Angular 22 (standalone components, signals, `@if`/`@for`, SSR + hydration)
- NgRx Signals (`@ngxs/store`)
- PrimeNG 21 with the Aura preset (MIT)
- Tailwind CSS 4
- ngx-translate (Georgian default, English, Russian)
- Vitest

## Requirements

- Node.js 22+ (developed on Node 24)
- npm 10+
- Running API on `http://127.0.0.1:3000` (proxied as `/api`)

## Getting started

```bash
npm install --legacy-peer-deps
npm start                 # dev server on http://localhost:4200, proxies /api to :3000
npm test -- --watch=false
npm run build             # production browser + SSR bundles in dist/
npm run serve:ssr:client  # serve the SSR bundle on :4000 (PORT env supported)
```

`--legacy-peer-deps` is required because PrimeNG 21 declares older Angular peer ranges while the app runs on Angular 22.

## Configuration

During development the dev server proxies `/api`, `/uploads`, `/sitemap.xml` and `/robots.txt` to the API. For production SSR the following environment variables are read at runtime:

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | Public web port | `4000` |
| `API_INTERNAL_URL` | Loopback API origin used by SSR fetching and the proxy | `http://127.0.0.1:3000` |
| `PUBLIC_ORIGIN` | Canonical/OG origin emitted during SSR | request origin |
| `ALLOWED_HOSTS` | Comma-separated hosts accepted by Angular SSR | `localhost,127.0.0.1` |
| `PUBLIC_SITE_URL` | Origin used for sitemap/robots links | `http://localhost:4200` |

Set `PUBLIC_ORIGIN` and `PUBLIC_SITE_URL` to the public domain in production and put a reverse proxy in front of the SSR port. Admin, account and auth routes render client-side; public pages render on the server with full metadata.

## Features

- Public homepage, tournament listing with filters, tournament detail page, registration form and guest status lookup.
- JWT access token + rotating httpOnly refresh cookie, role-aware navigation and guards.
- Admin dashboard, tournament CRUD, six-step wizard with drafts and category-specific fields, participant management (approve, reject, cancel, manual add, CSV export).
- Super-admin categories, users and settings pages.
- Light/dark/system themes, Georgian/English/Russian UI, responsive from 375 px to 1440 px.
- SSR metadata, Open Graph/Twitter tags, canonical URLs, JSON-LD, sitemap and robots.txt.

## Project layout

```
src/app/core      API client, auth, i18n, theme, models, store
src/app/layouts   public, account and admin shells
src/app/shared    cards, avatars, dialogs, pipes and other reusable UI
src/app/features  public pages, auth, account and admin features
src/assets/i18n   ka/en/ru translation files
src/server.ts     Angular SSR host, proxy and security headers
```
