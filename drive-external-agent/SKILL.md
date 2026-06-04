---
name: drive-external-agent
description: Drive an external AI agent CLI (OpenAI codex, xAI grok, Anthropic claude-code) to do work, in one of three capability modes — Sealed (no access, context fed in-prompt), Scoped-read (reads a folder + network, no writes), or Full (writes/acts as the prompt directs). TRIGGER when (1) the user asks to "ask grok/codex/claude", get a "second opinion", or "have another model review/research something"; (2) you want an independent cross-model read before a high-impact, hard-to-reverse decision (architecture, schema, framework, security); (3) you've failed the same approach 3+ times and want a fresh perspective from another model family; (4) you want to delegate a scoped investigation, research task, or autonomous job to a separate agent process. Each CLI has a pinned default (strongest) and secondary model; effort defaults to the highest each CLI offers and is changeable. Pinned IDs are listed in the skill so no lookup is needed.
---

# Drive an External Agent CLI

Spawn a separate AI agent (`codex`, `grok`, or `claude`) from the command line to do work for you. The spawned process sees **none of this conversation** — that independence is the value for reviews, and the isolation boundary for delegated work.

**First decide the MODE** (how much access the agent gets), **then** apply the per-CLI flags that realize it (all listed below). Mode is about blast radius and intent, not which CLI you pick.

## Pick a mode

| Mode | Filesystem | Network | Writes | Scope is set by | Use it for |
|---|---|---|---|---|---|
| **A — Sealed** | none | none | none | the prompt is the *entire* world | independent second opinion, decision from given facts, review of a quoted artifact |
| **B — Scoped read** | read within a folder | yes | **no** (narrow exceptions) | the folder + prompt | evaluate a codebase, research, test a network tool, return findings |
| **C — Full autonomous** | full | yes | yes, as directed | the prompt, entirely | delegated implementation, refactors, multi-step jobs |

Two cross-cutting facts the orchestrator must hold:

- **Once network is on (B and C), project content can leave the machine.** That's inherent to "research / make API calls," not a bug. Surface it to the user before pointing B or C at sensitive code.
- **C can do real damage** (writes, shell, deletes). Its only governor is the prompt. Scope it explicitly — name the working directory, the allowed actions, and what's off-limits. Never use a full-access sandbox for a task that a narrower mode covers.

---

## Mode A — Sealed

The agent gets nothing but the prompt. It reasons from what you wrote plus its own training knowledge, then returns. This is the mode for second-opinion review and any "decide from these facts" task.

**Enforced at two layers**: the tightest sandbox the CLI offers *and* a hard no-explore preamble. Belt and suspenders — for codex/grok the preamble is load-bearing because `read-only` still leaves the filesystem readable.

⚠️ **Sealed is not airtight: all three CLIs auto-load your global instructions** (`~/.claude/CLAUDE.md` for grok and claude; `~/.codex/AGENTS.md` for codex) into context — **even when run from `/tmp`** (verified). So a "sealed" opinion is still flavored by your standing rules, not purely the prompt. There is no clean per-invocation suppression on OAuth auth: `cd /tmp` only stops *project*-level files, not the global one; claude's `--bare` would suppress it but requires `ANTHROPIC_API_KEY` (OAuth/keychain are not read). Treat Mode A as "no filesystem/web access," not "zero ambient context." For a truly clean room, temporarily move the global file — too invasive to do automatically; flag it to the user if it matters.

You supply the whole artifact in the prompt. If it's too big to quote (piped stdin caps ~10MB; sealed mode disables Read so you can't point at a path), summarize or chunk it — or use Mode B instead.

→ Flags: see **Per-CLI invocation**, Mode A column. Prompt: see **Sealed template**.

## Mode B — Scoped read

Point the agent at a folder. It reads and navigates the project itself, can hit the network to research or test, but **must not modify source**. It evaluates and reports back.

**The tension that defines B**: it wants network ON but writes OFF, and the CLIs differ sharply in whether they can enforce that (all verified by write test):
- **codex** — `--sandbox read-only` hard-blocks writes ("Read-only file system") while leaving network on. **Properly enforced.**
- **claude** — has no sandbox; omit Write/Edit from `--tools` and add `WebFetch`/`WebSearch`. The missing tool means it *can't* write. **Properly enforced.**
- **grok** — ⚠️ **cannot be enforced by flags.** Its `read-only`/`strict` sandboxes don't block writes; the only write-block (a `--tools` allowlist) also kills the network. Mode B for grok is **prompt-contract only** — use codex/claude when the read-only guarantee matters.

A narrow write exception (a scratch/findings file) must be called out in the prompt — and on codex it needs `--add-dir <path>` too, since read-only blocks even that.

→ Flags: Mode B column. Prompt: see **Scoped/Full template**.

## Mode C — Full autonomous

Full filesystem, shell, and network. The agent does real work — edits, runs commands, iterates. Scope, write-permissions, and stop conditions come **entirely from the prompt**; the sandbox is wide open.

Because nothing structural reins it in, the prompt carries all the guardrails: name the working directory, enumerate allowed actions, state what must not be touched, and give a clear definition of done. Prefer running C in an isolated checkout/branch when the task is large.

→ Flags: Mode C column. Prompt: see **Scoped/Full template**.

---

## Per-CLI invocation

Each CLI realizes the three modes differently. Pick the row for your CLI, the column for your mode. In every case the answer lands in a tmp file you then Read — codex via `-o <file>`, grok and claude via stdout redirect (`> <file>`).

Set the orchestrating command/tool timeout generously: use at least **30 minutes** by default, and **60 minutes** for anything significant. codex is particularly time-consuming, especially at high reasoning effort or when exploring a codebase.

### Models and reasoning effort

Each CLI has **two pinned models** — a strong default and a secondary — so you can name any of the six without a lookup. Naming a CLI bare (just "codex"/"grok"/"claude") means **its default**. There is no "run all the models" shorthand; to review with several models, list them explicitly as a roster (that's the job of the **adversarial-review** skill, which calls this one per model).

| CLI | Default (strongest) | Secondary | Flag form |
|---|---|---|---|
| codex | `gpt-5.5` | `gpt-5.4` | `--model <id>` |
| grok | `grok-build` | `grok-composer-2.5-fast` | `--model <id>` |
| claude | `opus` (`claude-opus-4-8`) | `sonnet` (`claude-sonnet-4-6`) | `--model <alias\|id>` |

**Reasoning effort defaults to the highest each CLI offers** — that's what the examples below use. It's a dial: drop it when you want a faster/cheaper run. The exact flag and its full ladder per CLI (so you never look it up):

| CLI | Effort flag | Levels (low → high) | Highest |
|---|---|---|---|
| codex | `-c 'model_reasoning_effort="<level>"'` | `minimal, low, medium, high, xhigh` | **`xhigh`** (no `max`) |
| grok | `--effort <level>` | `low, medium, high, xhigh, max` | **`max`** |
| claude | `--effort <level>` | `low, medium, high, xhigh, max` | **`max`** |

⚠️ **`grok-composer-2.5-fast` does not support reasoning effort at all** — the `--effort` flag is a no-op for it (it's a fast coding model, not a reasoning model). The "highest by default" rule simply doesn't apply; for reasoning-hard review work use `grok-build`.

### codex (OpenAI)

Subcommand is `codex exec` (non-interactive). `-o <file>` writes only the final assistant message — no stdout redirect needed; progress/metadata goes to stderr. `-` is the stdin sentinel for piped prompts. `--ephemeral` skips session persistence; `--skip-git-repo-check` lets it run outside a repo. In `-c`, string values must be quoted as TOML (`"xhigh"`).

| Mode | Sandbox flag |
|---|---|
| A — Sealed | `--sandbox read-only` + the no-explore preamble (read-only still allows FS reads; the preamble is what seals it) |
| B — Scoped read | `--sandbox read-only` (network allowed by default), prompt forbids writes |
| C — Full | `--sandbox workspace-write` (writes inside the workspace) or `danger-full-access` (only if the task truly needs to write outside the workspace) |

⚠️ **Always pass `-c 'mcp_servers={}'` on every `codex exec` call.** codex auto-connects to every MCP server in `~/.codex/config.toml` at startup. If any configured server has a slow or broken handshake, codex stalls mid-run: process alive, 0% CPU, no output. The fix disables MCP for that single invocation only; global config is untouched. Verified: a stalled run caused by a hanging MCP SSE endpoint was fixed entirely by adding this flag. Symptom of the bug: process runs 10-12 min reading source then freezes (log mtime stops updating, single open network socket). Diagnosis: `stat -c %Y <logfile>` vs `date +%s` — frozen mtime for minutes = stalled.

```bash
# Mode A (sealed second opinion):
printf '%s' "$PROMPT" | codex exec \
  --model gpt-5.5 \
  -c 'model_reasoning_effort="xhigh"' \
  -c 'mcp_servers={}' \
  --sandbox read-only \
  --skip-git-repo-check \
  --ephemeral \
  -o /tmp/codex-out-$$.md \
  -
# Then Read /tmp/codex-out-$$.md
# Mode B: same flags (read-only hard-blocks writes, network stays on); run inside the target folder via --cd <dir>,
#         drop the no-explore preamble, add a "do not modify source" contract. For a scratch/findings file add --add-dir <path>.
# Mode C: swap --sandbox workspace-write; drop --skip-git-repo-check if operating in a repo; prompt defines the job.
```

- **Model**: default `--model gpt-5.5` (strongest); secondary `--model gpt-5.4`. Always pin — defaults drift.
- **Thinking**: `-c 'model_reasoning_effort="xhigh"'` is the highest codex offers (no `max`). See the effort table above to dial it down.

### grok (xAI)

No `exec` subcommand, no `-o` flag — use top-level `grok` and redirect **stdout only** (`2>/dev/null`; stderr is progress noise). Stdin sentinel is `--prompt-file /dev/stdin` (passing `-` makes grok answer the literal prompt `-`). grok is tool-eager — the no-explore preamble matters more here than elsewhere. No `--ephemeral`/`--skip-git-repo-check`; don't enable `--experimental-memory`.

⚠️ **grok's sandbox does NOT enforce read-only (verified by write test).** `--sandbox read-only` and `--sandbox strict` both let the agent write to disk anyway — the profile names are misleading. The only thing that blocks writes is a `--tools` allowlist that omits the `write`/`search_replace` tools — **but that same allowlist also disables web/network**, so you can't get "read + network + no-write" from flags. Unknown profile names only **warn** then run **unsandboxed**. Net: grok has no verified Mode-B enforcement; Mode B for grok is **prompt-contract only** (weaker than codex/claude — see Mode B table below).

| Mode | Flags |
|---|---|
| A — Sealed | `--sandbox read-only --disable-web-search --no-subagents` + no-explore preamble (sandbox is weak, but A doesn't write and the preamble + `--disable-web-search` hold) |
| B — Scoped read | **no flag enforces this.** Leave web on (omit `--disable-web-search`); rely on a strict "do not modify anything" prompt contract. Don't trust it for untrusted tasks — prefer codex/claude for enforced Mode B. |
| C — Full | `--sandbox workspace` (or `none`), prompt defines the job |

```bash
# Mode A (sealed second opinion):
printf '%s' "$PROMPT" | grok \
  --prompt-file /dev/stdin \
  --model grok-build \
  --effort max \
  --sandbox read-only \
  --disable-web-search \
  --no-subagents \
  --output-format plain \
  > /tmp/grok-out-$$.md 2>/dev/null
# Then Read /tmp/grok-out-$$.md
```

- **Model**: default `--model grok-build` (strongest, rides on Grok 4.3); secondary `--model grok-composer-2.5-fast`. These two aliases are the only IDs grok.com OAuth accepts — concrete IDs like `grok-4` are rejected. ⚠️ composer ignores reasoning effort (see note above); use `grok-build` for reasoning-hard work.
- **Thinking**: `--effort max` (highest — see the effort table above). Note grok has a second, easily-confused flag, `--reasoning-effort`, whose value set differs (`none|minimal|low|medium|high|xhigh`, no `max`) — prefer `--effort`. For reasoning-hard work, prefer codex or claude regardless.

### claude (Anthropic)

`-p`/`--print` is headless mode (bare `claude "$PROMPT"` opens an interactive session and hangs a script). No `exec`, no `-o` — redirect **stdout only**. No `--skip-git-repo-check` needed. `--no-session-persistence` (only valid with `-p`) is the ephemeral equivalent. Run from `/tmp` to avoid loading a *project* CLAUDE.md (the *global* one still loads — see the Mode A note). Piped stdin caps ~10MB. claude has **no `--sandbox`** — access is gated entirely by `--tools`.

| Mode | Tools flag |
|---|---|
| A — Sealed | `--tools ""` (drops Bash/Edit/Write/Read/web — a real capability cut, not just a preamble) |
| B — Scoped read | `--tools "Read,Grep,Glob,WebFetch,WebSearch"` (read + web, no Edit/Write — web needs the explicit `WebFetch`/`WebSearch`; verified); run in the folder |
| C — Full | omit `--tools` (or `--tools "default"`) for the full agentic toolset; prompt defines the job |

```bash
# Mode A (sealed second opinion):
cd /tmp && printf '%s' "$PROMPT" | claude -p \
  --model opus \
  --effort max \
  --tools "" \
  --no-session-persistence \
  --output-format text \
  > /tmp/claude-out-$$.md 2>/dev/null
# Then Read /tmp/claude-out-$$.md
```

- **Model**: default `--model opus` (`claude-opus-4-8`, strongest); secondary `--model sonnet` (`claude-sonnet-4-6`). Aliases or full IDs both work.
- **Thinking**: `--effort max` is the top tier (highest). Values `low|medium|high|xhigh|max`. See the effort table above to dial it down.
- `--tools ""` self-reports a few LSP/OAuth tools remain — fine for a stateless opinion; the no-explore preamble backs it up.

---

## Prompt templates

### Sealed template (Mode A)

Lead with the no-explore line — for codex/grok it's the actual seal; without it codex greps the filesystem for minutes and produces noise. Make the prompt fully self-contained.

```
[ONE LINE — what you want]

DO NOT EXPLORE THE FILESYSTEM. DO NOT RUN SHELL COMMANDS. DO NOT SEARCH THE WEB.
Answer purely from the context below and your own knowledge.

CONTEXT: [goal, constraints, what was tried]
ARTIFACT: [the plan/code/diff — quote critical sections; you can't point at a path in this mode]
QUESTION: [the specific ask — be opinionated about the answer shape]
OUTPUT: [length cap, e.g. "Under 200 words, recommendation first"]
```

### Scoped / Full template (Modes B and C)

No no-explore line — exploration is the point. Set direction and boundaries instead; the agent discovers its own scope.

```
[ONE LINE — the task]

WORKING DIRECTORY: [the folder to operate in]
ACCESS: [Mode B: "Read and navigate freely. Use the network to research/test.
         DO NOT modify any source file. You may write only to /tmp."]
        [Mode C: "You may edit/create files under <dir> and run shell commands.
         DO NOT touch <off-limits paths>. Network is allowed."]
CONTEXT: [goal, constraints, relevant background]
TASK: [what to investigate or do, step by ordered step if it matters]
DONE WHEN: [explicit definition of done / what to return]
OUTPUT: [for B: the findings format. for C: what to report back after acting]
```

---

## When NOT to use / reading the response

Skip for trivia, for questions about *this* conversation's state (the spawned process has no memory of it), and for tight iteration loops (max-effort runs are slow). The external agent's view is one input — you and the user have final say.

After running, Read the output file and report: (1) the recommendation/result in one sentence, (2) your agree/disagree or assessment, (3) your call. **Synthesize — never paste verbatim.** If you ran more than one CLI, note where they converge and diverge — agreement across model families is strong signal; disagreement is worth surfacing explicitly.
