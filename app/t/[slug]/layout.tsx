import path from "node:path";
import { notFound } from "next/navigation";
import { loadTutorial } from "@/lib/tutorials";
import { TutorialNav } from "@/components/TutorialNav";
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

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-[16rem_1fr] gap-8 px-6 py-10">
      <aside className="sticky top-10 self-start">
        <TutorialNav slug={slug} components={tutorial.components} aux={tutorial.aux} />
      </aside>
      <div>{children}</div>
    </div>
  );
}
