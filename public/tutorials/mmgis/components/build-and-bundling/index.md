---
id: build-and-bundling
title: Build, bundling, and dev server
summary: The CRA-eject Webpack 5 pipeline that bundles Essence, plus the dev-server convention and the plugin-directory glob loader.
related:
  - frontend-essence/core-runtime
  - frontend-essence/tools
  - configure-spa
key_idea: A CRA-eject upgraded to Webpack 5 with MMGIS-specific patches for Cesium and Node-core polyfills, fed by a pre-build code-generation step that scans plugin-drop directories.
watch_out:
  - In development the SPA is on PORT+1 (8889) while Express is on PORT (8888) — opening the wrong port loads the shell but never finishes booting Essence.
  - The plugin manifest is a generated, gitignored file (src/pre/tools.js) — drop in a new plugin directory and you must restart the build, since webpack only sees what was generated before it ran.
seams_touched:
  - plugin-drop
  - build-time-runtime
next:
  - frontend-essence/core-runtime
---

## What this is

`configuration/webpack.config.js` is a forked Create-React-App eject that has been
upgraded to Webpack 5. The CRA hallmarks are everywhere: `react-dev-utils` helpers,
`babel-preset-react-app`, the `oneOf` rule list, `ModuleScopePlugin`, the
`getStyleLoaders` helper, and the `paths.js` / `modules.js` / `env.js` triplet. Read
this with that lineage in mind — most of the file is stock CRA, and the interesting
edits are MMGIS-specific patches.

The notable MMGIS additions to the otherwise-vanilla config:

- A `crypto.createHash` shim that rewrites `md4` to `sha256` so the config runs on
  Node 18+.
- `ModuleScopePlugin` allow-listing `node_modules/cesium` (Essence imports Cesium
  CSS and source).
- `CopyWebpackPlugin` copying Cesium's `Workers`, `ThirdParty`, `Assets`, and
  `Widgets` into `static/cesium/`, plus a `DefinePlugin` setting `CESIUM_BASE_URL`.
- `resolve.fallback` disabling Node core polyfills (Webpack 5 no longer auto-shims
  them) and a `markjs` alias to the jQuery build.
- An `--analyze` flag that turns on `BundleAnalyzerPlugin` in dev.

This config bundles the *main* Essence app only. The [Configure admin SPA](../configure-spa/index.md)
ships its own webpack pipeline under `configure/`.

## `scripts/build.js` vs the dev server

`scripts/build.js` is the production-build entry, run via `npm run build`. It calls
`updateTools()` and `updateComponents()` (see below) to regenerate the dynamic
plugin manifests, empties `build/`, copies `public/`, then drives a one-shot
`webpack(config).run(...)`. After compilation it generates a `build/index.pug`
copy of the HTML for the Express server's view layer.

Development is different: `npm start` runs `scripts/server.js`, which — when
`NODE_ENV !== 'production'` — instantiates `WebpackDevServer` from
`configuration/webpackDevServer.config.js` alongside the Express API. There is no
separate `react-scripts start` equivalent; the dev server lives inside the
backend process.

## Dual-port dev convention

In development, MMGIS runs on **two** ports (README §Quick Start):

- `PORT` (default `8888`) — the Express server. Hosts `/configure`, `/docs`, the
  API under `/api`, and other ancillary pages.
- `PORT + 1` (default `8889`) — the WebpackDevServer. Hosts the Essence SPA with
  HMR.

This is hard-coded in `webpackDevServer.config.js`:

```js
const port = parseInt(process.env.PORT || "8888", 10);
return { port: port + 1, /* ... */ };
```

The `onListening` log message reflects the split: the SPA is at `:8889`, "the rest
of the pages" at `:8888`. Production collapses both onto the single Express port
serving the static `build/`.

## `paths.js`, `modules.js`, `env.js`

Stock CRA scaffolding, lightly customized:

- **`paths.js`** centralizes filesystem locations (`appBuild`, `appPublic`,
  `appHtml`, `appIndexJs = src/index`, `appSrc = src/`, etc.) and computes
  `publicUrlOrPath` from `package.json#homepage` (`"build"`).
- **`modules.js`** reads `tsconfig.json`/`jsconfig.json`, derives webpack
  `additionalModulePaths` and `webpackAliases` from any `baseUrl`, and exposes
  them to the main config.
- **`env.js`** loads the `.env*` cascade and, in `getClientEnvironment`, picks up
  every `REACT_APP_*` variable plus a curated MMGIS allow-list (`AUTH`,
  `VERSION`, `HOSTS`, `WITH_TITILER`, `MAIN_MISSION`, …) and stringifies them for
  `webpack.DefinePlugin`. That allow-list is the canonical answer to "which env
  vars reach the browser?"

## Plugin glob loading

The plugin system is *not* implemented in webpack itself — it is implemented in
`API/updateTools.js`, called from `scripts/build.js` before compilation. Two
functions, identical in shape:

- `updateTools()` scans `src/essence/` for any directory matching
  `*Private-Tools*` or `*Plugin-Tools*`, reads each child tool's `config.json`,
  merges them with the built-in tools under `src/essence/Tools/`, sorts by
  `toolbarPriority`, and writes the merged set to **`src/pre/tools.js`** as a
  generated module of `import` statements plus exported `toolConfigs` /
  `toolModules` maps.
- `updateComponents()` does the same for `*Private-Components*` /
  `*Plugin-Components*`, generating `src/pre/components.js`.

Webpack then bundles `src/pre/tools.js` and `src/pre/components.js` like any
other source. The "plugin manifest" is therefore a code-generation step that
runs *before* webpack, not a runtime registry. See [Mapping tools](../frontend-essence/tools.md)
for how the [core runtime](../frontend-essence/core-runtime.md) consumes these
generated maps. Both generated files are gitignored.
