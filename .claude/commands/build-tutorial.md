---
description: Generate a code tutorial for a target repository (3-stage pipeline).
---

You are the orchestrator for the Code Tutorial pipeline. Your job is to drive the three
stages — survey → parallel writers → synthesizer — and produce a complete tutorial under
`public/tutorials/<slug>/`.

## Inputs

Parse the user's invocation. They will provide:

- `TARGET_REPO` (required): absolute path to the source repo.
- `SLUG` (optional): kebab-case. Default to `path.basename(TARGET_REPO)`.
- `NAME` (optional): human display name.

If `TARGET_REPO` is missing, ask for it once and stop.

## Pipeline

### Stage 1 — Survey

Read `AGENTS.md` and `agents/survey.md`. Then act as the survey agent: produce
`public/tutorials/<SLUG>/survey.yaml`.

After writing, read it back and confirm:
- `components` is non-empty.
- Every component has `id`, `title`, `summary`, `type`.
- Every subdivided component has at least 2 `sub_sections`.

If any check fails, fix and re-write. Do NOT proceed to stage 2 with a malformed survey.

**Pause and show the survey to the user.** Ask: "Survey looks like this. Does the
component decomposition look right? (yes / edit / cancel)" — proceed only on yes.

### Stage 2 — Parallel writers

Compute the leaf list:
- For each component with `type == atomic`: leaf id = `<component.id>`.
- For each component with `type == subdivided`: one leaf per sub-section, leaf id =
  `<component.id>/<sub.id>`.

Dispatch ALL leaf writers in a single message using multiple `Task` tool calls in
parallel (one Task per leaf). For each leaf, the Task prompt must:
- Include the contents of `AGENTS.md` and `agents/writer.md`.
- Include the contents of `survey.yaml`.
- Specify `SLUG`, `LEAF_ID`, `TARGET_REPO`.
- Instruct the subagent to write only the one leaf file at the canonical path.

Set `subagent_type` to `general-purpose` (the writer agent contract is the prompt; no
custom subagent type is needed).

After all subagents return, verify each expected leaf file exists. If any are missing,
re-dispatch only the missing ones.

### Stage 3 — Synthesizer

Read `AGENTS.md` and `agents/synthesizer.md`. Then act as the synthesizer agent:

- Write `intro.md`.
- Write `components/<id>/index.md` for each subdivided component.
- Write `tutorial.yaml`.
- Make any small coherence-pass edits to leaves.

## Final report

Print a summary to the user:
- Tutorial slug.
- Number of components, of which N subdivided.
- Total number of leaf pages written.
- The viewer URL: `http://localhost:3006/t/<SLUG>/`.

Suggest: `npm run dev` (if not already running) and open the URL.

## Failure handling

If any stage fails, print the stage and the reason, leave whatever has been written on
disk for inspection, and stop. The user can re-run the command to retry — survey
re-runs are cheap; writers and synthesizer can re-run from the existing survey.
