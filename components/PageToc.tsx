import type { TocEntry } from "@/lib/types";

export function PageToc({ items }: { items: TocEntry[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="On this page" className="text-sm">
      <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
        On this page
      </div>
      <ul className="mt-3 space-y-1">
        {items.map((e) => (
          <li key={e.slug} className={e.depth === 3 ? "ml-3" : ""}>
            <a
              href={`#${e.slug}`}
              className="block py-0.5 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            >
              {e.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
