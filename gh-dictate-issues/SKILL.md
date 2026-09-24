---
name: gh-dictate-issues
description: |
  Generic issue intake for any GitHub repo: the operator dictates one or
  more problems; the agent researches all of them (code, docs, web, other
  software), groups them into GitHub issues, reviews each group (questions
  one at a time, pushback, optional second-opinion panel), then files each
  under the repo's issue policy. Repeat per dictation. Does not implement.
  Project facts come from a PROJECT PROFILE (wrapper-supplied or resolved by
  searching the repo); when no issue policy exists it offers a baseline doc
  once. TRIGGER when the operator wants to dictate, capture, or file issues
  in a repo with NO project-specific wrapper for this workflow: says
  "dictate issues", "file this issue", "I am seeing this bug", or invokes
  /gh-dictate-issues. A wrapper skill (its description says it wraps
  /gh-dictate-issues) takes precedence in its repo. Do not trigger for
  /gh-fix-issues (implement) or /gh-unblock-issues (backlog authorize).
argument-hint: "Optional: first dictated issue; otherwise wait for dictation"
---

# /gh-dictate-issues: Issue Dictation (generic core)

Live intake in a GitHub repo. The operator dictates one or more problems in a turn; you research all of them, group them into issues, review, then file. You do **not** implement. Repeat until the operator stops.

This is interactive. Do not run under Autonomous Mode.

Workflow here; project facts in the PROJECT PROFILE (§0). A wrapper skill supplies the profile. Without one, resolve it yourself (§0) before the first dictation.

## 0. The Project Profile

Four fields. Each is **found or defaulted, never guessed**. A wrapper may set any subset; resolve the rest by the search below. A found value is one that exists in the repo. A default applies when the search finds nothing. Do not infer a value from hints.

| Field | Search (in order) | Default when nothing is found |
|---|---|---|
| **Profile: issue policy** | `docs/github-issues.md`; a path named by `CLAUDE.md` / `AGENTS.md` / `CONTRIBUTING.md`; `.github/CONTRIBUTING.md`; `.github/ISSUE_TEMPLATE/`; `gh label list` | No policy doc. Labels are the repo's existing labels only. Gate per the approval-gate rule below. |
| **Profile: understanding** | `docs/ARCHITECTURE.md`; docs named by `CLAUDE.md` / `AGENTS.md`; `README*`; `docs/` | None. Rely on code reading; treat design questions as open. |
| **Profile: isolation** | `compose*.y*ml` / `docker-compose*.y*ml`; `Dockerfile*`; `.env*` ports; running containers whose name contains the repo folder name | None known. Still treat any running service that looks like this project as live: do not touch it. |
| **Profile: review panel** | Wrapper only | The `gh-fix-issues` default panel: **claude** (Claude Opus), **codex** (GPT Astra), **grok** (Grok), each at effort `high`, via `/drive-external-agent` Mode B, scoped read (no writes) |

**Operator permission.** Run `gh repo view --json viewerPermission` once. Record `write+` when the result is `WRITE`, `MAINTAIN`, or `ADMIN`; otherwise `read-only`. Without `write+`, this session cannot authorize work: never apply `approved`; file on the parking path (without a gate: type labels plus a parked note in the body) and say why.

**Approval gate.** Present only when one of these holds: the issue policy doc defines a Ready predicate with an approval label, or `gh label list` shows an `approved` label. Otherwise the gate is absent. Never assume a gate from label names that merely look similar. With a gate but no policy doc, use only labels that exist in `gh label list`; skip any parking label the repo lacks.

**Print the resolved profile once** before intake: the four fields, each with its value and source (`found: <path>` or `default`), plus `gate: present` or `gate: absent` and the operator permission. The operator may correct any line. Then continue with the same turn (a dictation may already be present).

**Baseline offer (once per session).** If the gate is absent AND no policy doc was found, ask exactly one question before intake:

> No issue standards found. Create a baseline `docs/github-issues.md` with labels and a Ready rule? (yes / no)

- **yes:** `mkdir -p docs` and copy `templates/github-issues.md` (in this skill folder) to `docs/github-issues.md`; create each of its six workflow labels (`approved`, `needs-info`, `known-open`, `deferred`, `in-progress`, `auto-fix`) with `gh label create` only when the name is absent from `gh label list`, and report any name that already existed (its meaning may differ; never overwrite); commit only that file with message `Add GitHub issue workflow contract`; set Profile: issue policy to the new doc and `gate: present`. → `templates/github-issues.md`
- **no**, or the operator answers with a dictation instead: treat as no. File with type labels only. Do not ask again this session.

Never create the doc or labels without a yes. The offer never blocks a dictation already given: resolve, offer, and if the reply is a dictation, proceed.

**When a policy doc exists, read it at run start.** Do not invent labels. When this skill and that doc diverge, **the doc wins**. When the doc names labels but no steps, mutate with `gh issue edit N --add-label <a> --remove-label <b>`; approve means add `approved` and remove every parking label the doc defines.

## Loop (one dictation)

The first operator message after invoke may already be a dictation. Otherwise wait.

1. **Research all of them** before grouping or filing any. Isolate each dictated problem and say whether it exists. Read the checkout (named files, callers, tests). Search open and closed GitHub issues for duplicates. Use the web and other products when that helps (how similar software treats the same case). Code-read first. Respect **Profile: isolation**: live repro only on an instance the operator names, or a throwaway you stand up and tear down.

2. **Group, then acknowledge.** After research, group the problems into GitHub issues yourself: one issue when items share a root cause or the same fix surface; separate issues when they are independent. Do not ask the operator to group. State each proposed issue in plain language, with the evidence (files, behavior, existing issue number) and which dictated items it covers. If you cannot confirm a problem exists, say so; do not file as authorized work on a guess. The operator may overrule a grouping.

3. **Review. Do not rubber-stamp.** Ask only what you still need to scope a fix or design a solution. Push back when the diagnosis is wrong, the behavior is by design, a simpler path exists, or the work should not be an issue. Interject your own view. Look up what you can (exhaust **Profile: understanding** first); never spend a question on something the repo or thread already answers. Questions are **one at a time**: short brief, then the fork, then wait (`Question k of N` when you have a list).

   **Unanswered questions.** A question closes only when a reply addresses it; never infer an answer from new dictation. Until then it stays open: repeat it at the end of every later response. `Question k of N` counts across all dictations. An open question holds back only its own issue; file the others as they settle.

   **Second opinions.** For complicated or high-stakes issues, recommend a panel before filing. On operator yes, dispatch **Profile: review panel** in parallel, one independent read-only pass each, fresh context, via `/drive-external-agent` Mode B, scoped read (resolve model ids and flags in that skill; do not pin versions here). Each reviewer may read the repo and must not write. Give each the proposed issue, the evidence, and the open question; ask for a plain verdict and reasons. Synthesize; do not paste verbatim. Agreement across families is strong signal; surface disagreement. Then continue the review or file.

4. **File** each settled group (no open questions for that issue, or the operator overrules and tells you to file). Dispositions:
   - **Duplicate of an open issue:** do not open a second. Say so. With a gate present, if this review authorizes that issue and it lacks the approval label, apply the policy doc's approve path (add `approved`, drop parking labels).
   - **Already fixed / by design / not an issue:** do not file. If they still want a tracker after the pushback, file what they asked.
   - **Not now:** with a gate present, use the policy doc's parking path (`known-open`; add `deferred` only for a conscious "not now"). Without a gate, file with type labels and say in the body that it is parked.
   - **Work it:** create the issue. With a gate present, completing this loop in the operator's session, posted via their write+ `gh` account, **is** the trusted approval signal: file with **`approved`** and never also a parking label. Without a gate, file with type labels only; there is no approval step.

   Common to every filing: prefer one type label when obvious (`bug` / `enhancement` / `documentation`, or the repo's equivalents); omit it when no such label exists. Title describes the work; no status parentheticals. Body via a private `mktemp` file (`gh issue create --body-file`; then delete the temp). Body fields: problem, acceptance criteria, dependencies (`blocked by #N`), estimated scope (`small` or `regular` plus a one-line reason; hint only), evidence, and, when you still disagree after an overrule, one line of dissent. No em dashes.

5. Print every filed issue number and URL. **Wait for the next dictation.** Do not start a fix workflow.

## Hard rules

- Many problems in one dictation is normal. Research all of them, then group, then file.
- Do not implement, branch, or open a worktree.
- Do not apply an approval label before step 4, and never without a gate and `write+` permission. Do not invent labels.
- Profile values are found or defaulted, never guessed. State the resolved profile before intake.
- Prefix any build/test you run to confirm a repro with `ionice -c3 nice -n19`.
- Stop if the checkout is not a git repo with a GitHub remote (`gh repo view` fails).
