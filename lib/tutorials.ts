import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import matter from "gray-matter";
import GithubSlugger from "github-slugger";
import { renderInlineMarkdown } from "./markdown";
import type {
  Tutorial,
  Component,
  CrossRef,
  SectionFrontmatter,
  AuxEntry,
  AuxId,
  AuxRecord,
  Quiz,
  QuizQuestion,
  QuizOptionId,
  QuizTopic,
} from "./types";

/**
 * One glossary term, ready for auto-linking and inline popover rendering. `definitionHtml`
 * is the term's body pre-rendered to HTML via `renderInlineMarkdown` (no callouts, no
 * recursive glossary auto-linking, no shiki) — exactly what the popover body needs.
 */
export interface GlossaryEntry {
  term: string;
  slug: string;
  href: string;
  definitionHtml: string;
}

const AUX_IDS: AuxId[] = ["glossary", "characters", "decisions", "seams"];

export async function discoverTutorials(rootDir: string): Promise<string[]> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const candidates = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  // A directory is a "tutorial" only once tutorial.yaml exists. Survey-only
  // directories are mid-pipeline and should not appear in the library.
  const slugs: string[] = [];
  for (const name of candidates) {
    try {
      await fs.access(path.join(rootDir, name, "tutorial.yaml"));
      slugs.push(name);
    } catch {
      // Skip incomplete tutorials.
    }
  }
  // Optional allowlist for production builds. Local dev leaves it unset so
  // every tutorial dir on disk shows up, including hand-written fixtures.
  const allowlist = (process.env.TUTORIAL_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowlist.length > 0) {
    return slugs.filter((s) => allowlist.includes(s));
  }
  return slugs;
}

export async function loadTutorial(rootDir: string, slug: string): Promise<Tutorial> {
  const file = path.join(rootDir, slug, "tutorial.yaml");
  const text = await readFileOrThrow(file, `tutorial ${slug}`);
  const raw = yaml.load(text) as Record<string, unknown>;
  return normalizeTutorial(raw, slug);
}

export interface SectionFile {
  frontmatter: SectionFrontmatter;
  body: string;
}

export async function loadIntro(rootDir: string, slug: string): Promise<SectionFile> {
  const file = path.join(rootDir, slug, "intro.md");
  return readSectionFile(file, `intro for ${slug}`);
}

export async function loadSection(
  rootDir: string,
  slug: string,
  componentId: string,
  subId?: string,
): Promise<SectionFile> {
  const base = path.join(rootDir, slug, "components", componentId);
  const file = subId ? path.join(base, `${subId}.md`) : path.join(base, "index.md");
  const label = subId ? `${componentId}/${subId}` : componentId;
  return readSectionFile(file, `section ${label} in ${slug}`);
}

/**
 * Load an aux page (`aux/<name>.md`). Returns null if the file does not exist — aux
 * pages are optional and a tutorial may have any subset.
 */
export async function loadAux(
  rootDir: string,
  slug: string,
  auxId: AuxId,
): Promise<SectionFile | null> {
  const file = path.join(rootDir, slug, "aux", `${auxId}.md`);
  try {
    await fs.access(file);
  } catch {
    return null;
  }
  return readSectionFile(file, `aux ${auxId} in ${slug}`);
}

/**
 * Parse an aux page into its h2-keyed records. Used to build the glossary index, the
 * character roster, etc. Each h2 becomes an entry; the body is the raw markdown
 * between this h2 and the next h2 (or end of file).
 */
export function parseAuxRecords(body: string): AuxRecord[] {
  const lines = body.split("\n");
  const records: AuxRecord[] = [];
  const slugger = new GithubSlugger();
  let current: { name: string; slug: string; lines: string[] } | null = null;

  for (const line of lines) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      if (current) {
        records.push({
          name: current.name,
          slug: current.slug,
          body: current.lines.join("\n").trim(),
        });
      }
      const name = m[1].trim();
      current = { name, slug: slugger.slug(name), lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) {
    records.push({
      name: current.name,
      slug: current.slug,
      body: current.lines.join("\n").trim(),
    });
  }
  return records;
}

/**
 * Build the glossary auto-link index for a tutorial. Each entry carries the term, its
 * anchor href on the glossary page, the slug used for popover IDs, and the rendered
 * definition HTML (for inline popovers on glossary terms in prose). Returns an empty
 * array if no glossary aux page exists. Sorted longest-first so multi-word terms are
 * matched before sub-strings.
 */
export async function loadGlossaryIndex(
  rootDir: string,
  slug: string,
): Promise<GlossaryEntry[]> {
  const aux = await loadAux(rootDir, slug, "glossary");
  if (!aux) return [];
  const records = parseAuxRecords(aux.body);
  const items = await Promise.all(
    records.map(async (r) => ({
      term: r.name,
      slug: r.slug,
      href: `/t/${slug}/aux/glossary/#${r.slug}`,
      definitionHtml: await renderInlineMarkdown(r.body),
    })),
  );
  items.sort((a, b) => b.term.length - a.term.length);
  return items;
}

/** Returns true if the tutorial has an `aux/quiz.yaml`. Used by the layout to decide
 *  whether to show the quiz link in the sidebar. */
export async function hasQuiz(rootDir: string, slug: string): Promise<boolean> {
  try {
    await fs.access(path.join(rootDir, slug, "aux", "quiz.yaml"));
    return true;
  } catch {
    return false;
  }
}

/** Loads and normalizes `aux/quiz.yaml`. Returns null if the file does not exist —
 *  quizzes are optional and discovered by filesystem presence (not registered in
 *  `tutorial.yaml`). */
export async function loadQuiz(rootDir: string, slug: string): Promise<Quiz | null> {
  const file = path.join(rootDir, slug, "aux", "quiz.yaml");
  let text: string;
  try {
    text = await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
  const raw = yaml.load(text) as Record<string, unknown>;
  return normalizeQuiz(raw, slug);
}

const QUIZ_TOPICS: QuizTopic[] = [
  "architecture",
  "decisions",
  "seams",
  "interactions",
  "tradeoffs",
];
const QUIZ_OPTION_IDS: QuizOptionId[] = ["a", "b", "c", "d"];

function normalizeQuiz(raw: Record<string, unknown>, slug: string): Quiz {
  const questionsRaw = (raw.questions as Array<Record<string, unknown>> | undefined) ?? [];
  return {
    slug,
    title: String(raw.title ?? `${slug} quiz`),
    summary: String(raw.summary ?? ""),
    generatedAt: String(raw.generated_at ?? ""),
    generatorVersion: raw.generator_version ? String(raw.generator_version) : undefined,
    questions: questionsRaw.map(normalizeQuizQuestion),
  };
}

function normalizeQuizQuestion(raw: Record<string, unknown>): QuizQuestion {
  const topicRaw = String(raw.topic ?? "");
  const topic: QuizTopic = (QUIZ_TOPICS as readonly string[]).includes(topicRaw)
    ? (topicRaw as QuizTopic)
    : "architecture";

  const options = ((raw.options as Array<Record<string, unknown>> | undefined) ?? []).map(
    (o) => ({
      id: normalizeOptionId(o.id),
      text: trimBlockScalar(String(o.text ?? "")),
    }),
  );

  const answer = normalizeOptionId(raw.answer);

  const notesRaw = (raw.distractor_notes as Record<string, unknown> | undefined) ?? {};
  const distractorNotes: Record<QuizOptionId, string> = {
    a: "",
    b: "",
    c: "",
    d: "",
  };
  for (const oid of QUIZ_OPTION_IDS) {
    if (notesRaw[oid] !== undefined) {
      distractorNotes[oid] = trimBlockScalar(String(notesRaw[oid]));
    }
  }

  const groundedInRaw = raw.grounded_in;
  const groundedIn = Array.isArray(groundedInRaw)
    ? groundedInRaw.map(String)
    : undefined;

  return {
    id: String(raw.id ?? ""),
    topic,
    prompt: trimBlockScalar(String(raw.prompt ?? "")),
    options,
    answer,
    review: trimBlockScalar(String(raw.review ?? "")),
    distractorNotes,
    groundedIn,
  };
}

function normalizeOptionId(raw: unknown): QuizOptionId {
  const s = String(raw ?? "").toLowerCase();
  return (QUIZ_OPTION_IDS as readonly string[]).includes(s)
    ? (s as QuizOptionId)
    : "a";
}

function trimBlockScalar(s: string): string {
  // YAML block scalars (`|`) preserve a trailing newline. Treat the value as a single
  // logical text block for rendering purposes.
  return s.replace(/\n+$/, "");
}

async function readFileOrThrow(file: string, label: string): Promise<string> {
  try {
    return await fs.readFile(file, "utf8");
  } catch (err: unknown) {
    if (isNodeErrno(err) && err.code === "ENOENT") {
      throw new Error(`${label} not found at ${file}`);
    }
    throw err;
  }
}

async function readSectionFile(file: string, label: string): Promise<SectionFile> {
  const text = await readFileOrThrow(file, label);
  const parsed = matter(text);
  const fm = normalizeFrontmatter(parsed.data as Record<string, unknown>);
  return { frontmatter: fm, body: parsed.content };
}

function normalizeFrontmatter(raw: Record<string, unknown>): SectionFrontmatter {
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    summary: String(raw.summary ?? ""),
    related: stringArray(raw.related),
    keyIdea: raw.key_idea !== undefined ? String(raw.key_idea) : undefined,
    watchOut: stringArray(raw.watch_out),
    seamsTouched: stringArray(raw.seams_touched),
    prerequisites: stringArray(raw.prerequisites),
    next: stringArray(raw.next),
  };
}

function stringArray(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (Array.isArray(raw)) return raw.map(String);
  // Single string is also accepted (e.g., `next: foo/bar`).
  return [String(raw)];
}

function normalizeTutorial(raw: Record<string, unknown>, slug: string): Tutorial {
  const components = (raw.components as Array<Record<string, unknown>> | undefined) ?? [];
  return {
    slug,
    name: String(raw.name ?? slug),
    summary: String(raw.summary ?? ""),
    generatedAt: String(raw.generated_at ?? ""),
    generatorVersion: raw.generator_version ? String(raw.generator_version) : undefined,
    source: raw.source as Tutorial["source"],
    components: components.map(normalizeComponent),
    crossRefs: normalizeCrossRefs(raw.cross_refs),
    aux: normalizeAux(raw.aux),
  };
}

function normalizeAux(raw: unknown): AuxEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const entries: AuxEntry[] = [];
  for (const r of raw) {
    const item = r as Record<string, unknown>;
    const id = String(item.id ?? "");
    if (!AUX_IDS.includes(id as AuxId)) continue;
    entries.push({
      id: id as AuxId,
      title: String(item.title ?? id),
      summary: String(item.summary ?? ""),
    });
  }
  return entries.length > 0 ? entries : undefined;
}

function normalizeCrossRefs(raw: unknown): CrossRef[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((r): CrossRef => {
    const item = r as Record<string, unknown>;
    const cr: CrossRef = {
      from: String(item.from),
      to: String(item.to),
    };
    if (item.note !== undefined) cr.note = String(item.note);
    return cr;
  });
}

function normalizeComponent(raw: Record<string, unknown>): Component {
  const subs = raw.sub_sections as Array<Record<string, unknown>> | undefined;
  return {
    id: String(raw.id),
    title: String(raw.title),
    summary: String(raw.summary ?? ""),
    type: raw.type === "subdivided" ? "subdivided" : "atomic",
    subSections: subs?.map((s) => ({
      id: String(s.id),
      title: String(s.title),
      summary: String(s.summary ?? ""),
    })),
  };
}

function isNodeErrno(e: unknown): e is NodeJS.ErrnoException {
  return typeof e === "object" && e !== null && "code" in e;
}
