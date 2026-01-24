# Skill Authoring Guidelines

This repository contains reusable skills for Claude Code. Follow these conventions when creating or modifying skills.

## Purpose

These skills serve two goals:

1. **Immediate access to high-value code.** Certain components and patterns are used repeatedly across projects. Rather than recreating them each time, skills provide ready-to-use implementations that can be retrieved instantly.

2. **Encode preferred patterns and stack decisions.** With many options available for any given problem, AI tends to suggest generic solutions that require iteration to reach the desired approach. Skills capture those hard-won preferences upfront — specific libraries, UI patterns, and conventions that have proven effective — eliminating repeated back-and-forth.

In short: skills are distilled experience. They represent conclusions that were reached through trial and error, so that future work starts from the right answer instead of rediscovering it.

## Core Principles

1. **Context is valuable.** Everything loaded into context takes space that could be used for the actual task. Keep skills concise.

2. **Lazy load code.** SKILL.md should describe what exists and when to use it. Put implementation code in separate files that are read on demand.

3. **Group related concepts.** Combine skills that address the same problem across different stacks (e.g., versioning for Rust and Vite in one skill).

## Skill Structure

### Entry Point

Every skill must have a `SKILL.md` file. This is the only file automatically loaded into context.

### Lazy Loading Pattern

For skills with code implementations:

```
my-skill/
├── SKILL.md              # Overview, when to use, file references
├── implementation.md     # Detailed docs (loaded on demand)
└── code/
    └── example.ts        # Actual code (loaded on demand)
```

SKILL.md should contain:
- Brief description of the skill's purpose
- When to use each component
- File paths for retrieval (e.g., `→ code/example.ts`)

SKILL.md should NOT contain:
- Large code blocks that can live in separate files
- Detailed API documentation (put in the component files)
- Redundant information already in the code files

### Component Descriptions

Keep component descriptions brief — purpose and when to use only:

```markdown
**ComponentName** — One-line description of what it does and when to use it.
→ `components/ComponentName.tsx`
```

Do not duplicate prop definitions or API details that exist in the source files.

## Naming Conventions

- Skill directories: `kebab-case`
- Entry file: Always `SKILL.md` (uppercase)
- Code subdirectories: `components/`, `utils/`, `code/` as appropriate

## What Makes a Good Skill

- Solves a recurring problem
- Contains non-obvious knowledge gained through experience
- Provides ready-to-use implementations, not just documentation links
- Stays focused on one domain (split if covering unrelated topics)

## What to Avoid

- Skills that just link to external documentation
- Overly broad skills that try to cover everything
- Duplicating content between SKILL.md and implementation files
- Including volatile data that changes frequently
