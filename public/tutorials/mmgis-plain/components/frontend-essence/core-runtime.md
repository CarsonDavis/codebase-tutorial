---
id: frontend-essence/core-runtime
title: The map core
summary: How the frontend boots, what holds it all together, and how the three viewports relate to each other.
related:
  - frontend-essence/tools
  - frontend-essence/ancillary-ui
  - frontend-essence/mmgis-api
  - backend-api/feature-modules
key_idea: One big shared mission-state object sits in the middle of the frontend, and everything else (the map, the globe, the tools, the embed API) reads from it.
watch_out:
  - The newer 2D map engine isn't a full replacement for the old one yet. Some features only work on the older engine, and the gaps aren't always obvious.
seams_touched:
  - browser-backend
next:
  - frontend-essence/tools
---

## What "the core" is

The map core is the spine of the frontend. Everything else hangs off it.

When the page loads, a startup script runs a fixed sequence:

1. Read the mission configuration (the big JSON blob produced by the admin app).
2. Initialize the shared mission state from it.
3. Set the planet's radius (a number used by every distance and projection calculation — Earth, Mars, and the Moon are all different sizes).
4. Initialize the 3D globe, the image viewer, the time controls, and the 2D map.
5. Once everything is constructed, do a second pass to wire the pieces to each other.

That two-phase setup ("build the parts, then connect them") is a recurring pattern.

## The shared mission state

There's one global object that holds nearly everything the frontend wants to know: which mission is loaded, what view the user is looking at, the planet's radius, the complete list of layers, which ones are toggled on, what filters are applied, what the highlighted feature is. Most of the rest of the codebase reads from this object. Newer code listens for changes; older code just reads it directly when it needs something.

If you're trying to figure out where some piece of state lives, the answer is almost always "the shared mission state." If you're thinking about a refactor that needs to "freeze" the state of the app — for example, baking the current mission configuration into a static build — this is the object that needs to be populated at build time instead of at runtime.

## The three viewports

There are three independent viewports that share the mission state but otherwise know little about each other:

- **The 2D map** — the slippy-map view (the kind of map where you pan and zoom and tiles fill in as needed).
- **The 3D globe** — a rendered planet you can spin around. Driven by a 3D rendering library underneath.
- **The image viewer** — a separate pane for inspecting individual photographs, 3D models, or PDFs attached to features. Not really a "map" at all, more like a media viewer.

They can be shown side-by-side, one at a time, or hidden. The layout that puts them on screen lives in a separate piece of the frontend.

## The two 2D map engines

There's a swappable layer underneath the 2D map. Two implementations exist:

- The original, based on a popular older mapping library (Leaflet).
- A newer one, based on a WebGL-accelerated library (deck.gl) for handling large amounts of data.

A thin shared interface in front of them lets the rest of the app pretend there's just one map. But the migration to the new engine is partial: some features only work on the older one, and the code has scattered "if you're on the new engine, skip this" branches. So a feature that works on the old engine may silently do nothing on the new one. This is the kind of thing that catches people off-guard.

## The tool controller and the component controller

These are two smaller pieces of the core that load and run plugins:

- **The tool controller** runs the side panel. At startup, it reads the mission's configured list of tools and builds the toolbar. Each tool registers a small lifecycle (more on this in the tools page). The controller owns which tool is currently active and handles keyboard shortcuts.
- **The component controller** is the smaller sibling: it runs "components," which are non-UI plugins — analytics integrations, background services, key bindings. Each one runs at startup; if one crashes, the others keep going.

## The time control

If the mission's configuration says it has a time dimension (e.g. "show me data as of two days ago"), a global time-window control runs at startup, adds a time-bar UI at the bottom of the screen, and filters layers by their per-layer time settings.

## The math toolbox

There's also a single grab-bag module of shared math helpers — planet-radius math, distance and bearing between two geographic points, format normalization, file path helpers. Imported almost everywhere. A one-line change here can ripple through hundreds of callers, so it gets touched cautiously.
