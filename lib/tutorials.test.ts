import { describe, it, expect } from "vitest";
import path from "node:path";
import {
  discoverTutorials,
  loadTutorial,
  loadIntro,
  loadSection,
  loadAux,
  parseAuxRecords,
} from "./tutorials";

const ROOT = path.resolve(process.cwd(), "public/tutorials");

describe("discoverTutorials", () => {
  it("lists slugs from the tutorials directory", async () => {
    const slugs = await discoverTutorials(ROOT);
    expect(slugs).toContain("example-repo");
  });

  it("skips directories without a tutorial.yaml (mid-pipeline)", async () => {
    const tmpRoot = path.join(ROOT, "..", "tmp-tutorials-test");
    const fs = await import("node:fs/promises");
    await fs.rm(tmpRoot, { recursive: true, force: true });
    await fs.mkdir(path.join(tmpRoot, "complete"), { recursive: true });
    await fs.mkdir(path.join(tmpRoot, "survey-only"), { recursive: true });
    await fs.writeFile(path.join(tmpRoot, "complete", "tutorial.yaml"), "slug: complete\n");
    await fs.writeFile(path.join(tmpRoot, "survey-only", "survey.yaml"), "slug: survey-only\n");

    const slugs = await discoverTutorials(tmpRoot);

    await fs.rm(tmpRoot, { recursive: true, force: true });
    expect(slugs).toEqual(["complete"]);
  });
});

describe("loadTutorial", () => {
  it("parses tutorial.yaml into a Tutorial", async () => {
    const t = await loadTutorial(ROOT, "example-repo");
    expect(t.slug).toBe("example-repo");
    expect(t.name).toBe("Example Repo");
    expect(t.components.map((c) => c.id)).toEqual(["backend", "iac", "frontend"]);
    const fe = t.components.find((c) => c.id === "frontend")!;
    expect(fe.type).toBe("subdivided");
    expect(fe.subSections?.map((s) => s.id)).toEqual(["routing", "state-management"]);
  });

  it("throws a clear error when the tutorial is missing", async () => {
    await expect(loadTutorial(ROOT, "no-such-slug")).rejects.toThrow(/no-such-slug/);
  });

  it("normalizes cross_refs into camelCase entries", async () => {
    const t = await loadTutorial(ROOT, "example-repo");
    expect(t.crossRefs).toEqual([
      {
        from: "frontend/state-management",
        to: "backend",
        note: "The store hits the API endpoints exposed here.",
      },
      {
        from: "iac",
        to: "backend",
        note: "The API stack provisions the runtime for the backend.",
      },
    ]);
  });
});

describe("loadIntro", () => {
  it("reads intro.md and parses frontmatter", async () => {
    const intro = await loadIntro(ROOT, "example-repo");
    expect(intro.frontmatter.id).toBe("intro");
    expect(intro.body).toMatch(/Example Repo — overview/);
  });
});

describe("loadSection", () => {
  it("reads an atomic component's index.md", async () => {
    const s = await loadSection(ROOT, "example-repo", "backend");
    expect(s.frontmatter.id).toBe("backend");
    expect(s.body).toMatch(/^# Backend/m);
  });

  it("reads a subdivided component's index.md when sub is omitted", async () => {
    const s = await loadSection(ROOT, "example-repo", "frontend");
    expect(s.frontmatter.id).toBe("frontend");
  });

  it("reads a sub-section when sub is provided", async () => {
    const s = await loadSection(ROOT, "example-repo", "frontend", "routing");
    expect(s.frontmatter.id).toBe("frontend/routing");
    expect(s.body).toMatch(/File-based routing/);
  });

  it("throws for a missing sub-section", async () => {
    await expect(
      loadSection(ROOT, "example-repo", "frontend", "no-such-sub"),
    ).rejects.toThrow(/no-such-sub/);
  });
});

describe("parseAuxRecords", () => {
  it("splits an aux body on h2 headings into records", () => {
    const body = `Intro paragraph.\n\n## L_\n\nThe global state.\n\n## Mission\n\nA bundle.\n`;
    const records = parseAuxRecords(body);
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({ name: "L_", slug: "l_" });
    expect(records[0].body).toContain("global state");
    expect(records[1]).toMatchObject({ name: "Mission", slug: "mission" });
  });

  it("returns an empty array when no h2 headings exist", () => {
    expect(parseAuxRecords("just text")).toEqual([]);
  });

  it("ignores h1 and h3 (only h2 are entry boundaries)", () => {
    const body = `# top\n\n## A\n\n### nested\n\nbody\n\n## B\n\nbody\n`;
    const records = parseAuxRecords(body);
    expect(records.map((r) => r.name)).toEqual(["A", "B"]);
    expect(records[0].body).toContain("### nested");
  });
});

describe("loadAux", () => {
  it("returns null when the aux file does not exist", async () => {
    const aux = await loadAux(ROOT, "example-repo", "glossary");
    expect(aux).toBeNull();
  });
});
