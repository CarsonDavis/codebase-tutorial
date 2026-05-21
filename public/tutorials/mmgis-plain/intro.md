---
id: intro
title: MMGIS (plain English)
summary: A concept-first walkthrough of MMGIS — what the pieces are, why they exist, and how a high-level refactor (e.g. a static, backend-free deployment) would have to touch them.
key_idea: MMGIS is one server, one database, and three browser apps — held together by a shared mission configuration file. Strip out the server-only responsibilities (auth, persistence, live admin sync, admin editing) and you're left with a static map app.
seams_touched:
  - browser-backend
  - backend-postgres
  - backend-adjacent-services
---

# MMGIS, the short version

MMGIS is NASA's open-source mapping app for planetary science missions — Mars rovers, lunar ops, that sort of thing. Think of it as Google Maps, but for Mars, with a bunch of mission-specific tools layered on top: drawing routes, measuring distances, taking measurements off elevation models, comparing imagery over time.

It's been around long enough to have accumulated a lot of capability, and as a result the codebase is bigger than it looks. The mental model below is the smallest one you can hold and still understand what each piece is doing.

## The seven boxes

Think of MMGIS as **one server with three browser apps in front of it, plus optional sidecar services and an offline toolbox.**

The **server** (one Node.js process — a single running program that handles incoming requests) is the center. It does five things:

1. Serves the browser apps as static files (HTML, JavaScript, CSS sent down to the browser).
2. Holds the mission's data — layers, drawn features, user accounts — in a Postgres database (a long-running database program that stores and queries records).
3. Exposes that data over an HTTP API (a set of URLs the browser can call to read or write data, getting JSON back).
4. Pushes live updates over a WebSocket (a persistent two-way connection between browser and server, instead of one request-then-response at a time): when an admin saves a mission-config change in the admin app, other admins viewing that mission see the new layers in place without a page reload.
5. Optionally forwards certain requests to Python services that handle map tiles and catalogs. (Forwarding a request like this is called *proxying* — the server receives a request and passes it to a different service behind the scenes, then returns that service's answer.)

The **three browser apps** are:

- **Essence** — the main map app. The 2D map, the 3D globe, the side panel with tools. This is what mission users actually look at all day.
- **Configure** — a separate admin app at `/configure`. Mission ops use it to set up the map: which layers exist, where the data lives, who can log in. It's a totally different codebase from Essence; it just shares the same database through the server.
- **A documentation site** — a Jekyll-built docs site. Not very interesting.

The **optional Python sidecar services** are tile servers and catalog servers — TiTiler, STAC, tipg. They're external open-source projects that do tile-serving better than Node would. MMGIS spawns them as separate processes when enabled, and the server forwards browser requests through to them so the browser only ever talks to one origin.

The **offline toolbox** is a folder of standalone scripts (mostly Python wrapping GDAL) that take raw mission imagery and chop it into the tiled, indexed format MMGIS expects. These are run by hand on a workstation, never at runtime. They produce the files that the runtime then serves.

## What flows between the boxes

A few flows are worth holding in your head, because they're where a refactor lands.

The **mission configuration** is a JSON blob in the database. Configure writes it. Essence reads it at startup. Everything about how the map looks — layers, tools, colors, defaults — comes out of this file.

**Map tile data** lives either on disk (served as static files by the Node server) or behind one of the Python tile services (served on demand from cloud-optimized GeoTIFFs).

**User-drawn features** (annotations, traverse plans, etc.) live in Postgres. Multiple users can edit the same drawing file at the same time, but they don't see each other's edits in real time — coordination happens through the shared database, so whoever saves last wins.

**Authentication** is a cookie-based login for humans, plus long-lived bearer tokens for scripts. Both checked by the server on every request.

## Why this matters for a refactor

If you're thinking about something like a "static mode" deployment — a build that drops a self-contained map onto S3 or CloudFront with no Node server, no database, no auth — you're essentially asking which of the seven boxes you can throw away:

- The **server** disappears entirely.
- **Configure** disappears (or stays alive only on the authoring deployment).
- **The database** disappears.
- **Auth and sessions** disappear.
- **The WebSocket** disappears — there's no admin app on a static deployment for it to fan changes out from. **Collaborative drawing** disappears too, simply because there's no backend to write the shared drawings to.
- The **Python sidecar services** stay alive, but the static frontend points at them by external URL instead of going through the Node server's proxy.
- The **offline toolbox** stays alive — it still produces the static tiles and assets.

What's left is **the frontend bundle**, **the mission config JSON (baked in at build time)**, and **the static tile/asset directory**. The reading order in this tutorial is designed to make the dependencies between those pieces obvious so you can see what comes out cleanly and what doesn't.
