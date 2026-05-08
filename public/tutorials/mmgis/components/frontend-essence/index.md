---
id: frontend-essence
title: Frontend (Essence)
summary: The browser-side mapping application — Webpack-bundled hybrid of jQuery-era imperative code and React 16 islands, organized around shared map state, swappable 2D/3D engines, a tool registry, and a public embed API.
key_idea: Essence is not an idiomatic React app — it is a jQuery-era imperative core with React 16 islands, organized around the global L_ map state and three sibling viewports.
watch_out:
  - Don't expect React idioms — most of the map layers, L_, and tool internals are imperative ES modules, and the React 16 islands are the minority of the tree.
seams_touched:
  - browser-backend
  - embed-host
next:
  - frontend-essence/core-runtime
---

Essence is the main MMGIS frontend — the thing users actually look at. It lives under
`src/essence/` and is bundled by the custom Webpack pipeline described in
[Build and bundling](../build-and-bundling/index.md). It is large enough that a single
page would not be useful: there is a core runtime that owns a global map state and
swaps between map engines, a tool registry where most of the user-facing functionality
lives, a wide surface of non-map UI chrome, and a separate public JavaScript API for
embedders. Each of those is its own concern with its own conventions, so each gets its
own page.

The thing to know up front is that Essence is *not* an idiomatic React app. There is
React 16 in the tree (the panels, much of the chrome), but the map layers, the global
state object `L_`, and most tool internals are imperative ES modules — many descended
from a much earlier jQuery/Leaflet codebase. The newer code (the
[mmgisAPI](./mmgis-api.md) bus, some of the [Tools](./tools.md)) is moving toward a
mitt-based pub/sub model, but the old shape is still load-bearing. Read the core
runtime page first; it explains the global object every other piece reaches into.

## In this component

- **[Core runtime and map engines](./core-runtime.md)** — the boot sequence, the global
  `L_` map state, the `Basics/` controllers (`Map_`, `Globe_`, `Viewer_`,
  `PanelManager_`, `UserInterface_`, `ToolController_`, `TimeControl_`,
  `ComponentController_`), and how 2D ↔ 3D ↔ image-viewer switching works. This is the
  spine the rest plugs into.

- **[Mapping tools](./tools.md)** — the contract every tool follows, how the
  `ToolController` loads them, and a tour of what ships in `src/essence/Tools/` (Draw,
  Measure, Identifier, Layers, Isochrone, Animation, Curtain, Viewshed, Chemistry,
  Sites, Info, Legend, Shade, Kinds). Also covers the plugin-drop convention used to
  add custom tools.

- **[Ancillary UI and chrome](./ancillary-ui.md)** — everything around the map. Login,
  search, context menu, modals, scale bar, coordinate readout, help, query-by-URL,
  attributions, plus the `Helpers/` utilities and the `LandingPage/`. Mostly
  imperative ES modules with paired CSS, mounted by the layout machinery in `Basics/`.

- **[mmgisAPI (embed/extension surface)](./mmgis-api.md)** — the stable JavaScript API
  exposed on `window.mmgisAPI` for iframe embedders and plugin authors. Two surfaces
  in one file: a JSDoc'd public method set and a newer mitt-based event/request bus
  used by tools to talk to each other and to the core without import-coupling.

The boundary that matters most: tool code goes in `Tools/`, persistent UI chrome goes
in `Ancillary/`, and any code that *coordinates* tools, layers, panels, and engines
belongs in `Basics/` (core runtime). When in doubt, look at where similar code already
lives.
