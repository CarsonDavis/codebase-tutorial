---
id: backend-api
title: Backend (the server)
summary: One Node.js process that hosts the browser apps, exposes the data API, handles login, and pushes live admin-sync notifications. The piece that disappears in a static deployment.
key_idea: The backend is a single Express server (a popular Node.js framework for building web servers) that gets composed at startup out of many small, similarly-shaped "feature modules." Every feature follows the same folder shape and gets handed the same toolkit of utilities.
seams_touched:
  - browser-backend
  - backend-postgres
next:
  - backend-api/server-bootstrap
---

The backend is a single Node.js server. It's responsible for:

- Serving the main browser app as static files.
- Serving the admin browser app (also as static files, also from the same server, just at a different URL).
- Exposing an HTTP API under `/api/...` for everything data-related.
- Holding sessions and validating logins.
- Pushing live notifications over a WebSocket when an admin saves a mission-config change, so other admins viewing that mission see the update without a page refresh.
- Forwarding certain requests through to optional Python services.

The single most useful shape to hold in your head: **every backend feature has the same folder shape, and they all get plugged in the same way at startup.**

A "feature" is something like "drawing," "datasets," "configuration," "user accounts," "short link generator." Each one is its own folder containing the data model, the URLs that feature exposes, and a startup hook. At boot time, the server scans the folder of features, calls each feature's startup hook in turn, and hands each one a shared toolkit (a reference to the server, the database connection, the login guards, and so on). Each feature uses that toolkit to plug its URLs into the right places.

This uniformity is what makes the backend extensible without a heavy framework: a plugin author drops a folder with the right shape and a magic-suffix name into the right place, and the same loader picks it up.

## Three sub-topics

This component is split into three pages because the backend has three distinct conceptual layers:

- **How the server boots** — the order of operations at startup, what has to be true before the server starts answering requests, and how the feature modules get loaded.
- **The feature modules** — a tour of the actual built-in features (datasets, drawing, configuration, the link shortener, etc.), what each one does, and what shape they all share.
- **Logins, sessions, and tokens** — how humans sign in, how the very first user becomes the super-admin, how scripts authenticate with bearer tokens.

Reading order: bootstrap → feature modules → auth.

## What this means for a static refactor

Everything in this component goes away in a static deployment. The whole server, the database, all the feature modules, all the auth machinery, the WebSocket — gone. The frontend stops talking to any of it.

The interesting question is what data the frontend currently *needs* from the server, and what has to be baked into static files at build time to replace those calls. The feature modules page goes into this — each module is a candidate for either deletion or replacement.
