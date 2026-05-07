import { describe, it, expect } from "vitest";
import path from "node:path";
import {
  discoverTutorials,
  loadTutorial,
  loadIntro,
  loadSection,
} from "./tutorials";

const ROOT = path.resolve(process.cwd(), "public/tutorials");

describe("discoverTutorials", () => {
  it("lists slugs from the tutorials directory", async () => {
    const slugs = await discoverTutorials(ROOT);
    expect(slugs).toContain("example-repo");
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
