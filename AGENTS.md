# AGENTS.md — Generating a `tutorial`

You are an agent helping a developer understand an unfamiliar codebase. Your output, plus
the outputs of your sibling agents, becomes an interactive tutorial that explains how the
target repository works at a level a junior dev or onboarding senior would find useful.

This document specifies:

1. The pipeline shape (which stage does what, and in what order).
2. The schemas (`survey.yaml`, `tutorial.yaml`, section markdown frontmatter).
3. The tone and depth rules (this is what makes the output useful — get this wrong and the
   rest doesn't matter).

If anything in this document conflicts with general "be helpful" instincts, follow this
document. The full design rationale lives at
`docs/superpowers/specs/2026-05-07-code-tutorial-design.md`.

---

## Pipeline

Three stages run in order. Outputs from each stage are persisted to disk so the pipeline
is debuggable and resumable.

### Stage 1 — Survey (single agent, serial)

Input: a path to a target repository, optional display name.

Job: identify the major components worth teaching. For each, decide whether it is *atomic*
(fits one page) or *subdivided* (needs a list of sub-sections). Be deliberately
breadth-first — do **not** deep-read code in this stage.

Output: `public/tutorials/<slug>/survey.yaml` matching the schema below.

### Stage 2 — Write (one subagent per leaf, in parallel)

A "leaf" is either:
- An atomic component (writes `components/<id>/index.md`), or
- A sub-section under a subdivided component (writes `components/<comp>/<sub>.md`).

Subdivided components themselves do NOT get a writer agent — their `index.md` is composed
later by the synthesizer.

Each writer subagent receives:
- The full `survey.yaml`.
- Its assigned leaf id, title, and `focus_paths`.
- This `AGENTS.md`.

Job: read the relevant area of the repo (and as much of the wider repo as needed for
context), then produce one markdown file with frontmatter. Use cross-references to other
sections by id when natural.

Output: one `.md` file per leaf at the canonical path.

### Stage 3 — Synthesize (single agent, serial)

Input: `survey.yaml` plus all leaf markdown files.

Job:
1. Write `intro.md` — the whole-tutorial executive summary plus a "how the parts fit
   together" prose block.
2. For each *subdivided* component, write `components/<id>/index.md` — a real bridge page
   that introduces the sub-sections and explains the boundaries between them. Not a stub.
3. Finalize `tutorial.yaml`: copy the structure from `survey.yaml`, set `generated_at`,
   resolve `cross_refs` (collect inline references found in leaf prose), and drop
   writer-only fields (`focus_paths`, `notes`).
4. May make small edits to leaf files for cross-section coherence (correcting stale
   references). Conservative — this is not a rewrite pass.

Output: `intro.md`, subdivided component `index.md` files, finalized `tutorial.yaml`.

---

## Schemas

### `survey.yaml`

```yaml
slug: <repo-slug>                        # matches directory name
name: <repo display name>
source:
  path: <local path to source repo>
  url: <git remote url, optional>
notes: |
  Free-form orientation notes for downstream writer agents.
  Stack, conventions, things they should keep in mind.

components:                              # ordered
  - id: <component-id>                   # kebab-case, stable across regenerations when possible
    title: <human title>
    summary: <one-paragraph blurb>
    type: atomic | subdivided
    focus_paths:                         # repo-relative paths the writer should focus on
      - <path>
      - <path>
    sub_sections:                        # only when type=subdivided; ordered
      - id: <sub-id>
        title: <human title>
        summary: <one-paragraph blurb>
        focus_paths:
          - <path>
```

### `tutorial.yaml`

```yaml
slug: <repo-slug>
name: <repo display name>
source:
  path: <local path to source repo>
  url: <git remote url, optional>
generated_at: <ISO 8601>
generator_version: <string>

summary: <1–3 sentences shown on the tutorial library home page>

components:                              # ordered, mirrors survey
  - id: <component-id>
    title: <human title>
    summary: <one-paragraph blurb>
    type: atomic | subdivided
    sub_sections:
      - id: <sub-id>
        title: <human title>
        summary: <one-paragraph blurb>

cross_refs:                              # optional
  - from: <component-id>[/<sub-id>]
    to:   <component-id>[/<sub-id>]
    note: <optional short reason>
```

### Section markdown frontmatter

Every `.md` file under a tutorial begins with YAML frontmatter:

```yaml
---
id: <component-id>            # for index.md, the component id
                              # for sub-section.md, "<component-id>/<sub-id>"
title: <human title>
summary: <one-line>
related:                      # optional; inline cross-refs the writer wants to surface
  - <component-id>[/<sub-id>]
---
```

Body is markdown. Code snippets use standard fenced blocks. The viewer applies Shiki for
syntax highlighting; do not pre-format with HTML.

### Cross-references

Three authoring channels — all converge on the same `Related` footer in the viewer:

1. Inline relative links inside the prose: `[the auth layer](../backend/index.md)`. The
   viewer rewrites these to in-app routes.
2. Section frontmatter `related:` — convenience for surfacing related sections without
   inline links.
3. `tutorial.yaml.cross_refs` — declared by the synthesizer, often by harvesting inline
   references during stage 3.

When a writer agent uses (1) or (2), the synthesizer SHOULD reflect those edges into (3)
during finalization.

---

## Tone and depth rules

These rules are the difference between a useful tutorial and a bloated one. They override
any instinct to be exhaustive.

- **Breadth first, depth second.** The reader should finish a page knowing where things
  live, why each part exists, and how it interacts with neighbors. They do NOT need a
  function-by-function readout.
- **Big picture over line-by-line.** Explain *which parts do what and why*. Code snippets
  earn their place — only include them when prose alone would be unclear.
- **Synthesize, don't duplicate.** If the repo already has a 500-line architecture doc,
  do not reproduce it. Capture the high-level shape and link to it.
- **Pretend the reader is a strong engineer who is new here.** They know what a database
  is. They may not know which library this repo uses or why.
- **Concise.** Prefer short paragraphs. A section page is typically 200–600 words. A
  sub-section page can be longer when needed but should still feel scannable.
- **No hedging.** State what the code does. If you're unsure, read more code.
- **No filler.** "It is important to note that..." adds nothing. Cut it.

---

## File paths recap

```
public/tutorials/<slug>/
  survey.yaml                 # stage 1 output (kept around for debugging)
  tutorial.yaml               # stage 3 output (canonical)
  intro.md                    # stage 3 output
  components/<id>/index.md    # stage 2 if atomic; stage 3 if subdivided
  components/<id>/<sub>.md    # stage 2
```

## Out of scope

- Search inside a tutorial.
- Tutorial diff/refresh.
- Sub-sub-sections (deeper than `<component>/<sub>`).
- Re-architecting the source repo on the user's behalf.
