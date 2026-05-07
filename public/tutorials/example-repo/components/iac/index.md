---
id: iac
title: Infrastructure
summary: AWS CDK stacks for the API, database, and static hosting.
related:
  - backend
---

# Infrastructure

Three CDK stacks: an API stack (Fargate service for the backend), a data stack (RDS
Postgres), and a hosting stack (S3 + CloudFront for the frontend bundle). Each is
independently deployable.

## Why three stacks

Different change cadences. The hosting stack updates on every frontend deploy; the API
stack updates when the backend changes; the data stack barely ever changes. Splitting
them keeps blast radius low.
