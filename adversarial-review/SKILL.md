---
name: adversarial-review
description: |
  Run a plan or an implementation through a loop of adversarial reviews by
  other models, adjudicate their findings, fix the real ones, and repeat
  until a round raises nothing serious that survives your adjudication.
  TRIGGER when the user wants an adversarial / red-team review loop, asks to "grill until
  clean", names a roster of reviewer models (e.g. sonnet, opus, grok) to
  attack a plan or code, or wants iterative review-and-fix cycles that end
  on a clean round.
---

# Adversarial Review

Drive a work artifact — a **plan** or an **implementation** — through repeated adversarial review by other models until a round produces no serious finding that survives your adjudication. You, the current host model, are **not** a reviewer. You are the **adjudicator**: you decide which findings are real, fix the ones worth fixing now, maintain a **dismissal list** of already-dismissed issues, and run the loop.

The artifact is the plan, code, file, or diff in play. Don't ask the user to clarify the artifact's *content* — infer it. The one question worth asking about the artifact is whether the target is a plan or an implementation, and only when you genuinely can't tell. (Roster gaps are a separate, allowed question — see below.)

## Dispatching reviewers

Route each reviewer by whether the current harness can run it natively:

- **In-harness models → subagents.** A model the harness can spawn directly (e.g. in Claude Code, Claude models like Opus and Sonnet) should be launched as a subagent. Infer which models are native — don't assume a fixed mapping, since harnesses and lineups change.
- **External models → shell.** A model the harness can't spawn natively (e.g. Grok or Codex from inside Claude Code) is reached externally, typically by shelling out. Prefer this repo's cross-tool second-opinion skills for the exact command.

**Thinking level:** Dispatch every reviewer and refutation pass at the highest available thinking / reasoning-effort level by default. If the operator explicitly specified a thinking level for this review run, use that exact level for every reviewer unless a per-reviewer level was specified. This applies to in-harness subagents, including cold host-model reviewers, and external agents. For external reviewers, pass the resolved level through to **drive-external-agent**; never rely on harness or CLI defaults.

**Failure handling — one endpoint.** "Reached" means a genuine review actually came back, covering the whole dispatch-through-collect window, not just the launch. Every failure path ends the same way: bounded retries, then **pause** — report state per *Final report*, tell the operator what failed and why, and wait. On pause the operator chooses drop, swap, or abort; the run never resumes with less roster than the operator approves, and a cross-model review collapsing to a single model must be their explicit choice, never a silent consequence. A clean round presumes every reviewer on the active roster actually swept the artifact — never fake or role-play a missing reviewer's review.

| Reviewer output | Disposition |
|---|---|
| Affirmative "nothing serious" | Valid, complete review — counts toward a clean round |
| Findings | Normal — collect (step 2) |
| Empty, garbled, or ambiguous | Re-dispatch once; still bad → pause |
| Stalled (no new output for 20+ min) | Retry up to 2× (three attempts total; a retry may be output-capped per step 1); still failing → pause |
| Coherent refusal to review | Reword the brief once, adding the missing context or intent (never pressure past the objection); still refuses → pause |

## The roster

Parse the reviewer names from the free-text invocation argument (e.g. `opus, grok` or `sonnet and grok`).

- If "Claude" is named generically, use a non-host Claude model; if more than one fits, or the host isn't a Claude model, ask which.
- **The host model is a reviewer only when the operator named it explicitly.** By default the host doesn't review its own work — a model grading itself inline is not the independent angle this skill exists for. But if the operator *deliberately named the host model* in the roster (e.g. the host is Opus and the arg says `opus`), honor it: dispatch it as a **separate, cold subagent** (its own fresh context, the artifact inlined like any reviewer, at the resolved thinking level for this run), never as the inline host session adjudicating itself. Tell the operator you're running the host model as a cold-subagent reviewer on their say-so. A merely *generic* mention (bare "Claude" on an Opus host) is **not** an explicit naming — it resolves per the first bullet, to a non-host model. When in genuine doubt whether a name targets the host on purpose, ask.
- If no models are named — or the roster ends up empty — ask who the adversaries should be. Don't invent a default roster.

## The loop

1. **Dispatch.** Resolve the thinking level once for the run (see *Thinking level*), then send the current artifact to every reviewer, independently, asking each for a concise adversarial review: find the flaws, the holes, the risks. Keep findings direct and avoid unnecessary explanation. For any serious critique, if a concise direction, constraint, next question, or possible solution is apparent, include it; do not force a suggestion when none is clear. Reviewers start cold, so make each brief self-contained: the artifact itself (inline it for external/shell reviewers, who can't resolve a workspace path; a pointer is fine only for subagents that share your workspace), the goal it must satisfy, the resolved thinking level, and the **serious/trivial definitions and simplicity requirement from *Exit criteria*, quoted** so they label findings the way you'll adjudicate them. Ask each to say plainly if it found nothing serious, and to return findings in a light structure — location, claim, severity (per the quoted definitions), evidence — so consolidation and adjudication key off the same fields. **Don't cap runtime — check liveness.** Check each running reviewer at least every 30 minutes, but never stop one merely for running long: complex reviews on some models legitimately exceed an hour. Stop a reviewer only when it is truly stalled — no new output for 20+ minutes (if its output isn't observable, fall back to a generous wall-clock limit instead). A stalled reviewer follows the failure table; on retry you may output-cap it — instruct it to return after a fixed number of serious findings (e.g. 3–5).

   **Scoping is safe *mid-loop*** (later rounds catch what one round missed) — **never on the exit round:**
   - Only a **stop-after-N-findings cap** can ever count toward a clean round. **Narrowing what the reviewer looks at** (by area, or "just the changed parts") never can — it's a mid-loop accelerant only, since it never sweeps the whole artifact.
   - A round is clean only if every reviewer either ran un-scoped or **explicitly affirmed it completed a full sweep** — require each scoped reviewer to state which. A capped reviewer saying just "nothing serious," or one that hit its cap, certifies nothing: re-dispatch it un-scoped and let *that* result decide.
   - Completion claims are unverifiable self-reports: if exit rests on a single scoped reviewer's claim and you have any doubt, re-dispatch it un-scoped.

   **Choose each reviewer's access by where the artifact lives — don't default to sealed-inline.** Decide by artifact type:
   - **Self-contained artifact** (a plan, a quoted design doc, a config snippet, a diff that stands on its own) → inline it; the reviewer needs no more. For external reviewers this is **drive-external-agent Mode A (sealed)**.
   - **Repo-resident code** (an implementation review, or anything where "is this consistent with the rest of the codebase?" or "could this reuse an existing pattern?" is a live question) → **default to giving the reviewer read access to the repo** so it can navigate the surrounding code, not just the slice you pasted. For external reviewers this is **drive-external-agent Mode B (scoped-read)**: point it at the project, tell it not to write, and still inline the specific diff/file as the *focus* of the review. Subagents that share your workspace already have this access — give them a pointer plus the focus. Reserve sealed-inline for the self-contained case above; reach for it on repo code only when you deliberately want a context-free read, not as the default.

   Keep reviewers **cold every round**: send only the updated artifact plus the dismissal list (see *The dismissal list*). Never pass your adjudication, rejections, or prior findings back **as free-text commentary** — feeding them your verdicts conversationally manufactures false consensus, and their independence is the whole point. A finding you didn't fix by editing the artifact — rejected, already-settled, or skipped — will likely recur every round; that's expected and doesn't block exit, since exit is keyed on your adjudication, not reviewer silence. If the recurrence bothers you, the sanctioned responses are two: make the artifact **self-defending** (write the rationale *into the work itself* — a code comment, a note in the plan — content that stands on its own merits for any reader; note this is an artifact edit, so it re-dispatches like any fix), or list the specific *dismissed* finding (rejected or already-settled **only** — never a real Defer/Skip finding) on the **dismissal list** so reviewers don't re-spend a round rediscovering it. Never annotate the dispatch with loose "I rejected this" prose or argue back against a reviewer's finding. There is a second, narrow exception to coldness beyond the dismissal list: you may supply a *fact a reviewer structurally couldn't know* (e.g. "tests live elsewhere"); never your judgments.

2. **Collect** every reviewer's findings.
3. **Refute.** Consolidate all findings into one deduplicated list (if empty, skip this pass) and send it to every reviewer to refute — see *The refutation pass*. The verdicts are input to your adjudication, not a substitute for it.
4. **Adjudicate** each finding (rules below), informed by the refutation verdicts. Don't apply findings blindly — and don't drop a finding solely because reviewers refuted it; weigh their refutation on its merits the same way you weigh the original finding.
5. **Fix** the findings you classified as real and worth-doing-now — minimally: the smallest change that resolves the finding, never mechanism the finding didn't earn or code whose only purpose is to appease a reviewer. Then verify before dispatching reviewers: code → run the mechanical checks (tests, build); plan → re-read for anything the change knocked out of agreement (contradictions, stale references).
6. **Update the dismissal list** (see *The dismissal list*): re-validate existing entries against the now-current artifact and drop any that no longer hold, then append this round's new false-positive and already-settled dismissals. Mirror every addition and drop into the audit ledger (see *Adjudication*) as it happens — the final report's dismissal history is read from there, not from the live list.
7. **Close the round.** Confirm every finding from this round has exactly one recorded disposition — fixed, dismissal list, or audit ledger (defer/skip/trivial-recorded); anything unaccounted for gets adjudicated now.
8. **Check the exit test** (see *Exit criteria*): if this round was clean *and* free of serious fixes, **exit and report**. If you applied any serious fix, re-dispatch to verify it. Otherwise **repeat** from step 1 with the updated artifact and list. (Trivial fixes follow *Exit criteria*'s category test and never force a round.)

## The refutation pass

Between collecting findings (step 2) and adjudicating them (step 4), the roster cross-examines itself. The goal is to kill plausible-but-wrong findings *before* they cost you adjudication effort, and to harden the survivors with the roster's best counter-arguments already on record.

**Consolidate first.** Merge all reviewers' raw findings into a single list of *unique* findings — deduplicate near-identical reports (same defect described two ways collapses to one entry), and strip the attribution so no reviewer can tell which finding was its own. Number the entries; you'll key the returned verdicts to these numbers. Findings already on the **dismissal list** don't enter the refutation pass — they were dismissed in a prior round and the dismissal list already handles their suppression. A carve-out re-raise (a listed issue raised anew with a genuinely different argument) is a live finding and does enter.

**Dispatch the refutation.** Send the consolidated list to *every* reviewer in the roster — the same reviewers, kept just as cold as in step 1 (artifact + dismissal list + the consolidated list + step 1's quoted definitions and simplicity requirement; never your own leanings about which findings are real). Ask each, for every numbered finding, to argue the *strongest case that it is wrong* — false positive, already mitigated, misreads the artifact, too trivial to matter against the quoted serious/trivial definitions, or mechanism the quoted simplicity requirement rejects — and then state a verdict: **survives** or **refuted**, with reasoning. A reviewer refuting its own finding is expected and valuable, not a contradiction. Apply the same thinking-level, liveness, scoping, and unreachable/refusal rules as step 1: a reviewer that can't be reached for the refutation pass is unreachable for the round (retry, then pause per *Dispatching reviewers*) — don't silently skip its refutation.

**Then adjudicate (step 4), using the verdicts as evidence, not as the verdict.** The refutation pass informs your adjudication; it does not replace it. Specifically:

- A finding the roster *unanimously refuted* is a strong signal it's a false positive — but verify the refutation actually holds against the artifact before dismissing, exactly as you'd verify an original finding. A confidently-wrong refutation is as possible as a confidently-wrong finding.
- A finding that *survived* refutation is a hardened finding — the roster tried to kill it and couldn't — so it deserves real weight, but you may still reject it on grounds the reviewers missed (e.g. a fact they structurally couldn't know).
- When reviewers *split* on a finding (some refute, some say it survives), adjudicate the disagreement on its merits — don't count votes. The refutation arguments on both sides are exactly the material you need to decide.

A finding you dismiss because the roster refuted it is still a rejection you record — and, if appropriate, a dismissal-list entry with the refutation as its rationale.

## The dismissal list

The dismissal list is a running exclusion file the **adjudicator owns and writes** — it is your serialized adjudication, prepended to every reviewer's prompt to stop the loop re-spending rounds on findings you've already dismissed. It is the primary sanctioned exception to the cold rule (the others are the structurally-couldn't-know fact above and the consolidated findings list sent during the refutation pass). Keep both the dismissal-list file and the audit ledger outside any path reviewers can read (e.g. a session scratchpad, never the repo) — reviewers see dismissal-list *content* only because you inline it into their prompts.

**Why it exists:** without it, every dismissed finding recurs each round, burning reviewer attention and your re-adjudication effort on settled noise instead of new surface. The list growing across rounds is by design.

**What goes on it — only these, and only at issue granularity:**

- **False positives** you rejected (the finding doesn't hold against the artifact).
- **Already-settled** findings (decided against earlier, in your context / ADRs / commits / the plan).

**Never** put real-but-deferred or real-but-skipped findings on it — the list holds only non-issues, and suppressing a real issue would hide a live defect. They go in the audit ledger and final report only.

**Format every entry as a single specific issue plus its dismissal rationale — never an area, never a bare issue.** Two required parts: the specific claim, and *why* you dismissed it. The rationale is what a reviewer compares its own reasoning against to decide whether the carve-out applies (raise it only with a *different* argument); an entry without one becomes blanket suppression. An area-scoped entry silences neighboring issues that happen to live nearby; an issue-scoped entry suppresses only the exact claim you adjudicated.

- ❌ `auth handling — dismissed` (silences every future auth finding)
- ✅ `missing null-check on token at L42 — dismissed: validated upstream in middleware`

**Re-validate and drop each round (step 6).** An entry can go stale two ways: the **artifact** mutates (a finding that was a false positive in round 1 can become *real* in round 3 after you edit nearby code), or the **external state the rationale rests on** changes without any artifact edit (an ADR is added, a context decision reverses, a "settled" call is overturned). Either way, before re-dispatching, recheck each entry against the current artifact *and* its still-standing rationale, and **drop any whose rejection no longer holds** — that finding must be raisable again. (The external-state case is why re-validation is not a no-op on a fix-free round.) An append-only list silently carries a now-wrong "false positive" verdict straight to exit.

**When a reviewer uses the carve-out, update the entry's rationale.** If a reviewer re-raises a listed issue with a genuinely new argument (as the carve-out permits) and you adjudicate it *real*, drop the entry and put the finding back through normal adjudication — now/defer/skip, same as any real finding (it is not automatically a fix-now; it may be real-but-deferred or real-but-skipped). But if you reject it *again*, you must **rewrite the entry's rationale to defeat the new argument** before the next round — otherwise the reviewer's reasoning still won't "match" the stale rationale, it re-raises the same stronger argument every round, and the loop never converges. The rationale must always reflect your *current* best reason for dismissal, including rebuttals to every argument raised against it.

**Prompt framing.** Introduce the list to reviewers as: *"The following specific issues were already adjudicated and dismissed on the rationale shown — do not re-raise an issue if your reasoning matches its rationale. You MAY raise an issue on this list if you have a genuinely different argument that the stated rationale does not address, and say so explicitly. Otherwise spend your effort finding new issues."* This suppresses rote re-reports while leaving in scope both new problems in the same area and a re-raise of a listed issue that defeats the original rationale — the one channel by which a wrong dismissal can be independently rediscovered.

## Adjudication

When reviewing your own work, resist defensiveness — weigh each finding on its merits as if someone else wrote it. For every finding, decide with reasoning:

1. **Real or false positive?** Verify it actually holds against this artifact; a reviewer without full context will raise things that don't apply. Reject false positives explicitly — don't drop them silently.
2. **Already settled?** Check whether this was decided against — **first in your own context** (the live conversation often holds the decision and its reasoning), then ADRs, comments, commits, the plan. Re-litigating a settled decision is not actionable. But *absence* of a record is not a rejection: a fresh plan has no ADRs or history, so treat "nothing on record" as not-yet-settled and judge on merits.
3. **Serious or trivial?** Classify by *your own* judgment using the *Exit criteria* definitions — **not** the reviewer's label. Get this wrong and a real bug slips out as non-blocking.
4. **Now, defer, or skip?** For findings that are real and not settled:
   - **Now** — fix it this round.
   - **Defer** — real, but out of scope for this pass.
   - **Skip** — real but not worth doing (cost outweighs value, edge case that won't occur).

   Defer and skip findings must **not** be written into the artifact or the dismissal list, and must **not** be fixed — but you must **record them in the audit ledger — a separate file from the live dismissal list, never included in any reviewer prompt** — because they are *real* defects and losing them across a long loop or a context compaction hides live problems. Record each with its rationale when you first defer/skip it; they surface to the user in the final report and nowhere else.

When reviewers disagree, adjudicate the disagreement — don't average it. One reviewer's objection can be valid even if the others missed it. The reverse also holds: convergence is not extra evidence for adding mechanism — reviewers share the same bias toward complexity, so a mechanism-adding finding meets *Exit criteria*'s simplicity requirement or it is a false positive, however many reviewers raised it.

## Exit criteria

A round is **clean** when **no serious finding is left to fix now** — nothing you adjudicated as real, serious, and now-worthy. This is keyed on your adjudicated verdict, not the reviewers' raw labels: if every reviewer raised serious-looking findings but you correctly rejected them all, that round is clean. Serious findings you *deferred* or *skipped* don't break cleanliness either (you've consciously chosen not to fix them now) — but they must appear in the final report. A round in which every reviewer affirmatively reported nothing serious (or only trivia) after a complete review is also clean. (Empty/garbled output is no-review → see *Dispatching reviewers*.)

The loop ends on **one clean round**. The dismissal list stays attached on the exit round (no list-free final pass): a cold finale would re-flood you with exactly the dismissed not-issues the list exists to suppress. (The cost — a finding you adjudicated wrong stays suppressed to exit — is why exit-round rejections get extra care below.)

Exit requires a **serious-fix-free** clean round: if you applied any *serious* fix this round, you have not verified the result, so you must re-dispatch — a round with a serious fix is never the clean round. (Re-validating or pruning the dismissal list does not count as editing the artifact.)

**Trivial findings never cost a round and are never silently dropped — every valid one is fixed or recorded.** Mid-loop, just fix them; the next round verifies them for free. On a would-be-exit round, apply the category test (not a confidence test): fix now only if the change cannot alter what the artifact does or means (typos, comments, formatting, wording that doesn't change what gets built); anything touching runnable code or an instruction's meaning — however small, however sure you feel — gets recorded in the audit ledger instead, and appears in the final report.

**A re-opened entry blocks exit.** Step 6's re-validation can flip a dismissed entry back to *real* on the very round you were about to exit on. If it does, that finding has never faced a live reviewer since re-opening — so the round is **not** clean, regardless of whether you fix, defer, or skip the re-opened issue. Drop it from the dismissal list and re-dispatch at least once more so reviewers see the now-live artifact surface cold. Exit only on a round where re-validation re-opened nothing.

⚠️ **A dismissal minted on the exit round gets no backstop — adjudicate it with extra care.** It is never re-validated (step 6 appends new dismissals *after* re-validation runs), and the carve-out can't re-present it (there is no later cold round). Treat every rejection on a clean-looking round as the highest-stakes call in the loop — it is the one with no second look.

⚠️ **Re-open only on a genuine change — don't ping-pong.** Re-validation may re-open an entry only when the artifact *or* the external state its rationale rested on has **actually changed** since you last adjudicated it — a borderline entry re-opened on unchanged evidence oscillates forever. Once you re-dispatch a re-opened entry and *re-confirm* the dismissal, that dismissal is **sticky**: record the re-confirmation, and don't re-open it again unless the underlying state changes anew. **One exception:** a rationale you recognize as *demonstrably mistaken* (an actual error in the reasoning, not "I'm no longer sure") must be re-opened and corrected — a known-bad dismissal is never frozen by stickiness.

**Simplicity is a requirement, and complexity must earn its place.** A finding that adds mechanism — durability, validation, hard enforcement, abstraction — is real only if the failure it prevents is both likely and costly in actual operation; "rare and tolerable" means the simple version stands. Prefer advising the operator over restricting them, and flag unjustified complexity as a defect in its own right.

- **Serious** = correctness, security, data loss, architectural flaws, unjustified complexity, broken requirements — anything that changes whether the work is right.
- **Trivial** = nits, style, wording, micro-optimizations, preference. These never block exit.

## Final report

On every stop — clean exit or pause — give the user (mark **Outcome** accordingly):

- **Outcome** — how many rounds ran; clean-round reached or still-in-progress.
- **Roster** — the reviewers that actually reviewed, the thinking level used for each reviewer (default highest or operator override), and any roster changes during the run: refusals, operator-consented drops, substitutions, and any reviewer that ran scoped. If the roster was repaired, say so plainly — a "clean exit" means nothing without knowing who did and didn't review.
- **Fixed** — the real issues you addressed, briefly.
- **Deferred** — real issues left for later (including recorded trivial findings), with why.
- **Skipped** — real issues judged not worth doing, with why.
- **Rejected** — every *serious* finding you overruled (false positive or already-settled), not just the notable ones — especially any the reviewers raised unanimously. This is where your judgment is most overridable, so make it complete and easy to scan. Note for each whether the refutation pass played a part — rejecting a finding the roster itself refuted is a different call than overruling the roster's survival verdict, and the user should be able to tell them apart.
- **Dismissal list** — every entry that was *ever* on the list during the run, including trivial ones and entries later dropped (mark those with when and why) — anything left off the report is suppression with no audit trail. Re-validation prunes the *live* list each round, so source this from the append-only audit ledger (the same file that holds Defer/Skip findings), appending entries as you add them. Give each entry with its dismissal rationale so the user sees exactly what was held back and why.
