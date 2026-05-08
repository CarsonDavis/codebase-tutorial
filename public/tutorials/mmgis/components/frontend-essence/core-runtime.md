---
id: frontend-essence/core-runtime
title: Core runtime and map engines
summary: How Essence boots, wires up the global L_ map state, manages the panel
  layout, and switches between Leaflet (2D), Cesium-based Globe (3D), and the image Viewer.
related:
  - frontend-essence/tools
  - frontend-essence/ancillary-ui
  - frontend-essence/mmgis-api
  - backend-api/feature-modules
key_idea: essence.js calls each Basic's init then fina in a fixed order, with L_ acting as the ambient bus that ties imperative jQuery code, React islands, and the embed API together.
watch_out:
  - The deck.gl path in Map_ is partial — hundreds of "if engineType !== LEAFLET return" early-exits mark methods that haven't been ported yet, so a feature that works on Leaflet may silently no-op on deck.gl.
seams_touched:
  - browser-backend
next:
  - frontend-essence/tools
---

The core runtime is the spine of the frontend. Everything else — tools, ancillary
chrome, the embed API — hangs off the singletons defined here. All of it lives in
[`src/essence/Basics/`](https://github.com/NASA-AMMOS/MMGIS/tree/master/src/essence/Basics).

## Boot sequence

[`src/essence/essence.js`](https://github.com/NASA-AMMOS/MMGIS/blob/master/src/essence/essence.js)
is the single composition root. It imports each Basic as an ES module default and
calls them in a fixed order on `essence.init(config)`:

1. `L_.init(config, missionsList, urlOnLayers)` — parses the mission config into
   layer state.
2. `F_.setRadius(...)` — sets planet radii used by all distance/projection math.
3. `Globe_.init()`, `Viewer_.init()`, `TimeControl.init()`, then `Map_.init(fina)`.
4. `Map_.init` invokes the `fina` callback once the map is ready, which calls
   `fina()` on `Globe_`, `L_`, `UserInterface_`, `Viewer_`, `TimeControl`, and the
   `mmgisAPI_` in that order, then runs `ComponentController_.initializeComponents()`.

`init` and `fina` are the two-phase pattern every Basic implements: `init`
constructs DOM and reads config, `fina` wires cross-references between modules
once they all exist. `essence.swapMission` re-runs `init` with `swapping=true` to
hot-reload a different mission without a page refresh — `L_.clear()` resets state,
the engines are recreated, and the UI re-finalizes.

## L_: the global map state

[`Basics/Layers_/Layers_.js`](https://github.com/NASA-AMMOS/MMGIS/blob/master/src/essence/Basics/Layers_/Layers_.js)
exports the singleton `L_` (mission name, view, radius, the full `configData`,
the layer registry, plus references back to `Map_`/`Globe_`/`Viewer_`). It is the
ambient bus that ties the imperative jQuery code, the React islands under
[`Tools/`](./tools.md), and the [embed API](./mmgis-api.md) together. Anything that
needs to know which layers exist, which are toggled on, what filters are applied,
or which feature is active reads `L_`. The `layers` sub-object is normalized:

```js
layers: {
    data: {},          // uuid -> layer config
    dataFlat: [],      // ordered list
    layer: {},         // uuid -> live engine layer object
    on: {},            // uuid -> visible bool
    opacity: {},
    filters: {},
    nameToUUID: {},
    refreshIntervals: {},
}
```

`L_.onceLoaded(cb)` is how late-arriving code (tools, components) defers work
until the initial mission load finishes.

## Map_, Globe_, Viewer_

The three viewports are independent modules that share `L_` but otherwise know
little about each other:

- [`Basics/Map_/Map_.js`](https://github.com/NASA-AMMOS/MMGIS/blob/master/src/essence/Basics/Map_/Map_.js)
  is the 2D map. Historically Leaflet-only; now an engine-agnostic facade (see
  below).
- [`Basics/Globe_/Globe_.js`](https://github.com/NASA-AMMOS/MMGIS/blob/master/src/essence/Basics/Globe_/Globe_.js)
  is the 3D viewport. It delegates to `GlobeRenderer.js` (a Cesium/THREE-based
  lithosphere renderer) and is driven from the same `L_.view` and tile-map
  resource as the 2D map.
- [`Basics/Viewer_/Viewer_.js`](https://github.com/NASA-AMMOS/MMGIS/blob/master/src/essence/Basics/Viewer_/Viewer_.js)
  is the third "image viewer" pane — Leaflet-on-image for raster imagery, a
  THREE-based Photosphere, ModelViewer, and PDFViewer for 3D/document content
  attached to features.

## The map engine abstraction

A 2024–25 refactor moved Map_ behind a swappable engine interface in
[`Basics/MapEngines/`](https://github.com/NASA-AMMOS/MMGIS/tree/master/src/essence/Basics/MapEngines).
`IMapEngine` (`IMapEngine.ts`) defines an imperative facade — `setView`,
`fitBounds`, `addLayer`, `on`, `queryRenderedFeatures`, etc. — that two adapters
implement: `LeafletAdapter` (the historical Leaflet 1.x map) and `DeckGLAdapter`
(deck.gl with a MapLibre/Mapbox basemap). `MapEngineRegistry.ts` is a small
registry that owns adapter classes and the active instance. `Map_.init` reads
`L_.configData.msv.mapEngine`, asks the registry for that engine, and assigns it
to `Map_.engine`. `Map_.map` still points at the native `L.Map` for
backwards-compatible callers, with a thin shim layer for deck.gl:

```js
mapEngineRegistry.register(MAP_ENGINE.LEAFLET, LeafletAdapter)
mapEngineRegistry.register(MAP_ENGINE.DECKGL, DeckGLAdapter)
const engine = mapEngineRegistry.createEngine(engineType)
this.engine = engine
this.map = engine.getNativeMap() ?? {}
```

`ENGINE_LAYER_SUPPORT` in `types/engine.ts` declares which `LayerType`s each
engine can render; `engineSupportsLayer()` is consulted by layer construction to
skip incompatible layers. Hundreds of `if (Map_.engine.engineType !== LEAFLET)
return` early-exits inside `Map_.js` mark the methods that haven't been ported
to the deck.gl path yet — the migration is in flight.

## Panel layout

The three viewports live inside a horizontal split managed by
[`Basics/UserInterface_/`](https://github.com/NASA-AMMOS/MMGIS/tree/master/src/essence/Basics/UserInterface_).
`UserInterface_.js` selects `UserInterfaceMobile_` or `UserInterfaceDefault_` at
load based on user agent. The default UI tracks `pxIsViewer` / `pxIsMap` /
`pxIsGlobe` pixel widths and exposes `getPanelPercents()` /
`setPanelPercents(viewer, map, globe)` (must sum to 100) which most other code —
the splitter drag handlers, `QueryURL`, the "open globe" buttons — calls to
resize panes. Opening the Globe pane for the first time syncs its center to the
2D map.

A newer typed panel system lives at `Basics/PanelManager_/types/` (priority-based
layout with iconified/focused/expanded states for left/right/top/bottom panels).
This is a forward-looking spec that the [tools](./tools.md) layer is migrating
toward; the runtime panel layout is still the legacy three-pane split.

## ToolController_, ComponentController_, TimeControl_

`ToolController_.init(L_.tools)` builds the tool sidebar from the mission's
configured tool list and lazy-loads each tool module from
[`pre/tools.js`](https://github.com/NASA-AMMOS/MMGIS/blob/master/src/pre/tools.js)
(the build-time glob over `Tools/` plus plugin dirs). It owns `activeTool`,
opens/closes the tool panel, and dispatches keyboard shortcuts. See
[mapping tools](./tools.md) for the per-tool shape.

`ComponentController_` is the smaller sibling for non-tool plugins — analytics,
keybindings, background services. It runs once after `fina()`, iterates
`L_.configData.components`, and calls each enabled component's `init(vars)` with
errors caught individually so one bad component cannot brick the page.

`TimeControl_` (under `Basics/TimeControl_/`) implements MMGIS's global time
window. When `config.time.enabled` is true it stands up the bottom time bar
(`TimeUI`), filters layers by their per-layer time settings, and registers
`time:getCurrent`/`time:set` providers on the [mmgisAPI bus](./mmgis-api.md).

## Formulae_

[`Basics/Formulae_/Formulae_.js`](https://github.com/NASA-AMMOS/MMGIS/blob/master/src/essence/Basics/Formulae_/Formulae_.js)
is `F_` — the dumping ground for shared math: planet-radius math, lat/lng
distance and bearing helpers, GeoJSON normalization, file/path utilities,
azimuth/elevation calculations. Imported almost everywhere; touch with care.
