---
id: aux/seams
title: Seams
summary: The boundaries where MMGIS changes hands. These are the load-bearing edges — adding a feature usually means crossing one of them, and a refactor of this scale means deciding what to do at each.
---

A "seam" is a boundary where one part of the system stops knowing how the other part works. These are the joints in MMGIS. If you're thinking about a deep refactor (e.g. a static-mode deployment), most of the interesting decisions land at one of these seams.

## Browser ↔ Server
The frontend talks to the server in two ways: regular HTTP requests for JSON data, and a single WebSocket the server uses to notify other admins when someone saves a mission-config change. Identity is carried by a session cookie for humans and a bearer token for scripts.

**For a static refactor:** this seam mostly disappears. The frontend stops making API calls because there's nothing answering them. Anything the frontend currently fetches has to be baked into a static file at build time instead.

## Server ↔ Database
The server reads and writes everything to Postgres — user accounts, mission configurations, drawn features, sessions. Two different database access libraries are in use (one for almost everything, one specifically for the drawing module).

**For a static refactor:** the database disappears entirely. Anything currently stored there has to be moved somewhere else (baked into a static JSON file, replaced by a third-party service, or dropped from the static build).

## Server ↔ Python sidecar services
The Node server forwards certain requests through to optional Python services (tile servers, catalog server). To the browser, it looks like one origin; under the hood the request might land in a Python process.

**For a static refactor:** the static frontend points at the Python services directly using their public URLs, rather than going through the Node server's proxy. The sidecars themselves don't change; they just become first-class external services the browser knows about.

## Configure ↔ Essence
The two browser apps share no code, no React version, no bundle. Their only contact is the JSON file (the mission configuration) that Configure writes and Essence reads. They effectively communicate through the database, with no direct API between them.

**For a static refactor:** Configure stays alive on the authoring deployment ("Tier 1") that still has a real backend. The static deployment skips Configure entirely. The static build essentially freezes a copy of the JSON config and embeds it.

## Plugin folders
Source-tree to plugins. A folder with a special name (matching one of several recognized patterns) is automatically gitignored and automatically discovered by the build. No central registry, no config flag.

**For a static refactor:** this convention still works, since it's a build-time thing rather than a runtime thing. The plugin folder gets compiled into the static bundle just like the built-in tools.

## Build-time ↔ Runtime
Before the bundler runs, a code-generation step scans the tools folder and any plugin folders and writes a manifest of "here's everything to bundle." The bundler then treats the manifest like any other source. The plugin set is therefore frozen at build time, not chosen at runtime.

**For a static refactor:** this seam is your friend. Everything that gets resolved at build time is already a "baking" step. You're essentially extending what gets baked.

## Embedder ↔ MMGIS
A parent web page that embeds MMGIS in an iframe can call into MMGIS through the public embed API. The contract is intentionally small — only the documented methods are stable across versions. The internal guts are off-limits.

**For a static refactor:** this is unaffected. The embed API is pure browser-side JavaScript that doesn't depend on the server.
