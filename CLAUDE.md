# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

A personal Next.js (App Router) web app for managing Spotify playlists and syncing them with Billboard charts. Two main features, each its own page:

- **`/playlists`** — browse the signed-in user's playlists, view/reorder tracks, copy tracks between playlists (with optional duplicate handling), remove duplicates, and "smart order" (artist-separation shuffle).
- **`/update-charts`** — scrape current Billboard charts, map chart songs to Spotify track IDs (via a local song cache + Spotify search), and push updates (new #1s, top-10s) into a fixed set of curated Spotify playlists.

There is no test suite and no separate backend — API routes under `src/app/api/**` are the entire server side, called from client components via `fetch`.

## Commands

```bash
pnpm dev          # start dev server (Next.js, Turbopack)
pnpm build        # production build
pnpm start         # run production build
pnpm lint          # eslint (flat config, eslint-config-next core-web-vitals + typescript)
node scripts/migrate-db.js   # one-off: migrate local music.db (SQLite) -> Postgres via DATABASE_URL
```

No test runner is configured. `tsconfig` runs in `noEmit` mode — use `tsc --noEmit` (or rely on `pnpm build`) to type-check.

## Architecture

### Auth: Spotify OAuth via encrypted cookie session

- `src/app/api/auth/{login,callback,logout,session}/route.ts` implement the OAuth authorization-code flow directly against `accounts.spotify.com` (no NextAuth or similar library).
- `src/lib/session.ts` encrypts/decrypts the session (access token, refresh token, expiry, user info) with AES-256-CBC into a single `spotify_session` cookie, and transparently refreshes expired access tokens on read via `getSession()`. **Every API route that touches Spotify data starts with `await getSession()`** and returns 401 if null.
- `src/lib/config.ts` holds `SPOTIFY_CLIENT_ID`/`SECRET` (with dev fallback defaults committed in source — real deployments override via env), scope list, and `getRedirectUri()`, which derives the OAuth redirect URI from request headers (`host`/`x-forwarded-host`/`x-forwarded-proto`) unless `SPOTIFY_REDIRECT_URI` is set explicitly. This header-derivation matters because the app runs both locally and behind a reverse-proxy path prefix in production.

### basePath / reverse-proxy deployment

The production deployment is served under a path prefix (e.g. `heshammourad.com/spotify-tools`), controlled by `NEXT_PUBLIC_SUBPATH_PREFIX` and normalized into `BASE_PATH` in `src/lib/config.ts`. `next.config.ts` wires `BASE_PATH` into Next's `basePath` and adds a root `redirects()` rule. `src/proxy.ts` additionally blocks direct (non-portal, non-Vercel-preview) access in production unless the request comes through the expected host or carries an `x-from-portal` header — this is intentional access control, not a bug, and any routing change should preserve it.

### Data layer: dual SQLite/Postgres, chosen at runtime

`src/lib/db.ts` picks Postgres (`pg`) when `DATABASE_URL` is a `postgres(ql)://` URL, else falls back to SQLite (`sqlite`/`sqlite3`), auto-creating a `songs` (Spotify track ID cache, keyed by lowercase title+artists) and `charts` (last-synced date per chart) table on first connection in either backend. Every query in `db.ts` has a Postgres branch (`$1` placeholders) and a SQLite branch (`?` placeholders) — when adding a query, implement both branches. `scripts/migrate-db.js` is a standalone one-time script (not imported by the app) for moving an existing local `music.db` into Postgres.

### Spotify API wrapper

`src/lib/spotify.ts` is the sole place that calls `api.spotify.com`. Key behaviors to preserve when editing it:
- All pagination follows `data.next` until null.
- Writes that can exceed Spotify's 100-item-per-request limit (add, remove, reorder) are chunked into batches of 100, with a short `sleep()` between batches where Spotify's backend needs time to register a prior write (see `reorderPlaylistTracks`, `addTracksInBatches`).
- `copyTracksToPlaylist` intentionally uses the token's read scope to pull tracks from *any* accessible playlist (including Spotify-curated ones) while writing only to user-owned playlists.
- `addTrackToPlaylist` / `removePlaylistTracks` are direct ports of an original Python client's methods (see comments) — position semantics (0-indexed) are load-bearing for the chart-sync logic in `update-playlists/route.ts`.

### Chart sync flow

`src/lib/billboard.ts` scrapes `billboard.com/charts/<id>` HTML with `cheerio` (no official API). `src/lib/config.ts`'s `CHART_PLAYLIST_MAP` and `BILLBOARD_CHARTS` define which charts map to which curated Spotify playlist IDs (`number_ones` / `top_tens`), plus a `TEMP_PLAYLIST_ID` used as a staging area for newly-added songs so the UI/downstream automation can see what changed. `src/app/api/charts/update-playlists/route.ts` is the orchestrator: clears Temp, walks each chart's songs, adds new entries to the mapped playlist(s) at rank-based positions, trims `top_tens` playlists back to 100 entries, and records the sync date via `updateChartDate`. The `src/app/update-charts` page/components handle the human-in-the-loop matching of chart songs to Spotify track IDs (searching/caching via `searchSong`/`addSong` in `db.ts`) before this endpoint is called.

### Smart order (artist separation)

`src/lib/smartOrder.ts` implements the SortYourMusic "smart order" greedy algorithm (interleave tracks so each artist's songs are spread proportionally through the playlist) in two forms: `smartOrderTracks` (returns a new sorted array of `SpotifyTrack`) and `smartOrder` (in-place, generic `item.track` shape, mutates `.smart` index) — keep both in sync if the algorithm changes.

### Frontend conventions

- MUI (`@mui/material` + Emotion) for all UI components; no separate CSS framework beyond Tailwind in `globals.css`.
- Client components fetch from the API routes directly (no client-side data-fetching library); `src/hooks/useFetchData.ts` is a thin wrapper around `useEffect` used to centralize the exhaustive-deps lint suppression for fetch-on-mount effects.
- Page-level state (playlists, tracks, dialogs) lives in `page.tsx` and is passed down to presentational components in `components/`; there is no global state store.
