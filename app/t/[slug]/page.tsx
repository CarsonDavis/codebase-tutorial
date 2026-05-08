import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  discoverTutorials,
  loadTutorial,
  loadIntro,
  loadAux,
  loadGlossaryIndex,
  parseAuxRecords,
} from "@/lib/tutorials";
import { renderMarkdown } from "@/lib/markdown";
import { MarkdownBody } from "@/components/MarkdownBody";
import { PageToc } from "@/components/PageToc";
import { SectionChrome } from "@/components/SectionChrome";
import { SectionFooterNav } from "@/components/SectionFooterNav";

const TUTORIALS_DIR = path.join(process.cwd(), "public/tutorials");

export async function generateStaticParams() {
  const slugs = await discoverTutorials(TUTORIALS_DIR);
  return slugs.map((slug) => ({ slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TutorialOverview({ params }: Props) {
  const { slug } = await params;
  let tutorial, intro;
  try {
    tutorial = await loadTutorial(TUTORIALS_DIR, slug);
    intro = await loadIntro(TUTORIALS_DIR, slug);
  } catch {
    notFound();
  }
  const [glossary, seamsAux] = await Promise.all([
    loadGlossaryIndex(TUTORIALS_DIR, slug),
    loadAux(TUTORIALS_DIR, slug, "seams"),
  ]);
  const seams = seamsAux ? parseAuxRecords(seamsAux.body) : [];

  const { html, toc } = await renderMarkdown(intro.body, {
    slug,
    currentComponent: "intro",
    glossary,
  });

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_14rem]">
      <article>
        <SectionChrome
          tutorial={tutorial}
          frontmatter={intro.frontmatter}
          seams={seams}
        />
        <MarkdownBody html={html} />

        <section className="mt-12 border-t border-[var(--color-border)] pt-8">
          <h2 className="text-xl font-semibold tracking-tight">Components</h2>
          <ul className="mt-4 space-y-3">
            {tutorial.components.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/t/${slug}/${c.id}/`}
                  className="block rounded-md border border-[var(--color-border)] p-4 transition-colors hover:border-[var(--color-accent)]"
                >
                  <div className="font-medium">{c.title}</div>
                  <div className="mt-1 text-sm text-[var(--color-fg-muted)]">{c.summary}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {tutorial.aux && tutorial.aux.length > 0 && (
          <section className="mt-12 border-t border-[var(--color-border)] pt-8">
            <h2 className="text-xl font-semibold tracking-tight">Reference</h2>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
              Cross-cutting addenda — vocabulary, named abstractions, decisions, seams.
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {tutorial.aux.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/t/${slug}/aux/${a.id}/`}
                    className="block h-full rounded-md border border-[var(--color-border)] p-4 transition-colors hover:border-[var(--color-accent)]"
                  >
                    <div className="font-medium">{a.title}</div>
                    <div className="mt-1 text-sm text-[var(--color-fg-muted)]">{a.summary}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <SectionFooterNav tutorial={tutorial} frontmatter={intro.frontmatter} />
      </article>
      <aside className="sticky top-10 hidden self-start lg:block">
        <PageToc items={toc} />
      </aside>
    </div>
  );
}
