#!/bin/bash
# Install a single skill by symlinking it into a target tool's skills directory.
#
# Usage: ./install.sh <skill-name> <target>
#   <skill-name>  a skill directory in this repo (must contain SKILL.md)
#   <target>      one of: claude | grok | codex
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

usage() {
	echo "Usage: $0 <skill-name> <target>"
	echo "  <target>: claude | grok | codex"
	exit 1
}

[[ $# -eq 2 ]] || usage

SKILL_NAME="$1"
TARGET="$2"

# Resolve the target tool to its skills directory.
case "$TARGET" in
	claude) SKILLS_DIR="$HOME/.claude/skills" ;;
	grok)   SKILLS_DIR="$HOME/.grok/skills" ;;
	codex)  SKILLS_DIR="$HOME/.codex/skills" ;;
	*)      echo "Error: unknown target '$TARGET' (expected claude, grok, or codex)"; usage ;;
esac

SKILL_DIR="$REPO_DIR/$SKILL_NAME"

# Validate the skill exists and is actually a skill.
if [[ ! -d "$SKILL_DIR" ]]; then
	echo "Error: no skill named '$SKILL_NAME' in $REPO_DIR"
	exit 1
fi
if [[ ! -f "$SKILL_DIR/SKILL.md" ]]; then
	echo "Error: '$SKILL_NAME' has no SKILL.md — not a valid skill"
	exit 1
fi

mkdir -p "$SKILLS_DIR"
ln -sfn "$SKILL_DIR" "$SKILLS_DIR/$SKILL_NAME"
echo "Linked: $SKILL_NAME -> $SKILLS_DIR/$SKILL_NAME"
