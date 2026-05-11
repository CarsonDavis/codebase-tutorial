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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
      <div className="fixed inset-x-0 top-0 z-30 flex h-12 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 px-4 backdrop-blur">
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
