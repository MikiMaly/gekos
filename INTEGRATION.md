# Integrace gekos do MikiMaly/hub

Tento dokument popisuje konkrétní kroky pro mounting gekos repa do hubu jako git submodule.

## Předpoklady

- Node.js v PATH (vyřešeno přidáním `C:\Program Files\nodejs` do user PATH)
- `wrangler login` proběhlý (Cloudflare účet)
- `MikiMaly/gekos` repo existuje (✓)

## Krok 1: Vytvořit D1 databázi

V `C:\Users\mikim\gekos`:

```powershell
npm install
npx wrangler d1 create gekos
```

Zkopíruj `database_id` z výstupu do [wrangler.toml](wrangler.toml) (nahradí `REPLACE_AFTER_WRANGLER_D1_CREATE`).

Aplikuj migrace + seed:

```powershell
npm run db:migrate:remote
npm run db:seed:remote
# pro lokální dev:
npm run db:migrate:local
npm run db:seed:local
```

## Krok 2: Integrace jako submodule v hub

V `C:\Users\mikim\hub` (nebo kdekoliv klonuješ hub):

```powershell
git submodule add https://github.com/MikiMaly/gekos.git gekos
git commit -m "feat: add gekos submodule"
```

## Krok 3: Úpravy v hub repu

### `hub/wrangler.toml` — přidat D1 binding

```toml
[[d1_databases]]
binding = "DB"
database_name = "gekos"
database_id = "<TVOJE_ID_Z_KROKU_1>"
migrations_dir = "gekos/migrations"
```

### `hub/tsconfig.json` — přidat path alias

```json
{
  "compilerOptions": {
    "paths": {
      "@gekos/*": ["./gekos/src/*"]
    }
  },
  "include": ["src/**/*", "gekos/src/**/*"]
}
```

### `hub/vite.config.ts` — přidat alias

```ts
resolve: {
  alias: {
    '@gekos': path.resolve(__dirname, './gekos/src'),
  },
},
```

### Tailwind (hub má v4) — přidat gekos do content scanu

Hub má Tailwind 4 přes `@tailwindcss/vite`, který zero-config skenuje vše. Pokud má hub explicitní `@source` direktivu v CSS, přidej `@source '../gekos/src/**/*.{ts,tsx}'`.

### `hub/src/routes.tsx` — přidat gekos routes

```tsx
import { createBrowserRouter } from 'react-router'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import PrivatePage from './pages/PrivatePage'
import InvitesPage from './pages/InvitesPage'
import { geckoRoutes } from '@gekos/pages/routes'

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/private', element: <PrivatePage /> },
  { path: '/private/invites', element: <InvitesPage /> },
  ...geckoRoutes,
])
```

### `hub/src/pages/PrivatePage.tsx` — přidat kartu

V `cards` array hned za polymarket:

```tsx
{
  id: 'geckos',
  icon: '🦎',
  title: 'Pagekoni řasnatí',
  description:
    'Krmení (cvrčci, banán, antib, mast), mlžení a historie péče o tři gekony.',
  tags: ['d1', 'react'],
  href: '/private/geckos',
},
```

### `hub/functions/api/geckos/` — mount Pages Functions

Pages Functions musí být fyzicky pod `functions/`. Nemůžou se importovat přes path alias. Dvě možnosti:

**A) Symlink (jen Unix-like CI build na CF Pages)** — přidat do `hub/package.json` prebuild script:
```json
"scripts": {
  "prebuild": "rm -rf functions/api/geckos && cp -r gekos/functions/api/geckos functions/api/geckos",
  "build": "npm run prebuild && vite build"
}
```
A do `hub/.gitignore`: `functions/api/geckos/`.

**B) Wrangler `pages_build_output_dir` přesměrování** — komplikovanější, A je spolehlivější.

CF Pages build běží na Linuxu, takže `cp -r` funguje. Lokální Windows dev (`wrangler pages dev`) vyžaduje pre-kopii — buď ručně `npm run prebuild`, nebo Robocopy v PowerShellu (přidat do prebuild script).

## Krok 4: Cloudflare Pages — povolit submoduly

V Cloudflare Pages dashboard → projekt hub → Settings → Builds → **enable git submodules**.

## Krok 5: Telegram notifikace (volitelné)

Cron Worker v [cron/](cron/) posílá Telegram zprávy:
- 09:00 Praha — ranní mlžení
- 22:00 Praha — večerní mlžení
- 11:00 a 21:00 Praha — staleness krmení (warn ≥2 dny, ultra ≥3 dny); idempotence zajistí 1 zprávu/den
- 24h+ po svlékání — kontrola

### a) Vytvořit Telegram bota

1. Otevři v Telegramu `@BotFather` → `/newbot` → zvol jméno (`gekos-bot`) a unikátní username
2. BotFather ti pošle **token** — zkopíruj
3. Spusť konverzaci s tím botem (`/start`), tím se ti přidělí chat_id
4. Otevři `@userinfobot` → pošle ti tvoje **chat_id** (číslo)

### b) Deploy cron Workeru

V `C:\Users\mikim\gekos\cron`:

```powershell
npm install
# nastavit secrets (interaktivně paste hodnoty):
npx wrangler secret put BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
# zkopírovat database_id z hlavního wrangler.toml do cron/wrangler.toml
npx wrangler deploy
```

### c) Otestovat ručně

```powershell
# wrangler ti po deploy řekne URL (něco jako https://gekos-cron.<acct>.workers.dev)
curl -X POST "https://gekos-cron.<acct>.workers.dev/?hour=22"
# pošle večerní reminder pokud dnes ještě nemlžil
```

### d) Tail logs

```powershell
cd cron
npx wrangler tail
```

## Krok 6: Update workflow

Když měníš gekos:
```powershell
cd C:\Users\mikim\gekos
# ... edit, commit, push
git push

cd C:\Users\mikim\hub
git submodule update --remote gekos
git commit -am "bump gekos"
git push   # ← spustí CF Pages build a deploy celého hubu včetně gekos
```

Můžeš si přidat alias v hubu: `npm run bump-gekos` = jeden příkaz pro krok 5.
