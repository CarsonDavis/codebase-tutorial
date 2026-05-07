import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import matter from "gray-matter";
import type { Tutorial, Component, CrossRef, SectionFrontmatter } from "./types";

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
  const fm = parsed.data as SectionFrontmatter;
  return { frontmatter: fm, body: parsed.content };
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
  };
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
