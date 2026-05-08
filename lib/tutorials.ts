import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import matter from "gray-matter";
import GithubSlugger from "github-slugger";
import type {
  Tutorial,
  Component,
  CrossRef,
  SectionFrontmatter,
  AuxEntry,
  AuxId,
  AuxRecord,
} from "./types";

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
 * Build the glossary auto-link index for a tutorial: maps each term name to its
 * anchor href on the glossary page. Returns an empty map if no glossary aux page
 * exists. Sorted longest-first so multi-word terms are matched before sub-strings.
 */
export async function loadGlossaryIndex(
  rootDir: string,
  slug: string,
): Promise<Array<{ term: string; href: string }>> {
  const aux = await loadAux(rootDir, slug, "glossary");
  if (!aux) return [];
  const records = parseAuxRecords(aux.body);
  const items = records.map((r) => ({
    term: r.name,
    href: `/t/${slug}/aux/glossary/#${r.slug}`,
  }));
  items.sort((a, b) => b.term.length - a.term.length);
  return items;
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
