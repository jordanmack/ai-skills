# AI Skills

Personal skills for Claude Code and other AI assistants.

## Installation

```bash
./install.sh
```

This creates symlinks in `~/.claude/skills/` pointing to each skill in this repo.

## Structure

Each subdirectory with a `SKILL.md` file is a skill:

```
ai-skills/
├── auto-versioning/
│   ├── SKILL.md
│   ├── rust-build-version.md
│   └── vite-version-plugin.js
├── preferred-libraries/
│   └── SKILL.md
├── react-ui-patterns/
│   ├── SKILL.md
│   └── components/
│       ├── Tooltip.tsx
│       └── ...
└── install.sh
```

## Adding a New Skill

1. Create a directory: `mkdir my-skill`
2. Add `SKILL.md` with instructions
3. Run `./install.sh` to link it

## Third-Party Skills

Third-party skills go directly in `~/.claude/skills/` (not in this repo).
