---
id: frontend-essence
title: Frontend (the map app)
summary: The browser-side mapping app — what users see and interact with. Has four big internal concerns covered on the sub-pages.
key_idea: The frontend is a single browser app with a global "mission state" in the middle and three viewports (2D map, 3D globe, image viewer) hanging off it. The tools live in a registry and the public embed API is a small, stable surface for outside callers.
watch_out:
  - It's not a typical React app. Big parts of it are old-style imperative code, not modern React components.
seams_touched:
  - browser-backend
  - embed-host
next:
  - frontend-essence/core-runtime
---

The frontend is the thing users actually see when they open MMGIS — the 2D map, the 3D globe, the image viewer, and the side panel of tools. It's one big browser app that loads fresh in each user's browser.

It's big enough that it makes sense to split into four areas:

- **The map core.** The central state, the engines that draw the 2D map and the 3D globe, the boot sequence, the layout machinery that splits the screen into viewports. The spine the rest plugs into.
- **The tools panel.** All the side-panel features users interact with — drawing, measuring, layer controls, identification, time animation, analysis tools. Each one is a self-contained module that gets loaded into a registry.
- **Everything else around the map.** The login form, the topbar search, the scale bar, the right-click menu, modal dialogs, the landing page. Old-style code that sits around the edges.
- **The public embed/plugin API.** A small, stable JavaScript surface that outside web pages and plugin authors are allowed to call into.

The most important thing to know up front: **the frontend is not a typical modern React app.** There is React in the codebase (mostly the side panels and some of the chrome), but the actual map layers, the global shared state, and most of the tool internals are written in an older imperative style — code that directly manipulates the page rather than describing what the page should look like to a framework. Both styles coexist; both are load-bearing.

Read the map core page first — it explains the shared state object that every other piece of the frontend reaches into.
