import path from "node:path";
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
  const params: Array<{ slug: string; component: string; sub: string }> = [];
  for (const slug of slugs) {
    const t = await loadTutorial(TUTORIALS_DIR, slug);
    for (const c of t.components) {
      if (c.type !== "subdivided" || !c.subSections) continue;
      for (const s of c.subSections) params.push({ slug, component: c.id, sub: s.id });
    }
  }
  return params;
}

interface Props {
  params: Promise<{ slug: string; component: string; sub: string }>;
}

export default async function SubSectionPage({ params }: Props) {
  const { slug, component, sub } = await params;

  let section, tutorial;
  try {
    section = await loadSection(TUTORIALS_DIR, slug, component, sub);
    tutorial = await loadTutorial(TUTORIALS_DIR, slug);
  } catch {
    notFound();
  }

  const [glossary, seamsAux] = await Promise.all([
    loadGlossaryIndex(TUTORIALS_DIR, slug),
    loadAux(TUTORIALS_DIR, slug, "seams"),
  ]);
  const seams = seamsAux ? parseAuxRecords(seamsAux.body) : [];

  const { html, toc } = await renderMarkdown(section.body, {
    slug,
    currentComponent: component,
    currentSub: sub,
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
        <SectionFooterNav tutorial={tutorial} frontmatter={section.frontmatter} />
        <RelatedFooter
          items={relatedFor(tutorial, `${component}/${sub}`, section.frontmatter.related)}
        />
      </article>
      <aside className="sticky top-10 hidden self-start lg:block">
        <PageToc items={toc} />
      </aside>
    </div>
  );
}
