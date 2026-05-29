---
name: handoff
description: |
  Compact the current conversation into a handoff document so a fresh
  agent (or another session) can pick up the work. TRIGGER when the user
  wants to hand off work, pause a session, write a handoff/continuation
  doc, or says "handoff" / "summarize this for another session".
argument-hint: "What will the next session be used for?"
---

# Handoff

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save it to the OS temporary directory — **not** the current workspace.

## Rules

- **Reference, don't duplicate.** Do not repeat content already captured in other artifacts (PRDs, plans, ADRs, issues, commits, diffs). Link them by path or URL instead.
- **Suggested skills section.** Include a section recommending which skills the next agent should invoke.
- **Redact secrets.** Strip API keys, passwords, tokens, and any personally identifiable information.
- **Tailor to the next session.** If the user passed an argument, treat it as a description of what the next session will focus on and shape the doc accordingly.

---

_Adapted from [mattpocock/skills](https://github.com/mattpocock/skills)._
