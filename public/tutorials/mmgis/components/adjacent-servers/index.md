---
id: adjacent-servers
title: Adjacent servers (TiTiler, STAC, tipg)
summary: Optional Python tile and feature services that MMGIS proxies to, wired in as opt-in Compose profiles behind a single `/`-rooted front door.
related:
  - backend-api/server-bootstrap
  - backend-api/feature-modules
key_idea: Four upstream Python services (TiTiler, TiTiler-pgSTAC, STAC, tipg) are launched either by Node child_process or Compose profile, then fronted by a single proxy that gives the browser one origin and admin-gates anything mutating.
watch_out:
  - The browser never talks to ports 8881–8884 directly — if a STAC or tile request "works locally but fails in production," the answer is almost always the proxy block in adjacent-servers-proxy.js, not the upstream service.
seams_touched:
  - backend-adjacent-services
  - browser-backend
prerequisites:
  - backend-api/server-bootstrap
---

MMGIS leans on a small constellation of best-of-breed Python services for things Node is bad at: tiling cloud-optimized GeoTIFFs, serving a STAC catalog, and producing vector tiles from PostGIS. Rather than reimplement any of it, MMGIS runs each as a separate process and proxies through to it. Everything in this component lives under `adjacent-servers/`.

## The four services

- **TiTiler** (`titiler/`, port `8883`) — DevelopmentSeed's dynamic raster tile server. Reads COGs (cloud-optimized GeoTIFFs) and emits map tiles on demand. The script entry is `uvicorn titiler.application.main:app`.
- **TiTiler-pgSTAC** (`titiler-pgstac/`, port `8884`) — TiTiler variant that mosaics imagery driven by a STAC search in Postgres. Pairs with `stac-fastapi` and shares the `mmgis-stac` database.
- **STAC** (`stac/`, port `8881`) — `stac-fastapi-pgstac`, a SpatioTemporal Asset Catalog server backed by the pgstac Postgres extension. The MMGIS [Stac feature module](../backend-api/feature-modules.md) talks to this to register and search catalog items.
- **tipg** (`tipg/`, port `8882`) — DevelopmentSeed's OGC API Features / vector tile server. Serves any PostGIS table or function as features or MVT tiles.

Each folder is intentionally tiny: an `.env.example`, plus `start-<service>.sh` / `.bat` scripts that just `python -m dotenv run python -m uvicorn <app> --port $1`. There is no MMGIS-authored Python here — the upstream packages do the work.

## Two ways to run them

The same set of services can be launched two ways, depending on deployment style:

1. **Local Node spawn.** `adjacent-servers/adjacent-servers.js` is called from the main server bootstrap (see [server-bootstrap](../backend-api/server-bootstrap.md)). It iterates the four services and, for each one whose `WITH_<SERVICE>` env flag is `"true"`, `child_process.spawn`s the matching start script. Useful for `npm start` development outside Docker.
2. **Docker Compose profiles.** In `docker-compose.yml` and `docker-compose.dev.yml`, `stac-fastapi`, `tipg`, `titiler`, and `titiler-pgstac` all carry `profiles: ["stac"]`. They only come up when you run with `--profile stac`, e.g. `docker-compose --profile stac up`. `veloserver` uses the same pattern under its own profile.

Either way, the services are opt-in. A bare `docker-compose up` runs only the MMGIS app and Postgres.

## The proxy front door

The browser never talks to ports 8881–8884 directly. `adjacent-servers-proxy.js` is mounted by the Express bootstrap and registers one `http-proxy-middleware` route per enabled service:

```js
//// STAC
if (process.env.WITH_STAC === "true") {
  const stacTarget = `http://${isDocker ? "stac-fastapi" : "localhost"}:${
    process.env.STAC_PORT || 8881
  }`;
  app.use(`${ROOT_PATH}/stac`, ensureAdmin(false, false, true),
    createProxyMiddleware({ target: stacTarget, ... }));
}
```

A few things this earns:

- **Single origin.** Clients hit `/stac`, `/tipg`, `/titiler`, `/titilerpgstac` on the MMGIS host; same cookies, same TLS, no CORS.
- **Auth gating.** Every proxy is wrapped in `ensureAdmin(false, false, true)` — anonymous GETs pass through, anything mutating requires admin auth. TiTiler also exempts `/cog/stac` from the read-only allowlist.
- **Docker vs. local routing.** The `isDocker` flag swaps `localhost` for the Compose service name (`stac-fastapi`, `tipg`, etc.).
- **Swagger fixup.** `createSwaggerInterceptor` rewrites the upstream service's OpenAPI doc on the fly so the embedded Swagger UI knows it's living under `/<service>` and not at root.

The same file also handles two extras: a dev-only generic `/corsproxy` for any external `https://` URL, and a small "custom adjacent server" registry that lets operators wire arbitrary side services in via `ADJACENT_SERVER_CUSTOM_<N>=["true","route","service","port"]` env vars without code changes.

## The `WITH_<SERVICE>` convention

Adding a service is a four-touch change: a `WITH_FOO=true` in `.env`, a `FOO_PORT`, a Compose entry (or a row in `adjacent-servers.js`), and a proxy block in `adjacent-servers-proxy.js`. Removing one is one env flag flip. That symmetry is the whole reason this directory exists as its own concept.
