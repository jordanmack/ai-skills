---
name: adversarial-review
description: |
  Run a plan or an implementation through a loop of adversarial reviews by
  other models, adjudicate their findings, fix the real ones, and repeat
  until a round raises nothing serious that survives your adjudication.
  TRIGGER when the
  user wants an adversarial / red-team review loop, asks to "grill until
  clean", names a roster of reviewer models (e.g. sonnet, opus, grok) to
  attack a plan or code, or wants iterative review-and-fix cycles that end
  on consensus.
---

# Adversarial Review

Drive a work artifact — a **plan** or an **implementation** — through repeated adversarial review by other models until a round produces no serious finding that survives your adjudication. You, the current host model, are **not** a reviewer. You are the **adjudicator**: you decide which findings are real, fix the ones worth fixing now, and run the loop.

The artifact is the plan, code, file, or diff in play. Don't ask the user to clarify the artifact's *content* — infer it. The one question worth asking about the artifact is whether the target is a plan or an implementation, and only when you genuinely can't tell. (Roster gaps are a separate, allowed question — see below.)

## Dispatching reviewers

Route each reviewer by whether the current harness can run it natively:

- **In-harness models → subagents.** A model the harness can spawn directly (e.g. in Claude Code, Claude models like Opus and Sonnet) should be launched as a subagent. Infer which models are native — don't assume a fixed mapping, since harnesses and lineups change.
- **External models → shell.** A model the harness can't spawn natively (e.g. Grok or Codex from inside Claude Code) is reached externally, typically by shelling out. Prefer this repo's cross-tool second-opinion skills for the exact command.

If a named reviewer cannot be reached — no subagent path and no working shell command — **hard-fail the whole loop** and tell the operator which reviewer was unreachable. "Reached" means a genuine review actually came back — this covers the whole dispatch-through-collect window, not just the initial launch. A reviewer that accepted the dispatch but then timed out, crashed, or returned an auth error, rate-limit notice, refusal, or empty output produced *no review* — treat it as unreachable and hard-fail, never as "found nothing serious." A partial roster breaks the unanimous-consensus exit criterion. Never fake a review by role-playing the missing model.

## The roster

Parse the reviewer names from the free-text invocation argument (e.g. `opus, grok` or `sonnet and grok`).

- If "Claude" is named generically, use a non-host Claude model; if more than one fits, or the host isn't a Claude model, ask which.
- **Never include the host model as a reviewer.** If the arg names the host, drop it and say so.
- If no models are named — or dropping the host leaves the roster empty — ask who the adversaries should be. Don't invent a default roster.

## The loop

1. **Dispatch.** Send the current artifact to every reviewer, independently, asking each for an adversarial review — find the flaws, the holes, the risks. Reviewers start cold, so make each brief self-contained: the artifact itself (inline it for external/shell reviewers, who can't resolve a workspace path; a pointer is fine only for subagents that share your workspace), the goal it must satisfy, and the **serious/trivial definitions from *Exit criteria*, quoted** so they label findings the way you'll adjudicate them. Ask each to say plainly if it found nothing serious. Apply a **suggested timeout of 30 minutes per reviewer agent**; adjust up or down based on the size and complexity of the work. If a reviewer repeatedly hits timeouts, consider scoping its work — for example, instructing it to return immediately after finding a fixed number of serious issues (e.g. 3–5). This is safe because the loop is iterative: any issues not surfaced in one round will be found in subsequent rounds.

   Keep reviewers **cold every round**: send only the updated artifact. Never pass your adjudication, rejections, or prior findings back — feeding them your verdicts manufactures false consensus, and their independence is the whole point. A finding you didn't fix by editing the artifact — rejected, already-settled, or skipped — will likely recur every round; that's expected and doesn't block exit, since exit is keyed on your adjudication, not reviewer silence. If the recurrence bothers you, the only sanctioned response is to make the artifact **self-defending**: write the rationale *into the work itself* (a code comment, a note in the plan) — content that stands on its own merits for any reader, so the artifact is simply better-documented. That is not the same as passing your verdict back: you are improving the artifact, not sending the reviewer a message about your adjudication. Never annotate the dispatch with "I rejected this" or address the reviewer's finding directly. The one exception to coldness: you may supply a *fact a reviewer structurally couldn't know* (e.g. "tests live elsewhere"); never your judgments.
2. **Collect** every reviewer's findings.
3. **Adjudicate** each finding (rules below). Don't apply findings blindly.
4. **Fix** the findings you classified as real and worth-doing-now.
5. **Check the exit test** (see *Exit criteria*) before looping: if this round was clean *and* fix-free, exit. If you applied any fix, you must re-dispatch to verify it.
6. **Repeat** from step 1 with the updated artifact, or **exit and report** per step 5.

## Adjudication

When reviewing your own work, resist defensiveness — weigh each finding on its merits as if someone else wrote it. For every finding, decide with reasoning:

1. **Real or false positive?** Verify it actually holds against this artifact; a reviewer without full context will raise things that don't apply. Reject false positives explicitly — don't drop them silently.
2. **Already settled?** Check whether this was decided against — **first in your own context** (the live conversation often holds the decision and its reasoning), then ADRs, comments, commits, the plan. Re-litigating a settled decision is not actionable. But *absence* of a record is not a rejection: a fresh plan has no ADRs or history, so treat "nothing on record" as not-yet-settled and judge on merits.
3. **Now, defer, or skip?** For findings that are real and not settled:
   - **Now** — fix it this round.
   - **Defer** — real, but out of scope for this pass.
   - **Skip** — real but not worth doing (cost outweighs value, edge case that won't occur).

   Defer and skip are **reported at the end only** — don't write them anywhere or fix them.

When reviewers disagree, adjudicate the disagreement — don't average it. One reviewer's objection can be valid even if the others missed it.

## Exit criteria

The loop ends when, in a single round, **no serious finding is left to fix now** — nothing you adjudicated as real, serious, and now-worthy. This is keyed on your adjudicated verdict, not the reviewers' raw labels: if every reviewer raised serious-looking findings but you correctly rejected them all, that is a clean round — exit. Serious findings you *deferred* or *skipped* don't block exit either (you've consciously chosen not to fix them now) — but they must appear in the final report. A round that returns nothing, or only trivial findings, is also clean.

Consensus requires a **fix-free round**: if you edited the artifact this round, you have not verified the result, so you must re-dispatch — a round in which you applied any fix is never the clean round.

- **Serious** = correctness, security, data loss, architectural flaws, broken requirements — anything that changes whether the work is right.
- **Trivial** = nits, style, wording, micro-optimizations, preference. These never block exit.

## Final report

On exit, give the user:

- **Outcome** — how many rounds ran; consensus or still-in-progress.
- **Fixed** — the real issues you addressed, briefly.
- **Deferred** — real issues left for later, with why.
- **Skipped** — real issues judged not worth doing, with why.
- **Rejected** — every *serious* finding you overruled (false positive or already-settled), not just the notable ones — especially any the reviewers raised unanimously. This is where your judgment is most overridable, so make it complete and easy to scan.

---

_Adapted from the adversarial-review pattern and reconciled with this repo's `CLAUDE.md`._
