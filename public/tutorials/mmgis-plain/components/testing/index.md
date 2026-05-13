---
id: testing
title: Testing
summary: One test runner handles both fast unit tests and slow end-to-end browser tests.
related:
  - backend-api/server-bootstrap
key_idea: A single test tool (Playwright) covers both layers. Unit tests skip the backend startup and run fast; end-to-end tests boot a real server and a real browser.
watch_out:
  - The repo's README mentions an older test tool that's no longer in use. Running that older tool produces no useful output.
seams_touched:
  - browser-backend
  - backend-postgres
prerequisites:
  - backend-api/server-bootstrap
---

## One runner for everything

MMGIS has consolidated its test suite onto a single test runner (Playwright). Both fast unit tests and full browser end-to-end tests run under it. The repo's README still references an older tool — that's a leftover, and the suite has fully migrated away.

The advantage of one runner: same imports, same assertions, same reporting, and one shared "test fixtures" folder both layers pull from.

## The folder structure

Inside the tests folder:

- A **unit folder.** Pure JavaScript, no browser. Tests import internal modules directly and check their behavior in isolation. Examples: the math helpers, the map-engine adapters, helpers for building tile URLs.
- An **end-to-end folder.** Real browser, real backend. Tests navigate to the running app and click around. Currently small — a smoke test, an event-bus integration test.
- A **shared fixtures folder.** Plain JavaScript modules with frozen sample data — coordinate pairs with expected distances, sample GeoJSON, color test cases. Both layers import them.

## How runs are configured

There's a single test config file at the repo root. The interesting bits:

- For browser tests, the config knows how to start the real backend in test mode and waits for its health check to pass before running any test.
- A flag lets unit-test-only runs skip the entire backend startup, since unit tests don't need a server.

The npm scripts wrap this with convenience aliases: "test everything," "test unit only" (the fast loop while iterating), "test end-to-end only," "test with a visible browser" (for debugging), "show the most recent test report."

## CI

Automated test runs happen via the project's continuous integration setup. CI brings up a Postgres database, installs the headless Chromium browser, runs the full suite with retries, and uploads the HTML report plus failure screenshots/videos as artifacts you can download and inspect.

## What this means for a static refactor

The unit-test layer is unaffected — it doesn't need a server. The end-to-end layer needs adjustment, since "end-to-end" in a static deployment means a static bundle plus external service URLs, not a Node server plus Postgres. You'd probably want a separate set of static-mode end-to-end tests that:

- Build the static bundle in test mode.
- Serve it from a local static-file server.
- Navigate to it and verify the page works without any backend in sight.

The existing unit tests against the frontend (math helpers, adapters, URL helpers) all still apply.
