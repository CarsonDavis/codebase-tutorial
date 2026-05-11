"use client";

import { useEffect } from "react";

/**
 * Wires hover + keyboard focus to glossary popovers in the rendered markdown body.
 *
 * The markdown pipeline already emits `<button data-glossary popovertarget="gl-X">`
 * triggers and matching `<div id="gl-X" popover="auto">` bodies. The browser's native
 * popover API handles click, tap, ESC, and outside-click for free via `popovertarget`.
 *
 * This component adds the two things the native API doesn't give us:
 *   1. Hover and keyboard-focus opening (with a short delay to avoid flicker as the
 *      cursor sweeps across a paragraph).
 *   2. Positioning the popover next to its trigger button rather than wherever the
 *      browser would place a free-floating top-layer element by default.
 *
 * Mounted by `MarkdownBody`, so it runs on every rendered tutorial body.
 */
export function GlossaryPopovers() {
  useEffect(() => {
    const buttons = document.querySelectorAll<HTMLButtonElement>("button[data-glossary]");
    if (buttons.length === 0) return;

    const SHOW_DELAY_MS = 150;
    const HIDE_DELAY_MS = 100;

    let activePopover: HTMLElement | null = null;
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTimers = () => {
      if (showTimer) { clearTimeout(showTimer); showTimer = null; }
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    };

    const getPopover = (btn: HTMLButtonElement): HTMLElement | null => {
      const id = btn.getAttribute("popovertarget");
      return id ? document.getElementById(id) : null;
    };

    const position = (btn: HTMLButtonElement, pop: HTMLElement) => {
      // Make sure the popover is in the layout so we can measure it. We rely on the
      // browser placing `popover="auto"` in the top layer when shown; before that, we
      // pre-position via fixed coordinates.
      const btnRect = btn.getBoundingClientRect();
      // Reset to a known state so width measurement isn't constrained by a previous
      // position. The popover is display:none when closed, so we briefly show it
      // off-screen to measure, then reposition.
      pop.style.top = "-9999px";
      pop.style.left = "-9999px";
      // .showPopover() is called by the caller after this; we set the real position
      // first so there's no flash.
      const popWidth = pop.offsetWidth || 360;
      const popHeight = pop.offsetHeight || 200;

      const gutter = 8;
      const gap = 6;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      // Vertical: prefer below, flip above if not enough room.
      let top = btnRect.bottom + gap;
      if (top + popHeight > viewportH - gutter && btnRect.top - gap - popHeight >= gutter) {
        top = btnRect.top - gap - popHeight;
      }

      // Horizontal: align with the trigger's left edge, clamp inside viewport.
      let left = btnRect.left;
      if (left + popWidth > viewportW - gutter) left = viewportW - gutter - popWidth;
      if (left < gutter) left = gutter;

      pop.style.top = `${top}px`;
      pop.style.left = `${left}px`;
    };

    const open = (btn: HTMLButtonElement) => {
      const pop = getPopover(btn);
      if (!pop) return;
      if (activePopover && activePopover !== pop) {
        try { activePopover.hidePopover(); } catch { /* already closed */ }
      }
      position(btn, pop);
      try { pop.showPopover(); } catch { /* already open or unsupported */ }
      activePopover = pop;
    };

    const close = () => {
      if (activePopover) {
        try { activePopover.hidePopover(); } catch { /* already closed */ }
      }
      activePopover = null;
    };

    const scheduleOpen = (btn: HTMLButtonElement) => {
      clearTimers();
      showTimer = setTimeout(() => open(btn), SHOW_DELAY_MS);
    };

    const scheduleClose = () => {
      clearTimers();
      hideTimer = setTimeout(close, HIDE_DELAY_MS);
    };

    const onButtonEnter = (e: Event) => scheduleOpen(e.currentTarget as HTMLButtonElement);
    const onButtonLeave = () => scheduleClose();
    const onButtonFocus = (e: Event) => open(e.currentTarget as HTMLButtonElement);
    const onButtonBlur = (e: FocusEvent) => {
      // Keep open if focus moved into the popover (e.g., user tabbed to the link).
      if (activePopover && e.relatedTarget instanceof Node && activePopover.contains(e.relatedTarget)) {
        return;
      }
      scheduleClose();
    };

    const onPopoverEnter = () => clearTimers();
    const onPopoverLeave = () => scheduleClose();

    for (const btn of buttons) {
      btn.addEventListener("mouseenter", onButtonEnter);
      btn.addEventListener("mouseleave", onButtonLeave);
      btn.addEventListener("focus", onButtonFocus);
      btn.addEventListener("blur", onButtonBlur);
      const pop = getPopover(btn);
      if (pop) {
        pop.addEventListener("mouseenter", onPopoverEnter);
        pop.addEventListener("mouseleave", onPopoverLeave);
      }
    }

    return () => {
      clearTimers();
      for (const btn of buttons) {
        btn.removeEventListener("mouseenter", onButtonEnter);
        btn.removeEventListener("mouseleave", onButtonLeave);
        btn.removeEventListener("focus", onButtonFocus);
        btn.removeEventListener("blur", onButtonBlur);
        const pop = getPopover(btn);
        if (pop) {
          pop.removeEventListener("mouseenter", onPopoverEnter);
          pop.removeEventListener("mouseleave", onPopoverLeave);
        }
      }
    };
  }, []);

  return null;
}
