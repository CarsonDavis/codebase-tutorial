import path from "node:path";
import { notFound } from "next/navigation";
import {
  discoverTutorials,
  hasQuiz,
  loadQuiz,
  loadTutorial,
} from "@/lib/tutorials";
import { renderInlineMarkdown } from "@/lib/markdown";
import { Quiz } from "@/components/Quiz";
import type { QuizQuestionRendered, QuizRendered } from "@/lib/types";

const TUTORIALS_DIR = path.join(process.cwd(), "public/tutorials");

export async function generateStaticParams() {
  const slugs = await discoverTutorials(TUTORIALS_DIR);
  const params: Array<{ slug: string }> = [];
  for (const slug of slugs) {
    if (await hasQuiz(TUTORIALS_DIR, slug)) params.push({ slug });
  }
  return params;
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function QuizPage({ params }: Props) {
  const { slug } = await params;
  const [tutorial, quiz] = await Promise.all([
    loadTutorial(TUTORIALS_DIR, slug).catch(() => null),
    loadQuiz(TUTORIALS_DIR, slug),
  ]);
  if (!tutorial || !quiz) notFound();

  const questions = await Promise.all(
    quiz.questions.map(async (q): Promise<QuizQuestionRendered> => {
      const [promptHtml, reviewHtml, options] = await Promise.all([
        renderInlineMarkdown(q.prompt, { unwrapSingleParagraph: true }),
        renderInlineMarkdown(q.review),
        Promise.all(
          q.options.map(async (o) => ({
            id: o.id,
            textHtml: await renderInlineMarkdown(o.text, { unwrapSingleParagraph: true }),
            noteHtml: await renderInlineMarkdown(q.distractorNotes[o.id] ?? "", {
              unwrapSingleParagraph: true,
            }),
          })),
        ),
      ]);
      return {
        id: q.id,
        topic: q.topic,
        promptHtml,
        options,
        answer: q.answer,
        reviewHtml,
        groundedIn: q.groundedIn,
      };
    }),
  );

  const rendered: QuizRendered = {
    slug,
    title: quiz.title || `${tutorial.name} — quiz`,
    summary: quiz.summary,
    questions,
  };

  return (
    <div className="max-w-3xl">
      <header className="mb-8">
        <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-muted)]">
          Quiz
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{rendered.title}</h1>
        {rendered.summary && (
          <p className="mt-2 text-[var(--color-fg-muted)]">{rendered.summary}</p>
        )}
        <p className="mt-3 text-sm text-[var(--color-fg-muted)]">
          Pick an answer for each question. Once you commit, the review explains why
          the right answer is right and what each other option would have implied.
          Your progress saves locally — close the tab and come back later.
        </p>
      </header>

      <Quiz data={rendered} />
    </div>
  );
}
