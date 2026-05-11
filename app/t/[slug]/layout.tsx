import path from "node:path";
import { notFound } from "next/navigation";
import { hasQuiz, loadTutorial } from "@/lib/tutorials";
import { TutorialNav } from "@/components/TutorialNav";
import { TutorialNavMobile } from "@/components/TutorialNavMobile";
import type { ReactNode } from "react";

const TUTORIALS_DIR = path.join(process.cwd(), "public/tutorials");

interface Props {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function TutorialLayout({ children, params }: Props) {
  const { slug } = await params;
  let tutorial;
  try {
    tutorial = await loadTutorial(TUTORIALS_DIR, slug);
  } catch {
    notFound();
  }
  const quizAvailable = await hasQuiz(TUTORIALS_DIR, slug);

  return (
    <>
      <TutorialNavMobile
        slug={slug}
        components={tutorial.components}
        aux={tutorial.aux}
        hasQuiz={quizAvailable}
      />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 pb-10 pt-[4.5rem] lg:grid-cols-[16rem_1fr] lg:pt-10">
        <aside className="sticky top-10 hidden self-start lg:block">
          <TutorialNav
            slug={slug}
            components={tutorial.components}
            aux={tutorial.aux}
            hasQuiz={quizAvailable}
          />
        </aside>
        <div>{children}</div>
      </div>
    </>
  );
}
