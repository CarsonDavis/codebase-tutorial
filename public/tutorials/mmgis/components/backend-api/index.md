---
id: backend-api
title: Backend (API server)
summary: Express 4 server that hosts the SPA, mounts a tree of feature modules under /api, talks to Postgres/PostGIS via Sequelize, and runs a WebSocket that fans out mission-config changes to open admin clients.
key_idea: One Express process composes a tree of feature modules with identical models/routes/setup.js shape, each receiving a shared "s" toolkit during a synced/init/started lifecycle.
seams_touched:
  - browser-backend
  - backend-postgres
next:
  - backend-api/server-bootstrap
---

The backend is a single Node 20 process started by `npm start`. It is responsible for
serving the [Essence](../frontend-essence/index.md) SPA, hosting the
[Configure](../configure-spa/index.md) admin app, exposing the JSON API under `/api`,
proxying to optional [adjacent Python services](../adjacent-servers/index.md), and
upgrading certain connections to a WebSocket that fans out mission-config changes to open admin clients. The code
lives in two top-level directories: `scripts/` (process entry points) and `API/`
(Express composition plus the feature-module tree).

The shape worth holding in your head: there is one `setup` lifecycle that scans
`API/Backend/<Name>/setup.js` and gives every feature module the same toolkit (the `s`
object — Express app, auth guards, permissions, root path, common middleware). Every
feature module follows the same `models/` + `routes/` + `setup.js` layout. That
uniformity is what makes the backend extensible without a framework, and it is also
what makes the plugin-backend convention work (drop a `*Plugin-Backend*` directory,
have it match the same shape, restart). Read [server bootstrap](./server-bootstrap.md)
first; the other two pages assume you understand how feature modules are mounted and
where session/auth state comes from.

## In this component

- **[Server bootstrap and middleware](./server-bootstrap.md)** — the boot order from
  `npm start` to a serving Express app: `init-db.js` waits on Postgres and runs
  migrations, `scripts/server.js` composes Express (sessions first, then helmet, body
  parsing, swagger/OAS, static SPA), `setups.js` discovers and mounts every backend
  feature module via `onceInit` / `onceSynced` / `onceStarted` hooks, and
  `API/websocket.js` attaches a `noServer: true` WS upgrade. Also covers the four
  reusable guard middlewares and the `s` toolkit object passed to feature modules.

- **[Feature modules under API/Backend](./feature-modules.md)** — the canonical
  module shape (`setupTemplate.js`), and a guided tour of the modules that matter:
  Datasets and Geodatasets (vector data + PostGIS spatial queries), Draw (user-drawn
  features, multi-user via shared Postgres rows), Config (mission/layer config CRUD that
  powers Configure and is the lone publisher on the WebSocket),
  Stac (proxy to the adjacent STAC service), Webhooks, Shortener, GeneralOptions,
  Utils. Auth modules (Accounts, Users, LongTermToken) follow the same shape but are
  covered on the next page.

- **[Auth, accounts, and sessions](./auth-and-sessions.md)** — sign-up, sign-in, the
  first-user-becomes-admin flow, the `connect-pg-simple`-backed session store, and
  the parallel long-term-token path used for programmatic access. Also: how routes
  declare auth requirements via the `ensureUser` / `ensureAdmin` / `ensureGroup` /
  `stopGuests` guards from the `s` toolkit.

The natural reading order is bootstrap → feature-modules → auth, but if you are here
to add a backend feature, jump straight to feature-modules and follow the
`setupTemplate.js` shape.
