# gekos

Sub-app hubu (`MikiMaly/hub`, mmaly.cz) na `/private/geckos`, mountovaná jako git submodul.
UI (`src/`) se kompiluje v hubu, Functions (`functions/`) kopíruje hubovský prebuild.
Auth a přístup řeší hubovský middleware, viz `README.md`. Jazyk: česky.

## Vizuální identita hubu 2.0 „Skleník" (závazné)

Plný popis je v hubu: `design/identity-2.0.md` a vzorník na `/brand`.

- Stránky stav přes `src/components/GeckoShell.tsx`. Neimportuj React komponenty z hubu
  (gekos má vlastní `tsc`), používej jen hubovské CSS třídy `.hub-*`
  (`.hub-card`, `.hub-btn-*`, `.hub-input`, `.hub-pill-*`, `.hub-label`, `.hub-toast` …).
- Barvy jen přes tokeny hubu: `primary`, `mint`, `aqua`, `raspberry`, `apricot`,
  `success`, `warning`, `danger`, `info`. Žádné přímé Tailwind barvy (`blue-500` …).
- Sémantika: voda a mlžení = akvamarín, rescue/chyba/mazání = malina,
  kontrola/varování = meruňka, OK = zelená. Barva gekona (`color_hex`) jsou data,
  kreslí se tak, jak je.
- Ikony místo emoji tam, kde má mít ikona barvu ze stavu (emoji si barvu z CSS nebere).
