---
id: infrastructure
title: Infrastructure
summary: Optional AWS CDK Python stack for hosting the static export. Example deploy code, not required for local use.
related:
  - ci-cd
---

## What this is — and what it isn't

The infrastructure code lives in `cdk/` and is an example of how to host the Next.js static export on AWS. Local-first usage — running `next dev` or opening a locally-served build — requires none of this. The stack exists so the public demo site stays live after pushes to `main`, coordinated by the [CI/CD](../ci-cd/index.md) workflow.

If you are forking this project to run privately, you can ignore the `cdk/` directory entirely.

## What the stack provisions

`cdk/stacks/code_explainer_stack.py` defines a single CDK stack (`CodeExplainerStack`) that provisions five logical groups of resources:

- **S3 bucket** — private, access controlled via Origin Access Control (OAC). Public access is fully blocked; only CloudFront can read it.
- **ACM certificate** — DNS-validated TLS cert issued in `us-east-1` (required for CloudFront). CloudFront validates via the Route 53 hosted zone you already own.
- **CloudFront distribution** — serves the static files with HTTPS redirect, Gzip/Brotli compression, and the `SECURITY_HEADERS` response policy. Because the Next.js build uses `trailingSlash: true`, every route emits a real `index.html` file, so no edge rewrite function is needed. 403 and 404 responses are both redirected to `/index.html` so client-side routing works on direct URL loads.
- **Route 53 alias** — points the subdomain (default: `code-explainer.<your-domain>`) at the CloudFront distribution.
- **GitHub Actions IAM role** — scoped to a specific GitHub org and repo via OIDC federation. The role can read/write/delete the S3 bucket and create CloudFront invalidations. CDK deploys work through the standard bootstrap roles (`sts:AssumeRole` on the three CDK bootstrap roles), so the CI principal needs no broad IAM permissions.

## Entry point: app.py

`cdk/app.py` is the CDK entry point. It reads five environment variables — `CDK_DEFAULT_ACCOUNT`, `SITE_DOMAIN`, `SITE_SUBDOMAIN`, `SITE_GITHUB_ORG`, and `SITE_GITHUB_REPO` — and passes them into the stack constructor. Nothing domain-specific is hardcoded in the stack file itself; the stack is generic and reusable by anyone who sets the right variables.

The app is invoked with `uv run python app.py` (see `cdk/cdk.json`), so `uv` handles the Python environment rather than a manually managed virtualenv.

## Dependencies

`cdk/requirements.txt` pins two packages:

```
aws-cdk-lib>=2.170.0
constructs>=10.0.0,<11.0.0
```

CDK v2 ships all AWS construct libraries in the single `aws-cdk-lib` package, so there is no long list of per-service dependencies.

## Reading the stack

The stack class follows the standard CDK v2 pattern: one `__init__` method that creates resources in dependency order. The sections are clearly delimited by inline comments (`── S3 bucket ──`, `── CloudFront distribution ──`, etc.), making it easy to locate any particular resource. `CfnOutput` values at the bottom — bucket name, distribution ID, site URL, and deploy role ARN — are what the [CI/CD](../ci-cd/index.md) workflow reads after a `cdk deploy`.
