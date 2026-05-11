"use client";

import { useEffect, useMemo, useState } from "react";
import type { QuizOptionId, QuizRendered, QuizQuestionRendered } from "@/lib/types";

interface Props {
  data: QuizRendered;
}

type Answers = Record<string, QuizOptionId | undefined>;

const TOPIC_LABEL: Record<string, string> = {
  architecture: "Architecture",
  decisions: "Decisions",
  seams: "Seams",
  interactions: "Interactions",
  tradeoffs: "Tradeoffs",
};

const OPTION_LABEL: Record<QuizOptionId, string> = {
  a: "A",
  b: "B",
  c: "C",
  d: "D",
};

function storageKey(slug: string): string {
  return `quiz:${slug}:v1`;
}

export function Quiz({ data }: Props) {
  const [answers, setAnswers] = useState<Answers>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(data.slug));
      if (raw) {
        const parsed = JSON.parse(raw) as Answers;
        if (parsed && typeof parsed === "object") setAnswers(parsed);
      }
    } catch {
      // Ignore — start fresh.
    }
    setHydrated(true);
  }, [data.slug]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey(data.slug), JSON.stringify(answers));
    } catch {
      // Storage full or disabled — fine, runtime state still works.
    }
  }, [answers, data.slug, hydrated]);

  const stats = useMemo(() => {
    let answered = 0;
    let correct = 0;
    for (const q of data.questions) {
      const a = answers[q.id];
      if (a) {
        answered += 1;
        if (a === q.answer) correct += 1;
      }
    }
    return { answered, correct, total: data.questions.length };
  }, [answers, data.questions]);

  function pick(qid: string, oid: QuizOptionId) {
    setAnswers((prev) => {
      if (prev[qid]) return prev;          // commit once; no re-answers
      return { ...prev, [qid]: oid };
    });
  }

  function reset() {
    if (
      stats.answered > 0 &&
      !window.confirm("Reset the quiz? Your answers will be cleared.")
    ) {
      return;
    }
    setAnswers({});
    try {
      window.localStorage.removeItem(storageKey(data.slug));
    } catch {
      // Ignore.
    }
  }

  return (
    <div className="space-y-6">
      <ProgressBar
        answered={stats.answered}
        correct={stats.correct}
        total={stats.total}
        onReset={reset}
      />

      <ol className="space-y-6">
        {data.questions.map((q, i) => (
          <li key={q.id}>
            <QuestionCard
              index={i + 1}
              question={q}
              chosen={answers[q.id]}
              onPick={(oid) => pick(q.id, oid)}
            />
          </li>
        ))}
      </ol>

      {stats.answered === stats.total && stats.total > 0 && (
        <FinalScore correct={stats.correct} total={stats.total} onReset={reset} />
      )}
    </div>
  );
}

function ProgressBar({
  answered,
  correct,
  total,
  onReset,
}: {
  answered: number;
  correct: number;
  total: number;
  onReset: () => void;
}) {
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);
  return (
    <div className="sticky top-0 z-10 -mx-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-[var(--color-fg-muted)]">
          <span className="font-medium text-[var(--color-fg)]">{answered}</span>
          {" of "}
          <span className="font-medium text-[var(--color-fg)]">{total}</span>
          {" answered"}
          {answered > 0 && (
            <>
              {" · "}
              <span className="text-[var(--color-fg)]">{correct} correct</span>
            </>
          )}
        </div>
        {answered > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-[var(--color-fg-muted)] underline-offset-2 hover:text-[var(--color-fg)] hover:underline"
          >
            Reset
          </button>
        )}
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--color-border)]">
        <div
          className="h-full bg-[var(--color-accent)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function QuestionCard({
  index,
  question,
  chosen,
  onPick,
}: {
  index: number;
  question: QuizQuestionRendered;
  chosen: QuizOptionId | undefined;
  onPick: (oid: QuizOptionId) => void;
}) {
  const isAnswered = chosen !== undefined;
  const isCorrect = chosen === question.answer;
  const topicLabel = TOPIC_LABEL[question.topic] ?? question.topic;

  return (
    <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-muted)]">
          Question {index}
        </div>
        <div className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-muted)]">
          {topicLabel}
        </div>
      </div>

      <h2
        className="quiz-inline mt-3 text-lg font-semibold leading-snug text-[var(--color-fg)]"
        dangerouslySetInnerHTML={{ __html: question.promptHtml }}
      />

      <ul className="mt-4 space-y-2">
        {question.options.map((o) => {
          const isChosen = chosen === o.id;
          const isAnswer = o.id === question.answer;
          const state = !isAnswered
            ? "pending"
            : isAnswer
              ? "correct"
              : isChosen
                ? "wrong"
                : "muted";
          return (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => onPick(o.id)}
                disabled={isAnswered}
                aria-pressed={isChosen}
                className={`quiz-option quiz-option--${state} w-full rounded-md border px-4 py-3 text-left transition-colors`}
              >
                <div className="flex items-start gap-3">
                  <span className="quiz-option-letter mt-[2px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border text-[11px] font-semibold">
                    {OPTION_LABEL[o.id]}
                  </span>
                  <div className="flex-1">
                    <div
                      className="quiz-inline text-[15px] leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: o.textHtml }}
                    />
                    {isAnswered && o.noteHtml && (
                      <div
                        className="quiz-inline mt-2 text-[13px] italic leading-relaxed text-[var(--color-fg-muted)]"
                        dangerouslySetInnerHTML={{ __html: o.noteHtml }}
                      />
                    )}
                  </div>
                  {isAnswered && (
                    <span className="quiz-option-badge mt-[2px] text-xs font-medium">
                      {isAnswer ? "Correct" : isChosen ? "Your pick" : ""}
                    </span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {isAnswered && (
        <div className="mt-5 rounded-md border border-[var(--color-keyidea-border)] bg-[var(--color-keyidea-bg)] p-4">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-keyidea-label)]">
            {isCorrect ? "Why this is right" : "What the right answer teaches"}
          </div>
          <div
            className="prose prose-invert prose-sm mt-2 max-w-none"
            dangerouslySetInnerHTML={{ __html: question.reviewHtml }}
          />
          {question.groundedIn && question.groundedIn.length > 0 && (
            <div className="mt-3 text-[11px] text-[var(--color-fg-muted)]">
              Grounded in: {question.groundedIn.join(", ")}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function FinalScore({
  correct,
  total,
  onReset,
}: {
  correct: number;
  total: number;
  onReset: () => void;
}) {
  const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
  const tone =
    pct >= 80 ? "great" : pct >= 50 ? "ok" : "needs-work";
  const blurb =
    tone === "great"
      ? "Strong big-picture grasp. You can hold the architecture in your head."
      : tone === "ok"
        ? "Good footing. Skim the reviews on the ones you missed — they're where the real learning lives."
        : "Worth a re-read of the tutorial. Then come back and re-take.";
  return (
    <div className="rounded-lg border border-[var(--color-accent)] bg-[var(--color-keyidea-bg)] p-5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-keyidea-label)]">
        Done
      </div>
      <div className="mt-1 text-2xl font-semibold text-[var(--color-fg)]">
        {correct} / {total} correct
      </div>
      <p className="mt-2 text-sm text-[var(--color-fg-muted)]">{blurb}</p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-fg)]"
      >
        Reset and retake
      </button>
    </div>
  );
}
