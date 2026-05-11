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

  it("rewrites .md links from the intro page (top-level) into component routes", async () => {
    const body = `[viewer](./components/viewer/index.md) and [diff](./components/viewer/diff-rendering.md)`;
    const { html } = await renderMarkdown(body, {
      slug: "example",
      currentComponent: "intro",
    });
    expect(html).toContain('href="/t/example/viewer/"');
    expect(html).toContain('href="/t/example/viewer/diff-rendering/"');
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

  it("rewrites .md links into aux page routes from a leaf", async () => {
    const body = `[gloss](../../aux/glossary.md#l_)`;
    const { html } = await renderMarkdown(body, {
      slug: "example",
      currentComponent: "frontend",
      currentSub: "routing",
    });
    expect(html).toContain('href="/t/example/aux/glossary/#l_"');
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

describe("renderMarkdown — callouts", () => {
  it("renders a WATCH-OUT callout as an aside with data attribute and label", async () => {
    const body = `> [!WATCH-OUT]\n> Plugin dirs are gitignored.`;
    const { html } = await renderMarkdown(body, {
      slug: "example",
      currentComponent: "backend",
    });
    expect(html).toContain('data-callout="watch-out"');
    expect(html).toContain("callout-label");
    expect(html).toContain("Watch out");
    expect(html).toContain("Plugin dirs are gitignored");
  });

  it("renders all four canonical callout types", async () => {
    const body = [
      `> [!NOTE]\n> n`,
      `> [!WATCH-OUT]\n> w`,
      `> [!WHY]\n> y`,
      `> [!SEAM]\n> s`,
    ].join("\n\n");
    const { html } = await renderMarkdown(body, {
      slug: "example",
      currentComponent: "backend",
    });
    expect(html).toContain('data-callout="note"');
    expect(html).toContain('data-callout="watch-out"');
    expect(html).toContain('data-callout="why"');
    expect(html).toContain('data-callout="seam"');
  });

  it("leaves a regular blockquote untouched", async () => {
    const body = `> regular blockquote text\n`;
    const { html } = await renderMarkdown(body, {
      slug: "example",
      currentComponent: "backend",
    });
    expect(html).toContain("<blockquote>");
    expect(html).not.toContain("data-callout");
  });

  it("ignores unknown alert types (treats them as regular blockquotes)", async () => {
    const body = `> [!CAUTION]\n> not one of ours`;
    const { html } = await renderMarkdown(body, {
      slug: "example",
      currentComponent: "backend",
    });
    expect(html).not.toContain("data-callout");
  });
});

describe("renderMarkdown — glossary auto-linking", () => {
  const entry = (term: string, slug: string, definition = `<p>${term} def</p>`) => ({
    term,
    slug,
    href: `/t/example/aux/glossary/#${slug}`,
    definitionHtml: definition,
  });

  it("emits a button + popover container for the first occurrence of a term", async () => {
    const body = `The L_ singleton is central. Later, L_ is mentioned again.`;
    const { html } = await renderMarkdown(body, {
      slug: "example",
      currentComponent: "frontend",
      glossary: [entry("L_", "l_", "<p>The global layers map.</p>")],
    });
    // Only the first L_ becomes a button.
    const matches = html.match(/<button [^>]*data-glossary="L_"/g) ?? [];
    expect(matches.length).toBe(1);
    expect(html).toContain('popovertarget="gl-l_"');
    expect(html).toContain("glossary-link");
    // No stray href on the button.
    expect(html).not.toMatch(/<button [^>]*href=/);
    // A popover element exists for the term with the rendered definition.
    expect(html).toContain('<div id="gl-l_" popover="auto" class="glossary-popover">');
    expect(html).toContain("The global layers map");
    // The popover contains the "Open in glossary →" link.
    expect(html).toContain('href="/t/example/aux/glossary/#l_"');
    expect(html).toContain("Open in glossary");
  });

  it("respects word boundaries (skips substrings)", async () => {
    const body = `The word Mission appears. The word commission does not match.`;
    const { html } = await renderMarkdown(body, {
      slug: "example",
      currentComponent: "frontend",
      glossary: [entry("Mission", "mission")],
    });
    expect(html).toContain('data-glossary="Mission"');
    // Make sure "commission" was not turned into a button.
    expect(html).not.toMatch(/com<button [^>]*data-glossary/);
  });

  it("does not link inside headings", async () => {
    const body = `## L_\n\nL_ in the body.`;
    const { html } = await renderMarkdown(body, {
      slug: "example",
      currentComponent: "frontend",
      glossary: [entry("L_", "l_")],
    });
    // Heading text stays plain; body picks up the button.
    expect(html).toMatch(/<h2[^>]*>L_<\/h2>/);
    expect(html).toContain('data-glossary="L_"');
  });

  it("does not link inside code spans or fenced code", async () => {
    const body = "Use `L_` in code, and:\n```js\nL_.something()\n```";
    const { html } = await renderMarkdown(body, {
      slug: "example",
      currentComponent: "frontend",
      glossary: [entry("L_", "l_")],
    });
    // Inline code stays bare.
    expect(html).toContain("<code>L_</code>");
    expect(html).not.toContain('data-glossary="L_"');
  });

  it("omits the popover container when no terms are auto-linked", async () => {
    const body = `No glossary terms here at all.`;
    const { html } = await renderMarkdown(body, {
      slug: "example",
      currentComponent: "frontend",
      glossary: [entry("L_", "l_")],
    });
    expect(html).not.toContain("glossary-popovers");
    expect(html).not.toContain('<div id="gl-');
  });

  it("emits one popover per used term and skips unused ones", async () => {
    const body = `L_ appears but not the other one.`;
    const { html } = await renderMarkdown(body, {
      slug: "example",
      currentComponent: "frontend",
      glossary: [entry("L_", "l_"), entry("Map_", "map_")],
    });
    expect(html).toContain('id="gl-l_"');
    expect(html).not.toContain('id="gl-map_"');
  });
});
