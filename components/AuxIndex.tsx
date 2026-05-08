import type { AuxId, AuxRecord } from "@/lib/types";

interface Props {
  auxId: AuxId;
  records: AuxRecord[];
}

/**
 * A compact, scannable index of the entries on an aux page. Sits above the rendered
 * markdown so the reader can jump straight to what they're looking for. Also doubles
 * as a visual signal that the page is a *reference*, not a chapter.
 *
 * The glossary uses a multi-column dense layout (typical reader is hunting for a
 * specific term). Other aux pages use a single-column list with the body summary,
 * since the entries are fewer and meant to be browsed.
 */
export function AuxIndex({ auxId, records }: Props) {
  if (records.length === 0) return null;

  if (auxId === "glossary") {
    const sorted = records.slice().sort((a, b) => a.name.localeCompare(b.name, "en"));
    return (
      <nav
        aria-label="Glossary index"
        className="not-prose mb-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5"
      >
        <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-muted)]">
          Terms
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3 md:grid-cols-4">
          {sorted.map((r) => (
            <li key={r.slug}>
              <a
                href={`#${r.slug}`}
                className="text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-accent)]"
              >
                {r.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav
      aria-label="On this page"
      className="not-prose mb-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5"
    >
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-muted)]">
        {auxId === "characters" ? "Cast" : auxId === "decisions" ? "Decisions" : "Seams"}
      </div>
      <ul className="mt-3 space-y-2">
        {records.map((r) => (
          <li key={r.slug}>
            <a
              href={`#${r.slug}`}
              className="block text-sm text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-accent)]"
            >
              {r.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
