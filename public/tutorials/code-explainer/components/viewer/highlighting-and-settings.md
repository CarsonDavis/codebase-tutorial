---
id: viewer/highlighting-and-settings
title: Syntax highlighting and settings
summary: Shiki integration with lazy grammar loading, the palette/settings controls, and the tour.
related:
  - viewer/diff-rendering
  - viewer/routing-and-shell
---

## Shiki and why it was chosen

The app uses [Shiki](https://shiki.style/) for syntax highlighting. Shiki runs the same TextMate grammars as VS Code, which means token coloring matches what developers see in their editor. The theme is hardcoded to `dark-plus` — the canonical VS Code dark theme — so the output always looks familiar without any theme-switching surface area to maintain.

The alternative would be a client-side highlighter like Prism or highlight.js. Shiki's advantage is grammar fidelity: it produces the same tokenization VS Code uses, which matters when the content being reviewed is code that developers care about reading carefully.

## Lazy grammar loading

All highlighting logic lives in `lib/highlighter.ts`. The highlighter itself is a singleton: `getHighlighter()` creates it once (via `highlighterPromise`) and reuses it across renders. The Shiki instance is initialized with **no languages** — `langs: []` — so no grammar bundles are downloaded before first paint.

Grammars are loaded on demand by `ensureLang()`. Two module-level structures track this:

- `loadedLangs: Set<string>` — grammars already available in the highlighter.
- `inflightLoads: Map<string, Promise<void>>` — grammars currently being fetched, to prevent duplicate requests if two files with the same language are tokenized simultaneously.

The full whitelist of supported languages is `SUPPORTED_LANGS`, covering 22 common languages from `python` and `typescript` down to `dockerfile` and `diff`. Files outside that list fall back gracefully: `normalizeLang()` maps common aliases (`py` → `python`, `sh` → `bash`, etc.) and returns `"text"` for anything unrecognized. Shiki handles `"text"` without error, rendering the code with no coloring.

The public API is `highlightToTokens(code, lang)`. It returns `LineToken[][]` — one array of `{content, color}` pairs per line. The diff viewer consumes this structure to render each token with its syntax color, then lays word-diff overlays on top. See [diff rendering](./diff-rendering.md) for how those two layers compose.

## Color palette for explanation ranges

`lib/highlightPalette.ts` defines `HIGHLIGHT_PALETTE`: eight distinct accent colors used to outline the lines each explanation card covers. The helper `paletteColor(index)` wraps with modulo so the colors cycle rather than running out, no matter how many cards a review contains. The colors are chosen to be visually distinct against the `dark-plus` background and to match the CSS accent variable used elsewhere in the UI.

## Settings menu

`app/components/SettingsMenu.tsx` is a self-contained dropdown that controls two orthogonal reader preferences:

**Highlight mode** (`lib/highlightSettings.ts`) — `"single"` (default) vs `"all"`. In `"single"` mode the reader clicks one card to outline its lines; in `"all"` mode every card's range is permanently outlined using `paletteColor()`. `HighlightMode` and `DEFAULT_HIGHLIGHT_MODE` are the only exports from `highlightSettings.ts`; the state itself lives in the parent review page and is passed down as props.

**Truncate mode** — `"truncate"` (show only lines near changes) vs `"full"` (show every line). This prop and its handler come from the diff truncation layer; the settings menu is the single toggle point. See [diff rendering](./diff-rendering.md) for what truncation actually does.

The menu is a plain `<div>` positioned `absolute right-0 top-full`. It closes on outside click (via a `mousedown` listener scoped to the document) and on `Escape`. The gear icon button carries `data-tour="settings"` so the onboarding tour can spotlight it.

## Tour

`lib/tour.ts` wraps [driver.js](https://driverjs.com/) into two exported functions:

- `runTour(callbacks?)` — drives a six-step spotlight tour through the review UI: the review summary, file overview, side-by-side diff, explanation cards, file tree, and settings button. Steps are filtered at runtime (`document.querySelector`) so the tour skips any element that isn't mounted yet. When the tour ends, it writes `"1"` to `localStorage` under the key `code-explainer:tour-seen-v1`.
- `hasSeenTour()` — reads that key so the review page can auto-run the tour on first visit and skip it on subsequent ones.

The `TourCallbacks` interface (`onStart` / `onEnd`) lets the review page pause progressive mounting while the tour spotlight is active, preventing the highlighted element from shifting position mid-step. The "Replay tour" entry in the settings menu calls `onReplayTour`, which the parent maps back to `runTour`.
