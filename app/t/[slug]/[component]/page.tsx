import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  discoverTutorials,
  loadTutorial,
  loadSection,
  loadAux,
  loadGlossaryIndex,
  parseAuxRecords,
} from "@/lib/tutorials";
import { renderMarkdown } from "@/lib/markdown";
import { MarkdownBody } from "@/components/MarkdownBody";
import { RelatedFooter } from "@/components/RelatedFooter";
import { PageToc } from "@/components/PageToc";
import { SectionChrome } from "@/components/SectionChrome";
import { SectionFooterNav } from "@/components/SectionFooterNav";
import { relatedFor } from "@/lib/paths";

const TUTORIALS_DIR = path.join(process.cwd(), "public/tutorials");

export async function generateStaticParams() {
  const slugs = await discoverTutorials(TUTORIALS_DIR);
  const params: Array<{ slug: string; component: string }> = [];
  for (const slug of slugs) {
    const t = await loadTutorial(TUTORIALS_DIR, slug);
    for (const c of t.components) params.push({ slug, component: c.id });
  }
  return params;
}

interface Props {
  params: Promise<{ slug: string; component: string }>;
}

export default async function ComponentPage({ params }: Props) {
  const { slug, component } = await params;

  let tutorial, section;
  try {
    tutorial = await loadTutorial(TUTORIALS_DIR, slug);
    section = await loadSection(TUTORIALS_DIR, slug, component);
  } catch {
    notFound();
  }

  const meta = tutorial.components.find((c) => c.id === component);
  if (!meta) notFound();

  const [glossary, seamsAux] = await Promise.all([
    loadGlossaryIndex(TUTORIALS_DIR, slug),
    loadAux(TUTORIALS_DIR, slug, "seams"),
  ]);
  const seams = seamsAux ? parseAuxRecords(seamsAux.body) : [];

  const { html, toc } = await renderMarkdown(section.body, {
    slug,
    currentComponent: component,
    glossary,
  });

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_14rem]">
      <article>
        <SectionChrome
          tutorial={tutorial}
          frontmatter={section.frontmatter}
          seams={seams}
        />
        <MarkdownBody html={html} />

        {meta!.type === "subdivided" && meta!.subSections && (
          <section className="mt-12 border-t border-[var(--color-border)] pt-8">
            <h2 className="text-xl font-semibold tracking-tight">In this component</h2>
            <ul className="mt-4 space-y-3">
              {meta!.subSections.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/t/${slug}/${component}/${s.id}/`}
                    className="block rounded-md border border-[var(--color-border)] p-4 transition-colors hover:border-[var(--color-accent)]"
                  >
                    <div className="font-medium">{s.title}</div>
                    <div className="mt-1 text-sm text-[var(--color-fg-muted)]">{s.summary}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <SectionFooterNav tutorial={tutorial} frontmatter={section.frontmatter} />

        <RelatedFooter
          items={relatedFor(tutorial, component, section.frontmatter.related)}
        />
      </article>
      <aside className="sticky top-10 hidden self-start lg:block">
        <PageToc items={toc} />
      </aside>
    </div>
  );
}
