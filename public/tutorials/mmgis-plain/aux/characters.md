---
id: aux/characters
title: Cast of characters
summary: The recurring named things in MMGIS, framed as actors with roles. If you can keep these eight in your head, the rest of the codebase reads faster.
---

## The shared mission state
There's one big in-memory object on the frontend that holds everything about the current mission — which layers exist, which are turned on, what the user's currently looking at, what the planet's radius is. Almost every other piece of frontend code reads from it. Nothing tells it what to do; it just *is*. If something on the page seems to know things it shouldn't, the answer is almost always "it asked the shared mission state."

## The math toolbox
A grab-bag module of shared math: distance between two points on a planet, bearing, normalizing geographic data into a consistent shape, planet radii. Imported by everyone, edited carefully — a small change here can ripple through hundreds of places that depend on it.

## The three viewports
A trio of independent sibling components: a 2D map, a 3D globe, and an image viewer (for inspecting individual photographs, 3D models, or PDFs attached to features). They share the same mission state and very little else. They can be shown one at a time or side-by-side.

## The tool controller
The thing on the frontend that loads every tool, builds the side panel, owns "which tool is active right now," and dispatches keyboard shortcuts. Tools are guests; the controller owns the room.

## The public embed API
A small, intentionally narrow JavaScript surface that outside web pages and plugin code are allowed to call. It's what an iframe embedder (a parent page that loads MMGIS inside it) uses to toggle layers, listen for clicks, fly the map somewhere. The internal guts of MMGIS are explicitly *not* the API; this is.

## The server toolkit
A bundle of utilities the backend hands to every "feature module" at startup — references to the Express app, the database connection, the auth guards, the permissions table. Every backend feature reaches into this toolkit to plug itself into the rest of the server. If a backend feature can do something, it's almost always because the toolkit handed it the tool.

## The librarian (Configure)
The admin web app. It doesn't run the map, it doesn't render layers — it edits the JSON file that *describes* the map. A separate codebase that talks to the server and the server alone, then hands the result over to the main app indirectly through the database.

## The secret door (plugin folders)
A folder with a magic-suffix name that the build system recognizes automatically. Drop one next to the standard tools or backend modules, restart, and it shows up in the build. No registry edit, no config flag — the convention itself is the plumbing. Quietly load-bearing for every mission operator who has customized their own MMGIS deployment.

## The museum (the spec-kit)
A retroactive design-doc folder that was added long after most of MMGIS already existed. Useful for new features, occasionally helpful for archaeology, but not authoritative on anything older than itself. Read the code if you want to know what's actually happening today.
