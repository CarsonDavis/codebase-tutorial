import Link from "next/link";
import type { SectionFrontmatter, Tutorial } from "@/lib/types";
import { resolveSectionRef } from "@/lib/paths";

interface Props {
  tutorial: Tutorial;
  frontmatter: SectionFrontmatter;
}

/**
 * Bottom-of-page chrome: the suggested next read. Rendered above the Related footer
 * so the eye lands on the most opinionated affordance first.
 */
export function SectionFooterNav({ tutorial, frontmatter }: Props) {
  const nextIds = frontmatter.next ?? [];
  const nextRefs = nextIds
    .map((id) => resolveSectionRef(tutorial, id))
    .filter((r): r is NonNullable<ReturnType<typeof resolveSectionRef>> => r !== null);
  if (nextRefs.length === 0) return null;
  // Convention is one entry; if a writer added several we render the first.
  const next = nextRefs[0];
  return (
    <section className="mt-12">
      <Link
        href={next.href}
        className="group block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5 transition-colors hover:border-[var(--color-accent)]"
      >
        <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-muted)]">
          Read next
        </div>
        <div className="mt-1 flex items-baseline gap-2 text-base font-medium">
          {next.title}
          <span className="text-[var(--color-fg-muted)] transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{next.summary}</p>
      </Link>
    </section>
  );
}
