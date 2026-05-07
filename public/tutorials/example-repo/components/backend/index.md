---
id: backend
title: Backend
summary: Node/Express API server with a Postgres data layer.
related:
  - iac
  - frontend/state-management
---

# Backend

A Node service exposing a small JSON API. There are two layers worth knowing about: the
HTTP layer (route handlers, validation, error mapping) and the data layer (a thin wrapper
around Postgres for the project's main entities).

## Why these boundaries

The HTTP layer is intentionally dumb. It validates input, calls the data layer, and
serializes the result. Business rules live in the data layer where they have direct access
to the database transactions they often need.
