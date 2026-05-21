---
id: backend-api/server-bootstrap
title: Server bootstrap and middleware
summary: How the MMGIS process starts, composes Express, mounts feature modules, and attaches the WebSocket server.
related:
  - backend-api/feature-modules
  - backend-api/auth-and-sessions
key_idea: init-db.js gates startup behind Postgres readiness and PostGIS extension creation, then server.js composes Express with sessions-first ordering and hands a shared "s" toolkit to every feature module's synced/init/started hooks.
watch_out:
  - Sessions are wired before helmet and bodyParser, not after — cssoHandler depends on req.session existing, so reordering middleware here will silently strip user identity.
seams_touched:
  - browser-backend
  - backend-postgres
next:
  - backend-api/feature-modules
---

## Process startup

`npm start` runs two scripts in sequence:

```
node scripts/init-db.js && node scripts/server.js
```

`scripts/init-db.js` is a one-shot bootstrapper. It opens a Sequelize connection with no database name, runs `CREATE DATABASE` for `DB_NAME` (and, when STAC/tipg/titiler-pgstac are enabled, for `mmgis-stac`), then reconnects to the new database and ensures the PostGIS and `btree_gist` extensions, the `connect-pg-simple` `session` table, and the GIST indexes on `user_features` all exist. It treats Postgres error code `42P04` ("database already exists") as expected and any other code as fatal. The script exits 0 on success or 1 on failure, which is what gates the `&&`.

Once the DB is ready, `scripts/server.js` runs. The shared Sequelize instance is in `API/connection.js` (a second `pg-promise` handle is exposed by `API/database.js` for the few features that need raw-SQL composition).

## Composing Express

`server.js` builds a single `express()` app and layers middleware in roughly this order:

- `app.set("trust proxy", 1)` and an `express-rate-limit` cap on `/api/`.
- `compression()` with an image-content-type bypass.
- `helmet()` with a permissive CSP (Leaflet/Cesium/Mapbox tile URLs vary widely) and `frameAncestors`/`frameSrc` driven by env.
- Pug as the view engine (login, admin login, error, and SPA shell are all Pug).
- `cssoHandler` — runs on every request, normalizes `req.user` and `req.groups` from either CSSO proxy headers or `req.session.user`.
- `bodyParser` (500 MB cap, since `Draw` and `Datasets` accept large GeoJSON payloads), `cookieParser`, `cors()`.
- Swagger UI mounted at `${ROOT_PATH}/api/docs` from `docs/mmgis-openapi.json`.

Sessions are wired up earlier, before any of the above, because `cssoHandler` reads `req.session`:

```js
const pool = new Pool({ /* DB_* env */ });
app.use(session({
  secret: process.env.SECRET || "Shhhh, it is a secret!",
  name: "MMGISSession",
  store: new (require("connect-pg-simple")(session))({ pool }),
  resave: false, saveUninitialized: false, proxy: true,
  cookie: cookieOptions,
}));
```

The session store is the `session` table that `init-db.js` created. How that session becomes a logged-in user — including the long-term-token path — is covered in [auth and sessions](./auth-and-sessions.md).

## Per-route guards

`server.js` defines four guard factories that the feature modules pull off the shared `s` object:

- `ensureUser()` — redirects unauthenticated requests to the login Pug template, or validates a Bearer long-term token if `Authorization` is present.
- `ensureAdmin(toLoginPage, denyLongTermTokens, allowGets, allowPosts, disallow)` — gate for write endpoints; permission `111`/`110` sessions pass, plus a hard-coded allowlist of read-only endpoints.
- `ensureGroup(allowedGroups)` — CSSO group check; no-ops when `AUTH != "csso"`.
- `stopGuests` — rejects the `guest` user except on a small allowlist.

A separate `scripts/middleware.js` exports `middleware.missions(ROOT_PATH)`, a path-traversal-hardened static guard used in front of `express.static` for the `/Missions` tile/asset tree. It also implements the `_time_` URL convention used to serve time-windowed tile composites via `sharp`.

## Mounting feature modules

The whole server build is wrapped inside a callback from `setups.getBackendSetups`, which is the plugin loader. It scans `API/Backend/` for sibling directories (skipping names starting with `_` or `.`), then scans `API/` for any `*Private-Backend*` or `*Plugin-Backend*` directories and `require`s each of their nested setups. Every loaded module is keyed by directory name and sorted by `priority`. Three lifecycle hooks are returned: `synced` (after `sequelize.sync()`), `init` (before `httpServer.listen`), and `started` (after the server is listening):

```js
setups.getBackendSetups((setups) => {
  sequelize.sync().then(() => setups.synced(s));        // models registered
  // ...statics, swagger, env validation...
  setups.init(s);                                       // routes mounted
  httpServer.listen(port, () => {
    setups.started(s);                                  // post-listen hooks
    if (process.env.ENABLE_MMGIS_WEBSOCKETS) websocket.init(httpServer);
  });
});
```

The `s` object passed into each hook bundles `app`, the four guards, `swaggerUi`, `permissions`, and `ROOT_PATH`. That contract is what every feature module under `API/Backend/<Name>/setup.js` consumes — see [feature modules](./feature-modules.md) for the shape they implement.

## WebSocket upgrade

`API/websocket.js` does not bind its own port. `websocket.init(httpServer)` creates a `ws.Server({ noServer: true })` and attaches an `upgrade` handler to the existing HTTP/HTTPS server. Only requests whose pathname matches `WEBSOCKET_ROOT_PATH` (or `ROOT_PATH`) followed by `/` are handed to `wss.handleUpgrade`; anything else has its socket destroyed. The default behaviour is a simple broadcast bus — every received message is forwarded to all open clients. In practice there is one publisher (the Config module, after a successful mission-config save) and two consumers: the Configure SPA reacts with a "this config changed, refresh" warning, and the main Essence client refetches the config and updates its layer set in place. Draw is *not* a consumer — its concurrent-edit story is shared Postgres rows with last-write-wins, not WS deltas.

`logger` (`API/logger.js`) is a thin Winston wrapper used everywhere in this path; it pretty-prints in development and emits one JSON line per call in production, with bodies/queries cropped and `password` redacted. `utils.isDocker()` is used during boot to set `IS_DOCKER` for the rendered SPA shell and for the adjacent-servers proxy initializer.
