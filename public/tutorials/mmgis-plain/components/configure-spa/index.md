---
id: configure-spa
title: Configure (the admin app)
summary: A separate React app at /configure for editing missions, layers, datasets, users, and tokens. Doesn't render a map — just edits the JSON config that describes the map.
related:
  - backend-api/feature-modules
  - backend-api/auth-and-sessions
key_idea: Configure is a wholly separate browser app from Essence. The two share only the database. Configure's job is to write the mission JSON config that Essence reads at boot.
watch_out:
  - During development, you have to rebuild Configure manually after each change — there's no auto-reloading dev server for it like there is for Essence.
seams_touched:
  - configure-essence
  - browser-backend
prerequisites:
  - backend-api/feature-modules
next:
  - backend-api/auth-and-sessions
---

## What `/configure` is for

`/configure` is the admin tool for MMGIS. Mission operators use it to:

- Create missions and define their map layers.
- Edit dataset metadata.
- Manage users and API tokens.
- (Optionally) preview their edits against a live copy of the main map.

Everything Configure does is a thin wrapper around the backend feature modules described on the [feature modules](../backend-api/feature-modules.md) page. The page is essentially a structured form editor on top of the JSON config blob that drives Essence.

## Why it's a separate app

Configure is a completely separate codebase from Essence. It has its own folder at the repo root, its own bundle, its own React version, its own dependencies. The two apps share no code at runtime; they only share the backend.

Why split them?

- **Different audiences, different lifecycles.** Configure is for mission admins who edit it rarely. Essence is for end users who load it constantly. Different cadence.
- **Different weight tolerances.** Configure can use heavier libraries (newer React, a big UI component library, a JSON code editor, drag-and-drop for layer reordering) without dragging that weight into the user-facing app.
- **Cleaner permission boundary.** Code that only exists in Configure literally can't leak into a regular user's browser session, because regular users never load the Configure bundle.

## What's in the codebase

The Configure code is structured like a typical modern React app:

- A root component that lays out a two-pane interface (left panel + main view).
- A small set of "pages" for each admin section: APIs, API tokens, datasets, geodatasets, general options, STAC, users, webhooks.
- A central state store.
- An API client (one function per backend endpoint Configure talks to).
- A schema-driven form renderer: it walks a JSON schema and produces the actual form widgets. This is how new layer fields get added — you edit one JSON schema file, not React components.
- A WebSocket connection to the backend so multiple admins editing the same mission stay in sync.

## How it's served

Configure builds to a `build/` folder via its own build step. After that, a small post-processing script converts the resulting HTML into a template the main server can render.

In production, the main server mounts the built Configure files as static assets at `/configure`, gated by the login guards. The entry point HTML is gated specifically by the admin guard, so non-admins get bounced to the login page.

In other words: **there's no separate Configure server.** It rides inside the main Node process. Deploying MMGIS in production is one process, not two.

The trade-off shows up in development: there's no live-reload for Configure. After each edit, you have to rebuild it. The alternative (running its own dev server) would require disabling admin permission checks, which the team chose not to do.

## What this means for a static refactor

In a deployment model where there's an internal "authoring" tier and an external "static read-only" tier, Configure stays alive on the authoring tier and is removed entirely from the static one.

The static build doesn't include the Configure bundle. The static frontend has no editing capability. The only thing that crosses from authoring to static is the **frozen snapshot of the mission JSON config** — baked into a file at the moment the static build is produced.
