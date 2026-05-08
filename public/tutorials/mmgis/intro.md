---
id: intro
title: MMGIS
summary: NASA-AMMOS web-based GIS for planetary missions — a Postgres/PostGIS backend, a custom-bundled React + jQuery mapping frontend, a separate admin SPA, and a stack of GDAL data-prep scripts.
key_idea: MMGIS is one Express process that serves three browser apps over a Postgres/PostGIS database, with optional Python tile sidecars and an offline GDAL data-prep toolbox feeding it.
seams_touched:
  - browser-backend
  - backend-postgres
  - backend-adjacent-services
---

# MMGIS

MMGIS (Multi-Mission Geographic Information System) is the open-source spatial data
infrastructure NASA-AMMOS uses for planetary science missions — Mars rovers, lunar ops,
and similar. It is one app with several faces: a 2D Leaflet map, a 3D Cesium globe, an
image viewer, a multi-user drawing layer, and an admin UI for wiring datasets into all
of the above. If you are onboarding to MMGIS, you are looking at a mature, polyglot
monorepo that has accumulated a lot of capability — this tutorial gives you the seven
boxes you need before you read any single file.

## How the parts fit together

The center of the system is a Node 20 + Express server (the [backend
API](./components/backend-api/index.md)) that owns a Postgres/PostGIS database via
Sequelize and runs a WebSocket for real-time collaboration. It serves three browser
applications: the main mapping app
[Essence](./components/frontend-essence/index.md), a separate
[Configure](./components/configure-spa/index.md) admin SPA mounted at `/configure`,
and a Jekyll docs site. Essence and Configure share the database through the backend's
feature modules, which all follow the same `models/`/`routes/`/`setup.js` shape. Mission
data is prepared offline by the [auxiliary GDAL/Python
scripts](./components/auxiliary-scripts/index.md) and, optionally, served by adjacent
Python tile and catalog services ([TiTiler, STAC, tipg](./components/adjacent-servers/index.md))
that the backend proxies behind a single origin. The frontend is bundled by a custom
[Webpack 5 pipeline](./components/build-and-bundling/index.md) that also implements the
plugin-drop convention, and the whole thing is exercised by a single
[Playwright](./components/testing/index.md) test suite covering both unit and e2e flows.
