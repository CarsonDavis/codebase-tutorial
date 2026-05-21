---
id: frontend-essence/tools
title: The tools panel
summary: What "a tool" is in MMGIS, how the side panel works, and how custom tools get added without touching the core.
related:
  - frontend-essence/core-runtime
  - frontend-essence/mmgis-api
key_idea: Each tool is a small self-contained module with a tiny lifecycle (initialize, render, tear down) that the tool controller calls into. Custom tools get added by dropping a folder with the right name next to the built-ins.
watch_out:
  - A tool that doesn't clean up after itself when deactivated can break neighboring tools. There's no automatic isolation between them.
seams_touched:
  - plugin-drop
  - build-time-runtime
prerequisites:
  - frontend-essence/core-runtime
next:
  - frontend-essence/mmgis-api
---

## What a tool is

A "tool" in MMGIS is a single user-facing capability that takes over the side panel (or pops out into its own window) when the user clicks its toolbar icon. Examples: a drawing tool, a measuring tool, a layer-tree control, a feature inspector.

Each tool is structured as a small self-contained module — a folder with the tool's code, a configuration file describing the tool's settings, and a stylesheet. Tools don't import each other; they read the shared mission state, they draw onto the map through the viewport modules, and otherwise they keep to themselves.

## The tool lifecycle

Each tool implements a small standard interface that the tool controller calls into:

- **Initialize** — runs once at app startup, after all tools are registered.
- **Make** (i.e. activate) — runs when the user clicks the tool's icon. The tool renders itself into the side panel and starts listening to whatever it needs to.
- **Destroy** — runs when the user switches away. The tool is expected to tear down everything it set up.
- **Optional extras**: receive cross-tool messages, do final setup once everything is up, save its current state into the URL for share-link round-tripping.

If a tool doesn't clean up after itself in "destroy," it leaks listeners and can break the next tool the user opens. There's no enforcement of this — it's a convention every tool author has to follow.

## How tools get registered

You don't import tools by hand. Before the frontend gets bundled, a build script scans:

1. The standard tools folder.
2. Any folder with a name matching one of the "plugin" or "private tools" patterns.

For each folder it finds, it reads the tool's configuration file and adds the tool to a generated manifest. Then the bundler treats that manifest like normal source code.

This is what makes MMGIS extensible without touching the central code: an integrator drops a `MyMission-Plugin-Tools` folder next to the built-ins, restarts the build, and their tool is in the app. The same convention is used for backend feature modules and for "components" (non-tool plugins).

## What ships in the box

The built-in tools cluster into a few groups:

- **Editing.** The drawing tool is by far the heaviest. It supports drawing shapes, editing them, undo/redo, file management, templating, and publishing finished drawings as a feature layer. Multiple users can edit the same drawing file at once, but they don't see each other's edits in real time — coordination happens through the shared database, with whoever saves last winning. Also: a tool for measuring distances and elevation profiles.
- **Inspection.** Identifying which feature is under the cursor; rendering a feature's detail page; controlling which layers are visible and how transparent they are.
- **Analysis.** Travel-time polygons, line-of-sight calculations, terrain cross-sections, mineral-composition plots.
- **Time-aware.** A tool that animates time-tagged layers through their range.
- **Navigation and chrome.** Preset locations, a legend, a lighting/shading tool, a feature-detail rendering catalog.

The tool controller also publishes tool-change events on the public embed API's event bus, so external pages and plugins can listen for "the user switched tools" and react.

## What this means for a static refactor

The drawing tool is the most server-coupled of the built-ins — every shape is persisted to the database, versioned, and (optionally) fired off to webhooks. In a static deployment, that tool either disappears entirely, or runs in a read-only mode where it can display pre-baked drawn features but not save new ones.

The other tools are mostly fine. Most of them just read the layers from the shared mission state and draw on the map; they don't need a backend. The configuration tool (Configure renders schemas as forms) is the only other server-coupled piece — and Configure itself isn't part of the static build at all, so this is academic.
