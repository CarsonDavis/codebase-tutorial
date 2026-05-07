---
id: viewer/explanation-cards
title: Explanation cards
summary: How per-file overviews and per-change cards are composed and anchored to line ranges.
related:
  - viewer/diff-rendering
  - viewer/routing-and-shell
  - agent-contract
---

## FileSection: the per-file orchestrator

Every file in a review is rendered by `FileSection`, a client component that owns all the state and layout logic for one `FileReview`. It holds a sticky collapsible header (file path, change-type badge, add/remove counts), and when expanded renders a two-column grid: the left column holds the file overview and diff, and the right column holds the explanation cards.

`FileSection` is the only place that wires the diff and the cards together. It maintains two parallel `ref` maps — `lineRefs` (new-file line number → diff DOM element) and `cardRefs` (startLine → card DOM element) — and uses those maps in `layoutCards` to position each card opposite the line it annotates.

## FileOverview: the file-level summary

Above the diff, `FileOverview` renders the `FileOverview` object from `lib/types.ts`. That type has three fields:

- `purpose` — always present; the agent's first-principles explanation of what the file is for.
- `background` — optional; concepts or dependencies a reader needs before the diff makes sense.
- `keyPieces` — optional list of `{ name, description }` pairs, rendered as an inline code name followed by a one-line description.

The component is a thin presentational wrapper: no state, no interactivity. It renders only what the agent wrote. The collapsible toggle for the overview block lives in `FileSection`, not inside `FileOverview` itself.

## ExplanationCard: per-change prose

Each `ChangeExplanation` in `file.explanations` gets one `ExplanationCard`. The card's header shows the line range (`L42` or `L42–58`) and the explanation's `title`. The body renders three labeled sections — **What**, **Why**, and the optional **Impact** — directly from the `ChangeExplanation` fields defined in `lib/types.ts`.

Cards are individually collapsible (the chevron in the card header) independently of the outer per-card active state. The `active` prop drives the colored border ring; `interactive` controls whether clicking the card fires `onToggle` to switch the active selection. Both props come from `FileSection`, which reads `highlightMode` to decide between "highlight all ranges at once" and "highlight one range on click."

## Anchoring cards to line ranges

The visual alignment between a card and its diff rows is achieved through a layout pass, not CSS columns. `FileSection` runs `layoutCards` on every render and after resize events. The algorithm:

1. Sort `file.explanations` by `startLine` so cards stack top-to-bottom without gaps.
2. For each explanation, look up the DOM element registered for `startLine` via `lineRefs`.
3. Compute `desiredTop` as the diff row's top offset relative to the explanations column's top, then clamp it to `lastBottom + CARD_GAP` (8 px) so cards never overlap.
4. Set `card.style.top` directly and advance `lastBottom`.
5. Set `explanationsContainer.style.minHeight` to ensure the right column is at least as tall as the stacked cards.

Cards are absolutely positioned inside the explanations column (`position: absolute; left: 0; right: 0`), so the column needs an explicit height. The layout pass runs via `useLayoutEffect` (synchronous, before paint) and is also scheduled at 50 ms, 300 ms, and 1 000 ms after mount to re-anchor once Shiki's async syntax highlighting finishes shifting diff row heights.

The `activeRanges` array passed to `DiffViewer` mirrors the same `startLine`/`endLine` data, so the colored highlight bands in the diff are always in sync with the card borders on the right.

## Connection to the agent contract

The cards are the front-end realization of the schema the agent must produce. Every field rendered by `ExplanationCard` — `startLine`, `endLine`, `title`, `what`, `why`, `impact` — maps directly to the `ChangeExplanation` interface in `lib/types.ts`. The `FileOverview` component likewise renders exactly the three fields of the `FileOverview` type.

This tight coupling is intentional: the viewer does no summarization or inference of its own. Quality of the reading experience depends entirely on the [agent contract](../agent-contract/index.md) — the schema, prompt, and tone rules that govern what the agent writes into `review.json`.

## Deferred rendering

`FileSection` accepts a `deferred` boolean. When true, it renders only the sticky header and a "Loading…" placeholder, skipping the diff and cards entirely. This lets the page mount cheaply for long reviews and progressively fill in files as `requestIdleCallback` scheduling catches up. Once `deferred` flips to false the full layout runs, including the initial `layoutCards` pass.
