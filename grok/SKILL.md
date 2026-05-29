---
name: grok
description: Invoke xAI's grok CLI for a second opinion. TRIGGER when (1) the user asks for a "second opinion", "ask grok", "have grok review", "what does grok think"; (2) you are about to commit to a high-impact or hard-to-reverse decision (architecture, schema migration, framework choice, security design) and want independent validation; (3) you have failed the same approach 3+ times and need a fresh perspective from a non-OpenAI, non-Anthropic model; (4) reviewing a diff/branch where independent review adds value. Pair with the codex and claude-code skills when a decision warrants multiple independent reads.
---

# Grok Second-Opinion Skill

Use xAI's `grok` CLI as an independent reviewer. It sees none of this conversation, so it gives a genuinely independent read — and it's a different model family than codex/claude, so agreement across all three is strong signal. Pair with the `codex` and `claude-code` skills for a cross-family panel.

## Canonical invocation

Pipe the prompt via `--prompt-file /dev/stdin` and redirect stdout to a tmp file (grok has no `-o`), then Read it:

```bash
printf '%s' "$PROMPT" | grok \
  --prompt-file /dev/stdin \
  --model grok-build \
  --reasoning-effort xhigh \
  --sandbox read-only \
  --disable-web-search \
  --no-subagents \
  --output-format plain \
  > /tmp/grok-opinion-$$.md 2>/dev/null
```

Then Read `/tmp/grok-opinion-$$.md`. For short prompts, use `-p "$PROMPT"` instead of `--prompt-file`. Redirect **stdout only** (`2>/dev/null`) — grok's answer is on stdout; stderr carries progress/warning noise that would pollute the file.

## Knobs

| Knob | Flag |
|---|---|
| **Model** | `--model grok-build` — the **only** ID accepted for grok.com OAuth accounts (concrete IDs like `grok-4`/`grok-5` are rejected). |
| **Thinking** | `--reasoning-effort xhigh` — values `none\|minimal\|low\|medium\|high\|xhigh` (**not `max`**). ⚠️ `grok-build` reports `supports_reasoning_effort: false`, so it's parsed but ignored today. Pass it anyway for forward-compat. |
| **Sandbox** | `--sandbox read-only` (enable). Mandatory — grok is agentic by default. |

## Nuances (grok-specific)

- **No `exec` subcommand, no `-o` flag.** Don't copy codex's shape — `grok exec ... -o` fails. Use top-level `grok` and redirect stdout.
- **Stdin sentinel is `--prompt-file /dev/stdin`, not `-`.** Passing `-` makes grok answer the literal one-character prompt `-`.
- **`--disable-web-search` + `--no-subagents`** keep the opinion to one model's voice based on its own knowledge — grok is eager to use tools.
- **No `--ephemeral`/`--skip-git-repo-check`.** Don't enable `--experimental-memory` — a second opinion should be stateless.
- Because effort is ignored today, prefer codex (or claude-code) for reasoning-hard problems; grok is best for breadth and recent-events context.

## Prompt template

Grok starts with zero context. Make the prompt self-contained, and lead with the no-explore line — grok is more tool-eager than codex:

```
[ONE LINE — what opinion you want]

DO NOT EXPLORE THE FILESYSTEM. DO NOT RUN SHELL COMMANDS. DO NOT SEARCH THE WEB.
Answer purely from the context below and your own knowledge.

CONTEXT: [goal, constraints, what was tried]
ARTIFACT: [the plan/code/diff — quote critical sections if large]
QUESTION: [the specific ask — be opinionated about the answer shape]
OUTPUT: [length cap, e.g. "Under 200 words, recommendation first"]
```

## When NOT to use / reading the response

Skip for trivia, questions about *this* conversation's state (grok has no memory of it), reasoning-hard problems (effort ignored — prefer codex), or tight iteration loops. Grok's view is one input — you and the user have final say; surface disagreements, especially vs codex/claude.

After running, Read the file and report: (1) its recommendation in one sentence, (2) agree/disagree, (3) your call. Synthesize — never paste verbatim. If you also ran codex/claude-code, note where they converge and diverge.
