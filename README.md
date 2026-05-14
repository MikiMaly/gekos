# gekos

Web app pro správu péče o pagekony řasnaté — sub-app [`MikiMaly/hub`](https://github.com/MikiMaly/hub).

**Stack**: Cloudflare Pages Functions + D1 (SQLite) + React + TypeScript.
**Auth**: zděděná z hubu (`functions/_middleware.js` chrání `/private/*`).
**Deploy**: integrováno do hubu jako git submodule; push do hubu = jeden Cloudflare Pages build.

## Co tracking obsahuje

- 3 gekoni rozlišení barvou: `bily`, `bezovy`, `hnedy`
- 4 kategorie péče per gekon: `cvrcci`, `banan`, `antib` (antibiotika), `mast`
- Mlžení terária — `rano` / `vecer` (teráriové, ne per-gekon)
- Historie + kalendář
- TZ: Europe/Prague

## Layout

```
src/                    # React UI (mountuje se do hub/src/pages/geckos)
  lib/types.ts          # sdílené typy mezi frontendem a Functions
  pages/                # Dashboard, Calendar, Profile, Misting
  components/
functions/api/geckos/   # Cloudflare Pages Functions (CRUD pro events/misting)
migrations/             # D1 SQL migrace
schema.sql              # referenční celé schema
wrangler.toml           # pro lokální dev a `wrangler d1` příkazy
```

## Local dev

```powershell
# jednou
npm install
npx wrangler d1 create gekos          # zkopírovat database_id do wrangler.toml
npm run db:migrate:local
npm run db:seed:local

# dev server (API only, UI testuje se z hubu)
npm run dev
# → http://localhost:8788/api/geckos
```

## Integrace do hubu

Detailní kroky v [INTEGRATION.md](INTEGRATION.md). TL;DR:

1. `wrangler d1 create gekos` v gekos folderu, zkopírovat ID
2. V hubu: `git submodule add https://github.com/MikiMaly/gekos.git gekos`
3. Hub: přidat D1 binding, path alias, gekos routes, kartu na PrivatePage, prebuild copy script
4. Push do hubu = Cloudflare Pages build s fetchnutým submodulem = deploy webu i gekos sekce
