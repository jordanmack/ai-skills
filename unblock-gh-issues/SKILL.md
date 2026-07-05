---
name: unblock-gh-issues
description: |
  Work an open GitHub-issue backlog for BLOCKERS, not fixes: find what is stopping
  each issue from being picked up, and drive the removable blockers to resolution.
  The main lever is missing information or an undecided call — the skill asks the
  user ONE simplified, non-technical question at a time (boiled down to the root
  decision), records the answer on the issue, and clears the needs-info label so a
  later fix pass can then work it. Blockers that a question cannot remove (waiting
  on another issue, an external/backend dependency, a real code gap) are recorded
  and reported, never worked here. Prioritizes the work by dependency leverage —
  resolving the blocker that frees the most downstream issues first — and the user
  can override the order via args. When everything in scope that can be unblocked
  has been, it emits a recommended dependency-ordered sequence for actually working
  the now-ready issues. Makes one pass, then stops.
  TRIGGER when the user wants to triage and UNBLOCK issues rather than fix them:
  says "unblock the issues" / "clear the blockers" / "get the issues ready to work"
  / "what's blocking the backlog" / "what order should I work these in", invokes
  /unblock-gh-issues, or names this skill. For actually implementing the fixes,
  hand the unblocked issues to whatever fix workflow the repo uses.
argument-hint: "Optional: scope (an issue number or label filter) and/or priority hints (e.g. 'do #14 first', 'focus on the login flow'); default is all open issues, ordered by dependency leverage"
---

# /unblock-gh-issues: Triage and Unblock a GitHub Issue Backlog

Make the open backlog **workable**, in the order that unblocks the most. For each in-scope issue, decide whether something is stopping it from being picked up, and if that blocker is one you can remove by getting a decision from the user, remove it: ask, record the answer, clear the flag. Prioritize that work by dependency leverage so one answer frees the most downstream issues (§1.4). When everything in scope that can be unblocked has been, hand back a recommended dependency-ordered sequence for actually working the now-ready pool (§5). This skill does **not** fix code and does **not** touch any branch or working tree — it only reads issues and mutates issue metadata (comments and labels). Working an issue once it is ready is a separate job for whatever fix workflow the repo uses.

The handoff to that fix workflow is the **`needs-info` label plus an issue comment**: this skill leaves a blocked issue OPEN, records the resolution (or the still-open question) as a comment, and toggles the `needs-info` label. A fix pass then knows which issues are ready (label cleared) and which are still waiting (label present). If the repo has a dedicated fix skill that re-checks `needs-info` issues, this feeds it directly; if not, the label plus comment is still a clear, greppable ready/blocked signal for a human or any other tool.

**Interaction style (the core of this skill).** Questions to the user are asked **one at a time**, live, waiting for the answer before the next. Each question is:
- **Simplified to the root decision** — the one fork everything else hangs on, not a menu of sub-options. If a choice has downstream consequences, decide them yourself from the answer; do not ask them separately.
- **Non-technical** — phrased for someone who is not in the code. No jargon, no file names, no framework terms. Describe the choice in terms of what the product does or what the user experiences.
- **Concise** — one or two sentences of context, then the question. Offer a recommended default when you have one.

If a question can be answered by reading the codebase or the issue thread instead of asking the user, read — never spend a user question on something you can look up.

**Decide, don't stall.** Ordering (within any user priority hints, §1.4), whether an issue is blocked at all, whether a blocker is question-removable — your call. Only the user questions themselves pause for input, and those are the point. Everything else you decide and keep moving.

---

## 1. Scan and Classify (once, at start)

1. List the in-scope open issues (plumbing — numbers/titles/labels only, no bodies): narrow to an argument's issue number or label filter if given, else all open.
   ```
   gh issue list --state open --limit 1000 --json number,title,labels --jq 'sort_by(.number)[]'
   ```
   (`--limit 1000` covers any realistic backlog; a bare list silently drops the tail.)
2. **Read each candidate** — body and ALL comments — to find the blocker. The comments carry the real status (a prior run may have marked it blocked, asked a question already, or recorded a decision):
   ```
   gh issue view <N> --json title,body,comments,labels
   ```
   For a large backlog, delegate this reading to ONE subagent that returns a compact table (see below) rather than reading every thread inline — reading full threads is the biggest context sink. For a handful of issues, reading them directly is fine.
3. **Classify each issue** into exactly one bucket:
   - **`ready`** — nothing is blocking it; it can be worked as-is. (Not this skill's job; note it and move on. The fix workflow picks it up.)
   - **`ask`** — blocked only by a missing decision or missing information that the USER can supply. This is the work-list. Capture the single root question.
   - **`hard-blocked`** — blocked by something a question to the user cannot fix: waiting on another issue to merge, an external/backend/third-party dependency, or a real code gap. Record and report; do not work it.
   - **`already-answered`** — it carries `needs-info` (or an open question in-thread) but the answer has since landed (user replied, or the blocking dependency shipped). Clear the flag so it returns to the workable pool (§2, resolve path).
   - **`moot`** — a comment shows it is already fixed, superseded, or a duplicate. Note it; leave closing/deduping to the fix workflow or the user (this skill does not close issues — see §3).

   While reading, **capture the dependency edges** each issue states or implies: "blocked by #X", "needs #Y first", "depends on the decision in #Z", "dup of #W". These references are what makes prioritization possible in step 4, so record them per issue even when the issue itself is `ready` or `hard-blocked` (it may still be the thing another issue waits on).

   If you delegated the read, have the subagent return one row per issue: `| # | bucket | root question or blocker (one line) | depends-on (issues this one waits on) | blocks (issues waiting on this one, if stated) |`, and nothing else (no pasted bodies or comment text). Any evidence you will later put in a comment must be inline in the row, not in a scratch file.
4. **Prioritize by dependency leverage.** The goal is to resolve the blockers that free the MOST downstream work first, so one answer cascades into several newly-workable issues. From the edges captured in step 3, build the dependency picture (a lightweight mental/scratch graph over the in-scope issues — not a formal solver; the backlog is small) and order the `ask`/`already-answered` work-list by:
   - **Prerequisites before dependents, always.** If issue A must be resolved before B can proceed, A is asked first — never ask about B while its own blocker A is still open (the answer to B may depend on A's outcome). If A is `hard-blocked` (can't be cleared here at all), B stays deprioritized behind it: asking about B now is likely wasted, so note B as effectively waiting on A and skip to work you can actually land. Surface it in the report either way.
   - **Then by fan-out.** Among issues with no unresolved prerequisite of their own, rank by how many other issues each transitively unblocks (its downstream count). Highest fan-out first — that is the single question that does the most good. A blocker gating five issues outranks a leaf gating one.
   - **Tie-break:** lowest issue number.
   - **A dependency cycle** (A waits on B waits on A) can't be ordered by prerequisite; break it by asking the user which to resolve first — that root-decision question is itself legitimate unblocking work.

   **User priority hints from args override this ranking.** If the invocation named an order or focus ("do #14 first", "prioritize the login issues", "ignore the export stuff for now"), honor it: it sets the top of the list (or the scope), and the dependency ranking orders whatever it doesn't pin. Priority is the one thing the user states up front; everything else about ordering is your call, never a mid-run question.
5. Build a task list (`TaskCreate`/`TaskUpdate`) in that priority order, one task per `ask` and `already-answered` issue. Those are the only buckets this skill acts on.

---

## 2. Per-Issue: Resolve the Blocker

For each `ask` / `already-answered` issue, one at a time:

**Resolve path (`already-answered`).** The answer is already in the thread or the dependency has shipped. No user question needed. Record it and clear the flag (§2A). Done.

**Ask path (`ask`).**
1. **Confirm it is really a question you can't answer yourself.** Re-check the issue's named files, the repo's architecture/design docs (e.g. an `ARCHITECTURE.md`, `README`, or `docs/` folder if the repo has one), and the thread. If the answer is discoverable, take it — reclassify to `already-answered` and use the resolve path. Only a genuine product/decision gap reaches the user.
2. **Reduce it to the root decision.** Strip it to the single fork that unblocks the issue. If the issue raises several coupled sub-questions, find the one whose answer determines the rest; ask only that. Draft the question in the interaction style above (non-technical, concise, recommended default if you have one).
3. **Ask the user** — one question, then wait. Use `AskUserQuestion` when the fork is a clean choice between options; ask in plain prose when it is open-ended. Do not batch it with other issues' questions.
4. **Apply the answer (§2A).** Translate it into a concrete, in-thread record the fix skill can act on, then clear `needs-info`.

If the user defers or can't answer now, leave the issue as-is (labelled `needs-info` if it wasn't already — see §2A step 2), note it as still-waiting, and move to the next task. Never stall the whole pass on one unanswered question.

### 2A. Recording a resolution (the handoff to the fix workflow)

When a blocker is resolved (user answered, or the answer was already in-thread):
1. **Comment the decision on the issue**, in the user's own terms plus enough specifics for the fix skill to act without re-asking (comment only — never close; see §3):
   ```
   gh issue comment <N> --body "Resolved: <the decision, plainly stated>. <Any specifics the fix needs.>"
   ```
2. **Clear the `needs-info` label** so the issue rejoins the workable pool (a fix pass keys off this label to tell ready from waiting):
   ```
   gh issue edit <N> --remove-label needs-info 2>/dev/null
   ```
   (No-op if it wasn't labelled; harmless.)

When you ASK a question the user can't answer yet (deferred), do the inverse — make sure the open question is durably recorded so a later run (of either skill) can resume:
- Comment the exact open question on the issue, then apply `needs-info` (creating the label once if absent):
  ```
  gh label create needs-info --description "Blocked on user or external input" 2>/dev/null
  gh issue edit <N> --add-label needs-info
  gh issue comment <N> --body "Needs user input: <the single root question>."
  ```

This skill's only GitHub mutations are `gh issue comment` and `gh issue edit --add-label/--remove-label` on the `needs-info` label. It does not close, merge, branch, or edit issue bodies.

---

## 3. Boundaries (what this skill does NOT do)

- **No code, no worktrees, no merges, no master.** It never writes source, runs builds/tests, creates branches or worktrees, or advances master. If an issue needs a code change to be unblocked, that IS the block — record it as `hard-blocked` and report it.
- **No closing or deduping.** Even for a `moot` issue, this skill records the observation and reports it; closing/deduping stays with the fix workflow or the user. Keeping this skill's mutations narrow (comment + `needs-info` only) avoids double-handling with whatever works the issues next.
- **No hard-blocker chasing.** Waiting-on-another-issue, external dependencies, and backend gaps are noted and reported, not resolved here.
- **Text style:** no em dashes in anything written to GitHub (comments, labels).
- **Safety:** reading issues and editing issue metadata is all that happens, so there is no stack to isolate and nothing to tear down. Do not touch any running instance or its data.

---

## 4. Resume Across a Compact

Keep a durable resume note in the project memory for this run: the skill name, this run's scope, any user priority hints, the scratch root if one was used, the captured dependency edges and the resulting priority order (so the ranking and the final recommended order survive without re-reading every thread), and the classification table with each issue's bucket and its resolution state (question asked / answered / recorded / still-waiting). Record only this orchestration state — issue numbers, buckets, edges, and one-line statuses; never paste full issue bodies or comment threads into the note. On resume, re-verify open-issue state and labels against `gh` before acting; the answer to a question may have landed, or the user may have closed an issue, since the note was written.

---

## 5. End of Run

When the in-scope backlog has been classified and every `ask`/`already-answered` issue has been acted on, surface ONE report and STOP:
- **Unblocked this run** — issues whose blocker was resolved (user answer or already-in-thread), now with `needs-info` cleared and ready for the fix workflow.
- **Recommended processing order** — once everything in scope that COULD be unblocked has been, produce a suggested sequence for actually working the now-workable pool (the issues unblocked this run plus any that were already `ready`). Derive it from the SAME dependency graph used for prioritization (§1.4): prerequisites before dependents, then highest-fan-out first (do the issue that unblocks the most next), lowest number to break ties. Present it as a plain numbered list of issue numbers with a few words each on why it sits where it does (e.g. "do first — three others build on it"). This is a recommendation to hand to the fix workflow or the user; this skill does not execute it. Issues still waiting on the user or hard-blocked are NOT in this list (they aren't workable yet) — call them out separately as "blocked from the work order until X".
- **Still waiting on the user** — issues where a question was asked but deferred/unanswered, each with the exact open question.
- **Hard-blocked** — issues a question can't unblock, each with the blocker (which issue, dependency, or code gap) and, where clear, what would unblock it.
- **Already workable** — the `ready` issues found (no action taken; folded into the recommended order above).
- **Observed moot** — issues that look already-fixed/superseded/duplicate, with evidence, flagged for the user or the fix skill to close.

This skill makes one pass and does not wait on later user replies. To resume after answering deferred questions, the user re-invokes it (or wraps it in `/loop` for a recurring cadence). Then hand the unblocked issues, in the recommended order above, to whatever fix workflow the repo uses.
