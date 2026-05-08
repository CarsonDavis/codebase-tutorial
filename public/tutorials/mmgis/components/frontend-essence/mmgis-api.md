---
id: frontend-essence/mmgis-api
title: mmgisAPI (embed/extension surface)
summary: The public, stable JavaScript API exposed to embedders and plugin authors so they can drive MMGIS from outside.
related:
  - frontend-essence/core-runtime
  - frontend-essence/tools
key_idea: One file holds two surfaces — a JSDoc'd public API on window.mmgisAPI for iframe embedders, and a mitt-based pub/sub plus request/response bus that lets internal tools talk without import-coupling.
watch_out:
  - There is no postMessage protocol — embedders reach in through iframe.contentWindow.mmgisAPI directly, which only works under same-origin or a permissive FRAME_ANCESTORS.
seams_touched:
  - embed-host
  - browser-backend
prerequisites:
  - frontend-essence/core-runtime
---

## What it is

`mmgisAPI` is the contract MMGIS offers to anything outside its own bundle: a host page, an iframe parent, or a plugin tool. It lives in a single file — `src/essence/mmgisAPI/mmgisAPI.js` — and is intentionally narrow. Where the inner core (`L_`, `Map_`, `ToolController_`) is sprawling and imperative, `mmgisAPI` is the curated surface that callers are allowed to depend on.

There is no IPC layer. The whole API is plain JavaScript, attached to `window.mmgisAPI` once the app boots. Iframe embedders reach in through `iframe.contentWindow.mmgisAPI` — see `examples/ReactWrappedIframe/index.html`, which does exactly that and then calls `mmgisAPI.getVisibleLayers()` and `mmgisAPI.toggleLayer(name)` from the outer React app. There is no postMessage protocol; the same-origin (or `FRAME_ANCESTORS`-permitted) handshake is direct.

## How it gets wired up

The file exports two objects: `mmgisAPI_` (internal, mutable) and `mmgisAPI` (the JSDoc'd public surface). [Core boot](./core-runtime.md) calls `mmgisAPI_.fina(Map_)` once the Leaflet map is ready, which assigns `mmgisAPI.map` and fires the embedder's `onLoaded` callback. From that point on, `window.mmgisAPI` is live.

```js
mmgisAPI.onLoaded(() => {
  mmgisAPI.toggleLayer('Terrain', true)
  mmgisAPI.addEventListener('onClick', (e) => console.log(e.latlng))
})
```

## Categories of capability

The methods cluster into a handful of areas:

- **Layers.** `addLayer`, `removeLayer`, `toggleLayer`, `getLayers`, `getLayerConfigs`, `getVisibleLayers`, plus dynamic-data helpers `clearVectorLayer`, `updateVectorLayer`, `appendLineString`, and trim/keep variants for streaming feature data.
- **Selection and viewport.** `selectFeature`, `getActiveFeature`, `featuresContained` (everything in the current bounds), `writeCoordinateURL`, `project`/`unproject` against the configured CRS.
- **Time.** A pass-through to `TimeControl_`: `setTime`, `setLayerTime`, `getTime`, `reloadTimeLayers`, `setLayersTimeStatus`.
- **Tools.** `getActiveTool`, `getActiveTools`, `overwriteLegends` (lets an embedder render its own legend UI but keep MMGIS's logic).
- **Events.** `addEventListener` / `removeEventListener` translate a small vocabulary — `onPan`, `onZoom`, `onClick`, `toolChange`, `layerVisibilityChange`, `newActiveFeature`, etc. — to either Leaflet map events or DOM CustomEvents. The mapping is deliberately small so the embed contract stays cheap to maintain.
- **Direct Leaflet escape hatch.** `mmgisAPI.map` is the live Leaflet map. Anything not covered above can be done with raw Leaflet calls; the inline comment on `addLayer` says as much: "For a more 'temporary' layer, use Leaflet directly through `mmgisAPI.map`".

## The plugin bus

A second, newer surface lives in the same file: a [mitt](https://github.com/developit/mitt)-based pub/sub plus a request/response registry. This is what [tools and plugins](./tools.md) use to talk to each other and to the core without import-coupling.

- `on(event, cb)` / `off` / `emit(event, data)` — fire-and-forget events.
- `provide(name, handler)` / `request(name, data)` — async data fetch by string key.
- `forPlugin(pluginId)` — returns a scoped `{ emit, provide }` that auto-prefixes names with `plugin:<id>:`. `ToolController_` calls this for every loaded tool, so each tool gets `tool.api` populated automatically.

Core modules register handlers under stable namespaces during boot. `Map_` provides `map:getCenter`, `map:getBounds`, `map:setView`, `map:fitBounds`. `Layers_` provides `layers:getAll`, `layers:getVisible`, `layers:toggle`. `TimeControl` provides `time:getCurrent`, `time:set`. They also `emit` events like `feature:active`, `tool:change`, and `layer:visibilityChange` as state moves. A plugin can listen for those without importing any internal module.

## Where to look

When building an iframe embed, start from `examples/WrappedIframe/` (static) or `examples/ReactWrappedIframe/` (React, shows the `contentWindow.mmgisAPI` handoff). When authoring a plugin tool, read the `forPlugin` block at the bottom of `mmgisAPI.js` and the registration sites in `Map_.js`, `Layers_.js`, and `ToolController_.js` to see which event/request names are already in use.
