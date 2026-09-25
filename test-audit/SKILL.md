---
name: test-audit
description: |
  Value bar for tests in any repo or stack: an authoring gate for every new or
  changed test, focused audits of low-value, implementation-coupled, or
  duplicate tests and the test-only production seams they keep alive, and
  whole-subsystem test-pruning campaigns.
  TRIGGER when: (1) writing or changing a test, (2) reviewing tests or a diff
  that adds or changes tests, (3) the user wants to audit, sweep, prune, or
  clean up tests, or find low-value, duplicate, or implementation-coupled
  tests, (4) the user wants a test-pruning campaign for one plugin, package,
  or core area, or invokes /test-audit.
argument-hint: "Optional: audit scope, or campaign plus one subsystem path"
---

# Test Audit

Three modes, one value bar. Authoring mode gates every new or changed test at
write time. Audit mode runs focused sweeps of tests that re-assert source,
duplicate stronger proof, couple behavior to implementation, or keep test-only
production seams alive. Continue broad audits as separate coherent follow-up
PRs; optimize for confidence, not deletion count. Campaign mode prunes one
whole subsystem's test surface (every test file a plugin, package, or core
area owns); before starting one, read [CAMPAIGN.md](CAMPAIGN.md).

## Project facts

Audit and campaign modes need these facts; authoring mode needs only the
focused test command. A wrapper skill may supply them. Otherwise resolve them
from the repo's agent instructions (root and scoped `AGENTS.md` or
`CLAUDE.md`), contributing and testing docs, and CI config. When a fact is
missing, say so and ask; never invent a command or gate.

- **Focused test command**: runs one test file or filter.
- **Changed gate**: the checks repo policy requires before landing, plus any
  changed-path classifier that selects them.
- **Formatter**: the targeted format command.
- **CI routing**: how CI selects and lists tests (path filters, shards, test
  inventories, size baselines).
- **Remote proof**: where environment-sensitive proof runs (clean install,
  packaging, containers, live services, other OSes), if not locally.
- **Review step**: the repo's required review. Default: an independent review
  such as `/code-review` or `/adversarial-review`.
- **PR flow**: the default branch (`main` below) and the branch, PR, and
  landing process.

## Authoring gate

Before adding any test, answer four questions; a missing answer means do not
add it yet:

1. What observable behavior, invariant, or independent contract does it protect?
2. What credible regression makes it fail?
3. Why does existing coverage not already catch that failure? Each contract has
   one primary test owner at the strongest boundary; another layer needs its
   own distinct risk, such as a transport or lifecycle failure the owner cannot
   reach. Prefer extending a table-driven case or shared fixture over a
   near-duplicate test; consolidate duplicated setup in the same change.
4. Does it need a production seam (export, flag, wrapper, injection hook) that no
   production caller needs? If yes, move the test to the real boundary instead.

Then check the test against every [junk pattern](#junk-patterns); a match fails
the gate unless the [retention bar](#retention-bar) names the contract it
independently guards. A test that would break under behavior-preserving
refactoring is asserting implementation, not behavior; rewrite it at the
owning boundary before landing it.

Bug regression tests must fail on the pre-fix code for the intended reason and
pass after the owner-boundary repair. A regression test that never demonstrably
failed proves the mock, not the fix. One regression at the owner boundary
covers the bug; do not replay the same scenario at every layer it crosses.

## Junk patterns

The shared checklist for both modes: the authoring gate rejects a new test that
matches one, and audits hunt for existing tests that do.

- assertion-free coverage probes;
- self-comparisons and identity copiers;
- copied fixtures, inventories, manifests, or export lists;
- exact source, import, or string greps;
- private predicate or call-shape tests duplicated at real boundaries;
- duplicate invocations of the same contract;
- per-provider or per-plugin replays of shared helpers;
- tests whose only purpose is preserving test-only exports, globals, or wrappers;
- dead production code whose only callers are tests;
- expected values produced by the helper or renderer under test;
- mocks that implement the asserted behavior, or one identical mock standing in
  for different APIs;
- fixtures that supply the delivery receipt, admission decision, or callback
  ordering the owner should produce, or persistence asserted against a store
  the path never writes;
- capability tests that restate declared flags instead of exercising the
  delivery or acknowledgement the flag promises;
- negative controls that pass for an unrelated reason, such as a denial from a
  different guard or a rejection the production path never reaches;
- names or fixtures that promise more than the input exercises, such as a
  "retires the window" test asserting the window was not cleared.

## Value bar

Tests justify their maintenance cost by protecting behavior, a credible
regression, or an independently meaningful contract. In an audit, an existing
test that must change for behavior-preserving source reorganization is suspect,
not automatically deletable; the authoring gate still rejects new ones.

Before judging a candidate, read the complete test and production owner, its
entry point, callers, callees, sibling implementations, overlapping tests, CI
routing, and relevant history. Read the root and scoped agent instructions
first. When the test claims dependency-backed behavior, inspect the dependency
source or types directly.

## Discovery

Keep discovery read-only and report evidence before editing. For broad scope,
run parallel read-only discovery lanes when available, split along the repo's
top-level production areas, for example:

- core libraries and packages;
- plugins or extensions;
- UI, apps, scripts, and tooling;
- a cross-cutting pattern sweep.

Outside campaign mode, prefer a few high-confidence candidates over a large
speculative inventory. Hunt for the [junk patterns](#junk-patterns).

## Retention bar

Keep a test when it independently enforces a public API, SDK or plugin
interface, protocol, config, migration, storage, security, platform,
default-value, byte-exact output (such as prompts or wire formats), generated
cross-language, package, release, or architecture contract. Also keep:

- call ordering when order is observable behavior;
- regressions with a credible failure mode;
- source inspection when it is the cheapest independent guard: it fails when
  the contract changes (the user-facing key, byte, or path) and survives an
  identifier-only refactor;
- a retained test that fails on the baseline: treat it as a possible product
  bug, reproduce it, and repair the owner rather than deleting it.

Static or slow is not a deletion reason. A test that resembles implementation
may still be the independent contract; prove otherwise before removing it.

## Candidate evidence

Record every field below before editing. A missing field means the candidate is
not ready for deletion:

- exact test name and location;
- what failure it can actually detect;
- non-test callers of the covered production or support seam;
- stronger remaining owner-boundary proof, or why no proof is needed;
- relevant history and the reason the test or seam exists;
- production or test-support deletion unlocked;
- risk and the focused validation command.

## Edit shape

Choose one coherent owner-boundary batch. Delete obsolete test-only exports,
globals, wrappers, and dead production paths instead of preserving aliases.
Move retained regressions to their canonical owners. Consolidate repeated
package or dependency assertions into one generic contract.

Prefer net-negative production LOC. Do not add replacement tests that restate
the same implementation, and do not convert uncertain candidates into cleanup
to increase deletion counts.

## Validation

Never edit source or tests while a test run or watcher is active in the
checkout. Prefix every build and test command with `ionice -c3 nice -n19`.
Prove each contract with the smallest meaningful check; send only
environment-sensitive proof to the remote proof route.

1. Run the smallest owner and sibling tests with the focused test command.
2. For removed source greps or plan assertions, run the executable script or
   dry-run that owns the real contract.
3. Run targeted formatting, then `git diff --check`.
4. Run the changed gate that repo policy requires for the changed paths,
   using its changed-path classifier first when it has one.
5. Inspect `git diff --numstat`; report production/tooling separately from
   tests and test support.
6. After final audit edits, run the review step. Treat its findings as advice
   to verify, not instructions to apply blindly.

## Landing and continuation

Commit, push, open a PR, or land only when authorized, through the repo's PR
flow. Land one coherent PR at a time; after landing, refresh from current
`main` and rerun read-only discovery for the next high-confidence batch.

## Handoff

Report:

- root cause and removed low-value categories;
- production owner simplifications;
- retained false positives and why they remain valuable;
- focused and full proof actually run;
- production versus test LOC;
- PR and merge state;
- named follow-ups.

_Adapted from [openclaw/openclaw](https://github.com/openclaw/openclaw/tree/main/.agents/skills/test-audit)._
