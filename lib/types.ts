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

export type QuizTopic = "architecture" | "decisions" | "seams" | "interactions" | "tradeoffs";
export type QuizOptionId = "a" | "b" | "c" | "d";

export interface QuizQuestion {
  id: string;
  topic: QuizTopic;
  prompt: string;                                       // raw markdown
  options: Array<{ id: QuizOptionId; text: string }>;
  answer: QuizOptionId;
  review: string;                                       // raw markdown
  distractorNotes: Record<QuizOptionId, string>;        // raw markdown per option
  groundedIn?: string[];
}

export interface Quiz {
  slug: string;
  title: string;
  summary: string;
  generatedAt: string;
  generatorVersion?: string;
  questions: QuizQuestion[];
}

/**
 * The shape passed to the interactive client component — each markdown field has been
 * pre-rendered to inline HTML at build time so the client never imports the markdown
 * pipeline.
 */
export interface QuizRendered {
  slug: string;
  title: string;
  summary: string;
  questions: QuizQuestionRendered[];
}

export interface QuizQuestionRendered {
  id: string;
  topic: QuizTopic;
  promptHtml: string;
  options: Array<{ id: QuizOptionId; textHtml: string; noteHtml: string }>;
  answer: QuizOptionId;
  reviewHtml: string;
  groundedIn?: string[];
}
