---
id: backend-api/server-bootstrap
title: How the server boots
summary: The sequence the server runs through at startup, and the shape of the toolkit every feature module gets handed.
related:
  - backend-api/feature-modules
  - backend-api/auth-and-sessions
key_idea: Two scripts run in order — first a setup script that makes sure the database exists and has the right extensions, then the main server script that wires up everything else and starts listening for requests.
watch_out:
  - Session handling has to be wired up early in the startup order, because other middleware reads from it. Reordering would silently strip user identity.
seams_touched:
  - browser-backend
  - backend-postgres
next:
  - backend-api/feature-modules
---

## Two-step startup

Starting MMGIS runs two scripts in sequence:

1. **A database setup script.** It connects to Postgres, makes sure the database exists, makes sure the geographic extension (PostGIS) is installed, makes sure the session-storage table exists, and makes sure a couple of spatial indexes are in place. It's safe to run repeatedly — "create if not exists" everywhere.
2. **The main server script.** Builds the actual web server, plugs in all the features, and starts listening.

If step 1 fails, step 2 never runs. This guarantees the server never tries to serve traffic against a half-set-up database.

## How the web server gets composed

The web server is built layer by layer. In rough order:

- Set up trust-proxy and a rate limiter on the API.
- Turn on response compression for non-image content.
- Turn on standard security headers, with the content-security policy permissive enough to let the various tile services work.
- Register a templating engine for the few server-rendered pages (the login page, the error page, the HTML shell that delivers the SPA).
- Wire up sessions (more on this below).
- An optional single-sign-on adapter that reads identity from upstream proxy headers (off by default).
- Body parsing (for incoming JSON), cookie parsing, cross-origin permissions.
- Documentation pages for the API.

The order matters in a few places, the most important being: **sessions get wired up before some of the other middleware**, because that middleware reads from the session. If you swap the order, the user looks logged-out to anything that runs before sessions.

## Sessions in detail

Sessions are stored in Postgres, not in memory. That's important — it means:

- Restarting the server doesn't log everyone out.
- If you scale to multiple server instances, they share session state for free.

The cookie name and lifetime are configurable. The session secret comes from an environment variable (with a default that you really shouldn't ship to production).

## How feature modules get loaded

The whole web-server build is wrapped inside a callback from the feature-loader. The loader:

1. Scans the standard backend features folder for direct child directories, skipping hidden/underscore-prefixed ones.
2. Scans the project root for any folders with names matching the "plugin backend" patterns and loads them too.
3. Sorts the resulting list by each module's declared priority.
4. Calls each feature's startup hook in three phases:
   - **After-database-sync**: once the database models are registered.
   - **Initialize**: before the server starts listening — this is when each feature plugs its routes into the server.
   - **Started**: after the server is listening — for anything that needs to happen post-startup.

Each feature gets handed the shared toolkit (the server reference, the path prefix, the login guards, the permissions table, header-injection-protection middleware, content-type helpers).

## The login guards

The toolkit includes four reusable guard functions that features can wedge in front of any of their routes:

- **Ensure user**: redirects unauthenticated requests to the login page, or validates a bearer token if one is sent on the request.
- **Ensure admin**: gates write operations to admin users, with a hard-coded allowlist of read-only endpoints that pass through.
- **Ensure group**: only meaningful when the optional single-sign-on mode is active — checks group membership against the upstream identity provider. Otherwise a no-op.
- **Stop guests**: rejects the "guest" pseudo-user except on a small allowlist of endpoints.

A feature module's startup hook is responsible for composing the right guards in front of its routes — the more sensitive the feature, the more guards.

## The WebSocket

The server doesn't open a separate port for the WebSocket. Instead, it grabs the existing HTTP server's "upgrade" event — the moment when a browser asks to switch from a normal HTTP connection to a WebSocket — and handles it inline. That means the WebSocket inherits the same hostname, the same TLS certificate, and the same firewall posture as the rest of the server. Conceptually simpler, fewer ports to think about.

The default behavior is dumb broadcast: every message a client sends gets re-sent to every other connected client. The drawing tool uses this to push edits in real time; clients filter for what they care about.

## What this means for a static refactor

All of this evaporates in a static deployment. There's no Node process, no database, no session store, no WebSocket. The mental model shifts from "request comes in, server figures it out" to "everything got computed at build time."

The interesting wrinkle is the **startup-time data shape**. Right now, the frontend trusts the server to give it the mission configuration and a list of available missions at boot. In a static build, those have to be baked into a JSON file that ships alongside the bundle.
