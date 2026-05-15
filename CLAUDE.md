# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

"Larry Page" approximates uploaded images with a small set of semi-transparent triangles, using a hill-climbing genetic algorithm running in the browser. The fittest DNA per image is persisted to Cloudflare KV via a Worker, and a gallery cycles through stored images.

Deployed at https://larry.jeremi.se (Cloudflare Worker serves both the API and the built frontend as static assets).

## Commands

Package manager is **pnpm** (workspace). Run from the repo root unless noted.

- `pnpm dev` — start the Vite frontend dev server (cd's into `frontend`). The frontend talks to the deployed API at `larry.jeremi.se` (see `shared/src/shared.ts`) — there is no local backend dev workflow wired up by default; use `cd backend && pnpm dev` to run `wrangler dev` if you need it.
- `pnpm build` — typechecks + builds both `frontend` (tsc + vite) and `backend` (tsc).
- `pnpm deploy` — builds the frontend, then `wrangler deploy` from `backend` (the Worker bundles `frontend/dist` as its assets directory; see `backend/wrangler.toml`).
- `pnpm --filter <pkg> <script>` — run a script in a single workspace (`frontend`, `backend`, `shared`, `wasm-worker`).
- No test runner is configured at the workspace level.

Formatting: Prettier with React's config (`.prettierrc.js`) — no semis, single quotes, `bracketSpacing: false`, `arrowParens: 'avoid'`, trailing commas. Match it when editing.

## Architecture

Three workspace packages plus several standalone experimental sister directories.

### Active packages

- **`shared/`** — pure TS types and algorithm primitives shared by frontend and backend. The key module is `shared/src/dna.ts` which defines `Dna` (an image + its current set of `Triangle` genes + `fitness`). `fitness-calculator.ts` and `gene-mutator.ts` implement the GA inner loop.
- **`frontend/`** — Vite + React 18 SPA. `App.tsx` is tiny: it loads a `Dna` (random or by `?dna=<id>`) and renders `DnaRenderer` (live optimization view) + `Uploader` + `DnaGrid` (gallery). The optimization itself runs in a Web Worker:
  - `scripts/rasterizer.ts` (`JsRasterizer`) spawns Web Workers, owns the canonical `Dna`, and re-checks fitness on the main thread when a worker reports back (it logs a warning if main-thread vs worker fitness disagree — that catches mutator bugs).
  - `scripts/rasterizer.worker.ts` runs the actual mutate-and-keep-if-better loop using `shared/src/gene-mutator.ts`. There is a deliberate 1s sleep + `targetIterations = 1` at the top of the loop currently (marked `// DEBUG`) — don't mistake this for a bug unless you're intentionally re-enabling fast mode.
  - `scripts/api.ts` (`DnaApi`) is the only place that talks to the Worker. `uploadNewImage` re-encodes whatever the user picked as PNG client-side via canvas (this is how iPhone HEIC uploads are handled — see commit `c7330de`).
- **`backend/`** — Cloudflare Worker (`backend/src/index.ts`). Single `fetch` handler that dispatches on `?route=` query param. All persistence is in one KV namespace (binding `KV`). Key conventions:
  - `image:<id>` — uploaded PNG bytes.
  - `dnaIds:<id>` — marker that an image has DNA; `dnaIdsList` is the JSON cache of all such ids.
  - `fitness4:<id>:<14-digit-zero-padded-fitness>` — per-DNA snapshots. Lexicographic sort = fitness sort, so `KV.list({prefix})` returns fittest first. The `4` is a schema version; older `fitness2:`/`fitness3:` prefixes exist and the `deleteall` route exists to purge them.
  - `fittestDnaList` — a precomputed `[dna, dna, ...]` JSON blob the frontend grid reads via `?route=list`.
  - `lastReturnedId` — round-robin cursor for `?route=random`.
  - `updateCurrentList` is the route that rebuilds `dnaIdsList` and `fittestDnaList` after mutations — call it after schema changes or bulk imports.
  - CORS `Access-Control-Allow-Origin` is hardcoded to `http://localhost:1234` (a stale dev port from an older Parcel setup). Vite defaults to 5173; if you need real local cross-origin dev against the deployed worker, expect to either change this or proxy.

### `wasm-worker/` (workspace member, not currently wired into the frontend)

AssemblyScript port of the rasterizer in `wasm-worker/assembly/raster.ts`. Lives in the workspace but the frontend's `JsRasterizer` does not use it yet — it's groundwork for the README TODO "Web assembly script the workers."

### Standalone experiments (NOT in the pnpm workspace)

`rasterizer-js/`, `rust-wasm/`, `go-test/`, `web-gl-test/`, `metal/` are independent prototypes for alternative implementations of the same triangle-fitting idea. They are not built by `pnpm build` and should be treated as scratch unless the user asks about them specifically.

## Things to know before editing

- The `Dna` shape in `shared/src/dna.ts` is the contract between worker, main thread, and KV. Changing it is a schema migration — bump the `fitnessN:` prefix in the backend and add a migration route, don't silently break stored records.
- Fitness is computed in two places (worker and main thread, both via `shared/src/fitness-calculator.ts`). Keep them using the same code path — the divergence warning in `rasterizer.ts:46` exists because this has bitten before.
- The Worker serves the frontend bundle via `[assets] directory = "../frontend/dist"` in `wrangler.toml`, so `pnpm deploy` must rebuild the frontend first (the root `deploy` script already does this).
