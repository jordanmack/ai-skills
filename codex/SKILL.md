---
name: codex
description: Invoke OpenAI's codex CLI for a second opinion. TRIGGER when (1) the user asks for a "second opinion", "ask codex", "have codex review", "what does codex think"; (2) you are about to commit to a high-impact or hard-to-reverse decision (architecture, schema migration, framework choice, security design) and want independent validation; (3) you have failed the same approach 3+ times and need a fresh perspective; (4) reviewing a diff/branch where independent review adds value. Pins the newest model (gpt-5.5) at highest reasoning effort (xhigh) so behavior does not depend on local config.
---

# Codex Second-Opinion Skill

Use OpenAI's `codex` CLI as an independent reviewer. It sees none of this conversation, so it gives a genuinely independent read — that is the whole value. Pair with the `grok` and `claude-code` skills for a cross-family panel.

## Canonical invocation

Pipe the prompt via stdin (use `-` as the stdin sentinel) and write only the final message with `-o`, then Read it:

```bash
printf '%s' "$PROMPT" | codex exec \
  --model gpt-5.5 \
  -c 'model_reasoning_effort="xhigh"' \
  --sandbox read-only \
  --skip-git-repo-check \
  --ephemeral \
  -o /tmp/codex-opinion-$$.md \
  -
```

Then Read `/tmp/codex-opinion-$$.md`. For short prompts, pass `"$PROMPT"` as the last arg instead of `-`.

## Knobs

| Knob | Flag |
|---|---|
| **Model** | `--model gpt-5.5` (newest, May 2026; defaults drift — always pin). |
| **Thinking** | `-c 'model_reasoning_effort="xhigh"'` — spectrum `minimal<low<medium<high<xhigh`. Quote as TOML; `-c` parses TOML. |
| **Sandbox** | `--sandbox read-only` (enable). Other values: `workspace-write`, `danger-full-access` (never use for a second opinion). |

## Nuances (codex-specific)

- **Subcommand is `codex exec`** — the non-interactive mode. `--ask-for-approval` is top-level only; don't pass it to `exec`.
- **`-o <file>`** writes only the final assistant message to the file — this is why codex (unlike grok/claude) needs no stdout redirect. Progress/metadata goes to stderr; the file stays clean. Read the file, not stdout.
- **`-` is the stdin sentinel** for piped prompts. `--ephemeral` skips session persistence; `--skip-git-repo-check` lets it run outside a repo.
- **TOML quoting in `-c`**: string values must be quoted (`"xhigh"`); a bareword only works via a fragile fallback.

## Prompt template

Codex starts with zero context. Make the prompt self-contained, and lead with the no-explore line — without it codex greps the filesystem for minutes and produces noise:

```
[ONE LINE — what opinion you want]

DO NOT EXPLORE THE FILESYSTEM. DO NOT RUN SHELL COMMANDS.
Answer purely from the context below and your own knowledge.

CONTEXT: [goal, constraints, what was tried]
ARTIFACT: [the plan/code/diff — quote critical sections if large]
QUESTION: [the specific ask — be opinionated about the answer shape]
OUTPUT: [length cap, e.g. "Under 200 words, recommendation first"]
```

## When NOT to use / reading the response

Skip for trivia, questions about *this* conversation's state (codex has no memory of it), or tight iteration loops (xhigh is slow). Codex's view is one input — you and the user have final say.

After running, Read the file and report: (1) its recommendation in one sentence, (2) agree/disagree, (3) your call. Synthesize — never paste verbatim. If you also ran grok/claude-code, note where they converge and diverge.
