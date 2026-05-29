# AI Skills

Personal skills for Claude Code and other AI assistants.

## Installation

```bash
./install.sh <skill-name> <target>
```

Symlinks a single skill into a target tool's skills directory. `<target>` is one of:

| Target   | Skills directory      |
|----------|-----------------------|
| `claude` | `~/.claude/skills/`   |
| `grok`   | `~/.grok/skills/`     |
| `codex`  | `~/.codex/skills/`    |

For example, `./install.sh caveman claude` links the `caveman` skill into Claude Code. Both arguments are required; the script errors if the skill is missing a `SKILL.md` or the target is unknown. Re-running is safe (idempotent).

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
3. Run `./install.sh my-skill <target>` to link it into a tool

## Third-Party Skills

Third-party skills go directly in a tool's skills directory (e.g. `~/.claude/skills/`), not in this repo.
