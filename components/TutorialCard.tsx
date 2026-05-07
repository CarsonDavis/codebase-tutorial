import Link from "next/link";

interface Props {
  slug: string;
  name: string;
  summary: string;
  generatedAt: string;
}

export function TutorialCard({ slug, name, summary, generatedAt }: Props) {
  const date = formatDate(generatedAt);
  return (
    <Link
      href={`/t/${slug}/`}
      className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5 transition-colors hover:border-[var(--color-accent)]"
    >
      <h2 className="text-lg font-semibold tracking-tight">{name}</h2>
      {date && <p className="mt-1 text-xs text-[var(--color-fg-muted)]">{date}</p>}
      <p className="mt-3 text-sm text-[var(--color-fg-muted)]">{summary}</p>
    </Link>
  );
}

function formatDate(iso: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
