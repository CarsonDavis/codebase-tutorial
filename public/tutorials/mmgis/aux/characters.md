---
id: aux/characters
title: Cast of characters
summary: The named abstractions that recur across the MMGIS codebase — treat them as actors with distinct roles and you will read the rest faster.
---

## L_ — the omniscient narrator
The global map-state singleton in `Basics/Layers_/Layers_.js`. Owns the mission, the
view, the planet radius, and the full layer registry. Every other Essence module
reaches into it; nothing tells it what to do, it just *is*. If something on the page
seems to know things it shouldn't, the answer is almost always "it asked `L_`." See
[Core runtime](../components/frontend-essence/core-runtime.md).

## F_ — the toolbox
The math and helpers module (`Basics/Formulae_/Formulae_.js`). Lat/lng distance,
bearing, planet radii, GeoJSON normalization, file path tricks. Imported by everyone,
edited by no-one without thinking twice — a one-line change here ripples through
hundreds of callers.

## Map_ / Globe_ / Viewer_ — the three viewports
A trio of independent siblings. `Map_` is the 2D Leaflet (or, behind a swappable engine,
deck.gl) map. `Globe_` is the 3D Cesium-based lithosphere. `Viewer_` is the image and
3D-object pane. They share `L_` and very little else; opening Globe for the first time
syncs its center to Map's, and after that they get on with their own lives.

## ToolController — the stage manager
Loads every tool in `src/essence/Tools/` plus any plugin-drop tools, builds the toolbar
in `toolbarPriority` order, owns `activeTool`, and dispatches keyboard shortcuts.
Tools are guests; ToolController owns the room. See [Mapping tools](../components/frontend-essence/tools.md).

## mmgisAPI — the diplomat
The public-facing JavaScript object on `window.mmgisAPI`. Stable, JSDoc'd, intentionally
narrow — the only thing iframe embedders and plugins are allowed to depend on. Carries a
second life as the mitt event/request bus the inner modules use to talk without
import-coupling. Two surfaces, one file.

## the s object — the toolkit
The bundle every backend feature module receives in its lifecycle hooks: `s.app`,
`s.ROOT_PATH`, the auth guards (`ensureUser`, `ensureAdmin`, `ensureGroup`,
`stopGuests`), `s.checkHeadersCodeInjection`, `s.setContentType`, the permissions
table. If a backend feature can do it, it can do it because `s` handed it the tool.
See [Server bootstrap](../components/backend-api/server-bootstrap.md).

## Configure — the librarian
The admin SPA at `/configure`. Doesn't run the map, doesn't render layers — it edits
the JSON config blob that *describes* the map. A separate React 17 codebase that talks
to the backend and only the backend, then hands the result off via the database for
Essence to load.

## the plugin-drop directory — the secret door
A folder named `*Plugin-Tools*` or `*Plugin-Backend*` (or the `Private-` variants),
gitignored, recognized by the build and bootstrap scripts. Drop one in, restart, and
your code is in the build with no registry edits. Convention as plumbing — quietly
load-bearing for every downstream operator running a customized MMGIS.

## the spec-kit — the museum
The `/specs` and `/.specify` directories. A retroactive design-doc workflow used by
contributors to document intent. Read it for context when something seems weird, not
to predict runtime behavior — the running code is the source of truth.
