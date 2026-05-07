import Link from "next/link";
import type { SectionRef } from "@/lib/paths";

export function RelatedFooter({ items }: { items: SectionRef[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-12 border-t border-[var(--color-border)] pt-8">
      <h2 className="text-xl font-semibold tracking-tight">Related</h2>
      <ul className="mt-4 space-y-3">
        {items.map((r) => (
          <li key={r.id}>
            <Link
              href={r.href}
              className="block rounded-md border border-[var(--color-border)] p-4 transition-colors hover:border-[var(--color-accent)]"
            >
              <div className="font-medium">{r.title}</div>
              <div className="mt-1 text-sm text-[var(--color-fg-muted)]">{r.summary}</div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
