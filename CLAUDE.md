# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Babi Games** — a French-language ("Babi"/Ivorian slang), 100% client-side React + Vite SPA of Ivorian-culture mini-games. No backend, no router, no tests. All UI copy, comments, and data are in French — keep it that way.

## Commands

```bash
npm run dev          # Vite dev server
npm run build        # production build to dist/
npm run preview      # serve the built dist/
npm run lint         # oxlint (config in .oxlintrc.json)
npm run seed:images  # re-run the image seeder — see warning below
```

There is no test runner in this project.

## Architecture

### Single-page state container

[src/App.jsx](src/App.jsx) is the whole application shell: it owns all five data collections (`artists`, `footballers`, `publicFigures`, `foods`, `products`), does manual view switching through an `activePage` string (`dashboard | versus | tierlist | justeprix | admin | credits`) — there is no router — and passes data and setters down as props. Adding a page means adding a case to `renderActivePage()` plus an entry in `navItems` in [src/components/Navbar.jsx](src/components/Navbar.jsx).

### Data flow and the localStorage cache

Data is bundled at build time from [src/data/db.json](src/data/db.json), then mirrored into localStorage so Admin edits survive reloads:

- On mount, App reads `civ_data_artists`, `civ_data_footballers`, `civ_data_publicfigures`, `civ_data_foods`, `civ_data_products`; if a key is missing/empty/unparseable it falls back to `db.json`.
- `civ_data_version` gates a forced reset. **Whenever you change the shape or contents of `db.json`, bump the version string in [src/App.jsx](src/App.jsx) (currently `'v4'`, in `shouldForceReset`) or returning users will keep their stale cached copy.**
- Separate `useEffect`s write each collection back on change — note they skip writing when a list is empty, so deleting every item in a category in Admin does not persist.

Gameplay stats live in their own flat keys (`stats_versus_played`, `stats_tierlists_saved`, `stats_justeprix_best`, `stats_justeprix_played`, `saved_tierlists`) written directly by the game components and read by [src/components/Dashboard.jsx](src/components/Dashboard.jsx).

### Item shape

Every item across all five collections shares one shape, which the games, Admin, and Credits all assume:

```js
{ id, name, image, status: 'ok' | 'a_verifier_manuellement', source, license, author,
  category?,        // artists/footballers/publicFigures/products
  price?            // products only, in CFA
}
```

`status`/`source`/`license`/`author` exist because [src/components/Credits.jsx](src/components/Credits.jsx) renders a legal attribution page over all items, and Admin refuses to save an item with a custom image unless source, license, and author are all filled in. Preserve these fields when adding or transforming items.

### Images and the seeder pipeline

[scripts/seed_images.js](scripts/seed_images.js) is a one-shot Node script (ESM, uses `sharp`) that reads [src/data/rawItems.json](src/data/rawItems.json) — the hand-maintained source list of ~227 items, keyed by `type`: `artiste | footballeur | public | nourriture | produit` — and for each item:

1. Wikidata `wbsearchentities` → `P18` claim → Wikimedia Commons `imageinfo` for the URL, license, and author.
2. Openverse fallback, **foods and products only**, marked `a_verifier_manuellement` since it needs a human look.
3. Trademarked brands (`BRANDS_TO_SKIP`) are skipped entirely — no API call.
4. Download, resize to max 400×400, save as progressive JPEG at `public/images/<folder>/<id>.jpg`.

It writes two files: `src/data/db.json` (the app's data) and `public/rapport.json` (an audit report of what still needs manual verification). It uses a hand-rolled `https` wrapper rather than `fetch` — deliberate, for IPv4-first DNS, keep-alive agents, and timeouts on Windows — and disables Wikidata or Openverse for the rest of the run after 5 consecutive failures.

**The seeder overwrites `db.json` wholesale.** If the network fails, every entry comes back as a placeholder and previously-resolved image references are lost even though the JPEGs still sit in `public/images/`. That is the current state of the repo: `db.json` has 227 items all pointing at placeholders, while `public/images/` holds ~116 downloaded photos from an earlier successful run. Back up `db.json` before running it.

Components tolerate missing images: each tracks an `imageErrors` map and falls back on `onError` to an initials avatar over a hash-derived HSL gradient (`getGradientStyle`), so a broken `image` path degrades rather than breaking the layout.

### Games

- **Versus** ([src/components/Versus.jsx](src/components/Versus.jsx)) — single-elimination bracket over 4/8/16/32 shuffled people; state machine `selection → playing → winner`, with `currentRoundItems`/`nextRoundItems` and a `duelIndex` advancing by 2.
- **TierList** ([src/components/TierList.jsx](src/components/TierList.jsx)) — S→F rows, HTML5 drag-and-drop plus a tap-to-select fallback for mobile (`selectedItem` + `handleZoneClick`). Non-food categories are sampled down to 16 random items.
- **JustePrix** ([src/components/JustePrix.jsx](src/components/JustePrix.jsx)) — guess CFA prices for 5 random products; points awarded by percentage error bands (0% → 1000, ≤10% → 800, ≤25% → 500, ≤50% → 200, else 0), with Abidjan-flavored rank titles.
- **Admin** ([src/components/Admin.jsx](src/components/Admin.jsx)) — CRUD over all five collections, tab-switched via `getActiveListProps()`. Uploaded images are stored as Base64 data URLs inside localStorage (acknowledged V1 debt, noted in the UI itself).

### Styling

[src/index.css](src/index.css) is the single design system: a dark glassmorphism theme with Ivorian orange/white/green accents driven by CSS custom properties on `:root` (`--color-orange`, `--color-green`, `--bg-card`, `--radius-*`, `--transition-*`) and shared classes (`.glass-panel`, `.btn-*`, `.card`, `.avatar-fallback`, plus per-game `.versus-*`, `.tier-*`, `.prix-*`). Components mix these classes with heavy inline `style` objects — follow that existing pattern rather than introducing a CSS framework.

## Dead code

`src/App.css` (Vite template leftover, imported nowhere) and `src/data/defaultData.js` (an older Deezer-CDN-based dataset, superseded by the `db.json` seeder). `scripts/test_sharp.js` is a throwaway sharp/network smoke test.
