#!/bin/bash
# Install skills by creating symlinks in ~/.claude/skills/

SKILLS_DIR="$HOME/.claude/skills"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$SKILLS_DIR"

count=0
for skill in "$REPO_DIR"/*/; do
    name=$(basename "$skill")
    # Skip hidden dirs and non-skill directories
    [[ "$name" == ".*" ]] && continue
    [[ ! -f "$skill/SKILL.md" ]] && continue

    ln -sfn "$skill" "$SKILLS_DIR/$name"
    echo "  Linked: $name"
    ((count++))
done

echo "Installed $count skill(s) to $SKILLS_DIR"
