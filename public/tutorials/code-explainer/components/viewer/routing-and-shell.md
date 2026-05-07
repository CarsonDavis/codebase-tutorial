---
id: viewer/routing-and-shell
title: Routing and shell
summary: How pages are organized and how the three-column layout is built.
related:
  - viewer/diff-rendering
  - viewer/explanation-cards
---

## Route structure

The app has two routes, both handled by Next.js App Router with static site generation (SSG):

- `/` — the home page (`app/page.tsx`), a list of available reviews.
- `/reviews/[slug]` — the per-review page (`app/reviews/[slug]/page.tsx`), which renders a single review in full.

`app/layout.tsx` is intentionally minimal: it sets document metadata, locks the color scheme to `dark` (including a `darkreader-lock` meta tag so browser extensions don't try to invert the theme), and renders `{children}` with no wrapping chrome. All layout decisions live in individual page components.

## Home page

`app/page.tsx` is an async Server Component. It calls `listReviewSummaries()` from `lib/reviews.ts`, which reads every `.json` file from `public/reviews/`, parses metadata and file counts, and sorts them newest-first. The page renders a card list; each card links to `/reviews/<slug>/`.

If the directory is empty, the page shows a "no reviews" placeholder that points the user to `AGENTS.md` — the document that describes how to generate a review file. That hand-off is intentional: this app is a viewer, not a generator. The actual intelligence lives in [the agent contract](../agent-contract/index.md).

## Per-review page and SSG

`app/reviews/[slug]/page.tsx` exports `generateStaticParams`, which calls `listReviewSlugs()` to enumerate all JSON files at build time. Next.js then pre-renders one HTML page per slug. At request time, the page reads the matching JSON file, parses it into `ReviewData`, and passes it to `ReviewLayout` as a prop.

One detail worth noting: the `<ReviewLayout key={slug} ...>` pattern forces a full remount when the user navigates between reviews. Without the key, per-review state (selected file, progressive mount counter, expanded segments) would leak across navigations.

## `ReviewLayout` and the two-column shell

`ReviewLayout` (`app/components/ReviewLayout.tsx`) is a `"use client"` component — the boundary where server-rendered data hands off to React state. It receives the full `ReviewData` and owns all interactive state: which file is selected, the highlight mode, the truncate mode, and the progressive mount counter.

The shell is a two-column CSS grid (`grid-cols-[260px_1fr]`):

- **Left column (aside):** a fixed-width sidebar with the branch metadata header at the top, the `FileTree` in the middle, and a file count footer at the bottom.
- **Right column (main):** a scrollable area with the review title/summary header, then the list of `FileSection` components — one per changed file.

The right column is not itself a third column; the three-panel feel (file tree | diff | cards) comes from within each `FileSection`, where the diff and explanation cards sit side by side. See [diff rendering](./diff-rendering.md) and [explanation cards](./explanation-cards.md) for how those panels work.

## File tree

`lib/fileTree.ts` exports `buildTree`, which converts the flat `file.path` array from `ReviewData` into a nested `TreeNode` tree. It splits each path on `/`, walks the tree inserting folder and file nodes, then sorts the result (folders before files, alphabetical within each group).

`app/components/FileTree.tsx` renders that tree recursively via `TreeRow`. Folders start expanded; clicking toggles them. Clicking a file calls `onSelect`, which in `ReviewLayout` updates `selectedPath` and smooth-scrolls the main column to the matching `FileSection`. Files also show a colored `ChangeBadge` (`A`, `M`, `D`, `R`) that maps to the file's `changeType` from `lib/types.ts`.

## Progressive mounting

`ReviewLayout` mounts `FileSection` components one at a time using `requestIdleCallback`. Only the first file is mounted on the initial render; subsequent files are added during browser idle time. This prevents hydrating thousands of diff rows at once, which would delay card positioning — a concern covered in more detail in [explanation cards](./explanation-cards.md). When a user clicks a file in the tree that hasn't been mounted yet, `ReviewLayout` force-advances `mountedCount` to include that file before scrolling.
