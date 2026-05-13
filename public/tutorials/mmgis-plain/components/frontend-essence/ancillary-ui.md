---
id: frontend-essence/ancillary-ui
title: Everything else around the map
summary: All the non-map UI — login, search, the scale bar, modals, the landing page. Old-style code, but mostly self-contained.
related:
  - frontend-essence/core-runtime
key_idea: The "chrome" around the map is a flat bag of small, single-purpose modules written in an older imperative style, mounted into slots created by the core layout machinery.
watch_out:
  - No central manifest. If you rename one of these modules, you have to grep the whole codebase to find what calls it — there's no registry.
seams_touched:
  - browser-backend
prerequisites:
  - frontend-essence/core-runtime
---

## What counts as "ancillary"

Everything that's not the map. The map engines, the layers, and the tool registry live in the core. The user-facing tools live in the tools folder. Everything around the edges — the top-bar search box, the cursor coordinate readout, the modal dialog system, the right-click context menu, the scale bar, the login form, the landing page that lets a user pick a mission — sits in a separate folder called "ancillary."

These modules are pre-React MMGIS. They're written in the older imperative style: a single object exporting a setup function, a teardown function, and a few helpers. The HTML is built as a big string and inserted into the page. State is held on the module itself rather than in any framework store.

## What's in there

Roughly grouped:

- **Top bar and persistent chrome.** Search-with-autocomplete, the cursor coordinate readout, the login modal, the MMGIS logo, attribution text, help modals.
- **Map overlays.** Scale bar, compass, the floating tooltip that follows the cursor, the right-click context menu, the description box.
- **System utilities used as UI.** The generic modal stack everything else builds on, a confirm-dialog, the URL parameter machinery (this is what makes MMGIS links shareable — turning the URL into a snapshot of "what was on screen" and back), styling helpers, sprite/icon factories for the 3D globe.
- **A landing page.** A small module that runs *before* the map boots, looks at the URL to decide which mission to load, and either jumps straight to it or shows a grid of available missions to pick from.

## How it gets wired in

These modules don't have a central registry. The startup script imports each one directly and calls its setup function in a fixed order. If you rename one, you have to find the other places that import it by searching the codebase.

This is also pre-modern code: nothing here uses TypeScript, modern React, or any framework convention. It's just hand-written JavaScript with HTML strings and a sprinkling of jQuery. It works fine, but new contributors sometimes find it surprising.

## What this means for a static refactor

Most of this folder works in a static build with no changes, because most of it is pure browser code. Two pieces interact with the server:

- The **login form**. In a static build there's nothing to log into, so it just doesn't run.
- The **search** box. Depending on what it's searching against (the local layer set or a server-side search), it might or might not work. The local-layer-set case keeps working in a static build.
