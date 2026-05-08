---
id: frontend-essence/tools
title: Mapping tools
summary: Self-contained tool modules (Draw, Measure, Layers, Identifier, …) loaded by the ToolController, plus the plugin-drop convention used to add new ones.
related:
  - frontend-essence/core-runtime
  - frontend-essence/mmgis-api
key_idea: Each tool is a directory with a config.json plus a module exporting a small lifecycle (initialize, make, destroy, ...); the ToolController loads them from a build-time-generated src/pre/tools.js, including any plugin-drop directories.
watch_out:
  - A tool that leaks listeners in destroy() will break neighboring tools — the controller assumes destroy fully tears down whatever make set up.
seams_touched:
  - plugin-drop
  - build-time-runtime
prerequisites:
  - frontend-essence/core-runtime
next:
  - frontend-essence/mmgis-api
---

## What a Tool is

A "Tool" in Essence is a single user-facing capability that takes over the side
tool panel (or a floating popout) when the user clicks its toolbar icon. Each
tool is a self-contained module under `src/essence/Tools/<Name>/` — typically a
`<Name>Tool.js`, a `config.json`, a `.css` file, and any sub-modules it needs.
Tools are independent of each other: they read shared map state from `L_`, draw
on the map through `Map_`/`Globe_`/`Viewer_`, and otherwise mind their own
business.

## The contract

Tools are plain JS objects with a small lifecycle the [ToolController](./core-runtime.md)
calls into. From `MeasureTool.js`:

```js
let MeasureTool = {
    height: 243,
    width: 'full',
    initialize: function () { /* called once at boot */ },
    make: function () { /* called when the user activates the tool */ },
    destroy: function () { /* called when the tool is deactivated */ },
    getUrlString: function () { /* optional — serialize state into the URL */ },
}
```

The full surface, all optional except `make`/`destroy`:

- `height`, `width` — desired tool-panel size; the controller resizes the panel
  on activation.
- `initialize()` — once at boot, after all tools are registered.
- `make(controller)` — render into the `#tools` div (or `#toolPanel`); attach
  map listeners.
- `destroy()` — tear down everything `make` set up. Tools that leak listeners
  break neighbors.
- `notify(type, payload)` — sideband messages from the controller (for
  cross-tool events).
- `finalize()` — late hook for things that need other tools already up.
- `getUrlString()` — round-trip tool state through the URL share link.
- `made` — used by "separated" (popout) tools to track open/closed state.

The "[New Tool Template](../../../../MMGIS/src/essence/Tools/New%20Tool%20Template.js)"
file in the tools directory is the minimum viable shape, kept in sync with this
contract.

## How tools are registered

Tools are not imported by hand. The Node script `API/updateTools.js` runs before
webpack and:

1. Scans `src/essence/Tools/*` for any directory containing a `config.json`.
2. Also scans `src/essence/*Plugin-Tools*` and `*Private-Tools*` directories
   (gitignored, dropped in by integrators) for the same shape.
3. Sorts entries by `toolbarPriority` and writes `src/pre/tools.js` — a
   generated file that re-exports `toolModules`, `toolConfigs`, and `Kinds`.

`ToolController_` then imports `{ toolModules, toolConfigs }` from that
generated module and wires up the toolbar buttons. To add a new built-in tool,
you create a directory with a `config.json` and a module exporting the
lifecycle object — no edits anywhere else. To ship a private tool against an
unmodified MMGIS checkout, you drop a `MyOrg-Plugin-Tools/` directory next to
the standard tools and the same machinery picks it up. This is the same
convention the backend uses for `*Plugin-Backend*` modules.

A tool's `config.json` declares its `name`, default icon, the `paths` to its
modules, and a `config` block describing the variables it accepts — that block
is what the [Configure SPA](../configure-spa/index.md) renders as a form so
mission admins can configure the tool without touching code.

## Tour of the built-ins

The shipped tools cluster into a few groups:

- **Map editing.** `Draw` is the heaviest — sub-modules for drawing, editing,
  history, file management, templating, and publishing real-time edits over
  the websocket. `Measure` does distance + elevation profiling against
  configurable DEMs.
- **Inspection.** `Identifier` queries features under the cursor;
  `Info` renders feature detail using the shared `Kinds` rendering registry;
  `Layers` is the layer tree and visibility/opacity controls.
- **Analysis.** `Isochrone` (travel-time polygons), `Viewshed` (line-of-sight),
  `Curtain` (cross-section), `Chemistry` (compositional plots).
- **Time and motion.** `Animation` plays through time-aware layers, working
  with the `TimeControl_` runtime described in [core runtime](./core-runtime.md).
- **Chrome and navigation.** `Sites` (preset locations), `Legend`, `Shade`
  (lighting), `Kinds` (the feature-detail rendering catalog used by `Info`).

The ToolController also dual-emits every tool-change event onto the
[mmgisAPI](./mmgis-api.md) event bus, so embedders and plugin authors can
observe and drive tools from outside the page.
