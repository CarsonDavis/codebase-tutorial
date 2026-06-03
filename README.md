# Codebase Tutorial

Point an AI agent stack at any code repository and it generates an **interactive tutorial** that
teaches a developer how that codebase works — the major parts, why each exists, and how they
fit together. Not a function-by-function readout: a working mental model you can actually
reason from.

The system has two halves:

- **An agent pipeline** that reads the target repo and writes structured tutorial data
  (survey → parallel per-section deep dives → synthesis).
- **A web app** that loads that data and renders a navigable, dark-mode tutorial with an
  executive summary, drill-in section pages, cross-references, a glossary, and a quiz.

Re-run the agent on a different repo and the same frontend renders a tutorial for that repo.

## How the agent stack works

The pipeline is five stages, each a small focused agent (defined in [`agents/`](./agents/),
orchestrated by [`/build-tutorial`](./.claude/commands/build-tutorial.md), with the shared
contract in [`AGENTS.md`](./AGENTS.md)). Outputs are persisted to disk between stages, so the
run is debuggable and resumable.

1. **Survey** (`survey.md`, serial) — one pass over the repo to identify the major components
   worth teaching and how to split them, writing the structural spine to `survey.yaml`.
2. **Write** (`writer.md`, parallel) — one subagent per section, each deep-reading its
   assigned area and producing a single markdown page. Running in parallel keeps it fast.
3. **Synthesize** (`synthesizer.md`, serial) — stitches the pages into a unified tutorial:
   the top-level overview, bridge pages for multi-part components, and the canonical
   `tutorial.yaml`.
4. **Augment** (`augment.md`, optional) — additive cross-cutting reference pages (glossary,
   cast of characters, key decisions, system seams) without rewriting any section prose.
5. **Quiz** (`quizzer.md`, optional) — writes a 12-question multiple-choice quiz testing
   big-picture understanding.

Stages 1–3 produce a complete tutorial; 4 and 5 are independent polish passes you can re-run
on their own.

## See it in action

Live examples at **[codebase-tutorial.codebycarson.com](https://codebase-tutorial.codebycarson.com/)**:

- **[MMGIS](https://codebase-tutorial.codebycarson.com/t/mmgis)** — a real tutorial for
  [NASA-AMMOS/MMGIS](https://github.com/NASA-AMMOS/MMGIS), a polyglot web GIS monorepo
  (Postgres/PostGIS backend, React + jQuery mapping frontend, admin SPA, Python tile
  services, GDAL data-prep scripts).
- **[MMGIS (Plain English)](https://codebase-tutorial.codebycarson.com/t/mmgis-plain)** — the
  same codebase explained concept-first, with no code samples or file paths. Good for seeing
  the range of tutorial styles the pipeline can produce.

## Run locally

```bash
npm install
npm run dev
```

Then open <http://localhost:3006>. Generated tutorials live under `public/tutorials/<slug>/`
and are picked up automatically.

## Generate a tutorial

The agent pipeline is driven by the `/build-tutorial` command (see
[`.claude/commands/build-tutorial.md`](./.claude/commands/build-tutorial.md)). Point it at an
absolute path to a target repo and it writes the tutorial data into `public/tutorials/`.

## Learn more

- [`vision.md`](./vision.md) — the pitch and the philosophy behind the tutorials.
- [`AGENTS.md`](./AGENTS.md) — the pipeline contract: stages, data schemas, and the tone
  rules that make the output useful.
- [`docs/superpowers/specs/2026-05-07-code-tutorial-design.md`](./docs/superpowers/specs/2026-05-07-code-tutorial-design.md)
  — the full design.
