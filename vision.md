# Codebase Tutorial — Vision

## What we're building

A two-part system that takes any arbitrary code repository and produces an interactive tutorial that teaches a developer how that codebase works.

1. **Agent pipeline** — analyzes the repo and emits structured tutorial data.
2. **Frontend** — a web app that loads those data files and renders an interactive, navigable tutorial.

## Who the tutorial is for

A developer who is generally fluent with software principles and coding but who is new to *this specific codebase*. Think: a junior dev about to start contributing, or any engineer onboarding to an unfamiliar project.

Assumptions about the learner:
- They pick up new concepts quickly.
- They have general coding fluency, but may not know every framework, tool, or feature in use.
- They want a working mental model of how the pieces fit together — not a function-by-function readout.

What success looks like: after going through the tutorial, the learner can **reason intelligently about the codebase**. They know where things live, why each major part exists, and how the parts interact. They don't necessarily understand every individual function — that's what reading the code is for.

## Tutorial philosophy

- **Breadth first, depth second.** Start from the executive summary and let the learner drill in.
- **Big picture over line-by-line.** Explain *which parts do what and why*, and how they affect other parts. Code snippets are used sparingly, only when they actually help.
- **Don't duplicate exhaustive docs.** If the repo has a 500-line architecture markdown, we don't reproduce it — we synthesize the high-level shape and point to it.
- **The agent reads everything; the user doesn't have to.** The agent may need to look at every file and function to draw an accurate big picture, but the learner only sees the synthesized understanding.

## Agent pipeline

Three stages, structured as serial → parallel → serial:

1. **Survey (serial).** A single agent does a quick pass over the repo structure to identify the major sections worth teaching — e.g., CI/CD, infrastructure, database layer, frontend, API, formatting/tooling, etc.
2. **Deep dive (parallel).** Sub-agents are spawned, one per major section, each producing a detailed report on its area. Running in parallel keeps the pipeline fast.
3. **Synthesize (serial).** A final agent stitches the section reports together into a unified tutorial: a top-level executive summary plus per-section pages, with cross-references between them.

The agents are defined as agent markdown files. A "parent" agent file may invoke "child" agent files to drive the parallelism.

## Output format

The agent pipeline produces structured data files (likely YAML — fewer tokens than JSON for agentic generation) that the frontend consumes. Re-running the agent on a repo regenerates these files.

## Frontend

- **Intro page.** Executive summary: why this repo exists, what it does, the major parts, and roughly how they work together. Concise.
- **Section pages.** Click into any major part (e.g., "Database", "CI/CD") and get the same shape: high-level explanation first, then more detail.
- **Interactive navigation.** Click into sections, click back up, follow cross-references between related parts.
- **Code snippets used judiciously.** The point is not to read code in the browser — it's to understand how parts fit. Show code only when it earns its place.
- **Modern web stack, dark mode first.**
- **Data-driven.** The frontend is a generic tutorial renderer. Point it at a different set of agent-generated data files and it renders a tutorial for a different repo.

## End-to-end workflow

1. User points the system at a target repository.
2. The agent pipeline runs (survey → parallel deep dives → synthesis) and writes the tutorial data files.
3. The frontend loads those files and presents the interactive tutorial.

## Open design questions (for next planning steps)

- Exact data schema for tutorial files.
- How the agent pipeline is invoked (CLI? script? slash command?).
- How the frontend discovers and loads tutorials (single repo at a time? a library of generated tutorials?).
- Frontend framework choice.
- Where generated tutorials live relative to the source repo.
