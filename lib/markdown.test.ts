import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown — link rewriting", () => {
  it("rewrites relative .md link from a sub-section to a sibling sub-section", async () => {
    const body = `[routing](./routing.md)`;
    const { html } = await renderMarkdown(body, {
      slug: "example",
      currentComponent: "frontend",
      currentSub: "state-management",
    });
    expect(html).toContain('href="/t/example/frontend/routing/"');
  });

  it("rewrites relative .md link to a different component", async () => {
    const body = `[backend](../backend/index.md)`;
    const { html } = await renderMarkdown(body, {
      slug: "example",
      currentComponent: "frontend",
      currentSub: "routing",
    });
    expect(html).toContain('href="/t/example/backend/"');
  });

  it("leaves absolute links untouched", async () => {
    const body = `[anthropic](https://anthropic.com)`;
    const { html } = await renderMarkdown(body, {
      slug: "example",
      currentComponent: "frontend",
    });
    expect(html).toContain('href="https://anthropic.com"');
  });

  it("leaves hash links and root-relative links untouched", async () => {
    const body = `[h](#somewhere) and [r](/elsewhere)`;
    const { html } = await renderMarkdown(body, {
      slug: "example",
      currentComponent: "frontend",
    });
    expect(html).toContain('href="#somewhere"');
    expect(html).toContain('href="/elsewhere"');
  });
});

describe("renderMarkdown — code highlighting", () => {
  it("highlights fenced code with Shiki", async () => {
    const body = "```ts\nconst x = 1;\n```\n";
    const { html } = await renderMarkdown(body, {
      slug: "example",
      currentComponent: "backend",
    });
    expect(html).toContain("shiki");          // Shiki adds a class on the <pre>
    expect(html).toContain("color:");         // inline color styles from highlighting
  });
});

describe("renderMarkdown — TOC", () => {
  it("extracts h2 and h3 entries with slugs", async () => {
    const body = `## First section\n\nbody\n\n### Nested\n\nbody\n\n## Second section\n`;
    const { toc } = await renderMarkdown(body, {
      slug: "example",
      currentComponent: "backend",
    });
    expect(toc).toEqual([
      { depth: 2, text: "First section", slug: "first-section" },
      { depth: 3, text: "Nested", slug: "nested" },
      { depth: 2, text: "Second section", slug: "second-section" },
    ]);
  });

  it("returns an empty toc when there are no h2 or h3", async () => {
    const body = `Just a paragraph.\n`;
    const { toc } = await renderMarkdown(body, {
      slug: "example",
      currentComponent: "backend",
    });
    expect(toc).toEqual([]);
  });

  it("extracts heading text from inline markup (emphasis, code, links)", async () => {
    const body = `## *Emphasized* heading\n\n### Plain \`code\` here\n`;
    const { toc } = await renderMarkdown(body, {
      slug: "example",
      currentComponent: "backend",
    });
    expect(toc).toEqual([
      { depth: 2, text: "Emphasized heading", slug: "emphasized-heading" },
      { depth: 3, text: "Plain code here", slug: "plain-code-here" },
    ]);
  });

  it("uses github-slugger so toc slugs match rendered heading ids", async () => {
    const body = `## API & SDK\n`;
    const { html, toc } = await renderMarkdown(body, {
      slug: "example",
      currentComponent: "backend",
    });
    expect(toc).toHaveLength(1);
    // The toc slug must match the actual id rehype-slug rendered into the HTML.
    const idMatch = html.match(/<h2 id="([^"]+)">/);
    expect(idMatch).not.toBeNull();
    expect(toc[0].slug).toBe(idMatch![1]);
  });
});
