# Code Tutorial — Design Spec

**Date:** 2026-05-07
**Status:** Approved design, pending plan.

## 1. Purpose

Build a two-part system that takes any code repository as input and produces an interactive web tutorial that teaches a developer how that codebase works.

1. **Agent pipeline** — analyzes the target repo and writes structured tutorial files.
2. **Frontend** — a generic web viewer that loads those files and renders the tutorial.

The learner is a generally fluent engineer (junior dev or onboarding senior) who is new to *this specific* codebase. Success = they can reason intelligently about the repo: where things live, why each major part exists, and how the parts interact. They do not need a function-by-function readout.

Tutorial philosophy: **breadth-first, depth second.** Big picture over line-by-line. Code snippets are sparse and earn their place. Existing thorough docs (e.g., a 500-line architecture markdown) are *synthesized*, not duplicated.

See `vision.md` in the repo root for the longer-form pitch.

## 2. Information architecture

Three levels:

- **Level 0 — Overview** (`intro.md`). One per tutorial. Executive summary of the repo + how the major parts fit together + index of components.
- **Level 1 — Component** (one per major area, e.g., backend, frontend, IaC, CI/CD, database).
  - **Atomic component:** a single page that fully explains the area.
  - **Subdivided component:** a bridge/index page plus N sub-section pages.
- **Level 2 — Sub-section** (only under subdivided components). Used when an area is too large to explain in one page (e.g., a frontend with routing, state management, design system, data layer).

Components and sub-sections are **sections** generically. A leaf section is one that holds prose: an atomic component or a sub-section. Subdivided components are navigational containers whose page is composed by the synthesizer.

## 3. On-disk data layout

Generated tutorials live in this repo, under `public/tutorials/<repo-slug>/`:

```
public/tutorials/<repo-slug>/
  tutorial.yaml                 # structured spine: metadata, component tree, cross-refs
  intro.md                      # Level 0 exec summary (synthesizer-written)
  components/
    <component-id>/
      index.md                  # Level 1 page (writer-written if atomic, synthesizer-written if subdivided)
      <sub-id>.md               # Level 2 sub-section (writer-written), zero or more
```

Why "tutorials in this repo": keeps target repos clean; the user builds a personal library of tutorials browsable in one frontend; matches the local-first deploy-optional posture of `code-explainer`.

Why markdown for prose, YAML for structure: prose volume is the dominant token cost for the agent. Embedding hundreds of words of prose as JSON-escaped strings is painful for both the agent and the human reading the output. YAML frontmatter on markdown files is the idiomatic content-collection shape.

### 3.1 `tutorial.yaml` schema

```yaml
slug: <repo-slug>                        # matches directory name
name: <repo display name>
source:
  path: <local path to source repo, if known>
  url: <git remote url, optional>
generated_at: <ISO 8601>
generator_version: <string>              # so we can detect stale tutorials later

summary: <1–3 sentence pitch shown on />

components:                              # ordered
  - id: <component-id>
    title: <human title>
    summary: <one-paragraph blurb shown on indexes>
    type: atomic | subdivided
    sub_sections:                        # only when type=subdivided; ordered
      - id: <sub-id>
        title: <human title>
        summary: <one-paragraph blurb>

cross_refs:                              # optional, list of edges
  - from: <component-id>[/<sub-id>]
    to:   <component-id>[/<sub-id>]
    note: <optional short reason>
```

### 3.2 Markdown frontmatter

Each `*.md` file under a tutorial:

```yaml
---
id: <component-id>            # for index.md, the component id
                              # for sub-section.md, "<component-id>/<sub-id>"
title: <human title>
summary: <one-line>
related:                      # optional; cross-refs included inline by the renderer
  - <component-id>[/<sub-id>]
---
```

Body is markdown. Code snippets use standard fenced blocks (the renderer applies Shiki).

### 3.3 Cross-references

Authored two ways:
- Inline within a body, as standard relative links: `[the auth layer](../backend/auth.md)`. The renderer rewrites these to in-app routes.
- Declared in `tutorial.yaml.cross_refs`, used to render a "Related" footer on each page and (optionally) draw a graph view later.

Cross-references inside section markdown frontmatter (`related:`) are also rendered as a footer; they're convenience for the writer agent.

## 4. Frontend

### 4.1 Stack

Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4 + Shiki. Static export viable. Dark mode first; light mode deferred. This matches `code-explainer`'s proven stack with no need to deviate.

### 4.2 Routes

- `/` — list of tutorials (one card per directory under `public/tutorials/`). Reads each tutorial's `tutorial.yaml` at build time. Card shows title, summary, generated date.
- `/t/<slug>/` — tutorial overview. Renders `intro.md` plus a structured index of components from `tutorial.yaml`.
- `/t/<slug>/<component>/` — component page. Renders `components/<component>/index.md`. If subdivided, the page also lists sub-sections (title + summary) below the prose.
- `/t/<slug>/<component>/<sub>/` — sub-section page. Renders `components/<component>/<sub>.md`.
- 404 fallback for unknown slugs/components/sub-sections.

All pages SSG via `generateStaticParams` reading the on-disk tree.

### 4.3 Layout

Three-region shell on tutorial pages:

- **Left nav (persistent):** the tutorial's component tree. Subdivided components are expandable. Current location highlighted. Always shows the "back to tutorials" link at the top.
- **Main column:** rendered markdown body, centered, comfortable measure.
- **Right column (optional):** in-page table of contents auto-built from the markdown headings; collapses on narrow viewports.

A "Related" footer block on each section page lists cross-references with their summaries.

### 4.4 Library at root

`/` is a card grid: one tutorial per card, sorted by `generated_at` descending by default. Filter/search deferred until we have multiple tutorials in hand.

## 5. Agent pipeline

Three serial stages: **Survey → Write (parallel) → Synthesize.** All stages write to disk so the pipeline is debuggable and resumable.

### 5.1 Stage 1 — Survey (serial, single agent)

**Input:** path to the target repo, optional repo display name.

**Behavior:**
- Reads top-level README, package manifests (`package.json`, `pyproject.toml`, etc.), CI config files, and walks the directory structure to depth 2–3.
- Identifies the major components worth teaching.
- For each component, decides `atomic` or `subdivided`. If subdivided, lists sub-section ids with one-line briefs.
- Cheap and fast: this is the only stage with whole-repo view, but it should not deep-read code.

**Output:** `public/tutorials/<repo-slug>/survey.yaml` matching the structure of `tutorial.yaml.components` plus a few notes-to-self fields the writer agents will read.

```yaml
slug: <repo-slug>
name: <repo display name>
source: { path: ..., url: ... }
notes: |
  Free-form orientation notes for downstream agents — stack, conventions,
  things they should keep in mind when writing their assigned section.
components:
  - id: backend
    title: Backend
    summary: ...
    type: atomic
    focus_paths: [src/server, src/api]      # hints for the writer
  - id: frontend
    title: Frontend
    summary: ...
    type: subdivided
    focus_paths: [web]
    sub_sections:
      - id: routing
        title: Routing
        summary: ...
        focus_paths: [web/src/routes]
      - id: state-management
        ...
```

### 5.2 Stage 2 — Write (parallel, one agent per leaf)

**Leaf** = an atomic component, or a sub-section under a subdivided component.

**One subagent per leaf**, dispatched in parallel via Claude Code's `Task` tool. Each subagent receives:
- The full `survey.yaml` (so it knows the wider repo shape).
- A focused brief identifying its leaf id, title, and `focus_paths`.
- Tone and depth rules from `AGENTS.md`.

**Behavior:** the agent reads its area of the repo (and as much of the rest as it needs for context), then writes its assigned `.md` file with frontmatter and prose. It is allowed and encouraged to add cross-references to other sections (using ids from `survey.yaml`) when natural. Code snippets are sparse — only when they earn their place.

**Output:** one `.md` file per leaf at the canonical path.

### 5.3 Stage 3 — Synthesize (serial, single agent)

**Behavior:**
- Reads `survey.yaml` and every leaf `.md`.
- Writes `intro.md`: the whole-tutorial exec summary plus a "how the parts fit together" prose block.
- For each *subdivided* component, writes `components/<component>/index.md`: a real bridge page that introduces the sub-sections and explains the boundaries between them. Not a stub.
- Finalizes `tutorial.yaml`: copies the structure from `survey.yaml`, sets `generated_at`, resolves `cross_refs` (collecting any inline references found in the leaf prose for the graph), and drops the writer-only fields (`focus_paths`, `notes`).
- May make small edits to leaf files for cross-section coherence (e.g., correcting a stale reference). Edits are conservative; this is not a rewrite pass.

**Output:** `intro.md`, subdivided component `index.md` files, finalized `tutorial.yaml`.

### 5.4 `AGENTS.md` (the agent contract)

Sibling project pattern: a single `AGENTS.md` at the repo root captures the workflow, schemas, and tone/depth rules. The orchestrator and each stage's agent reads it. Keeps a single source of truth.

### 5.5 Orchestrator

A thin driver — likely a slash command and/or an `agents/` directory of agent markdown files — that runs the three stages in sequence and dispatches the parallel writers. Exact mechanism is a planning-stage decision; the contract is fixed by this spec.

## 6. Repo layout (this repo)

```
.
  AGENTS.md                     # the agent contract
  vision.md                     # vision/pitch
  README.md                     # how to run the tool locally
  package.json                  # Next.js app
  next.config.ts
  tsconfig.json
  postcss.config.mjs
  app/                          # Next.js App Router
    page.tsx                    # / — tutorial library
    t/[slug]/page.tsx           # tutorial overview
    t/[slug]/[component]/page.tsx
    t/[slug]/[component]/[sub]/page.tsx
    components/                 # shared React components
    layout.tsx
    globals.css
  lib/                          # tutorial loader, markdown parser, types
    tutorials.ts                # discovery + reading from public/tutorials/
    types.ts                    # TS types matching the YAML/frontmatter schemas
    markdown.ts                 # markdown → React (Shiki, link rewriting)
  public/
    tutorials/                  # generated tutorials live here, one dir per repo
  agents/                       # agent markdown files driving the pipeline (TBD in plan stage)
  examples/                     # bundled example tutorial(s) for testing the viewer
  docs/superpowers/specs/       # design specs (this file)
```

## 7. Out of scope for V1

- Search inside a tutorial.
- Light mode.
- Tutorial diff/refresh (re-running the agent and showing what changed).
- Tutorial graph visualization (the `cross_refs` data is captured for future use).
- Hosted deploy story (CDK + GitHub Actions). Local-first only for V1.
- Authoring UI for editing generated content.
- Sub-sub-sections (depth > 3).

## 8. Explicit non-decisions deferred to planning

- Exact orchestrator mechanism (slash command vs script vs agent markdown files).
- Markdown rendering library choice (likely `react-markdown` + `rehype-shiki`, but candidates compared in the plan).
- Whether to ship one or zero example tutorials in V1.

## 9. Open risks

- **Survey agent quality determines everything downstream.** A bad component decomposition produces a bad tutorial. The plan should include a way to inspect/edit `survey.yaml` before stage 2 fires.
- **Parallel writer count is unbounded.** A massive repo with many sub-sections could spawn 30+ subagents. Probably fine, but we should be aware.
- **Cross-reference correctness.** Writers reference ids they expect to exist. If the synthesizer changes ids, links break. Mitigation: ids are frozen at survey time; writers and synthesizer treat them as canonical.
