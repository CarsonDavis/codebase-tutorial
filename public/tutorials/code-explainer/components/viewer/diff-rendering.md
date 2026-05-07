---
id: viewer/diff-rendering
title: Diff rendering
summary: How the side-by-side diff is computed, how intra-line highlighting works, and how unchanged context is truncated.
related:
  - viewer/routing-and-shell
  - viewer/explanation-cards
  - viewer/highlighting-and-settings
---

## From file content to rows

All diff work starts in `lib/diff.ts`. `computeDiff(oldContent, newContent)` calls the `diff` library's `diffLines`, then post-processes the output into a flat array of `DiffRow` objects — one per visual row in the grid.

`DiffRow` has four types:

- **context** — the line is unchanged; both sides carry the same content.
- **modified** — a removed chunk is immediately followed by an added chunk; lines are paired one-to-one into `modified` rows so corresponding content stays horizontally aligned. If one side is longer than the other, the surplus lines become plain `remove` or `add` rows.
- **add** — line exists only in the new file; `left` is absent.
- **remove** — line exists only in the old file; `right` is absent.

Each side carries an absolute line number (`{ line: number; content: string }`), which is what explanation cards use to anchor themselves to the correct row (see [explanation cards](./explanation-cards.md)).

`computeDiffStats` is a lightweight sibling that sums added and removed line counts for the `+A −R` header badge shown above each file section.

## Rendering the grid

`DiffViewer` (in `app/components/DiffViewer.tsx`) receives a `FileReview` and owns the full render pipeline. Its top-level `useMemo` converts the file's `oldContent`/`newContent` to `DiffRow[]` via `computeDiff`. Shiki tokenization runs in a parallel `useEffect` — `highlightToTokens` is called for both file versions and the results land in `oldTok`/`newTok` state (see [syntax highlighting](./highlighting-and-settings.md) for how Shiki is loaded).

Each row renders as a four-cell CSS Grid: `[3rem | code | 3rem | code]` — left line number, left code, right line number, right code. The `DiffRowView` sub-component resolves the correct Shiki token array by indexing into `oldTok[row.left.line - 1]` or `newTok[row.right.line - 1]`.

Background colors follow the row type: removed lines get `--color-diff-remove-bg` on the left and a blank on the right; added lines get the reverse; context rows are unstyled.

When an explanation card is active, `activeRanges` is passed down as a list of `{ startLine, endLine, color }` objects. `DiffViewer` computes `rowHighlights` by checking each row's right-side line number against every range. Pure-removal rows sandwiched between in-range rows are included so the highlight stays visually contiguous. The highlight renders as CSS `box-shadow` insets — a 2 px colored border on the left or right edge of the line-number and code cells, with caps at the first and last row of the range. This avoids disrupting layout while adding a clear visual accent.

## Intra-line word highlighting

For `modified` rows, the component runs `computeWordDiff(row.left.content, row.right.content)`, which calls `diffWordsWithSpace` from the `diff` library and converts the output to character-offset `Range[]` pairs — one array for the left side, one for the right.

`renderLine` then walks Shiki's color tokens and splits each token at word-diff boundaries, emitting `<span>` elements with either `diff-word-remove` or `diff-word-add` CSS classes on the changed slices. Because Shiki tokens can straddle a word-diff boundary, the function advances character-by-character through each token, grouping consecutive characters that share the same changed/unchanged status. The result is per-character accurate highlighting that respects both Shiki color and diff classification simultaneously.

When Shiki tokens aren't ready yet, the component falls back to `escapeHtml(content)` — the row is still readable, just without colors.

## Truncation and elision

By default, `DiffViewer` runs in `"truncate"` mode. `computeVisibility` (in `lib/diffTruncate.ts`) builds a `VisibilityPlan`:

1. Mark every changed row (`add`, `remove`, `modified`) as "must show".
2. Mark every context row whose new-file line number falls inside any explanation's `[startLine, endLine]` range.
3. Expand the visible window by `DIFF_CONTEXT_SIZE` (10) rows on each side of every must-show row.

The result is `visible: boolean[]` (one flag per row) plus `segments: CollapseSegment[]` — each segment is a contiguous run of hidden rows with its start index, end index, and length pre-computed.

Back in `DiffViewer`, a `useMemo` walks the rows and emits an `items` array that is either `{ kind: "row" }` or `{ kind: "collapse", segStart, length }`. Collapsed segments render as a `CollapseStub` button ("Show N hidden lines"). Clicking it calls `onExpandSegment`, which the parent component handles by adding the segment's start index to an `expandedSegments` set — re-rendering the items list with those rows expanded inline. The expanded set lives in the parent (not inside `DiffViewer`) so that when it changes, the parent's layout effect that re-anchors explanation cards also fires.

In `"full"` mode, `plan` is `null`, all rows emit as `{ kind: "row" }`, and no stubs appear.

## Text selection isolation

A small `useEffect` in `DiffViewer` solves a CSS Grid quirk: dragging to select text naturally extends across the grid's columns, selecting both the left and right panes simultaneously. The component listens for `mousedown` on each side (detected via `data-side` attributes on code cells), then toggles a class on the outer container that sets `user-select: none` on the opposite side. On `mouseup`, both classes are removed.
