---
id: viewer
title: Viewer
summary: The Next.js app that renders a review.json as a three-column UI.
---

# Viewer

The viewer is a static Next.js App Router site. It scans `public/reviews/*.json` at build time, generates a route per slug, and renders each review as a three-column UI: file tree on the left, full-file diffs in the middle, and explanation cards anchored to line ranges on the right. There is no server logic at runtime — the viewer is a pure renderer of whatever the [agent contract](../agent-contract/index.md) produced.

Four areas of the viewer are worth understanding separately, because they handle distinct problems and have different shapes of complexity.

## In this component

[Routing and shell](./routing-and-shell.md) covers the top-level page structure: the home page that lists reviews, the per-review SSG route, and the layout shell that owns the file-tree sidebar plus the per-file content stream. The shell is intentionally thin — it does layout and remount control, not content. Start here to understand how a request becomes a page.

[Diff rendering](./diff-rendering.md) is where most of the visual logic lives. It explains how `computeDiff` post-processes the `diff` library's output into structured `DiffRow`s, how `DiffViewer` draws the four-column grid with intra-line word highlights, and how unchanged context is truncated and lazily expanded. This is the densest sub-section.

[Explanation cards](./explanation-cards.md) covers the right column: how `FileSection` orchestrates a per-file overview plus a stack of cards, and crucially how `layoutCards` anchors each card to its corresponding line range so the prose visually tracks the diff. This is also where the schema from the agent contract surfaces directly into the UI.

[Syntax highlighting and settings](./highlighting-and-settings.md) covers Shiki integration (lazy grammar loading, tokenization), the customizable highlight palette, the settings menu, and the optional tour. These pieces are mostly orthogonal to the others — they touch every page but own their own state.

The boundaries are drawn around what changes together. Diff logic and word-diff intersection live next to each other. Card layout and per-card prose live together. Highlighting is its own concern because Shiki's lazy-loading shape leaks into every consumer if you let it.
