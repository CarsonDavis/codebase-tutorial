import Link from "next/link";
import type { Tutorial } from "@/lib/types";

interface Props {
  tutorial: Tutorial;
}

/**
 * Hero card for the home page's featured tutorial. Bigger, denser, and links into the
 * actual tutorial reading flow rather than the overview — the visitor lands on the
 * product in use, not a meta-page about it.
 */
export function FeaturedTutorial({ tutorial }: Props) {
  return (
    <Link
      href={`/t/${tutorial.slug}/`}
      className="group block rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7 transition-colors hover:border-[var(--color-accent)]"
    >
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-muted)]">
        Featured tutorial
      </div>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">
        {tutorial.name}
        <span className="text-[var(--color-fg-muted)] transition-transform group-hover:translate-x-0.5 inline-block ml-2">
          →
        </span>
      </h2>
      <p className="mt-3 text-[var(--color-fg-muted)]">{tutorial.summary}</p>

      {tutorial.components.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {tutorial.components.map((c) => (
            <span
              key={c.id}
              className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[11px] text-[var(--color-fg-muted)]"
            >
              {c.title}
            </span>
          ))}
          {tutorial.aux && tutorial.aux.length > 0 && (
            <span className="rounded border border-[var(--color-seam-border)] bg-[var(--color-seam-bg)] px-2 py-0.5 text-[11px] text-[var(--color-seam-label)]">
              + {tutorial.aux.length} reference pages
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
