# GitHub Issues

GitHub issues are the **only** open-work tracker. Do not park follow-ups in docs,
commit messages, or scratch notes.

This file is the issue workflow contract. Skills implement procedures; they must
follow the policy here.

## Ready (definition agents use)

An issue is **Ready** when it is:

1. **open**, and
2. labeled **`approved`**, and
3. **not** labeled **`needs-info`**.

Autonomous fix runs may work **only** Ready issues. Naming a specific issue in a
skill invocation does not bypass Ready unless the operator explicitly overrides
policy for that run.

### Useful queries

```bash
# Ready
gh issue list --state open --label approved --search '-label:needs-info'

# Parking lot (tracked, not approved)
gh issue list --state open --label known-open

# Consciously deferred (reviewed parking)
gh issue list --state open --label known-open --label deferred

# Blocked
gh issue list --state open --label needs-info

# Auto-fix queue (Ready subset: approved + auto-fix)
gh issue list --state open --label auto-fix --label approved --search '-label:needs-info'
```

## Label set

### Workflow (load-bearing)

| Label | Meaning | Who mutates |
|-------|---------|-------------|
| `approved` | Implementation is authorized | Trusted human, or agent **normalizing** a trusted body/comment approval into this label, or agent **filing under the auto-fix bar** (with `auto-fix`). Remove only if approval is revoked. |
| `needs-info` | Blocked on operator or external input | Agents add when blocked; clear when the answer is recorded. Strip on close. |
| `known-open` | Tracked but **not approved** (parking lot: follow-up, unconfirmed discovery, or unreviewed deferral) | Anyone filing parking-lot work. **Remove when applying `approved`.** |
| `deferred` | **Additive** marker on parking: a write+ authority **reviewed** the issue and **chose not now** | Trusted human, or agent **normalizing** clear trusted deferral prose. **Never with `approved`.** Strip when promoting to `approved`. |
| `in-progress` | A fix run has claimed this issue | The fix run only. Add when the run's in-scope list is known; remove when the run stops working the issue. |
| `auto-fix` | **Additive** on authorized work: tiny, clearly valid work safe for unattended fix | Agents at **file time** or by **unblock retrofit** when the [auto-fix bar](#auto-fix-bar) holds; trusted human anytime. **Never with `known-open` or `deferred`.** Not a Ready substitute by itself. |

Steady state for authorization membership: an issue has **`known-open` or `approved`**, not both.

`deferred` is an optional annotation on `known-open` meaning "authority looked and
deliberately parked this." It never grants or blocks Ready by itself. Ready stays
positive: open + `approved` + not `needs-info`.

`auto-fix` never grants or blocks Ready by itself. Ready still requires `approved`.

Pipeline:

```
file (known-open)
  -> approve (approved, drop known-open and deferred) -> Ready if not needs-info
  -> defer   (add deferred; keep known-open)          <- formal "not now" after review
  -> needs-info (blocked) until cleared
file auto-fix (approved + auto-fix; no known-open) -> Ready if not needs-info
```

### Type and kind (optional; never gate Ready)

| Label | Meaning |
|-------|---------|
| `bug` | Defect |
| `enhancement` | New capability or improvement |
| `documentation` | Docs-only work |

Use at most one when the type is clear. Do not invent new labels for taxonomy;
update this file first.

## Approval

### Signals (any one is enough)

From a **trusted** author:

- the **`approved`** label, or
- clear approval in the **issue body**, or
- clear approval in a **comment**

Clear examples: "approved", "approved to implement", "you may fix this", "go
ahead and implement". Ambiguous discussion is not approval.

**Exception:** an agent may apply **`approved`** together with **`auto-fix`**
when the [auto-fix bar](#auto-fix-bar) holds. That is not a general unlock for
other work.

### Trust

The author must have **write (push) or higher** on this repository when the
signal is made. Non-write accounts cannot unlock work. Posts made via `gh` as a
trusted account count as that account. GitHub permissions are the source of
truth; there is no separate roster.

### Normalize prose approval to the label

When an agent sees trusted approval only in body or comment and `approved` is
missing:

1. Add **`approved`**.
2. Remove **`known-open`** and **`deferred`** if present.
3. If already editing the issue, strip status parentheticals from the title.

## Deferral

From a **trusted** author: the **`deferred`** label, or clear, issue-directed
deferral in the body or a comment ("deferred", "reviewed; not now", "park this
deliberately"). Casual "later maybe" is not enough. Trust is the same as
[Approval](#approval).

To normalize prose deferral: ensure `known-open` is present (and `approved` is
absent), then add `deferred`. Never set `deferred` together with `approved`.

## Filing

### Parking path

When parking work (deferral, out-of-scope follow-up, unconfirmed discovery):

1. Open a GitHub issue (not only a doc note or commit body).
2. Apply **`known-open`** until approved.
3. If a write+ authority is filing a **conscious** "not now" decision at open time,
   also apply **`deferred`**.
4. Prefer a type label when obvious.
5. Title describes the work; **no status parentheticals**. Status lives in labels.

### Auto-fix path

When a follow-up meets the **auto-fix bar** at file time:

1. Open a GitHub issue.
2. Apply **`approved`** and **`auto-fix`**. Do **not** apply `known-open` or `deferred`.
3. Prefer a type label when obvious. Title describes the work; no status parentheticals.
4. Body states the problem, acceptance criteria, the source issue when known
   (`Found while fixing #N`), and a one-line reason the bar holds.

If unsure whether the bar holds, use the parking path.

### Auto-fix bar

The bar definition lives in the operator skill catalog: the generic
`gh-fix-issues` skill owns the single authoritative bar text (its "Auto-fix
bar (default)" block). This repo uses that default without override. Intent in
four words: clear outcome, small scope, safe zone, not blocked. If that skill is
not available to the agent, the bar cannot be evaluated: use the parking path.

Useful body fields (both paths): problem, acceptance criteria, dependencies
(`blocked by #N`), estimated scope (`small` or `regular` plus a one-line reason;
a filing-time hint, never a gate or a label).

## Agent mutation rules

| Action | Allowed? |
|--------|----------|
| Add / remove `needs-info` | Yes |
| Add / remove `in-progress` during a fix run | Yes (the fix run only) |
| File follow-ups with `known-open` | Yes |
| File follow-ups with `approved` + `auto-fix` when the auto-fix bar holds | Yes |
| Retrofit `approved` + `auto-fix` on an existing `known-open` issue when the bar holds (comment the bar reason) | Yes |
| Normalize trusted body/comment to `approved` + clear `known-open` and `deferred` | Yes |
| Normalize trusted body/comment to `deferred` on `known-open` | Yes |
| File `approved` from a dictation session run by a trusted operator (`gh-dictate-issues`) | Yes |
| Set `approved` with no trusted signal | **No** (exception: the auto-fix bar) |
| Set `deferred` with no trusted signal | **No** |
| Add `auto-fix` to an existing issue without the bar | **No** |
| Close fixed issues; strip `needs-info` on close | Yes |
| Invent new labels | **No** (update this file first) |

Matching skills (`gh-dictate-issues`, `gh-unblock-issues`, `gh-fix-issues`, and
similar) must obey this table.
