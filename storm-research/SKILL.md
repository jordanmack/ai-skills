---
name: storm-research
description: |
  Run a STORM-style deep-research pass on a topic: scan five expert
  perspectives, map their contradictions, synthesize a briefing, then
  peer-review the result with confidence scores. Adapted from Stanford
  STORM (multi-perspective question asking) into a four-phase prompt
  workflow.
  TRIGGER when the user wants STORM, a deep research outline,
  multi-perspective research, a contradiction map, a Wikipedia-style /
  PhD-style research briefing, or says "research this from every angle"
  / "give me the bull and bear case" / invokes /storm-research.
argument-hint: "Topic to research; optionally your role and whether current web sources are needed"
---

# STORM Research

A four-phase research workflow that compresses multi-perspective analysis
into one coherent pass. Adapted from Stanford STORM (NAACL 2024, OVAL Lab):
the insight is that asking one question gives the majority view, while
simulating several expert lenses catches blind spots a single prompt never
sees.

## Success criteria

The run is done when you have produced, in order:

1. Five distinct expert perspectives on the topic.
2. A contradiction map naming where they clash, what they all agree on, and
   what none of them addressed.
3. A synthesized briefing with ranked findings and one specific action.
4. A peer review with per-finding confidence scores and a bias check.

Skipping a phase fails the run. Each phase builds on the previous one's
output, so keep all four in the same context.

## Inputs — ask only if missing

- **Topic** (required). The subject to research.
- **User role** — used in Phase 3's actionable insight. If absent, infer a
  reasonable role or ask.
- **Web sources** — for current, factual, or high-stakes topics, browse and
  cite real sources. For evergreen / conceptual topics, model knowledge is
  acceptable. When in doubt, ask whether live research is required.

## Source policy

- For anything time-sensitive or verifiable, browse and cite. Separate
  sourced facts from inference explicitly.
- The model's "perspectives" are simulations, not authorities. Do not let a
  confident persona launder an unverified claim into a fact — Phase 4 exists
  to catch exactly this.

## Phase 1 — The Multi Perspective Scan

Simulate five expert lenses. Replace `[YOUR TOPIC]`.

```text
I need to research [YOUR TOPIC].
Simulate 5 different expert perspectives on this topic:
1. THE PRACTITIONER: works with this daily.
   What do they know that academics miss?
   What practical realities are usually ignored?
2. THE ACADEMIC: has studied this for years.
   What does the peer reviewed evidence actually say?
   Where does the evidence contradict popular belief?
3. THE SKEPTIC: thinks the mainstream view is wrong.
   What is the strongest counterargument?
   What evidence do proponents conveniently ignore?
4. THE ECONOMIST: follows the money.
   Who profits from the current narrative?
   What financial incentives shape the research?
5. THE HISTORIAN: has seen similar patterns before.
   What historical parallels exist?
   What can we learn from how those played out?
For each perspective give me:
- Their core position in 2 sentences
- The strongest evidence supporting their view
- The one thing they would tell me that no other perspective would
```

## Phase 2 — The Contradiction Map

Find where the five voices fight. The conflicts are where real
understanding lives.

```text
Based on the 5 perspectives above, map the contradictions:
1. Where do two or more perspectives directly contradict
   each other? List each conflict with the specific claims
   that clash.
2. Which perspective has the strongest evidence?
   Which has the weakest? Why?
3. What is the one question that, if answered, would
   resolve the biggest contradiction?
4. What does EVERY perspective agree on?
   (This is likely true. Even opponents confirm it.)
5. What topic did NONE of the perspectives address?
   (This is the blind spot in the whole field.
   Often the most valuable finding.)
```

## Phase 3 — The Synthesis

Pull everything into a research briefing. Replace `[YOUR ROLE]`.

```text
Synthesize everything from the 5 perspectives and the
contradiction map into a research briefing:
1. THE ONE PARAGRAPH SUMMARY: explain this topic as if
   briefing a CEO who has 60 seconds and needs nuance,
   not just the headline.
2. THE 5 KEY FINDINGS: most important things I now know,
   ranked by reliability. For each, note which perspectives
   support it and which challenge it.
3. THE HIDDEN CONNECTION: one non obvious link between
   findings that only shows up when you look at all 5
   perspectives together.
4. THE ACTIONABLE INSIGHT: based on all the evidence,
   what should someone in [YOUR ROLE] actually DO
   differently? Be specific.
5. THE FRONTIER QUESTION: the one question that, if
   answered, would change everything about how we
   understand this topic.
```

## Phase 4 — The Peer Review

STORM's known weakness is that it does not self-critique; source bias and
fact misassociation sneak in. This phase grades the work.

```text
Now peer review your own research briefing:
1. CONFIDENCE SCORES: rate each of the 5 key findings
   on a 1 to 10 scale for reliability. Explain each score.
2. WEAKEST LINK: which claim are you least confident in?
   What specific info would you need to verify it?
3. BIAS CHECK: which perspective might be overrepresented
   in your synthesis? Did one voice dominate?
4. MISSING PERSPECTIVE: is there a 6th angle I should
   have included that would change the conclusions?
5. OVERALL GRADE: if a Stanford professor reviewed this
   briefing, what grade would they give and why?
   What would they tell me to fix?
```

## Output

Deliver the four phases as labeled sections: **Perspectives**,
**Contradictions**, **Briefing**, **Peer Review**, and a closing **Open
Questions** list drawn from the frontier question and weakest links.

Write the result to a markdown file in the current working directory. Name it
`storm-research-<topic>.md`: always prefixed with `storm-research-`, always
lowercase, with spaces replaced by dashes. Example: a run on "EV battery
supply chains" produces `storm-research-ev-battery-supply-chains.md`.

## Reference

- Stanford STORM: https://github.com/stanford-oval/storm (MIT)
- Live demo: https://storm.genie.stanford.edu
- Method writeup (source of these prompts): @heynavtoor on X, "The Stanford
  STORM Method"
