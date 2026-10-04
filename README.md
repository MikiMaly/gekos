# gekos

Web app pro správu péče o pagekony řasnaté — sub-app [`MikiMaly/hub`](https://github.com/MikiMaly/hub).

**Stack**: Cloudflare Pages Functions + D1 (SQLite) + React + TypeScript.
**Auth**: zděděná z hubu. Hubovský `functions/_middleware.js` chrání `/private/*` stránky
i celé `/api/geckos/*` — bez platné session vrací 403 JSON. Endpointy tady proto vlastní
kontrolu nemají a **nesmí se nasazovat samostatně na veřejnou adresu**; při lokálním
`npm run dev` běží bez middlewaru, a tedy bez ověření.
**Deploy**: integrováno do hubu jako git submodule; push do hubu = jeden Cloudflare Pages build.

## Co tracking obsahuje

- 3 gekoni rozlišení barvou: `bily`, `bezovy`, `hnedy`
- 4 kategorie péče per gekon: `cvrcci`, `banan`, `antib` (antibiotika), `mast`
- Mlžení terária — `rano` / `vecer` / `nahodne` (teráriové, ne per-gekon)
- Historie + kalendář
- TZ: Europe/Prague

### Automatický rosič (od 1. 6. 2026)

V teráriu visí rosič na časovači: rosí každých 8 h po 45 s, tedy v 06:00 /
14:00 / 22:00 (Praha). Dopad na appku:

- `misting_events.source` rozlišuje `'manual'` (klik v appce / odpověď
  v Telegramu) od `'auto'` (rosič); `duration_sec` drží délku cyklu
- cron worker si cykly zapisuje sám v minutě 0 dané hodiny a **přestal se ptát**
  "mlžil jsi ráno/večer?" — konstanty `AUTO_MISTER_*` v `cron/src/index.ts`,
  kopie pro UI v `functions/_lib/types.ts` (`AUTO_MISTER`)
- historie za 1. 6. – 4. 10. 2026 je dosypaná migrací `0008`; od 5. 10. zapisuje cron
- prostřední cyklus (14:00) nemá vlastní slot, padá do `nahodne`
- **auto zápis = časovač, ne měření.** Rosič cronu nic nereportuje, takže řádek
  znamená "cyklus měl proběhnout". Výpadek vody nebo elektriky historie nepozná.

Ruční mlžení jde zapsat pořád — klik ve widgetu přidá `manual` záznam navíc
a na dashboardu ve svém slotu vyhraje (slot se bere podle nejnovějšího `ts`).

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
