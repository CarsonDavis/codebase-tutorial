---
id: intro
title: Example Repo
summary: Reference fixture for the Code Tutorial viewer.
---

# Example Repo — overview

This is a hand-written tutorial used during development of the viewer. It demonstrates all
three levels of the information architecture: the overview page (this one), atomic
components (Backend, Infrastructure), and a subdivided component (Frontend, with two
sub-sections).

## How the parts fit together

The frontend talks to the backend over HTTP. The backend persists to Postgres. The
infrastructure layer provisions everything in AWS. None of the frontend code knows about
infrastructure, and none of the infrastructure code knows about React.
