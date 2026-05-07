export type ComponentType = "atomic" | "subdivided";

export interface SubSection {
  id: string;
  title: string;
  summary: string;
}

export interface Component {
  id: string;
  title: string;
  summary: string;
  type: ComponentType;
  subSections?: SubSection[];   // present only when type === "subdivided"; sub-sections are implicitly atomic
}

export interface CrossRef {
  from: string;          // "<component>" or "<component>/<sub>"
  to: string;
  note?: string;
}

export interface Tutorial {
  slug: string;
  name: string;
  source?: { path?: string; url?: string };
  generatedAt: string;
  generatorVersion?: string;
  summary: string;
  components: Component[];
  crossRefs?: CrossRef[];
}

export interface SectionFrontmatter {
  id: string;            // "intro" | "<component>" | "<component>/<sub>"
  title: string;
  summary: string;
  related?: string[];
}

export interface RenderedSection {
  frontmatter: SectionFrontmatter;
  html: string;
  toc: TocEntry[];
}

export interface TocEntry {
  depth: number;         // 2 for h2, 3 for h3
  text: string;
  slug: string;          // anchor id
}
