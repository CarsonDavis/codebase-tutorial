import path from "node:path";
import { notFound } from "next/navigation";
import { discoverTutorials, loadTutorial, loadSection } from "@/lib/tutorials";
import { renderMarkdown } from "@/lib/markdown";
import { MarkdownBody } from "@/components/MarkdownBody";

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

  let section;
  try {
    section = await loadSection(TUTORIALS_DIR, slug, component, sub);
  } catch {
    notFound();
  }

  const { html } = await renderMarkdown(section.body, {
    slug,
    currentComponent: component,
    currentSub: sub,
  });

  return (
    <article>
      <MarkdownBody html={html} />
    </article>
  );
}
