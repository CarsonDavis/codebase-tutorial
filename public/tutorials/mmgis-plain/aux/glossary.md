---
id: aux/glossary
title: Glossary
summary: The terms MMGIS prose keeps using, defined in plain English. No code, no file paths — just what the words mean.
---

## Essence
The main MMGIS browser app. It's what users see and interact with — the 2D map, the 3D globe, the image viewer, and the side panel of tools. "Essence" is just the codename for it. Most of this tutorial is really about Essence and the server that feeds it.

## Configure
A separate browser app, at the URL `/configure`, used by mission administrators to set up missions. It doesn't actually render a map — it's a structured form editor for the JSON file that describes the map. Essence reads that file; Configure writes it. They are two different codebases that only share a database.

## Mission
A single mission's bundle of settings: which layers exist, where their data lives, which tools are turned on, what the default view should be. Mars and the Moon are different missions, and so are different rovers. The mission is the unit of personalization for MMGIS — when you open the site, you're opening it *for* a specific mission, and the URL says which one.

## Layer
A single thing drawn on the map — a base imagery layer, an elevation overlay, a set of points of interest, a polygon outline. A mission has many layers. A layer's data can come from many places: a folder of pre-cut image tiles on disk, a database table, a tile service, or a static file in cloud storage.

## Tile / map tile
A small image (typically 256 by 256 pixels) representing a square patch of the world at a specific zoom level. Map apps work by stitching together thousands of these tiles into what looks like a seamless map. "Tiling" raw imagery means slicing it up into this grid format.

## GIS
"Geographic Information System." Any software that displays or analyzes geographic data. MMGIS is one.

## PostGIS
A database extension that teaches Postgres to store and query geographic shapes (points, lines, polygons) — things like "find all features within this bounding box." MMGIS uses PostGIS for the spatial data it stores in its database.

## SPA (single-page app)
A browser app that loads once and then handles navigation and updates inside the page, instead of asking the server for a new HTML page every time you click. Essence and Configure are both SPAs.

## API (HTTP API)
A set of URLs the browser can call to read or write data. The browser sends a request (usually for JSON data), the server replies. Most of the calls Essence makes to the server are to its API.

## WebSocket
A persistent two-way connection between browser and server. Unlike a normal HTTP request, the connection stays open, and either side can send messages at any time. MMGIS uses one WebSocket to broadcast drawing edits to everyone else who has the same mission open.

## Session
The server's record of "this browser is logged in as this user, until the session expires or they log out." Implemented as a small random ID that the browser stores in a cookie and sends back with every request, with the actual session data living server-side in a database table.

## Cookie
A small piece of data the browser stores for a given site and sends back automatically with every request to that site. MMGIS uses one cookie to identify the logged-in session.

## Bearer token
A long random string that scripts (not browsers) can use to authenticate to the server instead of logging in with a username and password. They send it as an `Authorization` header on each request. MMGIS calls these "long-term tokens."

## CSSO
Short for "Cross-Site Single Sign-On" in MMGIS-speak. An optional mode where MMGIS sits behind a NASA mission-control login gateway, and the gateway tells MMGIS who the user is. Off by default.

## CRS (coordinate reference system)
The math for translating real-world coordinates (like latitude/longitude on Mars) into pixels on a screen. Mars and the Moon have their own coordinate systems that aren't the same as Earth's. MMGIS has to know which one is active to draw things in the right place.

## DEM (digital elevation model)
A grid of elevation numbers — basically a tile-set where each pixel holds a height rather than a color. The 3D globe and tools like elevation profiles read from DEMs.

## GeoTIFF / Cloud-Optimized GeoTIFF (COG)
A big TIFF image with extra metadata describing where it sits on the planet. A "cloud-optimized" GeoTIFF is structured so a tile server can read just the slice it needs over HTTP, without downloading the whole file. The Python tile sidecars consume COGs.

## STAC
A standard format for catalogs of geospatial assets — "here are 500 images of this region, each with these metadata fields, taken at these times." MMGIS can talk to an optional STAC service to browse and serve catalogs.

## Tile server
A program that turns big raw imagery into small tile images on demand. The Python sidecars are tile servers (or close cousins of tile servers).

## Proxy / reverse proxy
A server that forwards requests to another server behind the scenes. To the browser it looks like a single site; under the hood the request might land at any of several internal services. MMGIS does this for the Python tile sidecars so the browser never has to know they exist.

## Bundle / bundler
A bundler is the build tool that takes hundreds of JavaScript files (your source code, libraries, CSS, images) and compiles them into a handful of files the browser can actually load efficiently. The output is "the bundle." MMGIS uses Webpack as its bundler.

## Dev server
A version of the bundler that watches your source code and rebuilds (and reloads the browser) as you edit. Used during development, never in production.

## Plugin-drop convention
An MMGIS convention where you can add a new tool or backend feature just by creating a folder with a special name (`*Plugin-Tools*`, `*Plugin-Backend*`, etc.) and dropping it next to the built-in ones. The build system finds the folder automatically — you don't have to edit any central list. This is how mission operators add private, mission-specific tools without forking the codebase.

## Spec-kit
A folder in the repo where MMGIS contributors write design docs. It was added long after the codebase already existed, so most of the code isn't documented there. Treat it as design notes for new work, not as an explanation of how things currently work.
