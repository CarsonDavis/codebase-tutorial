---
id: testing
title: Testing (Playwright)
summary: Playwright is the single runner for unit and e2e specs; one config, one
  command surface, with the backend started automatically for browser tests.
related:
  - backend-api/server-bootstrap
key_idea: One playwright.config.js runs both unit and e2e specs, with PLAYWRIGHT_TEST_UNIT_ONLY skipping the backend webServer for fast feedback and CI bringing up Postgres + Chromium for the full matrix.
watch_out:
  - The README still mentions Jest, but the suite has fully migrated to Playwright — running jest commands against tests/ will not exercise anything meaningful.
seams_touched:
  - browser-backend
  - backend-postgres
prerequisites:
  - backend-api/server-bootstrap
---

## One runner, two flavors

The MMGIS test suite has consolidated on Playwright. `tests/README.md` notes the
move off Jest — every spec file, fast or slow, is now executed by
`@playwright/test`. That keeps the dependency surface small and lets unit and e2e
tests share the same imports, assertions, and HTML reporter.

The split is purely structural:

```
tests/
├── unit/        # Pure JS, no browser. Imports modules directly.
├── e2e/         # Real Chromium, real backend, navigates to '/'.
├── fixtures/    # Static sample data shared by both layers.
└── README.md
```

`unit/` covers self-contained logic — `Formulae_` math, the deck.gl and Leaflet
adapters, the map engine registry, COG/STAC URL helpers, the component
controller. `e2e/` is currently small (`smoke.spec.js`,
`eventbus-integration.spec.js`) and exercises the loaded SPA against a live
backend.

## How runs are wired

The root `playwright.config.js` is the single source of truth. Two things in it
are worth knowing:

1. `webServer.command` is `npm run start:test`, which boots the Express server
   in `NODE_ENV=test` on port 8888 and waits for
   `/api/utils/healthcheck` to return 200. That is the same entry point covered
   in [server bootstrap](../backend-api/server-bootstrap.md), just with the test
   environment flag set.
2. The `webServer` block is skipped entirely when
   `PLAYWRIGHT_TEST_UNIT_ONLY=true` is set, so unit runs do not pay the
   server-startup cost.

The npm scripts wrap that config:

```jsonc
"test":        "playwright test",                                  // everything
"test:unit":   "cross-env PLAYWRIGHT_TEST_UNIT_ONLY=true playwright test tests/unit",
"test:e2e":    "playwright test tests/e2e",
"test:headed": "playwright test --headed",                         // visible browser
"test:ui":     "playwright test --ui",                             // interactive runner
"test:debug":  "playwright test --debug",
"test:report": "playwright show-report"
```

Use `npm run test:unit` while iterating on pure logic — it is the fast loop.
`npm run test:e2e` (or plain `npm test`) reuses an already-running dev server
when one is up locally, otherwise spawns its own via `start:test`. `test:headed`
and `test:ui` are the same runs with the browser visible or inside Playwright's
inspector.

CI is wired through `.github/workflows/playwright-tests.yml`: a Postgres service
container, Chromium only, two retries, with HTML reports and failure
videos/screenshots uploaded as artifacts.

## Fixtures

`tests/fixtures/` holds plain-JS modules with frozen sample data so specs do not
hand-roll geometry. `coordinate-samples.js` exposes `coordinatePairs` (short,
medium, cross-continental, same-point, and Mars/Gale Crater pairs with expected
distances) and `bearingTestCases` for compass math. `geojson-samples.js` exposes
`validGeoJSON` (point, line, polygon, multi-geometries) and `colorTestCases` for
style helpers. Both unit and e2e tests import them directly — there is no
fixture-loading framework, just ES modules.
