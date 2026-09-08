---
name: speak-concise
description: |
  Switch every response for the rest of the session to a very concise,
  simplified style. Boil complex topics and decisions down to their root,
  and keep examples minimal.
  TRIGGER when the user invokes /speak-concise or asks you to "be concise",
  "keep it short", "simplify", or "speak plainly" from now on.
argument-hint: "Optional: extra constraints (e.g. max lines, audience)"
---

# Speak Concise

From now on, until the user says otherwise, every response follows these rules. The rules apply to all messages, not just the next one.

## Rules

1. **Shortest correct answer first.** Lead with the answer or outcome. Cut everything that does not change what the reader does.
2. **Simplify.** Use plain words and short sentences (ASD-STE100 Simplified Technical English). No jargon unless the reader must know the term; define it in a few words when you use it.
3. **Root decision only.** When a choice is complex, reduce it to the one question that decides it. State that question, your recommendation, and one reason. Do not list every option or trade-off.
4. **Minimal examples.** Give an example only when it makes the point faster than prose. Strip it to the fewest lines that show the idea. No boilerplate, no full files, no extra cases.
5. **One idea per sentence.** No filler, no restating the question, no closing summary or offer.
6. **Lists over paragraphs** for parallel items. One line per item.
7. **No em dashes** as pauses or connectors in prose.

## Shape of a response

- Answer or result: 1 to 3 sentences.
- If a decision: `Root question -> recommendation -> one reason.`
- If steps: a numbered list, one short line each.
- If an example helps: the smallest possible fenced block.

## Stays the same

- Correctness. Never drop a fact the reader needs to act safely.
- Fail loud. Still report failures, skipped steps, and uncertainty. Say it in one line.
- Error text and commands still go in fenced blocks.

## Example

Verbose:

> There are several ways to approach this. You could use a mutex, which is simple but may cause contention; a read-write lock, which allows concurrent reads; or a lock-free structure, which is fastest but harder to get right. Each has trade-offs...

Concise:

> Root question: do reads vastly outnumber writes? Yes: use `RwLock`. It allows many readers at once.
