---
id: adjacent-servers
title: The Python sidecar services
summary: Optional Python services that MMGIS proxies to for things Node doesn't do well — serving big imagery as tiles, hosting a catalog of geospatial assets, serving vector features.
related:
  - backend-api/server-bootstrap
  - backend-api/feature-modules
key_idea: Four optional Python services run as separate processes. The Node server forwards requests through to them, so the browser only ever talks to one origin.
watch_out:
  - The browser never talks to these services directly. If a tile or catalog request "works locally but fails in production," the answer is almost always something about the proxy setup, not the Python services themselves.
seams_touched:
  - backend-adjacent-services
  - browser-backend
prerequisites:
  - backend-api/server-bootstrap
---

MMGIS leans on a few best-of-breed Python services for the things Node is bad at: turning huge satellite imagery into map tiles on demand, hosting a catalog of geospatial assets, and serving vector tiles from a spatial database.

Rather than reimplement any of that, MMGIS runs each as a separate process and forwards requests to them. To the browser it looks like one site; under the hood, certain URL prefixes get handed to whichever Python service is responsible.

## The four services

- **TiTiler.** Serves map tiles dynamically from big cloud-optimized GeoTIFFs (large geographic imagery files structured so a server can grab just the part it needs without downloading the whole thing). Listens on its own port.
- **TiTiler-pgSTAC.** A specialized version of the above that mosaics imagery driven by a search in a STAC catalog.
- **STAC server.** A SpatioTemporal Asset Catalog — a standardized way to list and search geospatial assets. Lets you ask "what imagery exists for this area between these dates."
- **tipg.** Serves vector features from a PostGIS table as either GeoJSON or vector tiles.

Each one is intentionally tiny on the MMGIS side: a folder with a startup script that boots the actual upstream package. There's no MMGIS-authored Python — the upstream packages do the work.

## Two ways to run them

The same services can be brought up two ways depending on deployment style:

1. **Locally spawned.** When you start MMGIS outside Docker, the Node server can spawn each enabled Python service as a child process. Convenient for development.
2. **Docker Compose profiles.** In a Dockerized deployment, the services are defined as separate containers behind an opt-in "profile" flag. A bare `docker-compose up` runs only the MMGIS app and Postgres; adding `--profile stac` brings up the Python services.

Either way, they're opt-in via `WITH_X=true` environment flags. A bare MMGIS deployment doesn't use them.

## The proxy front door

The browser never connects to the Python service ports directly. The Node server registers a forwarding rule for each enabled service: a URL prefix on the MMGIS host points at the matching Python service port.

A few things this earns you:

- **One origin for the browser.** Same cookies, same TLS, no cross-origin issues.
- **Auth gating.** The proxy rules can wrap admin-only checks around anything that mutates data while letting public reads through.
- **Docker-vs-local routing.** The proxy can swap "localhost" for the Docker service name automatically based on whether MMGIS is running in a container.
- **Documentation fixup.** It can rewrite the upstream service's API documentation so its embedded docs UI knows it's living behind the MMGIS proxy.

The same setup also handles a couple of extras: a development-only generic forwarder for any external URL, and an operator-configurable list of arbitrary "custom adjacent servers" — set an environment variable, get a forwarding rule, no code change needed.

## Why this matters for a static refactor

Of all the parts of MMGIS, this one is the easiest to keep alive in a static deployment — by **changing how the frontend reaches it**.

In the current setup, the frontend hits `/stac` on the MMGIS host, the Node server forwards to the STAC service, and the STAC service answers. Three parties in the chain.

In a static deployment, the Node server isn't there. So instead, the static frontend hits the STAC service's *public* URL directly. Two parties, no proxy. The STAC service itself doesn't change.

What you give up by skipping the proxy:

- The single-origin convenience. Now you need either same-origin or cross-origin permissions configured on the Python services.
- The auth gating. The Python services are now reachable directly, so you have to either make them publicly readable (fine for read-only static deployments) or put a different gating layer in front of them.
- The documentation rewriting and the local-vs-Docker routing magic. Not a big deal for a static deployment — the URLs are configured once at build time.

For the kind of refactor you're thinking about, "TiTiler/STAC pointed at external URLs" is exactly this: the static build uses the Python services' real public hostnames, the proxy goes away.
