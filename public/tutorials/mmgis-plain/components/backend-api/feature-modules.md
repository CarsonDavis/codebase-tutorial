---
id: backend-api/feature-modules
title: The feature modules
summary: A tour of the backend features and the shared shape they all follow.
related:
  - backend-api/server-bootstrap
  - backend-api/auth-and-sessions
  - adjacent-servers
key_idea: Every feature is a folder with three things — a data model, a set of URLs, and a startup hook. The startup hook plugs the URLs into the server behind whichever login guards are appropriate.
watch_out:
  - The drawing feature is the odd one out — it uses a different database access library from everything else, for historical reasons. Match the neighboring code when adding to a feature.
seams_touched:
  - backend-postgres
  - plugin-drop
  - browser-backend
prerequisites:
  - backend-api/server-bootstrap
next:
  - backend-api/auth-and-sessions
---

## The shape

Every backend feature lives in its own folder. Each folder has roughly three things:

- A **data model**: definitions of the database tables the feature owns, with the helpers needed to read and write rows.
- **Routes**: the URLs the feature exposes (one file per logical chunk).
- A **startup hook**: a small file that runs at boot. It picks a URL prefix (e.g. `/api/datasets`), stacks the right login guards in front of it, and hands off to the feature's routes.

The exact same shape works for plugins. A folder with a magic-suffix name dropped next to the standard features gets discovered and loaded the same way.

## The features that ship in the box

The built-in features cluster into a few groups. For each one, the question to ask in a static refactor is: **does the frontend still need this, and if so, can it be replaced with a static file or an external service?**

### Datasets (tabular data)

The reference feature. Holds a registry of named datasets, lets admins upload CSVs or JSON, query them by column, append/replace/delete rows, and look up cross-references (which mission configurations use which datasets). Admin-only.

**Static refactor**: Anything the frontend actually queries gets baked into a JSON file at build time. No more uploads, no more queries — just whatever's frozen in the bundle.

### Geodatasets (spatial data)

The geographic sibling of Datasets. The same idea, but the rows are points/lines/polygons stored in PostGIS. Serves spatial data either as GeoJSON (a standard text format for geographic features) or as vector tiles (compact binary format that loads fast in the browser).

**Static refactor**: For a single mission, the relevant geodatasets get pre-rendered into static vector tiles or GeoJSON files served from cloud storage. The "query live" path goes away.

### Drawing

The real-time drawing system. Users draw shapes on the map; the shapes are stored in the database, versioned, and broadcast to other connected browsers via the WebSocket. This is the most server-heavy feature: it owns multiple database tables, a file-history concept, an aggregation system, and webhooks that fire on changes.

**Static refactor**: This feature can't exist in a static deployment in its current form. Either it's removed entirely, or it operates in a read-only mode where pre-existing drawn features are baked in but no new ones can be saved.

### Configuration

Owns the mission configurations and the admin app shell at `/configure`. The admin app talks to this feature to read and write mission JSON.

**Static refactor**: The admin app and this feature stay alive on the authoring deployment (Tier 1). The static build just freezes a snapshot of one mission's configuration into a JSON file that ships with the bundle.

### STAC (the catalog proxy)

A thin pass-through to the optional Python catalog service. Forwards calls and decorates the response with the mission/layer info it pulls from the local database.

**Static refactor**: The static frontend points at the Python catalog service directly using its public URL. The proxy goes away. The "decorate with mission info" step has to happen at build time instead.

### Webhooks

Stores user-defined HTTP callback URLs that other features (config edits, drawing) fire when things change.

**Static refactor**: Webhooks fire on edits. A static deployment has no edits. So this goes away.

### Link shortener

The smallest example. Generates a short random code, stores `(short, long, creator)`, and redirects when someone visits the short URL. Honors a "disable" flag for deployments that don't want it.

**Static refactor**: Either a third-party shortener takes over, or the feature goes away.

### General options and utilities

Two grab-bag modules — one is essentially empty (a placeholder), the other holds a small set of miscellaneous endpoints.

### Auth-related

Three more feature modules handle accounts, users, and long-term tokens — but they follow the same shape and live next to everything else. They're covered separately on the auth page because the concepts are bigger than the shape.

## Two database libraries

The codebase happens to use two different libraries for talking to the database — one for almost everything, and a different lower-level one specifically for the drawing feature. It's a historical accident. New code should match its neighbors.

For a static refactor this is moot, since the database is gone.

## What this means for a static refactor (summary)

Reading down the list above, three categories emerge:

- **Goes away entirely**: Drawing (mostly), Configuration (on the static side), Webhooks, Link Shortener, Accounts, Users, Long-term Tokens.
- **Gets replaced with a static file or external service**: Datasets, Geodatasets, STAC.
- **Stays the same**: nothing, since they're all server features.

The static build's job is to **freeze the relevant outputs of these features at build time**, drop them into static files, and ship them with the bundle.
