import path from "node:path";
import { notFound } from "next/navigation";
import {
  discoverTutorials,
  loadTutorial,
  loadAux,
  loadGlossaryIndex,
  parseAuxRecords,
} from "@/lib/tutorials";
import { renderMarkdown } from "@/lib/markdown";
import { MarkdownBody } from "@/components/MarkdownBody";
import { PageToc } from "@/components/PageToc";
import { AuxIndex } from "@/components/AuxIndex";
import type { AuxId } from "@/lib/types";

const TUTORIALS_DIR = path.join(process.cwd(), "public/tutorials");
const VALID_AUX: AuxId[] = ["glossary", "characters", "decisions", "seams"];

export async function generateStaticParams() {
  const slugs = await discoverTutorials(TUTORIALS_DIR);
  const params: Array<{ slug: string; name: string }> = [];
  for (const slug of slugs) {
    const t = await loadTutorial(TUTORIALS_DIR, slug);
    if (!t.aux) continue;
    for (const a of t.aux) params.push({ slug, name: a.id });
  }
  return params;
}

interface Props {
  params: Promise<{ slug: string; name: string }>;
}

const TAGLINES: Record<AuxId, string> = {
  glossary: "Repo-specific vocabulary. The words you'd struggle to define on day one.",
  characters: "The named abstractions that recur across the codebase.",
  decisions: "The non-obvious choices that explain why things are shaped the way they are.",
  seams: "The boundaries where the system changes hands.",
};

export default async function AuxPage({ params }: Props) {
  const { slug, name } = await params;
  if (!VALID_AUX.includes(name as AuxId)) notFound();
  const auxId = name as AuxId;

  let tutorial, aux;
  try {
    tutorial = await loadTutorial(TUTORIALS_DIR, slug);
    aux = await loadAux(TUTORIALS_DIR, slug, auxId);
  } catch {
    notFound();
  }
  if (!aux) notFound();

  const records = parseAuxRecords(aux.body);
  const glossary = await loadGlossaryIndex(TUTORIALS_DIR, slug);
  // On the glossary page itself we don't auto-link terms (every term would link to its
  // own anchor — noise). On other aux pages we *do* auto-link, since referencing the
  // glossary from inside seams/characters/decisions is genuinely useful.
  const glossaryForRender = auxId === "glossary" ? [] : glossary;

  const { html, toc } = await renderMarkdown(aux.body, {
    slug,
    currentComponent: `aux/${auxId}`,
    glossary: glossaryForRender,
  });

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_14rem]">
      <article>
        <header className="mb-8">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-muted)]">
            Reference
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {aux.frontmatter.title || tutorial.aux?.find((a) => a.id === auxId)?.title || auxId}
          </h1>
          <p className="mt-2 text-[var(--color-fg-muted)]">{TAGLINES[auxId]}</p>
        </header>

        {records.length > 1 && <AuxIndex auxId={auxId} records={records} />}

        <MarkdownBody html={html} />
      </article>
      <aside className="sticky top-10 hidden self-start lg:block">
        <PageToc items={toc} />
      </aside>
    </div>
  );
}
