# Kontinentalist: handoff for the next AI

This file explains what has been built so far, how it fits together, and the rules the
project owner cares about, so another assistant can pick up the work without the chat history.
The code lives in `game/` inside the repository `vasilygenai/website_me` (the rest of the repo is
an unrelated company website). Development branch so far: `claude/determined-feynman-bqbvem`.

## 1. What the project is

- **Kontinentalist** is an online clone of the board game Catan (the rules are not protected;
  name and artwork are our own), inspired by colonist.io. It runs in the browser on laptop and
  phone; a Telegram Mini App is planned later.
- **Roles:** Admin (creates Pro codes), Pro (builds custom boards), Basic (plays only).
  Pro is unlocked by payment (later, e.g. Stripe) or by single-use codes only the admin can
  generate.
- **Custom board workflow (Pro):** draft → play once against bots ("tested") → publish (only the
  owner may use it with people) → share (appears for everyone under "Custom").
- **Campaign ("Welt"):** a globe to pick a continent, then a continent map to pick a country.
  Every country of a continent must be won to open the next continent. Only Europe exists so far.
- **Hosting is deliberately deferred** until the owner is fully satisfied. Today the owner tests
  through an offline single-file build published as a private claude.ai Artifact
  (`https://claude.ai/artifact/B8QVZPwt44TpBsdfVaLdpc`). `render.yaml` + `game/DEPLOY.md`
  describe a ready Render deployment (free plan).

## 2. Working with the owner

- **Language:** the owner writes and reads **German**. Answer in German; code, comments and
  commit messages are in English.
- **Rhythm:** short iterations. After each change: typecheck, tests, offline build, screenshots
  (Playwright), commit, push, republish the Artifact, then a German status report with what
  changed and what is still open. Send screenshots so the owner sees the result.
- **Taste and decisions so far:**
  - Low-poly artwork (the owner generates tile images with an AI image tool and sends them; we
    crop/fit them). A medieval/hand-painted style was rejected.
  - Sea calm and light; neighbouring countries drawn as a dark, muted earth tone so the resource
    tiles stand out.
  - Interactive feedback is welcome (blinking rolled tiles, flying cards, pulsing buttons), but
    timing matters: card flights were slowed down threefold on request.
  - Balance over realism, but both: resources where they really are, yet never more than three
    equal tiles in a row and every resource present.
- **Constraints:** never bypass bot protection (Cloudflare Turnstile etc.), never ask for
  passwords, no model names in commits or PRs, no pull request unless asked.

## 3. Repository layout (`game/`)

npm workspaces monorepo, TypeScript everywhere.

| Path | What it is |
|---|---|
| `packages/engine` | Pure, deterministic rules engine shared by server and browser |
| `packages/server` | Node WebSocket server (`ws`), rooms, auth, serves the web build |
| `packages/web` | React 19 + Vite 8 client, SVG board |
| `scripts/build-artifact.mjs` | Builds the offline single-file HTML (`npm run build:offline`) |
| `scripts/simulate.ts` | Bot-vs-bot simulations |
| `tools/countries/` | Python generators for the country boards (see §7) |
| `ART.md`, `DEPLOY.md`, `README.md` | Artwork guide, Render deploy guide, German overview |

Commands (run in `game/`): `npm run typecheck`, `npm test` (vitest, 55 tests at the time of
writing), `npm run build:offline`, `npm run dev` (server + web), `npm run simulate`.

## 4. Engine (`packages/engine/src`)

- `geometry.ts`: pointy-top axial hexes. Hex centre (q, r) sits at lattice x = 2q + r, y = 3r;
  corners are integer points, so vertex ids (`"x,y"`) are shared exactly between neighbours.
  Edge id = sorted pair of vertex ids. `topology(map)` builds tiles, vertices, edges, neighbours
  and the coastline; it also adds **bridges** (extra edges across water).
- `types.ts`: `GameState`, `MapDef`, `Action`, `GameEvent`, `Phase` … Notable `MapDef` fields:
  `tiles` (only land is listed, gaps are water), `ports` (with `kind`: harbor | gondola |
  treehouse | mine, purely visual), `fogPool`/`hidden` tiles, `fogReward`, `bridges`,
  `surroundings` (which cells around the board are sea and which are foreign land),
  `waterLabels` (names of seas/lakes), `flag` (`FlagDef`: stripes, `layout` horizontal |
  vertical | cross | union | triangle, optional `emblem` sk/si), `shuffleNumbers`.
- Terrains: forest, hills, pasture, fields, mountains, **gold** (pays any resource the owner
  picks: a `gold` phase and `chooseGold` action follow the roll), desert, fog.
- `game.ts`: `createGame`, `applyAction` (returns a new state; RNG is Mulberry32 stored in the
  state; map and log are shared rather than deep-cloned for speed). Boards with
  `shuffleNumbers` get their numbers dealt afresh per game.
- `rules.ts`: legality (distance rule, roads, cities), trade ratios, longest road, victory points
  (hidden victory point cards count only for their owner until the end).
- `balance.ts`: fairness rules learnt from good boards:
  - 6/8 never adjacent, 2/12 never adjacent, no two equal numbers adjacent;
  - big boards use whole doubled number sets, a partial set prefers 6, 8, 5, 9 … before 2, 12;
  - swaps equalise the average pips per resource;
  - `breakClusters`: never more than three equal tiles in a row.
- `bot.ts`: value-based bots (settlement scoring, trades they accept only when they gain, gold
  choice, discards).
- `view.ts`: `viewFor(state, seat)` redacts secrets (other hands, fog contents, dev deck,
  hidden VP cards until the end).
- `room.ts`: `Room` / `RoomRegistry` used by both the server and the offline build: seats, bots
  with delays, chat, game **settings** (turn timer 0/30s…5min, victory points, discard limit),
  and the **turn clock** (when time runs out the dice are rolled and the turn ends; discards,
  gold picks and trade answers have their own clock).
- `presets.ts`: all fixed boards. `PRESET_MAPS` maps an id to a builder, e.g. `deutschland`,
  `deutschland-klein`, … plus `nebelwald` (fog ring, hidden gold) and `goldrausch` (gold field in
  the centre). Country boards are written as row strings (see §7) and built by `drawnMap`.
- `protocol.ts`: client/server messages, `PresetId = 'standard' | keyof typeof PRESET_MAPS`,
  roles, settings.

## 5. Server (`packages/server/src`)

`main.ts` WebSocket server and static hosting; `auth.ts` HMAC-signed Pro codes and role tokens.
Env vars: `SECRET`, `ADMIN_KEY`, `DEFAULT_ROLE`, `DATA_DIR` (see `README.md`). No database yet.

## 6. Web client (`packages/web/src`)

- `App.tsx`: routing (`nav.ts` keeps routes in memory because the Artifact sandbox ignores hash
  links), records finished games and campaign wins.
- `local.ts`: the offline "server" (rooms and bots run in the browser) used by the Artifact build
  (`VITE_OFFLINE=1`). Running games survive republishes through the host's `window.claude.hot`
  snapshot/ready API.
- Screens: `Play` (preset/own boards, big/small switch, settings), `World` (globe + Europe
  campaign), `Rooms`, `Maps` + `Editor` (Pro map editor: paint terrain, fog layer, numbers,
  ports, undo/redo), `Lobby`, `Game`, `Leaderboard`, `Pro`, `More`, `Admin`.
- `components/Board.tsx`: the SVG board. Raised tiles with artwork clipped to hexes, sandy paths,
  wooden number discs, stone-bridge roads in player colour, houses/cities, bandit robber, flag on
  the desert, trading posts (bank with boat, cable car, tree house, mine cart, always exactly two
  walkways), boats placed only in open water, foreign land as muted dunes with a dashed border,
  water names, roll glow, fog reward "+1".
- `Game.tsx`: hand cards with "+n" badges, development cards with their own card art
  (`DevCards.tsx`), trade composer/panel, dice (`Dice.tsx`), card flights (`Flights.tsx`: your
  cards fly to your hand, opponents' cards drift upwards), turn clock, gold and discard dialogs,
  result table.
- `campaign/`: `progress.ts` (wins per country and size, in localStorage for now),
  `europeData.ts` (Europe as a hex grid of country codes, generated), `EuropeMap.tsx` (grey =
  to conquer, coloured = won, dark = no board yet; pan/zoom; country panel to play big or small),
  `Globe.tsx` (orthographic, auto-rotating, continents locked until the previous one is done).
- `theme.ts`: colours, artwork imports (`art/*.webp`, 640 px), port styles.
- Gotchas in the Artifact sandbox: no external images (art is inlined), avoid `scrollIntoView`,
  hash links are unreliable, offline build is unminified so errors are readable.

## 7. Country boards and how to add more

Countries so far (each big and small ≤ 21 tiles): Deutschland, Ukraine, Frankreich, Italien,
Spanien, Portugal, Polen, Niederlande, Belgien, Luxemburg, Liechtenstein, Österreich, Schweiz,
Vereinigtes Königreich, Irland, Tschechien, Slowakei, Slowenien, Ungarn (19). Germany and Ukraine
big were partly hand-tuned; the rest come from the generators in `game/tools/countries/`:

- `gen.py`: rasterises a lon/lat outline onto an odd-r hex grid, decides sea (`~`) vs foreign land
  (`.`) per cell, assigns terrain by regional "zones" under fixed shares (about 4:4:4:3:3 for
  wood, wool, grain, brick, ore), breaks clusters > 3, and places city labels.
- `tsgen.py`: picks 8 trading posts (two per end of the country, a land and a water one where
  possible, three 3:1 never adjacent, at least one harbour on any coast), finds water-label
  cells, fits the hex size to a target tile count, and emits the TypeScript `drawnMap({...})`.
- Country configs: `pl.py`, `it.py`, `fr.py`, `at.py`, `ch.py`, `ukie.py` (UK, Ireland),
  `newc.py` (NL, BE, LU, LI, ES), `newc2.py` (PT, CZ, SK, SI, HU), `small.py` (small versions).
  Drivers: `runnew.py`, `runnew2.py` write `newc*.ts` to paste into `presets.ts`.
- `europe.py`: builds `web/src/campaign/europeData.ts` from the same outlines plus coarse
  outlines of the countries that have no board yet.

To add a country: write its config (outline, sea test, zones, fixed tiles such as the desert
under the flag, cities, waters), generate big and small, paste into `presets.ts`, add both ids to
`PRESET_MAPS`, add it to `boards.ts` (capital + two largest cities), mark it `playable` in the
Europe data (rerun `europe.py`), and run the tests in `engine/test/presets.test.ts` and
`web/test/campaign.test.ts`. Each country should have: a flag, a desert for the flag/robber,
every resource, water names where there is water.

## 8. Testing and verification

- Unit tests: engine rules, maps, presets (validity, ports, clusters, numbers, bots finish games
  on every board), server rooms/timer/auth, web library, trades and campaign.
- Visual checks: Playwright with the preinstalled Chromium against the offline HTML wrapped in a
  minimal document; a stored game snapshot is injected through `window.claude.hot.ready`.

## 9. Open ideas and next steps mentioned by the owner

- More continents (Asia next), more European countries (Scandinavia, Baltics, Balkans …; they
  are already outlined on the Europe map as "coming soon").
- Resource icons instead of emojis on cards, pinch zoom on phones.
- Editor: choose the port kind (harbour, cable car, tree house, mine) for custom maps.
- Hosting (Render), a database for accounts and campaign progress, Stripe for Pro, Telegram
  Mini App.
