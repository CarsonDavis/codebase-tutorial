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

Four stages run in order. Outputs from each stage are persisted to disk so the pipeline
is debuggable and resumable. Stages 1–3 produce the structural tutorial; stage 4 is an
additive polish pass that supplements existing content with cross-cutting addenda pages
and frontmatter chrome. Stage 4 is optional — a tutorial without it still works.

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

### Stage 4 — Augment (single agent, serial, optional)

Input: everything stages 1–3 produced.

Job: write the four cross-cutting "addenda" pages (`aux/glossary.md`,
`aux/characters.md`, `aux/decisions.md`, `aux/seams.md`) and add chrome frontmatter
(`key_idea` if missing, `watch_out`, `seams_touched`, `prerequisites`, `next`) to every
existing leaf. **Frontmatter-only edits to existing leaves; no prose rewrites.**

Stage 4 may be re-run independently of stage 2, which is the point: polish iteration is
cheap, regenerating leaves is not.

Output: four files under `aux/`, frontmatter touches on existing `.md` files, and an
`aux:` block plus bumped `generator_version` in `tutorial.yaml`.

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

aux:                                     # stage 4 only; one entry per addenda page
  - id: glossary | characters | decisions | seams
    title: <human title>
    summary: <one-line>
```

### Section markdown frontmatter

Every `.md` file under a tutorial begins with YAML frontmatter:

```yaml
---
id: <component-id>            # for index.md, the component id
                              # for sub-section.md, "<component-id>/<sub-id>"
                              # for addenda pages, "aux/<name>"
title: <human title>
summary: <one-line>
key_idea: <one sentence>      # stage 2 writer authors; stage 4 may fill gaps
related:                      # optional; inline cross-refs the writer wants to surface
  - <component-id>[/<sub-id>]

# Stage 4 chrome (additive, frontmatter-only):
watch_out:                    # optional; ≤ 2 entries; counter-intuitions
  - <single sentence>
seams_touched:                # optional; seam ids matching aux/seams.md h2s
  - <kebab-case-seam-id>
prerequisites:                # optional; leaves to read first
  - <component-id>[/<sub-id>]
next:                         # optional; one suggested follow-up leaf id
  - <component-id>[/<sub-id>]
---
```

Body is markdown. Code snippets use standard fenced blocks. The viewer applies Shiki for
syntax highlighting; do not pre-format with HTML.

### Inline callouts

The writer (stage 2) may place inline callouts using GitHub-flavored alert syntax,
extended with four types. The renderer styles each with a distinct color.

```markdown
> [!NOTE]            (neutral — supporting info)
> [!WATCH-OUT]       (amber — counter-intuition; your instinct breaks here)
> [!WHY]             (violet — decision context; "looks weird because…")
> [!SEAM]            (teal — boundary you're crossing in this paragraph)
```

Cap at two callouts per leaf, excluding plain `NOTE`s. Stage 4 does not add inline
callouts — recurring counter-intuitions go in `watch_out` frontmatter instead.

### Addenda page format (stage 4)

Each addenda page lives at `aux/<name>.md` and uses h2 headings as entry keys. The
renderer parses h2 text + slug to build a directory of glossary terms / characters /
decisions / seams, and exposes the slugs as stable anchors for cross-references.

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
  tutorial.yaml               # stage 3 + stage 4 output (canonical)
  intro.md                    # stage 3 output (frontmatter touched by stage 4)
  components/<id>/index.md    # stage 2 if atomic; stage 3 if subdivided (frontmatter touched by stage 4)
  components/<id>/<sub>.md    # stage 2 (frontmatter touched by stage 4)
  aux/glossary.md             # stage 4
  aux/characters.md           # stage 4
  aux/decisions.md            # stage 4
  aux/seams.md                # stage 4
```

## Out of scope

- Search inside a tutorial.
- Tutorial diff/refresh.
- Sub-sub-sections (deeper than `<component>/<sub>`).
- Re-architecting the source repo on the user's behalf.
