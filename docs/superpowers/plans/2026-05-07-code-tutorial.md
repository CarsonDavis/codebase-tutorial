# Code Tutorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js viewer plus a three-stage Claude Code agent pipeline that takes any repo and produces an interactive tutorial explaining how the codebase works.

**Architecture:** Frontend is a Next.js App Router site that reads tutorials from `public/tutorials/<slug>/` (one directory per analyzed repo). Each tutorial is a `tutorial.yaml` (structured spine: components and sub-sections) plus markdown files for prose. The agent pipeline runs survey → parallel writers → synthesizer, each stage writing to disk so the pipeline is debuggable and resumable. Three-level information architecture: tutorial overview → component → optional sub-section. Server-side markdown rendering via the unified ecosystem with Shiki for syntax highlighting.

**Tech Stack:** Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4. Shiki via `@shikijs/rehype`, markdown via `unified`/`remark`/`rehype`. YAML via `js-yaml`, frontmatter via `gray-matter`. Tests with Vitest. Agent pipeline driven by a Claude Code slash command using the Task tool for parallel subagent dispatch.

**Spec:** [`docs/superpowers/specs/2026-05-07-code-tutorial-design.md`](../specs/2026-05-07-code-tutorial-design.md)

**Commit policy:** Per `CLAUDE.md`, never attribute commits to Claude. No `Co-Authored-By` line in commit messages.

---

## File structure

Files created across this plan:

```
.
  AGENTS.md                         # Task 11 — agent contract
  README.md                         # Task 0
  package.json                      # Task 0 (added to in 2, 3)
  tsconfig.json                     # Task 0
  next.config.ts                    # Task 0
  postcss.config.mjs                # Task 0
  vitest.config.ts                  # Task 2
  .gitignore                        # Task 0
  app/
    layout.tsx                      # Task 0
    globals.css                     # Task 0
    page.tsx                        # Task 4 — / (tutorial library)
    t/[slug]/
      layout.tsx                    # Task 5 — tutorial shell
      page.tsx                      # Task 6 — tutorial overview
      [component]/
        page.tsx                    # Task 7 — component page
        [sub]/
          page.tsx                  # Task 8 — sub-section page
  components/
    TutorialCard.tsx                # Task 4
    TutorialNav.tsx                 # Task 5
    MarkdownBody.tsx                # Task 3
    RelatedFooter.tsx               # Task 9
    PageToc.tsx                     # Task 10
  lib/
    types.ts                        # Task 1
    tutorials.ts                    # Task 2
    tutorials.test.ts               # Task 2
    markdown.ts                     # Task 3
    markdown.test.ts                # Task 3
    paths.ts                        # Task 9
  public/tutorials/example-repo/    # Task 1 — hand-written fixture
    tutorial.yaml
    intro.md
    components/backend/index.md
    components/iac/index.md
    components/frontend/index.md
    components/frontend/routing.md
    components/frontend/state-management.md
  agents/
    survey.md                       # Task 12
    writer.md                       # Task 13
    synthesizer.md                  # Task 14
  .claude/commands/
    build-tutorial.md               # Task 15
```

---

## Task 0: Bootstrap Next.js 15 app

**Goal:** Project scaffolds, dev server runs at `:3005`, dark-themed placeholder home page renders.

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.gitignore`, `README.md`
- Create: `app/layout.tsx`, `app/globals.css`, `app/page.tsx` (placeholder)

**Acceptance Criteria:**
- [ ] `npm install` succeeds.
- [ ] `npm run typecheck` passes.
- [ ] `npm run dev` starts on port 3005.
- [ ] Visiting `http://localhost:3005` shows a dark-themed page with the title "Code Tutorial".

**Verify:** `npm run typecheck && (npm run dev &) && sleep 3 && curl -sI http://localhost:3005 | head -1` → `HTTP/1.1 200 OK`

**Steps:**

- [ ] **Step 1: Initialize git and create `.gitignore`**

```bash
cd /Users/cdavis/github/code-tutorial
git init
```

`.gitignore`:
```
node_modules
.next
out
*.tsbuildinfo
.DS_Store
.env*.local
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "code-tutorial",
  "version": "0.1.0",
  "private": true,
  "description": "Interactive AI-generated tutorials for understanding any codebase.",
  "scripts": {
    "dev": "next dev -p 3005",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0-beta.7",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^4.0.0-beta.7",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write `next.config.ts`**

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
};

export default config;
```

- [ ] **Step 5: Write `postcss.config.mjs`**

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 6: Write `app/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-bg: #0b0d10;
  --color-bg-elev: #14171c;
  --color-fg: #e6e8eb;
  --color-fg-muted: #9aa3ad;
  --color-accent: #7aa2ff;
  --color-border: #232830;
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
}

html, body { background: var(--color-bg); color: var(--color-fg); }
body { font-family: var(--font-sans); }
a { color: var(--color-accent); }
```

- [ ] **Step 7: Write `app/layout.tsx`**

```tsx
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Code Tutorial",
  description: "Interactive AI-generated tutorials for understanding any codebase.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Write `app/page.tsx` (placeholder)**

```tsx
export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Code Tutorial</h1>
      <p className="mt-3 text-[var(--color-fg-muted)]">
        Interactive tutorials, generated by an agent, for understanding any codebase.
      </p>
    </main>
  );
}
```

- [ ] **Step 9: Write a minimal `README.md`**

```md
# Code Tutorial

Interactive AI-generated tutorials for understanding any codebase. See [`vision.md`](./vision.md) for the pitch and [`docs/superpowers/specs/2026-05-07-code-tutorial-design.md`](./docs/superpowers/specs/2026-05-07-code-tutorial-design.md) for the design.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3005.
```

- [ ] **Step 10: Install and verify**

```bash
npm install
npm run typecheck
npm run dev &
sleep 3
curl -sI http://localhost:3005 | head -1   # HTTP/1.1 200 OK
kill %1
```

- [ ] **Step 11: Commit**

```bash
git add .gitignore package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs app README.md vision.md docs
git status
git commit -m "Bootstrap Next.js 15 app with Tailwind v4 and dark theme"
```

---

## Task 1: Tutorial schema types and example fixture

**Goal:** Lock down the data contract in TypeScript and seed `public/tutorials/example-repo/` with a complete hand-written tutorial we can develop the frontend against.

**Files:**
- Create: `lib/types.ts`
- Create: `public/tutorials/example-repo/tutorial.yaml`
- Create: `public/tutorials/example-repo/intro.md`
- Create: `public/tutorials/example-repo/components/backend/index.md`
- Create: `public/tutorials/example-repo/components/iac/index.md`
- Create: `public/tutorials/example-repo/components/frontend/index.md`
- Create: `public/tutorials/example-repo/components/frontend/routing.md`
- Create: `public/tutorials/example-repo/components/frontend/state-management.md`

**Acceptance Criteria:**
- [ ] `lib/types.ts` exports `Tutorial`, `Component`, `SubSection`, `CrossRef`, `SectionFrontmatter` types.
- [ ] Example fixture exercises both atomic components (backend, iac) and a subdivided component (frontend with two sub-sections).
- [ ] `npm run typecheck` passes.

**Verify:** `npm run typecheck && find public/tutorials/example-repo -type f | sort`

**Steps:**

- [ ] **Step 1: Write `lib/types.ts`**

```ts
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
  subSections?: SubSection[];
}

export interface CrossRef {
  from: string;          // "<component>" or "<component>/<sub>"
  to: string;
  note?: string;
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
}

export interface SectionFrontmatter {
  id: string;            // "<component>" or "<component>/<sub>"
  title: string;
  summary: string;
  related?: string[];
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
```

- [ ] **Step 2: Write `public/tutorials/example-repo/tutorial.yaml`**

```yaml
slug: example-repo
name: Example Repo
source:
  path: /Users/cdavis/github/example-repo
generated_at: "2026-05-07T12:00:00Z"
generator_version: "0.1.0"
summary: |
  A small reference web app with a Node backend, a React frontend, and AWS infrastructure
  defined in CDK. This tutorial is a hand-written fixture used for developing the viewer.

components:
  - id: backend
    title: Backend
    summary: Node/Express API server with a Postgres data layer.
    type: atomic
  - id: iac
    title: Infrastructure
    summary: AWS CDK stacks for the API, database, and static hosting.
    type: atomic
  - id: frontend
    title: Frontend
    summary: React SPA with file-based routing and a small global store.
    type: subdivided
    sub_sections:
      - id: routing
        title: Routing
        summary: How pages are organized and how navigation flows.
      - id: state-management
        title: State management
        summary: The global store, when to use it, and how it talks to the API.

cross_refs:
  - from: frontend/state-management
    to: backend
    note: The store hits the API endpoints exposed here.
  - from: iac
    to: backend
    note: The API stack provisions the runtime for the backend.
```

- [ ] **Step 3: Write `intro.md`**

```md
---
id: intro
title: Example Repo
summary: Reference fixture for the Code Tutorial viewer.
---

# Example Repo — overview

This is a hand-written tutorial used during development of the viewer. It demonstrates all
three levels of the information architecture: the overview page (this one), atomic
components (Backend, Infrastructure), and a subdivided component (Frontend, with two
sub-sections).

## How the parts fit together

The frontend talks to the backend over HTTP. The backend persists to Postgres. The
infrastructure layer provisions everything in AWS. None of the frontend code knows about
infrastructure, and none of the infrastructure code knows about React.
```

- [ ] **Step 4: Write `components/backend/index.md`**

```md
---
id: backend
title: Backend
summary: Node/Express API server with a Postgres data layer.
related:
  - iac
  - frontend/state-management
---

# Backend

A Node service exposing a small JSON API. There are two layers worth knowing about: the
HTTP layer (route handlers, validation, error mapping) and the data layer (a thin wrapper
around Postgres for the project's main entities).

## Why these boundaries

The HTTP layer is intentionally dumb. It validates input, calls the data layer, and
serializes the result. Business rules live in the data layer where they have direct access
to the database transactions they often need.
```

- [ ] **Step 5: Write `components/iac/index.md`**

```md
---
id: iac
title: Infrastructure
summary: AWS CDK stacks for the API, database, and static hosting.
related:
  - backend
---

# Infrastructure

Three CDK stacks: an API stack (Fargate service for the backend), a data stack (RDS
Postgres), and a hosting stack (S3 + CloudFront for the frontend bundle). Each is
independently deployable.

## Why three stacks

Different change cadences. The hosting stack updates on every frontend deploy; the API
stack updates when the backend changes; the data stack barely ever changes. Splitting
them keeps blast radius low.
```

- [ ] **Step 6: Write `components/frontend/index.md`**

```md
---
id: frontend
title: Frontend
summary: React SPA with file-based routing and a small global store.
---

# Frontend

The frontend is a React single-page app. Two areas are worth understanding before reading
code: how routing is laid out, and how state moves between the API and the UI.

This component has sub-sections — read the routing and state-management pages to get the
full picture.
```

- [ ] **Step 7: Write `components/frontend/routing.md`**

```md
---
id: frontend/routing
title: Routing
summary: How pages are organized and how navigation flows.
related:
  - frontend/state-management
---

# Routing

File-based routing. A file under `web/src/routes/` becomes a route at the matching URL.
There is one root layout that owns the chrome (header, sidebar) and a small set of
top-level routes for the main features.

## Navigation patterns

Programmatic navigation goes through a single `useNavigate()` hook. This is the only
sanctioned way to change route — direct `window.location` manipulation is not used.
```

- [ ] **Step 8: Write `components/frontend/state-management.md`**

```md
---
id: frontend/state-management
title: State management
summary: The global store, when to use it, and how it talks to the API.
related:
  - frontend/routing
  - backend
---

# State management

A small global store holds session-level state (the current user, feature flags, the
notification queue). Page-local state stays local — the store is for things that need to
survive route transitions.

## Talking to the API

The store doesn't fetch directly. A thin client module wraps each backend endpoint and
returns typed promises; the store calls those, then commits the result.
```

- [ ] **Step 9: Verify and commit**

```bash
npm run typecheck
git add lib/types.ts public/tutorials/example-repo
git commit -m "Add tutorial schema types and hand-written example fixture"
```

---

## Task 2: Tutorial loader (`lib/tutorials.ts`) with Vitest tests

**Goal:** Pure functions to discover tutorials on disk, load `tutorial.yaml`, and read individual section markdown with frontmatter.

**Files:**
- Modify: `package.json` (add `vitest`, `js-yaml`, `gray-matter`, `@types/js-yaml`)
- Create: `vitest.config.ts`
- Create: `lib/tutorials.ts`
- Create: `lib/tutorials.test.ts`

**Acceptance Criteria:**
- [ ] `discoverTutorials(rootDir)` returns slug list from a directory of tutorials.
- [ ] `loadTutorial(rootDir, slug)` parses `tutorial.yaml` into a `Tutorial`.
- [ ] `loadIntro(rootDir, slug)` reads `intro.md` and returns frontmatter + raw body.
- [ ] `loadSection(rootDir, slug, componentId, subId?)` reads the right markdown file and returns frontmatter + raw body.
- [ ] All four functions throw a clear error when the file is missing.
- [ ] Tests cover atomic component, subdivided component (with and without sub id), missing file, and the example fixture.

**Verify:** `npm test` → all tests pass.

**Steps:**

- [ ] **Step 1: Add dependencies**

```bash
npm install --save js-yaml gray-matter
npm install --save-dev vitest @types/js-yaml
```

- [ ] **Step 2: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
  },
});
```

- [ ] **Step 3: Write the failing tests in `lib/tutorials.test.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
npm test
```
Expected: failures because `lib/tutorials.ts` doesn't exist yet.

- [ ] **Step 5: Implement `lib/tutorials.ts`**

```ts
import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import matter from "gray-matter";
import type { Tutorial, Component, SectionFrontmatter } from "./types";

export async function discoverTutorials(rootDir: string): Promise<string[]> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
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
    crossRefs: (raw.cross_refs as Tutorial["crossRefs"]) ?? undefined,
  };
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
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/tutorials.ts lib/tutorials.test.ts
git commit -m "Add tutorial loader with discovery, yaml parsing, and frontmatter reading"
```

---

## Task 3: Server-side markdown rendering with Shiki

**Goal:** A pure function `renderMarkdown(body, { slug, currentPath })` that returns sanitized HTML plus an extracted TOC. Relative `.md` links are rewritten to in-app routes. A `MarkdownBody` server component renders the HTML.

**Files:**
- Modify: `package.json` (add `unified`, `remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-slug`, `rehype-autolink-headings`, `rehype-stringify`, `@shikijs/rehype`, `unist-util-visit`, `mdast-util-toc` — and `@types/mdast` if needed)
- Create: `lib/markdown.ts`
- Create: `lib/markdown.test.ts`
- Create: `components/MarkdownBody.tsx`

**Acceptance Criteria:**
- [ ] `renderMarkdown` returns `{ html, toc }`.
- [ ] Code fences are highlighted with Shiki (Dark+ theme).
- [ ] Inline relative links to `.md` files are rewritten to in-app routes:
  - `./routing.md` from `frontend/state-management.md` → `/t/<slug>/frontend/routing/`
  - `../backend/index.md` from `frontend/routing.md` → `/t/<slug>/backend/`
- [ ] Non-relative links (`http://`, `https://`, `mailto:`) are untouched.
- [ ] Headings (h2, h3) get slug ids and appear in `toc`.
- [ ] Tests cover all of the above.

**Verify:** `npm test` → markdown tests pass.

**Steps:**

- [ ] **Step 1: Add dependencies**

```bash
npm install --save unified remark-parse remark-gfm remark-rehype rehype-slug rehype-autolink-headings rehype-stringify @shikijs/rehype unist-util-visit mdast-util-toc
npm install --save-dev @types/mdast
```

- [ ] **Step 2: Write the failing tests in `lib/markdown.test.ts`**

```ts
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
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- markdown
```
Expected: failures because `lib/markdown.ts` doesn't exist.

- [ ] **Step 4: Implement `lib/markdown.ts`**

```ts
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import rehypeShiki from "@shikijs/rehype";
import { visit } from "unist-util-visit";
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
  const toc: TocEntry[] = [];

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(rewriteRelativeLinks(ctx))
    .use(collectHeadings(toc))
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeShiki, { theme: "dark-plus" })
    .use(rehypeStringify)
    .process(body);

  // rehype-slug runs after we collect heading text. Build slugs to match.
  const withSlugs = toc.map((entry) => ({ ...entry, slug: githubSlug(entry.text) }));

  return { html: String(file), toc: withSlugs };
}

function rewriteRelativeLinks(ctx: RenderContext) {
  return () => (tree: MdastRoot) => {
    visit(tree, "link", (node) => {
      const url = node.url;
      if (!url || /^[a-z]+:/i.test(url) || url.startsWith("/") || url.startsWith("#")) return;
      if (!url.endsWith(".md")) return;
      node.url = resolveRelativeMd(url, ctx);
    });
  };
}

function resolveRelativeMd(href: string, ctx: RenderContext): string {
  // Compute current absolute path within tutorial.
  // We treat the current page as either:
  //   components/<component>/index.md          (no sub)
  //   components/<component>/<sub>.md          (with sub)
  const currentParts = ctx.currentSub
    ? ["components", ctx.currentComponent, `${ctx.currentSub}.md`]
    : ["components", ctx.currentComponent, "index.md"];

  const segments = currentParts.slice(0, -1);
  for (const part of href.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") segments.pop();
    else segments.push(part);
  }

  // segments now look like: ["components", "<component>", "<file>.md"]
  const fileName = segments[segments.length - 1];
  const componentId = segments[1];
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
      const text = node.children
        .map((c) => ("value" in c ? c.value : ""))
        .join("")
        .trim();
      if (!text) return;
      toc.push({ depth: node.depth, text, slug: "" }); // slug filled later
    });
  };
}

// Mirror github-slugger's algorithm well enough for our headings.
function githubSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}
```

- [ ] **Step 5: Run tests until they pass**

```bash
npm test -- markdown
```
Expected: all markdown tests pass. If `githubSlug` differs from `rehype-slug`'s output for a given heading, prefer importing `github-slugger` and using it directly.

- [ ] **Step 6: Write `components/MarkdownBody.tsx`**

```tsx
export function MarkdownBody({ html }: { html: string }) {
  return (
    <div
      className="prose prose-invert max-w-none"
      // Server-rendered HTML from our trusted pipeline
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

(Tailwind v4 typography: if `prose` classes aren't available without a plugin, drop the className and style headings/paragraphs in `globals.css` instead. Choose during execution.)

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json lib/markdown.ts lib/markdown.test.ts components/MarkdownBody.tsx
git commit -m "Add server-side markdown rendering with Shiki and link rewriting"
```

---

## Task 4: Tutorial library home page (`/`)

**Goal:** `/` shows a card grid listing each tutorial under `public/tutorials/`. Clicking a card goes to its overview.

**Files:**
- Modify: `app/page.tsx`
- Create: `components/TutorialCard.tsx`

**Acceptance Criteria:**
- [ ] Home page reads each tutorial directory and renders a card per tutorial.
- [ ] Card shows title, summary, and generated date (formatted).
- [ ] Cards link to `/t/<slug>/`.
- [ ] Cards sort by `generatedAt` descending.

**Verify:** `npm run dev`, open `http://localhost:3005/`, see a card for "Example Repo" linking to `/t/example-repo/`.

**Steps:**

- [ ] **Step 1: Write `components/TutorialCard.tsx`**

```tsx
import Link from "next/link";

interface Props {
  slug: string;
  name: string;
  summary: string;
  generatedAt: string;
}

export function TutorialCard({ slug, name, summary, generatedAt }: Props) {
  const date = formatDate(generatedAt);
  return (
    <Link
      href={`/t/${slug}/`}
      className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5 transition-colors hover:border-[var(--color-accent)]"
    >
      <h2 className="text-lg font-semibold tracking-tight">{name}</h2>
      {date && <p className="mt-1 text-xs text-[var(--color-fg-muted)]">{date}</p>}
      <p className="mt-3 text-sm text-[var(--color-fg-muted)]">{summary}</p>
    </Link>
  );
}

function formatDate(iso: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
```

- [ ] **Step 2: Replace `app/page.tsx`**

```tsx
import path from "node:path";
import { discoverTutorials, loadTutorial } from "@/lib/tutorials";
import { TutorialCard } from "@/components/TutorialCard";

const TUTORIALS_DIR = path.join(process.cwd(), "public/tutorials");

export default async function Home() {
  const slugs = await discoverTutorials(TUTORIALS_DIR);
  const tutorials = await Promise.all(slugs.map((s) => loadTutorial(TUTORIALS_DIR, s)));
  tutorials.sort((a, b) => (b.generatedAt ?? "").localeCompare(a.generatedAt ?? ""));

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Code Tutorial</h1>
        <p className="mt-2 text-[var(--color-fg-muted)]">
          Interactive tutorials, generated by an agent, for understanding any codebase.
        </p>
      </header>

      {tutorials.length === 0 ? (
        <p className="text-[var(--color-fg-muted)]">
          No tutorials yet. Run the agent pipeline to generate one.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tutorials.map((t) => (
            <TutorialCard
              key={t.slug}
              slug={t.slug}
              name={t.name}
              summary={t.summary}
              generatedAt={t.generatedAt}
            />
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```
Open `http://localhost:3005/` — see a card for "Example Repo".

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx components/TutorialCard.tsx
git commit -m "Add tutorial library home page"
```

---

## Task 5: Tutorial shell layout with left nav

**Goal:** A persistent shell at `/t/[slug]/*` that renders a left sidebar with the component tree (subdivided components expandable), a main column for content, and a right column reserved for the page TOC.

**Files:**
- Create: `app/t/[slug]/layout.tsx`
- Create: `components/TutorialNav.tsx`

**Acceptance Criteria:**
- [ ] Shell renders on every `/t/[slug]/*` route.
- [ ] Left nav lists every component; subdivided components show their sub-sections.
- [ ] Each nav entry is an `<a>` to its route. The current entry has a visually distinct style.
- [ ] Shell has a top-of-sidebar "← All tutorials" link back to `/`.

**Verify:** `npm run dev`, visit `/t/example-repo/`, confirm sidebar shows Backend, Infrastructure, Frontend (with Routing + State management nested under it).

**Steps:**

- [ ] **Step 1: Write `components/TutorialNav.tsx`** *(client component to use `usePathname`)*

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Component } from "@/lib/types";

interface Props {
  slug: string;
  components: Component[];
}

export function TutorialNav({ slug, components }: Props) {
  const pathname = usePathname();
  const overviewHref = `/t/${slug}/`;

  return (
    <nav className="text-sm">
      <Link
        href="/"
        className="block text-xs uppercase tracking-wide text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
      >
        ← All tutorials
      </Link>

      <Link
        href={overviewHref}
        className={navClass(pathname === overviewHref)}
      >
        Overview
      </Link>

      <ul className="mt-4 space-y-2">
        {components.map((c) => {
          const compHref = `/t/${slug}/${c.id}/`;
          const compActive = pathname === compHref;
          return (
            <li key={c.id}>
              <Link href={compHref} className={navClass(compActive)}>
                {c.title}
              </Link>
              {c.type === "subdivided" && c.subSections && (
                <ul className="ml-3 mt-1 space-y-1 border-l border-[var(--color-border)] pl-3">
                  {c.subSections.map((s) => {
                    const subHref = `/t/${slug}/${c.id}/${s.id}/`;
                    return (
                      <li key={s.id}>
                        <Link href={subHref} className={navClass(pathname === subHref)}>
                          {s.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function navClass(active: boolean): string {
  return active
    ? "block py-1 text-[var(--color-accent)]"
    : "block py-1 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]";
}
```

- [ ] **Step 2: Write `app/t/[slug]/layout.tsx`**

```tsx
import path from "node:path";
import { notFound } from "next/navigation";
import { loadTutorial } from "@/lib/tutorials";
import { TutorialNav } from "@/components/TutorialNav";
import type { ReactNode } from "react";

const TUTORIALS_DIR = path.join(process.cwd(), "public/tutorials");

interface Props {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function TutorialLayout({ children, params }: Props) {
  const { slug } = await params;
  let tutorial;
  try {
    tutorial = await loadTutorial(TUTORIALS_DIR, slug);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-[16rem_1fr] gap-8 px-6 py-10">
      <aside className="sticky top-10 self-start">
        <TutorialNav slug={slug} components={tutorial.components} />
      </aside>
      <div>{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npm run dev
```
Open `http://localhost:3005/t/example-repo/` — page is blank (no overview page yet) but sidebar should render. If you get a 404, the overview page comes in the next task.

- [ ] **Step 4: Commit**

```bash
git add app/t/[slug]/layout.tsx components/TutorialNav.tsx
git commit -m "Add tutorial shell layout with persistent component nav"
```

---

## Task 6: Tutorial overview page (`/t/[slug]/`)

**Goal:** Renders `intro.md` for the tutorial, followed by an index of components (each with its summary).

**Files:**
- Create: `app/t/[slug]/page.tsx`

**Acceptance Criteria:**
- [ ] Page renders `intro.md` body as HTML.
- [ ] Below the prose, a styled list of components appears, each linking to its component page and showing its summary.
- [ ] `generateStaticParams` enumerates the slugs from disk.
- [ ] 404 for an unknown slug.

**Verify:** Visit `/t/example-repo/`. Confirm intro renders and component list shows Backend / Infrastructure / Frontend.

**Steps:**

- [ ] **Step 1: Write `app/t/[slug]/page.tsx`**

```tsx
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { discoverTutorials, loadTutorial, loadIntro } from "@/lib/tutorials";
import { renderMarkdown } from "@/lib/markdown";
import { MarkdownBody } from "@/components/MarkdownBody";

const TUTORIALS_DIR = path.join(process.cwd(), "public/tutorials");

export async function generateStaticParams() {
  const slugs = await discoverTutorials(TUTORIALS_DIR);
  return slugs.map((slug) => ({ slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TutorialOverview({ params }: Props) {
  const { slug } = await params;
  let tutorial, intro;
  try {
    tutorial = await loadTutorial(TUTORIALS_DIR, slug);
    intro = await loadIntro(TUTORIALS_DIR, slug);
  } catch {
    notFound();
  }
  const { html } = await renderMarkdown(intro.body, {
    slug,
    currentComponent: "intro",
  });

  return (
    <article>
      <MarkdownBody html={html} />

      <section className="mt-12 border-t border-[var(--color-border)] pt-8">
        <h2 className="text-xl font-semibold tracking-tight">Components</h2>
        <ul className="mt-4 space-y-3">
          {tutorial.components.map((c) => (
            <li key={c.id}>
              <Link
                href={`/t/${slug}/${c.id}/`}
                className="block rounded-md border border-[var(--color-border)] p-4 transition-colors hover:border-[var(--color-accent)]"
              >
                <div className="font-medium">{c.title}</div>
                <div className="mt-1 text-sm text-[var(--color-fg-muted)]">{c.summary}</div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```
Open `http://localhost:3005/t/example-repo/` — see intro prose and the component list.

- [ ] **Step 3: Commit**

```bash
git add app/t/[slug]/page.tsx
git commit -m "Add tutorial overview page rendering intro and component index"
```

---

## Task 7: Component page (`/t/[slug]/[component]/`)

**Goal:** Renders the component's `index.md`. If subdivided, shows a list of sub-sections below the prose.

**Files:**
- Create: `app/t/[slug]/[component]/page.tsx`

**Acceptance Criteria:**
- [ ] Page renders `components/<component>/index.md`.
- [ ] For subdivided components, sub-sections appear below the prose with summary + link.
- [ ] `generateStaticParams` enumerates `(slug, component)` pairs.
- [ ] 404 for unknown slug or component.

**Verify:** Visit `/t/example-repo/backend/` (atomic) and `/t/example-repo/frontend/` (subdivided — should show routing + state-management list at bottom).

**Steps:**

- [ ] **Step 1: Write `app/t/[slug]/[component]/page.tsx`**

```tsx
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { discoverTutorials, loadTutorial, loadSection } from "@/lib/tutorials";
import { renderMarkdown } from "@/lib/markdown";
import { MarkdownBody } from "@/components/MarkdownBody";

const TUTORIALS_DIR = path.join(process.cwd(), "public/tutorials");

export async function generateStaticParams() {
  const slugs = await discoverTutorials(TUTORIALS_DIR);
  const params: Array<{ slug: string; component: string }> = [];
  for (const slug of slugs) {
    const t = await loadTutorial(TUTORIALS_DIR, slug);
    for (const c of t.components) params.push({ slug, component: c.id });
  }
  return params;
}

interface Props {
  params: Promise<{ slug: string; component: string }>;
}

export default async function ComponentPage({ params }: Props) {
  const { slug, component } = await params;

  let tutorial, section;
  try {
    tutorial = await loadTutorial(TUTORIALS_DIR, slug);
    section = await loadSection(TUTORIALS_DIR, slug, component);
  } catch {
    notFound();
  }

  const meta = tutorial.components.find((c) => c.id === component);
  if (!meta) notFound();

  const { html } = await renderMarkdown(section.body, {
    slug,
    currentComponent: component,
  });

  return (
    <article>
      <MarkdownBody html={html} />

      {meta!.type === "subdivided" && meta!.subSections && (
        <section className="mt-12 border-t border-[var(--color-border)] pt-8">
          <h2 className="text-xl font-semibold tracking-tight">In this component</h2>
          <ul className="mt-4 space-y-3">
            {meta!.subSections.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/t/${slug}/${component}/${s.id}/`}
                  className="block rounded-md border border-[var(--color-border)] p-4 transition-colors hover:border-[var(--color-accent)]"
                >
                  <div className="font-medium">{s.title}</div>
                  <div className="mt-1 text-sm text-[var(--color-fg-muted)]">{s.summary}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```
Visit `/t/example-repo/backend/` and `/t/example-repo/frontend/`.

- [ ] **Step 3: Commit**

```bash
git add app/t/[slug]/[component]/page.tsx
git commit -m "Add component page with sub-section list for subdivided components"
```

---

## Task 8: Sub-section page (`/t/[slug]/[component]/[sub]/`)

**Goal:** Renders a sub-section's markdown.

**Files:**
- Create: `app/t/[slug]/[component]/[sub]/page.tsx`

**Acceptance Criteria:**
- [ ] Page renders `components/<component>/<sub>.md`.
- [ ] `generateStaticParams` enumerates `(slug, component, sub)` triples for subdivided components only.
- [ ] 404 for unknown triples.

**Verify:** Visit `/t/example-repo/frontend/routing/` and `/t/example-repo/frontend/state-management/`.

**Steps:**

- [ ] **Step 1: Write `app/t/[slug]/[component]/[sub]/page.tsx`**

```tsx
import path from "node:path";
import { notFound } from "next/navigation";
import { discoverTutorials, loadTutorial, loadSection } from "@/lib/tutorials";
import { renderMarkdown } from "@/lib/markdown";
import { MarkdownBody } from "@/components/MarkdownBody";

const TUTORIALS_DIR = path.join(process.cwd(), "public/tutorials");

export async function generateStaticParams() {
  const slugs = await discoverTutorials(TUTORIALS_DIR);
  const params: Array<{ slug: string; component: string; sub: string }> = [];
  for (const slug of slugs) {
    const t = await loadTutorial(TUTORIALS_DIR, slug);
    for (const c of t.components) {
      if (c.type !== "subdivided" || !c.subSections) continue;
      for (const s of c.subSections) params.push({ slug, component: c.id, sub: s.id });
    }
  }
  return params;
}

interface Props {
  params: Promise<{ slug: string; component: string; sub: string }>;
}

export default async function SubSectionPage({ params }: Props) {
  const { slug, component, sub } = await params;

  let section;
  try {
    section = await loadSection(TUTORIALS_DIR, slug, component, sub);
  } catch {
    notFound();
  }

  const { html } = await renderMarkdown(section.body, {
    slug,
    currentComponent: component,
    currentSub: sub,
  });

  return (
    <article>
      <MarkdownBody html={html} />
    </article>
  );
}
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

- [ ] **Step 3: Commit**

```bash
git add app/t/[slug]/[component]/[sub]/page.tsx
git commit -m "Add sub-section page"
```

---

## Task 9: Cross-references — `Related` footer + path helpers

**Goal:** Each section page (overview excluded) ends with a `Related` footer rendered from a unified cross-reference set: the section's own `frontmatter.related` plus any `tutorial.cross_refs` entries where `from` matches this section.

**Files:**
- Create: `lib/paths.ts`
- Create: `components/RelatedFooter.tsx`
- Modify: `app/t/[slug]/[component]/page.tsx`
- Modify: `app/t/[slug]/[component]/[sub]/page.tsx`

**Acceptance Criteria:**
- [ ] `RelatedFooter` shows nothing when there are no related sections.
- [ ] Each related entry shows the target's title and summary, links to the right route, and de-duplicates by target id.
- [ ] Frontmatter `related` and `tutorial.cross_refs` (where `from` matches the current section) are both included.

**Verify:** Visit `/t/example-repo/backend/` — see Related footer with Infrastructure and Frontend → State management. Visit `/t/example-repo/iac/` — see Backend (declared in `cross_refs`).

**Steps:**

- [ ] **Step 1: Write `lib/paths.ts`**

```ts
import type { Tutorial } from "./types";

export interface SectionRef {
  id: string;          // "<component>" or "<component>/<sub>"
  title: string;
  summary: string;
  href: string;
}

export function resolveSectionRef(t: Tutorial, id: string): SectionRef | null {
  const [componentId, subId] = id.split("/");
  const component = t.components.find((c) => c.id === componentId);
  if (!component) return null;
  if (!subId) {
    return {
      id: component.id,
      title: component.title,
      summary: component.summary,
      href: `/t/${t.slug}/${component.id}/`,
    };
  }
  const sub = component.subSections?.find((s) => s.id === subId);
  if (!sub) return null;
  return {
    id: `${component.id}/${sub.id}`,
    title: `${component.title} — ${sub.title}`,
    summary: sub.summary,
    href: `/t/${t.slug}/${component.id}/${sub.id}/`,
  };
}

export function relatedFor(
  t: Tutorial,
  currentId: string,
  frontmatterRelated: string[] | undefined,
): SectionRef[] {
  const ids = new Set<string>(frontmatterRelated ?? []);
  for (const cr of t.crossRefs ?? []) {
    if (cr.from === currentId) ids.add(cr.to);
  }
  ids.delete(currentId);
  return [...ids]
    .map((id) => resolveSectionRef(t, id))
    .filter((r): r is SectionRef => r !== null);
}
```

- [ ] **Step 2: Write `components/RelatedFooter.tsx`**

```tsx
import Link from "next/link";
import type { SectionRef } from "@/lib/paths";

export function RelatedFooter({ items }: { items: SectionRef[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-12 border-t border-[var(--color-border)] pt-8">
      <h2 className="text-xl font-semibold tracking-tight">Related</h2>
      <ul className="mt-4 space-y-3">
        {items.map((r) => (
          <li key={r.id}>
            <Link
              href={r.href}
              className="block rounded-md border border-[var(--color-border)] p-4 transition-colors hover:border-[var(--color-accent)]"
            >
              <div className="font-medium">{r.title}</div>
              <div className="mt-1 text-sm text-[var(--color-fg-muted)]">{r.summary}</div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: Update `app/t/[slug]/[component]/page.tsx`**

Insert the related footer after the existing content. Replace the file's `return` block:

```tsx
  return (
    <article>
      <MarkdownBody html={html} />

      {meta!.type === "subdivided" && meta!.subSections && (
        <section className="mt-12 border-t border-[var(--color-border)] pt-8">
          <h2 className="text-xl font-semibold tracking-tight">In this component</h2>
          <ul className="mt-4 space-y-3">
            {meta!.subSections.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/t/${slug}/${component}/${s.id}/`}
                  className="block rounded-md border border-[var(--color-border)] p-4 transition-colors hover:border-[var(--color-accent)]"
                >
                  <div className="font-medium">{s.title}</div>
                  <div className="mt-1 text-sm text-[var(--color-fg-muted)]">{s.summary}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <RelatedFooter
        items={relatedFor(tutorial, component, section.frontmatter.related)}
      />
    </article>
  );
```

Add the imports at top of file:

```tsx
import { RelatedFooter } from "@/components/RelatedFooter";
import { relatedFor } from "@/lib/paths";
```

- [ ] **Step 4: Update `app/t/[slug]/[component]/[sub]/page.tsx`**

Add imports and a `RelatedFooter` after `MarkdownBody`. Also load the tutorial:

```tsx
import { RelatedFooter } from "@/components/RelatedFooter";
import { relatedFor } from "@/lib/paths";

// inside SubSectionPage, before render:
const tutorial = await loadTutorial(TUTORIALS_DIR, slug);

// inside the article:
<RelatedFooter
  items={relatedFor(tutorial, `${component}/${sub}`, section.frontmatter.related)}
/>
```

The full updated page:

```tsx
import path from "node:path";
import { notFound } from "next/navigation";
import {
  discoverTutorials,
  loadTutorial,
  loadSection,
} from "@/lib/tutorials";
import { renderMarkdown } from "@/lib/markdown";
import { MarkdownBody } from "@/components/MarkdownBody";
import { RelatedFooter } from "@/components/RelatedFooter";
import { relatedFor } from "@/lib/paths";

const TUTORIALS_DIR = path.join(process.cwd(), "public/tutorials");

export async function generateStaticParams() {
  const slugs = await discoverTutorials(TUTORIALS_DIR);
  const params: Array<{ slug: string; component: string; sub: string }> = [];
  for (const slug of slugs) {
    const t = await loadTutorial(TUTORIALS_DIR, slug);
    for (const c of t.components) {
      if (c.type !== "subdivided" || !c.subSections) continue;
      for (const s of c.subSections) params.push({ slug, component: c.id, sub: s.id });
    }
  }
  return params;
}

interface Props {
  params: Promise<{ slug: string; component: string; sub: string }>;
}

export default async function SubSectionPage({ params }: Props) {
  const { slug, component, sub } = await params;

  let section, tutorial;
  try {
    section = await loadSection(TUTORIALS_DIR, slug, component, sub);
    tutorial = await loadTutorial(TUTORIALS_DIR, slug);
  } catch {
    notFound();
  }

  const { html } = await renderMarkdown(section.body, {
    slug,
    currentComponent: component,
    currentSub: sub,
  });

  return (
    <article>
      <MarkdownBody html={html} />
      <RelatedFooter
        items={relatedFor(tutorial, `${component}/${sub}`, section.frontmatter.related)}
      />
    </article>
  );
}
```

- [ ] **Step 5: Verify**

Visit `/t/example-repo/backend/` and `/t/example-repo/iac/` — confirm Related footers.

- [ ] **Step 6: Commit**

```bash
git add lib/paths.ts components/RelatedFooter.tsx app/t/[slug]/[component]/page.tsx app/t/[slug]/[component]/[sub]/page.tsx
git commit -m "Render Related footer from frontmatter and tutorial cross_refs"
```

---

## Task 10: In-page TOC

**Goal:** Right-column auto-TOC built from h2/h3 headings on each section page. Hidden on narrow viewports.

**Files:**
- Create: `components/PageToc.tsx`
- Modify: `app/t/[slug]/layout.tsx` (extend to a 3-column shell that consumes a TOC slot)
- Modify: `app/t/[slug]/page.tsx`, `app/t/[slug]/[component]/page.tsx`, `app/t/[slug]/[component]/[sub]/page.tsx` (pass TOC entries to the layout via children composition)

**Architecture note:** Next.js layouts can't directly receive props from pages. Two clean options:
1. Render the TOC inside each page (not the layout). Pages output `[main, toc]` in a fixed grid. **Use this** — simpler, no parallel routes.
2. Use parallel routes (`@toc` slot) — more native but adds boilerplate for one piece of content.

Going with option 1.

**Acceptance Criteria:**
- [ ] `PageToc` renders a list of links to `#<slug>` anchors for each h2/h3 in the rendered markdown.
- [ ] The TOC is empty (renders nothing) when there are no h2/h3 headings.
- [ ] On viewports < lg, the TOC is hidden.
- [ ] The shell layout switches from 2 columns to 3 (`16rem | 1fr | 14rem`) at `lg` breakpoint.

**Verify:** Visit a page with multiple h2/h3 (the synthesizer will produce these later; verify on the example fixture's pages where the headings exist).

**Steps:**

- [ ] **Step 1: Write `components/PageToc.tsx`**

```tsx
import type { TocEntry } from "@/lib/types";

export function PageToc({ items }: { items: TocEntry[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="On this page" className="text-sm">
      <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
        On this page
      </div>
      <ul className="mt-3 space-y-1">
        {items.map((e) => (
          <li key={e.slug} className={e.depth === 3 ? "ml-3" : ""}>
            <a
              href={`#${e.slug}`}
              className="block py-0.5 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            >
              {e.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 2: Update `app/t/[slug]/layout.tsx` to a 3-column grid**

Replace the layout body grid with:

```tsx
<div className="mx-auto grid max-w-7xl grid-cols-[16rem_1fr] gap-8 px-6 py-10 lg:grid-cols-[16rem_1fr_14rem]">
  <aside className="sticky top-10 self-start">
    <TutorialNav slug={slug} components={tutorial.components} />
  </aside>
  <div>{children}</div>
</div>
```

(The third column is a flex/grid auto-track. Pages render their own `<aside>` for the TOC, which falls into the third grid column when present.)

Wait — with implicit children, the page only renders into one cell. Cleaner: have the page emit a flex/grid with a fragment containing main + aside, and the layout just provides `[16rem | 1fr]`. Reverting the grid change and instead:

Final approach: keep the layout 2-column, and have each page render its own internal grid that splits its column into main + toc on `lg`:

```tsx
// inside each page:
<div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_14rem]">
  <article>...</article>
  <aside className="hidden lg:block">
    <PageToc items={toc} />
  </aside>
</div>
```

This avoids the layout/page coupling entirely. Use this pattern in the next step.

- [ ] **Step 3: Update each page to render `PageToc`**

For `app/t/[slug]/page.tsx`, capture `toc` from `renderMarkdown` and wrap content:

```tsx
const { html, toc } = await renderMarkdown(intro.body, {
  slug,
  currentComponent: "intro",
});

return (
  <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_14rem]">
    <article>
      <MarkdownBody html={html} />
      <section className="mt-12 border-t border-[var(--color-border)] pt-8">
        <h2 className="text-xl font-semibold tracking-tight">Components</h2>
        <ul className="mt-4 space-y-3">
          {tutorial.components.map((c) => (
            <li key={c.id}>
              <Link
                href={`/t/${slug}/${c.id}/`}
                className="block rounded-md border border-[var(--color-border)] p-4 transition-colors hover:border-[var(--color-accent)]"
              >
                <div className="font-medium">{c.title}</div>
                <div className="mt-1 text-sm text-[var(--color-fg-muted)]">{c.summary}</div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
    <aside className="sticky top-10 hidden self-start lg:block">
      <PageToc items={toc} />
    </aside>
  </div>
);
```

Apply the analogous change to `app/t/[slug]/[component]/page.tsx` and `app/t/[slug]/[component]/[sub]/page.tsx`. Add `import { PageToc } from "@/components/PageToc";` at top of each.

- [ ] **Step 4: Verify**

Open `/t/example-repo/backend/` on a wide window — TOC visible. Narrow the window — TOC disappears.

- [ ] **Step 5: Commit**

```bash
git add components/PageToc.tsx app/t/[slug]/page.tsx app/t/[slug]/[component]/page.tsx app/t/[slug]/[component]/[sub]/page.tsx
git commit -m "Add per-page table of contents from rendered headings"
```

---

## Task 11: `AGENTS.md` — agent contract

**Goal:** A single canonical document at the repo root capturing the workflow, the YAML/markdown schemas, and the tone/depth rules. The orchestrator and each stage agent reads this.

**Files:**
- Create: `AGENTS.md`

**Acceptance Criteria:**
- [ ] Document covers: stages and their I/O, file paths, `survey.yaml` schema, `tutorial.yaml` schema, frontmatter schema, tone/depth rules, and what's out of scope.
- [ ] Document references the spec for the long-form rationale.
- [ ] No code; this is reference material for agents.

**Verify:** Manual review — `cat AGENTS.md` → reads as a complete contract.

**Steps:**

- [ ] **Step 1: Write `AGENTS.md`**

```md
# AGENTS.md — Generating a `tutorial`

You are an agent helping a developer understand an unfamiliar codebase. Your output, plus
the outputs of your sibling agents, becomes an interactive tutorial that explains how the
target repository works at a level a junior dev or onboarding senior would find useful.

This document specifies:

1. The pipeline shape (which stage does what, and in what order).
2. The schemas (`survey.yaml`, `tutorial.yaml`, section markdown frontmatter).
3. The tone and depth rules (this is what makes the output useful — get this wrong and the
   rest doesn't matter).

If anything in this document conflicts with general "be helpful" instincts, follow this
document. The full design rationale lives at
`docs/superpowers/specs/2026-05-07-code-tutorial-design.md`.

---

## Pipeline

Three stages run in order. Outputs from each stage are persisted to disk so the pipeline
is debuggable and resumable.

### Stage 1 — Survey (single agent, serial)

Input: a path to a target repository, optional display name.

Job: identify the major components worth teaching. For each, decide whether it is *atomic*
(fits one page) or *subdivided* (needs a list of sub-sections). Be deliberately
breadth-first — do **not** deep-read code in this stage.

Output: `public/tutorials/<slug>/survey.yaml` matching the schema below.

### Stage 2 — Write (one subagent per leaf, in parallel)

A "leaf" is either:
- An atomic component (writes `components/<id>/index.md`), or
- A sub-section under a subdivided component (writes `components/<comp>/<sub>.md`).

Subdivided components themselves do NOT get a writer agent — their `index.md` is composed
later by the synthesizer.

Each writer subagent receives:
- The full `survey.yaml`.
- Its assigned leaf id, title, and `focus_paths`.
- This `AGENTS.md`.

Job: read the relevant area of the repo (and as much of the wider repo as needed for
context), then produce one markdown file with frontmatter. Use cross-references to other
sections by id when natural.

Output: one `.md` file per leaf at the canonical path.

### Stage 3 — Synthesize (single agent, serial)

Input: `survey.yaml` plus all leaf markdown files.

Job:
1. Write `intro.md` — the whole-tutorial executive summary plus a "how the parts fit
   together" prose block.
2. For each *subdivided* component, write `components/<id>/index.md` — a real bridge page
   that introduces the sub-sections and explains the boundaries between them. Not a stub.
3. Finalize `tutorial.yaml`: copy the structure from `survey.yaml`, set `generated_at`,
   resolve `cross_refs` (collect inline references found in leaf prose), and drop
   writer-only fields (`focus_paths`, `notes`).
4. May make small edits to leaf files for cross-section coherence (correcting stale
   references). Conservative — this is not a rewrite pass.

Output: `intro.md`, subdivided component `index.md` files, finalized `tutorial.yaml`.

---

## Schemas

### `survey.yaml`

```yaml
slug: <repo-slug>                        # matches directory name
name: <repo display name>
source:
  path: <local path to source repo>
  url: <git remote url, optional>
notes: |
  Free-form orientation notes for downstream writer agents.
  Stack, conventions, things they should keep in mind.

components:                              # ordered
  - id: <component-id>                   # kebab-case, stable across regenerations when possible
    title: <human title>
    summary: <one-paragraph blurb>
    type: atomic | subdivided
    focus_paths:                         # repo-relative paths the writer should focus on
      - <path>
      - <path>
    sub_sections:                        # only when type=subdivided; ordered
      - id: <sub-id>
        title: <human title>
        summary: <one-paragraph blurb>
        focus_paths:
          - <path>
```

### `tutorial.yaml`

```yaml
slug: <repo-slug>
name: <repo display name>
source:
  path: <local path to source repo>
  url: <git remote url, optional>
generated_at: <ISO 8601>
generator_version: <string>

summary: <1–3 sentences shown on the tutorial library home page>

components:                              # ordered, mirrors survey
  - id: <component-id>
    title: <human title>
    summary: <one-paragraph blurb>
    type: atomic | subdivided
    sub_sections:
      - id: <sub-id>
        title: <human title>
        summary: <one-paragraph blurb>

cross_refs:                              # optional
  - from: <component-id>[/<sub-id>]
    to:   <component-id>[/<sub-id>]
    note: <optional short reason>
```

### Section markdown frontmatter

Every `.md` file under a tutorial begins with YAML frontmatter:

```yaml
---
id: <component-id>            # for index.md, the component id
                              # for sub-section.md, "<component-id>/<sub-id>"
title: <human title>
summary: <one-line>
related:                      # optional; inline cross-refs the writer wants to surface
  - <component-id>[/<sub-id>]
---
```

Body is markdown. Code snippets use standard fenced blocks. The viewer applies Shiki for
syntax highlighting; do not pre-format with HTML.

### Cross-references

Three authoring channels — all converge on the same `Related` footer in the viewer:

1. Inline relative links inside the prose: `[the auth layer](../backend/index.md)`. The
   viewer rewrites these to in-app routes.
2. Section frontmatter `related:` — convenience for surfacing related sections without
   inline links.
3. `tutorial.yaml.cross_refs` — declared by the synthesizer, often by harvesting inline
   references during stage 3.

When a writer agent uses (1) or (2), the synthesizer SHOULD reflect those edges into (3)
during finalization.

---

## Tone and depth rules

These rules are the difference between a useful tutorial and a bloated one. They override
any instinct to be exhaustive.

- **Breadth first, depth second.** The reader should finish a page knowing where things
  live, why each part exists, and how it interacts with neighbors. They do NOT need a
  function-by-function readout.
- **Big picture over line-by-line.** Explain *which parts do what and why*. Code snippets
  earn their place — only include them when prose alone would be unclear.
- **Synthesize, don't duplicate.** If the repo already has a 500-line architecture doc,
  do not reproduce it. Capture the high-level shape and link to it.
- **Pretend the reader is a strong engineer who is new here.** They know what a database
  is. They may not know which library this repo uses or why.
- **Concise.** Prefer short paragraphs. A section page is typically 200–600 words. A
  sub-section page can be longer when needed but should still feel scannable.
- **No hedging.** State what the code does. If you're unsure, read more code.
- **No filler.** "It is important to note that..." adds nothing. Cut it.

---

## File paths recap

```
public/tutorials/<slug>/
  survey.yaml                 # stage 1 output (kept around for debugging)
  tutorial.yaml               # stage 3 output (canonical)
  intro.md                    # stage 3 output
  components/<id>/index.md    # stage 2 if atomic; stage 3 if subdivided
  components/<id>/<sub>.md    # stage 2
```

## Out of scope

- Search inside a tutorial.
- Tutorial diff/refresh.
- Sub-sub-sections (deeper than `<component>/<sub>`).
- Re-architecting the source repo on the user's behalf.
```

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "Add AGENTS.md — pipeline contract, schemas, tone rules"
```

---

## Task 12: Survey agent definition

**Goal:** A markdown file at `agents/survey.md` that, when loaded as the prompt for a Claude session pointed at a target repo, produces a valid `survey.yaml` at the right path.

**Files:**
- Create: `agents/survey.md`

**Acceptance Criteria:**
- [ ] Agent file specifies: required inputs (target repo path, slug), behavior, exact output path, output format with example.
- [ ] Agent file references `AGENTS.md` for the canonical schema.
- [ ] Manual run on the `code-explainer` sibling repo produces a `survey.yaml` with at least 3 components, sensible `focus_paths`, and at least one subdivided component.

**Verify:** Manually load the agent in a Claude Code session targeting `/Users/cdavis/github/code-explainer`. Inspect the produced `survey.yaml`.

**Steps:**

- [ ] **Step 1: Write `agents/survey.md`**

```md
# Survey agent

You are stage 1 of the Code Tutorial pipeline. Your job is to identify the major
components worth teaching for the target repository and produce a `survey.yaml`.

Read `AGENTS.md` at the root of this repository (the Code Tutorial repo, NOT the target)
for the canonical schema and tone rules.

## Inputs

You will be given:

- `TARGET_REPO`: absolute path to the repository to be analyzed.
- `SLUG`: kebab-case directory name to use under `public/tutorials/<slug>/`. Default to
  `path.basename(TARGET_REPO)` if not provided.
- `NAME` (optional): human-readable name. Default to a Title-Cased version of the slug.

## Behavior

1. Read the target repo's top-level `README.md` if it exists.
2. Read package manifests at the root: `package.json`, `pyproject.toml`, `Cargo.toml`,
   `go.mod`, `Gemfile`, `requirements.txt`, plus any obvious infra/CI config files. The
   point is to learn the stack and the conventions.
3. List the directory tree to depth 2–3. Note where tests live, where configuration
   lives, where the bulk of source code lives.
4. Identify the major components. Useful categories (use only those that apply): backend
   API, frontend UI, infrastructure (CDK/Terraform/etc), database/data layer, CI/CD,
   shared library code, build/dev tooling, documentation site. Do not invent components
   for things that don't exist in the repo.
5. For each component, decide `atomic` or `subdivided`:
   - **atomic**: a single 200–600 word page can fully explain it.
   - **subdivided**: the area is large enough that one page would be unhelpful — list 2–6
     sub-sections, each with a one-paragraph summary.
6. For each component (and each sub-section), record `focus_paths` — the directories or
   files the writer agent should focus on. Be precise.
7. In the `notes` field at the top of the file, capture stack-level orientation downstream
   writers will need (e.g., "Next.js 15 App Router", "Postgres via Prisma", "AWS CDK
   v2"). Two to four short paragraphs.

## Constraints

- DO NOT deep-read code. You are scoping, not explaining.
- DO NOT propose more than ~8 top-level components for any repo. If you find more, group.
- DO NOT propose sub-sub-sections. Depth is two only.
- IDs are kebab-case. Stable when possible (so re-runs reuse the same ids).

## Output

Write the file to: `public/tutorials/<slug>/survey.yaml` (path relative to the Code
Tutorial repo, NOT the target). Match the schema in AGENTS.md exactly. Example shape:

```yaml
slug: example-repo
name: Example Repo
source:
  path: /absolute/path/to/target
notes: |
  Stack: Node 20 + Express, Postgres via Prisma, React + Vite frontend, AWS CDK v2.
  Convention: tests live next to source as *.test.ts; configuration lives under config/.

components:
  - id: backend
    title: Backend
    summary: Express API server with a Prisma data layer.
    type: atomic
    focus_paths: [server/src, server/prisma]
  - id: frontend
    title: Frontend
    summary: React + Vite SPA with file-based routing.
    type: subdivided
    focus_paths: [web/src]
    sub_sections:
      - id: routing
        title: Routing
        summary: How pages and navigation are organized.
        focus_paths: [web/src/routes]
      - id: state-management
        title: State management
        summary: The global store and how it talks to the API.
        focus_paths: [web/src/store, web/src/api]
```

When done, print a one-paragraph rationale for the component decomposition. Do not write
any markdown files in this stage — only the survey.
```

- [ ] **Step 2: Commit**

```bash
git add agents/survey.md
git commit -m "Add survey agent definition"
```

- [ ] **Step 3: Manual verification (do not skip)**

Open a fresh Claude Code session at this repo's root. Load the agent and run it against
`/Users/cdavis/github/code-explainer`:

```
Read AGENTS.md and agents/survey.md. TARGET_REPO=/Users/cdavis/github/code-explainer, SLUG=code-explainer. Produce the survey.yaml.
```

Inspect `public/tutorials/code-explainer/survey.yaml`. Spot-check: are the components
plausible, are the `focus_paths` real directories, does at least one component look
appropriately subdivided?

If the survey looks bad, edit `agents/survey.md` and amend the commit.

---

## Task 13: Writer agent definition

**Goal:** A markdown file at `agents/writer.md` that, given the survey + a leaf id, produces one valid leaf markdown file.

**Files:**
- Create: `agents/writer.md`

**Acceptance Criteria:**
- [ ] Agent file specifies: required inputs (slug, leaf id), the path it must read from (`focus_paths`), output path, frontmatter schema, prose guidelines.
- [ ] References `AGENTS.md` for the canonical tone/depth rules.
- [ ] Manual run on one leaf of the `code-explainer` survey produces a markdown file that satisfies the schema and reads naturally.

**Verify:** Manually run on `code-explainer`'s `app` (or whichever leaf is appropriate). Inspect the file.

**Steps:**

- [ ] **Step 1: Write `agents/writer.md`**

```md
# Writer agent

You are stage 2 of the Code Tutorial pipeline. You write ONE leaf section of the tutorial.

Read `AGENTS.md` for the canonical schema and tone rules. Read this file for execution
specifics. Read the survey to orient yourself in the wider repo.

## Inputs

- `SLUG`: tutorial slug.
- `LEAF_ID`: either `<component-id>` (atomic component) or `<component-id>/<sub-id>`
  (sub-section).
- The full `public/tutorials/<slug>/survey.yaml`.
- `TARGET_REPO`: absolute path to the source repo.

## Behavior

1. Read `survey.yaml`. Find your leaf. Read its `title`, `summary`, and `focus_paths`. Also
   read `notes` at the top — that's your orientation.
2. Read the wider survey so you know what other components/sub-sections exist. You will
   reference them by id; the ids are canonical.
3. Read the relevant area of the source repo, focused on `focus_paths`. You may read
   beyond `focus_paths` for context, but the prose must be about this leaf's area.
4. Write the file. See output specs below.

## Tone reminders (full rules in AGENTS.md)

- Breadth first. 200–600 words for atomic components, up to ~800 for substantive
  sub-sections. Be ruthless about cutting filler.
- Big picture: where things live, why they exist, how they interact with neighbors.
- Code snippets earn their place. Use them only when prose alone would be unclear. Keep
  snippets short (5–15 lines). Reference real symbol names from the repo.
- Cross-reference other sections by id when natural. Two channels:
  - Inline links: `[the auth layer](../backend/index.md)` for an atomic, or
    `[routing](./routing.md)` from another sub-section in the same component.
  - Frontmatter `related:` for sections worth surfacing without inline links.
- Synthesize existing docs; do not duplicate them. If the repo has a long ADR or
  architecture doc, summarize and link to its file path.

## Frontmatter schema

```yaml
---
id: <leaf-id>                 # e.g. "backend" or "frontend/routing"
title: <human title>          # match survey.yaml
summary: <one-line>            # match survey.yaml; tighten if needed
related:                      # optional
  - <component-id>[/<sub-id>]
---
```

## Output path

- Atomic component (LEAF_ID has no slash): write to
  `public/tutorials/<slug>/components/<LEAF_ID>/index.md`.
- Sub-section (LEAF_ID is `<comp>/<sub>`): write to
  `public/tutorials/<slug>/components/<comp>/<sub>.md`.

## Constraints

- Frontmatter `id` MUST equal LEAF_ID exactly.
- DO NOT write any other files.
- DO NOT include the survey itself or unrelated leaves' content.
- Headings inside the body start at h2. Do not include h1 — the page title comes from
  frontmatter.
```

- [ ] **Step 2: Commit**

```bash
git add agents/writer.md
git commit -m "Add writer agent definition"
```

- [ ] **Step 3: Manual verification**

Run the writer on one leaf from the survey produced in Task 12:

```
Read AGENTS.md and agents/writer.md. SLUG=code-explainer, LEAF_ID=app, TARGET_REPO=/Users/cdavis/github/code-explainer. Write the leaf.
```

Inspect the generated file. Read it as a person who has never seen `code-explainer`. Do
you know what the `app` does and why, after 5 minutes? If not, refine `agents/writer.md`.

---

## Task 14: Synthesizer agent definition

**Goal:** A markdown file at `agents/synthesizer.md` that produces `intro.md`, subdivided component `index.md` files, and a final `tutorial.yaml`.

**Files:**
- Create: `agents/synthesizer.md`

**Acceptance Criteria:**
- [ ] Agent file specifies: required inputs, output paths, schemas, and explicit boundaries on what edits it may make to leaf files.
- [ ] References `AGENTS.md`.

**Verify:** Manual run after stages 1+2 have run for one repo. Inspect `intro.md`, the bridge `index.md` files, and `tutorial.yaml`. The `cross_refs` in `tutorial.yaml` should include any inline links found in leaf prose.

**Steps:**

- [ ] **Step 1: Write `agents/synthesizer.md`**

```md
# Synthesizer agent

You are stage 3 of the Code Tutorial pipeline. You produce the top-level overview, the
bridge pages for subdivided components, and the canonical `tutorial.yaml`.

Read `AGENTS.md` for the canonical schema and tone rules.

## Inputs

- `SLUG`: tutorial slug.
- `TARGET_REPO`: absolute path to the source repo (for occasional verification — you
  should not be doing fresh deep reads at this stage).
- `public/tutorials/<slug>/survey.yaml` — the structural spine.
- All leaf markdown files at their canonical paths.

## Behavior

### 1. Write `intro.md`

Path: `public/tutorials/<slug>/intro.md`.

Frontmatter:

```yaml
---
id: intro
title: <tutorial name>
summary: <one-line>
---
```

Body:
- An h1 with the repo name (the renderer treats this naturally).
- A 2–4 sentence executive summary of what the repo does and who would care.
- An h2 "How the parts fit together" with prose explaining the relationships between
  components. This is the most important paragraph in the entire tutorial — it gives the
  learner a mental model in 100–200 words.

### 2. Write bridge pages for subdivided components

For each component where `type == subdivided`, write:
`public/tutorials/<slug>/components/<id>/index.md`.

Frontmatter:

```yaml
---
id: <component-id>
title: <component title>
summary: <one-line>
---
```

Body (200–400 words):
- A short orientation: what this component is and why it's worth its own area.
- An "In this component" h2 explaining what each sub-section covers and why the
  boundaries are where they are. This is your bridge — point readers to the right
  sub-section. Do not duplicate sub-section content; just frame it.

### 3. Finalize `tutorial.yaml`

Path: `public/tutorials/<slug>/tutorial.yaml`. Schema in AGENTS.md.

- Copy structure from `survey.yaml`.
- Drop writer-only fields (`focus_paths`, `notes`).
- Set `generated_at` to ISO 8601 now.
- Set `generator_version` to `0.1.0`.
- Build `cross_refs`:
  - Walk every leaf markdown body. For each inline link to another leaf's path, emit a
    `cross_refs` entry from the current leaf to the target leaf id.
  - Walk every leaf frontmatter `related:` list. For each entry, emit a `cross_refs`
    entry from the current leaf to the target.
  - De-duplicate.

### 4. Coherence pass (small edits only)

You MAY make small edits to leaf markdown files for cross-section coherence:

- Fix a stale reference (a link to a sibling that doesn't exist, or has been renamed).
- Tighten a transition sentence that conflicts with the bridge page.

You MAY NOT:
- Rewrite or substantially edit prose.
- Change frontmatter `id`.
- Reorder content.

## Constraints

- Do not produce sub-section markdown files in this stage. Those came from stage 2.
- Do not regenerate `survey.yaml`. It is the historical record of stage 1.
- IDs in `tutorial.yaml.components` MUST exactly match the survey.

## Output paths recap

- `public/tutorials/<slug>/intro.md`
- `public/tutorials/<slug>/components/<id>/index.md` (only for subdivided components)
- `public/tutorials/<slug>/tutorial.yaml`
- Optional small edits to leaf `.md` files.
```

- [ ] **Step 2: Commit**

```bash
git add agents/synthesizer.md
git commit -m "Add synthesizer agent definition"
```

---

## Task 15: Orchestrator slash command

**Goal:** A Claude Code slash command at `.claude/commands/build-tutorial.md` that drives the three stages, dispatching parallel writers via the Task tool.

**Files:**
- Create: `.claude/commands/build-tutorial.md`

**Acceptance Criteria:**
- [ ] Slash command takes a target repo path (and optional slug) and runs the full pipeline.
- [ ] Writer subagents are dispatched in a single message (parallel) using the Task tool.
- [ ] Each stage's output is written to disk; the command verifies each before continuing.
- [ ] Final output: a tutorial directory ready to be viewed at `/t/<slug>/`.

**Verify:** Run the slash command on a small real repo. Confirm the tutorial loads in the browser.

**Steps:**

- [ ] **Step 1: Write `.claude/commands/build-tutorial.md`**

```md
---
description: Generate a code tutorial for a target repository (3-stage pipeline).
---

You are the orchestrator for the Code Tutorial pipeline. Your job is to drive the three
stages — survey → parallel writers → synthesizer — and produce a complete tutorial under
`public/tutorials/<slug>/`.

## Inputs

Parse the user's invocation. They will provide:

- `TARGET_REPO` (required): absolute path to the source repo.
- `SLUG` (optional): kebab-case. Default to `path.basename(TARGET_REPO)`.
- `NAME` (optional): human display name.

If `TARGET_REPO` is missing, ask for it once and stop.

## Pipeline

### Stage 1 — Survey

Read `AGENTS.md` and `agents/survey.md`. Then act as the survey agent: produce
`public/tutorials/<SLUG>/survey.yaml`.

After writing, read it back and confirm:
- `components` is non-empty.
- Every component has `id`, `title`, `summary`, `type`.
- Every subdivided component has at least 2 `sub_sections`.

If any check fails, fix and re-write. Do NOT proceed to stage 2 with a malformed survey.

**Pause and show the survey to the user.** Ask: "Survey looks like this. Does the
component decomposition look right? (yes / edit / cancel)" — proceed only on yes.

### Stage 2 — Parallel writers

Compute the leaf list:
- For each component with `type == atomic`: leaf id = `<component.id>`.
- For each component with `type == subdivided`: one leaf per sub-section, leaf id =
  `<component.id>/<sub.id>`.

Dispatch ALL leaf writers in a single message using multiple `Task` tool calls in
parallel (one Task per leaf). For each leaf, the Task prompt must:
- Include the contents of `AGENTS.md` and `agents/writer.md`.
- Include the contents of `survey.yaml`.
- Specify `SLUG`, `LEAF_ID`, `TARGET_REPO`.
- Instruct the subagent to write only the one leaf file at the canonical path.

Set `subagent_type` to `general-purpose` (the writer agent contract is the prompt; no
custom subagent type is needed).

After all subagents return, verify each expected leaf file exists. If any are missing,
re-dispatch only the missing ones.

### Stage 3 — Synthesizer

Read `AGENTS.md` and `agents/synthesizer.md`. Then act as the synthesizer agent:

- Write `intro.md`.
- Write `components/<id>/index.md` for each subdivided component.
- Write `tutorial.yaml`.
- Make any small coherence-pass edits to leaves.

## Final report

Print a summary to the user:
- Tutorial slug.
- Number of components, of which N subdivided.
- Total number of leaf pages written.
- The viewer URL: `http://localhost:3005/t/<SLUG>/`.

Suggest: `npm run dev` (if not already running) and open the URL.

## Failure handling

If any stage fails, print the stage and the reason, leave whatever has been written on
disk for inspection, and stop. The user can re-run the command to retry — survey
re-runs are cheap; writers and synthesizer can re-run from the existing survey.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/commands/build-tutorial.md
git commit -m "Add /build-tutorial orchestrator slash command"
```

---

## Task 16: End-to-end smoke test

**Goal:** Run the full pipeline on a small real repository, view the result in the browser, and capture findings to drive any agent prompt fixes.

**Files:**
- May modify: `agents/survey.md`, `agents/writer.md`, `agents/synthesizer.md` (if the smoke test surfaces issues).
- May modify: `public/tutorials/<slug>/` (the output of the run — kept committed as a real example alongside the hand-written fixture).

**Acceptance Criteria:**
- [ ] The pipeline runs end-to-end on `/Users/cdavis/github/code-explainer` (a small, well-bounded repo) without manual intervention beyond approving the survey.
- [ ] The resulting tutorial loads in the browser at `/t/code-explainer/`.
- [ ] Sidebar nav, overview, component pages, and (if any) sub-section pages all render correctly.
- [ ] Cross-references work — clicking an inline link or a "Related" entry navigates to the right page.
- [ ] At least one round of feedback is captured into agent prompts and committed.

**Verify:** Manual walkthrough of the rendered tutorial. Open at least 3 different pages, click 2 cross-references, confirm the content is actually useful (not just structurally correct).

**Steps:**

- [ ] **Step 1: Run the pipeline**

In a fresh Claude Code session at this repo's root:

```
/build-tutorial TARGET_REPO=/Users/cdavis/github/code-explainer SLUG=code-explainer
```

- [ ] **Step 2: Inspect the survey before approving**

When prompted, read the survey. Common issues to watch for:
- A spurious "tests" or "config" component that should have been folded into others.
- Missing components (the deploy story not surfaced as its own section, etc.).
- Wrong `type` (subdivided when it should be atomic, or vice versa).
- `focus_paths` pointing at directories that don't exist.

If the survey is wrong, edit `agents/survey.md` to fix the underlying instruction, not
the output. Re-run.

- [ ] **Step 3: Walk the rendered tutorial**

```bash
npm run dev
```
Open `http://localhost:3005/t/code-explainer/`. Visit:
- Overview page.
- Two component pages (one atomic, one subdivided if any).
- One sub-section page if any exist.
- Click a cross-reference.

Read each page as if you'd never seen `code-explainer`. Note where the explanation:
- Wastes words (filler, hedging, restating the obvious).
- Goes too deep (function-by-function) — this is a writer prompt issue.
- Misses the why or the relationships — also a writer prompt issue.
- Has a broken link — likely a cross_refs harvest bug in the synthesizer.

- [ ] **Step 4: Capture findings into agent prompts**

For every issue you noted, edit the corresponding agent file:
- Survey shape problems → `agents/survey.md`.
- Tone/depth/coverage problems → `agents/writer.md` (and possibly `AGENTS.md`).
- Bridge page or cross_refs problems → `agents/synthesizer.md`.

Re-run the pipeline if you made meaningful changes.

- [ ] **Step 5: Commit**

```bash
git add public/tutorials/code-explainer agents AGENTS.md
git status
git commit -m "Smoke-test pipeline on code-explainer; refine agent prompts"
```

---

## Self-review (executed before handoff)

**Spec coverage** (against `docs/superpowers/specs/2026-05-07-code-tutorial-design.md`):

- §1 Purpose, vision recap → addressed in plan header and `AGENTS.md` (Task 11).
- §2 Information architecture (3 levels) → Tasks 6, 7, 8 implement the three route levels.
- §3 On-disk data layout → Task 1 creates the layout; Task 2 reads it.
- §3.1 `tutorial.yaml` schema → Task 1 fixture, Task 2 loader, Task 11 contract.
- §3.2 Markdown frontmatter → Task 1 fixture, Task 2 loader, Task 11 contract.
- §3.3 Cross-references (3 channels) → Task 9 unifies frontmatter `related:` and `cross_refs`; Task 3 handles inline link rewriting.
- §4 Frontend stack, routes, layout, library → Tasks 0, 4, 5, 6, 7, 8, 10.
- §5.1 Survey stage → Task 12.
- §5.2 Parallel writers → Task 13 + Task 15 dispatch.
- §5.3 Synthesizer → Task 14.
- §5.4 `AGENTS.md` → Task 11.
- §5.5 Orchestrator → Task 15.
- §6 Repo layout → matches the file structure section above.
- §7 Out of scope → respected (no search, no light mode, no diff/refresh, no graph viz, no deploy story).
- §9 Risk: "inspect/edit `survey.yaml` before stage 2" → Task 15's Stage 1 step pauses for user approval.

**Placeholder scan:** No "TBD", "TODO", or "implement later" remain. Task 10 had a layout strategy decision; resolved inline (option 1, in-page grid).

**Type consistency:** `Tutorial`, `Component`, `SubSection`, `CrossRef`, `SectionFrontmatter`, `TocEntry`, `RenderResult`, `RenderContext`, `SectionRef` — names used consistently across tasks. Loader returns `SectionFile` (frontmatter + body) and `Tutorial` (parsed yaml).

**Scope check:** One plan, one feature. The frontend and agent pipeline share the data contract; splitting them across two plans would force premature contract-freezing without an end-to-end test. Single plan with sequential tasks is right.
