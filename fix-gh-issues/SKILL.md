---
name: fix-gh-issues
description: |
  Restart the autonomous RedClaw GitHub-issue processing loop: triage open
  issues (reading each issue's COMMENTS for status clues and blockers), then
  fix them one at a time in a throwaway git WORKTREE per issue, verify, FF-merge
  to master, auto-clean the worktree and branch, and close the issue with a
  commit reference. Continuously picks up newly filed issues.
  TRIGGER when the operator wants to resume or start fixing open GitHub issues
  in this repo, says "fix issues" / "work the issues" / "continue fixing
  issues" / "process the issue backlog", invokes /fix-gh-issues, or names this loop.
argument-hint: "Optional: a specific issue number, a label filter, or 'continue'"
---

# /fix-gh-issues: Autonomous RedClaw GitHub-Issue Processing Loop

Drive the open GitHub-issue backlog to done, one issue at a time, each in its own disposable git worktree that is cleaned up automatically. This skill encodes the exact workflow, safety rules, and verification discipline this project uses. It is meant to run under Autonomous Mode (orchestrate via subagents, batch questions and approvals to the end, never stall the run on one blocked thread).

Operate as an orchestrator: delegate each self-contained unit (implementation, review, live verification, stack standup) to a subagent; you adjudicate and hold the final call. Work inline only when delegating costs more than it saves.

**Decide, don't pause, on anything reversible.** Only the gated actions in §3 (push, production, credentials, persistent data) are worth a pause. Processing order, scoping, triviality calls — your call: decide, note the one-line reason, keep moving. Batch genuinely-open questions into the end-of-cycle report (§5), never mid-loop.

---

## 0. One-Time Confirmation (Only if Unset)

Before the first iteration, confirm these run parameters with the operator unless they are already given or obvious from context. Do not re-ask once set; persist them in memory for the run.

- **Continuation cadence:** drain the backlog, then self-pace wake-ups (`ScheduleWakeup`) to re-check for new issues, spacing the gaps out when idle.
- **Review policy:** run the `/adversarial-review` loop on NON-TRIVIAL issues; skip it for mechanical one-liners. This is the default; the operator may widen or narrow it.
- **Delivery:** branch-per-issue in a worktree, FF-merge to master, close as you go.

If a parameter is genuinely open, ask it ONCE up front (single question), then proceed.

---

## 1. Triage Scan (the First Thing You Do, Every Cycle)

1. List open issues (number order is just a stable starting view, not the work order):
   `gh issue list --state open --limit 100 --json number,title,labels --jq 'sort_by(.number)[]'`
2. **Read each candidate issue's BODY and its COMMENTS** before deciding to work it. Re-read ALL candidates every cycle, explicitly including ones you previously skipped and ones carrying a `needs-info` label:
   `gh issue view <N> --json title,body,comments,labels`
   The comments are not decoration; they carry the real status:
   - A comment may say the issue is **already fixed / merged / closed elsewhere** (close it with the evidence instead of reimplementing).
   - A comment may mark it **blocked** by another issue, an operator decision, a backend gap, or an unshipped dependency → **skip it**, record why, and move to the next number.
   - A `needs-info` label means a prior cycle left it **awaiting the operator or someone else**. Check whether the answer has landed: if the operator answered in a comment or the blocking dependency merged, remove the label (`gh issue edit <N> --remove-label needs-info`) and disposition it normally (the answer may mean implement, close, deduplicate, or defer, not always implement); otherwise skip it again.
   - A comment may **re-scope, supersede, or duplicate** it (e.g. "dup of #14") → handle the pair together or close as duplicate.
   - A comment (often from a prior run) may record **partial progress** or a chosen approach → resume from there, do not restart.
   - A second-opinion comment ("Codex + Grok converged: file/skip") signals the agreed disposition.
3. Reconcile a task list (`TaskCreate`/`TaskUpdate`) with the live backlog each cycle. The operator files new issues continuously, so the backlog GROWS mid-run; capture new numbers as tasks.
4. Pick the next actionable issue in the order that makes logical sense, not strictly by number. If an issue depends on another (a comment names a blocker, a prerequisite, or "needs #X first"), do the prerequisite first. Absent any dependency signal, lowest-number-first is a fine default. Skip blocked/duplicate/already-done ones (dispositioning each per the comment evidence). Your OWN follow-up issues count as backlog too.

   **Ordering is your call, never a question.** Resolve dependencies from the bodies and comments and decide. On ambiguity, pick what unblocks the most work (lowest number on a tie) and proceed; a suboptimal order self-corrects next cycle, a stall costs the run.

If an argument names a specific issue or label, scope the scan to it.

---

## 2. Per-Issue Loop (Worktree Lifecycle With Auto-Cleanup)

For each actionable issue **N**:

1. **Create a throwaway worktree off master** (outside the main checkout):
   ```
   git worktree add /home/username/redclaw-worktrees/issue-N -b fix/issue-N-<slug> master
   ```
2. **Set up the worktree** (it is a fresh checkout; gitignored artifacts do NOT propagate):
   - Web UI work: `cd <worktree>/redclaw-web-ui && bun install` (no `node_modules` otherwise).
   - Rust work: the test build needs `redclaw-web-ui/dist/` to EXIST (the `redclaw-web` `rust_embed` derive fails without it). Either `bun install && bun run build` in the worktree's web UI, or drop a placeholder `<worktree>/redclaw-web-ui/dist/index.html` (gitignored). For integration tests that hit the DB, also point the fastembed cache at the shared host cache (symlink) if the path is needed.
3. **Read before you write** (ARCHITECTURE.md §-pointers, the issue's named files, immediate callers). `docs/ARCHITECTURE.md` is the source of truth; exhaust it before treating a question as open.
4. **Implement** inside the worktree. Match conventions (tabs, terse comments, NO em dashes). Surgical changes only; fix the issue, do not refactor adjacent code. Extract pure helpers for anything with logic so it is unit-testable without a React renderer.
5. **Cover the change with tests** that fail on regression (web: `bun test` in `tests/`, outside `src/`; Rust: an integration test under `tests/`, run at `--test-threads 2`). Tests encode WHY, not just WHAT.
6. **Verify in the worktree** with ALL gates green:
   - Web: `bun run lint` (0), `bunx tsc -b` (0), `bun run test` (pass), `bun run build` (0).
   - Rust: `CARGO_BUILD_JOBS=4 cargo build -j 4 -p <crate>` (zero warnings; warnings are blockers), then run the touched tests against an ISOLATED stack (see §3).
7. **Adversarial review** (non-trivial only): run the `/adversarial-review` loop with Codex, Grok build, and Grok composer in parallel on the diff. Adjudicate findings yourself, fix the real ones, re-verify, repeat until a clean round. Verify their claims directly; they are inputs, not verdicts.
8. **Commit in the worktree** as one logical commit, concise imperative message, body explaining the bug, the fix, and what review found. Stage files EXPLICITLY (a pre-existing dirty `.gitignore` or a `.fastembed_cache` symlink must stay out of the commit). End the message with the project's `Co-Authored-By` trailer.
9. **FF-merge to master and AUTO-CLEAN** (from the main checkout):
   ```
   git merge --ff-only fix/issue-N-<slug>
   git worktree remove /home/username/redclaw-worktrees/issue-N
   git branch -d fix/issue-N-<slug>
   ```
   If the working tree of the main checkout has an unstaged pre-existing change, `git stash -u` around the checkout/merge so it survives.
10. **Update the knowledge graph** from the MAIN checkout (never the worktree, which would write a stray duplicate): `graphify update .`, then a SEPARATE commit `Update knowledge graph for the issue #N fix`.
11. **Update the issue, and close it only if the work is actually complete.** If the fix is done and verified, close with a comment naming the LOCAL commit hash (commits are local/unpushed, so the `closes #N` keyword will not auto-fire): `gh issue close N --comment "Fixed in commit <hash> ...".` If the work is partial, blocked, or unverified, leave the issue OPEN and post a status comment recording what was done, what remains, and any blocker, instead of closing it.

    **Blocked mid-work / needs operator input.** "Mid-work" means you already selected the issue as actionable and began investigation or implementation, then hit a blocker that needs the operator or another person (a decision you cannot make, missing information, an external dependency). Do NOT stall the run: post a comment on the issue stating the specific question or blocker plus what you completed so far, apply the `needs-info` label (creating it first if absent: `gh label create needs-info --description "Blocked on operator or external input" 2>/dev/null; gh issue edit N --add-label needs-info`), leave the issue OPEN, and move to the next actionable issue. The next cycle (§1) re-checks `needs-info` issues and resumes any the operator has answered. (This is distinct from a clearly-blocked issue caught at triage, which you simply skip per §1 without a comment.)
12. **File follow-ups** for any deferred non-fix, out-of-scope discovery, or test-infra gap as a `known-open` GitHub issue (do not let it vanish into a commit message).
13. Mark the task complete, then return to §1 for the next issue.

---

## 3. Safety and Isolation (NON-NEGOTIABLE)

- **Never disrupt the operator's running instance.** The operator may have a live test instance up (containers `redclaw-test-jm-*`, default DB ports Postgres `55550` / Qdrant gRPC `55551`, a web port). Do not use its DB, do not stop/restart/`down` its containers, do not run tests against its ports.
- **Stand up your OWN isolated stack** for live/integration verification, on DIFFERENT ports (e.g. `55560`/`55561`). Tear down only what you started; confirm the operator's containers are still healthy at the end. NEVER `docker kill` / `killall`; only manage containers you started.
- **Build discipline:** always `-j 4` (`CARGO_BUILD_JOBS=4 cargo ... -j 4`); the full suite at 2 threads. A full-suite SIGTERM (signal 15) is contention, not a regression; re-run that test in isolation first. One `cargo` invocation at a time.
- **Permission gates:** never push, touch production, change credentials, or alter persistent data without explicit operator approval. Local build/test/dry-run is free; the consequential real-world action is gated. Pushing the merged commits is the OPERATOR'S call; leave master ahead-of-origin and unpushed unless told otherwise. Never commit secrets.
- **Text style:** no em dashes in anything intended for humans (commits, comments, issue text).

---

## 4. Resume Across a Compact

Keep a durable resume note in memory (the project memory file for this run): the workflow, the safety rules, every DONE issue with its commit hash, and the IN-FLIGHT issue's exact state (which worktree, what is committed vs. uncommitted, what is left). Update it at each checkpoint so the loop survives a context compact or a fresh session. On resume, re-verify all volatile claims (commit hashes, merge state, open-issue list, worktree existence) against git and `gh` before acting; status is verified, never trusted.

---

## 5. End-of-Cycle / Idle

When the actionable backlog is drained:
- Surface ONE batched report: the issues fixed (with commit hashes), any skipped/blocked ones and why, the `needs-info` issues with the specific open question each is awaiting (these are the ones genuinely blocked on a human), pending approvals (e.g. the unpushed master), residual risks, and the follow-ups filed.
- Schedule a self-paced wake-up (`ScheduleWakeup`, long interval when idle) to re-scan for new issues, unless told to stop. Re-enter at §1 on wake.
