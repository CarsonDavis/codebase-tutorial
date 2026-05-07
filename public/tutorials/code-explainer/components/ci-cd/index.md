---
id: ci-cd
title: CI/CD
summary: GitHub Actions workflow that builds the static export and deploys it via CDK.
related:
  - infrastructure
---

## Overview

The workflow at `.github/workflows/deploy.yml` automates the full build-and-deploy cycle for the public demo site. It triggers on every push to `main` and can also be kicked off manually via `workflow_dispatch`.

## Authentication

Rather than storing long-lived AWS credentials as secrets, the workflow uses OIDC. It requests a short-lived token from GitHub and assumes an IAM role (`secrets.AWS_ROLE_ARN`) via `aws-actions/configure-aws-credentials`. The CDK stack itself provisions the OIDC trust relationship, so the role ARN is the only credential that needs to be stored. See [infrastructure](../infrastructure/index.md) for how that role is defined.

## Build phase

The build runs in three steps:

1. **Install Node deps** — `npm ci` for a clean, reproducible install.
2. **Bake examples** — copies `examples/*.json` into `public/reviews/` before the build runs, so the bundled review data is included in the static export.
3. **Next.js static export** — `npm run build` produces an `out/` directory of fully static HTML/CSS/JS. No server runtime is needed after this point.

## CDK deploy

With the app built, the workflow switches to Python. It installs CDK dependencies via `uv` (a fast Python package manager), then runs `npx cdk deploy` from the `cdk/` directory. Domain configuration comes from repository-level variables (`SITE_DOMAIN`, `SITE_SUBDOMAIN`) rather than being hardcoded, which keeps the workflow reusable. The deploy writes stack outputs — the S3 bucket name and CloudFront distribution ID — to `outputs.json` for the next step.

## Sync and invalidation

After CDK confirms the infrastructure is in place, two final steps push the built site live:

- `aws s3 sync out/ s3://<bucket>/ --delete` uploads the static export and removes any stale files.
- `aws cloudfront create-invalidation --paths "/*"` flushes the CDN cache so visitors see the new version immediately.

## Relationship to local-first usage

The workflow exists to keep the public demo fresh; it is not required for local use. You can run `npm run build` and serve `out/` from anywhere without touching GitHub Actions or AWS. The CI/CD layer only matters if you are operating the hosted version of the site.
