---
name: fix-gh-issues
description: |
  Generic autonomous GitHub-issue processing: triage the in-scope open
  issues (reading each issue's COMMENTS for status clues and blockers), then
  fix them one at a time in a throwaway git WORKTREE per issue, verify against
  the project's gates, FF-merge to the main branch, auto-clean the worktree and
  branch, and close the issue with a commit reference. Every project-specific
  fact (setup, verify gates, isolation, conventions) comes from a PROJECT
  PROFILE supplied by a thin project wrapper skill or derived at run start.
  Processes the in-scope backlog once, then stops and reports.
  TRIGGER when the operator wants to start fixing open GitHub issues in a
  repo with NO project-specific wrapper for this workflow: says "fix issues" /
  "work the issues" / "process the issue backlog", or invokes /fix-gh-issues.
  A project wrapper skill (its description will say it wraps /fix-gh-issues)
  always takes precedence in its repo — it invokes this skill with its profile.
argument-hint: "Optional: scope (an issue number or label filter) plus any run-relevant details; default is all open issues"
---

# /fix-gh-issues: Autonomous GitHub-Issue Processing (generic core)

Drive the in-scope open GitHub-issue backlog to done, one issue at a time, each in its own disposable git worktree that is cleaned up automatically, then stop and report (§5). It is meant to run under Autonomous Mode (orchestrate via subagents, batch questions and approvals to the end, never stall the run on one blocked thread). This file carries only the workflow; every project-specific fact lives in the PROJECT PROFILE (§0).

**Run parameters** (settle up front, mostly from the invocation; ask the operator ONCE only if genuinely open, then persist in memory): **scope** comes from the arguments — a specific issue number, a label filter, or (default) all currently-open issues, plus any other run-relevant details passed; **profile** comes from the wrapper skill that invoked this one, or from §0's no-profile fallback; **review** runs the adversarial loop on non-trivial issues and skips it for mechanical one-liners, capped at 3 review cycles for simple issues and 5 for complex ones — the driver classifies each issue after reading it (§2A); the operator may override the policy or caps via arguments, which the main session forwards to the driver; **delivery** is branch-per-issue in a worktree, FF-merged to the main branch, closed as you go.

**The main session is a chain orchestrator ONLY.** Its entire job is deciding what runs next across the backlog and reconciling effects that span issues — it never reads code or issue internals and never does the work of any single issue. Everything scoped to one issue (reading, implementing, testing, verifying, and adjudicating that issue's own review findings, and classifying the issue's difficulty) belongs to that issue's subagents.

**HARD RULE — the main session never reads to understand, only to orchestrate.** If a read would help you understand the code or the problem, it belongs to a subagent. The main session MAY read only:
1. Subagent return values (bounded by the return contract below).
2. The triage disposition table (§1).
3. Git/gh plumbing output — `git worktree`/`merge`/`branch` results, `gh issue list` with `--json number,title,labels` only (NEVER `body`/`comments`), and commit hashes.
4. Its own durable resume/checkpoint note (§4).
5. This skill file, the project profile, and operator messages.

The main session must NOT read: raw issue bodies/comments, project docs/source/callers, the diff, lint/typecheck/test/build output, or review findings in full. Each of those is owned by a subagent. (A sibling issue obsoleted by an earlier fix is handled by the driver's `moot` return, §2A — the main session never needs to read one issue's artifact to disposition another.)

**HARD RULE — the main session never implements.** Every file write that is part of fixing an issue — production code, tests, and issue documentation — goes through a subagent working in that issue's worktree, including one-line fixes. If the main session touches a fix directly, back it out and redo it through a subagent. The only writes the main session performs are the master-side orchestration writes in §2 (creating and removing the worktree and branch, the FF-merge, the profile's post-merge steps, `gh` issue commands, and the durable memory note — never any setup or edits INSIDE the worktree); everything inside the worktree — setup, the fix, tests, and the commit itself — happens inside the driver. When in doubt whether a write is "implementation," treat it as implementation and delegate.

**HARD RULE — the return contract (every subagent, at every level).** A subagent's reply IS its return value to whoever spawned it, not a human-facing message, and it lands verbatim in that caller's context — so it must be small. The FIRST line is always the status line, and it alone carries the verdict enum (given per role in §1/§2A/§2B) — the caller parses line 1 for the verdict and nothing else depends on later lines being present. After it, a subagent may append ONLY: artifact path(s) if needed, and (driver `clean` return only) the bounded ≤10-bullet follow-up block defined in §2A step 9. NEVER anything bulky inline — no diffs, no file contents, no gate logs, no raw review findings, no long reasoning. Bulky output goes to a file (see below) and the path is returned. State the relevant contract in each subagent's prompt when you spawn it.

**HARD RULE — file handoff for bulky data.** When a subagent must pass something large (a diff, a review-findings set, a long log), it writes it to `<scratch>/issue-N/<what>.md` and returns only the path plus a one-line summary. Paths are opaque pointers: a subagent forwards a path to the next subagent as an input, and a caller does NOT read it unless a decision genuinely requires it (the main session never does — its allowlist above excludes all such artifacts). This is how bulky data moves down the tree without transiting any orchestrator's context. `<scratch>` is a per-run scratch directory the main session creates once at start (e.g. via `mktemp -d`) and passes to every subagent it spawns; each subagent passes it on to its own children.

**The driver must have the `Agent` tool.** The per-issue **driver** (§2A) spawns a review-orchestrator child, so it MUST be launched as an agent type that has the `Agent` tool (e.g. `general-purpose` or `claude`); agent types without it (e.g. `Explore`, `Plan`) cannot nest and must not be used as the driver. The full nesting runs main → driver → review orchestrator → external review CLIs (the CLIs are separate processes the orchestrator drives via Bash, not spawned subagents; the orchestrator itself spawns nothing, so it needs no `Agent` tool).

**Decide, don't pause, on anything reversible.** Only the gated actions in §3 (push, production, credentials, persistent data) are worth a pause. Processing order, scoping, triviality calls — your call: decide, note the one-line reason, keep moving. Batch genuinely-open questions into the end-of-run report (§5), never mid-run.

---

## 0. The Project Profile

The profile is ONE Markdown block of named subsections carrying every project-specific fact the workflow needs. A wrapper skill supplies it; fields marked optional may be omitted (default: none, unless the field states another):

- **Profile: identity** — project name, main-branch name, worktree root. Defaults: the repo's default branch; worktree root per the global convention (sibling folder `<repo-folder-name>-worktrees` next to the repo).
- **Profile: worktree setup** — per-worktree bootstrap steps (installs, generated files the build needs, cache symlinks). Optional.
- **Profile: understanding** — the source-of-truth docs to exhaust before treating a question as open. Optional; default: the repo's README and `docs/`.
- **Profile: code conventions** — indentation/comment style. Optional; default: match surrounding code.
- **Profile: tests** — where tests live and how to run them.
- **Profile: verify gates** — the exact commands that must ALL be green before a commit.
- **Profile: commit** — staging exclusions (setup artifacts that must stay OUT of commits). Optional.
- **Profile: isolation** — live-instance container/port patterns to avoid, and the port range for your own isolated stack. Optional, but strongly recommended for projects with live services.
- **Profile: build discipline** — host-specific build/test serialization rules, layered on top of §3's. Optional.
- **Profile: post-merge steps** — steps main runs from the MAIN checkout after each merge (never the worktree), each as its own separate commit. Optional.
- **Profile: review panel** — reviewer roster and review-policy override (may vary the roster by cycle and set a minimum cycle count; the driver and review orchestrator honor it over §2A/§2B's defaults). Optional; default: §2B's panel.

**HARD RULE — the profile travels with the workflow text.** Subagents cannot dereference a "Profile:" pointer any more than a "§2A" pointer: whenever a spawn prompt carries relayed section text (§2A, §2B, §3), it MUST carry the FULL profile block too. A profile pointer without the block silently strips the project rules from the subagent — treat it as the same error as an unresolvable § pointer.

**No profile supplied** (direct invocation in a repo without a wrapper): the main session must NOT read the repo to derive one (the read allowlist above). Spawn a one-shot **profile subagent** to inspect the repo (build system, test layout, CI config, default branch, service ports) and return a draft profile block in the format above — the block IS its return value, nothing else. If it cannot determine verify gates it is confident in, STOP before fixing anything and surface that as the blocking question in the §5 report; never run fixes against guessed gates. Record the derived profile in the §4 resume note so the run survives a compact with the same rules it started with.

---

## 1. Triage Scan (the First Thing You Do, Once at Start)

1. List the in-scope open issues yourself (this is plumbing — numbers/titles/labels only, no bodies, so it stays in the main session); narrow to the argument's issue number or label filter if one was given, else all open:
   `gh issue list --state open --limit 1000 --json number,title,labels --jq 'sort_by(.number)[]'`
   (`--limit 1000` covers any realistic backlog; a bare list silently drops the tail past the limit, so do not lower it.)
2. **Delegate the read to a triage subagent.** Reading bodies and comment threads inline is the single largest main-session context sink, so the main session never does it. Spawn ONE triage subagent, hand it the in-scope issue numbers, and have it read each candidate's body and comments (`gh issue view <N> --json title,body,comments,labels`) and return a compact disposition table — nothing else. Give it these instructions verbatim:
   - Read ALL candidates, including any carrying a `needs-info` label. The comments carry the real status.
   - For each issue, emit one table row: `| # | verdict | one-line reason | blocker/dup refs |`, where verdict is one of `do` / `skip-blocked` / `skip-duplicate` / `already-done` / `resume-partial` / `needs-info-still-waiting`.
   - Disposition rules to apply while reading:
     - A comment saying the issue is **already fixed / merged / closed elsewhere** → `already-done` (capture the evidence, e.g. the commit/PR ref, in the reason).
     - A comment marking it **blocked** by another issue, an operator decision, a backend gap, or an unshipped dependency → `skip-blocked` (name the blocker in refs).
     - A `needs-info` label means a prior run left it **awaiting the operator or someone else**. Check whether the answer has landed. If it has NOT → `needs-info-still-waiting`. If it HAS (the operator answered in a comment, or the blocking dependency merged), read the answer and emit the NORMAL verdict it implies — not a blanket `do`: implement → `do`; close / won't-fix → `already-done` (cite the operator comment as evidence); duplicate → `skip-duplicate`; defer / still-blocked → `skip-blocked`. (A blanket `do` would send a close/dup/defer answer to a driver that has no matching return, stranding it.)
     - A comment that **re-scopes, supersedes, or duplicates** it (e.g. "dup of #14") → `skip-duplicate` (name the counterpart in refs).
     - A comment (often from a prior run) recording **partial progress** or a chosen approach → `resume-partial` (one line on where to resume).
     - A prior second-opinion comment recording an agreed disposition (e.g. "Codex + Grok converged: file" → `do`, or "...: skip/close" → the matching skip/close verdict) should be honored as that disposition.
   - The table IS the return value. Do NOT paste issue bodies, comment text, or any other prose. Any evidence main will put in a close comment (the commit/PR ref for `already-done`, the counterpart for `skip-duplicate`) MUST be inline in the row's reason/refs — main cannot read a scratch file and a close comment needs a durable GitHub-visible reference, not a path. If an issue needs a longer note than fits one line, write the overflow to `<scratch>/triage/issue-<N>.md` and put the path in refs as SUPPLEMENTAL detail, never as the sole evidence for a close. Do NOT edit labels or otherwise mutate issues — you only read and report; the main session owns every `gh` mutation.
3. Build a task list (`TaskCreate`/`TaskUpdate`) from the triage table — one task per in-scope issue. This is the fixed work-list for the run; the skill processes it once.
4. Disposition every row, then work the actionable ones. **Close rule for the whole run:** whenever a close (here or in §2) touches an issue carrying a `needs-info` label, clear the label so it does not linger on a closed issue: `gh issue edit <N> --remove-label needs-info 2>/dev/null`.
   - `already-done` → close it now with a comment citing the evidence ref from the table (`gh issue close <N> --comment "..."`); do not spin a driver.
   - `skip-duplicate` → comment naming the counterpart and close as a duplicate; do not spin a driver.
   - `skip-blocked` / `needs-info-still-waiting` → leave OPEN and skip; no comment needed (the blocker/label already records why).
   - `do` / `resume-partial` → these are the work-list. Pick the next one in the order that makes logical sense, not strictly by number: if the refs column shows a dependency ("needs #X first"), do the prerequisite first; absent any dependency signal, lowest-number-first is a fine default. **Ordering is your call, never a question** — on ambiguity pick what unblocks the most work (lowest number on a tie) and proceed; a stall costs the run.

   Any follow-up issues this run files are deferred to a future invocation, not worked now.

If an argument names a specific issue or label, scope the scan (and the triage subagent) to it.

---

## 2. Per-Issue Loop (Worktree Lifecycle With Auto-Cleanup)

The main session does almost nothing per issue: create a worktree, spawn the driver, and act on its one-line return with master-side plumbing. ALL reading, implementing, testing, verifying, review, AND the commit happen inside the **driver subagent** (§2A). The main session never touches the fix's files. For each actionable issue **N**, the main session:

1. **Create a throwaway worktree off the main branch** (outside the main checkout; worktree root and main-branch name per Profile: identity):
   ```
   git worktree add <worktree-root>/issue-N -b fix/issue-N-<slug> <main-branch>
   ```
2. **Spawn the driver subagent** for issue N (§2A), pointed at that worktree. A subagent can load a *named* skill on its own (that is how it will reach `/drive-external-agent` later), but it cannot dereference a "§2A"/"§2B" pointer into THIS file — so relay the actual text of those sections. Hand it: the driver brief (§2A's steps, plus §2B's text for it to pass to its own child), the safety rules (§3), the FULL project-profile block (§0's relay rule), the issue number, the worktree path, its scratch dir `<scratch>/issue-N/`, the issue's triage row (verdict + reason + refs — its `resume-partial` note is the driver's starting point), any operator review-policy/cap overrides, and its return contract. The driver reads the issue and classifies its own difficulty; do NOT pre-classify it. Then wait for its one-line return. Do NOT read the diff, the files, the gate output, or the review findings — the driver owns all of that.
3. **Act on the driver's return** (a single status line). Only `clean` runs steps 4-7 in full (merge, post-merge steps, close, follow-ups); `blocked`/`failed`/`moot` each do their own disposition below and then skip straight to the next task (step 8):
   - `clean: <commit-hash>` → the driver committed and verified in its worktree branch. Proceed to merge (step 4).
   - `blocked: <reason>` → nothing to merge. Handle per **Blocked mid-work** below (which includes cleanup), then continue to the next task in the work-list.
   - `failed: <reason>` → the driver could not get gates green (or the review panel was unavailable); nothing to merge. Leave the issue OPEN with a status comment recording the cause, discard the worktree (the shared cleanup in step 4, `--force` since it is dirty; no merge), and continue to the next task. Add `needs-info` only if it genuinely needs a human (a plain panel outage does not — it resumes next run).
   - `moot: <evidence>` → an earlier fix this run already resolved the issue; discard the worktree (step 4 cleanup, `--force`; no merge) and close the issue with a comment citing the evidence (§1.4's close rule applies). Continue to the next task.
   - anything else (no return, a malformed line, or a contract violation) → treat as `failed: driver error`: leave the issue OPEN with a status comment, discard the worktree (step 4 cleanup, `--force`; no merge), and continue. Do NOT improvise a merge from an unclear return.
4. **FF-merge to the main branch and AUTO-CLEAN** (from the main checkout), using the hash the driver returned. Confirm the main checkout is on the main branch first:
   ```
   git merge --ff-only fix/issue-N-<slug>
   git worktree remove --force <worktree-root>/issue-N
   git branch -d fix/issue-N-<slug>
   ```
   (`--force` because untracked setup artifacts the driver created per Profile: worktree setup — caches, symlinks, placeholder build outputs — would otherwise block removal even after a clean commit. `git branch -d` here is deliberate on the merge path — it refuses to delete an unmerged branch, a real safety check that the FF-merge just satisfied. On every DISCARD path — `blocked`/`failed`/`moot`/driver-error — the same two cleanup commands run WITHOUT a merge, still with `--force`, but use `git branch -D` (capital): those branches are thrown away by definition, and a driver that committed before hitting a blocker or returning garbage would make `-d` fail and strand a colliding branch.) The main checkout must be clean before any master-side action — the run never writes to it except the post-merge steps in step 5. If you find an unexpected uncommitted change in the main checkout, do NOT stash it around the merge (that risks mixing operator work into a commit). It also cannot be resolved mid-run, and no further merge can land until it is, so do not limp on: post this issue's `failed`-path status comment, discard its worktree and branch (step 4 cleanup with `--force` and `git branch -D`, since a commit exists on the branch), and END THE RUN, going straight to the §5 report with the dirty-checkout as the stopping reason. (The main branch only ever advances here, from a clean return — so a driver that died leaves only a throwaway worktree to delete, never a half-merged main branch.)
5. **Run the profile's post-merge steps** (Profile: post-merge steps), if any, from the MAIN checkout (never the worktree), each as its own SEPARATE commit. Skip this step when the profile defines none.
6. **Close the issue** with a comment naming the driver's commit hash (commits are local/unpushed, so the `closes #N` keyword will not auto-fire): `gh issue close N --comment "Fixed in commit <hash> ...".` If it carried a `needs-info` label (a prior run's question since answered and worked), §1.4's close rule applies.

   **Blocked mid-work / needs operator input.** A `blocked: <reason>` return means the driver hit a blocker that needs a human (a decision it cannot make, missing information, an external dependency, or a review `abort-unsound`). Do NOT stall the run: post a comment on the issue stating the blocker plus what the driver completed so far, apply the `needs-info` label (creating it first if absent: `gh label create needs-info --description "Blocked on operator or external input" 2>/dev/null; gh issue edit N --add-label needs-info`), leave the issue OPEN, then **discard the worktree** (step 4's cleanup, `--force`; no merge) so the next invocation's `worktree add` does not collide — the issue comment is the durable progress record. A future invocation's triage (§1) re-checks `needs-info` issues and resumes any the operator has by then answered. (This is distinct from a clearly-blocked issue caught at triage, which the triage subagent simply marks `skip-blocked` per §1.)
7. **File follow-ups** for the driver's follow-up bullets that name lasting work — a deferred non-fix, out-of-scope discovery, test-infra gap, or a non-serious review finding left unfixed at the cap — as a `known-open` GitHub issue (creating the label first if absent: `gh label create known-open --description "Known open follow-up" 2>/dev/null`). A degraded-panel (`n/m`) bullet is NOT filed as an issue — it is a run observation that goes only into the §5 report.
8. Mark the task complete, then take the next task from the work-list (§1.4).

### 2A. The Driver Subagent (owns everything inside one issue, including the commit)

One driver subagent per issue does all the per-issue work — reading, implementing, testing, verifying, delegating review, applying review fixes, and committing — and surfaces only a one-line return. It DOES all its own code writes; it does NOT delegate implementation. Its brief (state this in its prompt, along with the full profile block):

1. **Set up the worktree** yourself per **Profile: worktree setup** (it is a fresh checkout; gitignored artifacts do NOT propagate — installs, generated files the build needs, and cache links must be recreated here).
2. **Read to understand** yourself — start with **the issue itself (body and all comments)**, then the profile's source-of-truth docs (**Profile: understanding** — exhaust them before treating a question as open), the issue's named files, and immediate callers. Your triage row's `resume-partial` note, if any, is where to pick up. Do NOT spawn a child for this; reading is your job.
3. **Classify the issue** now that you've read it, three ways: **trivial** (a mechanical one-liner — no review); **simple** (needs review, cap 3 cycles); or **complex** (needs review, cap 5 cycles). Complex = touches multiple modules, carries non-trivial logic, or is security-adjacent; otherwise simple. Judge the actual change, not the title; honor any operator override passed to you. This classification is yours because only you have read the issue — the main session cannot. If, while reading, you find an earlier fix from this same run has already resolved or obsoleted this issue, stop and return `moot: <evidence>` (step 9) instead of re-fixing it.
4. **Implement** the fix in the worktree yourself. Do NOT delegate implementation to a child. Match conventions (**Profile: code conventions**; NO em dashes regardless). Surgical changes only; fix the issue, do not refactor adjacent code. Where it makes non-trivial logic testable without contorting a component test, prefer extracting a pure helper (do not force it for one-off code — that would fight the surgical-change rule).
5. **Cover the change with tests** yourself, that fail on regression, in the project's test layout (**Profile: tests**). Tests encode WHY, not just WHAT.
6. **Verify** with ALL gates green per **Profile: verify gates** (prefix EVERY build/compile/test command in this whole brief — including any Profile: worktree setup builds — with `ionice -c3 nice -n19` per §3). Warnings are blockers. Run anything the profile marks as needing an isolated stack against YOUR OWN stack (§3), never a live one.
7. **Review loop** (non-trivial only; skip entirely for trivial). YOU own this loop; each pass is one review *cycle* and counts against your cap (simple=3 / complex=5, or the operator override):
   - Spawn ONE **review-orchestrator child** on your CURRENT diff (any agent type with Bash; it drives external CLIs and spawns no subagents, so it does NOT need the `Agent` tool). Relay it the §2B section text verbatim plus the profile block (it cannot dereference a "§2B" pointer into this skill, though it CAN load the named `/drive-external-agent` skill itself), plus: the diff (write it to `<scratch>/issue-N/diff-<cycle>.patch`), the cycle number, and a one-paragraph statement of what the fix is meant to accomplish. Do NOT run reviewers yourself and do NOT read raw findings.
   - It returns `reviewed (n/m panel): <fix-list>`, `abort-unavailable: <reason>`, or `abort-unsound: <reason>`.
   - On `abort-unavailable` → do NOT commit; return `failed: review panel unavailable` (an outage, recoverable next run — not a human blocker). On `abort-unsound` → do NOT commit; return `blocked: <reason>`.
   - On ANY return that does not match those three exact forms (empty, garbled, or a crashed child) → do NOT read it as an empty fix-list (that would merge an unreviewed diff). Re-spawn the orchestrator once on the same diff; if it is still malformed, treat it as `abort-unavailable` and return `failed: review panel unavailable`.
   - If `n < m` (degraded panel), keep the "reviewed by n/m" note for your follow-up bullets (step 9) so it reaches the §5 report; the cycle still counts.
   - On an **empty** fix-list → the current diff is clean; exit the loop and commit.
   - On a **non-empty** fix-list → apply the fixes YOURSELF, re-verify (step 6), and if you have cycles left, loop again with a fresh review-orchestrator on the NOW-UPDATED diff. (Re-reviewing the changed artifact is the point — a fix you made must face reviewers before it can be the clean exit.)
   - **At the cap with a still-non-empty fix-list:** classify each remaining finding by the adversarial-review skill's serious/trivial definitions (serious = correctness, security, data loss, architectural flaw, broken requirement). If ANY serious finding remains unfixed — whether you'd fix it now or defer it — return `blocked: <reason>`; do NOT commit and do NOT return `clean`, because `clean` means no unresolved serious finding, period (a serious defect never rides out as a follow-up bullet). Only if EVERY remaining finding is trivial-class: apply what you can, **re-verify (step 6)** — these last edits are unreviewed, so gates must be green before you commit — and list each remaining one in your step-9 follow-up bullets (so main files it as a `known-open` issue where it stays visible), never only in the commit body, which main never reads.
8. **Commit** in your worktree branch yourself, as one logical commit. Stage files EXPLICITLY (any untracked setup artifacts — **Profile: commit** lists them — must stay OUT of the commit; stage only the source and test files you changed, never `git add -A`). Concise imperative message; body explaining the bug, the fix, and what review found; end with the project's `Co-Authored-By` trailer. Capture the resulting commit hash.
9. **Return** one line to the main session, honoring the return contract:
   - `clean: <commit-hash>` — committed and verified, and (if non-trivial) the review loop exited with no unresolved serious finding. Append a ≤10-bullet follow-up list INLINE (one line each; never a file path — main files these as issues and cannot read artifacts, so a path would strand them) if there are deferred/out-of-scope/test-infra items, any trivial-class review findings left unfixed at the cap, or a degraded-panel (`n/m`) note — anything the §5 report must surface; omit the list only if there is genuinely nothing. If findings somehow exceed 10, consolidate to the 10 that matter most.
   - `blocked: <reason>` — a decision/dependency needs a human, or review returned `abort-unsound`, or a serious review finding could not be resolved within the cap. One line on what was completed; details to an artifact path if needed. Nothing is committed.
   - `failed: <reason>` — could not get gates green after honest effort, or the review panel was unavailable (`abort-unavailable`). One line on the failing gate/cause; failing output to an artifact path, NOT inline. Nothing is committed.
   - `moot: <evidence>` — an earlier fix this run already resolved or obsoleted the issue; no work needed. The main session closes it with the evidence. Nothing is committed.

Do NOT merge, remove the worktree, run post-merge steps, or MUTATE GitHub (comment / close / label / edit) — those are the main session's (§2). Reading GitHub is fine (you `gh issue view` your own issue in step 2); it is only writes to GitHub and the master-side git actions that are not yours. You own the worktree end to end up to and including the commit.

### 2B. The Review-Orchestrator Child (one review pass over the current diff)

Spawned by the driver once per review cycle (the driver hands it the diff path, the cycle number, and a one-paragraph statement of what the fix is meant to accomplish). It reviews the diff AS-IS with a full panel, adjudicates, and returns a single fix-list — it does NOT loop and does NOT apply fixes (the driver owns the fix→re-review loop, §2A step 7). It is a separate subagent so the bulky raw panel output stays out of the driver's context and so adjudication is done by someone other than the code's author. Its brief:

1. **Dispatch the panel.** Send the diff (plus the fix-intent paragraph, so reviewers can judge correctness, not just convention) to each reviewer independently via the `/drive-external-agent` skill in **Mode B (scoped-read)** — point each at the worktree, forbid writes, and inline the diff as the *focus* (repo-resident code review needs surrounding context; a sealed slice misses convention/API-misuse — this matches the adversarial-review skill's default). Panel: the profile's roster if it names one (**Profile: review panel**), else the default — **codex**, **claude** (`opus` and `sonnet`), and **grok**, each at the pinned default model IDs in `/drive-external-agent`; do NOT use `grok-composer`, which ignores reasoning effort and silently reviews a middle-truncated view of any diff over ~33 KB. Capture each reviewer's OUTPUT into `<scratch>/issue-N/review-<cycle>-<model>.md` YOURSELF, the way drive-external-agent specifies per CLI (codex via its `-o <file>`; grok and claude via stdout redirect) — never rely on a reviewer to write its own findings file: codex and claude Mode B are enforced read-only so they cannot, and grok's no-write is only a prompt contract.
2. **Gate every reviewer** per drive-external-agent's rules (exit code 0 AND a complete, non-empty result — a failed or empty run must NOT be read as "no findings"). Retry a failed reviewer once. Track how many of the panel returned a valid review.
3. **Adjudicate** which findings are real yourself. Produce a single de-duplicated fix-list.
4. **Return** one line to the driver:
   - `reviewed (n/m panel): <fix-list>` — the adjudicated real findings for this pass (possibly EMPTY = the diff is clean), with `n` of `m` reviewers having returned valid reviews. If `n < m`, the driver carries the degraded-panel note into its follow-ups so it reaches the §5 report; a partial panel still runs (don't stall the run) but is never silently treated as a full sweep. Long lists go to an artifact path.
   - `abort-unavailable: <reason>` — the panel could not be run at all (ZERO reviewers valid after retry); an infrastructure outage, not a defect in the change.
   - `abort-unsound: <reason>` — reviewers agree the change is fundamentally wrong or misconceived (a real blocker for a human).

---

## 3. Safety and Isolation

- **Never disrupt any running instance.** The operator or other agents/processes may have live test instances up — **Profile: isolation** names the container patterns, DB ports, and web ports to avoid. Do not use their DBs, do not stop/restart/`down` their containers, do not run tests against their ports.
- **Stand up your OWN isolated stack** for live/integration verification, on DIFFERENT ports (Profile: isolation gives the range). Tear down only what you started; confirm the operator's containers are still healthy at the end. NEVER `docker kill` / `killall`; only manage containers you started.
- **Build discipline:** prefix EVERY build/compile/test command with `ionice -c3 nice -n19` so it yields CPU and disk on the shared host — no exceptions. Apply the profile's host rules (**Profile: build discipline**) on top.
- **Permission gates:** never push, touch production, change credentials, or alter persistent data without explicit operator approval. Local build/test/dry-run is free; the consequential real-world action is gated. Pushing the merged commits is the OPERATOR'S call; leave the main branch ahead-of-origin and unpushed unless told otherwise. Never commit secrets.
- **Text style:** no em dashes in anything intended for humans (commits, comments, issue text).

The driver runs all builds, tests, and isolated stacks, so its brief MUST carry the isolation, build-discipline, and text-style rules above AND the full profile block; fold them into the driver's spawn prompt. The push/production/credentials gate is the main session's, since only it performs master-side and GitHub actions.

---

## 4. Resume Across a Compact

Keep a durable resume note in memory (the project memory file for this run): the skill name plus this run's scope and any operator overrides, the profile in use (the wrapper skill's name, or — if §0's fallback derived one — the derived profile block verbatim), and the scratch root (this skill file on disk is the source for the workflow and rules — reference it, never copy its content into the note), every DONE issue with its commit hash, and the IN-FLIGHT issue's exact state (which worktree, whether its driver is still running or has returned, that return's status line and hash, and whether main has merged/cleaned/closed yet). This note is orchestrator state only — record the driver's one-line returns and artifact paths, never paste diffs, findings, or gate output into it (the read allowlist applies to the note too). Update it at each checkpoint so the run survives a context compact or a fresh session. On resume, re-verify all volatile claims (commit hashes, merge state, open-issue list, worktree existence) against git and `gh` before acting; status is verified, never trusted.

---

## 5. End of Run

When the in-scope backlog is drained, surface ONE batched report and STOP:
- the issues fixed (with commit hashes);
- any closed as already-done / duplicate / `moot`, with the evidence;
- any skipped/blocked ones and why;
- the `needs-info` issues with the specific open question each is awaiting (these are the ones genuinely blocked on a human);
- issues left OPEN by a `failed` return (gate failure or panel-unavailable) that should be retried next run;
- any fix that merged on an `n/m` degraded panel (less than full review coverage);
- pending approvals (e.g. the unpushed main branch);
- residual risks (including non-serious review findings filed as `known-open`);
- the follow-ups filed (deferred to a future invocation).

The skill does not monitor for or wait on issues filed later. To pick up new issues, the operator re-invokes the skill (or wraps it in `/loop` for a recurring cadence).
