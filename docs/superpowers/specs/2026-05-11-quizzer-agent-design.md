# Quizzer agent — design

Stage 5 of the Code Tutorial pipeline. Optional. Produces a structured
multiple-choice quiz that tests big-picture understanding of the tutorial subject.

## Motivation

The tutorial gives the reader a map of the codebase. A quiz forces them to
*use* that map: identify seams, predict what would break if a decision were
flipped, trace which character owns what. A reader who can answer twelve
big-picture questions about a repo understands it; one who can't, doesn't —
regardless of how confidently they nodded along while reading.

The agent runs last because it depends on the structural spine being settled.
It is cheap to re-run.

## Pipeline position

```
stage 1 survey  →  stage 2 writers  →  stage 3 synthesizer  →  stage 4 augment  →  stage 5 quizzer
                                                                                    ▲
                                                                                    optional, re-runnable
```

Stage 5 does not modify any earlier-stage output. It only writes one new file.

## Input

- `public/tutorials/<slug>/tutorial.yaml`
- `public/tutorials/<slug>/intro.md`
- `public/tutorials/<slug>/aux/*.md` (glossary, characters, decisions, seams)
- `public/tutorials/<slug>/components/**/*.md` (read on demand for grounding)
- `TARGET_REPO`: light grepping/reading allowed to fact-check specific claims
  before finalizing each review section. Not a re-survey.

## Output

One new file: `public/tutorials/<slug>/aux/quiz.yaml`.

## Schema

```yaml
slug: <repo-slug>
title: "<repo display name> — concepts quiz"
summary: <one-line>
generated_at: <ISO 8601>
generator_version: 0.1.0

questions:                                # exactly 12
  - id: <kebab-case>                      # stable across regenerations when possible
    topic: architecture | decisions | seams | interactions | tradeoffs
    prompt: |
      <one or two sentences>
    options:
      - { id: a, text: <one sentence> }
      - { id: b, text: <one sentence> }
      - { id: c, text: <one sentence> }
      - { id: d, text: <one sentence> }
    answer: <a|b|c|d>
    review: |
      <2-4 sentences: why the correct answer is right; the principle or decision
      behind it; what a reader should now understand>
    distractor_notes:                     # one per option, INCLUDING the right one
      a: <what believing this would mean / why it's wrong, or — for the correct
          option — the principle it embodies>
      b: ...
      c: ...
      d: ...
    grounded_in:                          # optional pointers for the curious
      - <component-id[/sub-id] or repo-relative path>
```

`distractor_notes` are included for every option so a reader who picked
correctly still learns what each wrong pick *would have implied*. That is the
teaching surface.

## Authoring rules

These are the difference between a useful quiz and a trivia game.

**Question style — yes:**
- "Why is the architecture shaped this way?"
- "If X were removed, what would break, and where?"
- "Which seam does feature Y cross?"
- "How does character A interact with character B?"
- "What constraint forced this decision?"

**Question style — no:**
- File paths, function names, variable names, line counts.
- Syntax or language-specific minutia.
- "What does `X.js` do?"
- "What port does the dev server run on?"
- Anything answerable with ctrl-F on a single file.

**Distractor rules:**
- All four options must be defensible enough that a half-attentive reader would
  pick them.
- No filler ("none of the above", "all of the above", absurd choices).
- Wrong options should map to real misconceptions — the obvious instinct, the
  conflation with a similar concept elsewhere in the same repo, the
  not-quite-right framing.

**Source prioritization** (where to draw questions from):
1. `aux/decisions.md` — every decision is a quiz seed.
2. `aux/seams.md` — seam identification questions are high-signal.
3. `aux/characters.md` — who-owns-what / who-talks-to-whom.
4. `tutorial.yaml.cross_refs` — relationships across components.
5. `intro.md` — whole-system synthesis questions.

Aim for coverage across the five topic tags. Do not stack 8 questions on one
component.

**Fact-check loop:** for each question, after drafting, the agent confirms the
claim against the actual codebase (read a file, grep a symbol). If the claim
doesn't hold up, rewrite. Do not ship a question whose review section is
factually wrong.

## What this stage does NOT do

- Modify any file outside `aux/quiz.yaml`.
- Change `tutorial.yaml` (the renderer will discover `aux/quiz.yaml` on its own
  when frontend support lands).
- Author per-component quizzes. One quiz per tutorial.
- Render the quiz. A frontend integration is a separate project.

## Out of scope

- Open-ended / free-text questions.
- Quiz difficulty levels.
- Per-question scoring weights.
- Persisting reader results.

## Validation

After writing `aux/quiz.yaml`, the agent confirms:
- Exactly 12 questions.
- Every question has exactly 4 options with ids `a/b/c/d`.
- Every question has an `answer` matching one of its option ids.
- Every option has a `distractor_notes` entry.
- The `topic` tag is one of the five allowed values.
- No two questions ask the same thing in different words.

If validation fails, fix and rewrite.
