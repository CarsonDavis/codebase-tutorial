---
id: aux/decisions
title: Decisions
summary: The non-obvious choices behind MMGIS. Read these once and a lot of the codebase stops looking weird.
---

## Why is the admin app separate from the main app?
**Different audiences, different lifecycles.** Configure is for mission ops, edited rarely. Essence is for end users, loaded constantly. Keeping them separate means Configure can use newer, heavier libraries without bloating the main user-facing app, and an admin-only bug or admin-only code can't leak into a regular user's browser. The two apps are completely independent codebases — they only communicate through the database.

## Why does the frontend use both old-style and new-style code?
MMGIS predates modern React. Big parts of the frontend — the map layers, the shared mission state, most of the tool internals — are written in an older imperative style, where code directly manipulates the page rather than describing what the page should look like and letting a framework figure it out. Newer code (the side-panel UI, some chrome) uses React. They coexist. If you're reading the codebase and the style looks inconsistent, that's why: it's a working hybrid, not a half-finished migration.

## Why are there two map engines?
The 2D map can be drawn by either of two underlying libraries: the older one (Leaflet, slippy-map style) or the newer one (deck.gl, WebGL-accelerated for large data). Different missions want different ones. There's a thin shared surface that the rest of the app uses, so most of the code doesn't care which engine is active. But the migration to the new engine is partial — some features only work on the old one, and the code has scattered "if we're on the new engine, skip this" branches that reveal where the work isn't finished.

## Why two ways of talking to the database?
The app uses one ORM (an "object-relational mapper" — a library that lets you read and write database rows as JavaScript objects rather than writing raw SQL) for almost everything. One feature — the drawing module — uses a *different* lower-level database library instead, because it was written that way originally. The codebase tolerates both. New code generally follows whichever its neighbors use.

## Why does development use two web servers at the same time?
In production, the Node server does everything — serves the bundle, answers API calls, hosts the admin app. In development, the bundler has its own little web server that auto-reloads the page when you edit code. So MMGIS in development runs **two** servers on **two ports**: the API server on one port, the dev-mode bundler on the next. If you accidentally open the wrong port in development, the page partially loads and then mysteriously fails to finish.

## Why is there a "plugin folder" convention instead of a real plugin system?
Most operators run a customized MMGIS for a specific mission and don't want to push their customizations back upstream. If MMGIS had a central registry file listing every loaded tool, every operator's customization would create a merge conflict every time they pulled in updates from the public repo. The folder-naming convention sidesteps this — drop a folder with a recognized name next to the built-ins, and the build picks it up automatically. The trade-off is that there's no single list of "what's loaded" you can read; the loaded set is determined by what's on disk at build time.

## Why is the real-time connection a "broadcast bus"?
The server's WebSocket connection is intentionally dumb: every message a client sends gets re-broadcast to every connected client. The receiving clients decide whether they care. The team didn't think it was worth building a smarter per-mission or per-room system; the load profile and the use case (a handful of admins editing missions together) didn't justify it.

## Why does the test suite use one tool for everything?
The repo's README still hints at a previous test setup with two different tools. The reality is that everything's been moved to a single tool that runs both fast unit tests (no browser) and full browser end-to-end tests. One test runner, one config, one report. It's just easier to maintain.

## Why is the design-docs folder retroactive?
MMGIS is mature. The design-docs folder was added years into the codebase's life, so most of the code isn't actually specified there. It's intended for *new* features going forward, but is occasionally helpful for archaeology when something feels weird. Treat it as forward-looking documentation, not as a description of the current state.
