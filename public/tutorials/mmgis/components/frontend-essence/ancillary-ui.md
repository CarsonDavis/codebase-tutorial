---
id: frontend-essence/ancillary-ui
title: Ancillary UI and chrome
summary: The non-map UI surface — login, search, context menus, modals, scale bar, coordinate readout, help, query-by-URL, and the landing page.
related:
  - frontend-essence/core-runtime
key_idea: Ancillary modules are pre-React MMGIS — flat, jQuery-style ES modules with paired CSS, mounted into DOM slots created by the Basics layout machinery.
watch_out:
  - Cross-module wiring is by direct import rather than a registry, so renaming an Ancillary module means grepping for its consumers — there is no central manifest.
seams_touched:
  - browser-backend
prerequisites:
  - frontend-essence/core-runtime
---

## What "ancillary" means here

Everything that is *not* the map. The map engines, layers, and tool registry live in
`Basics/` ([core runtime](./core-runtime.md)). The user-facing tools live in
`Tools/`. Everything else around the edges — the topbar search box, the coordinate
readout under the cursor, the modal dialog system, the right-click menu, the scale
bar, the login form, the landing page that lets a user pick a mission — lives in
`src/essence/Ancillary/` (with a small assist from `Helpers/` and `LandingPage/`).

These modules are pre-React MMGIS. Most are plain ES modules built in a jQuery
imperative style: a single object literal exporting `init`, `remove`, and a few
helpers, with HTML constructed as a string and appended to a known DOM id.

## Typical module shape

Open almost any file in `Ancillary/` and you will see the same skeleton:

```js
import $ from 'jquery'
import './ScaleBar.css'

var ScaleBar = {
    init: function (scaleBox) {
        Map_.map.on('zoomend', setScaleBars)
        Map_.map.on('moveend', setScaleBars)
        setScaleBars()
    },
    remove: function () { /* tear down listeners */ },
}
```

A few conventions that hold across the folder:

- Each `*.js` ships with a sibling `*.css` (`Coordinates.js` + `Coordinates.css`,
  `Modal.js` + `Modal.css`, etc.). The CSS is imported directly so Webpack bundles
  it.
- Markup is built as a `prettier-ignore` array of HTML strings joined with
  newlines, then appended via jQuery to a host element owned by the layout.
- State lives on the module object (e.g. `Coordinates.mouseLngLat`,
  `Modal._activeModalIds`) rather than in a framework store.
- Cross-module wiring is done by importing peers directly — `ContextMenu` reaches
  into `Coordinates`, `Help` uses `Modal`, almost everyone touches
  `Basics/Layers_/Layers_` (the global `L_`), `Basics/Map_/Map_`, and
  `Basics/Formulae_/Formulae_`.

## Where each piece is mounted

The module is *defined* under `Ancillary/`, but the *DOM slot* it lives in is
created by the layout machinery in `Basics/` — see [core runtime](./core-runtime.md)
for `UserInterface_`, `ComponentController_`, and `PanelManager_`. Booting in
`src/essence/essence.js` is mostly a sequence of `import` then `Thing.init(...)`
calls against those slots.

## What lives in each subfolder

`Ancillary/` itself is a flat bag of single-purpose modules. Roughly grouped:

- **Topbar / persistent chrome**: `Search.js` (autocomplete + geodataset search),
  `Coordinates.js` (cursor lng/lat readout with switchable projections),
  `Login/Login.js` (sign-in / sign-up modal + session UI), `MapLogo.js`,
  `Attributions.js`, `Help.js` (markdown-rendered help modals via `showdown`).
- **Map overlays**: `ScaleBar.js` and `ScaleBox.js` (D3-driven scale on the
  Leaflet map), `Compass.js`, `CursorInfo.js` (the floating tooltip that follows
  the mouse), `ContextMenu.js` (the map right-click menu), `Description.js`.
- **System utilities used as UI**: `Modal.js` and `ConfirmationModal.js` (the
  generic modal stack everything else builds on), `QueryURL.js` (read/write the
  large set of `?mapLat=…&on=…&tools=…` URL params that make MMGIS shareable),
  `Stylize.js`, `LocalFilterer.js`, `DataShaders.js`, `Sprites.js` (THREE.js
  sprite factory used by the 3D globe), `Swap.js`.

`Helpers/` is nearly empty in the JS tree — just a stray PHP utility for DEM tile
elevation lookup. Treat it as legacy.

`LandingPage/` is one module, `LandingPage.js`, that runs *before* the map boots:
it inspects `?mission=` via `QueryURL`, falls back to `MAIN_MISSION`, and either
hands control to the chosen mission config or renders a mission-picker grid.
