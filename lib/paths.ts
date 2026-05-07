import type { Tutorial } from "./types";

export interface SectionRef {
  id: string;          // "<component>" or "<component>/<sub>"
  title: string;
  summary: string;
  href: string;
}

export function resolveSectionRef(t: Tutorial, id: string): SectionRef | null {
  const [componentId, subId] = id.split("/");
  const component = t.components.find((c) => c.id === componentId);
  if (!component) return null;
  if (!subId) {
    return {
      id: component.id,
      title: component.title,
      summary: component.summary,
      href: `/t/${t.slug}/${component.id}/`,
    };
  }
  const sub = component.subSections?.find((s) => s.id === subId);
  if (!sub) return null;
  return {
    id: `${component.id}/${sub.id}`,
    title: `${component.title} — ${sub.title}`,
    summary: sub.summary,
    href: `/t/${t.slug}/${component.id}/${sub.id}/`,
  };
}

export function relatedFor(
  t: Tutorial,
  currentId: string,
  frontmatterRelated: string[] | undefined,
): SectionRef[] {
  const ids = new Set<string>(frontmatterRelated ?? []);
  for (const cr of t.crossRefs ?? []) {
    if (cr.from === currentId) ids.add(cr.to);
  }
  ids.delete(currentId);
  return [...ids]
    .map((id) => resolveSectionRef(t, id))
    .filter((r): r is SectionRef => r !== null);
}
