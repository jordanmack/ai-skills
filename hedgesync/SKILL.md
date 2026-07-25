---
name: hedgesync
description: |
  HedgeDoc 1.x CLI (hedgesync) for reading, writing, watching, and
  authenticating against live notes via OT/Socket.IO. TRIGGER when:
  (1) editing or reading a HedgeDoc note, (2) user mentions hedgesync,
  HedgeDoc, or hedgedoc.sonami.cc, (3) syncing markdown to/from a
  HedgeDoc URL (including /s/ short publish links), (4) listing
  history/status/me on a HedgeDoc server. Normalize /s/<id>, /edit,
  /publish paths to https://host/<id> before calling the CLI.
---

# hedgesync

CLI + library for **HedgeDoc 1.x** (OT realtime). Not HedgeDoc 2.x (Y.js).

Upstream: https://github.com/tionis/hedgesync · npm: `hedgesync` (≥1.4.x)

## Local defaults (this machine)

| Item | Value |
|------|--------|
| Server | `https://hedgedoc.sonami.cc` |
| Cookie env | `HEDGEDOC_COOKIE` (set in `~/.secrets` / `~/.secrets.fish`) |
| Auth user | check with `hedgesync me https://hedgedoc.sonami.cc` |

Always prefer env cookie over pasting `-c` into chat logs.

## Install

```bash
# Node (npm) — default on this machine
npm install -g hedgesync

# Bun — full stdin support (see caveats)
bun install -g hedgesync
```

Requires Node ≥18 or Bun. Check: `hedgesync help`

## Auth

```bash
# Preferred: env (already configured locally)
export HEDGEDOC_COOKIE='connect.sid=s%3A...'   # bash
# fish: set -x HEDGEDOC_COOKIE 'connect.sid=s%3A...'

# Or per-command
hedgesync get <url> -c 'connect.sid=s%3A...'

# Login flows (CLI syntax — not the older README "login email <url>" form)
hedgesync login <server-url> -u user@example.com -p secret          # email (default)
hedgesync login <server-url> --method ldap -u user -p secret
hedgesync login <server-url> --method oidc                         # browser
hedgesync login <server-url> --method device-code-oidc \
  --device-url https://sso.example/application/o/device/ \
  --token-url https://sso.example/application/o/token/ \
  --client-id <id>
```

`connect.sid=` prefix is optional; hedgesync normalizes it.

## URL shapes

### What hedgesync accepts

| Kind | Example | Commands |
|------|---------|----------|
| **Note URL (canonical)** | `https://hedgedoc.sonami.cc/<id>` | get, set, append, info, watch, … |
| **Server URL** | `https://hedgedoc.sonami.cc` | status, me, history, create, export |

`<id>` may be either:

- a random note id (e.g. `GGTIcc_-RbmD0NUAtc1Ypw`), or
- a FreeURL / short alias (e.g. `Si8ZNMgijl`)

Both resolve to the same note when the server has that alias.

### How the CLI parses a note URL

Implementation detail (hedgesync `parseUrl` / `parseNoteUrl`):

1. Last path segment → **noteId**
2. Everything before that → **serverUrl** (for subpath installs like `/hedgedoc/<id>`)
3. Query string and fragment are ignored for id extraction

That means **path prefixes and suffixes break realtime commands** unless you normalize first.

### HedgeDoc browser URLs (normalize before calling hedgesync)

Users often paste published or UI URLs. **Always rewrite to the canonical form** before `get` / `set` / `info` / etc.

| User-pasted shape | Example | Problem | Use instead |
|-------------------|---------|---------|-------------|
| **Published short** | `…/s/Si8ZNMgijl` | last segment ok, but server becomes `…/s` → `xhr poll error` | `…/Si8ZNMgijl` |
| **Trailing slash** | `…/s/Si8ZNMgijl/` | last segment empty or wrong | strip `/`, then drop `s/` |
| **Edit / publish / slide** | `…/<id>/edit`, `…/<id>/publish`, `…/<id>/slide` | last segment is `edit`/`publish`/`slide` | `…/<id>` |
| **Download** | `…/<id>/download` | last segment `download` | `…/<id>` (or `curl …/download` if HTTP only) |
| **Query mode** | `…/<id>?both`, `?edit`, `?view` | usually OK | optional: drop `?...` |
| **Fragment** | `…/<id>#heading` | usually OK | optional: drop `#...` |
| **Subpath deploy** | `https://host/hedgedoc/<id>` | intentional base path | keep as-is (do **not** strip `hedgedoc`) |

**Normalization recipe (agents):**

```bash
# 1) Drop query + fragment
# 2) Strip trailing slash
# 3) Strip known suffixes: /edit /publish /slide /download /info /revision ...
# 4) If path is /s/<id> or /p/<id>, rewrite to /<id>
# Result must look like: https://host/<noteIdOrAlias>
```

Examples (verified on hedgedoc.sonami.cc):

```text
https://hedgedoc.sonami.cc/s/Si8ZNMgijl          →  https://hedgedoc.sonami.cc/Si8ZNMgijl
https://hedgedoc.sonami.cc/Si8ZNMgijl?both       →  https://hedgedoc.sonami.cc/Si8ZNMgijl  (optional)
https://hedgedoc.sonami.cc/Si8ZNMgijl/edit       →  https://hedgedoc.sonami.cc/Si8ZNMgijl
https://hedgedoc.sonami.cc/GGTIcc_-RbmD0NUAtc1Ypw →  (already canonical; same note as short alias above)
```

**Do not** pass a published `/s/...` URL to `status` / `me` / `history` either: those need the **server root** (`https://hedgedoc.sonami.cc`), not a note path.

**Shell-only fallback** (no OT): markdown download works with `/s/<id>/download` and `/<id>/download` via HTTP, but prefer `hedgesync get` after normalization.

## Commands that work (verified)

Realtime (Socket.IO OT):

```bash
hedgesync get <note-url>                 # document markdown
hedgesync get <note-url> -o backup.md
hedgesync get <note-url> --authors --json

hedgesync set <note-url> -f doc.md       # replace whole doc (prefer -f)
hedgesync append <note-url> "tail text"  # text as argv
hedgesync prepend <note-url> "head text"
hedgesync insert <note-url> <pos> "text" # 0-based char offset
hedgesync replace <note-url> "old" "new"
hedgesync replace <note-url> '\d+' 'N' --regex --all
hedgesync line <note-url> 0              # get line (0-based)
hedgesync line <note-url> 0 "# Title"    # set line

hedgesync info <note-url> [--json]
hedgesync users <note-url> [--json]
hedgesync authors <note-url> [-v] [--json]
hedgesync watch <note-url>               # print doc on change
hedgesync watch <note-url> --events --ndjson
```

HTTP API (no realtime):

```bash
hedgesync status <server-url> [--json]
hedgesync me <server-url> [--json]       # needs cookie
hedgesync history <server-url> [--json] [--pinned]
hedgesync create <server-url> -f doc.md [--json] [-n alias]
hedgesync export <server-url> -o notes.zip
```

Create response (`--json`):

```json
{
  "success": true,
  "action": "create",
  "noteId": "...",
  "alias": null,
  "url": "https://hedgedoc.sonami.cc/..."
}
```

## Global options

| Flag / env | Purpose |
|------------|---------|
| `-c` / `HEDGEDOC_COOKIE` | Session cookie |
| `-H` / `HEDGEDOC_HEADERS` | Extra headers (proxy auth); JSON or `Name: val; ...` |
| `-q` | Quiet |
| `--json` | Machine-readable |
| `--no-reconnect` | Disable auto-reconnect |

## Agent playbook

1. **Normalize the URL** if the user pasted `/s/...`, `/edit`, `/publish`, etc. (see URL shapes)
2. **Confirm auth** once: `hedgesync me <server> --json`
3. **List notes**: `hedgesync history <server> --json` (ids may be long form; aliases also work in note URLs)
4. **Read**: `hedgesync get <canonical-note-url> -q` and redirect to a file if needed (`> file.md`)
5. **Write safely**: write content to a temp file, then `hedgesync set <url> -f file` (see stdin / `-o` caveats)
6. **Small edit**: `replace` / `append` / `line` instead of full `set` when possible
7. **Do not** dump session cookies into commits, PR text, or skill files

### Sync local file → note

```bash
hedgesync set "$NOTE_URL" -f ./doc.md -q
hedgesync get "$NOTE_URL" -q | head
```

### Backup note → file

```bash
# Prefer shell redirect under npm/Node ( -o hits Bun-only path; see caveats )
hedgesync get "$NOTE_URL" -q > "./backup-$(date +%Y%m%d).md"
```

### Create then edit

```bash
URL=$(hedgesync create "$SERVER" -f ./seed.md --json -q | jq -r .url)
hedgesync append "$URL" $'\n\n## more' -q
```

## Known caveats (verified on npm 1.4.1 + hedgedoc.sonami.cc)

| Issue | Detail | Workaround |
|-------|--------|------------|
| **`/s/` and other path forms** | Last path segment is noteId; prefix becomes server base → Socket.IO to `…/s` fails with `xhr poll error` | Normalize to `https://host/<id>` (see URL shapes) |
| **Stdin needs Bun** | Under `npm install -g` (Node), stdin for `create` / `set` / `append` fails: `Error: Bun is not defined` | Use `-f file`, or pass append/prepend text as argv, or install via `bun install -g hedgesync` |
| **`get -o` needs Bun** | Same Bun path as stdin; `-o file` can throw `Bun is not defined` under Node | `hedgesync get URL -q > file.md` |
| **`download`** | Returns a redirect object; `-o` can throw | Use `get` instead |
| **`revisions`** | May error: `revisions.revision is not iterable` | Unreliable; don't depend on it |
| **`pin` / `unpin` / `history-delete`** | May 404 depending on server API | History **list** still works |
| **Compatibility** | HedgeDoc **1.10.4+** only; not 2.x | Check with `status` / `info` |
| **Permissions** | New notes often `editable` (login required to write) | Cookie must be valid |

When unsure, re-check live help: `hedgesync help <command>` (source of truth over README).

## Advanced (load help when needed)

```bash
hedgesync help macro      # text/regex/exec/block macros, --watch, streaming
hedgesync help mirror      # real-time mirror between two notes
hedgesync help transform  # pandoc header shift / format convert
hedgesync help login      # full auth methods
```

Macros run shell on match (`--exec`); only use on trusted docs. Prefer `--watch` for live expansion.

## Library (optional)

```bash
npm install hedgesync
# import { HedgeDocClient } from 'hedgesync'
# Obsidian-safe entry: hedgesync/obsidian
```

Agents should prefer the **CLI** unless the user asks for programmatic OT control.

## Error quick map

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Auth / profile fails | Missing/expired cookie | Refresh `HEDGEDOC_COOKIE` or re-login |
| `Bun is not defined` | Stdin or `-o` under Node npm build | `-f` for writes; shell `>` for reads; or Bun install |
| `xhr poll error` on get/info | URL still has `/s/`, `/p/`, `/edit`, etc. | Normalize to `https://host/<id>` |
| Cannot edit | Permission `locked`/`protected` or anonymous on `editable` | Use owner cookie |
| Connect fails | Wrong URL, HD2, or network | Confirm HD1 + canonical note URL |
| Empty/odd `download` | Known broken path | Use `get` |
| `status` 404 HTML | Passed a note URL to a server command | Use server root only |
