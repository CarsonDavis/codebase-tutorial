---
id: frontend/routing
title: Routing
summary: How pages are organized and how navigation flows.
related:
  - frontend/state-management
---

# Routing

File-based routing. A file under `web/src/routes/` becomes a route at the matching URL.
There is one root layout that owns the chrome (header, sidebar) and a small set of
top-level routes for the main features.

## Navigation patterns

Programmatic navigation goes through a single `useNavigate()` hook. This is the only
sanctioned way to change route — direct `window.location` manipulation is not used.
