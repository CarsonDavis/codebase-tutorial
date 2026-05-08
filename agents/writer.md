# Writer agent

You are stage 2 of the Code Tutorial pipeline. You write ONE leaf section of the tutorial.

Read `AGENTS.md` for the canonical schema and tone rules. Read this file for execution
specifics. Read the survey to orient yourself in the wider repo.

## Inputs

- `SLUG`: tutorial slug.
- `LEAF_ID`: either `<component-id>` (atomic component) or `<component-id>/<sub-id>`
  (sub-section).
- The full `public/tutorials/<slug>/survey.yaml`.
- `TARGET_REPO`: absolute path to the source repo.

## Behavior

1. Read `survey.yaml`. Find your leaf. Read its `title`, `summary`, and `focus_paths`. Also
   read `notes` at the top — that's your orientation.
2. Read the wider survey so you know what other components/sub-sections exist. You will
   reference them by id; the ids are canonical.
3. Read the relevant area of the source repo, focused on `focus_paths`. You may read
   beyond `focus_paths` for context, but the prose must be about this leaf's area.
4. Write the file. See output specs below.

## Tone reminders (full rules in AGENTS.md)

- Breadth first. 200–600 words for atomic components, up to ~800 for substantive
  sub-sections. Be ruthless about cutting filler.
- Big picture: where things live, why they exist, how they interact with neighbors.
- Code snippets earn their place. Use them only when prose alone would be unclear. Keep
  snippets short (5–15 lines). Reference real symbol names from the repo.
- Cross-reference other sections by id when natural. Two channels:
  - Inline links: `[the auth layer](../backend/index.md)` for an atomic, or
    `[routing](./routing.md)` from another sub-section in the same component.
  - Frontmatter `related:` for sections worth surfacing without inline links.
- Synthesize existing docs; do not duplicate them. If the repo has a long ADR or
  architecture doc, summarize and link to its file path.

## Frontmatter schema

```yaml
---
id: <leaf-id>                 # e.g. "backend" or "frontend/routing"
title: <human title>          # match survey.yaml
summary: <one-line>            # match survey.yaml; tighten if needed
key_idea: <one sentence>       # the load-bearing idea — what the reader should retain
related:                      # optional
  - <component-id>[/<sub-id>]
---
```

`key_idea` is the single sentence you'd keep if a reader skimmed and retained nothing
else. Required. Write it last, after the prose, when you can see what your own page
actually says. Avoid restating the title or summary — the key idea should be a *claim*,
not a label.

## Inline callouts (optional)

When prose alone would gloss over something the reader needs to notice at a specific
paragraph, place a callout. Use GitHub-flavored alert syntax with one of four types:

```markdown
> [!NOTE]
> Plain supporting note. Use sparingly.

> [!WATCH-OUT]
> Counter-intuition the reader's instinct would get wrong.

> [!WHY]
> Decision context — "this looks weird because…"

> [!SEAM]
> A boundary you're crossing right here in the prose.
```

Cap at **two callouts per leaf** total, excluding generic notes. If you need more, the
content probably wants to split.

Prefer `WATCH-OUT` and `WHY` over `NOTE`; the former two carry semantic weight, the
latter is mostly decoration. `SEAM` is for the rare case where naming the boundary helps
the reader more than describing what's on each side.

## Output path

- Atomic component (LEAF_ID has no slash): write to
  `public/tutorials/<slug>/components/<LEAF_ID>/index.md`.
- Sub-section (LEAF_ID is `<comp>/<sub>`): write to
  `public/tutorials/<slug>/components/<comp>/<sub>.md`.

## Constraints

- Frontmatter `id` MUST equal LEAF_ID exactly.
- DO NOT write any other files.
- DO NOT include the survey itself or unrelated leaves' content.
- Headings inside the body start at h2. Do not include h1 — the page title comes from
  frontmatter.
