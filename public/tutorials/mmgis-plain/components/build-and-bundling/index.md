---
id: build-and-bundling
title: Build & dev server
summary: How the frontend gets turned into a browser-ready bundle, and the quirks of running it during development.
related:
  - frontend-essence/core-runtime
  - frontend-essence/tools
  - configure-spa
key_idea: A standard JavaScript bundler does most of the work, but there's a pre-build code-generation step that scans plugin folders and writes a manifest. The bundler then treats that manifest like any other source.
watch_out:
  - In development, the frontend runs on a different port from the API server. Opening the wrong port loads a half-broken page that never finishes booting.
  - The plugin manifest is generated *before* the bundler runs. Drop in a new plugin folder and you have to restart the build for it to be picked up.
seams_touched:
  - plugin-drop
  - build-time-runtime
next:
  - frontend-essence/core-runtime
---

## What the build does

The build's job is to turn the frontend source code (hundreds of files, many libraries, CSS, images, fonts) into a small set of optimized files the browser can load.

MMGIS uses a forked-and-customized version of a popular React build setup (Create React App, ejected and upgraded). The bundler underneath is Webpack. The setup is mostly conventional, with a handful of MMGIS-specific patches:

- Support for the 3D rendering library (Cesium), which needs special handling because it ships its own worker scripts and assets that have to be copied into the build output.
- Explicit choices about which browser-shim libraries to include or exclude (the newer bundler stopped auto-shimming things, so MMGIS had to declare its preferences).
- An optional "analyze the bundle size" flag for developers debugging build bloat.

This build pipeline produces the main user-facing app (Essence). The admin app (Configure) has its own separate build using a more conventional pipeline.

## Production builds vs. development

In **production**, there's one build step that:

1. Runs the code-generation step (more on this below).
2. Wipes the output folder.
3. Copies in static public assets.
4. Runs the bundler once.
5. Converts the resulting HTML into a server-renderable template.

The Node server then serves the bundle as static files. One server, one port, simple.

In **development**, there's a parallel setup. The Node API server runs as usual on one port. Alongside it, a development-mode bundler runs on a different port, watching files and auto-rebuilding as you edit. It also auto-reloads the browser when something changes.

This is the "two ports in dev" thing: the Node server is on one port, the development bundler is on the next one. The development bundler is the one users open in the browser; it forwards API requests through to the Node server behind the scenes. If you accidentally open the Node server's port directly during development, the HTML loads but the JavaScript bundle never arrives — the page sits in a partial state forever.

In production, both collapse onto one port served by the Node server.

## Environment variables

There's an environment-variable filtering step. The build picks up `REACT_APP_*`-prefixed variables plus a curated list of MMGIS-specific ones, and inlines them into the bundle as constants. Anything not on that list never makes it into the browser. This is the canonical answer to "which environment variables actually reach the frontend?"

## The plugin glob / code generation step

This is the most interesting part of the build, and the thing to understand for any refactor.

Before the bundler runs, a Node script scans the source tree for plugin folders. Two functions:

- One walks the tools folder plus any folder named like a plugin or private-tools folder, reads each tool's config, and writes a generated file listing all the tools. The bundler then treats that generated file as ordinary source.
- Another does the same for "components" (non-tool plugins).

This is not a "plugin system" in the runtime sense. **The plugin manifest is a code-generation artifact, frozen at build time, not a runtime registry.** Drop in a new plugin folder, restart the build, and the next bundle has the new plugin in it. Skip the restart and nothing happens.

Both generated files are ignored by git, since their content is derived from the on-disk folder layout.

## What this means for a static refactor

This is the friendliest seam in the system for adding a static-mode build. Conceptually, you'd add:

- An environment flag (`STATIC_MODE=true`) that the build picks up.
- A new code-generation step (or an extension to the existing one) that runs at build time, talks to a real backend once to fetch the chosen mission's full configuration plus any referenced static data, and writes it all to a JSON file that the bundle ships with.
- Tweaks to the frontend so that when the flag is on, it loads the mission config from that JSON file instead of making an API call.
- A separate output mode (or a separate build script) that produces a bundle suitable for dropping into cloud storage — no backend assumptions, all API base URLs rewritten to either external services or static file paths.

The existing build is set up to support this cleanly because it already has a "do work before the bundler runs" pattern. You're extending that pattern, not replacing it.
