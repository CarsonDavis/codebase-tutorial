# Glossary popovers — design

**Status:** draft, awaiting review
**Date:** 2026-05-11

## Goal

When a reader encounters a glossary term in tutorial prose (the dotted-underlined
words produced by the existing auto-link pass), they should be able to read the
definition without leaving the page. Hover or focus on a laptop, tap on a phone,
reveals a small floating box anchored to the term containing the rendered
definition plus an "Open in glossary →" link for readers who want the full
reference page.

## Current state

The markdown pipeline (`lib/markdown.ts`) already finds glossary terms and
auto-links the first occurrence per page. It emits:

```html
<a href="/t/<slug>/aux/glossary/#<term-slug>"
   data-glossary="<term>"
   class="glossary-link">term</a>
```

CSS in `app/globals.css` styles `.glossary-link` with a dotted underline.
`loadGlossaryIndex` in `lib/tutorials.ts` provides only `{ term, href }` per
term — the rendered definition is not currently part of the index.

A stale comment in `globals.css:92` claims the pipeline sets a `title`
attribute on glossary links. It does not. Fix as part of this work.

## User-facing behavior

- Glossary terms in tutorial prose show a popover on hover (desktop) or tap
  (mobile or keyboard activation).
- The popover contains the rendered definition (same markdown features as
  inline tutorial prose: `code spans`, **bold**, *italic*, links).
- The popover has an "Open in glossary →" link in the existing accent blue at
  the bottom.
- Clicking the term itself **no longer navigates** to the glossary. Navigation
  is reachable from the link inside the popover (Cmd+click for new tab works
  on that link).
- Same behavior on every page that already auto-links glossary terms:
  - intro page
  - component pages
  - sub-section pages
  - aux pages for characters, decisions, seams (everywhere except the glossary
    page itself, which doesn't auto-link)
- Keyboard: Tab to focus a term, Enter or Space to open, Escape to close —
  native browser behavior, no custom handling required.

## Visual design

The popover matches the existing elevated-card aesthetic:

- background `var(--color-bg-elev)`
- 1px border `var(--color-border)`
- `rounded-lg` (matching `TutorialCard`, `FeaturedTutorial`)
- padding ~`1rem 1.1rem` (matching the callout shape)
- max-width 360px; max-height 60vh with internal scroll for very long entries
- body text 0.95rem, matching `.prose .callout`
- "Open in glossary →" link inside, color `var(--color-accent)`, font-size
  smaller than body (~0.8rem), pinned to the bottom with a top border separator

Positioning: appears directly below the term, flips above if there isn't room
below the viewport. Horizontally clamped to the viewport with an 8px gutter.

## Architecture

Four touchpoints:

### 1. Glossary index carries definitions (`lib/tutorials.ts`)

Extend `loadGlossaryIndex` to also include the rendered definition HTML for
each term:

```ts
export interface GlossaryEntry {
  term: string;
  href: string;
  definitionHtml: string;  // new
}
```

`parseAuxRecords` already extracts each term's body as raw markdown. Render
each body with the existing `renderInlineMarkdown` helper (which deliberately
skips callouts, glossary auto-linking, shiki, and heading collection — exactly
right for short definition snippets). This naturally prevents nested popovers:
a glossary definition that mentions another glossary term won't itself
auto-link.

Definitions are rendered once at build time, embedded into each tutorial page
that uses them.

### 2. Markdown pipeline emits popover triggers and bodies (`lib/markdown.ts`)

Two changes to the unified pipeline:

**Auto-link pass (mdast):** replace `<a data-glossary>` emission with a
`<button data-glossary popovertarget="gl-<slug>">` emission. The link node
becomes a button node via `hName: "button"` in `hProperties`, with attributes:

- `type="button"` (prevent form submission)
- `data-glossary="<term>"`
- `popovertarget="gl-<term-slug>"`
- `aria-describedby="gl-<term-slug>"`
- inner text: the matched term (preserves original casing)

The `popovertarget` attribute is native HTML; it tells the browser which
popover element to toggle when the button is clicked or tapped. No JavaScript
required for the click and tap paths — that's the browser doing it for us.

**Popover emission (rehype):** a new pass walks the produced HAST tree,
collects the set of glossary terms actually used (each appears once per page),
and appends a hidden container at the end of the article fragment:

```html
<div class="glossary-popovers" aria-hidden="true">
  <div id="gl-<term-slug>" popover="auto" class="glossary-popover">
    <div class="glossary-popover-body">…rendered definition…</div>
    <a href="<glossary-href>" class="glossary-popover-link">
      Open in glossary →
    </a>
  </div>
  …
</div>
```

The container lives at the article level, outside any `<p>` (avoids the
"block-element inside paragraph" HTML validity issue). `popover="auto"`
participates in the browser's light-dismiss top layer — clicking outside or
hitting Escape closes it, and opening one popover closes any other open
popover.

The `rehypeWrapGlossaryLinks` pass (which adds the `.glossary-link` class) is
retained but updated to target the new `<button>` elements.

`RenderContext.glossary` changes from `{ term, href }[]` to
`{ term, href, definitionHtml }[]`. All callers in `app/` are updated.

### 3. Client-side hover and focus wiring (`components/GlossaryPopovers.tsx`)

A new client component. Mounted inside `MarkdownBody` (so it travels with
every rendered prose body — intro, components, sub-sections, aux pages —
without each page route needing to remember to add it).

Responsibilities:

- On mount, find all `button[data-glossary]` elements within its scope.
- For each button, attach `mouseenter`, `mouseleave`, `focus`, and `blur`
  handlers.
- On `mouseenter` or `focus`: after a 150ms delay, call `.showPopover()` on
  the matching `#gl-<slug>` element.
- On `mouseleave` of *both* the button and the popover: after a 100ms delay,
  call `.hidePopover()`. (Listen for `mouseenter` on the popover itself so
  moving the cursor from button into popover keeps it open.)
- On `blur` of the button: hide unless focus moved into the popover.
- Run a small positioning function that sets the popover's `top` and `left`
  before showing: try below the button first, flip above if there's no room,
  horizontally clamp to the viewport with an 8px gutter.

Click and tap need no handler — the native `popovertarget` attribute toggles
the popover. The component's only job is adding hover and focus on top.

Size target: under 80 lines. No dependencies beyond React.

### 4. CSS additions (`app/globals.css`)

One block, ~25 lines:

```css
.glossary-link {
  /* button reset, then dotted-underline affordance.
     existing .glossary-link rules (color, border-bottom) apply unchanged */
  appearance: none;
  background: transparent;
  border: 0;
  padding: 0;
  font: inherit;
  cursor: help;
}
.glossary-popovers { display: contents; }   /* container itself has no box */
.glossary-popover {
  /* native popover is display:none by default; we only style the shown state */
  margin: 0;
  max-width: 360px;
  max-height: 60vh;
  overflow-y: auto;
  padding: 1rem 1.1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-elev);
  color: var(--color-fg);
  font-size: 0.95rem;
  line-height: 1.55;
  /* position set by JS before showPopover() */
  position: fixed;
  inset: auto;
}
.glossary-popover-body > :first-child { margin-top: 0; }
.glossary-popover-body > :last-child  { margin-bottom: 0; }
.glossary-popover-link {
  display: inline-block;
  margin-top: 0.75rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.8rem;
  color: var(--color-accent);
}
```

Existing `.prose .glossary-link` styling (dotted underline, hover accent
color) stays; only the button-reset additions are new.

The stale `title`-attribute comment on `globals.css:92` is removed.

## Data flow

```
aux/glossary.md   →  parseAuxRecords    →  GlossaryEntry[]
                                          { term, href, definitionHtml }
                                          (definitionHtml via renderInlineMarkdown)
                                              │
                                              ▼
                              renderMarkdown(body, ctx)
                                  │
                                  ├─ mdast pass: text → <button popovertarget>
                                  ├─ rehype pass: append popover container
                                  │   with rendered definitionHtml inlined
                                  └─ HTML out
                                              │
                                              ▼
                              MarkdownBody (server component)
                              + GlossaryPopovers (client component, wires
                                hover and focus on top of native popover API)
```

## Edge cases and decisions

- **Term appears multiple times on a page:** auto-link still hits only the
  first occurrence (current behavior unchanged). One popover per page per
  term. The popover ID is `gl-<term-slug>` (no occurrence counter needed).
- **Definition contains a link to another tutorial:** works. Inside the
  popover, links use their normal href; Cmd+click for new tab works.
- **No JavaScript** (script fails to load, blocked, hydration not complete):
  hover does nothing. Click and tap still work — native `popovertarget` is
  HTML, not JS. The popover opens; reader can read it. Acceptable degraded
  state.
- **Multiple popovers open at once:** can't happen. Native `popover="auto"`
  closes the previously-open popover when a new one opens.
- **Popover for term near viewport edge:** positioning function flips above
  and horizontally clamps.
- **Mobile tap on the term while a popover is already open elsewhere:**
  native light-dismiss closes the open one; the new one opens. Standard.
- **Tap outside any popover:** native light-dismiss closes it.
- **Glossary page itself:** auto-linking is already disabled there
  (`app/t/[slug]/aux/[name]/page.tsx:60`). No popovers on the glossary page.
  No change.
- **Aux pages other than glossary (characters, decisions, seams):** these
  auto-link glossary terms today. They get popovers too. Consistent.
- **The `tutorials.test.ts` and `markdown.test.ts` suites:** update assertions
  to expect `<button popovertarget=…>` instead of `<a data-glossary …>` for
  the auto-link output. Add a test that the popover container is emitted with
  the rendered definition HTML. The existing "first occurrence only" and
  "skips code and headings" tests still apply and should still pass.

## Out of scope

- Search inside the popover.
- Cross-tutorial glossary linking.
- Replacing the dedicated glossary aux page.
- Animated transitions on open and close.
- Tooltip arrows pointing to the term.
- Touch-specific long-press behavior (native tap is sufficient).

## Files touched

- `lib/markdown.ts` — extend `RenderContext.glossary` shape; update auto-link
  pass to emit `<button>`; rename `rehypeWrapGlossaryLinks` →
  `rehypeMarkGlossaryButtons` (still adds the `.glossary-link` class to the
  emitted buttons); add a new pass that appends the popover container.
- `lib/tutorials.ts` — extend `loadGlossaryIndex` to render and include
  `definitionHtml` per term.
- `lib/markdown.test.ts` — update auto-link expectations; add popover
  container test.
- `lib/tutorials.test.ts` — update `loadGlossaryIndex` test shape.
- `app/t/[slug]/page.tsx`,
  `app/t/[slug]/[component]/page.tsx`,
  `app/t/[slug]/[component]/[sub]/page.tsx`,
  `app/t/[slug]/aux/[name]/page.tsx` — no change. They already pass the
  glossary index through `renderMarkdown` opaquely; only the index's shape
  changes, which they don't inspect.
- `components/MarkdownBody.tsx` — mount `<GlossaryPopovers />` alongside the
  prose so every rendered body picks it up.
- `components/GlossaryPopovers.tsx` — new file, ~80 lines, client component.
- `app/globals.css` — add `.glossary-popover` block; reset button styles on
  `.glossary-link`; remove the stale title-attribute comment.

## Risk and rollback

- Risk is small and contained — the changes don't alter rendering anywhere
  outside glossary terms.
- Rollback: revert the markdown pipeline and CSS changes; the existing
  `<a>`-based behavior is restored. The client component is additive and can
  be omitted without breaking anything.

## Testing

- Unit (vitest): existing markdown and tutorial tests, updated to reflect new
  HTML shape. Add a test that a definition with markdown inside (e.g., `code
  span`) renders correctly inside the popover container.
- Manual verification before declaring done:
  - Hover a term in `mmgis` tutorial prose — popover appears below the term
    with the right content, "Open in glossary →" link works.
  - Tap a term on a phone (or DevTools touch emulation) — popover opens,
    tap outside closes it.
  - Keyboard: Tab to a term, Enter opens, Escape closes.
  - Near-edge term: popover flips above or clamps horizontally.
  - Glossary page: no popovers (auto-link still off there).
  - Characters/decisions/seams aux pages: popovers do appear.
