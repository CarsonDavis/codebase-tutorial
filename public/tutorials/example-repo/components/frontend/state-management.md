---
id: frontend/state-management
title: State management
summary: The global store, when to use it, and how it talks to the API.
related:
  - frontend/routing
  - backend
---

# State management

A small global store holds session-level state (the current user, feature flags, the
notification queue). Page-local state stays local — the store is for things that need to
survive route transitions.

## Talking to the API

The store doesn't fetch directly. A thin client module wraps each backend endpoint and
returns typed promises; the store calls those, then commits the result.
