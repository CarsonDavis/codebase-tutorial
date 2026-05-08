import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import rehypeShiki from "@shikijs/rehype";
import { visit, SKIP } from "unist-util-visit";
import GithubSlugger from "github-slugger";
import { toString as mdastToString } from "mdast-util-to-string";
import type {
  Root as MdastRoot,
  Blockquote,
  Paragraph,
  PhrasingContent,
  Text,
  Link as MdastLink,
} from "mdast";
import type { Element as HastElement, Properties as HastProps, Root as HastRoot } from "hast";
import type { TocEntry } from "./types";

export interface RenderContext {
  slug: string;
  currentComponent: string;
  currentSub?: string;
  /**
   * Optional glossary terms for auto-linking. The first occurrence of each term in the
   * rendered prose becomes a hover-popover link to the glossary entry. Pass items in
   * any order — the renderer sorts longest-first internally.
   */
  glossary?: Array<{ term: string; href: string }>;
}

export interface RenderResult {
  html: string;
  toc: TocEntry[];
}

const CALLOUT_TYPES = ["NOTE", "WATCH-OUT", "WHY", "SEAM"] as const;
type CalloutType = (typeof CALLOUT_TYPES)[number];

const CALLOUT_LABELS: Record<CalloutType, string> = {
  NOTE: "Note",
  "WATCH-OUT": "Watch out",
  WHY: "Why",
  SEAM: "Seam",
};

export async function renderMarkdown(
  body: string,
  ctx: RenderContext,
): Promise<RenderResult> {
  const tocCollector: TocEntry[] = [];
  const glossary = (ctx.glossary ?? []).slice().sort((a, b) => b.term.length - a.term.length);

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(transformCallouts)
    .use(rewriteRelativeLinks(ctx))
    .use(autoLinkGlossary(glossary))
    .use(collectHeadings(tocCollector))
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeShiki, { theme: "dark-plus" })
    .use(rehypeWrapGlossaryLinks)
    .use(rehypeStringify)
    .process(body);

  const slugger = new GithubSlugger();
  const toc = tocCollector.map((entry) => ({ ...entry, slug: slugger.slug(entry.text) }));

  return { html: String(file), toc };
}

/**
 * Match GFM-alert blockquotes whose first paragraph starts with `[!TYPE]` (e.g.,
 * `> [!WATCH-OUT]`) and convert them into styled `<aside>` callouts. Done by mutating
 * the blockquote in place: children get a label-div prepended, `data.hName` switches
 * the rendered tag to `<aside>`, and `data.hProperties` sets the class plus the
 * `data-callout` semantic attribute the CSS keys off.
 */
function transformCallouts() {
  return (tree: MdastRoot) => {
    visit(tree, "blockquote", (node: Blockquote) => {
      const calloutType = detectCalloutType(node);
      if (!calloutType) return;

      const stripped = stripAlertMarker(node.children, calloutType);

      const labelChild: Paragraph = {
        type: "paragraph",
        data: {
          hName: "div",
          hProperties: { className: ["callout-label"] },
        },
        children: [{ type: "text", value: CALLOUT_LABELS[calloutType] }],
      };

      node.children = [labelChild, ...stripped];
      node.data = {
        ...(node.data ?? {}),
        hName: "aside",
        hProperties: {
          className: ["callout"],
          "data-callout": calloutType.toLowerCase(),
        },
      };
    });
  };
}

function detectCalloutType(node: Blockquote): CalloutType | null {
  const firstChild = node.children[0];
  if (!firstChild || firstChild.type !== "paragraph") return null;
  const firstInline = firstChild.children[0];
  if (!firstInline || firstInline.type !== "text") return null;
  const m = /^\[!([A-Z][A-Z\-]*)\](.*)/.exec(firstInline.value);
  if (!m) return null;
  const raw = m[1];
  if ((CALLOUT_TYPES as readonly string[]).includes(raw)) return raw as CalloutType;
  return null;
}

function stripAlertMarker(
  children: Blockquote["children"],
  type: CalloutType,
): Blockquote["children"] {
  if (children.length === 0) return children;
  const [first, ...rest] = children;
  if (first.type !== "paragraph") return children;
  const para = first as Paragraph;
  const [firstInline, ...restInline] = para.children;
  if (!firstInline || firstInline.type !== "text") return children;

  const remainder = firstInline.value.replace(`[!${type}]`, "").replace(/^\s+/, "");
  const newInline: PhrasingContent[] = [];
  if (remainder.length > 0) newInline.push({ type: "text", value: remainder });
  newInline.push(...restInline);

  if (newInline.length === 0) {
    // The whole first paragraph was just the marker — drop the paragraph.
    return rest;
  }
  return [{ ...para, children: newInline }, ...rest];
}

function rewriteRelativeLinks(ctx: RenderContext) {
  return () => (tree: MdastRoot) => {
    visit(tree, "link", (node) => {
      const url = node.url;
      if (!url) return;
      if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return;     // absolute scheme: http(s):, mailto:, etc.
      if (url.startsWith("/")) return;                    // root-relative
      if (url.startsWith("#")) return;                    // pure anchor
      if (!url.endsWith(".md") && !/\.md#/.test(url)) return; // non-md relative — leave alone
      node.url = resolveRelativeMd(url, ctx);
    });
  };
}

function resolveRelativeMd(href: string, ctx: RenderContext): string {
  // Compute the current page's path within the tutorial. Four shapes:
  //   intro.md                                 (top-level intro page)
  //   components/<component>/index.md          (component-level)
  //   components/<component>/<sub>.md          (sub-section)
  //   aux/<name>.md                            (aux page; ctx.currentComponent === "aux/<name>")
  // The overview page passes currentComponent: "intro" as a sentinel.
  const currentParts =
    ctx.currentComponent === "intro"
      ? ["intro.md"]
      : ctx.currentComponent.startsWith("aux/")
        ? ["aux", `${ctx.currentComponent.slice("aux/".length)}.md`]
        : ctx.currentSub
          ? ["components", ctx.currentComponent, `${ctx.currentSub}.md`]
          : ["components", ctx.currentComponent, "index.md"];

  // Split off any trailing #fragment so we can preserve it on the rewritten URL.
  const hashIdx = href.indexOf("#");
  const pathPart = hashIdx === -1 ? href : href.slice(0, hashIdx);
  const fragment = hashIdx === -1 ? "" : href.slice(hashIdx);

  // Drop the file name; we'll resolve relative to the directory.
  const segments = currentParts.slice(0, -1);
  for (const part of pathPart.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") segments.pop();
    else segments.push(part);
  }

  const fileName = segments[segments.length - 1] ?? "";

  // Aux pages: <slug>/aux/<name>.md
  if (segments[0] === "aux") {
    const auxName = fileName.replace(/\.md$/, "");
    return `/t/${ctx.slug}/aux/${auxName}/${fragment}`;
  }

  // Component pages: <slug>/components/<component>/<file>.md
  // Expected shape after resolution: ["components", "<component>", "<file>.md"]
  const componentId = segments[1] ?? "";
  if (fileName === "index.md") {
    return `/t/${ctx.slug}/${componentId}/${fragment}`;
  }
  const subId = fileName.replace(/\.md$/, "");
  return `/t/${ctx.slug}/${componentId}/${subId}/${fragment}`;
}

/**
 * Auto-link the first occurrence of each glossary term in the rendered prose. Skips
 * code, inline code, headings, and existing links. Marks the produced link node with
 * `data-glossary` so the rehype pass can attach the popover affordance.
 */
function autoLinkGlossary(terms: Array<{ term: string; href: string }>) {
  return () => (tree: MdastRoot) => {
    if (terms.length === 0) return;
    const used = new Set<string>();
    visit(tree, "text", (node, index, parent) => {
      if (!parent || index === undefined) return;
      // Skip nodes inside contexts we never want to mutate.
      const parentType = parent.type as string;
      if (
        parentType === "link" ||
        parentType === "linkReference" ||
        parentType === "heading"
      ) {
        return;
      }
      const text = (node as Text).value;
      if (!text) return;

      const replaced = matchFirstTerm(text, terms, used);
      if (!replaced) return;

      // Splice the resulting nodes into the parent's children array.
      const parentChildren = parent.children as PhrasingContent[];
      parentChildren.splice(index, 1, ...replaced);
      return SKIP;
    });
  };
}

function matchFirstTerm(
  text: string,
  terms: Array<{ term: string; href: string }>,
  used: Set<string>,
): PhrasingContent[] | null {
  // Find the leftmost match across all unused terms; ties broken by longest term.
  let bestIdx = -1;
  let bestTerm: { term: string; href: string } | null = null;

  for (const t of terms) {
    if (used.has(t.term)) continue;
    const idx = findWordBoundaryMatch(text, t.term);
    if (idx === -1) continue;
    if (
      bestIdx === -1 ||
      idx < bestIdx ||
      (idx === bestIdx && t.term.length > (bestTerm?.term.length ?? 0))
    ) {
      bestIdx = idx;
      bestTerm = t;
    }
  }

  if (!bestTerm || bestIdx === -1) return null;
  used.add(bestTerm.term);

  const out: PhrasingContent[] = [];
  if (bestIdx > 0) out.push({ type: "text", value: text.slice(0, bestIdx) });
  const matched = text.slice(bestIdx, bestIdx + bestTerm.term.length);
  const link: MdastLink = {
    type: "link",
    url: bestTerm.href,
    title: null,
    children: [{ type: "text", value: matched }],
    data: { hProperties: { "data-glossary": bestTerm.term } },
  };
  out.push(link);
  const after = text.slice(bestIdx + bestTerm.term.length);
  if (after.length > 0) {
    // Recursively try to match another term in the trailing chunk so a single text
    // node containing two distinct terms can pick up both.
    const tail = matchFirstTerm(after, terms, used);
    if (tail) out.push(...tail);
    else out.push({ type: "text", value: after });
  }
  return out;
}

function findWordBoundaryMatch(text: string, term: string): number {
  // Word boundary on each side. We treat `_`, letters, and digits as word chars; the
  // trailing-underscore identifiers MMGIS uses (e.g., `L_`, `Map_`) are intentionally
  // matched as whole units.
  const wordChar = (c: string | undefined): boolean => !!c && /[A-Za-z0-9_]/.test(c);
  let from = 0;
  while (true) {
    const idx = text.indexOf(term, from);
    if (idx === -1) return -1;
    const before = text[idx - 1];
    const after = text[idx + term.length];
    const startBoundary = idx === 0 || !wordChar(before);
    const endBoundary = idx + term.length === text.length || !wordChar(after);
    if (startBoundary && endBoundary) return idx;
    from = idx + 1;
  }
}

/**
 * After rehype produces HTML, find every `<a data-glossary="…">` and add the
 * `glossary-link` class so CSS can render the underline-style affordance.
 */
function rehypeWrapGlossaryLinks() {
  return (tree: HastRoot) => {
    visit(tree, "element", (node: HastElement) => {
      if (node.tagName !== "a") return;
      const props = (node.properties ?? {}) as HastProps;
      if (!("data-glossary" in props)) return;
      const cls = props.className;
      const existing = Array.isArray(cls) ? cls.map(String) : cls ? [String(cls)] : [];
      props.className = [...existing, "glossary-link"];
      node.properties = props;
    });
  };
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
