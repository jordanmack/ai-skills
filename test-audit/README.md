# test-audit skill

Value bar for tests: an authoring gate for new tests, focused audits of low-value or implementation-coupled tests, and whole-subsystem test-pruning campaigns.

## Origin / attribution

**This skill was not written in this repository.**

It is adapted from the OpenClaw project's agent skills:

- Repository: [openclaw/openclaw](https://github.com/openclaw/openclaw)
- Upstream skill: [`.agents/skills/test-audit`](https://github.com/openclaw/openclaw/tree/main/.agents/skills/test-audit)

Imported from `main` at commit
[`80930af448ebabc84174146b56bc106d37fab3b4`](https://github.com/openclaw/openclaw/commit/80930af448ebabc84174146b56bc106d37fab3b4)
(2026-09-23). The verbatim upstream copy is this repo's commit `af20798`.

The upstream project is MIT-licensed, Copyright (c) 2026 OpenClaw Foundation ([LICENSE](https://github.com/openclaw/openclaw/blob/main/LICENSE)).

Also noted in `SKILL.md`: _Adapted from [openclaw/openclaw](https://github.com/openclaw/openclaw/tree/main/.agents/skills/test-audit)._

## May be modified here

This copy **differs** from upstream. OpenClaw-specific commands, helper skills, paths, and product names were replaced with project facts that each run resolves from the target repo (see "Project facts" in `SKILL.md`). Treat it as a local fork: further wording, trigger, or packaging changes may land here without matching upstream. When in doubt, compare against the current upstream path on GitHub.

## Install (this repo)

From the repo root:

```bash
./install.sh test-audit claude
./install.sh test-audit grok
./install.sh test-audit codex
```
