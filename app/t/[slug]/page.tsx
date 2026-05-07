import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { discoverTutorials, loadTutorial, loadIntro } from "@/lib/tutorials";
import { renderMarkdown } from "@/lib/markdown";
import { MarkdownBody } from "@/components/MarkdownBody";

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
  const { html } = await renderMarkdown(intro.body, {
    slug,
    currentComponent: "intro",
  });

  return (
    <article>
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
    </article>
  );
}
