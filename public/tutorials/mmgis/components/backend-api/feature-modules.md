---
id: backend-api/feature-modules
title: Feature modules under API/Backend
summary: The repeating shape every backend feature follows, and a tour of the modules that matter.
related:
  - backend-api/server-bootstrap
  - backend-api/auth-and-sessions
  - adjacent-servers
key_idea: Every backend feature is a directory with models/, routes/, setup.js — onceInit mounts routers behind guards from the shared "s" toolkit, and the same loader picks up *Plugin-Backend* directories without core changes.
watch_out:
  - Sequelize is the default handle and is used even for raw spatial SQL via `sequelize.query`. Draw is the lone module that reaches for pg-promise (`API/database.js`) — pick the handle by precedent, not feeling.
seams_touched:
  - backend-postgres
  - plugin-drop
  - browser-backend
prerequisites:
  - backend-api/server-bootstrap
next:
  - backend-api/auth-and-sessions
---

## The shape

Every backend feature lives in its own directory under `API/Backend/`. The directories are nearly interchangeable in shape:

```
API/Backend/<Name>/
  models/      # Sequelize model definitions (tables and helpers)
  routes/      # Express routers — one file per logical surface
  setup.js     # Wires the routers into the app at boot
```

[Server bootstrap](./server-bootstrap.md) walks every directory under `API/Backend/`, `require`s its `setup.js`, and calls three lifecycle hooks during boot: `onceInit(s)`, `onceStarted(s)`, and `onceSynced(s)`. The `s` object is the shared "kit" — it carries `s.app` (the Express app), `s.ROOT_PATH`, the auth guards (`ensureUser`, `ensureAdmin`, `ensureGroup`, `stopGuests`), header/content-type middleware (`checkHeadersCodeInjection`, `setContentType`), and the permission table. See [auth and sessions](./auth-and-sessions.md) for what those guards check.

`API/Backend/setupTemplate.js` is the canonical skeleton, copy this when adding a module:

```js
const router = require("./routes/your_router");

let setup = {
  onceInit:    (s) => {},   // mount routers, register routes
  onceStarted: (s) => {},   // anything that needs the HTTP server live
  onceSynced:  (s) => {},   // run after Sequelize finishes table sync
  envs: [{ name: "ENV_VAR", description: "", required: false, private: false }],
};

module.exports = setup;
```

A typical `onceInit` is three lines: pick a path under `/api/...`, stack the right guards, hand off to the router.

```js
s.app.use(
  s.ROOT_PATH + "/api/datasets",
  s.ensureAdmin(),
  s.checkHeadersCodeInjection,
  s.setContentType,
  router
);
```

The same loader also picks up directories matching `*Private-Backend*` or `*Plugin-Backend*` next to `API/`, so plugin authors get the same lifecycle hooks without touching core.

## Tour of the modules

**Datasets** is the meatiest module and the reference for the rest. `models/datasets.js` keeps a registry table of named tabular datasets plus a `makeNewDatasetTable` factory that defines a fresh Sequelize model per dataset on demand. `routes/datasets.js` exposes CSV/JSON ingestion (Busboy + csvtojson), search-by-column, append/replace/delete, and the cross-references that show which mission configs use a given dataset. Everything is admin-only.

**Geodatasets** is Datasets' spatial sibling. The model owns a registry of PostGIS-backed tables; the router serves features as GeoJSON or Mapbox Vector Tiles (the `type === "mvt"` branch builds the tile from `x/y/z`), with optional column projection, filters, deduplication, and group/id lookup. Reach for it when adding a vector layer the frontend should query live.

**Draw** is the real-time drawing system. It splits into three routers (`files`, `draw`, `aggregations`) and four models (`userfiles`, `userfeatures`, `filehistories`, `published`/`publishedstore`). It is the only module gated by `s.stopGuests` — guests can read but cannot write — and it fires webhooks on changes via `Webhooks/processes/triggerwebhooks` (see the **Webhooks** entry below). Touch it when changing how user-drawn features are persisted, versioned, or aggregated. Live updates are pushed to other clients through the WebSocket server (see [server bootstrap](./server-bootstrap.md)).

**Config** owns mission configuration. `onceInit` registers both the `/configure` admin SPA shell (Pug-rendered with feature flags like `WITH_STAC`, `WITH_TIPG`, `WITH_TITILER`) and the `/api/configure` CRUD endpoints used by it. The router is large because it versions every config and resolves layer UUIDs (`uuids.js`, `validate.js` are the helpers). Most "the admin tool can't save X" bugs land here.

**Stac** is a thin proxy. It forwards calls like `/api/stac/collections` to the STAC-FastAPI sidecar (`stac-fastapi:8881` in Docker, otherwise `localhost`) and decorates the response with mission/layer occurrences pulled from the `configs` table. See [adjacent servers](../adjacent-servers/index.md) for how that sidecar is wired up — TiTiler and tipg follow the same pattern but are proxied at the HTTP layer rather than in a feature module.

**Webhooks** stores user-defined HTTP callbacks (`/api/webhooks`), exposes `/api/testwebhooks` in development only, and provides `processes/triggerwebhooks.js` that other modules call (e.g., Config, Draw) to fire events.

**Shortener** is the smallest example: one model, one router under `/api/shortener`. Generates a random short code, stores `(short, full, creator)`, redirects on lookup. Honors `DISABLE_LINK_SHORTENER`. Read it first if you want to see the full shape end-to-end without distraction.

**GeneralOptions** and **Utils** round out the tree — the former is currently a no-op placeholder, the latter mounts a small grab-bag router at `/api/utils`. **Accounts**, **Users**, and **LongTermToken** belong to the same shape but are covered separately under [auth and sessions](./auth-and-sessions.md).
