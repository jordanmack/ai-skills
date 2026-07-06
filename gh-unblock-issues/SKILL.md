---
name: gh-unblock-issues
description: |
  Work an open GitHub-issue backlog for BLOCKERS, not fixes: find what is stopping
  each issue from being picked up, and drive the removable blockers to resolution.
  The main lever is missing information or an undecided call — the skill asks the
  user ONE simplified, non-technical question at a time (boiled down to the root
  decision), records the answer on the issue, and toggles the needs-info label
  (cleared = ready for the fix pass, present = still blocked). Blockers that a question cannot remove (waiting
  on another issue, an external/backend dependency, a real code gap) are recorded
  and reported, never worked here. Prioritizes the work by dependency leverage —
  resolving the blocker that frees the most downstream issues first — and the user
  can override the order via args. When everything in scope that can be unblocked
  has been, it emits a recommended dependency-ordered sequence for actually working
  the now-ready issues. Makes one pass, then stops.
  TRIGGER when the user wants to triage and UNBLOCK issues rather than fix them:
  says "unblock the issues" / "clear the blockers" / "get the issues ready to work"
  / "what's blocking the backlog" / "what order should I work these in", invokes
  /gh-unblock-issues, or names this skill. For actually implementing the fixes,
  hand the unblocked issues to whatever fix workflow the repo uses.
argument-hint: "Optional: scope (an issue number or label filter) and/or priority hints (e.g. 'do #14 first', 'focus on the login flow'); default is all open issues, ordered by dependency leverage"
---

# /gh-unblock-issues: Triage and Unblock a GitHub Issue Backlog

Make the open backlog **workable**, in the order that unblocks the most. For each in-scope issue, decide whether something is stopping it from being picked up, and if that blocker is one you can remove by getting a decision from the user, remove it: ask, record the answer, clear the flag. Prioritize that work by dependency leverage so one answer frees the most downstream issues (§1.4). When everything in scope that can be unblocked has been, hand back a recommended dependency-ordered sequence for actually working the now-ready pool (§5). This skill does **not** fix code and does **not** touch any branch or working tree. It reads freely (issues, and repo files like docs when that answers a question instead of spending one on the user); the only things it *writes* are issue metadata — comments and labels. Working an issue once it is ready is a separate job for whatever fix workflow the repo uses.

The handoff to that fix workflow is the **`needs-info` label plus an issue comment**: this skill leaves a blocked issue OPEN, records the resolution (or the still-open question) as a comment, and toggles the `needs-info` label. A fix pass then knows which issues are ready (label cleared) and which are still waiting (label present). If the repo has a dedicated fix skill that re-checks `needs-info` issues, this feeds it directly; if not, the label plus comment is still a clear, greppable ready/blocked signal for a human or any other tool.

**Interaction style (the core of this skill).** Questions to the user are asked **one at a time**, live, waiting for the answer before the next. Each question is:
- **Simplified to the root decision** — the one fork everything else hangs on, not a menu of sub-options. If a choice has downstream consequences, decide them yourself from the answer; do not ask them separately.
- **Non-technical** — phrased for someone who is not in the code. No jargon, no file names, no framework terms. Describe the choice in terms of what the product does or what the user experiences.
- **Concise** — one or two sentences of context, then the question. Offer a recommended default when you have one.

If a question can be answered by reading the codebase or the issue thread instead of asking the user, read — never spend a user question on something you can look up.

**Decide, don't stall.** Ordering (within any user priority hints, §1.4), whether an issue is blocked at all, whether a blocker is question-removable — your call. Only the user questions themselves pause for input, and those are the point. Everything else you decide and keep moving.

---

## 1. Scan and Classify (once, at start)

1. List the in-scope open issues (plumbing — numbers/titles/labels only, no bodies), scoped to the argument: a **label filter** adds `--label <x>`; a **single issue number** skips the list entirely and goes straight to `gh issue view <N>` (step 2), since `gh issue list` has no per-number filter; **default** (no scope) is all open:
   ```
   gh issue list --state open --limit 1000 --json number,title,labels --jq 'sort_by(.number)[]'
   ```
   (`--limit 1000` covers any realistic backlog; a bare list silently drops the tail.)
2. **Read each candidate** — body and ALL comments — to find the blocker. The comments carry the real status (a prior run may have marked it blocked, asked a question already, or recorded a decision):
   ```
   gh issue view <N> --json title,body,comments,labels
   ```
   For a large backlog, delegate this reading to ONE subagent that returns a compact table (see below) rather than reading every thread inline — reading full threads is the biggest context sink. For a handful of issues, reading them directly is fine.
3. **Classify each issue** into exactly one bucket (on mixed/stale signals, highest wins: `moot` > `already-answered` > `hard-blocked` > `ask` > `ready`):
   - **`ready`** — nothing is blocking it; it can be worked as-is. (Not this skill's job; note it and move on. The fix workflow picks it up.)
   - **`ask`** — blocked only by a missing decision or missing information that the USER can supply. This is the work-list. Capture the single root question.
   - **`hard-blocked`** — blocked by something a question to the user cannot fix: waiting on another issue to merge, an external/backend/third-party dependency, or a real code gap. Record and report; do not work it.
   - **`already-answered`** — it carries `needs-info` (or an open question in-thread) and the answer has since landed. This bucket auto-clears the label with no user check, so only pick it on a concrete signal: a non-bot comment (newer than the question) that answers it, or the depended-on issue now closed/merged. Otherwise leave it `ask`/`hard-blocked`. Clear via §2's resolve path.
   - **`moot`** — a comment shows it is already fixed, superseded, or a duplicate. Note it for the report; leave closing/deduping to the fix workflow or the user (see §3). A moot issue is NOT ready to work, so it must read as blocked to a label-keyed fix pass: keep `needs-info` if present, and if absent, ADD it (the §2A deferred-path sequence — label first, then a one-line "superseded, see above" comment) so a fresh duplicate isn't mistaken for ready. (This is the one write the skill makes outside the §2 work-loop.)

   While reading, **capture the dependency edges** each issue states or implies: "blocked by #X", "needs #Y first", "depends on the decision in #Z", "dup of #W". These references are what makes prioritization possible in step 4, so record them per issue even when the issue itself is `ready` or `hard-blocked` (it may still be the thing another issue waits on).

   If you delegated the read, have the subagent return one row per issue: `| # | bucket | root question or blocker (one line) | depends-on (issues this one waits on) |`, and nothing else (no pasted bodies or comment text). ("Blocks" is just the inverse of depends-on across the in-scope set — derive it at ranking time, §1.4, rather than asking the subagent for it.) Any evidence you will later put in a comment must be inline in the row, not in a scratch file.
4. **Prioritize by dependency leverage.** The goal is to resolve the blockers that free the MOST downstream work first, so one answer cascades into several newly-workable issues. From the edges captured in step 3, build the dependency picture (a lightweight mental/scratch graph over the in-scope issues — not a formal solver; the backlog is small) and order the `ask`/`already-answered` work-list by:
   - **Prerequisites before dependents, always.** If issue A must be resolved before B can proceed, A is asked first — never ask about B while its own blocker A is still open (the answer to B may depend on A's outcome). If A is `hard-blocked` (can't be cleared here at all), B stays deprioritized behind it: asking about B now is likely wasted, so note B as effectively waiting on A and skip to work you can actually land. Surface it in the report either way.
   - **Then by fan-out.** Among issues with no unresolved prerequisite of their own, rank by how many other issues each transitively unblocks (its downstream count). Highest fan-out first — that is the single question that does the most good. A blocker gating five issues outranks a leaf gating one.
   - **Tie-break:** lowest issue number.
   - **A dependency cycle** (no prerequisite-free node): don't stall hunting for one and don't spend a user question on the ordering — just start with the lowest-numbered `ask` node in the cycle and proceed (its own question still stands on its merits). A "cycle" among only `already-answered` nodes is stale depends-on text, not a real block: resolve them normally.

   **User priority hints from args override this ranking.** If the invocation named an order or focus ("do #14 first", "prioritize the login issues"), honor it: it sets the top of the list (or the scope), and the dependency ranking orders the rest. A pin still can't jump an unresolved prerequisite (pin #14 that depends on #5 → do #5 first); a fuzzy focus ranks matching issues first without excluding the rest unless phrased as exclusion ("ignore export"). Priority is the one thing the user states up front; everything else about ordering is your call, never a mid-run question.
5. Track the `ask` / `already-answered` issues as an ordered work-list in that priority order (use your harness's task/todo tool if it has one, else an in-context checklist). These are the buckets the work-loop (§2) drives; the only other write is the moot label-add above.

---

## 2. Per-Issue: Resolve the Blocker

Work the task list in priority order, one `ask` / `already-answered` issue at a time. Classification isn't re-run mid-pass: a dependent freed by an answer here is handed off via the §5 recommended order, not reclassified and worked now (that is "one pass, then stops").

**Resolve path (`already-answered`).** The answer is already in the thread or the dependency has shipped. No user question needed. Record it and clear the flag (§2A). Done.

**Ask path (`ask`).**
1. **Confirm it is really a question you can't answer yourself.** Re-check the issue's named files, the repo's architecture/design docs (e.g. an `ARCHITECTURE.md`, `README`, or `docs/` folder if the repo has one), and the thread. If the answer is discoverable, take it — reclassify to `already-answered` and use the resolve path. Only a genuine product/decision gap reaches the user.
2. **Reduce it to the root decision.** Strip it to the single fork that unblocks the issue. If the issue raises several coupled sub-questions, find the one whose answer determines the rest; ask only that. Draft the question in the interaction style above (non-technical, concise, recommended default if you have one).
3. **Ask the user** — one question, then wait. Use a structured multiple-choice tool (e.g. `AskUserQuestion`) if your harness has one and the fork is a clean choice between options; otherwise ask in plain prose. Do not batch it with other issues' questions.
4. **Apply the answer (§2A).** Translate it into a concrete, in-thread record the fix skill can act on, then clear `needs-info`.

If the user defers or can't answer now, record the open question and label it `needs-info` if it wasn't already (§2A, deferred path), note it as still-waiting, and move on. Skip any later issue whose prerequisite is still unresolved — whether you just deferred it or it's `hard-blocked` — since its answer may depend on the one you don't have; surface it as waiting rather than asking it now. Never stall the whole pass on one unanswered question.

### 2A. Recording a resolution (the handoff to the fix workflow)

`needs-info` is the fixed convention this skill and its companion fix workflow share — not a per-repo variable. Use that exact label name.

Pass every `--body` via a file/stdin, never an inline `"..."` string: a user answer containing a quote, `$`, or backtick would break or mangle an inline command, and the comment is the load-bearing record. Use `--body-file -` with a heredoc (shown below).

Both handoff steps below — the comment AND the label toggle — must succeed for the handoff to be real. Run them as two GATED steps: only attempt the second command if the first exited 0; if the first fails (auth, rate limit, wrong issue), STOP — do not run the second — and record the issue under **Handoff incomplete** in §5. (The gate is what keeps the failure safe: running the second command after the first failed is exactly what produces a comment with no matching label, or a label with no matching comment — a false signal to the fix pass.) **Order the two steps so that a stop-after-step-1 also leaves the issue reading *blocked*, never falsely *ready*:** on the resolve path do the comment first, then remove the label (if the comment fails you stop with the label still present = blocked = safe; if the remove fails the comment is already down and the label stays = blocked = safe); on any path that ADDS the label (defer, moot), add the label first, then comment (if the add fails you stop having changed nothing; if the comment fails the label is already present = blocked = safe). Either way a partial failure never clears/omits the label on an unresolved issue.

**When a blocker is resolved** (user just answered, or the answer was already in-thread):
1. **Comment the resolution** — comment only, never close (see §3). For a user answer, state the decision in their terms plus enough specifics for the fix skill to act; for an answer already in-thread, say so and point at it:
   ```
   gh issue comment <N> --body-file - <<'EOF'
   Resolved: <the decision, plainly stated>. <Any specifics the fix needs.>
   EOF
   ```
2. **Clear the `needs-info` label** so the issue rejoins the workable pool (the fix pass keys off this label to tell ready from waiting). `--remove-label` errors only when the label doesn't exist repo-wide (removing one the issue simply doesn't have is a silent success), so create it first to rule that case out; the remove itself runs WITHOUT `|| true` so a genuine failure surfaces and gates the "unblocked" record above:
   ```
   gh label create needs-info --description "Blocked on user or external input" 2>/dev/null || true  # may already exist; harmless
   gh issue edit <N> --remove-label needs-info
   ```

**When you ASK a question the user can't answer yet** (deferred), durably record the open question so a later run (of either skill) resumes. Add the label FIRST (fails safe — see above), then comment the question; if the comment fails, the issue is still flagged blocked (correct), just missing its explanation, which the next run re-derives:
```
gh label create needs-info --description "Blocked on user or external input" 2>/dev/null || true
gh issue edit <N> --add-label needs-info
gh issue comment <N> --body-file - <<'EOF'
Needs user input: <the single root question>.
EOF
```

This skill's only GitHub mutations are `gh issue comment` and `gh issue edit --add-label/--remove-label` on the `needs-info` label. It does not close, merge, branch, or edit issue bodies.

---

## 3. Boundaries (what this skill does NOT do)

- **No code, no worktrees, no merges, no master.** It never writes source, runs builds/tests, creates branches or worktrees, or advances master. If an issue needs a code change to be unblocked, that IS the block — record it as `hard-blocked` and report it.
- **No closing or deduping.** Even for a `moot` issue, this skill records the observation and reports it; closing/deduping stays with the fix workflow or the user. Keeping this skill's mutations narrow (comment + `needs-info` only) avoids double-handling with whatever works the issues next.
- **No hard-blocker chasing.** Waiting-on-another-issue, external dependencies, and backend gaps are noted and reported, not resolved here.
- **Text style:** no em dashes in anything written to GitHub (comments, labels).
- **Safety:** reading issues and editing issue metadata is all that happens, so there is no stack to stand up, isolate, or tear down (unlike sibling skills that provision instances).

---

## 4. Resume Across a Compact

The durable state lives on GitHub (the comments and `needs-info` labels this skill writes), so on resume you can always rebuild by re-running §1. The one thing worth persisting to save re-work is what's expensive to recompute: keep a short note in project memory with this run's scope, any user priority hints, the captured dependency edges, and the resulting priority order (re-reading every thread to rederive these is the biggest cost — §1.2). Record only that orchestration state, never full issue bodies or comment threads. On resume, re-verify open-issue state and labels against `gh` before acting; an answer may have landed, or the user may have closed an issue, since the note was written.

---

## 5. End of Run

When the in-scope backlog has been classified and every actionable issue has been acted on or consciously skipped (a dependent whose prerequisite is unresolved is skipped, §2), surface ONE report and STOP:
- **Unblocked this run** — issues whose blocker was resolved (user answer or already-in-thread), now with `needs-info` cleared and ready for the fix workflow.
- **Handoff incomplete** — issues where a handoff write failed (the first step failed so the gated second was skipped, or the second step itself failed), leaving the issue in a safe-blocked state (never falsely ready) per §2A. List the issue, which step failed, and that a re-run completes it. Empty is the normal case.
- **Recommended processing order** — once everything in scope that COULD be unblocked has been, produce a suggested sequence for actually working the now-workable pool (the issues unblocked this run plus any that were already `ready`). Derive it from the SAME dependency graph used for prioritization (§1.4): prerequisites before dependents, then highest-fan-out first (do the issue that unblocks the most next), lowest number to break ties. Present it as a plain numbered list of issue numbers with a few words each on why it sits where it does (e.g. "do first — three others build on it"). This is a recommendation to hand to the fix workflow or the user; this skill does not execute it. Issues still waiting on the user or hard-blocked are NOT in this list (they aren't workable yet) — call them out separately as "blocked from the work order until X".
- **Still waiting on the user** — issues where a question was asked but deferred/unanswered, each with the exact open question.
- **Hard-blocked** — issues a question can't unblock, each with the blocker (which issue, dependency, or code gap) and, where clear, what would unblock it.
- **Already workable** — the `ready` issues found (no action taken; folded into the recommended order above).
- **Observed moot** — issues that look already-fixed/superseded/duplicate, with evidence, flagged for the user or the fix skill to close.

This skill makes one pass and does not wait on later user replies. To resume after answering deferred questions, the user re-invokes it (or wraps it in `/loop` for a recurring cadence). Then hand the unblocked issues, in the recommended order above, to whatever fix workflow the repo uses.
