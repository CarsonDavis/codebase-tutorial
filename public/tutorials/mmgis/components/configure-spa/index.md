---
id: configure-spa
title: Configure (admin SPA)
summary: A separate React app served at `/configure` for managing missions, layers, datasets, and users.
related:
  - backend-api/feature-modules
  - backend-api/auth-and-sessions
key_idea: Configure is a wholly separate React 17 + react-scripts app that shares only the database with Essence — its job is editing the JSON config blob, not running the map.
watch_out:
  - Hot-reloading Configure during development requires npm run build inside configure/ after each change — the main server only serves the built artifacts, never CRA's dev output.
seams_touched:
  - configure-essence
  - browser-backend
prerequisites:
  - backend-api/feature-modules
next:
  - backend-api/auth-and-sessions
---

## What `/configure` is for

`/configure` is the in-browser admin tool for MMGIS. Mission operators use it
to create missions, define map layers, edit dataset metadata, manage users
and API tokens, and — when enabled — preview their changes against a live
copy of the main map. Everything the configure UI does is a thin wrapper over
the backend feature modules described in
[Backend feature modules](../backend-api/feature-modules.md): the page is
just a structured editor over the JSON config blob that drives Essence.

## A separate React app, not part of Essence

Configure is a wholly separate codebase from Essence. It lives under
`configure/` at the repo root with its own `package.json`, its own
`react-scripts`-based webpack pipeline, and a different React major version
(React 17 here, while Essence is still on the React 16 islands inside its
custom Webpack 5 build — see [Build and bundling](../build-and-bundling/index.md)).
The two apps share no bundle and no runtime; they only share the backend.

The Configure stack is modern and conventional:

- React 17 + React Router 6 + Redux Toolkit
- MUI v5 (`@mui/material`, `@mui/styles`, `@mui/icons-material`) for UI
- CodeMirror and `react-md-editor` for inline JSON / markdown fields
- `react-beautiful-dnd` for layer reordering, Leaflet for the embedded preview map
- `react-scripts` (CRA) for build, test, and dev server

## Layout of `configure/src/`

The directory structure mirrors a typical CRA app:

- `index.js` — boots Redux, MUI's `ThemeProvider`, and mounts `<Routings />`.
- `core/` — the heart of the SPA. `Configure.js` is the root component
  (a two-pane layout: `Panel` on the left, `Main` on the right). `store.js`
  + `ConfigureStore.js` define the Redux slice. `calls.js` is the API client
  (every call lines up with a route under `/api/configure/*`,
  `/api/datasets/*`, `/api/users/*`, etc.). `Maker.js` is the metaconfig
  renderer — it walks a JSON schema and produces the actual form widgets.
  `Websocket.js` connects to the backend's WS so two admins editing the
  same mission's config can't silently clobber each other — a save by one
  surfaces a "this config changed, refresh" warning in the other.
- `pages/` — top-level admin sections: `APIs`, `APITokens`, `Datasets`,
  `GeoDatasets`, `GeneralOptions`, `STAC`, `Users`, `WebHooks`. Each is a
  self-contained page mounted by `core/Configure.js`.
- `components/` — shared building blocks (`Main`, `Panel`, `Map`, `Tabs`,
  `SaveBar`, `SnackBar`, `VideoPreview`, `ColorButton`).
- `metaconfigs/` — JSON schemas (one per layer type and per tab)
  consumed by `Maker.js`. Adding a new field to the layer editor usually
  means editing one of these files, not writing React.
- `themes/light.js` — MUI theme.
- `external/` — vendored helpers (`js-colormaps`, `line-navigator`).

## How it's deployed and served

Configure builds to `configure/build/` via `npm run build` from inside
`configure/`. After the standard CRA build, `scripts/make-pug-index.js`
post-processes the resulting `index.html` into `index.pug` so the Express
server can render it through the same Pug pipeline used for the main app.

The main Express server in `scripts/server.js` mounts the Configure assets
as static directories under `/configure/build` and `/configure/public`,
both gated by `ensureUser()`. The SPA's HTML entry point is registered by
the `Config` backend feature module
(`API/Backend/Config/setup.js`), which adds `GET /configure` and renders
`../configure/build/index.pug` only if the requester clears
`ensureAdmin(true)` — so non-admins get bounced to the admin login page
defined by [Auth, accounts, and sessions](../backend-api/auth-and-sessions.md).
The same module also mounts the admin-only `/api/configure/*` router that
the SPA's `calls.js` talks to. Two consequences worth knowing:

1. There is no separate Configure server. It rides inside the main
   process; in production you don't run anything extra.
2. Hot-reloading Configure during development requires `npm run build`
   from `configure/` after each change, because the main server only
   serves the built artifacts. The repo's `configure/README.md`
   documents this and the reason (the alternative — running CRA's dev
   server — would force you to disable admin permission checks).
