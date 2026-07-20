---
name: gh-fix-issues
description: |
  Generic autonomous GitHub-issue processing: triage in-scope open issues, fix
  by group (one worktree + one end review per group), verify, FF-merge, clean
  up, close with a commit ref. Scope: label, plain issue lists, and/or group
  batches like (12, 15), (7). Project facts from a PROJECT PROFILE (wrapper or
  derived). One pass, then stop.
  TRIGGER when the operator wants to start fixing open GitHub issues in a
  repo with NO project-specific wrapper for this workflow: says "fix issues" /
  "work the issues" / "process the issue backlog", or invokes /gh-fix-issues.
  A project wrapper skill (its description will say it wraps /gh-fix-issues)
  always takes precedence in its repo — it invokes this skill with its profile.
argument-hint: "Optional: scope — label, issue list (#12, 15 or 12 15), and/or group batches like (12, 15), (7); plus run details; default all open"
---

# /gh-fix-issues: Autonomous GitHub-Issue Processing (generic core)

Drive the in-scope open GitHub-issue backlog to done by **group** (one worktree + one end-of-group review each), then stop and report (§5). Run under Autonomous Mode; workflow here, project facts in the PROJECT PROFILE (§0).

**Run parameters** (settle up front; ask once only if genuinely open): **scope** per **Scope forms** below; **profile** from wrapper or §0 fallback; **review** caps and policy per §2A (operator overrides forwarded to the driver); **delivery** branch-per-group, FF-merged, issues closed as you go.

**Scope forms** (all valid; combine only when unambiguous):
- **Default** — no issue/label/group token: all open issues; each actionable issue is a solo group after triage.
- **Label filter** — label name or `label:foo` / `--label foo`: open with that label; solo groups after triage order.
- **Plain issue list** — `#12`, `12, 15, 7`, or `12 15`: those numbers only, each a **solo group**, listed order (triage still runs).
- **Group batch** (unblock handoff) — parenthesized bare numbers, e.g. `(12, 15), (7)` or `Batch 1: (12, 15), (7)`. Each `(...)` is one group (one worktree + one end review). Multiple batch lines run in listed order.
- **Other run details** (review caps, priority notes) are free-text overrides; they do not change number parsing.

When both a plain list and group parens appear, **group syntax wins** for structure; bare numbers outside parens become extra solo groups after the parenthesized ones.

**The main session is a chain orchestrator ONLY.** It decides what runs next and reconciles cross-issue effects. Per-issue/group work (read, implement, test, verify, review findings, difficulty class) belongs to subagents.

**HARD RULE — the main session never reads to understand, only to orchestrate.** If a read would help you understand the code or the problem, it belongs to a subagent. The main session MAY read only:
1. Subagent return values (bounded by the return contract below).
2. The triage disposition table (§1).
3. Git/gh plumbing output — `git worktree`/`merge`/`branch` results, `gh issue list` with `--json number,title,labels` only (NEVER `body`/`comments`), and commit hashes.
4. Its own durable resume/checkpoint note (§4).
5. This skill file, the project profile, and operator messages.

The main session must NOT read: raw issue bodies/comments, project docs/source/callers, the diff, lint/typecheck/test/build output, or review findings in full. Each of those is owned by a subagent.

**HARD RULE — the main session never implements.** Every file write that is part of fixing an issue — production code, tests, and issue documentation — goes through a subagent working in that issue's worktree, including one-line fixes. If the main session touches a fix directly, back it out and redo it through a subagent. The only writes the main session performs are the master-side orchestration writes in §2 (creating and removing the worktree and branch, the FF-merge, the profile's post-merge steps, `gh` issue commands, and the durable memory note — never any setup or edits INSIDE the worktree); everything inside the worktree — setup, the fix, tests, and the commit itself — happens inside the driver. When in doubt whether a write is "implementation," treat it as implementation and delegate.

**HARD RULE — the return contract (every subagent, at every level).** A subagent's reply IS its return value to whoever spawned it, not a human-facing message, and it lands verbatim in that caller's context — so it must be small. The FIRST line is always the status line, and it alone carries the verdict enum (given per role in §1/§2A/§2B) — the caller parses line 1 for the verdict and nothing else depends on later lines being present. After it, a subagent may append ONLY: artifact path(s) if needed, and (driver `clean` return only) the bounded ≤10-bullet follow-up block defined in §2A step 9. NEVER anything bulky inline — no diffs, no file contents, no gate logs, no raw review findings, no long reasoning. Bulky output goes to a file (see below) and the path is returned. State the relevant contract in each subagent's prompt when you spawn it.

**HARD RULE — file handoff for bulky data.** When a subagent must pass something large (a diff, a review-findings set, a long log), it writes it to `<scratch>/issue-N1/<what>.md` (group-scoped; `N1` = first issue id) and returns only the path plus a one-line summary. Paths are opaque pointers: a subagent forwards a path to the next subagent as an input, and a caller does NOT read it unless a decision genuinely requires it (the main session never does — its allowlist above excludes all such artifacts). This is how bulky data moves down the tree without transiting any orchestrator's context. `<scratch>` is a per-run scratch directory the main session creates once at start (e.g. via `mktemp -d`) and passes to every subagent it spawns; each subagent passes it on to its own children.

**The driver must have the `Agent` tool.** The per-group **driver** (§2A) spawns a review-orchestrator child, so it MUST be an agent type with the `Agent` tool (e.g. `general-purpose` or `claude`); not `Explore`/`Plan`. Nesting: main → driver → review orchestrator → external review CLIs (Bash processes; orchestrator needs no `Agent` tool).

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

0. **Parse scope** from the invocation (Scope forms above) into: a label filter, and/or an ordered list of **groups** (each group = ordered issue numbers). Plain lists become solo groups. No numbers and no label → groups empty for now (fill from the open list below). Persist the parsed groups in the §4 resume note.
1. List the in-scope open issues yourself (this is plumbing — numbers/titles/labels only, no bodies, so it stays in the main session). If groups or bare numbers were given, restrict to those numbers (still prefer `gh issue list` / `gh issue view` for open state; skip closed unless the operator pinned a closed id to inspect). If only a label was given, list open with that label. Else all open:
   `gh issue list --state open --limit 1000 --json number,title,labels --jq 'sort_by(.number)[]'`
   (`--limit 1000` covers any realistic backlog; a bare list silently drops the tail past the limit, so do not lower it.)
   If groups were empty (default all-open or label-only), after the list each open issue is a **solo group** in list order (triage order may reorder actionable work in step 4).
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
3. Build a task list from the triage table and the parsed **groups**. Keep only `do` / `resume-partial` in each group; drop empty groups. That ordered list is the fixed work-list (process once). Explicit groups: **preserve membership and group order** (reorder inside a group only for a triage prereq). Solo groups (default/label/plain list): order by dependency leverage (prereq first; else lowest number).
4. Disposition every triage row, then work the actionable **groups**. **Close rule:** on any close that touches `needs-info`, clear it: `gh issue edit <N> --remove-label needs-info 2>/dev/null`. Drop non-actionable issues from their groups as you disposition them:
   - `already-done` → close now with evidence ref from the table; no driver.
   - `skip-duplicate` → comment naming counterpart and close as duplicate; no driver.
   - `skip-blocked` / `needs-info-still-waiting` → leave OPEN; no comment needed.
   - `do` / `resume-partial` → stay in group for §2.

   Any follow-up issues this run files are deferred to a future invocation, not worked now.

---

## 2. Per-Group Loop (Worktree Lifecycle With Auto-Cleanup)

Work unit = **group** (one or more issues): one worktree, one driver, one end-of-group review, then merge/cleanup. Main creates the worktree, spawns the driver, acts on its one-line return (master-side plumbing only). For each actionable group **G** with issues `N1, N2, …` (solo: just `N`):

1. **Create a throwaway worktree off the main branch** (outside the main checkout; worktree root and main-branch name per Profile: identity). Use the first issue id in the group for path/branch names:
   ```
   git worktree add <worktree-root>/issue-N1 -b fix/issue-N1-<slug> <main-branch>
   ```
2. **Spawn the driver subagent** for group G (§2A), pointed at that worktree. A subagent can load a *named* skill on its own (that is how it will reach `/drive-external-agent` later), but it cannot dereference a "§2A"/"§2B" pointer into THIS file — so relay the actual text of those sections. Hand it: the driver brief (§2A's steps, plus §2B's text for it to pass to its own child), the safety rules (§3), the FULL project-profile block (§0's relay rule), the **ordered issue list** for the group, the worktree path, its scratch dir `<scratch>/issue-N1/` (group-scoped), each issue's triage row (verdict + reason + refs — `resume-partial` notes are starting points), any operator review-policy/cap overrides, and its return contract. The driver reads the issues and classifies group difficulty; do NOT pre-classify. Then wait for its one-line return. Do NOT read the diff, the files, the gate output, or the review findings — the driver owns all of that.
3. **Act on the driver's return** (a single status line). Only `clean` runs steps 4-7 in full (merge, post-merge steps, close, follow-ups); `blocked`/`failed`/`moot` each do their own disposition below and then skip straight to the next group (step 8):
   - `clean: <commit-hash>` → the driver committed and verified in its worktree branch (one hash for the group, covering all issues it fixed). Proceed to merge (step 4).
   - `blocked: <reason>` → nothing to merge. Handle per **Blocked mid-work** below (which includes cleanup), then continue to the next group.
   - `failed: <reason>` → the driver could not get gates green (or the review panel was unavailable); nothing to merge. Leave each still-open group issue OPEN with a status comment recording the cause, discard the worktree (the shared cleanup in step 4, `--force` since it is dirty; no merge), and continue to the next group. Add `needs-info` only if it genuinely needs a human (a plain panel outage does not — it resumes next run).
   - `moot: <evidence>` → an earlier fix this run already resolved every issue in the group (or the only issue); discard the worktree (step 4 cleanup, `--force`; no merge) and close each moot issue with a comment citing the evidence (§1.4's close rule applies). Continue to the next group.
   - anything else (no return, a malformed line, or a contract violation) → treat as `failed: driver error`: leave group issues OPEN with a status comment, discard the worktree (step 4 cleanup, `--force`; no merge), and continue. Do NOT improvise a merge from an unclear return.
4. **FF-merge to the main branch and AUTO-CLEAN** (from the main checkout), using the hash the driver returned. Confirm the main checkout is on the main branch first:
   ```
   git merge --ff-only fix/issue-N1-<slug>
   git worktree remove --force <worktree-root>/issue-N1
   git branch -d fix/issue-N1-<slug>
   ```
   (`--force`: untracked setup artifacts block removal even after a clean commit. Merge path uses `-d` — the FF-merge just satisfied its unmerged-branch check. Every discard path skips merge, removes with `--force`, and deletes with `-D`.) Main checkout must be clean before any main-side action; if dirty, never stash — post failure comments, discard this group (`--force` + `-D`), END THE RUN, report dirty-checkout.
5. **Run the profile's post-merge steps** (Profile: post-merge steps), if any, from the MAIN checkout (never the worktree), each as its own SEPARATE commit. Skip this step when the profile defines none.
6. **Close each fixed issue** in the group with a comment naming the driver's commit hash (commits are local/unpushed, so the `closes #N` keyword will not auto-fire): `gh issue close N --comment "Fixed in commit <hash> ...".` If it carried a `needs-info` label (a prior run's question since answered and worked), §1.4's close rule applies.

   **Blocked mid-work / needs operator input.** A `blocked: <reason>` return means a human blocker (decision, missing info, external dep, or review `abort-unsound`). Do NOT stall: comment on the blocking issue (and briefly note other open group issues) with blocker + progress so far; apply `needs-info` on the blocking issue (`gh label create needs-info --description "Blocked on operator or external input" 2>/dev/null; gh issue edit N --add-label needs-info`); leave OPEN; **discard the worktree** (step 4 cleanup, `--force`; no merge). Future triage (§1) resumes when answered.
7. **File follow-ups** for lasting work in the driver's follow-up bullets (deferred non-fix, out-of-scope, test-infra, non-serious review leftovers) as `known-open` issues (`gh label create known-open --description "Known open follow-up" 2>/dev/null`). A degraded-panel (`n/m`) bullet goes only to the §5 report, not a filed issue.
8. Mark the group complete, then the next group from the work-list (§1.4), **in order**. Never start a dependent group before its prereq group's merge when triage refs require it.

### 2A. The Driver Subagent (owns everything inside one group, including the commit)

One driver subagent per **group** does all work for that group's issues — reading, implementing, testing, verifying, one end-of-group review, applying review fixes, and committing — and surfaces only a one-line return. It DOES all its own code writes; it does NOT delegate implementation. Its brief (state this in its prompt, along with the full profile block):

1. **Set up the worktree** yourself per **Profile: worktree setup** (it is a fresh checkout; gitignored artifacts do NOT propagate — installs, generated files the build needs, and cache links must be recreated here).
2. **Read to understand** yourself — for **each** issue in the group in order: **the issue itself (body and all comments)**, then the profile's source-of-truth docs (**Profile: understanding** — exhaust them before treating a question as open), named files, and immediate callers. Each triage row's `resume-partial` note, if any, is where to pick up for that issue. Do NOT spawn a child for this; reading is your job.
3. **Classify the group** now that you've read it, three ways: **trivial** (only mechanical one-liners — no review); **simple** (needs review, cap 3 cycles); or **complex** (needs review, cap 5 cycles). Complex = any issue touches multiple modules, carries non-trivial logic, or is security-adjacent, or the combined diff is multi-module; otherwise simple if any non-trivial work remains. Judge the actual change, not the titles; honor any operator override passed to you. This classification is yours because only you have read the issues — the main session cannot. If, while reading, you find an earlier fix from this same run has already resolved or obsoleted **every** issue in the group, stop and return `moot: <evidence>` (step 9). If only a subset is moot, skip those and implement the rest (note moot ids for main to close).
4. **Implement** each remaining issue in group order in the same worktree yourself. Do NOT delegate implementation to a child. Match conventions (**Profile: code conventions**; NO em dashes regardless). Surgical changes only; fix the issues, do not refactor adjacent code.
5. **Cover each change with tests** yourself, that fail on regression, in the project's test layout (**Profile: tests**). Tests encode WHY, not just WHAT.
6. **Verify** with ALL gates green per **Profile: verify gates** (prefix EVERY build/compile/test command in this whole brief — including any Profile: worktree setup builds — with `ionice -c3 nice -n19` per §3). Warnings are blockers. Run anything the profile marks as needing an isolated stack against YOUR OWN stack (§3), never a live one. Prefer verify after the full group implementation (and after review fixes).
7. **Review loop** (non-trivial groups only; skip entirely for trivial). **One review for the whole group** after implementations are in the tree — not per issue. YOU own this loop; each pass is one review *cycle* and counts against your cap (simple=3 / complex=5, or the operator override):
   - Spawn ONE **review-orchestrator child** on your CURRENT **group** diff (any agent type with Bash; it drives external CLIs and spawns no subagents, so it does NOT need the `Agent` tool). Relay it the §2B section text verbatim plus the profile block (it cannot dereference a "§2B" pointer into this skill, though it CAN load the named `/drive-external-agent` skill itself), plus: the diff (write it to `<scratch>/issue-N1/diff-<cycle>.patch`), the cycle number, and a one-paragraph statement of what the group fixes are meant to accomplish (list issue numbers). Do NOT run reviewers yourself and do NOT read raw findings.
   - It returns `reviewed (n/m panel): <fix-list>`, `abort-unavailable: <reason>`, or `abort-unsound: <reason>`.
   - On `abort-unavailable` → do NOT commit; return `failed: review panel unavailable` (an outage, recoverable next run — not a human blocker). On `abort-unsound` → do NOT commit; return `blocked: <reason>`.
   - On ANY return that does not match those three exact forms (empty, garbled, or a crashed child) → do NOT read it as an empty fix-list (that would merge an unreviewed diff). Re-spawn the orchestrator once on the same diff; if it is still malformed, treat it as `abort-unavailable` and return `failed: review panel unavailable`.
   - If `n < m` (degraded panel), keep the "reviewed by n/m" note for your follow-up bullets (step 9) so it reaches the §5 report; the cycle still counts.
   - On an **empty** fix-list → the current diff is clean; exit the loop and commit.
   - On a **non-empty** fix-list → apply the fixes YOURSELF, re-verify (step 6), and if you have cycles left, loop again with a fresh review-orchestrator on the NOW-UPDATED diff. (Re-reviewing the changed artifact is the point — a fix you made must face reviewers before it can be the clean exit.)
   - **At the cap with a still-non-empty fix-list:** classify each remaining finding by the adversarial-review skill's serious/trivial definitions (serious = correctness, security, data loss, architectural flaw, broken requirement). If ANY serious finding remains unfixed — whether you'd fix it now or defer it — return `blocked: <reason>`; do NOT commit and do NOT return `clean`, because `clean` means no unresolved serious finding, period (a serious defect never rides out as a follow-up bullet). Only if EVERY remaining finding is trivial-class: apply what you can, **re-verify (step 6)** — these last edits are unreviewed, so gates must be green before you commit — and list each remaining one in your step-9 follow-up bullets (so main files it as a `known-open` issue where it stays visible), never only in the commit body, which main never reads.
8. **Commit** in your worktree branch yourself, as one logical commit for the group (message lists every fixed issue number). Stage files EXPLICITLY (any untracked setup artifacts — **Profile: commit** lists them — must stay OUT of the commit; stage only the source and test files you changed, never `git add -A`). Concise imperative message; body explaining the bugs, the fixes, and what review found; end with the project's `Co-Authored-By` trailer. Capture the resulting commit hash.
9. **Return** one line to the main session, honoring the return contract:
   - `clean: <commit-hash>` — committed and verified, and (if non-trivial) the review loop exited with no unresolved serious finding. Main closes every issue you fixed with this hash. Append a ≤10-bullet follow-up list INLINE (one line each; never a file path — main files these as issues and cannot read artifacts, so a path would strand them) if there are deferred/out-of-scope/test-infra items, any trivial-class review findings left unfixed at the cap, or a degraded-panel (`n/m`) note — anything the §5 report must surface; omit the list only if there is genuinely nothing. If findings somehow exceed 10, consolidate to the 10 that matter most. If some group issues were moot and skipped, name them in a follow-up bullet so main can close them as moot.
   - `blocked: <reason>` — a decision/dependency needs a human, or review returned `abort-unsound`, or a serious review finding could not be resolved within the cap. One line on what was completed and which issue blocked; details to an artifact path if needed. Nothing is committed.
   - `failed: <reason>` — could not get gates green after honest effort, or the review panel was unavailable (`abort-unavailable`). One line on the failing gate/cause; failing output to an artifact path, NOT inline. Nothing is committed.
   - `moot: <evidence>` — an earlier fix this run already resolved or obsoleted every issue in the group; no work needed. The main session closes them with the evidence. Nothing is committed.

Do NOT merge, remove the worktree, run post-merge steps, or MUTATE GitHub (comment / close / label / edit) — those are the main session's (§2). Reading GitHub is fine (you `gh issue view` group issues in step 2); it is only writes to GitHub and the master-side git actions that are not yours. You own the worktree end to end up to and including the commit.

### 2B. The Review-Orchestrator Child (one review pass over the current diff)

Spawned by the driver once per review cycle (diff path, cycle number, one-paragraph fix intent). Reviews the diff AS-IS with a full panel, adjudicates, returns one fix-list — does NOT loop or apply fixes (driver owns the fix→re-review loop, §2A step 7). Brief:

1. **Dispatch the panel.** Via `/drive-external-agent` **Mode B** (scoped-read): point each reviewer at the worktree, forbid writes, inline the diff as *focus*. Panel: **Profile: review panel** if set, else **codex**, **claude** (`opus` and `sonnet`), and **grok** at pinned defaults in `/drive-external-agent`. Do NOT use `grok-composer` (ignores reasoning effort; middle-truncates diffs over ~33 KB). Capture each output to `<scratch>/issue-N1/review-<cycle>-<model>.md` YOURSELF per drive-external-agent's per-CLI rules — never rely on a reviewer to write its own findings file.
2. **Gate every reviewer** per drive-external-agent (exit 0 AND complete non-empty result — failed/empty is NOT "no findings"). Retry once. Track how many returned valid.
3. **Adjudicate** real findings; one de-duplicated fix-list.
4. **Return** one line to the driver:
   - `reviewed (n/m panel): <fix-list>` — adjudicated findings (possibly EMPTY = clean); `n` of `m` valid. If `n < m`, partial panel still runs but is never a silent full sweep (driver notes it in follow-ups). Long lists → artifact path.
   - `abort-unavailable: <reason>` — zero valid reviewers after retry (infra outage).
   - `abort-unsound: <reason>` — reviewers agree the change is fundamentally wrong (human blocker).

---

## 3. Safety and Isolation

- **Never disrupt any running instance.** The operator or other agents/processes may have live test instances up — **Profile: isolation** names the container patterns, DB ports, and web ports to avoid. Do not use their DBs, do not stop/restart/`down` their containers, do not run tests against their ports.
- **Stand up your OWN isolated stack** for live/integration verification, on DIFFERENT ports (Profile: isolation gives the range). Tear down only what you started; confirm the operator's containers are still healthy at the end. NEVER `docker kill` / `killall`; only manage containers you started.
- **Build discipline:** prefix EVERY build/compile/test command with `ionice -c3 nice -n19` so it yields CPU and disk on the shared host — no exceptions. Apply the profile's host rules (**Profile: build discipline**) on top.
- **Permission gates:** never push, touch production, change credentials, or alter persistent data without explicit operator approval. Local build/test/dry-run is free; the consequential real-world action is gated. Pushing the merged commits is the OPERATOR'S call; leave the main branch ahead-of-origin and unpushed unless told otherwise. Never commit secrets.
- **Text style:** no em dashes in anything intended for humans (commits, comments, issue text).

Fold isolation, build-discipline, text-style, and the full profile into the driver's spawn prompt. Push/production/credentials remain the main session's.

---

## 4. Resume Across a Compact

At each checkpoint persist: skill name, **parsed groups** + overrides, profile identity (or full derived profile), scratch root, DONE issue→hash map, and IN-FLIGHT group state (issue list, worktree, driver running/returned, status line + hash, merge/clean/close done?). Store only status lines and artifact paths — never diffs, findings, or gate logs. Reference this skill file for rules; do not copy it into the note. On resume, re-verify hashes, merge state, open issues, and worktrees against git/`gh` before acting; status is verified, never trusted.

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

Does not wait on issues filed later; re-invoke (or `/loop`) for a new pass.
