---
name: claude-code
description: Invoke Anthropic's claude CLI (Claude Code) for a second opinion. TRIGGER when (1) the user asks for a "second opinion", "ask claude", "have claude review", "what does claude think"; (2) you are about to commit to a high-impact or hard-to-reverse decision (architecture, schema migration, framework choice, security design) and want independent validation; (3) you have failed the same approach 3+ times and need a fresh perspective from the Anthropic model family; (4) reviewing a diff/branch where independent review adds value. Pair with the codex and grok skills when a decision warrants multiple independent reads. Pins the newest model (opus) at max effort so behavior does not depend on local config.
---

# Claude Code Second-Opinion Skill

Use Anthropic's `claude` CLI as an independent reviewer. The spawned `claude -p` process sees none of this conversation, so it gives a genuinely independent read — that is the whole value. Pair with the `codex` and `grok` skills for a cross-family panel.

## Canonical invocation

Pipe the prompt via stdin and redirect stdout to a tmp file (claude has no `-o`), then Read it. Run from `/tmp` so the project's CLAUDE.md doesn't leak into the "independent" read:

```bash
cd /tmp && printf '%s' "$PROMPT" | claude -p \
  --model opus \
  --effort max \
  --tools "" \
  --no-session-persistence \
  --output-format text \
  > /tmp/claude-opinion-$$.md 2>/dev/null
```

Then Read `/tmp/claude-opinion-$$.md`. For short prompts, pass `"$PROMPT"` as the last arg instead of piping. Redirect **stdout only** (`2>/dev/null`) — the answer is on stdout; stderr carries diagnostics that would pollute the file.

## Knobs

| Knob | Flag |
|---|---|
| **Model** | `--model opus` — alias resolving to the newest Opus (`claude-opus-4-8`, May 2026). Aliases (`opus`/`sonnet`/`haiku`) or full IDs both work. |
| **Thinking** | `--effort max` — values `low\|medium\|high\|xhigh\|max`. Unlike grok, `max` IS valid and is the top tier. |
| **Sandbox** | `--tools ""` (lock down). There is **no `--sandbox` flag** — an empty tools list drops the agentic toolset (Bash/Edit/Write/Read/web). Omit `--tools` to enable tools. |

## Nuances (claude-specific)

- **`-p`/`--print` is the headless mode** — there's no `exec` subcommand. Bare `claude "$PROMPT"` opens an interactive session and hangs a script.
- **No `-o` flag** (like grok) — redirect stdout to a file. **No `--skip-git-repo-check` needed** — runs fine outside a git repo.
- **`--tools ""` is not a hard sandbox** — it blocks Bash/Edit/Read/web but self-reports a few LSP/OAuth tools remain. Fine for a stateless opinion; keep the `DO NOT EXPLORE` preamble as the real guarantee.
- **`--no-session-persistence`** is the `--ephemeral` equivalent. Many flags (it, `--output-format`, `--fallback-model`) only work with `-p`.
- **CLAUDE.md auto-loads** in a project dir — that's why the canonical command runs from `/tmp`. `--bare` also skips it, but then needs `ANTHROPIC_API_KEY` (OAuth/keychain not read), so prefer `cd /tmp`.
- **Piped stdin is capped at ~10MB.** Since `--tools ""` disables Read, you can't point it at a file path — for a diff that large, summarize or chunk it into the prompt instead.

## Prompt template

Claude starts with zero context. Make the prompt self-contained, and lead with the no-explore line:

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

Skip for trivia, questions about *this* conversation's state (the spawned process has no memory of it), or tight iteration loops (`--effort max` on Opus is slow). Its view is one input — you and the user have final say.

After running, Read the file and report: (1) its recommendation in one sentence, (2) agree/disagree, (3) your call. Synthesize — never paste verbatim. If you also ran codex/grok, note where they converge and diverge.
