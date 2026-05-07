---
id: agent-contract
title: Agent contract
summary: The contract for the coding agent that produces review.json — workflow, JSON schema, and tone rules.
related:
  - viewer/explanation-cards
  - viewer/diff-rendering
---

## What the agent is

Code Explainer is split into two halves: a web viewer that renders a review, and a coding agent that produces it. The agent is the smart part — the viewer just shows what the agent wrote. The full contract lives in `AGENTS.md` at the root of the Code Explainer repo; this page synthesizes it.

The agent's job is to read a pull request, understand the repository it belongs to, and emit a `review.json` file that the viewer renders as a three-column experience: file tree, diff, and anchored explanation cards.

## Workflow

The agent runs five steps in order.

**Identify the change.** Given a base branch and a head branch, the agent collects the list of changed files and captures the complete old and new content of each one. It does not compute the diff — the viewer handles that client-side from the raw contents.

**Build a mental model of the repo.** Before writing anything, the agent reads the README, dependency manifests, and directory structure, plus the neighbors of each changed file — callers and callees. The quality of every downstream explanation depends on this step.

**Build a mental model of the change.** The agent reads each file's diff carefully, grouping adjacent edits into logical changes. A single diff hunk often contains several distinct concerns; each logical concern becomes a separate explanation card.

**Write file overviews.** For each changed file the agent writes a `FileOverview` — a short introduction the reader sees before touching the diff.

**Emit `review.json`.** Written to `public/reviews/<slug>/review.json`. It must validate against the schema exactly or the viewer will fail to render.

## JSON schema

The schema is defined in `lib/types.ts`. Four interfaces compose the output.

**`ReviewData`** is the top-level object: a `metadata` block (repo name, branches, timestamp, optional PR title, 1–3 sentence `summary`) and a `files` array.

**`FileReview`** represents one changed file: `path`, `changeType` (`added | modified | deleted | renamed`), `language`, `overview`, `oldContent`, and `newContent`. Both content fields must be complete — no truncation, since the viewer diffs them client-side.

**`FileOverview`** introduces a file before the reader sees the diff. `purpose` is required (one or two sentences). Optional: `background` for context the reader might lack, and `keyPieces` for the most important symbols with one-line descriptions each.

**`ChangeExplanation`** anchors an explanation to a line range in the new (or, for deleted files, old) file. Every explanation has a `title` (3–7 words), a `what` field (plain-English summary), and a `why` field (motivation and context). The optional `impact` field flags non-obvious tradeoffs, edge cases, or things a reviewer would miss on a quick read.

The `files` array must be ordered for reading flow, not alphabetically — lead with whatever frames the change, place tests last.

## Tone rules

These rules are what make the output useful rather than noise.

Write for a competent engineer who can read code but may not be fluent in this file's language or framework. They need enough to decide "is this a good change?" — not a tutorial.

Prefer *why* over *what*. The diff shows what changed; the explanation earns its place by adding motivation and consequences the diff cannot convey. "This replaces the in-memory cache with Redis because the new workers run in separate processes" is useful. "This adds Redis" is not.

Match length to the size of the change. A one-line fix gets one sentence. A new module gets a paragraph. Use `impact` only when there is something a reviewer would genuinely miss.

Cut filler. Don't narrate the diff line-by-line. Don't praise or critique the code — the reviewer is the one forming an opinion.
