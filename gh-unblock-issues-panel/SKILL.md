---
name: gh-unblock-issues-panel
description: |
  Wraps /gh-unblock-issues with a review panel that runs first: reviewer
  models debate each open, non-deferred, non-approved issue to decide if it
  is real, if its fix fits, and if it is over-engineered. Verdicts are
  survive, change, close, or flagged. The operator confirms them, then the
  normal unblock pass runs. TRIGGER when the operator wants issues validated
  or panel-reviewed before unblocking: says "panel the issues", "unblock with
  a panel", "validate the backlog", invokes /gh-unblock-issues-panel, or
  names this skill.
argument-hint: "Required: reviewer roster (e.g. opus, codex, grok). Optional: thinking level, issue/label scope"
---

# /gh-unblock-issues-panel

Run a review panel on the backlog, apply the verdicts the operator confirms, then run **`gh-unblock-issues`** (load it by name) on the rest. That skill's rules apply unless this file says otherwise.

## 1. Setup

- **Roster is required.** Parse reviewer models from the args. If none, stop and ask for them. Resolve names and the host-model rule per **`adversarial-review`** (The roster). Thinking level: the operator's level, else `high`.
- **Scope:** open issues that are not `approved`, `deferred`, or `in-progress` (same skips as the base), narrowed by any label or number args.

## 2. Panel

Read `driver.md` (next to this file). For each in-scope issue, start one background driver subagent. Its prompt is the full text of `driver.md` plus the issue number, repo path, roster, and thinking level.

At most **5 drivers** run at the same time. When one finishes, start the next until all issues are done. There is no cost limit. A driver that fails or returns no verdict gets one retry, then becomes `flagged` with the failure as its reason.

Drivers only read. All GitHub writes happen in §3.

## 3. Confirm and apply

Show one table: `#`, `verdict`, `reason` (one line), and for `change` the revised scope. Ask in plain text: "Apply these verdicts?" (all / subset / none). Then for each confirmed issue, post comments per base §3A. Run each write only if the one before it succeeded. A failure is **Handoff incomplete**.

- **survive**: comment `Panel verdict: survive. <reason>`
- **change**: comment `Panel verdict: change. Revised scope: <scope>`. Do not edit the body.
- **close**: comment `Panel verdict: close. <evidence>`, then `gh issue close <N> --reason "not planned"`. This overrides the base skill's no-close rule, and only for confirmed rows.
- **flagged**: comment `Panel verdict: no consensus. <each side in one line>`, and add `needs-info`.

Rows that are not confirmed get no writes.

## 4. Unblock

Run `gh-unblock-issues` with the operator's scope args, not the panel scope, so already-`approved` issues are still classified and batched. Carry the confirmed verdicts in:

- A confirmed revised scope replaces the original proposal everywhere in the pass.
- Add a `panel` column (survive / change) to the §2 authorize table.
- Classify each confirmed `flagged` issue as `ask`. Its root question is the panel split (or the failure reason), and its brief gives both sides.

In the final report, list unconfirmed verdicts under **Needs attention**.
