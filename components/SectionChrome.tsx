import Link from "next/link";
import type { SectionFrontmatter, Tutorial, AuxRecord } from "@/lib/types";
import { resolveSectionRef } from "@/lib/paths";

interface Props {
  tutorial: Tutorial;
  frontmatter: SectionFrontmatter;
  /**
   * Records parsed from `aux/seams.md`. Used to attach human-readable names + hrefs to
   * the seam ids in `seams_touched`. Pass an empty array if no seams page exists.
   */
  seams: AuxRecord[];
}

/**
 * Top-of-page chrome derived from frontmatter. Sits above the prose body.
 *
 * The visual hierarchy is:
 *   1. Key idea (always rendered if present — the load-bearing one-liner)
 *   2. Watch-out callouts (counter-intuitions, max 2)
 *   3. Compact metadata row: prereqs · seams crossed
 *
 * Order matters: the reader's eye should land on the key idea first, then absorb the
 * "where my instinct breaks" callouts, then notice the navigational metadata.
 */
export function SectionChrome({ tutorial, frontmatter, seams }: Props) {
  const hasKeyIdea = !!frontmatter.keyIdea?.trim();
  const watchOuts = (frontmatter.watchOut ?? []).filter((s) => s.trim().length > 0).slice(0, 2);
  const prereqRefs = (frontmatter.prerequisites ?? [])
    .map((id) => resolveSectionRef(tutorial, id))
    .filter((r): r is NonNullable<ReturnType<typeof resolveSectionRef>> => r !== null);
  const seamRefs = buildSeamRefs(tutorial.slug, frontmatter.seamsTouched, seams);

  if (!hasKeyIdea && watchOuts.length === 0 && prereqRefs.length === 0 && seamRefs.length === 0) {
    return null;
  }

  return (
    <div className="not-prose mb-10 space-y-3">
      {hasKeyIdea && (
        <div className="rounded-lg border border-[var(--color-keyidea-border)] bg-[var(--color-keyidea-bg)] p-4">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-keyidea-label)]">
            Key idea
          </div>
          <p className="mt-1 text-[15px] leading-relaxed text-[var(--color-fg)]">
            {frontmatter.keyIdea}
          </p>
        </div>
      )}

      {watchOuts.map((line, i) => (
        <div
          key={i}
          className="rounded-lg border border-[var(--color-watchout-border)] bg-[var(--color-watchout-bg)] p-4"
        >
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-watchout-label)]">
            Watch out
          </div>
          <p className="mt-1 text-[14px] leading-relaxed text-[var(--color-fg)]">{line}</p>
        </div>
      ))}

      {(prereqRefs.length > 0 || seamRefs.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-[var(--color-fg-muted)]">
          {prereqRefs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.14em]">Read first</span>
              {prereqRefs.map((r) => (
                <Link
                  key={r.id}
                  href={r.href}
                  className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[11px] transition-colors hover:border-[var(--color-accent)]"
                >
                  {r.title}
                </Link>
              ))}
            </div>
          )}
          {seamRefs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.14em]">Crosses seam</span>
              {seamRefs.map((s) => (
                <Link
                  key={s.id}
                  href={s.href}
                  className="rounded border border-[var(--color-seam-border)] bg-[var(--color-seam-bg)] px-2 py-0.5 text-[11px] text-[var(--color-seam-label)] transition-colors hover:border-[var(--color-seam-strong)]"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function buildSeamRefs(
  slug: string,
  seamsTouched: string[] | undefined,
  seams: AuxRecord[],
): Array<{ id: string; label: string; href: string }> {
  if (!seamsTouched || seamsTouched.length === 0) return [];
  const bySlug = new Map(seams.map((s) => [s.slug, s]));
  return seamsTouched
    .map((id) => {
      const rec = bySlug.get(id);
      const label = rec?.name ?? id;
      return { id, label, href: `/t/${slug}/aux/seams/#${id}` };
    });
}
