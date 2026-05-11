"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Component, AuxEntry } from "@/lib/types";

interface Props {
  slug: string;
  components: Component[];
  aux?: AuxEntry[];
  hasQuiz?: boolean;
}

export function TutorialNav({ slug, components, aux, hasQuiz }: Props) {
  const pathname = usePathname();
  const overviewHref = `/t/${slug}/`;

  return (
    <nav className="text-sm">
      <Link
        href="/"
        className="block text-xs uppercase tracking-wide text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
      >
        ← All tutorials
      </Link>

      <Link
        href={overviewHref}
        className={navClass(pathname === overviewHref)}
      >
        Overview
      </Link>

      <ul className="mt-4 space-y-2">
        {components.map((c) => {
          const compHref = `/t/${slug}/${c.id}/`;
          const compActive = pathname === compHref;
          return (
            <li key={c.id}>
              <Link href={compHref} className={navClass(compActive)}>
                {c.title}
              </Link>
              {c.type === "subdivided" && c.subSections && (
                <ul className="ml-3 mt-1 space-y-1 border-l border-[var(--color-border)] pl-3">
                  {c.subSections.map((s) => {
                    const subHref = `/t/${slug}/${c.id}/${s.id}/`;
                    return (
                      <li key={s.id}>
                        <Link href={subHref} className={navClass(pathname === subHref)}>
                          {s.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {aux && aux.length > 0 && (
        <>
          <div className="mt-6 border-t border-[var(--color-border)] pt-4 text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-muted)]">
            Reference
          </div>
          <ul className="mt-2 space-y-2">
            {aux.map((a) => {
              const auxHref = `/t/${slug}/aux/${a.id}/`;
              return (
                <li key={a.id}>
                  <Link href={auxHref} className={navClass(pathname === auxHref)}>
                    {a.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {hasQuiz && (
        <>
          <div className="mt-6 border-t border-[var(--color-border)] pt-4 text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-muted)]">
            Test yourself
          </div>
          <ul className="mt-2 space-y-2">
            <li>
              <Link
                href={`/t/${slug}/quiz/`}
                className={navClass(pathname === `/t/${slug}/quiz/`)}
              >
                Quiz
              </Link>
            </li>
          </ul>
        </>
      )}
    </nav>
  );
}

function navClass(active: boolean): string {
  return active
    ? "block py-1 text-[var(--color-accent)]"
    : "block py-1 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]";
}
