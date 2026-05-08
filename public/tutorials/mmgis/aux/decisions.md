---
id: aux/decisions
title: Decisions
summary: Non-obvious decisions whose context shapes the rest of MMGIS — read these once and a lot of the codebase stops looking weird.
---

## Why two map engines, not one?
Leaflet and deck.gl coexist in `Basics/MapEngines/` because each is the right answer
for a different mission. The historical Leaflet 1.x map handles slippy 2D mission-ops
UIs that expect a Leaflet API surface — and a decade of MMGIS code that assumed it.
The deck.gl adapter is the in-flight migration target for high-feature-count layers
and WebGL2 styling. The two share an `IMapEngine` facade so the rest of Essence does
not care which is active, but a scattering of `if (Map_.engine.engineType !== LEAFLET)
return` early-exits in `Map_.js` reveal that the migration is partial.

## Why a separate Configure SPA, not a panel inside Essence?
Different audience, different lifecycle. Configure is for mission ops, edited rarely;
Essence is for end users, loaded constantly. Configure can ship React 17, MUI v5,
Redux Toolkit, and `react-scripts` without dragging that weight into the user-facing
bundle. Keeping them separate also means an admin-permission failure on
`/configure` cannot leak admin-only code into a regular session — the bundles
genuinely never overlap.

## Why a CRA-eject Webpack 5 config instead of plain Vite or modern CRA?
Cesium, plugin globs, and Node-core polyfill controls. Cesium needs a `CopyWebpackPlugin`
for `Workers/`, `Assets/`, `Widgets/`, plus a `CESIUM_BASE_URL` `DefinePlugin`. The
plugin-drop convention needs `ModuleScopePlugin` and a code-generation step that runs
before webpack. Webpack 5's `resolve.fallback` lets MMGIS explicitly disable Node
polyfills that the auto-shim used to add. Switching to Vite would mean reimplementing
all of that — the cost is "every Essence build is now a custom config" and the team
took it.

## Why two database handles?
Sequelize is a great ORM for table definitions, model hooks, and the session store. It
is also fine for raw spatial SQL — most modules just call `sequelize.query` for their
PostGIS work — so the codebase happily uses Sequelize for almost everything. The lone
exception is the Draw module, which reaches for a `pg-promise` handle in
`API/database.js`. So MMGIS keeps two handles: a Sequelize instance in
`API/connection.js` for the bulk of the app, and a `pg-promise` handle for Draw. New
code follows the precedent of its neighbors.

## Why is the test suite Playwright for *both* unit and e2e?
The README still says Jest. The reality is that `tests/` migrated to Playwright so
fast specs and full-stack browser specs share the same runner, the same imports, the
same HTML reporter. Jest stays around as a name in the README and a few stray dev
deps; the truth is in `playwright.config.js`. One runner means one CI matrix, one
report, and one set of fixtures that both layers import as plain ES modules.

## Why does the dev server use two ports?
`npm start` runs the Express API on `PORT` (default 8888) and the Webpack dev server
on `PORT + 1` (8889). The split exists because the Express server hosts `/configure`,
`/docs`, the API, and the Pug-rendered SPA shell, while WebpackDevServer needs to
own the Essence bundle and HMR. In production both collapse onto one port by serving
the static `build/` from Express. If you forget the second port in development, the
SPA loads but tools never finish booting — the bundle never arrives.

## Why a plugin-drop directory convention instead of a registry?
MMGIS is shipped as source to operators who customize it for a specific mission and
do not want to upstream their tools. A registry file would create merge conflicts on
every pull from `master`. A naming convention plus a gitignore line means an
integrator can drop `MyOrg-Private-Tools/` next to `Tools/`, restart, and have the
build pick it up without ever editing a tracked file. The cost: there is no central
list of what is loaded, and `src/pre/tools.js` is a generated artifact you cannot
read in tracked source.

## Why is the WebSocket a noServer upgrade and a broadcast bus?
`API/websocket.js` does not bind its own port — it attaches to the existing HTTP
server's `upgrade` event so it inherits the same TLS, the same hostname, and the
same firewall posture. The default behavior is "broadcast every received message to
every open client," because the only consumers (Draw collaboration, presence) are
already filtering messages on the client. A per-mission room model was not worth the
complexity for the load profile.

## Why is the spec-kit retroactive?
`/specs` and `/.specify` were added after most of MMGIS already existed. The intent
is to give contributors a place to write design docs before code, without claiming
the existing code was specced first. Treat it as forward-going documentation — useful
for new features, occasionally helpful for archaeology, but not authoritative on
anything older than the spec itself.
