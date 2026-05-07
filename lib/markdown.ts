import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import rehypeShiki from "@shikijs/rehype";
import { visit } from "unist-util-visit";
import GithubSlugger from "github-slugger";
import { toString as mdastToString } from "mdast-util-to-string";
import type { Root as MdastRoot } from "mdast";
import type { TocEntry } from "./types";

export interface RenderContext {
  slug: string;
  currentComponent: string;
  currentSub?: string;
}

export interface RenderResult {
  html: string;
  toc: TocEntry[];
}

export async function renderMarkdown(
  body: string,
  ctx: RenderContext,
): Promise<RenderResult> {
  const tocCollector: TocEntry[] = [];

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(rewriteRelativeLinks(ctx))
    .use(collectHeadings(tocCollector))
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeShiki, { theme: "dark-plus" })
    .use(rehypeStringify)
    .process(body);

  const slugger = new GithubSlugger();
  const toc = tocCollector.map((entry) => ({ ...entry, slug: slugger.slug(entry.text) }));

  return { html: String(file), toc };
}

function rewriteRelativeLinks(ctx: RenderContext) {
  return () => (tree: MdastRoot) => {
    visit(tree, "link", (node) => {
      const url = node.url;
      if (!url) return;
      if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return;     // absolute scheme: http(s):, mailto:, etc.
      if (url.startsWith("/")) return;                    // root-relative
      if (url.startsWith("#")) return;                    // pure anchor
      if (!url.endsWith(".md")) return;                   // non-md relative — leave alone
      node.url = resolveRelativeMd(url, ctx);
    });
  };
}

function resolveRelativeMd(href: string, ctx: RenderContext): string {
  // Compute the current page's path within the tutorial. Three shapes:
  //   intro.md                                 (top-level intro page)
  //   components/<component>/index.md          (component-level)
  //   components/<component>/<sub>.md          (sub-section)
  // The overview page passes currentComponent: "intro" as a sentinel.
  const currentParts =
    ctx.currentComponent === "intro"
      ? ["intro.md"]
      : ctx.currentSub
        ? ["components", ctx.currentComponent, `${ctx.currentSub}.md`]
        : ["components", ctx.currentComponent, "index.md"];

  // Drop the file name; we'll resolve relative to the directory.
  const segments = currentParts.slice(0, -1);
  for (const part of href.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") segments.pop();
    else segments.push(part);
  }

  // Expected shape after resolution: ["components", "<component>", "<file>.md"]
  const fileName = segments[segments.length - 1] ?? "";
  const componentId = segments[1] ?? "";
  if (fileName === "index.md") {
    return `/t/${ctx.slug}/${componentId}/`;
  }
  const subId = fileName.replace(/\.md$/, "");
  return `/t/${ctx.slug}/${componentId}/${subId}/`;
}

function collectHeadings(toc: TocEntry[]) {
  return () => (tree: MdastRoot) => {
    visit(tree, "heading", (node) => {
      if (node.depth !== 2 && node.depth !== 3) return;
      const text = mdastToString(node).trim();
      if (!text) return;
      toc.push({ depth: node.depth, text, slug: "" }); // slug filled later
    });
  };
}
