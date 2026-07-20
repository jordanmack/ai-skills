# storm-research skill

Four-phase STORM-style deep research: multi-perspective scan, contradiction map, synthesis briefing, peer review.

## Origin / attribution

**This skill was not invented wholly in this repository.** It is an
adaptation of ideas and prompt patterns that come from elsewhere.

Primary lineage called out in `SKILL.md`:

- **Stanford STORM** (NAACL 2024, OVAL Lab) — multi-perspective research /
  article generation system  
  - Code: [stanford-oval/storm](https://github.com/stanford-oval/storm) (MIT)  
  - Demo: https://storm.genie.stanford.edu
- **Method writeup used as the prompt source** (per skill Reference section):  
  [@heynavtoor on X, "The Stanford STORM Method"](https://x.com/heynavtoor/article/2067194761446920264)

This repo's skill is a **prompt workflow / agent skill packaging** of that
method (four copy-paste phases), not a vendored copy of Stanford's
Python STORM system. First added here in commit `0181493`
(*Add storm-research skill*, 2026-06-18), with later local tweaks (for
example output filename convention).

## May be modified here

This copy **may now differ** from any upstream writeup or community skill
that popularized the same four-phase prompts. Treat it as a local fork:
triggers, output naming, source policy, or phase text may land here
without matching another author's skill or article byte-for-byte.

## Install (this repo)

From the repo root:

```bash
./install.sh storm-research claude
./install.sh storm-research grok
./install.sh storm-research codex
```
