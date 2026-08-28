#!/bin/bash
# Install a single skill by symlinking it into a target tool's skills directory,
# or remove an installed skill with the delete switch.
#
# Usage: ./install.sh [--delete|-d] <skill-name> <target>
#   <skill-name>  a skill directory in this repo (for install) or installed skill name
#   <target>      one of: claude | grok | codex
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

delete_mode=false
usage() {
	echo "Usage: $0 [--delete|-d] <skill-name> <target>"
	echo "  <target>: claude | grok | codex"
	exit 1
}

if [[ $# -gt 0 ]]; then
	case "$1" in
		-h|--help)
			usage
			;;
		-d|--delete)
			delete_mode=true
			shift
			;;
	esac
fi

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

if [[ "$delete_mode" == false ]]; then
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
else
	if [[ ! -d "$SKILLS_DIR" ]]; then
		echo "Error: skills directory does not exist: $SKILLS_DIR"
		exit 1
	fi

	if [[ ! -e "$SKILLS_DIR/$SKILL_NAME" ]]; then
		echo "Warning: no installed skill found at $SKILLS_DIR/$SKILL_NAME"
		exit 0
	fi

	rm -f "$SKILLS_DIR/$SKILL_NAME"
	echo "Removed: $SKILLS_DIR/$SKILL_NAME"
fi
