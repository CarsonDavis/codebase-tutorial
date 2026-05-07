---
id: intro
title: Code Explainer
summary: A side-by-side viewer for code reviews where the explanation lives next to the diff.
---

# Code Explainer

A side-by-side viewer for code reviews where the explanation lives next to the diff. A coding agent reads a repository plus a git diff and produces a `review.json`; this Next.js app renders that JSON as a three-column UI: file tree on the left, full-file diffs in the middle, and explanation cards anchored to specific line ranges on the right.

The project is intentionally split into a "smart half" and a "viewing half." The agent does the substantive work — synthesizing what each change does and why. The viewer is a generic renderer: point it at any conforming `review.json` and it works. The README is explicit that the agent is the smart part.

## How the parts fit together

There are two halves, and they meet at one file: `review.json`.

The [agent contract](./components/agent-contract/index.md) defines what that file looks like and what tone the explanations should take. The agent runs externally (any coding agent that can read the repo and write JSON), reads the diff, builds a mental model of the codebase, and emits the file. From the viewer's perspective, the agent is upstream and out of sight.

The [viewer](./components/viewer/index.md) is a static Next.js site. It discovers `review.json` files in `public/reviews/`, generates a static page per slug, and renders the three-column UI. Internally the viewer is four cooperating pieces: [routing and shell](./components/viewer/routing-and-shell.md) wires the top-level pages and the file-tree sidebar; [diff rendering](./components/viewer/diff-rendering.md) computes and draws the side-by-side diff with intra-line word highlighting and context truncation; [explanation cards](./components/viewer/explanation-cards.md) anchor the agent's prose to line ranges in the diff; and [syntax highlighting and settings](./components/viewer/highlighting-and-settings.md) lazy-loads Shiki grammars and exposes user-tunable controls.

[Infrastructure](./components/infrastructure/index.md) (an optional CDK stack) and [CI/CD](./components/ci-cd/index.md) (a deploy workflow) exist for the public demo at `code-explainer.codebycarson.com`. Local-first usage doesn't touch them.
