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

export type AuxId = "glossary" | "characters" | "decisions" | "seams";

export interface AuxEntry {
  id: AuxId;
  title: string;
  summary: string;
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
  aux?: AuxEntry[];
}

export interface SectionFrontmatter {
  id: string;            // "intro" | "<component>" | "<component>/<sub>" | "aux/<name>"
  title: string;
  summary: string;
  related?: string[];
  // Stage 2 chrome
  keyIdea?: string;
  // Stage 4 chrome
  watchOut?: string[];
  seamsTouched?: string[];
  prerequisites?: string[];
  next?: string[];
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

/**
 * One entry inside an aux page (a glossary term, a character, a decision, a seam). The
 * renderer parses h2 headings out of aux markdown to build these.
 */
export interface AuxRecord {
  /** The h2 text, verbatim. Used as the canonical name. */
  name: string;
  /** github-slugger slug, matches the rendered heading id. Stable anchor. */
  slug: string;
  /** Body markdown beneath the h2, up to the next h2 or end of file. */
  body: string;
}
