# Mobile Tutorial Nav Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the tutorial pages usable on mobile by hiding the left-hand contents sidebar behind a slide-in drawer, without changing the desktop layout.

**Architecture:** The outer tutorial layout (`app/t/[slug]/layout.tsx`) currently forces a `grid-cols-[16rem_1fr]` grid at every viewport width, which squeezes article content into ~30px on a phone. Fix is to gate the sidebar at the `lg:` breakpoint and render an isolated mobile drawer (sticky top bar trigger + slide-in panel) that reuses the existing `TutorialNav` component verbatim. The new `TutorialNavMobile` client component owns all drawer state. The existing `TutorialNav.tsx` is not touched. The only other mobile-related fix is offsetting the quiz page's `sticky top-0` progress bar so it doesn't collide with the new mobile trigger bar.

**Tech Stack:** Next.js 15 App Router, React (client components for state), Tailwind v4 (existing CSS-vars-based theme).

---

## File Structure

- **Create:** `components/TutorialNavMobile.tsx` — client component. Renders a sticky `h-12` top bar (visible only `< lg`) with "← All tutorials" on the left and a "Contents" button on the right. The button toggles a slide-in left drawer that wraps the existing `<TutorialNav>`. Handles open/close state, ESC key, backdrop click, route-change auto-close.
- **Modify:** `app/t/[slug]/layout.tsx` — change grid to `grid-cols-1 lg:grid-cols-[16rem_1fr]`, add `hidden lg:block` to the desktop `<aside>`, mount `<TutorialNavMobile>` above the children.
- **Modify:** `components/Quiz.tsx` — change `ProgressBar`'s outer `sticky top-0` to `sticky top-12 lg:top-0` so it sits below the mobile trigger bar but unchanged on desktop.

No test files. The codebase has no component test infra (only `lib/markdown.test.ts` and `lib/tutorials.test.ts` exist, and they test pure functions). Verification for this UI work is manual at 375px in a browser.

---

### Task 1: Add mobile drawer for tutorial nav

**Goal:** Sidebar collapses on mobile into a slide-in drawer triggered from a sticky top bar; desktop layout is byte-identical above `lg:`.

**Files:**
- Create: `components/TutorialNavMobile.tsx`
- Modify: `app/t/[slug]/layout.tsx`

**Acceptance Criteria:**
- [ ] At viewport widths `< 1024px` (Tailwind `lg` breakpoint), the desktop sidebar is hidden and a `h-12` sticky bar appears at the top of every `/t/[slug]/...` page.
- [ ] The sticky bar has "← All tutorials" (link to `/`) on the left and a "Contents" button on the right.
- [ ] Tapping "Contents" slides a drawer in from the left containing the same nav (Overview, components, sub-sections, Reference, Quiz) that the desktop sidebar shows.
- [ ] Drawer closes on: backdrop tap, ESC key, tapping any link inside it.
- [ ] At `≥ 1024px`, no mobile bar is rendered; no drawer is rendered; the layout grid is `grid-cols-[16rem_1fr]` exactly as today.
- [ ] Body scroll is locked while the drawer is open (so the page underneath doesn't scroll when scrolling inside the drawer).
- [ ] Article content fills the full viewport width on mobile (minus the existing `px-6` gutter).

**Verify:**
1. `npm run build` → builds without errors.
2. `npm run dev`, open `http://localhost:3000/t/mmgis/` in Chrome dev tools at 375px width:
   - Sticky top bar visible with both elements.
   - Tap "Contents" → drawer slides in from left, backdrop dims the page.
   - Tap a section link → drawer closes and page navigates.
   - Press ESC → drawer closes.
   - Tap the backdrop → drawer closes.
3. Resize to ≥ 1024px:
   - Sticky bar disappears, sidebar reappears in place, no visual change vs. before this PR.

**Steps:**

- [ ] **Step 1: Create `components/TutorialNavMobile.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TutorialNav } from "./TutorialNav";
import type { Component, AuxEntry } from "@/lib/types";

interface Props {
  slug: string;
  components: Component[];
  aux?: AuxEntry[];
  hasQuiz?: boolean;
}

export function TutorialNavMobile({ slug, components, aux, hasQuiz }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on ESC; lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <div className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 px-4 backdrop-blur">
        <Link
          href="/"
          className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
        >
          ← All tutorials
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="tutorial-nav-drawer"
          className="rounded border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-fg)] hover:border-[var(--color-accent)]"
        >
          Contents
        </button>
      </div>

      {open && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/60"
          />
          <aside
            id="tutorial-nav-drawer"
            className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg)] p-6"
          >
            <TutorialNav
              slug={slug}
              components={components}
              aux={aux}
              hasQuiz={hasQuiz}
            />
          </aside>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `app/t/[slug]/layout.tsx` — responsive grid + mount mobile drawer**

Replace the current return JSX (lines 24-36):

```tsx
  return (
    <>
      <TutorialNavMobile
        slug={slug}
        components={tutorial.components}
        aux={tutorial.aux}
        hasQuiz={quizAvailable}
      />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[16rem_1fr]">
        <aside className="sticky top-10 hidden self-start lg:block">
          <TutorialNav
            slug={slug}
            components={tutorial.components}
            aux={tutorial.aux}
            hasQuiz={quizAvailable}
          />
        </aside>
        <div>{children}</div>
      </div>
    </>
  );
```

Add the import at the top of the file (next to the existing `TutorialNav` import):

```tsx
import { TutorialNavMobile } from "@/components/TutorialNavMobile";
```

- [ ] **Step 3: Build and verify the routes still type-check / compile**

Run: `npm run build`
Expected: Successful build, no TypeScript errors. Static pages for all `/t/<slug>/...` routes regenerate.

- [ ] **Step 4: Manual browser verification at 375px and 1280px**

Run: `npm run dev`. Open Chrome dev tools, toggle device toolbar.

At 375px on `http://localhost:3000/t/mmgis/`:
- Sticky bar visible with "← All tutorials" left + "Contents" right.
- Article body fills the column under the bar (no 16rem sidebar squeeze).
- Tap "Contents" — left drawer slides in, backdrop dims page.
- Tap a component link — drawer closes, navigates.
- Tap "Contents" again, press ESC — drawer closes.
- Tap "Contents" again, tap backdrop — drawer closes.
- While drawer is open, the page beneath does not scroll when scrolling inside the drawer.

At 1280px:
- No sticky bar.
- Sidebar in place at left, 16rem wide.
- Visually unchanged from `git stash` baseline (do a quick before/after compare).

- [ ] **Step 5: Commit**

```bash
git add components/TutorialNavMobile.tsx app/t/[slug]/layout.tsx
git commit -m "Add mobile drawer for tutorial nav, gate sidebar at lg:"
```

---

### Task 2: Offset quiz progress bar below mobile trigger

**Goal:** Quiz page's sticky progress bar no longer collides with the new mobile trigger bar; desktop position unchanged.

**Files:**
- Modify: `components/Quiz.tsx:134`

**Acceptance Criteria:**
- [ ] On mobile (`< lg`) on a quiz page (e.g. `/t/mmgis/quiz/`), the progress bar sticks 48px from the top, sitting flush under the mobile trigger bar — not behind it.
- [ ] On desktop (`≥ lg`), the progress bar sticks at `top-0` exactly as it does today.

**Verify:**
1. `npm run dev`, open `http://localhost:3000/t/mmgis/quiz/`.
2. At 375px: scroll the question list — progress bar stays visible at `top: 48px`, mobile trigger bar at `top: 0`, both visible, no overlap.
3. At 1280px: scroll the question list — progress bar stays visible at `top: 0`, no trigger bar present, no visual change vs. baseline.

**Steps:**

- [ ] **Step 1: Edit `components/Quiz.tsx:134`**

Change:

```tsx
    <div className="sticky top-0 z-10 -mx-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-4 py-3 backdrop-blur">
```

to:

```tsx
    <div className="sticky top-12 z-10 -mx-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-4 py-3 backdrop-blur lg:top-0">
```

- [ ] **Step 2: Verify in browser at 375px and 1280px** (commands in Verify section above).

- [ ] **Step 3: Commit**

```bash
git add components/Quiz.tsx
git commit -m "Offset quiz progress bar below mobile nav trigger"
```

---

## Out of Scope

- **`px-6 → px-4 sm:px-6` polish** on the outer layout. Skipped per YAGNI — the user explicitly de-prioritized it.
- **Component-level tests** for the drawer. Codebase has no component test setup; introducing one for this single change is disproportionate. Manual verification covers it.
- **Animating the drawer slide.** Default instant show/hide is fine; can layer in `transition-transform` later if it feels janky.
- **PageToc mobile treatment.** Already correctly hidden via `hidden lg:block` in each page.
