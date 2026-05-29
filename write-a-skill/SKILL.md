---
name: write-a-skill
description: |
  Create a new skill for this repo with proper structure, lazy loading,
  and a discoverable description. TRIGGER when the user wants to create,
  write, or build a new skill, or extract a recurring pattern / hard-won
  preference into a reusable skill.
---

# Write A Skill

A skill is **distilled experience** — a conclusion reached through trial and error, captured so future work starts from the right answer instead of rediscovering it. It either gives immediate access to high-value code, or encodes a preferred pattern/stack decision so the agent doesn't suggest a generic one.

Before writing: read `CLAUDE.md` at the repo root — it is the source of truth for these conventions. This skill summarises it.

## Process

1. **Gather requirements** — ask the user:
   - What recurring problem does this skill solve?
   - What's the non-obvious knowledge (the part learned the hard way)?
   - Does it need ready-to-use code, or just instructions?
   - What should *trigger* it?

2. **Draft** — create the directory and files (see structure below).

3. **Review with the user** — does it cover the use cases? Anything missing? Right altitude?

4. **Install** — run `./install.sh` to symlink the new skill into `~/.claude/skills/`.

## Structure

`kebab-case` directory with a `SKILL.md` entry point. **`SKILL.md` is the only file auto-loaded into context** — everything else loads on demand.

```
my-skill/
├── SKILL.md              # Overview, when to use, file references (always loaded)
├── implementation.md     # Detailed docs (loaded on demand)
└── code/                 # Actual code, lowercase subdir: code/ components/ utils/
    └── example.ts
```

## Core principles (from CLAUDE.md)

1. **Context is valuable.** Everything in `SKILL.md` costs space the actual task could use. Keep it concise.
2. **Lazy load code.** `SKILL.md` describes *what exists and when to use it*. Implementation code lives in separate files, read on demand. Do **not** inline large code blocks or full API docs into `SKILL.md`.
3. **Group related concepts.** Combine variants of one problem across stacks into a single skill (e.g. Rust + Vite versioning together). Split when a skill tries to cover unrelated domains.

## SKILL.md contents

**Should contain:** brief purpose, when to use each component, retrieval paths.

**Should NOT contain:** large code blocks, detailed API/prop docs, anything already in the code files.

Component descriptions stay one line — purpose and when-to-use only:

```markdown
**ComponentName** — One-line description of what it does and when to use it.
→ `components/ComponentName.tsx`
```

## Frontmatter & description

```md
---
name: skill-name
description: |
  What it does (first sentence). TRIGGER when: (1) ..., (2) ..., (3) ...
---
```

The `description` is **the only thing the agent sees** when deciding whether to load the skill. Make it earn its place:

- First sentence: what capability it provides.
- Then explicit triggers — keywords, contexts, file types, error signatures. The existing skills in this repo use a numbered `TRIGGER when:` list; match that style.
- Write in third person. No time-sensitive info.

Good: `Reference implementations for embedding version metadata at compile time. Covers Rust and Vite. TRIGGER when adding version/build stamping to a project.`

Bad: `Helps with versioning.` — gives the agent no way to distinguish it from anything else.

## What makes a good skill

- Solves a recurring problem.
- Contains non-obvious knowledge gained through experience.
- Provides ready-to-use implementations, not just links to external docs.
- Stays focused on one domain.

## What to avoid

- Skills that just link to external documentation.
- Overly broad skills that try to cover everything.
- Duplicating content between `SKILL.md` and implementation files.
- Volatile data that changes frequently.

## Checklist

- [ ] `kebab-case` directory, `SKILL.md` entry point
- [ ] Description has a clear first sentence + explicit triggers
- [ ] `SKILL.md` is concise; code/details are lazy-loaded into sibling files
- [ ] Code subdirs are lowercase (`code/`, `components/`, `utils/`)
- [ ] No volatile data, no duplication
- [ ] `./install.sh` run to link it

---

_Adapted from [mattpocock/skills](https://github.com/mattpocock/skills) and reconciled with this repo's `CLAUDE.md`._
