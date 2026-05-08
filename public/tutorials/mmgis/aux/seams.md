---
id: aux/seams
title: Seams
summary: The boundaries where MMGIS changes hands — the places every meaningful change has to cross.
---

A "seam" is a boundary where one half of the system stops knowing the implementation
of the other. These are the load-bearing edges in MMGIS — adding a feature usually
means crossing one or more of them, and most footguns live right on the line.

## browser-backend
Browser to Express. Carries the SPA bundle, JSON over `/api/*`, and a WebSocket upgrade
for [Draw](../components/backend-api/feature-modules.md) and presence. Auth is a
session cookie (`MMGISSession`) for humans; long-term tokens travel as
`Authorization: Bearer` headers. CORS is on, but in production the SPA and API share an
origin, so cross-origin only matters for iframe embedders that drive the
[mmgisAPI](../components/frontend-essence/mmgis-api.md) from a parent page.

## backend-postgres
Express to Postgres. Sequelize is the ORM for table definitions, model hooks, and the
session store via `connect-pg-simple`. But spatial work — Geodatasets MVT generation,
PostGIS GiST queries, ad-hoc geometry math — drops to raw SQL through `pg-promise`.
Two handles, one database; remember which side of the seam you are on when you write a
new query.

## backend-adjacent-services
Express to the optional Python sidecars (TiTiler, STAC, tipg, titiler-pgstac). The
front door is `adjacent-servers-proxy.js`, an `http-proxy-middleware` block per
service, gated by `ensureAdmin`. Inside Docker the upstream host is the Compose
service name; outside it is `localhost`. The browser only ever talks to MMGIS — the
sidecars are not internet-reachable.

## plugin-drop
Source tree to plugins. A directory matching `*Plugin-Tools*`, `*Private-Tools*`,
`*Plugin-Components*`, `*Plugin-Backend*`, or `*Private-Backend*` is gitignored, picked
up by `API/updateTools.js` (frontend) or `API/setups.js` (backend), and merged into the
build. No registry edit, no config flag — the convention itself is the seam. See
[Build and bundling](../components/build-and-bundling/index.md) and
[Feature modules](../components/backend-api/feature-modules.md).

## configure-essence
[Configure](../components/configure-spa/index.md) to [Essence](../components/frontend-essence/index.md).
The two SPAs share no bundle, no React tree, and not even a React major version. Their
only contact is the JSON config blob that Configure writes to `/api/configure/*` and
Essence reads at boot via `L_.init(config)`. If a layer field shows up in one and not
the other, the seam is the schema in `configure/src/metaconfigs/`.

## build-time-runtime
Code generation to the bundle. `scripts/build.js` runs `updateTools()` and
`updateComponents()` *before* webpack, scanning `Tools/` and the plugin dirs and
writing `src/pre/tools.js` and `src/pre/components.js`. Webpack then treats those
generated files like any other source. The plugin manifest is therefore a pre-build
artifact, not a runtime registry — restart the dev server after dropping in a new
plugin directory.

## embed-host
[mmgisAPI](../components/frontend-essence/mmgis-api.md) to the page or iframe parent
that loaded MMGIS. There is no postMessage protocol — embedders reach in through
`iframe.contentWindow.mmgisAPI` and call methods directly. The contract is whatever
JSDoc says is on the public `mmgisAPI` object plus the mitt event/request bus; the
inner core (`L_`, `Map_`, `ToolController_`) is explicitly off-limits.
