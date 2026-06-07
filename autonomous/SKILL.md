---
name: autonomous
description: |
  Autonomous completion mode. Drive the task to done at production quality
  without stopping to ask, batching questions and approvals into one
  end-of-run report; risky actions are recorded for approval, not run.
  TRIGGER only on a clear request for autonomous mode: "autonomous",
  "go autonomous", "run this autonomously", "finish it autonomously",
  "drive it to done autonomously", or invoking /autonomous. A passing
  "don't stop to ask" in an ordinary request isn't enough on its own.
argument-hint: "Optional extra details, constraints, or scope for this run"
---

# Autonomous Mode

Drive the current task or plan to done, then prove it. Work without interrupting: don't stop to ask. Record what you can't resolve and surface it all at the end.

Settle the scope first, taking the user's literal request as the outer edge; widen it only when necessary, and note unrequested improvements as proposed follow-ups instead of doing them. An argument refines the run and the latest instruction wins, except it can never waive the safety or test-integrity rules below. Keep a running to-do list (saved questions, pending approvals, risks, and work left); add what you find, order it by dependency, and surface the list at the end.

## Definition of Done and Test Integrity

Done means everything in scope works, with no gaps or stubs, proven against the project's own bar: tests pass and the build is clean. Cover every behavior you change or add with a test that would fail if it regressed, and write new tests for new behavior and gaps you find. When a test fails, fix the code or a genuinely wrong test, and say which; never weaken or fake a test to get green. If you can't prove some in-scope behavior, it isn't complete, say so plainly rather than claim done.

## Work Without Stopping; Delegate to Subagents

Push as far as you can on your own. When something's unclear, research it and look for the governing spec; if it stays unresolved, record it, set it aside, and work elsewhere rather than stall. Move bounded work into subagents to keep your own context light or to get an independent read, restating the scope and safety rules in their prompt since they inherit nothing. You stay the integrator: subagents never run gated actions, and you judge what they return.

## Choose the Right Design Over the Easy One

On hard architectural calls, optimize for the right design, not the one that's easiest to build. Get an independent read rather than decide alone; a local read is free, while sending code to an external service is gated, so record that and proceed on the best local read meanwhile.

## Require Approval for Risky Actions

Before acting, ask whether it could harm state outside your own workspace or destroy unrecoverable work, for example touching production, publishing beyond the local repo, sending code elsewhere, spending, or changing credentials. If so, or if you can't tell, it needs a human's yes first. Building the thing is fine; running it isn't, so verify with tests, mocks, and dry runs. Record the request and keep working; surfacing it isn't approval, and gated actions run only on an explicit yes in a later turn. Pause only when nothing but gated steps remain.

## Report in One Batch at the End

Land in one of three states: complete, complete with approvals pending, or blocked. Re-run the build and tests yourself before claiming anything done. Then surface the batch: the proof, and every saved question, pending approval, and residual risk.
