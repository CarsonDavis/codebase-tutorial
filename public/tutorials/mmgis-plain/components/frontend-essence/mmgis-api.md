---
id: frontend-essence/mmgis-api
title: The public embed/plugin API
summary: A small, deliberately narrow JavaScript surface that outside web pages and plugin authors are allowed to call.
related:
  - frontend-essence/core-runtime
  - frontend-essence/tools
key_idea: A single file holds two things — the documented public API that outside callers use, and an internal event bus that lets tools talk to each other without depending on each other's internals.
watch_out:
  - There's no message-passing protocol. Embedders reach directly into the MMGIS iframe and call functions on it. That only works when the parent page and MMGIS are on the same origin (or the embed permissions are configured for it).
seams_touched:
  - embed-host
  - browser-backend
prerequisites:
  - frontend-essence/core-runtime
---

## What it is

This is the contract MMGIS offers to anything outside its own code. Three kinds of "outside":

- A **parent web page** that embeds MMGIS in an iframe. (An iframe is a window-within-a-window in HTML — one site loading another inside a frame on its page.)
- A **plugin tool** that ships separately but gets bundled into MMGIS.
- A **script in the browser console** that wants to drive the map.

The whole thing lives in a single file and is exposed on a well-known global name. Where the internal guts of MMGIS are sprawling and full of legacy code, this surface is small, documented, and deliberately stable.

## How it gets exposed

Once MMGIS finishes booting, an object with the public methods is attached to a known global name on the page. Anything that can run JavaScript in the same page (including a parent page that loaded MMGIS in an iframe) can grab that object and start calling methods on it.

There's no message-passing protocol. The parent page just reaches into the iframe and calls functions on it directly. This is why same-origin (or explicit cross-origin permission) is required: by default, browsers won't let two pages from different sites reach into each other.

## What's in the public API

The methods cluster into a few groups:

- **Layers.** Add a layer, remove one, toggle visibility, list the layers, read the current set, push streaming data into a vector layer.
- **Selection and viewport.** Select a feature, ask what's currently selected, ask what features are inside the current view, ask the map to fly to a specific location, convert coordinates back and forth between the map's coordinate system and screen pixels.
- **Time.** A pass-through to the time controls — set the time, get the time, reload time-aware layers.
- **Tools.** Ask which tool is active, replace a built-in UI element (like the legend) with your own.
- **Events.** Subscribe to a small fixed vocabulary of events: the user panned, the user zoomed, the user clicked, the active tool changed, a layer's visibility changed, the active feature changed.
- **An escape hatch.** A reference to the live underlying map object, so if the published API doesn't cover what you need to do, you can drop down to the underlying mapping library and do it yourself.

## The internal event bus

The same file holds a second, internal surface: a pub/sub event bus and a request/response registry. This is what lets internal pieces of MMGIS talk to each other without importing each other's internals.

The pub/sub side: a module can "emit" an event with a string name and some data, and any number of other modules can listen for that name. The request/response side: a module can "provide" a named handler ("here's how to answer the question 'what's the current map center?'") and any other module can "request" it by name and get the answer back.

The core modules register handlers at startup under stable names like "map: get center," "layers: get visible," "time: set." A tool that wants to know the current map center doesn't have to import the map module — it just asks the bus by name. This keeps the modules loosely coupled.

## What this means for a static refactor

The public API is entirely browser-side and doesn't depend on the server. A static build would keep the entire API intact. The only thing to think about is whether any *specific* method is implemented with a server call under the hood — for example, a "fetch features near here" method that depends on a server-side search. Those individual methods would either be turned off, or rewritten to point at static files / external services.
